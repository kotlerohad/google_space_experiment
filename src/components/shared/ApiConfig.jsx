import React, { useState, useContext } from 'react';
import { Cog } from 'lucide-react';
import { AppContext } from '../../AppContext';
import emailService from '../../services/emailService';
import geminiService from '../../services/geminiService';

const ApiConfig = () => {
  const { config } = useContext(AppContext);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isExpanded, setIsExpanded] = useState(false);
  const [authVersion, setAuthVersion] = useState(0);

  const handleGmailOAuth = async () => {
    if (!config.googleClientId || !config.googleClientSecret) {
      showMessage('Gmail OAuth credentials not found. Please check your .env file.', 'error');
      return;
    }
    try {
      setIsLoading(true);
      showMessage('Starting Gmail OAuth flow...', 'info');
      const tokens = await emailService.startOAuthFlow();
      if (tokens) {
        showMessage('Gmail OAuth completed successfully!', 'success');
        setAuthVersion(v => v + 1);
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
    showMessage('Gmail tokens cleared.', 'info');
    setAuthVersion(v => v + 1);
  };

  const testGeminiConnection = async () => {
    if (!config.geminiApiKey) {
      showMessage('Gemini API key not found in .env.', 'error');
      return;
    }
    try {
      setIsLoading(true);
      await geminiService.generateText('Hello, this is a test.');
      showMessage('Gemini API test successful!', 'success');
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

  const getStatusIcon = (hasValue) => (hasValue ? '✅' : '❌');

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cog className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-700">API Status</h2>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <span className="text-lg" key={authVersion}>{getStatusIcon(emailService.getOAuthStatus().hasAccessToken)}</span>
            {(config.googleClientId && config.googleClientSecret) && (
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
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t">
          {message.text && (
            <div className={`p-3 rounded-lg border text-sm ${
              message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
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