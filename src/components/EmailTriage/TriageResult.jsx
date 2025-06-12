import React, { useState } from 'react';
import { SparklesIcon } from '../shared/Icons';

const TriageResult = ({ email, result, onEmailAction, onMessageLog, compact = false }) => {
  const [isDrafting, setIsDrafting] = useState(false);

  const handleCreateDraft = async () => {
    setIsDrafting(true);
    try {
      const subject = `Re: ${email.subject}`;
      await onEmailAction(email.id, 'create_draft', {
        to: email.from,
        subject: subject,
        body: result.suggested_draft
      });
    } catch (error) {
      onMessageLog?.(`Failed to create draft: ${error.message}`, 'error');
    } finally {
      setIsDrafting(false);
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

  const ConfidenceMeter = ({ score }) => {
    const scorePercentage = (score / 10) * 100;
    let colorClass = 'bg-red-500';
    if (score >= 4) colorClass = 'bg-yellow-500';
    if (score >= 7) colorClass = 'bg-green-500';

    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${scorePercentage}%` }}></div>
      </div>
    );
  };

  const KeyPointTag = ({ point }) => {
    const colors = {
      "Schedule": "bg-blue-100 text-blue-800",
      "Respond": "bg-green-100 text-green-800",
      "Update_Database": "bg-purple-100 text-purple-800",
      "Archive": "bg-gray-100 text-gray-800",
      "Review": "bg-yellow-100 text-yellow-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[point] || 'bg-gray-100'}`}>
        {point?.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="p-3 bg-gray-50 rounded-b-lg border-t border-gray-200">
      <div className="grid grid-cols-12 gap-4">
        {/* Left Side: Summary & Confidence */}
        <div className="col-span-12 md:col-span-7 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Summary</h4>
            <p className="text-sm text-gray-800">{result.summary}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Confidence</h4>
              <ConfidenceMeter score={result.confidence} />
            </div>
            <div className="text-center">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Key Point</h4>
              <KeyPointTag point={result.key_point} />
            </div>
          </div>
        </div>

        {/* Right Side: Draft & Actions */}
        <div className="col-span-12 md:col-span-5 space-y-3 pl-4 border-l border-gray-200">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Suggested Draft</h4>
            {result.suggested_draft ? (
              <>
                <div className="p-2 border rounded-md bg-white text-xs text-gray-700 max-h-24 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans">{result.suggested_draft}</pre>
                </div>
                <button
                  onClick={handleCreateDraft}
                  disabled={isDrafting}
                  className="w-full mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center justify-center gap-1 disabled:bg-blue-300"
                >
                  <SparklesIcon className="h-3 w-3" />
                  {isDrafting ? 'Creating...' : 'Create Gmail Draft'}
                </button>
              </>
            ) : (
              <p className="text-xs text-gray-500 italic">No response needed.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TriageResult; 