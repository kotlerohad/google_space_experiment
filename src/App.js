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