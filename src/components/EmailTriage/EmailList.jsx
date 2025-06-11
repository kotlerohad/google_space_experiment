import React, { useState, useEffect } from 'react';
import { MailIcon, RefreshIcon, SparklesIcon, ArchiveIcon } from '../shared/Icons';
import TriageResult from './TriageResult';
import emailService from '../../services/emailService';
import geminiService from '../../services/geminiService';
import firebaseService from '../../services/firebaseService';

const EmailList = ({ onMessageLog, config }) => {
  const [emails, setEmails] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [triageResults, setTriageResults] = useState({});
  const [triageLogic, setTriageLogic] = useState(`You are an expert email triage assistant. Based on the email content, provide a concise summary and categorize it. Then, suggest relevant next actions. For scheduling-related emails, always suggest checking the calendar.`);

  useEffect(() => {
    loadTriageLogic();
    
    // Subscribe to triage results from Firebase
    const unsubscribe = firebaseService.subscribeToTriageResults((results, memory) => {
      setTriageResults(results);
    });

    return () => unsubscribe();
  }, []);

  const loadTriageLogic = async () => {
    try {
      const logic = await firebaseService.getTriageLogic();
      if (logic) {
        setTriageLogic(logic);
      }
    } catch (error) {
      console.error('Error loading triage logic:', error);
    }
  };

  const saveTriageLogic = async () => {
    try {
      await firebaseService.saveTriageLogic(triageLogic);
      onMessageLog?.('Triage logic saved successfully.', 'success');
    } catch (error) {
      onMessageLog?.('Failed to save triage logic.', 'error');
    }
  };

  const fetchEmails = async () => {
    if (!config?.gmailApiKey) {
      setError('Please configure your Gmail API access token.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setEmails([]);

    try {
      onMessageLog?.('Fetching emails from Gmail...', 'info');
      emailService.setAccessToken(config.gmailApiKey);
      const fetchedEmails = await emailService.fetchEmails(50);
      setEmails(fetchedEmails);
      onMessageLog?.(`Successfully fetched ${fetchedEmails.length} emails.`, 'success');
    } catch (err) {
      setError(err.message);
      onMessageLog?.(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriage = async (email) => {
    if (!config?.geminiApiKey) {
      setTriageResults(prev => ({ 
        ...prev, 
        [email.id]: { error: 'Please configure your Gemini API Key to triage.', isLoading: false } 
      }));
      return;
    }

    setTriageResults(prev => ({ ...prev, [email.id]: { ...prev[email.id], isLoading: true } }));
    onMessageLog?.(`Starting triage for email: "${email.subject}"`, 'info');

    try {
      geminiService.setApiKey(config.geminiApiKey);
      const result = await geminiService.triageEmail(email, triageLogic);
      
      const resultData = { 
        ...result, 
        feedback: null, 
        isLoading: false,
        timestamp: new Date()
      };

      // Save to Firebase/localStorage
      await firebaseService.saveTriageResult(email.id, resultData);
      
      // IMPORTANT: Update local state immediately for demo mode
      setTriageResults(prev => ({ ...prev, [email.id]: resultData }));
      
      onMessageLog?.(`Triage completed for "${email.subject}"`, 'success');

    } catch (error) {
      console.error("Triage failed:", error);
      const errorResult = { error: error.message, isLoading: false };
      setTriageResults(prev => ({ ...prev, [email.id]: errorResult }));
      onMessageLog?.(`Triage failed for "${email.subject}": ${error.message}`, 'error');
    }
  };

  const handleEmailAction = async (emailId, action) => {
    try {
      onMessageLog?.(`Executing ${action} on email...`, 'info');
      
      switch (action) {
        case 'archive':
          await emailService.archiveEmail(emailId);
          onMessageLog?.('Email archived successfully.', 'success');
          break;
        case 'spam':
          await emailService.markAsSpam(emailId);
          onMessageLog?.('Email marked as spam.', 'success');
          break;
        case 'important':
          await emailService.markAsImportant(emailId);
          onMessageLog?.('Email marked as important.', 'success');
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      onMessageLog?.(`Failed to ${action} email: ${error.message}`, 'error');
    }
  };

  const handleFeedback = async (emailId, email, triageResult, feedbackType, feedbackText = '') => {
    try {
      const updates = {
        feedback: feedbackType,
        timestamp: new Date(),
        source_email: email,
        original_triage: triageResult
      };

      if (feedbackType === 'bad' && feedbackText) {
        updates.feedback_text = feedbackText;
      }

      await firebaseService.updateTriageResult(emailId, updates);
      
      // IMPORTANT: Update local state immediately for demo mode
      setTriageResults(prev => ({ 
        ...prev, 
        [emailId]: { ...prev[emailId], ...updates }
      }));
      
      onMessageLog?.(`Feedback recorded: ${feedbackType}`, 'success');
    } catch (error) {
      onMessageLog?.(`Failed to save feedback: ${error.message}`, 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays <= 7) {
        return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
      }
    } catch (error) {
      return dateString;
    }
  };

  const handleTriageAll = async () => {
    if (!config?.geminiApiKey) {
      onMessageLog?.('Please configure your Gemini API Key to use batch triage.', 'error');
      return;
    }

    if (emails.length === 0) {
      onMessageLog?.('No emails to triage. Please fetch emails first.', 'error');
      return;
    }

    onMessageLog?.(`Starting batch triage for ${emails.length} emails...`, 'info');
    
    // Triage all emails that haven't been triaged yet
    const untriaged = emails.filter(email => !triageResults[email.id]?.summary && !triageResults[email.id]?.isLoading);
    
    if (untriaged.length === 0) {
      onMessageLog?.('All emails are already triaged!', 'info');
      return;
    }

    onMessageLog?.(`Triaging ${untriaged.length} remaining emails...`, 'info');

    // Process emails in batches to avoid overwhelming the API
    for (let i = 0; i < untriaged.length; i++) {
      const email = untriaged[i];
      onMessageLog?.(`Triaging email ${i + 1}/${untriaged.length}: "${email.subject}"`, 'info');
      await handleTriage(email);
      
      // Small delay between requests to be respectful to the API
      if (i < untriaged.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    onMessageLog?.(`Batch triage completed! Processed ${untriaged.length} emails.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Fetch Emails Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MailIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-700">Email Triage</h2>
          </div>
          <button
            onClick={fetchEmails}
            disabled={isLoading || !config?.gmailApiKey}
            className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-blue-300"
          >
            <RefreshIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Fetching...' : 'Fetch Emails'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Email Table */}
        {emails.length > 0 ? (
          <div className="space-y-4">
            {/* Table Header with Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  <strong>{emails.length}</strong> emails loaded
                </span>
                <span className="text-sm text-gray-500">
                  {Object.keys(triageResults).filter(id => triageResults[id]?.summary).length} triaged
                </span>
              </div>
              <button
                onClick={handleTriageAll}
                disabled={isLoading || !config?.geminiApiKey || Object.keys(triageResults).some(id => triageResults[id]?.isLoading)}
                className="flex items-center gap-2 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 transition duration-300 disabled:bg-purple-300 text-sm"
              >
                <SparklesIcon className="h-4 w-4" />
                Triage All
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      From
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Preview
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {emails.map((email, index) => (
                    <React.Fragment key={email.id}>
                      <tr className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900 truncate max-w-[200px]" title={email.from}>
                            {email.from}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900 truncate max-w-[300px]" title={email.subject}>
                            {email.subject}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="text-gray-600 truncate max-w-[250px]" title={email.snippet}>
                            {email.snippet}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatDate(email.date)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {triageResults[email.id]?.isLoading ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-yellow-600 mr-1"></div>
                              Analyzing...
                            </span>
                          ) : triageResults[email.id]?.error ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Error
                            </span>
                          ) : triageResults[email.id]?.summary ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Triaged
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleTriage(email)}
                              disabled={triageResults[email.id]?.isLoading}
                              className="bg-purple-600 text-white font-semibold py-1 px-3 rounded hover:bg-purple-700 transition duration-300 disabled:bg-purple-300 flex items-center gap-1 text-xs"
                            >
                              <SparklesIcon className="h-3 w-3" />
                              {triageResults[email.id]?.isLoading ? 'Triaging...' : 'Triage'}
                            </button>
                            
                            <button
                              onClick={() => handleEmailAction(email.id, 'archive')}
                              className="bg-gray-600 text-white p-1.5 rounded hover:bg-gray-700 transition duration-300"
                              title="Archive"
                            >
                              <ArchiveIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Triage Result Row */}
                      {triageResults[email.id] && (triageResults[email.id].summary || triageResults[email.id].error) && (
                        <tr className="bg-gray-50">
                          <td colSpan="6" className="px-4 py-3">
                            <TriageResult
                              email={email}
                              result={triageResults[email.id]}
                              onFeedback={handleFeedback}
                              onEmailAction={handleEmailAction}
                              onMessageLog={onMessageLog}
                              compact={true}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          !isLoading && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <MailIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No emails loaded</p>
              <p className="text-gray-400 text-sm">Click "Fetch Emails" to load your recent emails</p>
            </div>
          )
        )}
        
        {isLoading && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg font-medium">Loading emails...</p>
            <p className="text-gray-400 text-sm">Fetching your recent emails from Gmail</p>
          </div>
        )}
      </div>

      {/* Triage Logic Editor */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Triage Logic</h3>
        <p className="text-gray-600 mb-4 text-sm">
          This is the high-level instruction for the AI. You can manually edit it, but the best way to improve the AI is by providing feedback on individual emails.
        </p>
        <textarea
          value={triageLogic}
          onChange={(e) => setTriageLogic(e.target.value)}
          className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
        />
        <button
          onClick={saveTriageLogic}
          className="w-full mt-4 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700"
        >
          Save Triage Logic
        </button>
      </div>
    </div>
  );
};

export default EmailList; 