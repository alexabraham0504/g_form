import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  // Fetch user settings on component mount
  useEffect(() => {
    if (currentUser) {
      fetchUserSettings();
    }
  }, [currentUser]);

  // Fetch user settings from Firestore
  const fetchUserSettings = async () => {
    try {
      setIsLoading(true);
      const userSettingsRef = doc(db, 'users', currentUser.uid, 'settings', 'gemini');
      const docSnap = await getDoc(userSettingsRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGeminiApiKey(data.apiKey || '');
        setSelectedModel(data.selectedModel || 'gemini-1.5-flash');
        
        // If API key exists, fetch available models
        if (data.apiKey) {
          fetchAvailableModels(data.apiKey);
        }
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
      showMessage('Error fetching settings. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Save API key to Firestore
  const saveApiKey = async () => {
    if (!geminiApiKey.trim()) {
      showMessage('Please enter a valid API key', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const userSettingsRef = doc(db, 'users', currentUser.uid, 'settings', 'gemini');
      const docSnap = await getDoc(userSettingsRef);
      
      if (docSnap.exists()) {
        await updateDoc(userSettingsRef, {
          apiKey: geminiApiKey,
          updatedAt: new Date().toISOString()
        });
      } else {
        await setDoc(userSettingsRef, {
          apiKey: geminiApiKey,
          selectedModel: 'gemini-1.5-flash', // Default model
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      showMessage('API key saved successfully', 'success');
      
      // Fetch available models after saving API key
      fetchAvailableModels(geminiApiKey);
      
    } catch (error) {
      console.error('Error saving API key:', error);
      showMessage('Error saving API key. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch available Gemini models
  const fetchAvailableModels = async (apiKey) => {
    try {
      setIsLoading(true);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter for Gemini models only
      const geminiModels = data.models
        .filter(model => model.name.includes('gemini'))
        .map(model => ({
          id: model.name,
          displayName: model.displayName || model.name,
          description: model.description || ''
        }));
      
      setAvailableModels(geminiModels);
    } catch (error) {
      console.error('Error fetching available models:', error);
      showMessage('Error fetching available models. Please check your API key.', 'error');
      setAvailableModels([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Save selected model to Firestore
  const saveSelectedModel = async () => {
    try {
      setIsSaving(true);
      const userSettingsRef = doc(db, 'users', currentUser.uid, 'settings', 'gemini');
      
      await updateDoc(userSettingsRef, {
        selectedModel,
        updatedAt: new Date().toISOString()
      });
      
      showMessage('Model selection saved successfully', 'success');
    } catch (error) {
      console.error('Error saving model selection:', error);
      showMessage('Error saving model selection. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Removed usage statistics feature per request

  // Helper function to show messages
  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Never';
    return date.toLocaleString();
  };

  return (
    <div className="settings-container" style={{ padding: '0', width: '100%' }}>
      
      {/* Banner (full width like other pages) */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2.5rem 2.5rem',
        borderRadius: '0 0 24px 24px',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '2rem',
        marginTop: '1rem',
        textAlign: 'center',
        width: '100%'
      }}>
        {/* Decorative background elements */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '150px',
          height: '150px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          backdropFilter: 'blur(10px)'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '100px',
          height: '100px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '50%',
          backdropFilter: 'blur(10px)'
        }}></div>
        <h1 className="gforms-header-title" style={{
          color: 'white',
          fontSize: '2.5rem',
          fontWeight: '900',
          margin: 0,
          textShadow: '0 3px 12px rgba(0, 0, 0, 0.3)',
          letterSpacing: '-0.5px',
          lineHeight: '1.2',
          textAlign: 'center'
        }}>Settings</h1>
        <p className="gforms-header-desc" style={{ 
          marginTop: '0.5rem',
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '1.1rem',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>Configure your Gemini API key and model preferences</p>
      </div>
      {/* Back to Dashboard bar below the banner */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        backgroundColor: 'white', 
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center'
      }}>
        <button 
          onClick={() => navigate('/')} 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#673ab7',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f3ff'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
      </div>
      
      {/* Main content container (centered, readable width) */}
      <div style={{ padding: '0 2rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Message display */}
      {message && (
        <div 
          style={{ 
            padding: '1rem', 
            borderRadius: '0.5rem', 
            marginBottom: '1.5rem',
            backgroundColor: messageType === 'success' ? '#d1fae5' : '#fee2e2',
            color: messageType === 'success' ? '#065f46' : '#b91c1c',
            border: `1px solid ${messageType === 'success' ? '#a7f3d0' : '#fecaca'}`
          }}
        >
          {message}
        </div>
      )}
      
      {/* API Key Section */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '0.75rem', 
        padding: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#673ab7', marginBottom: '1rem' }}>
          Gemini API Key
        </h2>
        <p style={{ marginBottom: '1rem', color: '#4b5563' }}>
          Enter your Gemini API key to use with the application. You can get an API key from the 
          <a 
            href="https://makersuite.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#673ab7', textDecoration: 'underline', marginLeft: '0.25rem' }}
          >
            Google AI Studio
          </a>.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            style={{ 
              flex: '1', 
              padding: '0.75rem', 
              borderRadius: '0.375rem', 
              border: '1px solid #d1d5db',
              fontSize: '1rem'
            }}
          />
          <button
            onClick={saveApiKey}
            disabled={isSaving || !geminiApiKey.trim()}
            style={{ 
              backgroundColor: '#673ab7', 
              color: 'white', 
              fontWeight: '500',
              padding: '0.75rem 1.5rem', 
              borderRadius: '0.375rem',
              border: 'none',
              cursor: isSaving || !geminiApiKey.trim() ? 'not-allowed' : 'pointer',
              opacity: isSaving || !geminiApiKey.trim() ? '0.7' : '1'
            }}
          >
            {isSaving ? 'Saving...' : 'Save API Key'}
          </button>
        </div>
      </div>
      
      {/* Model Selection Section */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '0.75rem', 
        padding: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#673ab7', marginBottom: '1rem' }}>
          Gemini Model Selection
        </h2>
        <p style={{ marginBottom: '1rem', color: '#4b5563' }}>
          Select the Gemini model you want to use for generating form responses.
        </p>
        
        {geminiApiKey ? (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ 
                flex: '1', 
                padding: '0.75rem', 
                borderRadius: '0.375rem', 
                border: '1px solid #d1d5db',
                fontSize: '1rem',
                backgroundColor: 'white'
              }}
              disabled={isLoading || availableModels.length === 0}
            >
              {availableModels.length === 0 ? (
                <option value="">No models available</option>
              ) : (
                availableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.displayName}
                  </option>
                ))
              )}
            </select>
            <button
              onClick={saveSelectedModel}
              disabled={isSaving || isLoading || availableModels.length === 0}
              style={{ 
                backgroundColor: '#673ab7', 
                color: 'white', 
                fontWeight: '500',
                padding: '0.75rem 1.5rem', 
                borderRadius: '0.375rem',
                border: 'none',
                cursor: isSaving || isLoading || availableModels.length === 0 ? 'not-allowed' : 'pointer',
                opacity: isSaving || isLoading || availableModels.length === 0 ? '0.7' : '1'
              }}
            >
              {isSaving ? 'Saving...' : 'Save Model Selection'}
            </button>
          </div>
        ) : (
          <p style={{ color: '#ef4444', fontStyle: 'italic' }}>
            Please enter and save your API key first to see available models.
          </p>
        )}
        
        {isLoading && (
          <p style={{ color: '#6b7280', fontStyle: 'italic', marginTop: '0.5rem' }}>
            Loading available models...
          </p>
        )}
      </div>
      
      {/* API Usage Statistics section removed */}
      </div>
    </div>
  );
};

export default Settings;