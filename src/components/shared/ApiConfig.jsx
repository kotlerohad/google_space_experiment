import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../AppContext';
import emailService from '../../services/emailService';
import openAIService from '../../services/openAIService';
import supabaseService from '../../services/supabaseService';
import { toast } from 'sonner';

const StatusIndicator = ({ label, isConnected, onTest, onAuth, onLogout, isLoading }) => {
  const statusColor = isConnected ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${statusColor}`}></div>
        <span className="font-medium text-sm text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {onTest && (
          <button
            onClick={onTest}
            disabled={isLoading || !isConnected}
            className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Test
          </button>
        )}
        {onAuth && !isConnected && (
          <button
            onClick={onAuth}
            disabled={isLoading}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isLoading ? '...' : 'Auth'}
          </button>
        )}
        {onLogout && isConnected && (
          <button
            onClick={onLogout}
            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
};

const ApiConfig = () => {
  const { config } = useContext(AppContext);
  const [isLoading, setIsLoading] = useState(false);
  const [statuses, setStatuses] = useState({
    openai: false,
    gmail: false,
    calendar: false,
    supabase: false,
  });

  const checkInitialStatuses = useCallback(() => {
    setStatuses({
      openai: !!config.openaiApiKey,
      gmail: emailService.getOAuthStatus().hasAccessToken,
      calendar: emailService.getOAuthStatus().hasCalendarAccess,
      supabase: supabaseService.isConnected(),
    });
  }, [config.openaiApiKey]);

  useEffect(() => {
    checkInitialStatuses();
    const interval = setInterval(checkInitialStatuses, 5000); // Re-check every 5s
    return () => clearInterval(interval);
  }, [checkInitialStatuses]);

  const handleGmailOAuth = async () => {
    if (!config.googleClientId || !config.googleClientSecret) {
      toast.error('Gmail OAuth credentials not configured.');
      return;
    }
    try {
      setIsLoading(true);
      toast.info('Starting Gmail OAuth flow...');
      await emailService.startOAuthFlow();
      toast.success('Gmail OAuth completed successfully!');
      checkInitialStatuses(); 
    } catch (error) {
      console.error('OAuth error:', error);
      toast.error(`OAuth failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGmailLogout = () => {
    emailService.clearTokens();
    toast.info('Gmail tokens cleared.');
    checkInitialStatuses();
  };
  
  const testOpenAIConnection = async () => {
    if (!statuses.openai) return;
    try {
      setIsLoading(true);
      await openAIService.testConnection();
      toast.success('OpenAI API test successful!');
    } catch (error) {
      toast.error(`OpenAI API test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testSupabaseConnection = async () => {
    if (!statuses.supabase) return;
    try {
      setIsLoading(true);
      await supabaseService.testConnection();
      toast.success('Supabase connection test successful!');
    } catch (error) {
      toast.error(`Supabase test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testCalendarConnection = async () => {
    if (!statuses.calendar) return;
    try {
      setIsLoading(true);
      const events = await emailService.testCalendarConnection();
      toast.success(`Calendar test successful! Found ${events.length} upcoming events.`);
    } catch (error) {
      toast.error(`Calendar test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testDraftCreation = async () => {
    if (!statuses.gmail) return;
    try {
      setIsLoading(true);
      const userProfile = await emailService.testConnection();
      const to = userProfile.emailAddress;
      await emailService.createDraft(to, 'Test Draft', 'This is a test draft from the AI Productivity Assistant.');
      toast.success(`Test draft created successfully in your Gmail account.`);
    } catch (error) {
      toast.error(`Draft creation failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      <StatusIndicator
        label="OpenAI"
        isConnected={statuses.openai}
        onTest={testOpenAIConnection}
        isLoading={isLoading}
      />
      <StatusIndicator
        label="Gmail API"
        isConnected={statuses.gmail}
        onAuth={handleGmailOAuth}
        onLogout={handleGmailLogout}
        isLoading={isLoading}
      />
       <StatusIndicator
        label="Calendar"
        isConnected={statuses.calendar}
        onAuth={handleGmailOAuth} // Same auth flow
        isLoading={isLoading}
        onTest={testCalendarConnection}
      />
      <StatusIndicator
        label="Supabase"
        isConnected={statuses.supabase}
        onTest={testSupabaseConnection}
        isLoading={isLoading}
      />
      <StatusIndicator
        label="Test Draft"
        isConnected={statuses.gmail}
        onTest={testDraftCreation}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ApiConfig; 