import React, { useState, useEffect, useRef } from 'react';
import supabaseService from '../../../services/supabaseService';

export const EditableTextField = ({ 
  currentValue, 
  recordId, 
  tableName, 
  fieldName, 
  onUpdate, 
  onMessageLog, 
  placeholder = "Add comment..." 
}) => {
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