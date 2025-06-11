import React, { useState, useContext } from 'react';
import { AppContext } from '../AppContext';
import EmailList from './EmailTriage/EmailList';

const EmailPane = () => {
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
    <div className="email-pane">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <h2 className="text-xl font-semibold text-blue-800 flex items-center gap-2">
            📧 Email Management
          </h2>
          <p className="text-blue-600 text-sm">
            Fetch and triage your emails with AI assistance
          </p>
        </div>
        
        <div className="p-6">
          <EmailList onMessageLog={handleMessageLog} config={config} />
        </div>
      </div>

      {/* Message Log */}
      {messages.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-md">
          <div className="bg-gray-50 border-b border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-800">Activity Log</h3>
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

export default EmailPane; 