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
        {/* Left Side: Action Decision & Context */}
        <div className="col-span-12 md:col-span-7 space-y-3">
          {/* PRIMARY: Action Decision */}
          <div className="p-3 bg-white border border-gray-300 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-gray-700 uppercase">Action Decision</h4>
              <div className="flex items-center gap-2">
                <KeyPointTag point={result.key_point} />
                                 <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                   result.confidence >= 8 ? 'bg-green-100 text-green-700' :
                   result.confidence >= 6 ? 'bg-yellow-100 text-yellow-700' :
                   'bg-red-100 text-red-700'
                 }`}>
                   {result.confidence || 0}/10 confidence
                 </span>
              </div>
            </div>
                         <div className="space-y-1">
               <p className="text-sm text-gray-800 font-medium">
                 <span className="text-xs text-gray-500 uppercase tracking-wide">Next Action:</span>
               </p>
               <p className="text-sm text-gray-900 font-semibold bg-gray-100 p-2 rounded">
                 {result.action_reason || result.summary || 'No specific action provided'}
               </p>
               {(!result.action_reason && result.summary) && (
                 <p className="text-xs text-orange-600 italic">⚠️ This appears to be a summary, not an actionable next step</p>
               )}
             </div>
          </div>

          {/* Contact Context (if relevant) */}
          {result.contactContext && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-xs font-semibold text-blue-700 uppercase mb-1">
                {email.from.toLowerCase().includes('ohad') || email.from.toLowerCase().includes('tweezr') ? 'Outbound To' : 'Inbound From'}
              </h4>
              <p className="text-sm text-blue-800">
                <strong>{result.contactContext.name}</strong> 
                {result.contactContext.companies?.name && ` from ${result.contactContext.companies.name}`}
              </p>
            </div>
          )}

          {/* Outbound Email Indicator */}
          {(email.from.toLowerCase().includes('ohad') || email.from.toLowerCase().includes('tweezr')) && (
            <div className="p-2 bg-purple-50 border border-purple-200 rounded-md">
              <h4 className="text-xs font-semibold text-purple-700 uppercase mb-1">Outbound Email</h4>
              <p className="text-xs text-purple-700">Email sent by you - focus on follow-up tracking</p>
            </div>
          )}

          {/* Action Status Indicators */}
          <div className="space-y-2">
            {/* Auto-archive status */}
            {result.key_point === 'Archive' && result.confidence >= 9 && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs flex items-center gap-2">
                {result.autoArchived ? (
                  <>
                    <span className="text-green-700 font-semibold">✓ EXECUTED:</span>
                    <span className="text-green-700">Auto-archived (high confidence, &gt;2hrs elapsed)</span>
                  </>
                ) : (
                  <>
                    <span className="text-yellow-700 font-semibold">⏳ PENDING:</span>
                    <span className="text-yellow-700">Will auto-archive after 2 hours (confidence {result.confidence}/10)</span>
                  </>
                )}
              </div>
            )}

            {/* Auto-draft status */}
            {result.draftCreated && (
              <div className="p-2 bg-green-50 border border-green-200 rounded text-xs flex items-center gap-2">
                <span className="text-green-700 font-semibold">✓ EXECUTED:</span>
                <span className="text-green-700">Gmail draft auto-created (confidence {result.confidence}/10)</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Action Tools */}
        <div className="col-span-12 md:col-span-5 space-y-3 pl-4 border-l border-gray-200">
          {/* Action-specific tools */}
          {result.key_point === 'Respond' && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Response Action</h4>
              {result.suggested_draft ? (
                <>
                  <div className="p-2 border rounded-md bg-white text-xs text-gray-700 max-h-24 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans">{result.suggested_draft}</pre>
                  </div>
                  
                  {result.draftCreated ? (
                    <div className="mt-2 p-2 bg-green-100 border border-green-200 rounded text-xs text-green-800">
                      ✓ Draft auto-created (confidence ≥7)
                    </div>
                  ) : (
                    <button
                      onClick={handleCreateDraft}
                      disabled={isDrafting}
                      className="w-full mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center justify-center gap-1 disabled:bg-blue-300"
                    >
                      <SparklesIcon className="h-3 w-3" />
                      {isDrafting ? 'Creating...' : 'Create Gmail Draft'}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-500 italic">Response needed but no draft suggested (confidence &lt;7)</p>
              )}
            </div>
          )}

          {result.key_point === 'Schedule' && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <h4 className="font-semibold text-blue-700 mb-1">Scheduling Action Required</h4>
              <p className="text-blue-700">Check calendar and coordinate meeting times</p>
            </div>
          )}

          {result.key_point === 'Update_Database' && (
            <div className="p-2 bg-purple-50 border border-purple-200 rounded text-xs">
              <h4 className="font-semibold text-purple-700 mb-1">Database Action</h4>
              <p className="text-purple-700">Contact or activity information needs updating</p>
            </div>
          )}

          {result.key_point === 'Review' && (
            <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs">
              <h4 className="font-semibold text-orange-700 mb-1">Human Review Required</h4>
              <p className="text-orange-700">Complex decision - confidence only {result.confidence}/10</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TriageResult; 