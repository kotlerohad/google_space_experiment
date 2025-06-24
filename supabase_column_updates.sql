-- Add source column to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Manual';

-- Add priority column to companies table  
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT NULL;

-- Add source column to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Manual';

-- Add priority column to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT NULL;

-- Add priority column to activities table (if it doesn't exist)
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT NULL;

-- Add last_chat column to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS last_chat TIMESTAMP DEFAULT NULL;

-- Add last_chat column to companies table  
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS last_chat TIMESTAMP DEFAULT NULL;

-- Add LinkedIn columns to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255) DEFAULT NULL;

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS linkedin_connection_status VARCHAR(50) DEFAULT 'unknown';

-- Update existing records with default values (optional)
UPDATE companies SET source = 'Manual' WHERE source IS NULL;
UPDATE contacts SET source = 'Manual' WHERE source IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN companies.source IS 'Source of the company record (Email, Manual, Import, API, Web, Referral, Event, LinkedIn, Other)';
COMMENT ON COLUMN companies.priority IS 'Priority level: 1=High, 2=Medium, 3=Low, null=No priority';
COMMENT ON COLUMN contacts.source IS 'Source of the contact record (Email, Manual, Import, API, Web, Referral, Event, LinkedIn, Other)';  
COMMENT ON COLUMN contacts.priority IS 'Priority level: 1=High, 2=Medium, 3=Low, null=No priority';
COMMENT ON COLUMN activities.priority IS 'Priority level: 1=High, 2=Medium, 3=Low, null=No priority';
COMMENT ON COLUMN contacts.last_chat IS 'Date of last communication/chat with this contact';
COMMENT ON COLUMN companies.last_chat IS 'Date of last communication with any contact from this company';
COMMENT ON COLUMN contacts.linkedin_url IS 'LinkedIn profile URL (shortened link)';
COMMENT ON COLUMN contacts.linkedin_connection_status IS 'LinkedIn connection status: connected, not_connected, unknown, sent_message_no_response';

-- Add new company types
INSERT INTO company_types (id, name) VALUES (6, 'Customer (Software provider)') ON CONFLICT (id) DO NOTHING;
INSERT INTO company_types (id, name) VALUES (7, 'Customer (Payments)') ON CONFLICT (id) DO NOTHING;
INSERT INTO company_types (id, name) VALUES (8, 'Third Party Service Provider') ON CONFLICT (id) DO NOTHING;

-- Add comments columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS comments TEXT DEFAULT NULL;

-- Add comments columns to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS comments TEXT DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN companies.comments IS 'General comments and notes about the company';
COMMENT ON COLUMN contacts.comments IS 'General comments and notes about the contact'; 