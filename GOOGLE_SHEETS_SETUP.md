# Google Sheets Integration Setup

This guide explains how to set up the Google Sheets integration feature that allows users to save form responses directly to Google Sheets.

## Features

- **Save to Google Sheets**: Users can export form responses to a new Google Sheet
- **Email Integration**: The Google Sheet is automatically shared with the specified email address
- **Date/Time Selection**: Users can specify when the form was filled, including previous dates
- **Automatic Creation**: Creates a new Google Sheet for each export operation

## Setup Instructions

### 1. Create a .env file

Create a `.env` file in the root of your `google-forms` directory with the following content:

```env
GOOGLE_SHEETS_API_KEY=your_actual_google_sheets_api_key_here
```

### 2. Get a Google Sheets API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click on it and press "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key
5. Restrict the API key (recommended):
   - Click on the created API key
   - Under "Application restrictions", select "HTTP referrers" or "IP addresses"
   - Under "API restrictions", select "Restrict key" and choose "Google Sheets API"

### 3. Install Dependencies

Run the following command to install the required dependencies:

```bash
npm install
```

### 4. Start the Server

Start the development server:

```bash
npm run dev:full
```

## How It Works

1. **User Interface**: In the form responses section, users will see a "Save to Google Sheets" button next to the existing "Export to CSV" button.

2. **Modal Dialog**: Clicking the button opens a modal that prompts for:
   - Email ID (where the Google Sheet will be shared)
   - Date and Time (when the form was filled, can be a previous date)

3. **API Call**: The frontend calls the `/api/google-sheets/create` endpoint with the form data.

4. **Google Sheets Creation**: The backend:
   - Creates a new Google Sheet with the form title and date
   - Populates it with the form response data
   - Shares the sheet with the specified email address
   - Returns the sheet URL to the user

## API Endpoint

### POST /api/google-sheets/create

**Request Body:**
```json
{
  "email": "user@example.com",
  "dateTime": "2024-01-15T10:30:00",
  "formTitle": "Customer Feedback Form",
  "data": [
    ["Question 1", "Question 2", "Question 3"],
    ["Answer 1", "Answer 2", "Answer 3"]
  ]
}
```

**Response:**
```json
{
  "success": true,
  "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "sheetUrl": "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "message": "Google Sheet created and shared successfully"
}
```

## Security Notes

- The API key is stored in the `.env` file and should never be committed to version control
- The API key is restricted to only the Google Sheets API
- Users can only export their own form responses (authentication is handled by Firebase)

## Troubleshooting

### Common Issues

1. **"Google Sheets API key not configured"**
   - Make sure you have created the `.env` file
   - Verify the API key is correct
   - Restart the server after creating the `.env` file

2. **"Failed to create Google Sheet"**
   - Check if the Google Sheets API is enabled in your Google Cloud project
   - Verify the API key has the correct permissions
   - Check the server logs for detailed error messages

3. **"Failed to share sheet with email"**
   - The sheet is created but sharing failed
   - This usually happens if the email address is invalid or the API key doesn't have sharing permissions

### Debug Mode

To see detailed logs, check the server console output when making requests to the Google Sheets API endpoint.

## File Structure

The Google Sheets integration is implemented in these files:

- `src/components/FormResponses.jsx` - Frontend UI and modal
- `server.js` - Backend API endpoint
- `.env` - Configuration file (you need to create this)

## Dependencies Added

- `dotenv` - For loading environment variables from `.env` file
