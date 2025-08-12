import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { exec } from 'child_process';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Function to kill any process running on the specified port
const killProcessOnPort = (port) => {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' 
      ? `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).Id -Force -ErrorAction SilentlyContinue }"` 
      : `lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs -r kill -9`;
    
    exec(command, (error) => {
      if (error && !error.message.includes('No such process')) {
        console.log(`Warning: Could not kill process on port ${port}:`, error.message);
      }
      resolve();
    });
  });
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Read tokens from file
async function readTokens() {
  try {
    const data = await fsPromises.readFile(path.join(__dirname, 'tokens.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tokens:', error);
    return { tokens: null };
  }
}

// Write tokens to file
async function writeTokens(tokens) {
  try {
    await fsPromises.writeFile(
      path.join(__dirname, 'tokens.json'),
      JSON.stringify({ tokens }, null, 2),
      'utf8'
    );
    console.log('Tokens saved successfully');
  } catch (error) {
    console.error('Error writing tokens:', error);
  }
}

// Create OAuth2 client
function getOAuth2Client() {
  // Read credentials file using fs instead of require
  const credentialsRaw = fs.readFileSync('./credentials.json', 'utf8');
  const credentials = JSON.parse(credentialsRaw);
  const { client_id, client_secret, redirect_uris } = credentials.web;
  
  return new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0] // Using the backend redirect URI
  );
}

// OAuth2 routes
app.get('/auth/google', (req, res) => {
  const oauth2Client = getOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email'
  ];
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Force to get refresh_token every time
  });
  
  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Authorization code is missing');
  }
  
  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Save tokens to file
    await writeTokens(tokens);
    
    // Redirect to frontend callback
     res.redirect(`${process.env.VITE_APP_URL || 'http://localhost:5173'}/oauth-callback?success=true`);
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).send(`Error getting tokens: ${error.message}`);
  }
});

app.post('/auth/google/callback', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing' });
  }
  
  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Save tokens to file
    await writeTokens(tokens);
    
    res.json({ success: true, message: 'Authentication successful' });
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).json({ error: `Error getting tokens: ${error.message}` });
  }
});

// Check if we have valid tokens
app.get('/auth/google/status', async (req, res) => {
  try {
    const { tokens } = await readTokens();
    
    if (!tokens) {
      return res.json({ authenticated: false });
    }
    
    // Check if tokens are expired
    const expiryDate = tokens.expiry_date;
    const isExpired = expiryDate ? expiryDate <= Date.now() : true;
    
    if (isExpired) {
      return res.json({ authenticated: false });
    }
    
    // Get user info if authenticated
    let email = null;
    try {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials(tokens);
      
      const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2'
      });
      
      const userInfo = await oauth2.userinfo.get();
      email = userInfo.data.email;
    } catch (userInfoError) {
      console.error('Error fetching user info:', userInfoError);
    }
    
    res.json({ 
      authenticated: true,
      email: email,
      expiresAt: expiryDate ? new Date(expiryDate).toISOString() : null
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({ error: `Error checking auth status: ${error.message}` });
  }
});

// Google Sheets API endpoint
app.post('/api/google-sheets/create', async (req, res) => {
  try {
    console.log('Received request to create Google Sheet');
    const { email, dateTime, formTitle, data } = req.body;
    
    if (!email || !dateTime || !formTitle || !data) {
      console.log('Missing required fields:', { email, dateTime, formTitle, hasData: !!data });
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Read tokens from file
    const { tokens } = await readTokens();
    
    if (!tokens) {
      return res.status(401).json({ 
        error: 'Not authenticated with Google', 
        requiresAuth: true 
      });
    }
    
    // Set up OAuth2 client with saved tokens
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    
    // Check if token is expired and we have a refresh token
    if (tokens.expiry_date && tokens.expiry_date <= Date.now() && tokens.refresh_token) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        await writeTokens(credentials);
        oauth2Client.setCredentials(credentials);
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        return res.status(401).json({ 
          error: 'Authentication expired', 
          requiresAuth: true 
        });
      }
    }
    
    console.log('Using OAuth2 authentication for Google Sheets');
    
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const title = `${formTitle} - ${new Date(dateTime).toLocaleDateString()}`;
    console.log('Creating spreadsheet with title:', title);

    // 1) Create spreadsheet
    const createResp = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [
          {
            properties: { title: 'Form Responses' }
          }
        ]
      }
    });

    const spreadsheetId = createResp.data.spreadsheetId;

    // 2) Write values
    const range = `Form Responses!A1`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: data }
    });

    // 3) Share with the specified email if different from authenticated user
    // This is optional since the user already owns the sheet
    if (email !== tokens.email) {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: email
        },
        sendNotificationEmail: true
      });
    }

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    console.log('Google Sheet created successfully:', sheetUrl);
    res.json({ success: true, spreadsheetId, sheetUrl, message: 'Google Sheet created successfully' });
    
  } catch (error) {
    console.error('Google Sheets API error:', error);
    
    if (error.response && error.response.data) {
      console.error('Full Google API error response:', JSON.stringify(error.response.data, null, 2));
    }
    
    res.status(500).json({ 
      error: 'Failed to create Google Sheet',
      details: error.message,
      googleError: error.response?.data || null
    });
  }
});

// Proxy endpoint for Google Forms
app.post('/api/proxy-form', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate that this is a Google Form URL
    if (!url.includes('docs.google.com/forms')) {
      return res.status(400).json({ error: 'Invalid Google Form URL' });
    }
    
    console.log('Proxying request to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log('Successfully fetched HTML, length:', html.length);
    
    res.json({ html, success: true });
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch form HTML',
      details: error.message 
    });
  }
});

// Alternative proxy endpoint
app.post('/api/form-proxy', async (req, res) => {
  try {
    const { url, method = 'GET' } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log('Form proxy request to:', url);
    
    const response = await fetch(url, {
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log('Form proxy success, length:', html.length);
    
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Form proxy error:', error.message);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Kill any process running on the port before starting the server
killProcessOnPort(PORT).then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API endpoints available:`);
    console.log(`  POST /api/proxy-form`);
    console.log(`  POST /api/form-proxy`);
    console.log(`  POST /api/google-sheets/create`);
    console.log(`  GET  /api/health`);
    console.log(`  GET  /auth/google`);
    console.log(`  GET  /auth/google/callback`);
    console.log(`  POST /auth/google/callback`);
    console.log(`  GET  /auth/google/status`);
  });
});
