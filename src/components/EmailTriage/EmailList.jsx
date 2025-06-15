import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AppContext } from '../../AppContext';
import { MailIcon, RefreshIcon, SparklesIcon, ArchiveIcon } from '../shared/Icons';
import TriageResult from './TriageResult';
import emailService from '../../services/emailService';
import supabaseService from '../../services/supabaseService';

const EmailList = ({ onMessageLog, config }) => {
  const { isConfigLoaded, openAIService, config: contextConfig } = useContext(AppContext);
  const [emails, setEmails] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [triageResults, setTriageResults] = useState({});
  const [triageLogic, setTriageLogic] = useState(`You are an expert email triage assistant. Based on the email content, provide a concise summary and categorize it. Then, suggest relevant next actions. For scheduling-related emails, always suggest checking the calendar.`);
  const [oauthStatus, setOauthStatus] = useState(emailService.getOAuthStatus());

  const loadTriageLogic = useCallback(async () => {
    if (!isConfigLoaded) return;
    try {
      const logic = await supabaseService.getPrompt('triageLogic');
      if (logic) {
        setTriageLogic(logic);
      }
    } catch (error) {
      const errorMsg = error.message || JSON.stringify(error);
      console.error('Error loading triage logic:', errorMsg);
      onMessageLog?.(`Failed to load triage logic: ${errorMsg}`, 'error');
    }
  }, [isConfigLoaded, onMessageLog]);

  useEffect(() => {
    if (isConfigLoaded) {
      loadTriageLogic();
    }
  }, [isConfigLoaded, loadTriageLogic]);

  // Auto-fetch emails on initial load if Gmail is already authenticated
  useEffect(() => {
    if (isConfigLoaded && oauthStatus.hasAccessToken && emails.length === 0 && !isLoading && !error) {
      console.log('📧 App loaded with Gmail auth - auto-fetching emails...');
      fetchEmails();
    }
  }, [isConfigLoaded, oauthStatus.hasAccessToken, emails.length, isLoading, error]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debug effect to check OpenAI service status
  useEffect(() => {
    if (isConfigLoaded) {
      console.log('EmailList - Config loaded. OpenAI service status:', {
        serviceExists: !!openAIService,
        hasApiKey: openAIService?.apiKey ? 'Set' : 'Not set',
        apiKeyLength: openAIService?.apiKey?.length || 0
      });
    }
  }, [isConfigLoaded, openAIService]);

  // OAuth status monitoring effect
  useEffect(() => {
    const checkOAuthStatus = () => {
      const newStatus = emailService.getOAuthStatus();
      const previousStatus = oauthStatus;
      setOauthStatus(newStatus);
      
      // Auto-fetch emails when Gmail auth becomes green and we don't have emails yet
      if (newStatus.hasAccessToken && 
          (!previousStatus?.hasAccessToken || emails.length === 0) && 
          !isLoading && 
          !error) {
        console.log('📧 Gmail auth is green - auto-fetching emails...');
        fetchEmails();
      }
    };

    // Check OAuth status immediately
    checkOAuthStatus();

    // Set up periodic checking (every 2 seconds) to catch OAuth completion
    const interval = setInterval(checkOAuthStatus, 2000);

    // Listen for storage changes (in case OAuth completes in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'gmail_tokens') {
        checkOAuthStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [emails.length, isLoading, error, oauthStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveTriageResult = async (emailId, resultData) => {
    try {
      const dbData = {
        id: emailId,
        decision: resultData.decision || resultData.key_point || 'Review',
        action_reason: resultData.action_reason || resultData.summary || 'Action required',
        confidence: resultData.confidence || 0,
        key_points: Array.isArray(resultData.key_points) ? resultData.key_points : 
                   (resultData.key_points ? [resultData.key_points] : 
                   (resultData.key_point ? [resultData.key_point] : [])),
        contact_context: resultData.contactContext || null,
        calendar_context: resultData.calendarContext || null,
        auto_drafted: resultData.draftCreated || false,
        auto_archived: resultData.autoArchived || false
      };
      
      // Use upsert instead of create to handle duplicate keys
      const { error } = await supabaseService.supabase
        .from('triage_results')
        .upsert(dbData, { onConflict: 'id' })
        .select();
      
      if (error) throw error;
      
      console.log('Triage result saved successfully:', {
        emailId,
        confidence: dbData.confidence,
        decision: dbData.decision
      });
    } catch (error) {
      // Better error handling for debugging
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      const errorCode = error?.code || 'unknown';
      
      console.error(`Failed to save triage result for ${emailId}:`, {
        error,
        errorMessage,
        errorCode,
        resultData,
        errorType: typeof error,
        isSupabaseError: error?.code !== undefined
      });
      
      // Check if it's a table not found error
      if (errorCode === '42P01' || errorMessage.includes('does not exist')) {
        console.warn('triage_results table does not exist. Skipping save for now.');
        return;
      }
      
      // Don't fail the whole triage if saving fails
      console.warn(`Could not save triage result for ${emailId}: ${errorMessage}`);
    }
  };

  const updateTriageResult = async (emailId, updates) => {
    try {
      await supabaseService.update('triage_results', emailId, updates);
    } catch (error) {
      console.error(`Could not update triage result for ${emailId}:`, error.message);
    }
  };

  const loadStoredTriageResults = async (emailIds) => {
    if (!isConfigLoaded || !supabaseService.isConnected() || emailIds.length === 0) {
      return {};
    }

    try {
      onMessageLog?.('Loading stored triage results...', 'info');
      
      const { data: storedResults, error } = await supabaseService.supabase
        .from('triage_results')
        .select('*')
        .in('id', emailIds);

      if (error) throw error;

      // Convert array to object keyed by email ID
      const triageResultsMap = {};
      storedResults?.forEach(result => {
        triageResultsMap[result.id] = {
          key_point: result.decision,
          confidence: result.confidence,
          action_reason: result.action_reason,
          summary: result.action_reason, // For backward compatibility
          contactContext: result.contact_context,
          calendarContext: result.calendar_context,
          autoArchived: result.auto_archived,
          draftCreated: result.auto_drafted,
          timestamp: new Date(result.created_at),
          isLoading: false,
          // Add stored flag to distinguish from fresh triage
          isStored: true,
          storedAt: result.created_at
        };
      });

      onMessageLog?.(`Loaded ${Object.keys(triageResultsMap).length} stored triage results`, 'success');
      return triageResultsMap;
    } catch (error) {
      console.warn('Failed to load stored triage results:', error);
      onMessageLog?.(`Warning: Could not load stored triage results: ${error.message}`, 'warning');
      return {};
    }
  };

  const fetchEmails = async () => {
    setIsLoading(true);
    setError(null);
    setEmails([]);
    setTriageResults({}); // Clear existing triage results

    try {
      onMessageLog?.('Fetching emails from Gmail...', 'info');
      const fetchedEmails = await emailService.fetchEmails(50);
      setEmails(fetchedEmails);
      onMessageLog?.(`Successfully fetched ${fetchedEmails.length} emails.`, 'success');
      
      // Load stored triage results for these emails
      if (fetchedEmails.length > 0) {
        const emailIds = fetchedEmails.map(email => email.id);
        const storedTriageResults = await loadStoredTriageResults(emailIds);
        setTriageResults(storedTriageResults);
      }
      
      // Update OAuth status after successful fetch
      setOauthStatus(emailService.getOAuthStatus());
      
      if (fetchedEmails.length === 0) {
        onMessageLog?.('No emails were returned from the API. Please check your Gmail account.', 'warning');
      }
    } catch (err) {
      const errorMsg = `Failed to fetch emails: ${err.message}`;
      setError(errorMsg);
      onMessageLog?.(errorMsg, 'error');
      console.error(err); // Also log the full error to the console
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriage = async (email) => {
    // Debug logging
    console.log('Triage Debug:', {
      openAIService: !!openAIService,
      isConfigLoaded,
      hasApiKey: openAIService?.apiKey ? 'Yes' : 'No',
      apiKeyLength: openAIService?.apiKey?.length || 0,
      configOpenAIKey: config?.openaiApiKey ? 'Present' : 'Missing',
      contextConfigOpenAIKey: contextConfig?.openaiApiKey ? 'Present' : 'Missing'
    });
    
    if (!openAIService || !isConfigLoaded) {
      setTriageResults(prev => ({ 
        ...prev, 
        [email.id]: { error: 'OpenAI service not available. Please check your API key configuration.', isLoading: false } 
      }));
      return;
    }

    // Ensure API key is set (defensive programming)
    const availableConfig = config || contextConfig;
    if (!openAIService.apiKey && availableConfig?.openaiApiKey) {
      console.log('🔧 Setting OpenAI API key from config in triage handler');
      openAIService.setApiKey(availableConfig.openaiApiKey);
    }

    if (!openAIService.apiKey) {
      setTriageResults(prev => ({ 
        ...prev, 
        [email.id]: { error: 'OpenAI API key is not set. Please check your configuration.', isLoading: false } 
      }));
      return;
    }

    setTriageResults(prev => ({ ...prev, [email.id]: { ...prev[email.id], isLoading: true } }));
    onMessageLog?.(`Deciding action for email: "${email.subject}"`, 'info');

    try {
      // Step 1: Check if sender exists in database (per guidance)
      let contactContext = null;
      let isOutboundEmail = false;
      
      try {
        const senderEmail = email.from.match(/<([^>]+)>/)?.[1] || email.from;
        
        // Check if this is an outbound email (from user)
        const userEmails = ['ohad.kotler@tweezr.com', 'ohad@tweezr.com', 'okotler@gmail.com']; // Add your email addresses
        isOutboundEmail = userEmails.some(userEmail => 
          senderEmail.toLowerCase().includes(userEmail.toLowerCase()) ||
          email.from.toLowerCase().includes(userEmail.toLowerCase())
        );
        
        if (isOutboundEmail) {
          // For outbound emails, look up the recipient in the database
          
          // Extract recipient emails from email.to, email.cc fields if available
          // For now, we'll check if any known contacts are mentioned in the subject or body
          const { data: contacts } = await supabaseService.supabase
            .from('contacts')
            .select('id, name, email, company_id, companies(name)')
            .limit(50);
          
          if (contacts) {
            const mentionedContact = contacts.find(contact => 
              email.subject.toLowerCase().includes(contact.name.toLowerCase()) ||
              email.body.toLowerCase().includes(contact.name.toLowerCase()) ||
              email.body.toLowerCase().includes(contact.email.toLowerCase())
            );
            
            if (mentionedContact) {
              contactContext = mentionedContact;
              onMessageLog?.(`Outbound email to known contact: ${contactContext.name}`, 'info');
            }
          }
        } else {
          // For inbound emails, check sender as before
          const { data: contacts } = await supabaseService.supabase
            .from('contacts')
            .select('id, name, email, company_id, companies(name)')
            .eq('email', senderEmail)
            .limit(1);
          
          if (contacts && contacts.length > 0) {
            contactContext = contacts[0];
            onMessageLog?.(`Inbound email from known contact: ${contactContext.name}`, 'info');
          }
        }
      } catch (error) {
        console.warn('Contact lookup failed:', error);
      }

      // Step 2: Enhanced prompt with database and email direction context
      let enhancedTriageLogic = triageLogic;
      
      enhancedTriageLogic += `\n\nEMAIL DIRECTION: This is an ${isOutboundEmail ? 'OUTBOUND' : 'INBOUND'} email.`;
      
      if (isOutboundEmail) {
        enhancedTriageLogic += `\nOUTBOUND CONTEXT: You sent this email to a ${contactContext ? 'known contact' : 'potential client'}. Focus on follow-up actions and relationship tracking.`;
      }
      
      if (contactContext) {
        if (isOutboundEmail) {
          enhancedTriageLogic += `\n\nRECIPIENT CONTEXT: The recipient ${contactContext.name} (${contactContext.email}) is a known contact in your database, associated with ${contactContext.companies?.name || 'No Company'}. Consider this ongoing relationship when deciding follow-up actions.`;
        } else {
          enhancedTriageLogic += `\n\nSENDER CONTEXT: The sender ${contactContext.name} (${contactContext.email}) is a known contact in your database, associated with ${contactContext.companies?.name || 'No Company'}. Consider this relationship when triaging.`;
        }
      }

      // Step 3: Check calendar for scheduling emails (per guidance)
      let calendarContext = null;
      if (email.subject.toLowerCase().includes('meeting') || 
          email.subject.toLowerCase().includes('schedule') || 
          email.body.toLowerCase().includes('calendar') ||
          email.body.toLowerCase().includes('meeting')) {
        try {
          onMessageLog?.(`Fetching detailed calendar information for scheduling email...`, 'info');
          const calendarInfo = await emailService.getDetailedCalendarInfo(7);
          
          // Generate structured meeting slots (3 slots, 2-3 hours each, starting 2 business days out)
          const structuredSlots = emailService.generateStructuredMeetingSlots(calendarInfo.busyTimes);
          
          calendarContext = {
            summary: `Your calendar has ${calendarInfo.totalEvents} events in the next 7 days.`,
            structuredSlots: structuredSlots,
            busyCount: calendarInfo.busyTimes.length,
            structuredSlotsList: structuredSlots.map(slot => slot.formatted).join('\n')
          };
          
          onMessageLog?.(`Calendar context added: ${structuredSlots.length} structured meeting slots generated`, 'info');
        } catch (error) {
          console.warn('Detailed calendar check failed, falling back to basic check:', error);
          try {
            const events = await emailService.testCalendarConnection();
            calendarContext = {
              summary: `Your calendar has ${events.length} upcoming events in the next few days.`,
              structuredSlots: [],
              busyCount: events.length,
              structuredSlotsList: 'Unable to fetch specific available times'
            };
            onMessageLog?.(`Basic calendar context added for scheduling email`, 'info');
          } catch (fallbackError) {
            console.warn('Calendar check failed completely:', fallbackError);
          }
        }
      }

      // Step 4: Company research for business emails
      let companyResearch = null;
      const senderEmail = email.from.match(/<([^>]+)>/)?.[1] || email.from;
      const companyMatch = senderEmail.match(/@([^.]+)/);
      
      if (companyMatch && !isOutboundEmail) {
        const domain = companyMatch[1];
        const commonProviders = ['gmail', 'yahoo', 'outlook', 'hotmail', 'icloud', 'aol'];
        
        if (!commonProviders.includes(domain.toLowerCase())) {
          try {
            onMessageLog?.(`Researching ${domain} for strategic context...`, 'info');
            companyResearch = await performCompanyResearch(domain);
            onMessageLog?.(`Company research completed for ${domain}`, 'info');
          } catch (error) {
            console.warn('Company research failed:', error);
          }
        }
      }

      if (calendarContext && calendarContext.structuredSlots.length > 0) {
        enhancedTriageLogic += `\n\nCALENDAR CONTEXT: ${calendarContext.summary}`;
        enhancedTriageLogic += `\n\nSTRUCTURED MEETING SLOTS (3 options, 2-3 hours each, starting 2 business days out):\n${calendarContext.structuredSlotsList}`;
        enhancedTriageLogic += `\n\nIMPORTANT: When suggesting meeting times in your response, use these EXACT structured time slots. Include all 3 options in your suggested draft response.`;
      } else if (calendarContext) {
        enhancedTriageLogic += `\n\nCALENDAR CONTEXT: ${calendarContext.summary}`;
        enhancedTriageLogic += `\n\nNote: ${calendarContext.structuredSlotsList}. When suggesting meeting times, ask the sender for their availability.`;
      }

      if (companyResearch) {
        enhancedTriageLogic += `\n\nCOMPANY RESEARCH:\n${companyResearch}`;
        enhancedTriageLogic += `\n\nIMPORTANT: Use this company research to craft a more informed and strategic response. Reference relevant recent developments, show knowledge of their business, and identify potential collaboration opportunities.`;
      }

      const result = await openAIService.triageEmail(email, enhancedTriageLogic);
      
      const resultData = { 
        ...result, 
        feedback: null, 
        isLoading: false,
        timestamp: new Date(),
        contactContext: contactContext,  // This will be mapped to contact_context in save
        calendarContext: calendarContext, // This will be mapped to calendar_context in save
        email_received_at: new Date(email.date),
        // Add email metadata for database storage
        email_from: email.from,
        email_subject: email.subject,
        email_snippet: email.snippet,
        // Ensure backward compatibility - use action_reason as summary if summary not provided
        summary: result.summary || result.action_reason || `Action: ${result.key_point}`
      };

      // Save to Supabase
      await saveTriageResult(email.id, resultData);
      
      setTriageResults(prev => ({ ...prev, [email.id]: resultData }));
      
      onMessageLog?.(`Action decided for "${email.subject}": ${result.key_point} (confidence: ${result.confidence}/10)`, 'success');

      // Step 5: Enhanced Auto-archive logic (per guidance: 9+ confidence AND >2 hours passed)
      if (result.key_point === 'Archive' && result.confidence >= 9) {
        const emailDate = new Date(email.date);
        const now = new Date();
        const hoursElapsed = (now - emailDate) / (1000 * 60 * 60);
        
        if (hoursElapsed > 2) {
          onMessageLog?.(`High confidence "Archive" suggestion and >2 hours elapsed. Auto-archiving email...`, 'info');
          await handleEmailAction(email.id, 'archive');
          setTriageResults(prev => ({
            ...prev,
            [email.id]: { ...prev[email.id], autoArchived: true }
          }));
        } else {
          onMessageLog?.(`High confidence "Archive" but only ${hoursElapsed.toFixed(1)} hours elapsed. Waiting for 2+ hours.`, 'info');
        }
      }

      // Step 6: Auto-draft creation (per guidance: confidence 7+ for AUTO-creation)
      // Note: Dual drafts are generated at confidence 4+ for manual review, but auto-creation still requires 7+
      if ((result.suggested_draft_pushy || result.suggested_draft_exploratory || result.suggested_draft) && result.confidence >= 7) {
        onMessageLog?.(`High confidence draft suggestion (${result.confidence}/10). Auto-creating draft...`, 'info');
        try {
          const subject = `Re: ${email.subject}`;
          
          // Prefer pushy draft for auto-creation, then exploratory, then fallback to single draft
          const draftContent = result.suggested_draft_pushy || result.suggested_draft_exploratory || result.suggested_draft;
          const draftType = result.suggested_draft_pushy ? 'pushy' : 
                           result.suggested_draft_exploratory ? 'exploratory' : 'standard';
          
          await emailService.createDraft(email.from.match(/<([^>]+)>/)?.[1] || email.from, subject, draftContent);
          
          setTriageResults(prev => ({
            ...prev,
            [email.id]: { ...prev[email.id], draftCreated: true }
          }));
          
          onMessageLog?.(`${draftType.charAt(0).toUpperCase() + draftType.slice(1)} draft auto-created for "${email.subject}"`, 'success');
        } catch (error) {
          onMessageLog?.(`Failed to auto-create draft: ${error.message}`, 'error');
        }
      } else if (result.key_point === 'Respond' && result.confidence >= 4 && (result.suggested_draft_pushy || result.suggested_draft_exploratory)) {
        onMessageLog?.(`Moderate confidence response (${result.confidence}/10). Dual drafts available for manual review.`, 'info');
      }

      // Step 7: Enhanced database activity updates (per guidance)
      if (contactContext && (result.key_point === 'Update_Database' || result.confidence >= 8)) {
        try {
          const activityName = isOutboundEmail 
            ? `Outbound Email Sent: ${email.subject}`
            : `Email Received: ${email.subject}`;
            
          const nextAction = isOutboundEmail
            ? (result.action_reason || 'Follow up required')
            : ((result.suggested_draft_pushy || result.suggested_draft_exploratory || result.suggested_draft) ? 'Draft Response Created' : 'Review Required');
            
          await supabaseService.create('activities', {
            name: activityName,
            status: isOutboundEmail ? 'Pending Follow-up' : 'Completed',
            description: `Email ${isOutboundEmail ? 'sent to' : 'received from'} ${contactContext.name}: ${email.subject}`,
            next_step: nextAction,
            priority: result.confidence >= 8 ? 1 : 2
          });
          
          onMessageLog?.(`Database activity created for ${isOutboundEmail ? 'outbound email to' : 'inbound email from'} ${contactContext.name}`, 'success');
        } catch (error) {
          console.warn('Failed to create activity:', error);
        }
      }
      
      // Step 8: For outbound emails with no specific contact, suggest creating a lead
      if (isOutboundEmail && !contactContext && result.confidence >= 7) {
        onMessageLog?.(`Outbound email to potential new contact - consider adding to database`, 'info');
      }

    } catch (error) {
      console.error("Triage failed:", error);
      const errorResult = { error: error.message, isLoading: false };
      setTriageResults(prev => ({ ...prev, [email.id]: errorResult }));
      onMessageLog?.(`Action decision failed for "${email.subject}": ${error.message}`, 'error');
    }
  };

  const handleEmailAction = async (emailId, action, data) => {
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
        case 'create_draft':
          if (!data || !data.to || !data.subject || !data.body) {
            throw new Error('Missing data for creating a draft.');
          }
          await emailService.createDraft(data.to, data.subject, data.body);
          onMessageLog?.(`Draft created for: ${data.subject}`, 'success');
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

      await updateTriageResult(emailId, updates);
      
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
    if (!openAIService || !isConfigLoaded) {
      onMessageLog?.('OpenAI service not available. Please check your API key configuration.', 'error');
      return;
    }

    if (emails.length === 0) {
      onMessageLog?.('No emails to process. Please fetch emails first.', 'error');
      return;
    }

    onMessageLog?.(`Starting batch action decisions for ${emails.length} emails...`, 'info');
    
    // Process all emails that haven't been processed yet
    const unprocessed = emails.filter(email => !triageResults[email.id]?.key_point && !triageResults[email.id]?.isLoading);
    
    if (unprocessed.length === 0) {
      onMessageLog?.('All emails already have action decisions!', 'info');
      return;
    }

    onMessageLog?.(`Processing ${unprocessed.length} remaining emails...`, 'info');

    // Process emails in batches to avoid overwhelming the API
    for (let i = 0; i < unprocessed.length; i++) {
      const email = unprocessed[i];
      onMessageLog?.(`Deciding action ${i + 1}/${unprocessed.length}: "${email.subject}"`, 'info');
      await handleTriage(email);
      
      // Small delay between requests to be respectful to the API
      if (i < unprocessed.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    onMessageLog?.(`Batch action decisions completed! Processed ${unprocessed.length} emails.`, 'success');
  };

  const performCompanyResearch = async (companyDomain) => {
    try {
      // Create a search query for recent company information
      const searchQuery = `${companyDomain} company news funding partnerships 2024`;
      
      // Use a simple web search approach
      // In a production environment, you'd use Google Custom Search API or similar
      const searchResults = await webSearch(searchQuery);
      
      return `Recent information about ${companyDomain}:\n${searchResults}`;
    } catch (error) {
      console.warn(`Company research failed for ${companyDomain}:`, error);
      return `Unable to research ${companyDomain} at this time. Proceeding with standard response.`;
    }
  };

  const webSearch = async (query) => {
    // This is a simplified web search implementation
    // In production, you would integrate with a proper search API
    
    try {
      // For now, we'll return a structured placeholder that indicates what would be searched
      return `[Searching for: "${query}"]
      
This would typically return:
- Recent news and press releases
- Funding announcements and investment rounds  
- New partnerships and collaborations
- Product launches and updates
- Market position and competitive landscape
- Key executives and leadership changes

This information would be used to craft more informed and strategic responses that demonstrate knowledge of the company's current situation and identify potential collaboration opportunities.`;
    } catch (error) {
      throw new Error(`Web search failed: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Fetch Emails Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MailIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-700">Email Action Decisions</h2>
          </div>
          <button
            onClick={fetchEmails}
            disabled={isLoading || !oauthStatus.hasAccessToken}
            className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                  {Object.keys(triageResults).filter(id => triageResults[id]?.key_point).length} actions decided
                  {Object.keys(triageResults).filter(id => triageResults[id]?.isStored).length > 0 && (
                    <span className="ml-2 text-xs text-blue-600">
                      ({Object.keys(triageResults).filter(id => triageResults[id]?.isStored).length} from storage)
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={handleTriageAll}
                disabled={isLoading || !openAIService || !isConfigLoaded || Object.keys(triageResults).some(id => triageResults[id]?.isLoading)}
                className="flex items-center gap-2 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 transition duration-300 disabled:bg-purple-300 text-sm"
              >
                <SparklesIcon className="h-4 w-4" />
                Decide Actions
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
                              Deciding...
                            </span>
                          ) : triageResults[email.id]?.error ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Error
                            </span>
                          ) : triageResults[email.id]?.autoArchived ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              ✓ Executed: Archived
                            </span>
                          ) : triageResults[email.id]?.draftCreated ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Executed: Draft Created
                            </span>
                          ) : triageResults[email.id]?.key_point ? (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Action: {triageResults[email.id].key_point}
                              </span>
                              {triageResults[email.id]?.isStored && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600" title="Loaded from database">
                                  📁
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Pending Action
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
                              {triageResults[email.id]?.isLoading ? 'Deciding...' : 'Decide Action'}
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
                      {triageResults[email.id] && (triageResults[email.id].summary || triageResults[email.id].action_reason || triageResults[email.id].key_point || triageResults[email.id].error) && (
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
    </div>
  );
};

export default EmailList; 