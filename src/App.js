import React, { useState, useContext } from 'react';
import './App.css';
import EmailList from './components/EmailTriage/EmailList';
import SupabaseIntegration from './components/Database/SupabaseIntegration';
import ApiConfig from './components/shared/ApiConfig';
import LlmMonitoring from './components/LlmMonitoring';
import { AppProvider, AppContext } from './AppContext';
import { Toaster } from 'sonner';
import PromptEditor from './components/shared/PromptEditor';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CollapsiblePane = ({ title, children, isCollapsed, onToggle }) => {
  return (
    <div className={`collapsible-pane ${isCollapsed ? 'collapsed' : ''}`} style={{ flexBasis: isCollapsed ? '4rem' : '50%', flexGrow: isCollapsed ? 0 : 1 }}>
      <div className="pane-header" onClick={onToggle}>
        {!isCollapsed && <h2>{title}</h2>}
        <button className="p-1 hover:bg-gray-100 rounded-full">
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <div className={`pane-content ${isCollapsed ? 'hidden' : ''}`}>
        {children}
      </div>
    </div>
  );
};

const AppContent = () => {
  const { config, isConfigLoaded, onMessageLog } = useContext(AppContext);
  const [panes, setPanes] = useState({ left: true, right: false });

  const togglePane = (pane) => {
    setPanes(prev => ({ ...prev, [pane]: !prev[pane] }));
  };

  if (!isConfigLoaded) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Configuration...</p>
      </div>
    );
  }
  
  const isConfigured = config.openaiApiKey || (config.googleClientId && config.googleClientSecret) || config.demoMode;

  return (
    <>
      <Toaster richColors position="top-right" />
      <header className="app-header">
        <h1>AI Productivity Assistant</h1>
        <div className="w-1/2">
          <ApiConfig />
        </div>
      </header>
      <main className="app-main">
        {isConfigured ? (
          <>
            <CollapsiblePane 
              title="Email Management" 
              isCollapsed={panes.left} 
              onToggle={() => togglePane('left')}
            >
              <EmailList onMessageLog={onMessageLog} config={config} />
            </CollapsiblePane>
            <CollapsiblePane 
              title="Database" 
              isCollapsed={panes.right} 
              onToggle={() => togglePane('right')}
            >
              <SupabaseIntegration onMessageLog={onMessageLog} />
            </CollapsiblePane>
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
        <PromptEditor onMessageLog={onMessageLog} />
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