import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AppContext } from '../../AppContext';
import supabaseService from '../../services/supabaseService';
import { RefreshCw, Building2, Users, Activity, FileText } from 'lucide-react';
import { CleanupIcon } from '../shared/Icons';
import AICommandInput from './AICommandInput';
import CleanupSuggestions from './CleanupSuggestions';


const DataTable = ({ records, columns, isLoading, tableName }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading data...</span>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">No records found</div>
        <div className="text-gray-500 text-sm">Try using the AI command above to add some data</div>
      </div>
    );
  }

  const getDisplayValue = (record, column) => {
    const value = record[column.key];
    
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">—</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <span className={`px-2 py-1 rounded-full text-xs ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }
    
    // Handle dates
    if (column.key.includes('_at') || column.key === 'timestamp') {
      try {
        const date = new Date(value);
        return (
          <span className="text-gray-600 text-sm">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      } catch {
        return value;
      }
    }
    
    // Handle status fields
    if (column.key.includes('status')) {
      const statusColors = {
        'Active': 'bg-green-100 text-green-800',
        'Inactive': 'bg-gray-100 text-gray-800',
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Completed': 'bg-blue-100 text-blue-800',
      };
      const colorClass = statusColors[value] || 'bg-gray-100 text-gray-800';
      return (
        <span className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>
          {value}
        </span>
      );
    }
    
    // Handle confidence (for triage results)
    if (column.key === 'confidence') {
      const confidence = parseInt(value);
      const color = confidence >= 80 ? 'text-green-600' : confidence >= 60 ? 'text-yellow-600' : 'text-red-600';
      return <span className={`font-medium ${color}`}>{confidence}%</span>;
    }
    
    // Handle feedback (for triage results)
    if (column.key === 'feedback') {
      if (!value) {
        return <span className="text-gray-400 italic">—</span>;
      }
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'good' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value === 'good' ? '👍 Good' : '👎 Poor'}
        </span>
      );
    }
    
    // Handle email addresses
    if (column.key === 'email' && typeof value === 'string' && value.includes('@')) {
      return (
        <a href={`mailto:${value}`} className="text-blue-600 hover:text-blue-800 hover:underline">
          {value}
        </a>
      );
    }
    
    // Handle ID references
    if ((column.key === 'company_id' || column.key === 'related_contact_id') && value) {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
          #{value}
        </span>
      );
    }
    
    // Handle company type ID with lookup
    if (column.key === 'company_type_id' && value) {
      const typeNames = {
        1: 'Other',
        2: 'Direct Bank Customer', 
        3: 'ISV Partner',
        4: 'Fintech'
      };
      return (
        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
          {typeNames[value] || `Type #${value}`}
        </span>
      );
    }
    
    // Handle company name
    if (column.key === 'company_name' && value) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
          {value}
        </span>
      );
    }
    
    // Handle contact name in activities
    if (column.key === 'contact_name' && value) {
      return (
        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
          {value}
        </span>
      );
    }
    
    // Handle clickable contact names in triage results
    if (column.key === 'contact_name' && tableName === 'triage_results' && value) {
      const isEmailId = value.startsWith('Email ID:');
      if (isEmailId) {
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono">
            {value}
          </span>
        );
      } else {
        return (
          <button
            onClick={() => {
              // Navigate to contacts tab and search for this contact
              const event = new CustomEvent('navigate-to-contact', { 
                detail: { contactName: value } 
              });
              window.dispatchEvent(event);
            }}
            className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium hover:bg-blue-200 cursor-pointer transition-colors"
            title={`Click to view ${value} in contacts`}
          >
            {value}
          </button>
        );
      }
    }
    
    // Handle long text (summary, etc.)
    if (typeof value === 'string' && value.length > 100) {
      return (
        <div className="max-w-xs">
          <div className="truncate" title={value}>
            {value}
          </div>
        </div>
      );
    }
    
    if (typeof value === 'object') {
      return <pre className="text-xs bg-gray-100 p-1 rounded max-w-xs overflow-hidden">{JSON.stringify(value, null, 2)}</pre>;
    }
    
    // Handle priority fields
    if (column.key === 'priority') {
      if (value === null || value === undefined) {
        return <span className="text-gray-400 italic">—</span>;
      }
      const priorityColors = {
        1: 'bg-red-100 text-red-800',
        2: 'bg-yellow-100 text-yellow-800',
        3: 'bg-green-100 text-green-800',
      };
      const priorityLabels = {
        1: 'High',
        2: 'Medium', 
        3: 'Low'
      };
      const colorClass = priorityColors[value] || 'bg-gray-100 text-gray-800';
      const label = priorityLabels[value] || `Priority ${value}`;
      return (
        <span className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>
          {label}
        </span>
      );
    }
    
    // Handle due dates
    if (column.key === 'next_step_due_date') {
      if (value === null || value === undefined) {
        return <span className="text-gray-400 italic">No due date</span>;
      }
      try {
        const date = new Date(value);
        const now = new Date();
        const isOverdue = date < now;
        const colorClass = isOverdue ? 'text-red-600' : 'text-gray-600';
        return (
          <span className={`text-sm ${colorClass}`}>
            {date.toLocaleDateString()}
            {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
          </span>
        );
      } catch {
        return value;
      }
    }
    
    return <span className="text-gray-900">{value.toString()}</span>;
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th 
                key={col.key} 
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.width || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {records.map((record, index) => (
            <tr key={record.id || index} className="hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-sm ${col.width || ''}`}>
                  {getDisplayValue(record, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {records.length === 50 && (
        <div className="bg-gray-50 px-4 py-2 text-center text-sm text-gray-600">
          Showing first 50 records. Use AI commands to filter or search for specific data.
        </div>
      )}
    </div>
  );
};

// Move tableConfig outside component to prevent recreation on every render
const TABLE_CONFIG = {
  companies: {
    label: 'Companies',
    icon: Building2,
    description: 'Manage your company database',
    columns: [
      { key: 'id', label: 'ID', width: 'w-16' },
      { key: 'name', label: 'Company Name', width: 'w-48' },
      { key: 'company_type_id', label: 'Type ID', width: 'w-20' },
      { key: 'country', label: 'Country', width: 'w-24' },
      { key: 'status', label: 'Status', width: 'w-24' },
      { key: 'created_at', label: 'Added', width: 'w-32' },
    ],
    orderBy: 'created_at',
    orderDirection: 'desc'
  },
  contacts: {
    label: 'Contacts',
    icon: Users,
    description: 'View and manage your contacts',
    columns: [
      { key: 'id', label: 'ID', width: 'w-16' },
      { key: 'name', label: 'Contact Name', width: 'w-48' },
      { key: 'email', label: 'Email', width: 'w-64' },
      { key: 'title', label: 'Title', width: 'w-32' },
      { key: 'company_name', label: 'Company', width: 'w-32' },
      { key: 'contact_status', label: 'Status', width: 'w-24' },
    ],
    orderBy: 'created_at',
    orderDirection: 'desc',
    customQuery: true // Flag to indicate this table needs a custom query
  },
  activities: {
    label: 'Activities',
    icon: Activity,
    description: 'Track activities and follow-ups',
    columns: [
      { key: 'id', label: 'ID', width: 'w-16' },
      { key: 'name', label: 'Activity', width: 'w-48' },
      { key: 'status', label: 'Status', width: 'w-24' },
      { key: 'priority', label: 'Priority', width: 'w-20' },
      { key: 'next_step', label: 'Next Step', width: 'w-48' },
      { key: 'next_step_due_date', label: 'Due Date', width: 'w-32' },
      { key: 'created_at', label: 'Created', width: 'w-32' },
    ],
    orderBy: 'created_at',
    orderDirection: 'desc'
  },
  triage_results: {
    label: 'Email Triage',
    icon: FileText,
    description: 'AI-processed email insights',
    columns: [
      { key: 'contact_name', label: 'Contact', width: 'w-48' },
      { key: 'created_at', label: 'Date', width: 'w-32' },
      { key: 'decision', label: 'Decision', width: 'w-32' },
      { key: 'confidence', label: 'Confidence', width: 'w-24' },
      { key: 'action_reason', label: 'Reason', width: 'w-96' },
    ],
    orderBy: 'created_at',
    orderDirection: 'desc',
    customQuery: true
  },
};

const SupabaseIntegration = ({ onMessageLog }) => {
  const { isConfigLoaded, openAIService } = useContext(AppContext);
  const [currentView, setCurrentView] = useState('companies');
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contactSearchFilter, setContactSearchFilter] = useState('');
  const [cleanupSuggestions, setCleanupSuggestions] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

    window.addEventListener('navigate-to-contact', handleNavigateToContact);
    return () => {
      window.removeEventListener('navigate-to-contact', handleNavigateToContact);
    };
  }, []);

  const fetchData = useCallback(async (tableName) => {
    if (!isConfigLoaded || !supabaseService.isConnected()) return;
    setIsLoading(true);
    setError(null);
    try {
      onMessageLog?.(`Loading ${tableName} from Supabase...`, 'info');
      
      const config = TABLE_CONFIG[tableName];
      let query;
      
      // Handle special queries for tables that need JOINs
      if (tableName === 'contacts') {
        query = supabaseService.supabase
          .from('contacts')
          .select(`
            id,
            name,
            email,
            title,
            contact_status,
            created_at,
            companies!inner(name)
          `);
        
        // Apply search filter if set
        if (contactSearchFilter) {
          query = query.or(`name.ilike.%${contactSearchFilter}%,email.ilike.%${contactSearchFilter}%`);
        }
      } else if (tableName === 'activities') {
        query = supabaseService.supabase
          .from('activities')
          .select(`
            id,
            name,
            status,
            priority,
            next_step,
            next_step_due_date,
            created_at
          `);
      } else if (tableName === 'triage_results') {
        query = supabaseService.supabase
          .from('triage_results')
          .select(`
            id,
            decision,
            confidence,
            action_reason,
            email_from,
            created_at,
            contact_context
          `);
      } else {
        query = supabaseService.supabase.from(tableName).select('*');
      }
      
      // Apply ordering
      if (config.orderBy) {
        query = query.order(config.orderBy, { ascending: config.orderDirection === 'asc' });
      }
      
      // Limit results for performance
      query = query.limit(50);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform data for tables with JOINs to flatten related names
      let transformedData = data || [];
      if (tableName === 'contacts') {
        transformedData = data.map(contact => ({
          ...contact,
          company_name: contact.companies?.name || 'No Company'
        }));
      } else if (tableName === 'triage_results') {
        transformedData = data.map(triage => {
          let contactName = 'Unknown Contact';
          
          // Extract contact name from contact_context
          if (triage.contact_context && triage.contact_context.name) {
            contactName = triage.contact_context.name;
          } else if (triage.contact_context && triage.contact_context.email) {
            contactName = triage.contact_context.email;
          } else if (triage.email_from) {
            // Try to extract a readable name from the email_from field
            const emailMatch = triage.email_from.match(/^(.+?)\s*<(.+)>$/);
            if (emailMatch) {
              const [, name, email] = emailMatch;
              contactName = name.trim().replace(/['"]/g, '') || email;
            } else {
              // Just use the email address
              contactName = triage.email_from;
            }
          } else {
            // Fallback to email ID format
            contactName = `Email ID: ${triage.id.substring(0, 8)}...`;
          }
          
          return {
            ...triage,
            contact_name: contactName
          };
        });
      }
      
      setRecords(transformedData);
      onMessageLog?.(`Loaded ${transformedData?.length || 0} records from ${tableName}`, 'success');
    } catch (err) {
      const errorMsg = `Failed to load ${tableName}: ${err.message}`;
      setError(errorMsg);
      onMessageLog?.(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onMessageLog, isConfigLoaded, contactSearchFilter]);

  useEffect(() => {
    if (isConfigLoaded) {
      fetchData(currentView);
    }
  }, [currentView, fetchData, isConfigLoaded]);
  
  const handleViewChange = (newView) => {
    setCurrentView(newView);
    setContactSearchFilter(''); // Clear any search filters
    setCleanupSuggestions(null); // Clear cleanup suggestions when switching tables
    fetchData(newView);
  };

  const handleCommandExecuted = () => {
    // Refresh the current view after a command is executed
    fetchData(currentView);
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
      await fetchData(currentView);
      
    } catch (error) {
      console.error('Failed to execute cleanup:', error);
      throw error; // Re-throw to be handled by CleanupSuggestions component
    }
  };

  const handleRejectCleanup = (index) => {
    onMessageLog?.(`Cleanup suggestion #${index + 1} rejected`, 'info');
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Object.entries(TABLE_CONFIG).map(([view, config]) => {
            const IconComponent = config.icon;
            return (
              <button
                key={view}
                onClick={() => handleViewChange(view)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentView === view 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <IconComponent size={16} />
                {config.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => fetchData(currentView)}
          disabled={isLoading}
          className="bg-white border border-gray-200 text-gray-700 p-2 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 flex items-center transition-colors"
          title="Refresh data"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Current View Description */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {React.createElement(TABLE_CONFIG[currentView].icon, { size: 16, className: "text-gray-600" })}
            <span className="font-medium text-gray-900">{TABLE_CONFIG[currentView].label}</span>
            {currentView === 'contacts' && contactSearchFilter && (
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm text-blue-600">Filtered by: "{contactSearchFilter}"</span>
                <button
                  onClick={() => {
                    setContactSearchFilter('');
                    fetchData('contacts');
                  }}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>
          
          {/* Suggest Cleanup Button */}
          <button
            onClick={handleSuggestCleanup}
            disabled={isAnalyzing || isLoading || !records || records.length === 0}
            className="flex items-center gap-2 bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-orange-300 disabled:cursor-not-allowed text-sm font-medium"
            title="Analyze table for cleanup opportunities"
          >
            <CleanupIcon className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'Suggest Cleanup'}
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">{TABLE_CONFIG[currentView].description}</p>
      </div>
      
      {/* Data Table */}
      <DataTable 
        records={records}
        columns={TABLE_CONFIG[currentView].columns}
        isLoading={isLoading}
        tableName={currentView}
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