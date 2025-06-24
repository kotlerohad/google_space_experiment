-- Contact Status Migration Script
-- Migrates existing contact statuses to the new follow-up workflow system
-- New statuses: 'followup', 'wait', 'giveup'

-- First, let's see what current statuses exist
-- SELECT DISTINCT contact_status, COUNT(*) as count FROM contacts GROUP BY contact_status ORDER BY count DESC;

-- Migration mapping logic:
-- Active contacts -> followup (they're active, so we should follow up)
-- Prospects/Leads -> followup (potential opportunities)
-- Inactive/Lost -> giveup (no longer viable)
-- Pending -> wait (waiting for something)
-- NULL/empty -> keep as NULL (no status set)

-- Update existing contact statuses
UPDATE contacts 
SET contact_status = CASE 
  WHEN contact_status IN ('Active', 'Prospect', 'Lead', 'Qualified') THEN 'followup'
  WHEN contact_status IN ('Pending', 'On Hold') THEN 'wait'
  WHEN contact_status IN ('Inactive', 'Lost', 'Disqualified', 'Cold') THEN 'giveup'
  ELSE NULL  -- Keep NULL for unknown/unset statuses
END
WHERE contact_status IS NOT NULL;

-- Add a comment to document the new status values
COMMENT ON COLUMN contacts.contact_status IS 'Contact follow-up status: followup (green), wait (orange), giveup (red), null (grey)';

-- Optional: View the results after migration
-- SELECT contact_status, COUNT(*) as count FROM contacts GROUP BY contact_status ORDER BY count DESC; 