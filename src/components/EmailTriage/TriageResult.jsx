import React, { useState } from 'react';
import { CheckIcon, BrainIcon, MailIcon, CalendarIcon, UserIcon, PlayIcon } from '../shared/Icons';

const TriageResult = ({ email, result, onFeedback, onEmailAction, onMessageLog, compact = false }) => {
  const [writtenFeedback, setWrittenFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGoodFeedback = async () => {
    await onFeedback(email.id, email, result, 'good');
  };

  const submitFeedback = async () => {
    if (!writtenFeedback.trim()) {
      onMessageLog?.('Please provide written feedback explaining the correction.', 'error');
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      await onFeedback(email.id, email, result, 'bad', writtenFeedback);
      setWrittenFeedback('');
      onMessageLog?.('Thank you! Your feedback has been saved to improve future AI responses.', 'success');
    } catch (error) {
      onMessageLog?.(`Failed to save feedback: ${error.message}`, 'error');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getActionIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'gmail':
        return <MailIcon className="h-4 w-4" />;
      case 'calendar':
        return <CalendarIcon className="h-4 w-4" />;
      case 'human':
        return <UserIcon className="h-4 w-4" />;
      case 'monday.com':
        return <div className="h-4 w-4 bg-blue-500 rounded"></div>;
      default:
        return <PlayIcon className="h-4 w-4" />;
    }
  };

  const getActionColor = (type) => {
    switch (type.toLowerCase()) {
      case 'gmail':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'calendar':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'human':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'monday.com':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const executeQuickAction = async (actionText, actionType) => {
    if (actionType.toLowerCase() === 'gmail') {
      if (actionText.toLowerCase().includes('archive')) {
        await onEmailAction(email.id, 'archive');
      } else if (actionText.toLowerCase().includes('spam')) {
        await onEmailAction(email.id, 'spam');
      } else if (actionText.toLowerCase().includes('important')) {
        await onEmailAction(email.id, 'important');
      } else {
        onMessageLog?.(`Gmail action "${actionText}" not implemented yet.`, 'info');
      }
    } else if (actionType.toLowerCase() === 'monday.com') {
      onMessageLog?.(`Monday.com action "${actionText}" - Use the Monday.com section to execute this.`, 'info');
    } else {
      onMessageLog?.(`Action "${actionText}" noted. This would be handled by external integration.`, 'info');
    }
  };

  if (result.isLoading) {
    return (
      <div className={`${compact ? 'p-2' : 'mt-4 p-4'} bg-gray-50 rounded-md border border-gray-200`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          <span className="ml-2 text-gray-600">AI is analyzing this email...</span>
        </div>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className={`${compact ? 'p-2' : 'mt-4 p-4'} bg-red-50 rounded-md border border-red-200`}>
        <p className="text-red-500 font-semibold">{result.error}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <span className="font-mono bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
              {result.category}
            </span>
            <span className="text-sm text-gray-700 truncate flex-1">
              {result.summary}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {isExpanded ? 'Collapse' : 'Details'}
            </button>
            <button 
              onClick={handleGoodFeedback}
              className={`p-1 rounded text-xs transition ${
                result.feedback === 'good' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
              disabled={result.feedback === 'good'}
              title="Mark as correct"
            >
              <CheckIcon className="h-3 w-3" />
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="pl-4 border-l-2 border-gray-200 space-y-3">
            <div className="space-y-2">
              <p className="font-semibold text-sm">Suggested Actions:</p>
              {Object.entries(result.actions || {}).map(([type, actions]) => (
                actions.length > 0 && (
                  <div key={type} className={`border rounded p-2 ${getActionColor(type)}`}>
                    <div className="flex items-center gap-1 mb-1">
                      {getActionIcon(type)}
                      <h4 className="font-medium text-sm capitalize">{type}</h4>
                    </div>
                    <ul className="space-y-1">
                      {actions.map((action, i) => (
                        <li key={i} className="flex items-center justify-between">
                          <span className="text-xs">{typeof action === 'object' ? action.description : action}</span>
                          {(type.toLowerCase() === 'gmail' || type.toLowerCase() === 'monday.com') && (
                            <button
                              onClick={() => executeQuickAction(typeof action === 'object' ? action.description : action, type)}
                              className="ml-2 bg-white px-1 py-0.5 rounded text-xs hover:bg-gray-100 transition"
                            >
                              Execute
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ))}
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-start gap-2">
                <textarea
                  placeholder="If incorrect, explain what should have been different..."
                  className="flex-1 p-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                  rows="2"
                  value={writtenFeedback}
                  onChange={(e) => setWrittenFeedback(e.target.value)}
                  disabled={result.feedback === 'bad'}
                />
                <button
                  onClick={submitFeedback}
                  disabled={isSubmittingFeedback || !writtenFeedback.trim() || result.feedback === 'bad'}
                  className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:bg-blue-300 transition"
                >
                  {isSubmittingFeedback ? 'Saving...' : 'Submit'}
                </button>
              </div>
              
              {result.feedback === 'bad' && (
                <div className="mt-1 text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-1">
                  Feedback: "{result.feedback_text}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold">Category:</span>
          <span className="font-mono bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-sm">
            {result.category}
          </span>
        </div>
        <p className="mb-3">
          <span className="font-bold">Summary:</span> {result.summary}
        </p>
      </div>

      <div className="space-y-3 mb-4">
        <p className="font-bold">Suggested Actions:</p>
        {Object.entries(result.actions || {}).map(([type, actions]) => (
          actions.length > 0 && (
            <div key={type} className={`border rounded-lg p-3 ${getActionColor(type)}`}>
              <div className="flex items-center gap-2 mb-2">
                {getActionIcon(type)}
                <h4 className="font-semibold capitalize">{type}</h4>
              </div>
              <ul className="space-y-1">
                {actions.map((action, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="text-sm">{typeof action === 'object' ? action.description : action}</span>
                    {(type.toLowerCase() === 'gmail' || type.toLowerCase() === 'monday.com') && (
                      <button
                        onClick={() => executeQuickAction(typeof action === 'object' ? action.description : action, type)}
                        className="ml-2 bg-white px-2 py-1 rounded text-xs font-medium hover:bg-gray-100 transition"
                      >
                        Execute
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )
        ))}
      </div>

      <div className="pt-4 border-t">
        <p className="font-bold text-sm mb-2">Was this triage helpful?</p>
        <div className="flex items-start gap-4">
          <button 
            onClick={handleGoodFeedback}
            className={`flex items-center gap-1 p-2 rounded-lg text-sm transition ${
              result.feedback === 'good' 
                ? 'bg-green-500 text-white' 
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
            disabled={result.feedback === 'good'}
          >
            <CheckIcon className="h-4 w-4" /> 
            Correct
          </button>
          
          <div className="flex-grow">
            <textarea
              placeholder="If incorrect, explain what the triage should have been..."
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              rows="2"
              value={writtenFeedback}
              onChange={(e) => setWrittenFeedback(e.target.value)}
              disabled={result.feedback === 'bad'}
            />
            <button
              onClick={submitFeedback}
              disabled={isSubmittingFeedback || !writtenFeedback.trim() || result.feedback === 'bad'}
              className="mt-2 w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center gap-2 transition"
            >
              <BrainIcon className="h-4 w-4" />
              {isSubmittingFeedback ? 'Saving...' : 'Submit Correction'}
            </button>
          </div>
        </div>
        
        {result.feedback === 'bad' && (
          <div className="mt-2 text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-2">
            Feedback submitted: "{result.feedback_text}"
          </div>
        )}
      </div>
    </div>
  );
};

export default TriageResult; 