import React, { useState, useContext } from 'react';
import { Cog } from 'lucide-react';
import { AppContext } from '../../AppContext';
import geminiService from '../../services/geminiService';
import emailService from '../../services/emailService';
import supabaseService from '../../services/supabaseService';
import mondayService from '../../services/mondayService';

const ApiConfig = ({ onConfigChange }) => {
  const [config, setConfig] = useState({
    geminiApiKey: '',
    gmailApiKey: '',
    gmailClientId: '',
    gmailClientSecret: '',
    gmailRefreshToken: '',
    mondayApiToken: '',
    mondayBoardId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadConfiguration = async () => {
    if (isInitialized) return;
    
    try {
      const stored = JSON.parse(localStorage.getItem('api_config') || '{}');
      
      // Load environment variables with precedence over stored config
      const envConfig = {
        geminiApiKey: process.env.REACT_APP_GEMINI_API_KEY || stored.geminiApiKey || '',
        gmailApiKey: process.env.REACT_APP_GMAIL_ACCESS_TOKEN || stored.gmailApiKey || '',
        gmailClientId: process.env.REACT_APP_GMAIL_CLIENT_ID || stored.gmailClientId || '',
        gmailClientSecret: process.env.REACT_APP_GMAIL_CLIENT_SECRET || stored.gmailClientSecret || '',
        gmailRefreshToken: process.env.REACT_APP_GMAIL_REFRESH_TOKEN || stored.gmailRefreshToken || '',
        mondayApiToken: process.env.REACT_APP_MONDAY_API_KEY || stored.mondayApiToken || '',
        mondayBoardId: process.env.REACT_APP_MONDAY_BOARD_ID || stored.mondayBoardId || ''
      };
      
      setConfig(envConfig);
      
      // Configure services with loaded values
      if (envConfig.geminiApiKey) {
        geminiService.setApiKey(envConfig.geminiApiKey);
      }
      if (envConfig.gmailApiKey) {
        emailService.setAccessToken(envConfig.gmailApiKey);
      }
      if (envConfig.gmailClientId && envConfig.gmailClientSecret) {
        emailService.setOAuthConfig(envConfig.gmailClientId, envConfig.gmailClientSecret);
        // Try to load any stored OAuth tokens
        emailService.loadStoredTokens();
      }
      if (envConfig.mondayApiToken) {
        mondayService.setApiToken(envConfig.mondayApiToken);
      }
      
      // Notify parent component
      if (onConfigChange) {
        onConfigChange(envConfig);
      }
      
      setIsInitialized(true);
      console.log('🔑 Configuration loaded from environment/storage');
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  };

  const handleGmailOAuth = async () => {
    if (!config.gmailClientId || !config.gmailClientSecret) {
      showMessage('Gmail OAuth credentials not found in environment variables. Please check your .env file.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      showMessage('Starting Gmail OAuth flow...', 'info');
      
      // Configure OAuth
      emailService.setOAuthConfig(config.gmailClientId, config.gmailClientSecret);
      
      // Start OAuth flow
      const tokens = await emailService.startOAuthFlow();
      
      if (tokens) {
        showMessage('Gmail OAuth completed successfully! You can now fetch emails.', 'success');
        // Reload configuration to reflect new token status
        await loadConfiguration();
      }
    } catch (error) {
      console.error('OAuth error:', error);
      showMessage(`OAuth failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGmailLogout = () => {
    emailService.clearTokens();
    showMessage('Gmail tokens cleared. You can re-authorize to access emails again.', 'info');
    loadConfiguration();
  };

  const testGeminiConnection = async () => {
    if (!config.geminiApiKey) {
      showMessage('Gemini API key not found. Please add REACT_APP_GEMINI_API_KEY to your .env file.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const result = await geminiService.testConnection();
      
      if (result.success) {
        showMessage(`Gemini API test successful! Response: "${result.response}"`, 'success');
      } else {
        showMessage(`Gemini API test failed: ${result.error}`, 'error');
      }
    } catch (error) {
      showMessage(`Gemini API test failed: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const getStatusIcon = (hasValue) => {
    return hasValue ? '✅' : '❌';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cog className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-700">API Status & OAuth</h2>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* API Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="font-medium text-gray-700">Gemini AI</span>
          <div className="flex items-center gap-2">
            <span className="text-lg">{getStatusIcon(config.geminiApiKey)}</span>
            {config.geminiApiKey && (
              <button
                onClick={testGeminiConnection}
                disabled={isLoading}
                className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 disabled:bg-purple-300"
              >
                Test
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="font-medium text-gray-700">Gmail API</span>
          <div className="flex items-center gap-2">
            <span className="text-lg">{getStatusIcon(config.gmailApiKey || emailService.getOAuthStatus().hasAccessToken)}</span>
            {(config.gmailClientId && config.gmailClientSecret) && (
              <>
                {!emailService.getOAuthStatus().hasAccessToken ? (
                  <button
                    onClick={handleGmailOAuth}
                    disabled={isLoading}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {isLoading ? 'Authorizing...' : 'Authorize'}
                  </button>
                ) : (
                  <button
                    onClick={handleGmailLogout}
                    className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                  >
                    Logout
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="font-medium text-gray-700">Monday.com</span>
          <span className="text-lg">{getStatusIcon(config.mondayApiToken)}</span>
        </div>
      </div>

      {/* Configuration Details */}
      {isExpanded && (
        <div className="space-y-4 border-t pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">📋 Configuration Status</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Gemini API:</strong> {config.geminiApiKey ? '✅ Configured from .env' : '❌ Missing REACT_APP_GEMINI_API_KEY'}</p>
              <p><strong>Gmail Token:</strong> {emailService.getOAuthStatus().hasAccessToken ? '✅ OAuth token active' : (config.gmailApiKey ? '🔑 Temporary token' : '❌ No access token')}</p>
              <p><strong>Gmail OAuth:</strong> {(config.gmailClientId && config.gmailClientSecret) ? '✅ Credentials configured' : '❌ Missing OAuth credentials'}</p>
              <p><strong>Monday.com:</strong> {config.mondayApiToken ? '✅ API token configured' : '❌ Missing REACT_APP_MONDAY_API_KEY'}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-800 mb-2">🔧 Setup Instructions</h3>
            <div className="text-sm text-amber-700 space-y-2">
              <p><strong>1. Environment Variables:</strong> All API keys should be configured in your <code>.env</code> file</p>
              <p><strong>2. Gmail OAuth:</strong> For permanent access, get OAuth credentials from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></p>
              <p><strong>3. Temporary Tokens:</strong> For quick testing, use <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OAuth Playground</a></p>
              <p><strong>4. Restart Required:</strong> After updating .env, restart your development server</p>
            </div>
          </div>

          {message.text && (
            <div className={`p-4 rounded-lg border ${
              message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
              message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
              'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              {message.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApiConfig; 