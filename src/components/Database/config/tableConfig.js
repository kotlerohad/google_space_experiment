import { Building2, Users, Activity, FileText } from 'lucide-react';

export const TABLE_CONFIG = {
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
    customQuery: true
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