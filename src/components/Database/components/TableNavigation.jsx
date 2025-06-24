import React from 'react';
import { RefreshCw, Search, Linkedin } from 'lucide-react';
import { CleanupIcon } from '../../shared/Icons';
import { TABLE_CONFIG } from '../config/tableConfig';

export const TableNavigation = ({
  currentView,
  onViewChange,
  groupByColumn,
  onGroupByChange,
  onRefresh,
  onSuggestCleanup,
  onFindLastChat,
  onFindLinkedIn,
  isLoading,
  isAnalyzing,
  isFindingLastChat,
  isFindingLinkedIn,
  hasRecords,
  contactSearchFilter,
  onClearContactFilter,
  columnFilters,
  onClearAllFilters
}) => {
  return (
    <>
      {/* Table Navigation Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Object.entries(TABLE_CONFIG).map(([view, config]) => {
            const IconComponent = config.icon;
            return (
              <button
                key={view}
                onClick={() => onViewChange(view)}
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
              onChange={(e) => onGroupByChange(e.target.value || null)}
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
            onClick={onRefresh}
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
                  onClick={onClearContactFilter}
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
                          onClearAllFilters({ ...newFilters });
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
                  onClick={() => onClearAllFilters({})}
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
                onClick={onFindLastChat}
                disabled={isFindingLastChat || isLoading || !hasRecords}
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
                onClick={onFindLinkedIn}
                disabled={isFindingLinkedIn || isLoading || !hasRecords}
                className="flex items-center gap-2 bg-blue-800 text-white px-3 py-2 rounded-lg hover:bg-blue-900 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed text-sm font-medium"
                title="Search for LinkedIn profiles for all contacts"
              >
                <Linkedin className={`h-4 w-4 ${isFindingLinkedIn ? 'animate-spin' : ''}`} />
                {isFindingLinkedIn ? 'Searching LinkedIn...' : 'Find LinkedIn Profiles'}
              </button>
            )}
            
            {/* Suggest Cleanup Button */}
            <button
              onClick={onSuggestCleanup}
              disabled={isAnalyzing || isLoading || !hasRecords}
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
    </>
  );
};