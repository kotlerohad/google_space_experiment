import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import supabaseService from './services/supabaseService';
import emailService from './services/emailService';
import geminiService from './services/geminiService';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [config, setConfig] = useState({
    geminiApiKey: '',
    googleClientId: '',
    googleClientSecret: '',
    supabaseUrl: '',
    supabaseKey: '',
    useFirebase: false,
    firebaseConfig: {},
    demoMode: false,
  });
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const servicesInitialized = useRef(false);

  // Load config and initialize services
  useEffect(() => {
    if (servicesInitialized.current) return;

    try {
      const loadedConfig = {
        geminiApiKey: localStorage.getItem('geminiApiKey') || process.env.REACT_APP_GEMINI_API_KEY || '',
        googleClientId: localStorage.getItem('googleClientId') || process.env.REACT_APP_GMAIL_CLIENT_ID || '',
        googleClientSecret: localStorage.getItem('googleClientSecret') || process.env.REACT_APP_GMAIL_CLIENT_SECRET || '',
        supabaseUrl: localStorage.getItem('supabaseUrl') || process.env.REACT_APP_SUPABASE_URL || '',
        supabaseKey: localStorage.getItem('supabaseKey') || process.env.REACT_APP_SUPABASE_ANON_KEY || '',
        demoMode: !process.env.REACT_APP_GEMINI_API_KEY,
      };
      
      setConfig(loadedConfig);

      // Initialize services with the loaded config
      if (loadedConfig.geminiApiKey) {
        geminiService.setApiKey(loadedConfig.geminiApiKey);
      }
      if (loadedConfig.googleClientId && loadedConfig.googleClientSecret) {
        emailService.setOAuthConfig(loadedConfig.googleClientId, loadedConfig.googleClientSecret);
        emailService.loadStoredTokens();
      }
      if (loadedConfig.supabaseUrl && loadedConfig.supabaseKey) {
        supabaseService.initialize(loadedConfig.supabaseUrl, loadedConfig.supabaseKey);
      }
      
      servicesInitialized.current = true;
    } catch (error) {
      console.error("Failed to initialize app:", error);
      toast.error('A critical error occurred during app initialization.');
    } finally {
      setIsConfigLoaded(true); // Signal that config loading is complete
    }
  }, []);

  const onMessageLog = useCallback((message, type = 'info') => {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'warning':
        toast.warning(message);
        break;
      default:
        toast.info(message);
        break;
    }
  }, []);

  const updateConfig = (newConfig) => {
    setConfig(prevConfig => ({ ...prevConfig, ...newConfig }));
    
    // Save to localStorage
    Object.keys(newConfig).forEach(key => {
      if (newConfig[key] && typeof newConfig[key] === 'string') {
        localStorage.setItem(key, newConfig[key]);
      }
    });
  };

  return (
    <AppContext.Provider value={{
      config,
      setConfig: updateConfig,
      isConfigLoaded,
      onMessageLog,
    }}>
      {children}
    </AppContext.Provider>
  );
}; 