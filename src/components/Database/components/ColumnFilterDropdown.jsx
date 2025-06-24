import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';

export const ColumnFilterDropdown = ({ column, records, filters, onFiltersChange }) => {
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