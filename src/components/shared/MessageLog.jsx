import React, { useEffect, useRef } from 'react';
import { CheckIcon, ExclamationIcon } from './Icons';

const MessageLog = ({ messages = [], title = "Activity Log", className = "" }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getMessageIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckIcon className="h-4 w-4 text-green-600" />;
      case 'error':
        return <ExclamationIcon className="h-4 w-4 text-red-600" />;
      case 'info':
      default:
        return <div className="h-4 w-4 rounded-full bg-blue-500"></div>;
    }
  };

  const getMessageClasses = (type) => {
    const baseClasses = "p-3 rounded-md border text-sm";
    switch (type) {
      case 'success':
        return `${baseClasses} bg-green-50 border-green-200 text-green-800`;
      case 'error':
        return `${baseClasses} bg-red-50 border-red-200 text-red-800`;
      case 'info':
      default:
        return `${baseClasses} bg-blue-50 border-blue-200 text-blue-800`;
    }
  };

  if (messages.length === 0) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
        <h3 className="text-lg font-semibold mb-4 text-gray-700">{title}</h3>
        <p className="text-gray-500 text-center py-8">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-700">{title}</h3>
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {messages.map((message, index) => (
          <div key={index} className="flex items-start gap-3">
            {getMessageIcon(message.type)}
            <div className="flex-1">
              <div className={getMessageClasses(message.type)}>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs text-gray-500">
                    {message.timestamp || new Date().toLocaleTimeString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageLog; 