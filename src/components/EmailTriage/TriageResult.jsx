import React, { useState } from 'react';
import { SparklesIcon, CheckIcon, ExclamationIcon, XIcon, DatabaseIcon, UserIcon, BuildingIcon, ActivityIcon } from '../shared/Icons';

const TriageResult = ({ email, result, onEmailAction, onFeedback, onMessageLog, compact = false }) => {
  const [isDrafting, setIsDrafting] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(result.feedback || null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const handleCreateDraft = async (draft, type = null) => {
    setIsDrafting(true);
    try {
      const subject = `Re: ${email.subject}`;
      await onEmailAction(email.id, 'create_draft', {
        to: email.from,
        subject: subject,
        body: draft
      });
      if (type) {
        onMessageLog?.(`${type.charAt(0).toUpperCase() + type.slice(1)} draft created`, 'success');
      } else {
        onMessageLog?.(`Draft created`, 'success');
      }
    } catch (error) {
      onMessageLog?.(`Failed to create draft: ${error.message}`, 'error');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleFeedbackClick = async (feedbackType) => {
    if (feedbackType === 'good') {
      // Direct positive feedback
      setFeedbackGiven('good');
      if (onFeedback) {
        await onFeedback(email.id, email, result, 'good', '');
      }
    } else {
      // Show form for negative feedback
      setShowFeedbackForm(true);
    }
  };

  const handleFeedbackSubmit = async () => {
    setFeedbackGiven('bad');
    setShowFeedbackForm(false);
    if (onFeedback) {
      await onFeedback(email.id, email, result, 'bad', feedbackText);
    }
    setFeedbackText('');
  };

  const handleApproveDbEntry = async (entry) => {
    try {
      onMessageLog?.(`Executing database entry: ${entry.description}`, 'info');
      
      // Import the services we need
      const { default: supabaseService } = await import('../../services/supabaseService');
      
      // Handle different entry types with proper dependency management
      let operations = [];
      
      if (entry.type === 'contact' && entry.data.company_name) {
        // For contacts with company references, we need to handle the company first
        const companyName = entry.data.company_name;
        
        // Check if company already exists
        try {
          const { data: existingCompany } = await supabaseService.supabase
            .from('companies')
            .select('id, name')
            .eq('name', companyName)
            .single();
          
          if (existingCompany) {
            // Company exists, just reference it
            const contactData = { ...entry.data };
            delete contactData.company_name; // Remove company_name
            contactData.company_id = existingCompany.id; // Add company_id reference
            
            operations.push({
              action: 'insert',
              table: 'contacts',
              payload: contactData
            });
          } else {
            // Company doesn't exist, we need to create it first
            onMessageLog?.(`Company "${companyName}" not found. Please add the company first, then add the contact.`, 'warning');
            throw new Error(`Company "${companyName}" must be added to the database before adding contacts that reference it.`);
          }
        } catch (error) {
          if (error.message.includes('must be added')) {
            throw error; // Re-throw our custom error
          }
          // If it's a database error, assume company doesn't exist
          onMessageLog?.(`Company "${companyName}" not found. Please add the company first, then add the contact.`, 'warning');
          throw new Error(`Company "${companyName}" must be added to the database before adding contacts that reference it.`);
        }
      } else {
        // For other entry types or contacts without company references
        operations.push({
          action: 'insert',
          table: entry.type === 'contact' ? 'contacts' : 
                 entry.type === 'company' ? 'companies' : 
                 entry.type === 'activity' ? 'activities' : entry.type,
          payload: entry.data
        });
      }
      
      // Execute the database operations
      await supabaseService.executeDbOperations(operations);
      
      onMessageLog?.(`Successfully added ${entry.type}: ${entry.description}`, 'success');
    } catch (error) {
      onMessageLog?.(`Failed to add ${entry.type}: ${error.message}`, 'error');
      throw error;
    }
  };

  const handleRejectDbEntry = (index) => {
    onMessageLog?.(`Rejected database suggestion #${index + 1}`, 'info');
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
    let textClass = 'text-red-700';
    let bgClass = 'bg-red-100';
    
    if (score >= 7) {
      colorClass = 'bg-green-500';
      textClass = 'text-green-700';
      bgClass = 'bg-green-100';
    } else if (score >= 5) {
      colorClass = 'bg-yellow-500';
      textClass = 'text-yellow-700';
      bgClass = 'bg-yellow-100';
    }

    return (
      <div className="space-y-1">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className={`${colorClass} h-2.5 rounded-full transition-all duration-300`} style={{ width: `${scorePercentage}%` }}></div>
        </div>
        <div className={`text-xs font-medium px-2 py-1 rounded-full ${bgClass} ${textClass}`}>
          {score}/10 confidence
          {score < 7 && ' - Human Review Required'}
        </div>
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

  const AlternativeOption = ({ option, index }) => (
    <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
      <div className="flex items-center justify-between mb-1">
        <KeyPointTag point={option.action} />
        <span className="text-xs text-gray-600">{option.likelihood}% likely</span>
      </div>
      <p className="text-xs text-gray-700">{option.reason}</p>
    </div>
  );

  const DatabaseSuggestions = ({ suggestions, onApprove, onReject }) => {
    const [approvedEntries, setApprovedEntries] = useState(new Set());
    const [rejectedEntries, setRejectedEntries] = useState(new Set());

    if (!suggestions || !suggestions.has_business_relevance || !suggestions.suggested_entries?.length) {
      return null;
    }

    const getEntryIcon = (type) => {
      switch (type) {
        case 'contact': return <UserIcon className="h-4 w-4" />;
        case 'company': return <BuildingIcon className="h-4 w-4" />;
        case 'activity': return <ActivityIcon className="h-4 w-4" />;
        default: return <DatabaseIcon className="h-4 w-4" />;
      }
    };

    const getEntryColor = (type) => {
      switch (type) {
        case 'contact': return 'bg-blue-50 border-blue-200 text-blue-800';
        case 'company': return 'bg-green-50 border-green-200 text-green-800';
        case 'activity': return 'bg-purple-50 border-purple-200 text-purple-800';
        default: return 'bg-gray-50 border-gray-200 text-gray-800';
      }
    };

    const handleApprove = async (entry, index) => {
      try {
        await onApprove(entry);
        setApprovedEntries(prev => new Set([...prev, index]));
      } catch (error) {
        console.error('Failed to approve database entry:', error);
      }
    };

    const handleReject = (index) => {
      setRejectedEntries(prev => new Set([...prev, index]));
      onReject?.(index);
    };

    return (
      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <DatabaseIcon className="h-5 w-5 text-amber-600" />
          <h4 className="font-medium text-amber-800">Database Entry Suggestions</h4>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
            Business Relevant
          </span>
        </div>
        
        <div className="space-y-3">
          {suggestions.suggested_entries.map((entry, index) => {
            const isApproved = approvedEntries.has(index);
            const isRejected = rejectedEntries.has(index);
            
            return (
              <div
                key={index}
                className={`p-3 border rounded-lg ${getEntryColor(entry.type)} ${
                  isApproved ? 'opacity-75 bg-green-100 border-green-300' :
                  isRejected ? 'opacity-50 bg-gray-100 border-gray-300' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    {getEntryIcon(entry.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium uppercase tracking-wide">
                          {entry.type}
                        </span>
                        {isApproved && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            ✓ Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            ✗ Rejected
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mb-2">{entry.description}</p>
                      <div className="text-xs bg-white bg-opacity-50 p-2 rounded border">
                        <strong>Data:</strong> {JSON.stringify(entry.data, null, 2)}
                      </div>
                    </div>
                  </div>
                  
                  {!isApproved && !isRejected && (
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleApprove(entry, index)}
                        className="bg-green-600 text-white p-1.5 rounded hover:bg-green-700 transition-colors"
                        title="Approve and add to database"
                      >
                        <CheckIcon className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleReject(index)}
                        className="bg-red-600 text-white p-1.5 rounded hover:bg-red-700 transition-colors"
                        title="Reject suggestion"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
              </div>
            </div>
            
            {/* Confidence Meter */}
            <div className="mb-3">
              <ConfidenceMeter score={result.confidence || 0} />
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

            {/* Feedback Section */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 font-medium">Was this helpful?</span>
                {!feedbackGiven && !showFeedbackForm && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFeedbackClick('good')}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      <CheckIcon className="h-3 w-3" />
                      Good
                    </button>
                    <button
                      onClick={() => handleFeedbackClick('bad')}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      <ExclamationIcon className="h-3 w-3" />
                      Needs Work
                    </button>
                  </div>
                )}
                
                {feedbackGiven === 'good' && (
                  <div className="flex items-center gap-1 text-xs text-green-700">
                    <CheckIcon className="h-3 w-3" />
                    <span>Thanks for the feedback!</span>
                  </div>
                )}
                
                {feedbackGiven === 'bad' && (
                  <div className="flex items-center gap-1 text-xs text-orange-700">
                    <ExclamationIcon className="h-3 w-3" />
                    <span>Feedback recorded</span>
                  </div>
                )}
              </div>
              
              {/* Feedback Form */}
              {showFeedbackForm && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="What should the AI have done instead?"
                    className="w-full text-xs p-2 border border-gray-300 rounded resize-none"
                    rows={2}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleFeedbackSubmit}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => setShowFeedbackForm(false)}
                      className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Alternative Options for Low Confidence */}
          {result.confidence < 7 && result.alternative_options && result.alternative_options.length > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="text-sm font-bold text-orange-700 uppercase mb-2">Alternative Options</h4>
              <p className="text-xs text-orange-600 mb-3">AI is uncertain. Consider these alternatives:</p>
              <div className="space-y-2">
                {result.alternative_options.map((option, index) => (
                  <AlternativeOption key={index} option={option} index={index} />
                ))}
              </div>
            </div>
          )}

          {/* Uncertainty Factors */}
          {result.confidence < 7 && result.uncertainty_factors && result.uncertainty_factors.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-sm font-bold text-yellow-700 uppercase mb-2">Why AI is Uncertain</h4>
              <ul className="space-y-1">
                {result.uncertainty_factors.map((factor, index) => (
                  <li key={index} className="text-xs text-yellow-700 flex items-start gap-1">
                    <span className="text-yellow-500">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Database Suggestions */}
          <DatabaseSuggestions 
            suggestions={result.database_suggestions}
            onApprove={handleApproveDbEntry}
            onReject={handleRejectDbEntry}
          />

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
              
              {/* Dual Draft Options */}
              {(result.suggested_draft_pushy || result.suggested_draft_exploratory) ? (
                <div className="space-y-3">
                  {/* Pushy Draft */}
                  {result.suggested_draft_pushy && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-xs font-medium text-orange-700">🚀 Pushy (Next Steps)</h5>
                        <span className="text-xs text-orange-600 bg-orange-100 px-1 rounded">Action-Oriented</span>
                      </div>
                      <div className="p-2 border border-orange-200 rounded-md bg-orange-50 text-xs text-gray-700 max-h-24 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-sans">{result.suggested_draft_pushy}</pre>
                      </div>
                      <button
                        onClick={() => handleCreateDraft(result.suggested_draft_pushy, 'pushy')}
                        disabled={isDrafting}
                        className="w-full mt-1 text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 flex items-center justify-center gap-1 disabled:bg-orange-300"
                      >
                        <SparklesIcon className="h-3 w-3" />
                        {isDrafting ? 'Creating...' : 'Create Pushy Draft'}
                      </button>
                    </div>
                  )}
                  
                  {/* Exploratory Draft */}
                  {result.suggested_draft_exploratory && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-xs font-medium text-blue-700">🔍 Exploratory</h5>
                        <span className="text-xs text-blue-600 bg-blue-100 px-1 rounded">Information-Gathering</span>
                      </div>
                      <div className="p-2 border border-blue-200 rounded-md bg-blue-50 text-xs text-gray-700 max-h-24 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-sans">{result.suggested_draft_exploratory}</pre>
                      </div>
                      <button
                        onClick={() => handleCreateDraft(result.suggested_draft_exploratory, 'exploratory')}
                        disabled={isDrafting}
                        className="w-full mt-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center justify-center gap-1 disabled:bg-blue-300"
                      >
                        <SparklesIcon className="h-3 w-3" />
                        {isDrafting ? 'Creating...' : 'Create Exploratory Draft'}
                      </button>
                    </div>
                  )}
                </div>
              ) : result.suggested_draft ? (
                /* Fallback to single draft for backward compatibility */
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
                      onClick={() => handleCreateDraft(result.suggested_draft)}
                      disabled={isDrafting}
                      className="w-full mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center justify-center gap-1 disabled:bg-blue-300"
                    >
                      <SparklesIcon className="h-3 w-3" />
                      {isDrafting ? 'Creating...' : 'Create Gmail Draft'}
                    </button>
                  )}
                </>
              ) : result.confidence >= 4 ? (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <p className="text-yellow-700">Response suggested but confidence is moderate ({result.confidence}/10). Consider the alternative options above or provide more context.</p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Response needed but confidence too low (&lt;4/10) for draft suggestions</p>
              )}
              
              {/* Auto-draft status for dual drafts */}
              {result.draftCreated && (result.suggested_draft_pushy || result.suggested_draft_exploratory) && (
                <div className="mt-2 p-2 bg-green-100 border border-green-200 rounded text-xs text-green-800">
                  ✓ Draft auto-created (confidence ≥7)
                </div>
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
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <h4 className="font-semibold text-yellow-700 mb-1">Manual Review Required</h4>
              <p className="text-yellow-700">This email needs human attention</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TriageResult; 