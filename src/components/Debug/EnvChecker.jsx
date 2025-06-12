import React from 'react';

const EnvChecker = () => {
  const envVars = {
    'REACT_APP_OPENAI_API_KEY': process.env.REACT_APP_OPENAI_API_KEY,
    'REACT_APP_SUPABASE_URL': process.env.REACT_APP_SUPABASE_URL,
    'REACT_APP_SUPABASE_ANON_KEY': process.env.REACT_APP_SUPABASE_ANON_KEY,
    'REACT_APP_GMAIL_CLIENT_ID': process.env.REACT_APP_GMAIL_CLIENT_ID,
    'REACT_APP_GMAIL_CLIENT_SECRET': process.env.REACT_APP_GMAIL_CLIENT_SECRET,
  };

  return (
    <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
      <h3 className="font-semibold mb-2 text-yellow-800">Environment Variables Debug</h3>
      <div className="space-y-1 text-sm">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="font-mono text-gray-600">{key}:</span>
            <span className={`font-mono ${value ? 'text-green-600' : 'text-red-600'}`}>
              {value ? (
                key.includes('KEY') || key.includes('SECRET') ? 
                  `Set (${value.length} chars)` : 
                  value.length > 50 ? `${value.substring(0, 50)}...` : value
              ) : 'Not set'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnvChecker; 