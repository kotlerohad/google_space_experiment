import React, { useState, useEffect } from 'react';
import supabaseService from '../../../services/supabaseService';
import linkedinService from '../../../services/linkedinService';

// Company Type Dropdown Component
export const CompanyTypeDropdown = ({ currentTypeId, companyId, onUpdate, onMessageLog }) => {
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
export const PriorityDropdown = ({ currentPriority, companyId, companyTypeId, country, onUpdate, onMessageLog }) => {
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

// Status Dropdown Component
export const StatusDropdown = ({ currentStatus, companyId, onUpdate, onMessageLog }) => {
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

// Connection Status Dropdown Component
export const ConnectionStatusDropdown = ({ currentStatus, contactId, onUpdate, onMessageLog }) => {
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

// Contact Status Dropdown Component - New for follow-up workflow
export const ContactStatusDropdown = ({ currentStatus, contactId, onUpdate, onMessageLog }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const statusOptions = {
    'followup': { label: 'Follow Up', color: 'bg-green-100 text-green-800' },
    'wait': { label: 'Wait', color: 'bg-orange-100 text-orange-800' },
    'giveup': { label: 'Give Up', color: 'bg-red-100 text-red-800' }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.contact-status-dropdown')) {
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
      const statusText = newStatus ? statusOptions[newStatus].label : 'None';
      onMessageLog?.(`Updating contact ${contactId} status to ${statusText}...`, 'info');
      
      const { error } = await supabaseService.supabase
        .from('contacts')
        .update({ contact_status: newStatus })
        .eq('id', contactId);

      if (error) throw error;

      onMessageLog?.(`✓ Successfully updated contact status to ${statusText}`, 'success');
      onUpdate?.(); // Refresh the data
    } catch (error) {
      console.error('Failed to update contact status:', error);
      onMessageLog?.(`✗ Failed to update contact status: ${error.message}`, 'error');
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  const currentOption = statusOptions[currentStatus] || { label: 'None', color: 'bg-gray-100 text-gray-800' };
  const isNone = !currentStatus || !statusOptions[currentStatus];

  return (
    <div className="relative contact-status-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 ${
          isNone 
            ? 'bg-gray-50 text-gray-400 border border-dashed' 
            : currentOption.color
        } ${
          isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'
        }`}
        title="Click to change contact status"
      >
        {isUpdating ? 'Updating...' : currentOption.label}
        <span className="ml-1 text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-32">
          <button
            onClick={() => handleStatusChange(null)}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg ${
              isNone ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700'
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