import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AppContext } from '../../AppContext';
import supabaseService from '../../services/supabaseService';
import { RefreshCw, PlusCircle, ChevronDown, ChevronUp } from 'lucide-react';

const DataTable = ({ records, columns, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading Data...</span>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return <div className="text-center py-8 text-gray-500">No records found.</div>;
  }

  const getDisplayValue = (record, column) => {
    const value = record[column.key];
    if (value === null || value === undefined) return <span className="text-gray-400">N/A</span>;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      return new Date(value).toLocaleString();
    }
    if (typeof value === 'object') return <pre className="text-xs bg-gray-100 p-1 rounded">{JSON.stringify(value, null, 2)}</pre>;
    return value.toString();
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-2 text-left font-medium text-gray-600 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2 whitespace-nowrap">
                  {getDisplayValue(record, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SupabaseIntegration = ({ onMessageLog }) => {
  const { isConfigLoaded } = useContext(AppContext);
  const [currentView, setCurrentView] = useState('companies');
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const tableConfig = {
    companies: {
      label: 'Companies',
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'industry', label: 'Industry' },
        { key: 'created_at', label: 'Created' },
      ],
    },
    contacts: {
      label: 'Contacts',
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'company_id', label: 'Company ID' },
      ],
    },
     triage_results: {
      label: 'Triage Results',
      columns: [
        { key: 'id', label: 'Email ID' },
        { key: 'key_point', label: 'Key Point' },
        { key: 'confidence', label: 'Confidence' },
        { key: 'summary', label: 'Summary' },
        { key: 'feedback', label: 'Feedback' },
      ],
    },
  };

  const fetchData = useCallback(async (tableName) => {
    if (!isConfigLoaded) return;
    setIsLoading(true);
    setError(null);
    try {
      onMessageLog?.(`Loading ${tableName} from Supabase...`, 'info');
      const data = await supabaseService.getAll(tableName);
      setRecords(data);
      onMessageLog?.(`Loaded ${data.length} records from ${tableName}`, 'success');
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

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Object.keys(tableConfig).map(view => (
            <button
              key={view}
              onClick={() => handleViewChange(view)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                currentView === view 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tableConfig[view].label}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchData(currentView)}
          disabled={isLoading}
          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>
      
      <DataTable 
        records={records}
        columns={tableConfig[currentView].columns}
        isLoading={isLoading}
      />
    </div>
  );
};

export default SupabaseIntegration; 