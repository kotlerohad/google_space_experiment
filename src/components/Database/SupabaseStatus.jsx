import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../AppContext';

const SupabaseStatus = () => {
  const { supabaseService, config } = useContext(AppContext);
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        console.log('🔍 SupabaseStatus - Checking connection...');
        console.log('🔍 Config:', {
          hasUrl: !!config.supabaseUrl,
          hasKey: !!config.supabaseKey,
          url: config.supabaseUrl,
          isConnected: supabaseService.isConnected()
        });

        // Wait a bit for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!supabaseService.isConnected()) {
          setStatus('disconnected');
          setError('Supabase client not initialized');
          
          // Try to re-initialize if we have credentials
          if (config.supabaseUrl && config.supabaseKey) {
            console.log('🔄 Attempting to re-initialize Supabase...');
            supabaseService.initialize(config.supabaseUrl, config.supabaseKey);
            
            // Check again after re-initialization
            if (supabaseService.isConnected()) {
              const testResult = await supabaseService.testConnection();
              console.log('🔍 Supabase test result after re-init:', testResult);
              setStatus('connected');
              setError(null);
            }
          }
          return;
        }

        const testResult = await supabaseService.testConnection();
        console.log('🔍 Supabase test result:', testResult);
        setStatus('connected');
        setError(null);
      } catch (err) {
        console.error('🔍 SupabaseStatus - Connection test failed:', err);
        setStatus('error');
        setError(err.message);
      }
    };

    checkStatus();
    
    // Set up a periodic check every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [supabaseService, config]);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return '✅ Connected';
      case 'disconnected': return '⚠️ Disconnected';
      case 'error': return '❌ Error';
      default: return '🔄 Checking...';
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold mb-2">Supabase Status</h3>
      <div className={`font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </div>
      {error && (
        <div className="mt-2 text-sm text-red-600">
          Error: {error}
        </div>
      )}
      <div className="mt-2 text-xs text-gray-500">
        <div>URL: {config.supabaseUrl || 'Not set'}</div>
        <div>Key: {config.supabaseKey ? 'Set' : 'Not set'}</div>
        <div>Client: {supabaseService.isConnected() ? 'Initialized' : 'Not initialized'}</div>
      </div>
    </div>
  );
};

export default SupabaseStatus; 