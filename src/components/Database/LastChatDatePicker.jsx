import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import supabaseService from '../../services/supabaseService';

const LastChatDatePicker = ({ currentDate, contactId, onUpdate, onMessageLog }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const datePickerRef = useRef(null);

  // Initialize with current date
  useEffect(() => {
    if (currentDate) {
      // Convert to YYYY-MM-DD format for input
      const date = new Date(currentDate);
      setSelectedDate(date.toISOString().split('T')[0]);
    } else {
      setSelectedDate('');
    }
  }, [currentDate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleDateChange = async (newDate) => {
    if (!newDate) return;

    setIsUpdating(true);
    setIsOpen(false);
    
    // Convert to ISO timestamp
    const timestamp = new Date(newDate).toISOString();
    
    // Optimistic update - update UI immediately
    onUpdate?.(contactId, { last_chat: timestamp });
    
    try {
      onMessageLog?.(`Updating contact ${contactId} last chat to ${newDate}...`, 'info');
      
      const { error } = await supabaseService.supabase
        .from('contacts')
        .update({ last_chat: timestamp })
        .eq('id', contactId);

      if (error) throw error;

      onMessageLog?.(`✓ Successfully updated last chat to ${newDate}`, 'success');
    } catch (error) {
      console.error('Failed to update last chat:', error);
      onMessageLog?.(`✗ Failed to update last chat: ${error.message}`, 'error');
      // Revert optimistic update on error
      onUpdate?.(contactId, { last_chat: currentDate });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearDate = async () => {
    setIsUpdating(true);
    setIsOpen(false);
    
    // Optimistic update - update UI immediately
    onUpdate?.(contactId, { last_chat: null });
    setSelectedDate('');
    
    try {
      onMessageLog?.(`Clearing last chat for contact ${contactId}...`, 'info');
      
      const { error } = await supabaseService.supabase
        .from('contacts')
        .update({ last_chat: null })
        .eq('id', contactId);

      if (error) throw error;

      onMessageLog?.(`✓ Successfully cleared last chat`, 'success');
    } catch (error) {
      console.error('Failed to clear last chat:', error);
      onMessageLog?.(`✗ Failed to clear last chat: ${error.message}`, 'error');
      // Revert optimistic update on error
      onUpdate?.(contactId, { last_chat: currentDate });
      setSelectedDate(currentDate ? new Date(currentDate).toISOString().split('T')[0] : '');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const getDateColor = (dateString) => {
    if (!dateString) return 'text-gray-400';
    
    const date = new Date(dateString);
    const now = new Date();
    const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) return 'text-green-600'; // Recent
    if (daysDiff <= 30) return 'text-yellow-600'; // Within month
    return 'text-red-600'; // Old
  };

  return (
    <div className="relative" ref={datePickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`flex items-center px-2 py-1 rounded text-xs transition-colors hover:bg-gray-100 ${
          isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${getDateColor(currentDate)}`}
        title="Click to set last chat date"
      >
        <Calendar size={12} className="mr-1" />
        {isUpdating ? 'Updating...' : formatDisplayDate(currentDate)}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] p-3 min-w-64">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Last Chat Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                max={new Date().toISOString().split('T')[0]} // Can't set future dates
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleDateChange(selectedDate)}
                disabled={!selectedDate || isUpdating}
                className="flex-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Set Date
              </button>
              <button
                onClick={handleClearDate}
                disabled={isUpdating}
                className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LastChatDatePicker; 