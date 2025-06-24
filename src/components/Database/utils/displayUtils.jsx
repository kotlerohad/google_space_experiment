import React from 'react';
import { Linkedin, Edit } from 'lucide-react';
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

// Separate component for LinkedIn URL editing
const LinkedInUrlEditor = ({ value, record, onUpdate, onMessageLog }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  
  if (isEditing) {
    return (
      <div className="space-y-1">
        <EditableTextField
          currentValue={value}
          recordId={record.id}
          tableName="contacts"
          fieldName="linkedin_url"
          onUpdate={() => {
            onUpdate?.();
            setIsEditing(false);
          }}
          onMessageLog={onMessageLog}
          placeholder="Enter LinkedIn URL..."
          type="url"
        />
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      {value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors text-sm"
          title="Open LinkedIn profile"
        >
          <Linkedin className="w-4 h-4" />
          <span>Open</span>
        </a>
      ) : (
        <span className="text-gray-400 italic text-sm">No LinkedIn</span>
      )}
      <button
        onClick={() => setIsEditing(true)}
        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        title="Edit LinkedIn URL"
      >
        <Edit className="w-3 h-3" />
      </button>
      {value && (
        <ConnectionStatusDropdown
          currentStatus={record.linkedin_connection_status || 'unknown'}
          contactId={record.id}
          onUpdate={onUpdate}
          onMessageLog={onMessageLog}
        />
      )}
    </div>
  );
};

