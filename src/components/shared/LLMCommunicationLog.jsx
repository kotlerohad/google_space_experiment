import React, { useState, useEffect, useRef } from 'react';
import { EyeIcon, ExclamationIcon, SparklesIcon, RefreshIcon } from './Icons';

const LLMCommunicationLog = ({ className = "" }) => {
  const [logs, setLogs] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when new logs are added
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    // Listen for LLM communication events
    const handleLLMEvent = (event) => {
      const { type, data } = event.detail;
      const timestamp = new Date().toLocaleTimeString();
      
      setLogs(prev => [...prev, {
        id: Date.now() + Math.random(),
        timestamp,
        type,
        ...data
      }]);
    };

    window.addEventListener('llm-communication', handleLLMEvent);
    return () => window.removeEventListener('llm-communication', handleLLMEvent);
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  const formatJSON = (obj) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return String(obj);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'request':
        return <SparklesIcon className="h-4 w-4 text-blue-600" />;
      case 'response':
        return <EyeIcon className="h-4 w-4 text-green-600" />;
      case 'error':
        return <ExclamationIcon className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-500"></div>;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'request':
        return 'border-blue-200 bg-blue-50';
      case 'response':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-700">LLM Communication</h3>
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
            {logs.length} events
          </span>
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 px-2 py-1 rounded"
            >
              <RefreshIcon className="h-3 w-3 inline mr-1" />
              Clear
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-purple-600 hover:text-purple-800 font-medium text-sm"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Real-time view of all AI model communication including prompts, responses, and errors.
          </p>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className={`border rounded-lg p-3 ${getTypeColor(log.type)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(log.type)}
                      <span className="font-semibold text-sm capitalize">{log.type}</span>
                      {log.service && (
                        <span className="bg-white px-2 py-0.5 rounded text-xs font-medium">
                          {log.service}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{log.timestamp}</span>
                  </div>

                  {log.prompt && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Prompt:</p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                        {log.prompt}
                      </pre>
                    </div>
                  )}

                  {log.schema && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Expected Schema:</p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                        {formatJSON(log.schema)}
                      </pre>
                    </div>
                  )}

                  {log.response && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Response:</p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                        {typeof log.response === 'object' ? formatJSON(log.response) : log.response}
                      </pre>
                    </div>
                  )}

                  {log.error && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Error:</p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-x-auto text-red-700">
                        {log.error}
                      </pre>
                    </div>
                  )}

                  {log.metadata && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Metadata:</p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                        {formatJSON(log.metadata)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  No LLM communication yet. Start by using AI features to see real-time communication logs.
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {logs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                <strong>Tip:</strong> This log shows all communication with AI models including prompts, schemas, responses, and errors for debugging and transparency.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LLMCommunicationLog; 