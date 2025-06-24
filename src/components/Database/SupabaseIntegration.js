import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../AppContext';
import supabaseService from '../../services/supabaseService';
import { useSupabaseData } from './hooks/useSupabaseData';
import { TABLE_CONFIG } from './config/tableConfig';
import { TableNavigation } from './components/TableNavigation';
import { DataTable } from './components/DataTable';
import AICommandInput from './AICommandInput';
import CleanupSuggestions from './CleanupSuggestions';
import { emailAnalysisService } from '../../services/emailAnalysisService';
import linkedinService from '../../services/linkedinService';

const SupabaseIntegration = ({ onMessageLog }) => {
  const { isConfigLoaded, openAIService } = useContext(AppContext);
  const [currentView, setCurrentView] = useState('companies');
  const [contactSearchFilter, setContactSearchFilter] = useState('');
  const [cleanupSuggestions, setCleanupSuggestions] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [groupByColumn, setGroupByColumn] = useState(null);
  const [isFindingLastChat, setIsFindingLastChat] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const [isFindingLinkedIn, setIsFindingLinkedIn] = useState(false);

  // Use the custom hook for data management
  const {
    records,
    isLoading,
    error,
    currentPage,
    hasNextPage,
    totalRecords,
    loadMore,
    refresh
  } = useSupabaseData(currentView, isConfigLoaded, onMessageLog, contactSearchFilter);

  // Handle navigation to contact
  useEffect(() => {
    const handleNavigateToContact = (event) => {
      const { contactName } = event.detail;
      setCurrentView('contacts');
      setContactSearchFilter(contactName);
      // Scroll to top after navigation
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    };

    const handleNavigateToCompanyContacts = (event) => {
      const { companyName } = event.detail;
      setCurrentView('contacts');
      // Clear existing filters first
      setColumnFilters({});
      setContactSearchFilter('');
      // Set company filter
      setColumnFilters({ company_name: [companyName] });
      // Scroll to top after navigation
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    };

    window.addEventListener('navigate-to-contact', handleNavigateToContact);
    window.addEventListener('navigate-to-company-contacts', handleNavigateToCompanyContacts);
    return () => {
      window.removeEventListener('navigate-to-contact', handleNavigateToContact);
      window.removeEventListener('navigate-to-company-contacts', handleNavigateToCompanyContacts);
    };
  }, []);

  const handleViewChange = (newView) => {
    setCurrentView(newView);
    setContactSearchFilter(''); // Clear any search filters
    setColumnFilters({}); // Clear column filters when switching tables
    setCleanupSuggestions(null); // Clear cleanup suggestions when switching tables
    setGroupByColumn(null); // Clear grouping when switching tables
  };

  const handleCommandExecuted = () => {
    // Refresh the current view after a command is executed
    refresh();
  };

  const handleSuggestCleanup = async () => {
    if (!openAIService || !isConfigLoaded) {
      onMessageLog?.('OpenAI service not available. Please check your API key configuration.', 'error');
      return;
    }

    if (!records || records.length === 0) {
      onMessageLog?.('No data available to analyze. Please load data first.', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setCleanupSuggestions(null);
    
    try {
      onMessageLog?.(`Analyzing ${currentView} table for cleanup opportunities...`, 'info');
      
      // Get related tables data for better analysis
      const relatedTables = {};
      
      if (currentView === 'contacts') {
        // For contacts, also get companies data
        try {
          const { data: companiesData } = await supabaseService.supabase
            .from('companies')
            .select('id, name, company_type_id')
            .limit(50);
          if (companiesData) relatedTables.companies = companiesData;
        } catch (error) {
          console.warn('Failed to fetch companies for cleanup analysis:', error);
        }
      } else if (currentView === 'companies') {
        // For companies, also get contacts data
        try {
          const { data: contactsData } = await supabaseService.supabase
            .from('contacts')
            .select('id, name, email, company_id')
            .limit(50);
          if (contactsData) relatedTables.contacts = contactsData;
        } catch (error) {
          console.warn('Failed to fetch contacts for cleanup analysis:', error);
        }
      }
      
      // Analyze the table for cleanup suggestions
      const suggestions = await openAIService.analyzeTableForCleanup(
        currentView,
        records,
        relatedTables
      );
      
      setCleanupSuggestions(suggestions);
      
      const issueCount = suggestions.total_issues || suggestions.cleanup_suggestions?.length || 0;
      onMessageLog?.(`Analysis complete: Found ${issueCount} potential cleanup opportunities`, 'success');
      
    } catch (error) {
      console.error('Cleanup analysis failed:', error);
      onMessageLog?.(`Cleanup analysis failed: ${error.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApproveCleanup = async (suggestion) => {
    try {
      onMessageLog?.(`Executing cleanup: ${suggestion.description}`, 'info');
      
      // Execute the cleanup operations
      await supabaseService.executeDbOperations(suggestion.operations);
      
      onMessageLog?.(`Cleanup completed successfully: ${suggestion.description}`, 'success');
      
      // Refresh the data to show the changes
      refresh();
      
    } catch (error) {
      console.error('Failed to execute cleanup:', error);
      throw error; // Re-throw to be handled by CleanupSuggestions component
    }
  };

  const handleRejectCleanup = (index) => {
    onMessageLog?.(`Cleanup suggestion #${index + 1} rejected`, 'info');
  };

  const handleFindLastChat = async () => {
    if (isFindingLastChat) return;

    setIsFindingLastChat(true);
    try {
      onMessageLog?.('🔍 Starting Gmail-based last chat analysis for all contacts...', 'info');
      
      // Find last chat for all contacts using Gmail API
      const contactResults = await emailAnalysisService.findLastChatForAllContacts();
      
      // Update companies based on contact data
      onMessageLog?.('🏢 Updating company last chat dates...', 'info');
      const companyResults = await emailAnalysisService.updateCompanyLastChatDates();
      
      // Refresh the current view
      refresh();
      
      const totalUpdated = contactResults.updated + companyResults.updated;
      const totalProcessed = contactResults.total + companyResults.total;
      const skippedCount = contactResults.skipped || 0;
      
      let message = `🎉 Gmail analysis complete! Updated ${totalUpdated} out of ${totalProcessed} records`;
      if (skippedCount > 0) {
        message += ` (${skippedCount} contacts had no Gmail correspondence)`;
      }
      
      onMessageLog?.(message, 'success');
      
    } catch (error) {
      console.error('Error finding last chat:', error);
      onMessageLog?.(`❌ Failed to find last chat: ${error.message}`, 'error');
    } finally {
      setIsFindingLastChat(false);
    }
  };

  const handleFindLinkedIn = async () => {
    if (isFindingLinkedIn) return;

    setIsFindingLinkedIn(true);
    try {
      onMessageLog?.('🔍 Starting LinkedIn profile search for all contacts...', 'info');
      
      // Find LinkedIn profiles for all contacts
      const results = await linkedinService.findLinkedInForAllContacts((progress) => {
        onMessageLog?.(`📍 Progress: ${progress.current}/${progress.total} - ${progress.contact}: ${progress.status}`, 'info');
      });
      
      // Refresh the current view
      refresh();
      
      const message = `🎉 LinkedIn search complete! Found ${results.found} profiles out of ${results.total} contacts (${results.skipped} skipped, ${results.errors} errors)`;
      
      onMessageLog?.(message, 'success');
      
    } catch (error) {
      console.error('Error finding LinkedIn profiles:', error);
      onMessageLog?.(`❌ Failed to find LinkedIn profiles: ${error.message}`, 'error');
    } finally {
      setIsFindingLinkedIn(false);
    }
  };

  const handleClearContactFilter = () => {
    setContactSearchFilter('');
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* AI Command Input */}
      <AICommandInput onCommandExecuted={handleCommandExecuted} />
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <div className="font-medium">Database Error</div>
          </div>
          <div className="mt-1 text-sm">{error}</div>
        </div>
      )}

      {/* Table Navigation */}
      <TableNavigation
        currentView={currentView}
        onViewChange={handleViewChange}
        groupByColumn={groupByColumn}
        onGroupByChange={setGroupByColumn}
        onRefresh={refresh}
        onSuggestCleanup={handleSuggestCleanup}
        onFindLastChat={handleFindLastChat}
        onFindLinkedIn={handleFindLinkedIn}
        isLoading={isLoading}
        isAnalyzing={isAnalyzing}
        isFindingLastChat={isFindingLastChat}
        isFindingLinkedIn={isFindingLinkedIn}
        hasRecords={records && records.length > 0}
        contactSearchFilter={contactSearchFilter}
        onClearContactFilter={handleClearContactFilter}
        columnFilters={columnFilters}
        onClearAllFilters={setColumnFilters}
      />
      
      {/* Data Table */}
      <DataTable 
        records={records}
        columns={TABLE_CONFIG[currentView].columns}
        isLoading={isLoading}
        tableName={currentView}
        currentPage={currentPage}
        hasNextPage={hasNextPage}
        totalRecords={totalRecords}
        onLoadMore={loadMore}
        onMessageLog={onMessageLog}
        onUpdate={refresh}
        groupByColumn={groupByColumn}
        columnFilters={columnFilters}
        onFiltersChange={setColumnFilters}
      />
      
      {/* Cleanup Suggestions */}
      {cleanupSuggestions && (
        <CleanupSuggestions
          suggestions={cleanupSuggestions}
          onApprove={handleApproveCleanup}
          onReject={handleRejectCleanup}
          onMessageLog={onMessageLog}
        />
      )}
    </div>
  );
};

export default SupabaseIntegration;