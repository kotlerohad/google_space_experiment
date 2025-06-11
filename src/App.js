import React, { useEffect, useContext } from 'react';
import './App.css';
import EmailPane from './components/EmailPane';
import TriagePane from './components/TriagePane';
import ApiConfig from './components/shared/ApiConfig';
import LlmMonitoring from './components/LlmMonitoring';
import { AppProvider, AppContext } from './AppContext';
import supabaseService from './services/supabaseService';
import emailService from './services/emailService';
import geminiService from './services/geminiService';
import { Toaster } from 'sonner';
import PromptEditor from './components/shared/PromptEditor';

const AppContent = () => {
  const { config, isConfigLoaded } = useContext(AppContext);

  if (!isConfigLoaded) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Configuration...</p>
      </div>
    );
  }
  
  const isConfigured = config.geminiApiKey || (config.googleClientId && config.googleClientSecret) || config.demoMode;

  return (
    <>
      <Toaster richColors position="top-right" />
      <header className="app-header">
        <h1>AI Productivity Assistant</h1>
        <ApiConfig />
      </header>
      <main className="app-main">
        {isConfigured ? (
          <>
            <EmailPane />
            <TriagePane />
          </>
        ) : (
          <div className="welcome-container">
            <h2>Welcome to your AI Productivity Assistant</h2>
            <p>Please configure your API keys to get started.</p>
          </div>
        )}
      </main>
      <footer className="app-footer">
        <LlmMonitoring />
        <PromptEditor />
      </footer>
    </>
  );
};

const App = () => {
  const { setConfig } = useContext(AppContext);

  useEffect(() => {
    // Load config from localStorage or .env
    const loadedConfig = {
      geminiApiKey: localStorage.getItem('geminiApiKey') || process.env.REACT_APP_GEMINI_API_KEY,
      googleClientId: localStorage.getItem('googleClientId') || process.env.REACT_APP_GOOGLE_CLIENT_ID,
      googleClientSecret: localStorage.getItem('googleClientSecret') || process.env.REACT_APP_GOOGLE_CLIENT_SECRET,
      supabaseUrl: localStorage.getItem('supabaseUrl') || process.env.REACT_APP_SUPABASE_URL,
      supabaseKey: localStorage.getItem('supabaseKey') || process.env.REACT_APP_SUPABASE_ANON_KEY,
      useFirebase: process.env.REACT_APP_USE_FIREBASE === 'true',
      firebaseConfig: {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID
      },
      demoMode: !process.env.REACT_APP_GEMINI_API_KEY, // Basic demo mode check
    };
    setConfig(loadedConfig);
    
    // Initialize services
    if (loadedConfig.geminiApiKey) {
      geminiService.setApiKey(loadedConfig.geminiApiKey);
    }
    if (loadedConfig.googleClientId && loadedConfig.googleClientSecret) {
      emailService.setClientCredentials(loadedConfig.googleClientId, loadedConfig.googleClientSecret);
    }
    if (loadedConfig.supabaseUrl && loadedConfig.supabaseKey) {
        supabaseService.initialize(loadedConfig.supabaseUrl, loadedConfig.supabaseKey);
    }
    
  }, [setConfig]);

  return (
    <div className="app-container">
      <AppContent />
    </div>
  );
};

const WrappedApp = () => (
  <AppProvider>
    <App />
  </AppProvider>
);

export default WrappedApp; 