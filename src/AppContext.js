import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import supabaseService from './services/supabaseService';
import emailService from './services/emailService';
import openAIService from './services/openAIService';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [config, setConfig] = useState({
    openaiApiKey: '',
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
      // Clear any potentially problematic localStorage values that might override env vars
      const supabaseUrlFromStorage = localStorage.getItem('supabaseUrl');
      const supabaseKeyFromStorage = localStorage.getItem('supabaseKey');
      
      if (supabaseUrlFromStorage && (supabaseUrlFromStorage.includes('your_supabase_url_here') || supabaseUrlFromStorage.includes('placeholder'))) {
        console.log('🧹 Clearing problematic supabaseUrl from localStorage');
        localStorage.removeItem('supabaseUrl');
      }
      
      if (supabaseKeyFromStorage && (supabaseKeyFromStorage.includes('your_supabase_key_here') || supabaseKeyFromStorage.includes('placeholder'))) {
        console.log('🧹 Clearing problematic supabaseKey from localStorage');
        localStorage.removeItem('supabaseKey');
      }
      
      // Force clear any cached values that might interfere
      localStorage.removeItem('supabaseUrl');
      localStorage.removeItem('supabaseKey');
      const loadedConfig = {
        openaiApiKey: process.env.REACT_APP_OPENAI_API_KEY || '',
        googleClientId: localStorage.getItem('googleClientId') || process.env.REACT_APP_GMAIL_CLIENT_ID || '',
        googleClientSecret: localStorage.getItem('googleClientSecret') || process.env.REACT_APP_GMAIL_CLIENT_SECRET || '',
        // Use only environment variables for Supabase (no localStorage)
        supabaseUrl: process.env.REACT_APP_SUPABASE_URL || '',
        supabaseKey: process.env.REACT_APP_SUPABASE_ANON_KEY || '',
        demoMode: !process.env.REACT_APP_OPENAI_API_KEY,
      };
      

      
      setConfig(loadedConfig);

      // Initialize services with the loaded config
      if (loadedConfig.openaiApiKey) {
        console.log('🔧 AppContext - Setting OpenAI API key:', loadedConfig.openaiApiKey ? 'Key present' : 'Key missing');
        openAIService.setApiKey(loadedConfig.openaiApiKey);
      } else {
        console.warn('🔧 AppContext - OpenAI API key not found in environment variables');
        toast.warning('OpenAI API key not configured. AI features will not be available.');
      }
      if (loadedConfig.googleClientId && loadedConfig.googleClientSecret) {
        emailService.setOAuthConfig(loadedConfig.googleClientId, loadedConfig.googleClientSecret);
        emailService.loadStoredTokens();
      }
      if (loadedConfig.supabaseUrl && loadedConfig.supabaseKey) {
        // Check for placeholder values
        if (loadedConfig.supabaseUrl.includes('your_supabase_url_here') || 
            loadedConfig.supabaseKey.includes('your_supabase_key_here')) {
          console.error('🔧 AppContext - Supabase credentials contain placeholder values!');
          toast.error('Supabase credentials not properly configured. Please check your .env file.');
        } else {
          console.log('🔧 AppContext - Initializing Supabase with valid credentials');
          try {
        supabaseService.initialize(loadedConfig.supabaseUrl, loadedConfig.supabaseKey);
            console.log('✅ Supabase service initialized successfully');
          } catch (error) {
            console.error('❌ Failed to initialize Supabase service:', error);
            toast.error(`Failed to initialize Supabase: ${error.message}`);
          }
        }
      } else {
        console.warn('🔧 AppContext - Supabase not initialized:', {
          hasUrl: !!loadedConfig.supabaseUrl,
          hasKey: !!loadedConfig.supabaseKey,
          urlValue: loadedConfig.supabaseUrl,
          keyValue: loadedConfig.supabaseKey ? 'Set' : 'Not set'
        });
        toast.warning('Supabase credentials missing. Database features will not be available.');
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
    
    // Save to localStorage (but not the OpenAI key)
    Object.keys(newConfig).forEach(key => {
      if (key !== 'openaiApiKey' && newConfig[key] && typeof newConfig[key] === 'string') {
        localStorage.setItem(key, newConfig[key]);
      }
    });

    // Re-initialize services when config changes (OpenAI key comes from env)
    if (newConfig.supabaseUrl && newConfig.supabaseKey) {
      supabaseService.initialize(newConfig.supabaseUrl, newConfig.supabaseKey);
    }
  };

  return (
    <AppContext.Provider value={{
      config,
      setConfig: updateConfig,
      isConfigLoaded,
      onMessageLog,
      // Provide services in context
      openAIService,
      supabaseService,
      emailService,
    }}>
      {children}
    </AppContext.Provider>
  );
}; 