import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AppContext } from '../../AppContext';
import supabaseService from '../../services/supabaseService';
import { RefreshCw, Building2, Users, Activity, FileText } from 'lucide-react';
import AICommandInput from './AICommandInput';


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
      { key: 'activity_name', label: 'Activity', width: 'w-48' },
      { key: 'status', label: 'Status', width: 'w-24' },
      { key: 'contact_name', label: 'Contact', width: 'w-32' },
      { key: 'action', label: 'Action', width: 'w-32' },
      { key: 'next_action', label: 'Next Action', width: 'w-32' },
      { key: 'created_at', label: 'Created', width: 'w-32' },
    ],
    orderBy: 'created_at',
    orderDirection: 'desc',
    customQuery: true
  },
  triage_results: {
    label: 'Email Triage',
    icon: FileText,
    description: 'AI-processed email insights',
    columns: [
      { key: 'id', label: 'Email ID', width: 'w-32' },
      { key: 'key_point', label: 'Key Point', width: 'w-64' },
      { key: 'confidence', label: 'Confidence', width: 'w-24' },
      { key: 'summary', label: 'Summary', width: 'w-96' },
      { key: 'timestamp', label: 'Processed', width: 'w-32' },
    ],
    orderBy: 'timestamp',
    orderDirection: 'desc'
  },
};

const SupabaseIntegration = ({ onMessageLog }) => {
  const { isConfigLoaded } = useContext(AppContext);
  const [currentView, setCurrentView] = useState('companies');
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
      } else if (tableName === 'activities') {
        query = supabaseService.supabase
          .from('activities')
          .select(`
            id,
            activity_name,
            status,
            action,
            next_action,
            created_at,
            contacts!inner(name)
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
      } else if (tableName === 'activities') {
        transformedData = data.map(activity => ({
          ...activity,
          contact_name: activity.contacts?.name || 'No Contact'
        }));
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
  }, [onMessageLog, isConfigLoaded]);

  useEffect(() => {
    if (isConfigLoaded) {
      fetchData(currentView);
    }
  }, [currentView, fetchData, isConfigLoaded]);
  
  const handleViewChange = (view) => {
    setRecords([]);
    setCurrentView(view);
  };

  const handleCommandExecuted = () => {
    // Refresh the current view after a command is executed
    fetchData(currentView);
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
        <div className="flex items-center gap-2">
          {React.createElement(TABLE_CONFIG[currentView].icon, { size: 16, className: "text-gray-600" })}
          <span className="font-medium text-gray-900">{TABLE_CONFIG[currentView].label}</span>
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
    </div>
  );
};

export default SupabaseIntegration; 