export const getDisplayValue = (record, column, tableName, groupByColumn, onUpdate, onMessageLog) => {
  const value = record[column.key];
  
  // Handle interactive fields FIRST - these should work even with null values
  
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
    } else if (column.key === 'linkedin_connection_status' && tableName === 'contacts') {
      // For LinkedIn connection status, show dropdown
      return (
        <ConnectionStatusDropdown
          currentStatus={value || 'unknown'}
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

  // Handle priority fields with dropdown for companies and contacts
  if (column.key === 'priority') {
    if (tableName === 'companies') {
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
    } else if (tableName === 'contacts') {
      // For contacts, also show dropdown
      return (
        <PriorityDropdown
          currentPriority={value}
          contactId={record.id}
          onUpdate={onUpdate}
          onMessageLog={onMessageLog}
          tableName="contacts"
        />
      );
    }
  }

  // Handle comments field - always editable
  if (column.key === 'comments') {
    return (
      <EditableTextField
        currentValue={value || ''}
        recordId={record.id}
        tableName={tableName}
        fieldName="comments"
        onUpdate={onUpdate}
        onMessageLog={onMessageLog}
        placeholder={tableName === 'companies' ? "Add company notes..." : "Add contact notes..."}
      />
    );
  }

  // Handle editable text fields for contacts
  if (tableName === 'contacts') {
    if (column.key === 'name') {
      return (
        <EditableTextField
          currentValue={value || ''}
          recordId={record.id}
          tableName={tableName}
          fieldName="name"
          onUpdate={onUpdate}
          onMessageLog={onMessageLog}
          placeholder="Enter contact name..."
          type="text"
        />
      );
    }
    
    if (column.key === 'email') {
      return (
        <EditableTextField
          currentValue={value || ''}
          recordId={record.id}
          tableName={tableName}
          fieldName="email"
          onUpdate={onUpdate}
          onMessageLog={onMessageLog}
          placeholder="Enter email address..."
          type="email"
        />
      );
    }
    
    if (column.key === 'title') {
      return (
        <EditableTextField
          currentValue={value || ''}
          recordId={record.id}
          tableName={tableName}
          fieldName="title"
          onUpdate={onUpdate}
          onMessageLog={onMessageLog}
          placeholder="Enter job title..."
          type="text"
        />
      );
    }
    
    if (column.key === 'source') {
      return (
        <EditableTextField
          currentValue={value || ''}
          recordId={record.id}
          tableName={tableName}
          fieldName="source"
          onUpdate={onUpdate}
          onMessageLog={onMessageLog}
          placeholder="Enter source..."
          type="text"
        />
      );
    }
  }

  // Handle LinkedIn URL with connection status - show button with edit pencil for contacts
  if (column.key === 'linkedin_url') {
    if (tableName === 'contacts') {
      return (
        <LinkedInUrlEditor
          value={value}
          record={record}
          onUpdate={onUpdate}
          onMessageLog={onMessageLog}
        />
      );
    }
    
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

  // Handle company type ID with dropdown
  if (column.key === 'company_type_id' && tableName === 'companies') {
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

  // Handle ID references
  if ((column.key === 'company_id' || column.key === 'related_contact_id') && value) {
    return (
      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
        #{value}
      </span>
    );
  }

  // Handle contacts column - Display as colored pills based on status
  if (column.key === 'contacts') {
    // If we have structured contact data with status, render as pills
    if (Array.isArray(record.contact_data)) {
      return renderContactPills(record.contact_data);
    }
    
    // Handle text-based contact data
    if (value && value !== 'No contacts') {
      return (
        <div className="max-w-xs">
          <div className="text-sm text-gray-700" title={value}>
            {value.length > 50 ? `${value.substring(0, 50)}...` : value}
          </div>
        </div>
      );
    }
    
    // No contacts case
    return <span className="text-gray-400 italic">No contacts</span>;
  }

  // Handle email addresses for non-contacts tables
  if (column.key === 'email' && tableName !== 'contacts') {
    if (typeof value === 'string' && value.includes('@')) {
      return (
        <a href={`mailto:${value}`} className="text-blue-600 hover:text-blue-800 hover:underline">
          {value}
        </a>
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
  
  // Handle source fields - always editable
  if (column.key === 'source') {
    return (
      <EditableTextField
        currentValue={value || ''}
        recordId={record.id}
        tableName={tableName}
        fieldName="source"
        onUpdate={onUpdate}
        onMessageLog={onMessageLog}
        placeholder="Enter source..."
        type="text"
      />
    );
  }

  // Handle country fields - always editable
  if (column.key === 'country') {
    return (
      <EditableTextField
        currentValue={value || ''}
        recordId={record.id}
        tableName={tableName}
        fieldName="country"
        onUpdate={onUpdate}
        onMessageLog={onMessageLog}
        placeholder="Enter country..."
        type="text"
      />
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
  
  // Handle null/undefined values safely
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">—</span>;
  }
  
  // Default display for other values
  return <span className="text-gray-900">{String(value)}</span>;
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

  // Separate contacts by status
  const contactsWithStatus = contactsData.filter(contact => 
    contact.contact_status && 
    contact.contact_status !== 'None' && 
    contact.contact_status !== null && 
    contact.contact_status !== undefined
  );

  const contactsWithoutStatus = contactsData.filter(contact => 
    !contact.contact_status || 
    contact.contact_status === 'None' || 
    contact.contact_status === null || 
    contact.contact_status === undefined
  );

  return (
    <div className="flex flex-wrap gap-1 max-w-xs">
      {/* Render contacts with status using colored pills */}
      {contactsWithStatus.map((contact, index) => (
        <span
          key={`status-${index}`}
          className={`px-2 py-1 rounded-full text-xs font-medium ${getContactStatusColor(contact.contact_status)}`}
          title={`${contact.name}${contact.email ? ` (${contact.email})` : ''} - Status: ${contact.contact_status}`}
        >
          {contact.name}
        </span>
      ))}
      
      {/* Render contacts without status using grey pills */}
      {contactsWithoutStatus.map((contact, index) => (
        <span
          key={`no-status-${index}`}
          className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
          title={`${contact.name}${contact.email ? ` (${contact.email})` : ''} - No Status`}
        >
          {contact.name}
        </span>
      ))}
      
      {/* If no contacts at all, show placeholder */}
      {contactsWithStatus.length === 0 && contactsWithoutStatus.length === 0 && (
        <span className="text-gray-400 italic">No contacts</span>
      )}
    </div>
  );
};