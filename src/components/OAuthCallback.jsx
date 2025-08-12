import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const OAuthCallback = () => {
  const [status, setStatus] = useState('Processing authentication...');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract success parameter from URL
        const urlParams = new URLSearchParams(location.search);
        const success = urlParams.get('success');
        
        if (success !== 'true') {
          setStatus('Error: Authentication was not successful');
          return;
        }

        // Check authentication status with the backend
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://forms-fnuk.onrender.com';
        const response = await fetch(`${API_BASE_URL}/auth/google/status`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to verify authentication: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        
        // Check if user is authenticated according to the backend
        if (!result.authenticated) {
          throw new Error('Backend reports user is not authenticated');
        }
        
        // Authentication is successful
        setStatus('Authentication successful! Redirecting...');
        
        // If we have a return URL in session storage, use it
        const returnUrl = sessionStorage.getItem('oauth_return_url') || '/';
        sessionStorage.removeItem('oauth_return_url'); // Clean up
        
        // Redirect back to the original page after a short delay
        setTimeout(() => {
          navigate(returnUrl);
        }, 1500);
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus(`Error: ${error.message}`);
      }
    };

    handleCallback();
  }, [location, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">Google Authentication</h2>
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-16 w-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
          <p className="text-center text-gray-600">{status}</p>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;