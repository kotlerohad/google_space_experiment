import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, X, GripVertical } from 'lucide-react';
import { ColumnFilterDropdown } from './ColumnFilterDropdown';
import { getDisplayValue } from '../utils/displayUtils';
import supabaseService from '../../../services/supabaseService';

export const DataTable = ({ 
  records, 
  columns, 
  isLoading, 
  tableName, 
  currentPage, 
  hasNextPage, 
  totalRecords, 
  onLoadMore, 
  onMessageLog, 
  onUpdate, 
  groupByColumn, 
  columnFilters, 
  onFiltersChange 
}) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [columnOrder, setColumnOrder] = useState([]);
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [columnWidths, setColumnWidths] = useState({});
  
  // Group ordering state
  const [groupOrdering, setGroupOrdering] = useState({});
  const [draggedGroup, setDraggedGroup] = useState(null);
  const [isLoadingGroupOrder, setIsLoadingGroupOrder] = useState(false);

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

  // Load group ordering when groupByColumn changes
  useEffect(() => {
    if (groupByColumn && supabaseService.isConnected()) {
      loadGroupOrdering();
    } else {
      setGroupOrdering({});
    }
  }, [groupByColumn, tableName]);

  // Load group ordering from database
  const loadGroupOrdering = async () => {
    if (!groupByColumn || !supabaseService.isConnected()) return;
    
    setIsLoadingGroupOrder(true);
    try {
      const ordering = await supabaseService.getGroupOrdering(tableName, groupByColumn);
      setGroupOrdering(ordering);
    } catch (error) {
      console.error('Failed to load group ordering:', error);
      setGroupOrdering({});
    } finally {
      setIsLoadingGroupOrder(false);
    }
  };

  // Save group ordering to database
  const saveGroupOrdering = async (orderedGroups) => {
    if (!groupByColumn || !supabaseService.isConnected()) return;
    
    try {
      await supabaseService.saveGroupOrdering(tableName, groupByColumn, orderedGroups);
      onMessageLog?.(`✅ Group order saved successfully`, 'success');
    } catch (error) {
      console.error('Failed to save group ordering:', error);
      onMessageLog?.(`❌ Failed to save group order: ${error.message}`, 'error');
    }
  };

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
    
    const startX = e.clientX;
    const startWidth = columnWidths[columnKey] || 150; // Default width
    
    const handleMouseMove = (e) => {
      const newWidth = Math.max(50, startWidth + (e.clientX - startX)); // Minimum width of 50px
      handleColumnResize(columnKey, newWidth);
    };
    
    const handleMouseUp = () => {
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

  // Group drag and drop handlers
  const handleGroupDragStart = (e, groupValue) => {
    setDraggedGroup(groupValue);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', groupValue);
  };

  const handleGroupDragEnd = (e) => {
    setDraggedGroup(null);
  };

  const handleGroupDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleGroupDrop = async (e, targetGroupValue) => {
    e.preventDefault();
    
    if (!draggedGroup || draggedGroup === targetGroupValue) {
      return;
    }

    // Get current group order
    const groupEntries = Object.entries(getGroupedRecords() || {});
    const currentOrder = groupEntries.map(([groupValue]) => groupValue);
    
    // Apply saved ordering to current order
    const orderedGroups = getOrderedGroups(currentOrder);
    
    // Find indices
    const draggedIndex = orderedGroups.indexOf(draggedGroup);
    const targetIndex = orderedGroups.indexOf(targetGroupValue);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Reorder groups
    const newOrder = [...orderedGroups];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedGroup);
    
    // Create new ordering object
    const newOrdering = {};
    newOrder.forEach((groupValue, index) => {
      newOrdering[groupValue] = index + 1;
    });
    
    // Update state and save to database
    setGroupOrdering(newOrdering);
    await saveGroupOrdering(newOrder);
    
    setDraggedGroup(null);
  };

  // Apply filters first, then sort
  const filteredAndSortedRecords = useMemo(() => {
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

  // Get sorted records for grouping
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

  // Get groups in the correct order based on saved ordering
  const getOrderedGroups = (groupValues) => {
    if (!groupOrdering || Object.keys(groupOrdering).length === 0) {
      return groupValues; // Return original order if no custom ordering
    }
    
    // Sort groups based on saved ordering
    return [...groupValues].sort((a, b) => {
      const orderA = groupOrdering[a] || 999; // Groups not in ordering go to end
      const orderB = groupOrdering[b] || 999;
      return orderA - orderB;
    });
  };

  const groupedRecords = getGroupedRecords();
  const orderedColumns = getOrderedColumns();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" role="progressbar"></div>
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

  if (groupedRecords) {
    // Get ordered group entries
    const groupEntries = Object.entries(groupedRecords);
    const groupValues = groupEntries.map(([groupValue]) => groupValue);
    const orderedGroupValues = getOrderedGroups(groupValues);
    const orderedGroupEntries = orderedGroupValues.map(groupValue => [groupValue, groupedRecords[groupValue]]);
    
    // Render grouped tables
    return (
      <div className="space-y-6">
        {orderedGroupEntries.map(([groupValue, groupRecords]) => (
          <div key={groupValue} className="bg-white rounded-lg border border-gray-200">
            {/* Group Header */}
            <div 
              className={`bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-gray-200 rounded-t-lg cursor-move ${draggedGroup === groupValue ? 'opacity-50' : ''}`}
              draggable
              onDragStart={(e) => handleGroupDragStart(e, groupValue)}
              onDragEnd={handleGroupDragEnd}
              onDragOver={handleGroupDragOver}
              onDrop={(e) => handleGroupDrop(e, groupValue)}
              title="Drag to reorder groups"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <GripVertical className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {groupByColumn && (
                      <span className="text-sm font-medium text-gray-600 uppercase tracking-wider mr-2">
                        {columns.find(col => col.key === groupByColumn)?.label}:
                      </span>
                    )}
                    <span className="text-blue-800">{groupValue}</span>
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  {isLoadingGroupOrder && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                  )}
                  <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    {groupRecords.length} {groupRecords.length === 1 ? 'record' : 'records'}
                  </span>
                </div>
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
                          {getDisplayValue(record, col, tableName, groupByColumn, onUpdate, onMessageLog)}
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
                Total: {records.length} records in {orderedGroupEntries.length} groups
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
            <div className="mt-1 flex justify-center items-center space-x-4">
              <span className="text-xs text-gray-500">
                Grouped by {columns.find(col => col.key === groupByColumn)?.label} • Drag groups to reorder
              </span>
              {Object.keys(groupOrdering).length > 0 && (
                <button
                  onClick={async () => {
                    await supabaseService.clearGroupOrdering(tableName, groupByColumn);
                    setGroupOrdering({});
                    onMessageLog?.('✅ Group order reset to default', 'success');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  title="Reset group order to default"
                >
                  Reset Order
                </button>
              )}
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
                  {getDisplayValue(record, col, tableName, groupByColumn, onUpdate, onMessageLog)}
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