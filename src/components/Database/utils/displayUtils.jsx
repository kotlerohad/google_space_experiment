import React from 'react';
import { Linkedin } from 'lucide-react';
import linkedinService from '../../../services/linkedinService';
import { 
  CompanyTypeDropdown, 
  PriorityDropdown, 
  StatusDropdown, 
  ConnectionStatusDropdown,
  ContactStatusDropdown
} from '../components/DropdownEditors';
import { EditableTextField } from '../components/EditableTextField';
import LastChatDatePicker from '../LastChatDatePicker';

export const getDisplayValue = (record, column, tableName, groupByColumn, onUpdate, onMessageLog) => {
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
    if (column.key === 'status' && tableName === 'companies') {
      // For companies status, show dropdown
      return (
        <StatusDropdown
          currentStatus={value}
          companyId={record.id}
          onUpdate={onUpdate}
          onMessageLog={onMessageLog}
        />
      );
    } else if (column.key === 'contact_status' && tableName === 'contacts') {
      // For contact status, show the new contact status dropdown
      return (
        <ContactStatusDropdown
          currentStatus={value}
          contactId={record.id}
          onUpdate={onUpdate}
          onMessageLog={onMessageLog}
        />
      );
    } else {
      // For other status fields, show static display
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
        'Proposal': 'bg-indigo-100 text-indigo-800',
        // Add new contact statuses for static display
        'followup': 'bg-green-100 text-green-800',
        'wait': 'bg-orange-100 text-orange-800',
        'giveup': 'bg-red-100 text-red-800'
      };
      const colorClass = statusColors[value] || 'bg-gray-100 text-gray-800';
      return (
        <span className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>
          {value || 'None'}
        </span>
      );
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

  // Handle contacts column - Display as colored pills based on status
  if (column.key === 'contacts' && value) {
    if (value === 'No contacts') {
      return <span className="text-gray-400 italic">{value}</span>;
    }
    
    // If we have structured contact data with status, render as pills
    if (Array.isArray(record.contact_data)) {
      return renderContactPills(record.contact_data);
    }
    
    // Fallback to original text display for backward compatibility
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
  
  // Handle comments field
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
  
  // Handle priority fields with dropdown for companies
  if (column.key === 'priority') {
    if (tableName === 'companies') {
      // In grouped view, don't show dropdown for the grouping column
      if (groupByColumn === 'priority') {
        if (value === null || value === undefined) {
          return <span className="text-gray-400 italic">—</span>;
        }
        const priorityColors = {
          1: 'bg-red-100 text-red-800',    // High
          2: 'bg-yellow-100 text-yellow-800', // Medium
          3: 'bg-green-100 text-green-800'    // Low
        };
        const priorityLabels = {
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
    } else {
      // For other tables, show static priority
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

// Helper function to get contact status color
const getContactStatusColor = (status) => {
  const statusColors = {
    'followup': 'bg-green-100 text-green-800',
    'wait': 'bg-orange-100 text-orange-800', 
    'giveup': 'bg-red-100 text-red-800'
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

// Helper function to render contacts as colored pills
const renderContactPills = (contactsData) => {
  if (!contactsData || contactsData.length === 0) {
    return <span className="text-gray-400 italic">No contacts</span>;
  }

  return (
    <div className="flex flex-wrap gap-1 max-w-xs">
      {contactsData.map((contact, index) => (
        <span
          key={index}
          className={`px-2 py-1 rounded-full text-xs font-medium ${getContactStatusColor(contact.status)}`}
          title={`${contact.name}${contact.email ? ` (${contact.email})` : ''} - Status: ${contact.status || 'None'}`}
        >
          {contact.name}
        </span>
      ))}
    </div>
  );
};