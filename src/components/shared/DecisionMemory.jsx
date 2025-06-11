import React, { useState, useEffect } from 'react';
import { BrainIcon, CheckIcon, ExclamationIcon } from './Icons';
import firebaseService from '../../services/firebaseService';

const DecisionMemory = ({ className = "" }) => {
  const [decisionMemory, setDecisionMemory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToTriageResults((results, memory) => {
      setDecisionMemory(memory);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (isLoading) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <BrainIcon className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-700">Decision Memory</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading feedback history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <BrainIcon className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-700">Decision Memory</h3>
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
          {decisionMemory.length} entries
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Your feedback history helps improve the AI's performance. This data could be used for future fine-tuning.
      </p>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        {decisionMemory.length > 0 ? (
          decisionMemory.map((item, index) => (
            <div key={item.id || index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800">
                    {item.source_email?.subject || 'Unknown Email'}
                  </p>
                  <p className="text-xs text-gray-500">
                    From: {item.source_email?.from || 'Unknown Sender'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {item.feedback === 'good' ? (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <ExclamationIcon className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-xs font-medium ${
                    item.feedback === 'good' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.feedback === 'good' ? 'Correct' : 'Corrected'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium text-gray-700">AI Category:</span>
                  <span className="ml-1 bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-xs">
                    {item.original_triage?.category || item.category || 'Unknown'}
                  </span>
                </div>

                {item.feedback === 'bad' && item.feedback_text && (
                  <div>
                    <span className="font-medium text-gray-700">Your Correction:</span>
                    <p className="text-gray-600 italic mt-1 pl-2 border-l-2 border-gray-300">
                      "{truncateText(item.feedback_text, 120)}"
                    </p>
                  </div>
                )}

                <div className="text-xs text-gray-400">
                  {formatTimestamp(item.timestamp)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <BrainIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No feedback history yet. Start by triaging emails and providing feedback to build your decision memory.
            </p>
          </div>
        )}
      </div>

      {decisionMemory.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Next Steps:</strong> This feedback data can be used to fine-tune a custom AI model specifically trained on your preferences.
          </p>
        </div>
      )}
    </div>
  );
};

export default DecisionMemory; 