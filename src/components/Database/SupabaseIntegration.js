import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { AppContext } from '../../AppContext';
import supabaseService from '../../services/supabaseService';
import { RefreshCw, Building2, Users, Activity, FileText, Search, Filter, X, ChevronDown, Linkedin } from 'lucide-react';
import { CleanupIcon } from '../shared/Icons';
import AICommandInput from './AICommandInput';
import CleanupSuggestions from './CleanupSuggestions';
import LastChatDatePicker from './LastChatDatePicker';
import { emailAnalysisService } from '../../services/emailAnalysisService';
import linkedinService from '../../services/linkedinService';

// Google Sheets-style Column Filter Dropdown Component
const ColumnFilterDropdown = ({ column, records, filters, onFiltersChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const columnKey = column.key;
  const activeFilters = filters[columnKey] || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.column-filter-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Get unique values for this column
  const getUniqueValues = () => {
    const values = new Set();
    records.forEach(record => {
      let value = record[columnKey];
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        values.add('(Empty)');
        return;
      }

      // Handle different data types
      if (typeof value === 'boolean') {
        values.add(value ? 'Yes' : 'No');
      } else if (columnKey.includes('_at') || columnKey === 'timestamp') {
        // For dates, show just the date part
        try {
          const date = new Date(value);
          values.add(date.toLocaleDateString());
        } catch {
          values.add(String(value));
        }
      } else if (columnKey === 'company_type_id') {
        // Handle company type IDs with their labels
        const companyTypes = {
          1: 'Other',
          2: 'Customer (Bank)',
          3: 'Channel Partner',
          4: 'Customer (NeoBank)',
          5: 'Investor',
          6: 'Customer (Software provider)',
          7: 'Customer (Payments)'
        };
        values.add(companyTypes[value] || `Type #${value}`);
      } else {
        values.add(String(value));
      }
    });

    // Convert to array and sort
    return Array.from(values).sort((a, b) => {
      // Put (Empty) at the top
      if (a === '(Empty)') return -1;
      if (b === '(Empty)') return 1;
      return a.localeCompare(b);
    });
  };

  const uniqueValues = getUniqueValues();
  const hasActiveFilters = activeFilters.length > 0;

  const handleValueToggle = (value) => {
    const newFilters = { ...filters };
    const currentFilters = newFilters[columnKey] || [];
    
    if (currentFilters.includes(value)) {
      // Remove the value
      const updatedFilters = currentFilters.filter(f => f !== value);
      if (updatedFilters.length === 0) {
        delete newFilters[columnKey];
      } else {
        newFilters[columnKey] = updatedFilters;
      }
    } else {
      // Add the value
      newFilters[columnKey] = [...currentFilters, value];
    }
    
    onFiltersChange(newFilters);
  };

  const handleSelectAll = () => {
    const newFilters = { ...filters };
    delete newFilters[columnKey]; // Remove all filters for this column
    onFiltersChange(newFilters);
  };

  const handleSelectNone = () => {
    const newFilters = { ...filters };
    newFilters[columnKey] = []; // Set to empty array (shows nothing)
    onFiltersChange(newFilters);
  };

  return (
    <div className="relative column-filter-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 rounded hover:bg-gray-200 transition-colors ${
          hasActiveFilters ? 'text-blue-600' : 'text-gray-400'
        }`}
        title={`Filter ${column.label}`}
      >
        <Filter className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-64 max-h-80 overflow-hidden">
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Filter {column.label}</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                All
              </button>
              <button
                onClick={handleSelectNone}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                None
              </button>
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {uniqueValues.map((value, index) => {
              const isSelected = activeFilters.length === 0 || activeFilters.includes(value);
              return (
                <label
                  key={index}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleValueToggle(value)}
                    className="mr-2 rounded"
                  />
                  <span className="flex-1 truncate" title={value}>
                    {value}
                  </span>
                </label>
              );
            })}
          </div>
          
          {uniqueValues.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              No values found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DataTable = ({ records, columns, isLoading, tableName, currentPage, hasNextPage, totalRecords, onLoadMore, onMessageLog, onUpdate, groupByColumn, columnFilters, onFiltersChange }) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [columnOrder, setColumnOrder] = useState([]);
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [columnWidths, setColumnWidths] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [isResizing, setIsResizing] = useState(false);

  // Load saved column order, hidden columns, and column widths on component mount
  useEffect(() => {
    const savedOrder = localStorage.getItem(`columnOrder_${tableName}`);
    const savedHidden = localStorage.getItem(`hiddenColumns_${tableName}`);
    const savedWidths = localStorage.getItem(`columnWidths_${tableName}`);
    
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        // Validate that all columns are present and no extra columns exist
        const columnKeys = columns.map(col => col.key);
        const isValidOrder = parsedOrder.length === columnKeys.length && 
                           parsedOrder.every(key => columnKeys.includes(key));
        
        if (isValidOrder) {
          setColumnOrder(parsedOrder);
        } else {
          // Reset to default order if saved order is invalid
          setColumnOrder(columnKeys);
        }
      } catch (error) {
        console.warn('Failed to parse saved column order:', error);
        setColumnOrder(columns.map(col => col.key));
      }
    } else {
      setColumnOrder(columns.map(col => col.key));
    }

    if (savedHidden) {
      try {
        const parsedHidden = JSON.parse(savedHidden);
        const columnKeys = columns.map(col => col.key);
        // Only keep hidden columns that still exist
        const validHidden = parsedHidden.filter(key => columnKeys.includes(key));
        setHiddenColumns(validHidden);
      } catch (error) {
        console.warn('Failed to parse saved hidden columns:', error);
        setHiddenColumns([]);
      }
    }

    if (savedWidths) {
      try {
        const parsedWidths = JSON.parse(savedWidths);
        setColumnWidths(parsedWidths);
      } catch (error) {
        console.warn('Failed to parse saved column widths:', error);
        setColumnWidths({});
      }
    }
  }, [columns, tableName]);

  // Close column toggle dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnToggle && !event.target.closest('.relative')) {
        setShowColumnToggle(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnToggle]);

  // Save column order to localStorage
  const saveColumnOrder = (newOrder) => {
    try {
      localStorage.setItem(`columnOrder_${tableName}`, JSON.stringify(newOrder));
    } catch (error) {
      console.warn('Failed to save column order:', error);
    }
  };

  // Save hidden columns to localStorage
  const saveHiddenColumns = (hiddenCols) => {
    try {
      localStorage.setItem(`hiddenColumns_${tableName}`, JSON.stringify(hiddenCols));
    } catch (error) {
      console.warn('Failed to save hidden columns:', error);
    }
  };

  // Save column widths to localStorage
  const saveColumnWidths = (widths) => {
    try {
      localStorage.setItem(`columnWidths_${tableName}`, JSON.stringify(widths));
    } catch (error) {
      console.warn('Failed to save column widths:', error);
    }
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey) => {
    const newHiddenColumns = hiddenColumns.includes(columnKey)
      ? hiddenColumns.filter(key => key !== columnKey)
      : [...hiddenColumns, columnKey];
    
    setHiddenColumns(newHiddenColumns);
    saveHiddenColumns(newHiddenColumns);
  };

  // Get ordered and visible columns based on saved preferences
  const getOrderedColumns = () => {
    if (columnOrder.length === 0) return columns.filter(col => !hiddenColumns.includes(col.key));
    
    const orderedColumns = [];
    const columnMap = new Map(columns.map(col => [col.key, col]));
    
    // Add columns in saved order (excluding hidden ones)
    columnOrder.forEach(key => {
      const column = columnMap.get(key);
      if (column && !hiddenColumns.includes(key)) {
        orderedColumns.push(column);
        columnMap.delete(key);
      }
    });
    
    // Add any remaining columns (in case new columns were added, excluding hidden ones)
    columnMap.forEach(column => {
      if (!hiddenColumns.includes(column.key)) {
        orderedColumns.push(column);
      }
    });
    
    return orderedColumns;
  };

  // Handle drag start
  const handleDragStart = (e, columnKey) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };

  // Handle drag end
  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedColumn(null);
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = (e, targetColumnKey) => {
    e.preventDefault();
    
    if (!draggedColumn || draggedColumn === targetColumnKey) {
      return;
    }

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumnKey);

    // Remove dragged column and insert at target position
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(newOrder);
    saveColumnOrder(newOrder);
    setDraggedColumn(null);
  };

  // Handle column resize
  const handleColumnResize = (columnKey, newWidth) => {
    const newWidths = { ...columnWidths, [columnKey]: newWidth };
    setColumnWidths(newWidths);
    saveColumnWidths(newWidths);
  };

  // Column resize mouse handlers
  const handleResizeMouseDown = (e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    document.body.classList.add('resizing');
    
    const startX = e.clientX;
    const startWidth = columnWidths[columnKey] || 150; // Default width
    
    const handleMouseMove = (e) => {
      const newWidth = Math.max(50, startWidth + (e.clientX - startX)); // Minimum width of 50px
      handleColumnResize(columnKey, newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Apply filters first, then sort
  const filteredAndSortedRecords = React.useMemo(() => {
    let filtered = records;

    // Apply column filters
    if (columnFilters && Object.keys(columnFilters).length > 0) {
      filtered = records.filter(record => {
        return Object.entries(columnFilters).every(([columnKey, filterValue]) => {
          // Skip empty filters
          if (!filterValue) return true;
          
          // Handle array-based filters (new Google Sheets style)
          if (Array.isArray(filterValue)) {
            // If empty array, show nothing
            if (filterValue.length === 0) return false;
            
            const recordValue = record[columnKey];
            let displayValue;
            
            // Convert record value to display value (same logic as in ColumnFilterDropdown)
            if (recordValue === null || recordValue === undefined) {
              displayValue = '(Empty)';
            } else if (typeof recordValue === 'boolean') {
              displayValue = recordValue ? 'Yes' : 'No';
            } else if (columnKey.includes('_at') || columnKey === 'timestamp') {
              try {
                const date = new Date(recordValue);
                displayValue = date.toLocaleDateString();
              } catch {
                displayValue = String(recordValue);
              }
            } else if (columnKey === 'company_type_id') {
              const companyTypes = {
                1: 'Other',
                2: 'Customer (Bank)',
                3: 'Channel Partner',
                4: 'Customer (NeoBank)',
                5: 'Investor',
                6: 'Customer (Software provider)',
                7: 'Customer (Payments)'
              };
              displayValue = companyTypes[recordValue] || `Type #${recordValue}`;
            } else {
              displayValue = String(recordValue);
            }
            
            return filterValue.includes(displayValue);
          }
          
          // Handle legacy string-based filters (for backward compatibility)
          const recordValue = record[columnKey];
          if (recordValue === null || recordValue === undefined) return false;
          
          // Handle different filter types
          if (columnKey.includes('_at') || columnKey === 'timestamp') {
            // Date filtering - check if the record date includes the filter date
            const recordDate = new Date(recordValue);
            const filterDate = new Date(filterValue);
            return recordDate.toDateString() === filterDate.toDateString();
          } else if (columnKey === 'priority' || columnKey === 'confidence') {
            // Number filtering - exact match
            return recordValue.toString() === filterValue.toString();
          } else if (columnKey === 'company_type_id') {
            // Select filtering - exact match
            return recordValue.toString() === filterValue.toString();
          } else {
            // Text filtering - case insensitive contains
            return recordValue.toString().toLowerCase().includes(filterValue.toLowerCase());
          }
        });
      });
    }

    // Apply sorting
    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle dates
      if (sortColumn.includes('_at') || sortColumn === 'timestamp') {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }

      // Handle strings
      const aStr = aValue.toString().toLowerCase();
      const bStr = bValue.toString().toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [records, sortColumn, sortDirection, columnFilters]);

  // Note: groupedData is computed but not used in current implementation
  // Keeping for potential future grouped table display functionality
  // const groupedData = React.useMemo(() => {
  //   if (!groupByColumn) return null;

  //   const groups = {};
  //   sortedRecords.forEach(record => {
  //     const groupValue = record[groupByColumn] || 'No Value';
  //     if (!groups[groupValue]) {
  //       groups[groupValue] = [];
  //     }
  //     groups[groupValue].push(record);
  //   });

  //   // Sort groups by key
  //   const sortedGroups = Object.keys(groups).sort().reduce((acc, key) => {
  //     acc[key] = groups[key];
  //     return acc;
  //   }, {});

  //   return sortedGroups;
  // }, [sortedRecords, groupByColumn]);

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
    
    // Handle comments field FIRST (before null check) so it's always editable
    if (column.key === 'comments') {
      return (
        <EditableTextField
          currentValue={value}
          recordId={record.id}
          tableName={tableName}
          fieldName="comments"
          onUpdate={onUpdate}
          onMessageLog={onMessageLog}
          placeholder={tableName === 'companies' ? "Add company notes..." : "Add contact notes..."}
        />
      );
    }

    // Handle priority fields with dropdown for companies (before null check)
    if (column.key === 'priority' && tableName === 'companies') {
      // In grouped view, don't show dropdown for the grouping column
      if (groupByColumn === 'priority') {
        if (value === null || value === undefined) {
          return <span className="text-gray-400 italic">—</span>;
        }
        const priorityColors = {
          0: 'bg-purple-100 text-purple-800',   // Top
          1: 'bg-red-100 text-red-800',        // High
          2: 'bg-yellow-100 text-yellow-800',  // Medium
          3: 'bg-green-100 text-green-800'     // Low
        };
        const priorityLabels = {
          0: 'Top',
          1: 'High',
          2: 'Medium', 
          3: 'Low'
        };
        const colorClass = priorityColors[value] || 'bg-gray-100 text-gray-800';
        const label = priorityLabels[value] || value;
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>
            {label}
          </span>
        );
      }
      
      return (
        <PriorityDropdown
          currentPriority={value}
          companyId={record.id}
          companyTypeId={record.company_type_id}
          country={record.country}
          onUpdate={onUpdate}
          onMessageLog={onMessageLog}
        />
      );
    }

    // Handle status fields (before null check for company status dropdown)
    if (column.key.includes('status')) {
      if (column.key === 'status' && tableName === 'companies') {
        // For companies status, show dropdown even if null
        return (
          <StatusDropdown
            currentStatus={value}
            companyId={record.id}
            onUpdate={onUpdate}
            onMessageLog={onMessageLog}
          />
        );
      } else {
        // For other status fields, show static display (only if not null)
        if (value === null || value === undefined) {
          return <span className="text-gray-400 italic">—</span>;
        }
        const statusColors = {
          'Active': 'bg-green-100 text-green-800',
          'Inactive': 'bg-gray-100 text-gray-800',
          'Pending': 'bg-yellow-100 text-yellow-800',
          'Completed': 'bg-blue-100 text-blue-800',
          'Prospect': 'bg-blue-100 text-blue-800',
          'Lead': 'bg-purple-100 text-purple-800',
          'Qualified': 'bg-teal-100 text-teal-800',
          'Disqualified': 'bg-red-100 text-red-800',
          'Lost': 'bg-orange-100 text-orange-800',
          'Proposal': 'bg-indigo-100 text-indigo-800'
        };
        const colorClass = statusColors[value] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>
            {value}
          </span>
        );
      }
    }
    
    // Handle priority for other tables (static display)
    if (column.key === 'priority' && tableName !== 'companies') {
      if (value === null || value === undefined) {
        return <span className="text-gray-400 italic">—</span>;
      }
      const priorityColors = {
        0: 'bg-purple-100 text-purple-800',   // Top
        1: 'bg-red-100 text-red-800',        // High
        2: 'bg-yellow-100 text-yellow-800',  // Medium
        3: 'bg-green-100 text-green-800'     // Low
      };
      const priorityLabels = {
        0: 'Top',
        1: 'High',
        2: 'Medium', 
        3: 'Low'
      };
      const colorClass = priorityColors[value] || 'bg-gray-100 text-gray-800';
      const label = priorityLabels[value] || value;
      return (
        <span className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>
          {label}
        </span>
      );
    }
    
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
    
    // Handle confidence (for triage results)
    if (column.key === 'confidence') {
      const confidence = parseInt(value);
      const color = confidence >= 80 ? 'text-green-600' : confidence >= 60 ? 'text-yellow-600' : 'text-red-600';
      return <span className={`font-medium ${color}`}>{confidence}%</span>;
    }
    
    // Handle LinkedIn URL with connection status
    if (column.key === 'linkedin_url') {
      if (!value) {
        return <span className="text-gray-400 italic">—</span>;
      }
      
      const connectionStatus = record.linkedin_connection_status || 'unknown';
      const statusText = linkedinService.getConnectionStatusText(connectionStatus);
      
      return (
        <div className="flex items-center gap-2">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
            title={`Open LinkedIn profile - ${statusText}`}
          >
            <Linkedin className="w-4 h-4" />
            <span className="text-sm">Profile</span>
          </a>
          <ConnectionStatusDropdown
            currentStatus={connectionStatus}
            contactId={record.id}
            onUpdate={onUpdate}
            onMessageLog={onMessageLog}
          />
        </div>
      );
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
    
    // Handle company type ID with dropdown
    if (column.key === 'company_type_id' && value && tableName === 'companies') {
      const companyTypes = {
        1: 'Other',
        2: 'Customer (Bank)',
        3: 'Channel Partner',
        4: 'Customer (NeoBank)',
        5: 'Investor',
        6: 'Customer (Software provider)',
        7: 'Customer (Payments)'
      };
      const getTypeColor = (typeId) => {
        const colors = {
          1: 'bg-gray-100 text-gray-800',
          2: 'bg-blue-100 text-blue-800',
          3: 'bg-green-100 text-green-800',
          4: 'bg-purple-100 text-purple-800',
          5: 'bg-orange-100 text-orange-800',
          6: 'bg-teal-100 text-teal-800',
          7: 'bg-pink-100 text-pink-800'
        };
        return colors[typeId] || 'bg-gray-100 text-gray-800';
      };
      
      // In grouped view, don't show dropdown for the grouping column
      if (groupByColumn === 'company_type_id') {
        return (
          <span className={`px-2 py-1 rounded text-xs ${getTypeColor(value)}`}>
            {companyTypes[value] || `Type #${value}`}
          </span>
        );
      }
      
      return (
        <CompanyTypeDropdown
          currentTypeId={value}
          companyId={record.id}
          onUpdate={onUpdate}
          onMessageLog={onMessageLog}
        />
      );
    }

    // Handle contacts column
    if (column.key === 'contacts' && value) {
      if (value === 'No contacts') {
        return <span className="text-gray-400 italic">{value}</span>;
      }
      return (
        <div className="max-w-xs">
          <div className="text-sm text-gray-700" title={value}>
            {value.length > 50 ? `${value.substring(0, 50)}...` : value}
          </div>
        </div>
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
    
    // Handle clickable company names in companies table
    if (column.key === 'name' && tableName === 'companies' && column.clickable && value) {
      return (
        <button
          onClick={() => {
            // Navigate to contacts tab and filter by this company
            const event = new CustomEvent('navigate-to-company-contacts', { 
              detail: { companyName: value } 
            });
            window.dispatchEvent(event);
          }}
          className="text-left text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors font-medium"
          title={`Click to view contacts for ${value}`}
        >
          {value}
        </button>
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
    
    // Handle source fields
    if (column.key === 'source') {
      if (value === null || value === undefined) {
        return <span className="text-gray-400 italic">—</span>;
      }
      const sourceColors = {
        'Email': 'bg-blue-100 text-blue-800',
        'Manual': 'bg-gray-100 text-gray-800',
        'Import': 'bg-yellow-100 text-yellow-800',
        'API': 'bg-green-100 text-green-800',
        'Web': 'bg-purple-100 text-purple-800'
      };
      const colorClass = sourceColors[value] || 'bg-gray-100 text-gray-800';
      return (
        <span className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>
          {value}
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

    // Handle last_chat dates
    if (column.key === 'last_chat') {
      if (tableName === 'contacts') {
        // For contacts, show interactive date picker
        return (
          <LastChatDatePicker
            currentDate={value}
            contactId={record.id}
            onUpdate={onUpdate}
            onMessageLog={onMessageLog}
          />
        );
      } else {
        // For companies, show static date display
        if (value === null || value === undefined) {
          return <span className="text-gray-400 italic">—</span>;
        }
        try {
          const date = new Date(value);
          const now = new Date();
          const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
          
          let colorClass = 'text-gray-600';
          if (daysDiff <= 7) colorClass = 'text-green-600'; // Recent
          else if (daysDiff <= 30) colorClass = 'text-yellow-600'; // Within month
          else colorClass = 'text-red-600'; // Old
          
          return (
            <span className={`text-sm ${colorClass}`}>
              {date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          );
        } catch {
          return value;
        }
      }
    }
    
    return <span className="text-gray-900">{value.toString()}</span>;
  };

  // Get sorted records
  const getSortedRecords = (recordsToSort) => {
    if (!sortColumn) return recordsToSort;

    return [...recordsToSort].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

      // Handle different data types
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Group records if groupByColumn is specified
  const getGroupedRecords = () => {
    if (!groupByColumn) {
      return null; // Return null when not grouping to use regular table
    }

    const groups = {};
    records.forEach(record => {
      let groupValue = record[groupByColumn] || 'Other';
      
      // Convert company type IDs to names for better display
      if (groupByColumn === 'company_type_id' && groupValue !== 'Other') {
        const companyTypes = {
          1: 'Other',
          2: 'Customer (Bank)',
          3: 'Channel Partner',
          4: 'Customer (NeoBank)',
          5: 'Investor',
          6: 'Customer (Software provider)',
          7: 'Customer (Payments)'
        };
        groupValue = companyTypes[groupValue] || `Type #${groupValue}`;
      }
      
      if (!groups[groupValue]) {
        groups[groupValue] = [];
      }
      groups[groupValue].push(record);
    });

    // Sort records within each group
    Object.keys(groups).forEach(groupKey => {
      groups[groupKey] = getSortedRecords(groups[groupKey]);
    });

    return groups;
  };

  const groupedRecords = getGroupedRecords();
  const orderedColumns = getOrderedColumns();

  if (groupedRecords) {
    // Render grouped tables
    return (
      <div className="space-y-6">
        {Object.entries(groupedRecords).map(([groupValue, groupRecords]) => (
          <div key={groupValue} className="bg-white rounded-lg border border-gray-200">
            {/* Group Header */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-gray-200 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {groupByColumn && (
                    <span className="text-sm font-medium text-gray-600 uppercase tracking-wider mr-2">
                      {columns.find(col => col.key === groupByColumn)?.label}:
                    </span>
                  )}
                  <span className="text-blue-800">{groupValue}</span>
                </h3>
                <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {groupRecords.length} {groupRecords.length === 1 ? 'record' : 'records'}
                </span>
              </div>
            </div>
            
            {/* Group Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full table-resizable">
                <thead className="bg-gray-50">
                  <tr>
                    {orderedColumns.map((col) => (
                      <th 
                        key={col.key}
                        draggable
                        onDragStart={(e) => handleDragStart(e, col.key)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.key)}
                        className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none relative ${draggedColumn === col.key ? 'opacity-50' : ''}`}
                        style={{ 
                          width: columnWidths[col.key] || col.width || 'auto',
                          minWidth: '50px'
                        }}
                        onClick={() => handleSort(col.key)}
                        title={`Sort by ${col.label}. Drag to reorder columns.`}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{col.label}</span>
                          {sortColumn === col.key && (
                            <span className="text-blue-500">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                          {/* Drag indicator */}
                          <div className="opacity-30 hover:opacity-60 transition-opacity ml-1">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                              <circle cx="3" cy="3" r="1"/>
                              <circle cx="9" cy="3" r="1"/>
                              <circle cx="3" cy="9" r="1"/>
                              <circle cx="9" cy="9" r="1"/>
                            </svg>
                          </div>
                        </div>
                        
                        {/* Column resize handle */}
                        <div
                          className="column-resize-handle"
                          onMouseDown={(e) => handleResizeMouseDown(e, col.key)}
                          title="Drag to resize column"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupRecords.map((record, index) => (
                    <tr key={record.id || index} className="hover:bg-gray-50 transition-colors">
                      {orderedColumns.map((col) => (
                        <td 
                          key={col.key} 
                          className="px-4 py-3 text-sm"
                          style={{ 
                            width: columnWidths[col.key] || col.width || 'auto',
                            minWidth: '50px'
                          }}
                        >
                          {getDisplayValue(record, col)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        
        {/* Summary Footer */}
        {records.length > 0 && (
          <div className="bg-gray-50 px-4 py-2 text-center text-sm text-gray-600 rounded-lg border border-gray-200">
            <div className="flex justify-center items-center space-x-4">
              <span>
                Total: {records.length} records in {Object.keys(groupedRecords).length} groups
              </span>
              {hasNextPage && (
                <button
                  onClick={onLoadMore}
                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
                >
                  Load next 50 →
                </button>
              )}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Grouped by {columns.find(col => col.key === groupByColumn)?.label}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render regular table
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Filter Toggle Button */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {(() => {
            const activeFilterCount = Object.entries(columnFilters).filter(([key, value]) => {
              if (Array.isArray(value)) {
                return value.length > 0;
              }
              return value && value.trim() !== '';
            }).length;
            
            return activeFilterCount > 0 && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium mr-2">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </span>
            );
          })()}
          Showing {filteredAndSortedRecords.length} of {records.length} records
          {hiddenColumns.length > 0 && (
            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium ml-2">
              {hiddenColumns.length} column{hiddenColumns.length !== 1 ? 's' : ''} hidden
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowColumnToggle(!showColumnToggle)}
              className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            >
              <ChevronDown className="w-4 h-4" />
              Columns
            </button>
            {showColumnToggle && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-64 max-h-80 overflow-hidden">
                <div className="p-2 border-b border-gray-200 bg-gray-50">
                  <span className="text-sm font-medium text-gray-700">Show/Hide Columns</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {columns.map((column) => (
                    <label
                      key={column.key}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.includes(column.key)}
                        onChange={() => toggleColumnVisibility(column.key)}
                        className="mr-2 rounded"
                      />
                      <span className="flex-1 truncate" title={column.label}>
                        {column.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => onFiltersChange({})}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
            Clear All Filters
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full table-resizable">
        <thead className="bg-gray-50">
          <tr>
            {orderedColumns.map((col) => (
              <th 
                key={col.key}
                draggable
                onDragStart={(e) => handleDragStart(e, col.key)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors select-none relative ${draggedColumn === col.key ? 'opacity-50' : ''}`}
                style={{ 
                  width: columnWidths[col.key] || col.width || 'auto',
                  minWidth: '50px'
                }}
                title={`Drag to reorder columns.`}
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center space-x-1 cursor-pointer flex-1"
                    onClick={() => handleSort(col.key)}
                    title={`Sort by ${col.label}`}
                  >
                    <span>{col.label}</span>
                    {sortColumn === col.key && (
                      <span className="text-blue-500">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                    {sortColumn !== col.key && (
                      <span className="text-gray-300 opacity-0 group-hover:opacity-100">
                        ↑↓
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {/* Filter dropdown */}
                    <ColumnFilterDropdown
                      column={col}
                      records={records}
                      filters={columnFilters}
                      onFiltersChange={onFiltersChange}
                    />
                    
                    {/* Drag indicator */}
                    <div className="opacity-30 hover:opacity-60 transition-opacity cursor-move">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <circle cx="3" cy="3" r="1"/>
                        <circle cx="9" cy="3" r="1"/>
                        <circle cx="3" cy="9" r="1"/>
                        <circle cx="9" cy="9" r="1"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Column resize handle */}
                <div
                  className="column-resize-handle"
                  onMouseDown={(e) => handleResizeMouseDown(e, col.key)}
                  title="Drag to resize column"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredAndSortedRecords.map((record, index) => (
            <tr key={record.id || index} className="hover:bg-gray-50 transition-colors">
              {orderedColumns.map((col) => (
                <td 
                  key={col.key} 
                  className="px-4 py-3 text-sm"
                  style={{ 
                    width: columnWidths[col.key] || col.width || 'auto',
                    minWidth: '50px'
                  }}
                >
                  {getDisplayValue(record, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {records.length > 0 && (
        <div className="bg-gray-50 px-4 py-2 text-center text-sm text-gray-600">
          <div className="flex justify-center items-center space-x-4">
            <span>
              Showing {((currentPage - 1) * 50) + 1}-{Math.min(currentPage * 50, totalRecords)} of {totalRecords} records
            </span>
            {hasNextPage && (
              <button
                onClick={onLoadMore}
                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
              >
                Load next 50 →
              </button>
            )}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Use AI commands to filter or search for specific data
          </div>
        </div>
      )}
      </div>
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
      { key: 'name', label: 'Company Name', width: 'w-48', clickable: true },
      { key: 'company_type_id', label: 'Type', width: 'w-32' },
      { key: 'contacts', label: 'Contacts', width: 'w-48' },
      { key: 'country', label: 'Country', width: 'w-24' },
      { key: 'source', label: 'Source', width: 'w-28' },
      { key: 'priority', label: 'Priority', width: 'w-24' },
      { key: 'last_chat', label: 'Last Chat', width: 'w-32' },
      { key: 'status', label: 'Status', width: 'w-24' },
      { key: 'comments', label: 'Comments', width: 'w-64' },
      { key: 'updated_at', label: 'Last Updated', width: 'w-32' },
    ],
    orderBy: 'updated_at',
    orderDirection: 'desc',
    customQuery: true
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
      { key: 'linkedin_url', label: 'LinkedIn', width: 'w-40' },
      { key: 'source', label: 'Source', width: 'w-28' },
      { key: 'priority', label: 'Priority', width: 'w-24' },
      { key: 'last_chat', label: 'Last Chat', width: 'w-32' },
      { key: 'contact_status', label: 'Status', width: 'w-24' },
      { key: 'comments', label: 'Comments', width: 'w-64' },
      { key: 'updated_at', label: 'Last Updated', width: 'w-32' },
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
      { key: 'updated_at', label: 'Last Updated', width: 'w-32' },
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
      { key: 'updated_at', label: 'Last Updated', width: 'w-32' },
    ],
    orderBy: 'created_at',
    orderDirection: 'desc',
    customQuery: true
  },
};

// Editable Text Field Component
const EditableTextField = ({ currentValue, recordId, tableName, fieldName, onUpdate, onMessageLog, placeholder = "Add comment..." }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentValue || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const textareaRef = useRef(null);

  // Update local value when prop changes
  useEffect(() => {
    setValue(currentValue || '');
  }, [currentValue]);

  // Focus and select text when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (value === (currentValue || '')) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      const displayValue = value.trim() || 'empty';
      onMessageLog?.(`Updating ${fieldName} to "${displayValue}"...`, 'info');
      
      const { error } = await supabaseService.supabase
        .from(tableName)
        .update({ [fieldName]: value.trim() || null })
        .eq('id', recordId);

      if (error) throw error;

      onMessageLog?.(`✓ Successfully updated ${fieldName}`, 'success');
      onUpdate?.(); // Refresh the data
    } catch (error) {
      console.error(`Failed to update ${fieldName}:`, error);
      onMessageLog?.(`✗ Failed to update ${fieldName}: ${error.message}`, 'error');
      setValue(currentValue || ''); // Reset to original value
    } finally {
      setIsUpdating(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setValue(currentValue || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="relative max-w-xs">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isUpdating}
          className="w-full p-2 text-sm border border-blue-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder={placeholder}
        />
        <div className="flex gap-1 mt-1">
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            title="Ctrl+Enter to save"
          >
            {isUpdating ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isUpdating}
            className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
            title="Escape to cancel"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="max-w-xs cursor-pointer group"
      title="Click to edit"
    >
      {currentValue ? (
        <div className="text-sm text-gray-700 p-1 rounded group-hover:bg-gray-50 border border-transparent group-hover:border-gray-200">
          {currentValue.length > 60 ? `${currentValue.substring(0, 60)}...` : currentValue}
        </div>
      ) : (
        <div className="text-sm text-gray-400 italic p-1 rounded group-hover:bg-gray-50 border border-dashed border-transparent group-hover:border-gray-300">
          {placeholder}
        </div>
      )}
    </div>
  );
};

// Company Type Dropdown Component
const CompanyTypeDropdown = ({ currentTypeId, companyId, onUpdate, onMessageLog }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const companyTypes = {
    1: 'Other',
    2: 'Customer (Bank)',
    3: 'Channel Partner',
    4: 'Customer (NeoBank)',
    5: 'Investor',
    6: 'Customer (Software provider)',
    7: 'Customer (Payments)'
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.company-type-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleTypeChange = async (newTypeId) => {
    if (newTypeId === currentTypeId) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      onMessageLog?.(`Updating company ${companyId} type to ${companyTypes[newTypeId]}...`, 'info');
      
      const { error } = await supabaseService.supabase
        .from('companies')
        .update({ company_type_id: newTypeId })
        .eq('id', companyId);

      if (error) throw error;

      onMessageLog?.(`✓ Successfully updated company type to ${companyTypes[newTypeId]}`, 'success');
      onUpdate?.(); // Refresh the data
    } catch (error) {
      console.error('Failed to update company type:', error);
      onMessageLog?.(`✗ Failed to update company type: ${error.message}`, 'error');
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  const getTypeColor = (typeId) => {
    const colors = {
      1: 'bg-gray-100 text-gray-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-green-100 text-green-800',
      4: 'bg-purple-100 text-purple-800',
      5: 'bg-orange-100 text-orange-800',
      6: 'bg-teal-100 text-teal-800',
      7: 'bg-pink-100 text-pink-800'
    };
    return colors[typeId] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="relative company-type-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 ${getTypeColor(currentTypeId)} ${
          isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'
        }`}
        title="Click to change company type"
      >
        {isUpdating ? 'Updating...' : (companyTypes[currentTypeId] || `Type #${currentTypeId}`)}
        <span className="ml-1 text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48">
          {Object.entries(companyTypes).map(([typeId, typeName]) => (
            <button
              key={typeId}
              onClick={() => handleTypeChange(parseInt(typeId))}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                parseInt(typeId) === currentTypeId ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700'
              }`}
            >
              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${getTypeColor(parseInt(typeId)).replace('text-', 'bg-').replace('bg-', 'bg-').split(' ')[0]}`}></span>
              {typeName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Priority Dropdown Component
const PriorityDropdown = ({ currentPriority, companyId, companyTypeId, country, onUpdate, onMessageLog }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const priorities = {
    0: 'Top',
    1: 'High',
    2: 'Medium', 
    3: 'Low'
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.priority-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Get suggested priority based on company type and country
  const getSuggestedPriority = () => {
    const companyTypes = {
      1: 'Other',
      2: 'Customer (Bank)',
      3: 'Channel Partner',
      4: 'Customer (NeoBank)',
      5: 'Investor',
      6: 'Customer (Software provider)',
      7: 'Customer (Payments)'
    };

    const typeName = companyTypes[companyTypeId];
    const isIsrael = country === 'Israel';

    // Israeli banks -> Low (3)
    if (typeName === 'Customer (Bank)' && isIsrael) return 3;
    
    // Channel partners -> Medium (2)
    if (typeName === 'Channel Partner') return 2;
    
    // Investors -> Low (3)
    if (typeName === 'Investor') return 3;
    
    // Customer (NeoBank) -> Medium (2)
    if (typeName === 'Customer (NeoBank)') return 2;
    
    // Banks not in Israel -> High (1)
    if (typeName === 'Customer (Bank)' && !isIsrael) return 1;
    
    // Rest -> null (empty)
    return null;
  };

  const handlePriorityChange = async (newPriority) => {
    if (newPriority === currentPriority) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      const priorityText = newPriority ? priorities[newPriority] : 'None';
      onMessageLog?.(`Updating company ${companyId} priority to ${priorityText}...`, 'info');
      
      const { error } = await supabaseService.supabase
        .from('companies')
        .update({ priority: newPriority })
        .eq('id', companyId);

      if (error) throw error;

      onMessageLog?.(`✓ Successfully updated priority to ${priorityText}`, 'success');
      onUpdate?.(); // Refresh the data
    } catch (error) {
      console.error('Failed to update priority:', error);
      onMessageLog?.(`✗ Failed to update priority: ${error.message}`, 'error');
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      0: 'bg-purple-100 text-purple-800',   // Top
      1: 'bg-red-100 text-red-800',        // High
      2: 'bg-yellow-100 text-yellow-800',  // Medium
      3: 'bg-green-100 text-green-800'     // Low
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const suggestedPriority = getSuggestedPriority();
  const displayPriority = currentPriority || suggestedPriority;
  const displayText = displayPriority ? priorities[displayPriority] : null;

  return (
    <div className="relative priority-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 ${
          displayPriority ? getPriorityColor(displayPriority) : 'bg-gray-50 text-gray-400 border border-dashed'
        } ${
          isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'
        }`}
        title={`Click to change priority${suggestedPriority && !currentPriority ? ` (suggested: ${priorities[suggestedPriority]})` : ''}`}
      >
        {isUpdating ? 'Updating...' : (displayText || '—')}
        {suggestedPriority && !currentPriority && (
          <span className="ml-1 text-xs opacity-60">(suggested)</span>
        )}
        <span className="ml-1 text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-32">
          <button
            onClick={() => handlePriorityChange(null)}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg ${
              !currentPriority ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700'
            }`}
          >
            <span className="inline-block w-3 h-3 rounded-full mr-2 bg-gray-200"></span>
            None
          </button>
          {Object.entries(priorities).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handlePriorityChange(parseInt(key))}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 last:rounded-b-lg ${
                parseInt(key) === currentPriority ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700'
              } ${parseInt(key) === suggestedPriority && !currentPriority ? 'bg-yellow-50 border-l-2 border-yellow-400' : ''}`}
            >
              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${getPriorityColor(parseInt(key)).replace('text-', 'bg-').replace('bg-', 'bg-').split(' ')[0]}`}></span>
              {label}
              {parseInt(key) === suggestedPriority && !currentPriority && (
                <span className="ml-2 text-xs text-yellow-600">(suggested)</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Connection Status Dropdown Component
const ConnectionStatusDropdown = ({ currentStatus, contactId, onUpdate, onMessageLog }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const statusOptions = {
    'connected': { label: 'Connected', emoji: '✅', color: 'bg-green-100 text-green-800' },
    'not_connected': { label: 'Not Connected', emoji: '❌', color: 'bg-red-100 text-red-800' },
    'unknown': { label: 'Unknown', emoji: '❓', color: 'bg-gray-100 text-gray-800' },
    'sent_message_no_response': { label: 'Message Sent (No Response)', emoji: '📩', color: 'bg-orange-100 text-orange-800' }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.connection-status-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      onMessageLog?.(`Updating LinkedIn connection status to ${statusOptions[newStatus].label}...`, 'info');
      
      await linkedinService.updateConnectionStatus(contactId, newStatus);

      onMessageLog?.(`✓ Successfully updated LinkedIn connection status to ${statusOptions[newStatus].label}`, 'success');
      onUpdate?.(); // Refresh the data
    } catch (error) {
      console.error('Failed to update connection status:', error);
      onMessageLog?.(`✗ Failed to update connection status: ${error.message}`, 'error');
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  const currentOption = statusOptions[currentStatus] || statusOptions['unknown'];

  return (
    <div className="relative connection-status-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 ${currentOption.color} ${
          isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'
        }`}
        title={`Click to change LinkedIn connection status - Current: ${currentOption.label}`}
      >
        <span className="mr-1">{currentOption.emoji}</span>
        {isUpdating ? 'Updating...' : currentOption.label}
        <span className="ml-1 text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-56">
          {Object.entries(statusOptions).map(([statusKey, option]) => (
            <button
              key={statusKey}
              onClick={() => handleStatusChange(statusKey)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                statusKey === currentStatus ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700'
              }`}
            >
              <span className="mr-2">{option.emoji}</span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Status Dropdown Component
const StatusDropdown = ({ currentStatus, companyId, onUpdate, onMessageLog }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const statusOptions = {
    'Active': { label: 'Active', color: 'bg-green-100 text-green-800' },
    'Inactive': { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
    'Pending': { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    'Prospect': { label: 'Prospect', color: 'bg-blue-100 text-blue-800' },
    'Lead': { label: 'Lead', color: 'bg-purple-100 text-purple-800' },
    'Qualified': { label: 'Qualified', color: 'bg-teal-100 text-teal-800' },
    'Disqualified': { label: 'Disqualified', color: 'bg-red-100 text-red-800' },
    'Lost': { label: 'Lost', color: 'bg-orange-100 text-orange-800' },
    'Proposal': { label: 'Proposal', color: 'bg-indigo-100 text-indigo-800' }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.status-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      const statusText = newStatus || 'None';
      onMessageLog?.(`Updating company ${companyId} status to ${statusText}...`, 'info');
      
      const { error } = await supabaseService.supabase
        .from('companies')
        .update({ status: newStatus })
        .eq('id', companyId);

      if (error) throw error;

      onMessageLog?.(`✓ Successfully updated status to ${statusText}`, 'success');
      onUpdate?.(); // Refresh the data
    } catch (error) {
      console.error('Failed to update status:', error);
      onMessageLog?.(`✗ Failed to update status: ${error.message}`, 'error');
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  const currentOption = statusOptions[currentStatus] || { label: currentStatus || 'None', color: 'bg-gray-100 text-gray-800' };

  return (
    <div className="relative status-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 ${
          currentStatus ? currentOption.color : 'bg-gray-50 text-gray-400 border border-dashed'
        } ${
          isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'
        }`}
        title="Click to change status"
      >
        {isUpdating ? 'Updating...' : currentOption.label}
        <span className="ml-1 text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-32">
          <button
            onClick={() => handleStatusChange(null)}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg ${
              !currentStatus ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700'
            }`}
          >
            <span className="inline-block w-3 h-3 rounded-full mr-2 bg-gray-200"></span>
            None
          </button>
          {Object.entries(statusOptions).map(([statusKey, option]) => (
            <button
              key={statusKey}
              onClick={() => handleStatusChange(statusKey)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 last:rounded-b-lg ${
                statusKey === currentStatus ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700'
              }`}
            >
              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${option.color.replace('text-', 'bg-').replace('bg-', 'bg-').split(' ')[0]}`}></span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [groupByColumn, setGroupByColumn] = useState(null);
  const [isFindingLastChat, setIsFindingLastChat] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const [isFindingLinkedIn, setIsFindingLinkedIn] = useState(false);

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

  const fetchData = useCallback(async (tableName, page = 1, append = false) => {
    if (!isConfigLoaded || !supabaseService.isConnected()) return;
    setIsLoading(true);
    setError(null);
    try {
      onMessageLog?.(`Loading ${tableName} from Supabase (page ${page})...`, 'info');
      
      const config = TABLE_CONFIG[tableName];
      const limit = 50;
      const offset = (page - 1) * limit;
      
      let query;
      let countQuery;
      
      // Handle special queries for tables that need JOINs
      if (tableName === 'companies') {
        query = supabaseService.supabase
          .from('companies')
          .select(`
            id,
            name,
            company_type_id,
            country,
            source,
            priority,
            last_chat,
            status,
            comments,
            created_at,
            updated_at,
            contacts(id, name, email)
          `);
        
        // Count query for pagination
        countQuery = supabaseService.supabase
          .from('companies')
          .select('id', { count: 'exact', head: true });
      } else if (tableName === 'contacts') {
        query = supabaseService.supabase
          .from('contacts')
          .select(`
            id,
            name,
            email,
            title,
            contact_status,
            source,
            priority,
            last_chat,
            comments,
            created_at,
            updated_at,
            linkedin_url,
            linkedin_connection_status,
            companies!inner(name)
          `);
        
        // Count query for pagination
        countQuery = supabaseService.supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true });
        
        // Apply search filter if set
        if (contactSearchFilter) {
          const filterCondition = `name.ilike.%${contactSearchFilter}%,email.ilike.%${contactSearchFilter}%`;
          query = query.or(filterCondition);
          countQuery = countQuery.or(filterCondition);
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
            created_at,
            updated_at
          `);
        countQuery = supabaseService.supabase
          .from('activities')
          .select('id', { count: 'exact', head: true });
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
            updated_at,
            contact_context
          `);
        countQuery = supabaseService.supabase
          .from('triage_results')
          .select('id', { count: 'exact', head: true });
      } else {
        query = supabaseService.supabase.from(tableName).select('*');
        countQuery = supabaseService.supabase
          .from(tableName)
          .select('id', { count: 'exact', head: true });
      }
      
      // Apply ordering
      if (config.orderBy) {
        query = query.order(config.orderBy, { ascending: config.orderDirection === 'asc' });
      }
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1);
      
      // Execute both queries in parallel
      const [{ data, error }, { count, error: countError }] = await Promise.all([
        query,
        countQuery
      ]);
      
      if (error) throw error;
      if (countError) throw countError;
      
      // Transform data for tables with JOINs to flatten related names
      let transformedData = data || [];
      if (tableName === 'companies') {
        transformedData = data.map(company => ({
          ...company,
          contacts: company.contacts?.map(c => c.name).join(', ') || 'No contacts'
        }));
      } else if (tableName === 'contacts') {
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
      
      // Update pagination state
      setCurrentPage(page);
      setTotalRecords(count || 0);
      setHasNextPage((count || 0) > page * limit);
      
      // Either append to existing records or replace them
      if (append && page > 1) {
        setRecords(prev => [...prev, ...transformedData]);
      } else {
        setRecords(transformedData);
      }
      
      onMessageLog?.(`Loaded ${transformedData?.length || 0} records from ${tableName} (page ${page}, total: ${count || 0})`, 'success');
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
      setCurrentPage(1);
      setHasNextPage(false);
      setTotalRecords(0);
      fetchData(currentView, 1);
    }
  }, [currentView, fetchData, isConfigLoaded]);
  
  const handleViewChange = (newView) => {
    setCurrentView(newView);
    setContactSearchFilter(''); // Clear any search filters
    setColumnFilters({}); // Clear column filters when switching tables
    setCleanupSuggestions(null); // Clear cleanup suggestions when switching tables
    setGroupByColumn(null); // Clear grouping when switching tables
    setCurrentPage(1);
    setHasNextPage(false);
    setTotalRecords(0);
    fetchData(newView, 1);
  };

  const handleCommandExecuted = () => {
    // Refresh the current view after a command is executed
    setCurrentPage(1);
    setHasNextPage(false);
    setTotalRecords(0);
    fetchData(currentView, 1);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isLoading) {
      fetchData(currentView, currentPage + 1, true);
    }
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
      setCurrentPage(1);
      setHasNextPage(false);
      setTotalRecords(0);
      await fetchData(currentView, 1);
      
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
      await fetchData(currentView, 1, false);
      
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
      await fetchData(currentView, 1, false);
      
      const message = `🎉 LinkedIn search complete! Found ${results.found} profiles out of ${results.total} contacts (${results.skipped} skipped, ${results.errors} errors)`;
      
      onMessageLog?.(message, 'success');
      
    } catch (error) {
      console.error('Error finding LinkedIn profiles:', error);
      onMessageLog?.(`❌ Failed to find LinkedIn profiles: ${error.message}`, 'error');
    } finally {
      setIsFindingLinkedIn(false);
    }
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
        <div className="flex items-center space-x-2">
          {/* Group By Dropdown */}
          <div className="relative">
            <select
              value={groupByColumn || ''}
              onChange={(e) => setGroupByColumn(e.target.value || null)}
              className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              title="Group records by column"
            >
              <option value="">No Grouping</option>
              {TABLE_CONFIG[currentView].columns
                .filter(col => ['country', 'company_type_id', 'status', 'priority', 'source', 'contact_status'].includes(col.key))
                .map(col => (
                  <option key={col.key} value={col.key}>
                    Group by {col.label}
                  </option>
                ))
              }
            </select>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={() => {
              setCurrentPage(1);
              setHasNextPage(false);
              setTotalRecords(0);
              fetchData(currentView, 1);
            }}
            disabled={isLoading}
            className="bg-white border border-gray-200 text-gray-700 p-2 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 flex items-center transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
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
                    setCurrentPage(1);
                    setHasNextPage(false);
                    setTotalRecords(0);
                    fetchData('contacts', 1);
                  }}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                >
                  Clear Filter
                </button>
              </div>
            )}
            {columnFilters && Object.keys(columnFilters).length > 0 && (
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm text-green-600">Column filters active:</span>
                {Object.entries(columnFilters).map(([columnKey, filterValues]) => {
                  if (!filterValues || filterValues.length === 0) return null;
                  const column = TABLE_CONFIG[currentView].columns.find(col => col.key === columnKey);
                  const columnLabel = column?.label || columnKey;
                  return (
                    <div key={columnKey} className="flex items-center gap-1">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {columnLabel}: {filterValues.length} selected
                      </span>
                      <button
                        onClick={() => {
                          const newFilters = { ...columnFilters };
                          delete newFilters[columnKey];
                          setColumnFilters(newFilters);
                        }}
                        className="text-xs text-green-600 hover:text-green-800"
                        title={`Clear ${columnLabel} filter`}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={() => {
                    setColumnFilters({});
                    setCurrentPage(1);
                    setHasNextPage(false);
                    setTotalRecords(0);
                    fetchData(currentView, 1);
                  }}
                  className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Find Last Chat Button - Only for Contacts */}
            {currentView === 'contacts' && (
              <button
                onClick={handleFindLastChat}
                disabled={isFindingLastChat || isLoading || !records || records.length === 0}
                className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed text-sm font-medium"
                title="Find last chat dates by searching Gmail correspondence"
              >
                <Search className={`h-4 w-4 ${isFindingLastChat ? 'animate-spin' : ''}`} />
                {isFindingLastChat ? 'Searching Gmail...' : 'Find Last Chat (Gmail)'}
              </button>
            )}
            
            {/* Find LinkedIn Profiles Button - Only for Contacts */}
            {currentView === 'contacts' && (
              <button
                onClick={handleFindLinkedIn}
                disabled={isFindingLinkedIn || isLoading || !records || records.length === 0}
                className="flex items-center gap-2 bg-blue-800 text-white px-3 py-2 rounded-lg hover:bg-blue-900 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed text-sm font-medium"
                title="Search for LinkedIn profiles for all contacts"
              >
                <Linkedin className={`h-4 w-4 ${isFindingLinkedIn ? 'animate-spin' : ''}`} />
                {isFindingLinkedIn ? 'Searching LinkedIn...' : 'Find LinkedIn Profiles'}
              </button>
            )}
            
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
        </div>
        <p className="text-sm text-gray-600 mt-1">{TABLE_CONFIG[currentView].description}</p>
      </div>
      
      {/* Data Table */}
      <DataTable 
        records={records}
        columns={TABLE_CONFIG[currentView].columns}
        isLoading={isLoading}
        tableName={currentView}
        currentPage={currentPage}
        hasNextPage={hasNextPage}
        totalRecords={totalRecords}
        onLoadMore={handleLoadMore}
        onMessageLog={onMessageLog}
        onUpdate={() => fetchData(currentView, 1)}
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