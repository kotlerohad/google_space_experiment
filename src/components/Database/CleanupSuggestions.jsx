import React, { useState } from 'react';
import { CheckIcon, XIcon, CleanupIcon, MergeIcon, WarningIcon, DatabaseIcon } from '../shared/Icons';

const CleanupSuggestions = ({ suggestions, onApprove, onReject, onMessageLog }) => {
  const [approvedSuggestions, setApprovedSuggestions] = useState(new Set());
  const [rejectedSuggestions, setRejectedSuggestions] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  if (!suggestions || !suggestions.cleanup_suggestions?.length) {
    return null;
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'merge_duplicates': return <MergeIcon className="h-4 w-4" />;
      case 'fix_inconsistency': return <CleanupIcon className="h-4 w-4" />;
      case 'add_missing_relationship': return <DatabaseIcon className="h-4 w-4" />;
      case 'update_incomplete_data': return <CleanupIcon className="h-4 w-4" />;
      case 'remove_orphaned_data': return <WarningIcon className="h-4 w-4" />;
      case 'standardize_format': return <CleanupIcon className="h-4 w-4" />;
      default: return <CleanupIcon className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'merge_duplicates': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'fix_inconsistency': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'add_missing_relationship': return 'bg-green-50 border-green-200 text-green-800';
      case 'update_incomplete_data': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'remove_orphaned_data': return 'bg-red-50 border-red-200 text-red-800';
      case 'standardize_format': return 'bg-indigo-50 border-indigo-200 text-indigo-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleApprove = async (suggestion, index) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      await onApprove(suggestion);
      setApprovedSuggestions(prev => new Set([...prev, index]));
      onMessageLog?.(`Cleanup suggestion approved: ${suggestion.description}`, 'success');
    } catch (error) {
      onMessageLog?.(`Failed to approve cleanup: ${error.message}`, 'error');
      console.error('Failed to approve cleanup suggestion:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = (index, description) => {
    setRejectedSuggestions(prev => new Set([...prev, index]));
    onMessageLog?.(`Cleanup suggestion rejected: ${description}`, 'info');
    onReject?.(index);
  };

  return (
    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <CleanupIcon className="h-5 w-5 text-orange-600" />
        <h4 className="font-medium text-orange-800">Database Cleanup Suggestions</h4>
        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
          {suggestions.total_issues || suggestions.cleanup_suggestions.length} Issues Found
        </span>
      </div>
      
      {suggestions.analysis_summary && (
        <div className="mb-4 p-3 bg-orange-100 border border-orange-200 rounded">
          <p className="text-sm text-orange-800 font-medium">Analysis Summary:</p>
          <p className="text-sm text-orange-700">{suggestions.analysis_summary}</p>
        </div>
      )}
      
      <div className="space-y-3">
        {suggestions.cleanup_suggestions.map((suggestion, index) => {
          const isApproved = approvedSuggestions.has(index);
          const isRejected = rejectedSuggestions.has(index);
          
          return (
            <div
              key={index}
              className={`p-3 border rounded-lg ${getTypeColor(suggestion.type)} ${
                isApproved ? 'opacity-75 bg-green-100 border-green-300' :
                isRejected ? 'opacity-50 bg-gray-100 border-gray-300' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2 flex-1">
                  {getTypeIcon(suggestion.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium uppercase tracking-wide">
                        {suggestion.type.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(suggestion.priority)}`}>
                        {suggestion.priority} priority
                      </span>
                      {isApproved && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          ✓ Approved
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          ✗ Rejected
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm font-medium mb-2">{suggestion.description}</p>
                    
                    {suggestion.affected_records && suggestion.affected_records.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-600 font-medium">Affected Records:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {suggestion.affected_records.map((record, recordIndex) => (
                            <span key={recordIndex} className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded border">
                              {record}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {suggestion.operations && suggestion.operations.length > 0 && (
                      <div className="text-xs bg-white bg-opacity-50 p-2 rounded border">
                        <strong>Operations ({suggestion.operations.length}):</strong>
                        <div className="mt-1 space-y-1">
                          {suggestion.operations.map((op, opIndex) => (
                            <div key={opIndex} className="font-mono text-xs">
                              {op.action.toUpperCase()} {op.table}
                              {op.where && ` WHERE ${JSON.stringify(op.where)}`}
                              {op.payload && ` SET ${JSON.stringify(op.payload)}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {!isApproved && !isRejected && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleApprove(suggestion, index)}
                      disabled={isProcessing}
                      className="bg-green-600 text-white p-1.5 rounded hover:bg-green-700 transition-colors disabled:bg-green-300"
                      title="Approve and execute cleanup"
                    >
                      <CheckIcon className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleReject(index, suggestion.description)}
                      disabled={isProcessing}
                      className="bg-red-600 text-white p-1.5 rounded hover:bg-red-700 transition-colors disabled:bg-red-300"
                      title="Reject suggestion"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 pt-3 border-t border-orange-200">
        <p className="text-xs text-orange-600">
          <strong>Note:</strong> Cleanup operations will be executed in the order shown. 
          High priority issues should be addressed first to maintain data integrity.
        </p>
      </div>
    </div>
  );
};

export default CleanupSuggestions; 