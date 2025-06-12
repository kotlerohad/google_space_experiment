import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AppContext } from '../../AppContext';
import { EditIcon, CheckIcon, RefreshIcon } from './Icons';
import supabaseService from '../../services/supabaseService';

const defaultPrompts = {
  triageLogic: `DECIDE THE NEXT ACTION for this email. Be decisive and specific.

EMAIL DIRECTION RULES:
- OUTBOUND emails (you sent): Focus on follow-up tracking and relationship progress
- INBOUND emails (sent to you): Focus on response or processing needs

ACTION CATEGORIES:
- "Archive": Notifications, confirmations, automated emails (high confidence 9-10)
- "Schedule": Meeting coordination, calendar requests (confidence 7-10)  
- "Respond": Needs personal response (draft if confidence 7+)
- "Update_Database": Contact updates, relationship progress tracking
- "Review": Complex situations needing human judgment (confidence <6)

DECISION LOGIC:
- For OUTBOUND emails with known contacts: Usually "Update_Database" + follow-up timing
- For meeting confirmations: "Schedule" the confirmed time
- For automated notifications: "Archive" with high confidence
- For client questions: "Respond" with draft if confident

BE SPECIFIC IN ACTION REASONS:
- Say "Follow up in 3 days to confirm attendance" 
- NOT "Client confirmed meeting"
- Say "Schedule Tuesday 2pm meeting with John"
- NOT "This is about scheduling"

Focus on WHAT TO DO NEXT, not what happened.`,
  mondayContext: `
Relevant Monday.com Boards and their common columns (for AI reference):
- Companies Board: Key columns: Company Name, Industry.
- Activities Board: Key columns: Activity Name, Status, Related Contact, Action, Next Action.
- Contacts Board: Key columns: Name, Email, Company.
- Artifacts Board: Key columns: Document Name, Type, Related Project.`
};

const PromptEditor = ({ onMessageLog, className = "" }) => {
  const { isConfigLoaded } = useContext(AppContext);
  const [prompts, setPrompts] = useState({
    triageLogic: defaultPrompts.triageLogic,
    mondayContext: defaultPrompts.mondayContext
  });
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [tempValue, setTempValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadPrompts = useCallback(async () => {
    if (!isConfigLoaded) return;
    try {
      setIsLoading(true);
      
      const triageLogic = await supabaseService.getPrompt('triageLogic');
      const mondayContext = await supabaseService.getPrompt('mondayContext');
      
      setPrompts(prev => ({
        ...prev,
        triageLogic: triageLogic || defaultPrompts.triageLogic,
        mondayContext: mondayContext || defaultPrompts.mondayContext
      }));
    } catch (error) {
      const errorMsg = error.message || JSON.stringify(error);
      console.error('Error loading prompts:', errorMsg);
      onMessageLog?.(`Failed to load prompts: ${errorMsg}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isConfigLoaded, onMessageLog]);

  useEffect(() => {
    if (isConfigLoaded) {
      loadPrompts();
    }
  }, [isConfigLoaded, loadPrompts]);

  const startEditing = (promptType) => {
    setEditingPrompt(promptType);
    setTempValue(prompts[promptType]);
  };

  const cancelEditing = () => {
    setEditingPrompt(null);
    setTempValue('');
  };

  const savePrompt = async (promptType) => {
    if (!tempValue.trim()) {
      onMessageLog?.('Prompt cannot be empty.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      
      await supabaseService.savePrompt(promptType, tempValue);
      onMessageLog?.(`${promptType.replace(/([A-Z])/g, ' $1')} prompt saved successfully.`, 'success');
      
      setPrompts(prev => ({ ...prev, [promptType]: tempValue }));
      setEditingPrompt(null);
      setTempValue('');
    } catch (error) {
      onMessageLog?.(`Failed to save ${promptType} prompt.`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefault = async (promptType) => {
    if (window.confirm(`Reset ${promptType} to default? This cannot be undone.`)) {
      try {
        setIsLoading(true);
        
        await supabaseService.savePrompt(promptType, defaultPrompts[promptType]);
        
        setPrompts(prev => ({ ...prev, [promptType]: defaultPrompts[promptType] }));
        onMessageLog?.(`${promptType} prompt reset to default.`, 'success');
      } catch (error) {
        onMessageLog?.(`Failed to reset ${promptType} prompt.`, 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const promptConfigs = {
    triageLogic: {
      title: 'Email Triage Logic',
      description: 'This prompt guides how the AI analyzes and categorizes emails. It determines the structure of suggestions and priorities.',
      placeholder: 'Enter your email triage instructions...'
    },
    mondayContext: {
      title: 'Monday.com Context',
      description: 'This provides context about your Monday.com boards and structure to help the AI make better decisions.',
      placeholder: 'Describe your Monday.com board structure...'
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <EditIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-700">Core Prompts</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Edit the core prompts that guide AI behavior. Changes affect all future AI operations.
          </p>

          <div className="space-y-6">
            {Object.entries(promptConfigs).map(([promptType, config]) => (
              <div key={promptType} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-700">{config.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingPrompt !== promptType && (
                      <>
                        <button
                          onClick={() => startEditing(promptType)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Edit"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => resetToDefault(promptType)}
                          className="text-gray-600 hover:text-gray-800 p-1"
                          title="Reset to Default"
                        >
                          <RefreshIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingPrompt === promptType ? (
                  <div className="space-y-3">
                    <textarea
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      placeholder={config.placeholder}
                      className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => savePrompt(promptType)}
                        disabled={isLoading || !tempValue.trim()}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:bg-green-300 flex items-center gap-1"
                      >
                        <CheckIcon className="h-3 w-3" />
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded border">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {prompts[promptType]}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> Prompt changes take effect immediately for new AI requests. 
              Changes are automatically saved to your Supabase backend.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptEditor; 