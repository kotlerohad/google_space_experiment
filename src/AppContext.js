import React, { createContext, useState, useEffect } from 'react';

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

  useEffect(() => {
    // Load config from localStorage and environment variables
    const loadedConfig = {
      geminiApiKey: localStorage.getItem('geminiApiKey') || process.env.REACT_APP_GEMINI_API_KEY,
      googleClientId: localStorage.getItem('googleClientId') || process.env.REACT_APP_GMAIL_CLIENT_ID,
      googleClientSecret: localStorage.getItem('googleClientSecret') || process.env.REACT_APP_GMAIL_CLIENT_SECRET,
      gmailApiKey: localStorage.getItem('gmailApiKey') || process.env.REACT_APP_GMAIL_ACCESS_TOKEN,
      gmailRefreshToken: localStorage.getItem('gmailRefreshToken') || process.env.REACT_APP_GMAIL_REFRESH_TOKEN,
      mondayApiToken: localStorage.getItem('mondayApiToken') || process.env.REACT_APP_MONDAY_API_KEY,
      mondayBoardId: localStorage.getItem('mondayBoardId') || process.env.REACT_APP_MONDAY_BOARD_ID,
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
      demoMode: !process.env.REACT_APP_GEMINI_API_KEY,
    };
    
    setConfig(loadedConfig);
    setIsConfigLoaded(true);
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
      isConfigLoaded
    }}>
      {children}
    </AppContext.Provider>
  );
}; 