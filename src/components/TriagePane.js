import React, { useState, useContext } from 'react';
import { AppContext } from '../AppContext';
import MondayIntegration from './MondayIntegration/MondayIntegration';

const TriagePane = () => {
  const { config } = useContext(AppContext);
  const [messages, setMessages] = useState([]);

  const handleMessageLog = (message, type = 'info') => {
    const newMessage = {
      id: Date.now(),
      text: message,
      type: type,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [newMessage, ...prev.slice(0, 49)]); // Keep last 50 messages
  };

  return (
    <div className="triage-pane">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-purple-50 border-b border-purple-200 p-4">
          <h2 className="text-xl font-semibold text-purple-800 flex items-center gap-2">
            🎯 Smart Triage & Actions
          </h2>
          <p className="text-purple-600 text-sm">
            Monday.com integration and workflow automation
          </p>
        </div>
        
        <div className="p-6">
          <MondayIntegration onMessageLog={handleMessageLog} config={config} />
        </div>
      </div>

      {/* Message Log */}
      {messages.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-md">
          <div className="bg-gray-50 border-b border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-800">Integration Log</h3>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 border-b border-gray-100 text-sm ${
                  msg.type === 'error' ? 'bg-red-50 text-red-800' :
                  msg.type === 'success' ? 'bg-green-50 text-green-800' :
                  msg.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                  'bg-blue-50 text-blue-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span>{msg.text}</span>
                  <span className="text-xs opacity-60">{msg.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TriagePane; 