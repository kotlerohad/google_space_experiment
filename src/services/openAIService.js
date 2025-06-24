class OpenAIService {
  constructor() {
    this.apiKey = null;
    this.model = 'gpt-4.1';
    this.dbSchema = this.getDefaultDbSchema(); // Set default schema
  }

  getDefaultDbSchema() {
    return `
DATABASE SCHEMA:

## Core Tables

### contacts
- id (int, primary key)
- name (text, required)
- email (text)
- title (text)
- linkedin (text)
- phone (text)
- contact_status (text, default: 'Active')
- company_id (int, foreign key to companies.id)
- last_chat (timestamp, nullable) - Date of last email communication
- source (text, default: 'Manual') - Source of contact: Email, Manual, Import, API, Web, Referral, Event, LinkedIn, Other
- priority (int, nullable) - Values: 1=High, 2=Medium, 3=Low, null=No priority
- comments (text, nullable) - General comments and notes about the contact
- linkedin_url (text, nullable) - LinkedIn profile URL
- linkedin_connection_status (text, default: 'unknown') - Values: connected, not_connected, unknown, sent_message_no_response
- created_at (timestamp)

### companies
- id (int, primary key)
- name (text, required)
- country (text)
- status (text) - Values: "Unqualified" (initial contact), "Qualified" (concrete thinking how to make it happen), "Opportunity" (concrete scope defined), "Pilot" (agreement in place), "Active" (currently active), "Inactive / Closed" (no path forward)
- company_type_id (int, foreign key to company_types.id)
- priority (int, nullable) - Values: 0=Top, 1=High, 2=Medium, 3=Low, null=No priority
- source (text, default: 'Manual') - Source of company: Email, Manual, Import, API, Web, Referral, Event, LinkedIn, Other
- number_of_employees (int)
- number_of_developers (int)
- potential_arr_eur (decimal)
- last_chat (timestamp, nullable) - Date of most recent communication with any contact from this company
- comments (text, nullable) - General comments and notes about the company
- created_at (timestamp)
- updated_at (timestamp)

### activities
- id (int, primary key)
- name (text, required)
- status (text)
- description (text)
- relationship_type_id (int, foreign key to relationship_types.id)
- priority (int, nullable) - Values: 1=High, 2=Medium, 3=Low, null=No priority
- last_contact_date (date)
- next_step (text)
- next_step_due_date (date)
- owner_id (int)
- created_at (timestamp)
- updated_at (timestamp)

### artifacts
- id (int, primary key)
- document_name (text, required)
- type (text)
- related_project (text)
- created_at (timestamp)

### triage_results
- id (text, primary key, email ID)
- key_point (text)
- confidence (int)
- summary (text)
- feedback (text)
- feedback_text (text)
- timestamp (timestamp)
- source_email (jsonb)
- original_triage (jsonb)

### prompts
- name (text, primary key)
- content (text, required)
- created_at (timestamp)

## Lookup Tables

### company_types
- id (int, primary key)
- name (text, required, unique)
Available types:
1: "Other"
2: "Customer (Bank)"
3: "Channel Partner"
4: "Customer (NeoBank)"
5: "Investor"
6: "Customer (Software provider)"
7: "Customer (Payments)"

### relationship_types
- id (int, primary key)
- name (text, required, unique)

### tasks
- id (int, primary key)
- title (text, required)
- description (text)
- status (text)
- assigned_to (int, foreign key to team_members.id)

### team_members
- id (int, primary key)
- name (text, required)
- email (text)
- role (text)

## Usage Notes:
- Use "_name" suffix for lookups (e.g., "company_type_name": "Investor" will be resolved to company_type_id)
- All tables have created_at timestamps
- Foreign key relationships are enforced
- Text fields can be NULL unless marked as required
- Priority fields use integer values: 1=High, 2=Medium, 3=Low, null=No priority
`;
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
    console.log('🔑 OpenAI API Key has been set.');
  }
  
  setDbSchema(schema) {
    this.dbSchema = schema;
  }

  emitLLMEvent(type, data) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('llm-communication', {
        detail: { type, data }
      }));
    }
  }

  async _request(payload) {
    if (!this.apiKey) {
      throw new Error("OpenAI API key is not set.");
    }
    
    this.emitLLMEvent('request', { service: 'OpenAI', payload });

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.emitLLMEvent('error', { service: 'OpenAI', error: errorData });
        throw new Error(`OpenAI API error: ${errorData.error.message}`);
      }
      
      const result = await response.json();
      this.emitLLMEvent('response', { service: 'OpenAI', response: result });
      
      return result;

    } catch (error) {
      this.emitLLMEvent('error', { service: 'OpenAI', error: error.message });
      console.error("OpenAI API call failed:", error);
      throw error;
    }
  }

  async generateDbOperations(userInstruction) {
    if (!this.dbSchema) {
      throw new Error("Database schema is not set. Cannot generate DB operations.");
    }

    // Check if the instruction involves adding an email address
    const emailAddressMatch = userInstruction.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    let companyResearch = null;
    let emailHistory = null;
    
    if (emailAddressMatch) {
      const email = emailAddressMatch[1];
      const domain = email.split('@')[1];
      
      console.log(`📧 Processing email address: ${email}`);
      console.log(`🏢 Analyzing domain: ${domain}`);
      
      // Use OpenAI to identify the company from the domain
      try {
        companyResearch = await this.identifyCompanyFromDomain(domain);
        console.log(`🔍 Company research completed for ${domain}`);
      } catch (error) {
        console.warn(`Company research failed for ${domain}:`, error);
      }
      
      // Check email history with this contact
      try {
        emailHistory = await this.checkEmailHistory(email);
        console.log(`📧 Email history check completed for ${email}`);
      } catch (error) {
        console.warn(`Email history check failed for ${email}:`, error);
      }
    }

    // Check if the instruction involves searching emails
    const needsEmailSearch = userInstruction.toLowerCase().includes('inbox') || 
                           userInstruction.toLowerCase().includes('email') ||
                           userInstruction.toLowerCase().includes('check my') ||
                           userInstruction.toLowerCase().includes('find his contact details') ||
                           userInstruction.toLowerCase().includes('find her contact details') ||
                           userInstruction.toLowerCase().includes('searching my inbox') ||
                           userInstruction.toLowerCase().includes('search my inbox');

    let emailSearchResults = null;
    if (needsEmailSearch) {
      // Extract the person's name from various command patterns
      let personName = null;
      
      // Pattern 1: "add [name] as a contact"
      let nameMatch = userInstruction.match(/add\s+([^as]+)\s+as/i);
      if (nameMatch) {
        personName = nameMatch[1].trim();
      }
      
      // Pattern 2: "update [name]'s email" or "update [name] email"
      if (!personName) {
        nameMatch = userInstruction.match(/update\s+([^'s]+)(?:'s)?\s+email/i);
        if (nameMatch) {
          personName = nameMatch[1].trim();
        }
      }
      
      // Pattern 2b: "update [name] by searching" or similar
      if (!personName) {
        nameMatch = userInstruction.match(/update\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*(?:\.[A-Z][a-z]*)*)\s+(?:by|email|contact)/i);
        if (nameMatch) {
          personName = nameMatch[1].trim();
        }
      }
      
      // Pattern 3: "[name]'s email" or "[name] email"
      if (!personName) {
        nameMatch = userInstruction.match(/([a-zA-Z\s.]+)(?:'s)?\s+email/i);
        if (nameMatch) {
          const candidate = nameMatch[1].trim();
          // Make sure it's not a generic word like "his", "her", "the", etc.
          if (!['his', 'her', 'the', 'their', 'my', 'your', 'our'].includes(candidate.toLowerCase())) {
            personName = candidate;
          }
        }
      }
      
      // Pattern 4: "search for [name]" or "find [name]"
      if (!personName) {
        nameMatch = userInstruction.match(/(?:search for|find)\s+([a-zA-Z\s.]+?)(?:\s+(?:in|by|email|contact))/i);
        if (nameMatch) {
          personName = nameMatch[1].trim();
        }
      }
      
      // Pattern 5: Extract name from context (look for capitalized names)
      if (!personName) {
        const capitalizedNames = userInstruction.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]*)*\b/g);
        if (capitalizedNames) {
          // Filter out common words and find the most likely name
          const filteredNames = capitalizedNames.filter(name => 
            !['Ben', 'Gmail', 'Email', 'Contact', 'Update', 'Search', 'Find', 'Inbox'].includes(name) &&
            name.length > 2
          );
          if (filteredNames.length > 0) {
            personName = filteredNames[0]; // Take the first likely name
          }
        }
      }
      
      if (personName) {
        console.log(`🔍 Searching emails for contact details of: ${personName}`);
        
        try {
          emailSearchResults = await this.searchEmailsForContact(personName);
          console.log(`📧 Email search completed for: ${personName}`);
          console.log(`📋 Search results: ${emailSearchResults.substring(0, 200)}...`);
        } catch (error) {
          console.warn('Email search failed:', error);
          emailSearchResults = `Unable to search emails: ${error.message}`;
        }
      } else {
        console.log(`⚠️ Could not extract person name from command: "${userInstruction}"`);
      }
    }

    const systemPrompt = `You are an expert at converting natural language instructions into a series of structured database operations. Your responses must be a single JSON object that contains a key "operations", which is an array of operation objects. Do not include any other text, greetings, or explanations in your response.

Here is the database schema you are working with:
${this.dbSchema}

### Operation Format
Each operation object must have these exact fields:
- "action": "insert", "update", or "delete" (lowercase)
- "table": the table name (e.g., "companies", "contacts", "activities")
- "payload": object with the data to insert/update
- "where": object with conditions (required for update/delete operations)

### Example Operations:
{
  "operations": [
    {
      "action": "insert",
      "table": "companies", 
      "payload": {"name": "TechCorp", "company_type_name": "Fintech"}
    },
    {
      "action": "update",
      "table": "contacts",
      "payload": {"title": "Senior Developer"},
      "where": {"id": 1}
    }
  ]
}

### Instructions for AI
- Generate operations for MULTIPLE tables if the user's request requires it.
- For lookups (e.g., finding a company_type_id for "Investor"), use a special "_name" suffix for the field (e.g., "company_type_name": "Investor"). The backend will handle the ID lookup.
- For "UPDATE" or "DELETE", you must provide a "where" clause.
- Always return an array of operation objects. If no operations can be determined, return an empty array.
- Use "action" not "operation" as the field name.
- For priority fields (priority column), use integer values: 1=High, 2=Medium, 3=Low, or null for empty/None. NEVER use string values like "None" or "High" for priority fields.
- When setting priority to empty/None, use null, not the string "None".

### CRITICAL: Operation Order for Deletions
- When deleting a company that has contacts, ALWAYS delete the contacts FIRST, then the company
- When deleting any parent record, delete child records first to avoid foreign key constraint errors
- Order operations correctly: child records → parent records
- Example deletion order: contacts → companies, activities → contacts, etc.

Example for deleting company with contacts:
{
  "operations": [
    {
      "action": "delete",
      "table": "contacts",
      "where": {"company_name": "TechCorp"}
    },
    {
      "action": "delete", 
      "table": "companies",
      "where": {"name": "TechCorp"}
    }
  ]
}

IMPORTANT: For deleting contacts by company, you can use "company_name" in the where clause and the system will resolve it to the correct company_id.

### CRITICAL: Company-Contact Linking Rules
- When creating both a company AND a contact in the same batch, link them using "company_name" field in the contact record
- Use the EXACT same company name in both the company record and the contact's "company_name" field
- The backend will automatically resolve the company_name to company_id after the company is created
- NEVER use company_id: null when you know the company name - always use company_name instead

Example for creating linked company and contact:
{
  "operations": [
    {
      "action": "insert",
      "table": "companies",
      "payload": {"name": "Centrico Digital", "company_type_name": "Customer (Software provider)"}
    },
    {
      "action": "insert", 
      "table": "contacts",
      "payload": {"name": "Stefano Priola", "email": "stefano.priola@centrico.tech", "company_name": "Centrico Digital"}
    }
  ]
}

### VALID COMPANY TYPES (use EXACTLY these names):
- "Other" - for miscellaneous companies
- "Customer (Bank)" - for banking customers
- "Channel Partner" - for partnership companies
- "Customer (NeoBank)" - for neobank customers
- "Investor" - for investment companies
- "Customer (Software provider)" - for software companies that are customers
- "Customer (Payments)" - for payment companies that are customers

IMPORTANT: When users mention terms like "software provider", "technology", "tech", "software company", use "Customer (Software provider)".
When they mention "bank", "banking", use "Customer (Bank)".
When they mention "fintech", "payments", "payment processor", use "Customer (Payments)".
When they mention "investor", "VC", "venture capital", use "Investor".
When they mention "partner", "partnership", use "Channel Partner".
If unsure, use "Other".

### VALID COMPANY STATUS VALUES (use EXACTLY these names):
- "Unqualified" - Initial contact stage, just made contact
- "Qualified" - Concrete thinking about how to make it happen, qualified lead
- "Opportunity" - Concrete scope defined, real opportunity identified
- "Pilot" - Agreement in place, pilot or trial phase
- "Active" - Currently active customer/relationship
- "Inactive / Closed" - We don't have a path forward, no viable opportunity

IMPORTANT: When users mention terms like "prospect", "lead", use "Unqualified".
When they mention "opportunity", "deal", use "Opportunity".
When they mention "trial", "pilot", "agreement", use "Pilot".
When they mention "customer", "client", use "Active".
When they mention "closed", "inactive", "dead", "no path", "not viable", use "Inactive / Closed".
If unsure about status, use "Unqualified".

### Email Address Processing Rules
- When the user provides an email address (e.g., "Rebecca.Li@aexp.com"), extract the name from the email prefix
- Use the company research to create a company record first, then link the contact to that company
- Set the contact's last_chat field based on the email history information
- For email addresses like "Rebecca.Li@aexp.com", the name should be "Rebecca Li" (replace dots/underscores with spaces, capitalize properly)
- Always create both company AND contact records when processing email addresses
- Use the domain research to determine appropriate company_type_name (e.g., "Financial Services", "Technology", etc.)

### Smart Contact Matching
- When updating contacts by name, the system will automatically handle name variations (spaces vs periods, etc.)
- Use the most natural/readable name format in your operations (e.g., "Ben Froumine" rather than "Ben.Froumine")
- The backend will find contacts even if the database has slightly different name formatting
- When updating contact information, always include both name standardization and the requested updates

### CRITICAL: Contact ID Recognition and Updates
- When users reference existing contacts with ID numbers in parentheses like "(79)", this means contact ID 79
- Pattern: "Name (ID)" means update the existing contact with that ID, NOT create a new contact
- Example: "Shu Ong (79)" means update contact with id=79, name="Shu Ong"
- ALWAYS use UPDATE action, not INSERT, when contact ID is provided
- Use the ID in the "where" clause: {"id": 79}
- Do NOT create new companies when updating existing contacts - only update the contact fields

### CRITICAL: Source Field Usage
- The "source" field indicates where the contact/company information came from
- Standard source values: Email, Manual, Import, API, Web, Referral, Event, LinkedIn, Other
- IMPORTANT: Users can specify custom source values - use EXACTLY what they specify
- If user says "source is INSEAD", use "INSEAD" as the source value (don't map to LinkedIn/Manual)
- If user says "source should be INSEAD", use "INSEAD" as the source value
- Only use standard values (LinkedIn, Manual, etc.) when user doesn't specify a custom source
- "Connection (Source: INSEAD)" means the title is "Connection" and source context is INSEAD-related

### CRITICAL: Title vs Source Distinction
- title = job title or role (e.g., "Connection", "CEO", "Developer")
- source = where the contact info came from (e.g., "LinkedIn", "Email", "Manual")
- "Connection (Source: INSEAD)" should be parsed as:
  - title: "Connection"
  - source: "LinkedIn" (since INSEAD is a business school, likely LinkedIn context)

### CRITICAL EMAIL FIELD RULES:
- NEVER use placeholder text like "{{found_email_from_inbox_for_Person}}" or similar templates in the email field
- ONLY use actual email addresses that were found in the email search results
- If no actual email address is found, leave the email field empty (null) or omit it entirely
- Valid email format: user@domain.com (must contain @ and valid domain)
- If email search results show "❌ No email addresses found", do NOT include an email field in the contact data

${emailSearchResults ? `\n### Email Search Results:\n${emailSearchResults}\n\nIMPORTANT: Only use actual email addresses from the "✅ Email addresses found:" line above. If that line shows no emails or is missing, do NOT include an email field in the contact record.` : ''}

${companyResearch ? `\n### Company Research Results:\n${companyResearch}\n\nIMPORTANT: Use this company information to create the company record first, then link the contact to that company.` : ''}

${emailHistory ? `\n### Email History:\n${emailHistory}\n\nIMPORTANT: This shows the last communication with this contact. Consider this information when creating the contact record.` : ''}`;

    const userPrompt = userInstruction;

    const payload = {
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 1000
    };

    try {
      const response = await this._request(payload);
      const content = response.choices[0].message.content.trim();
      
      // Parse the JSON response
      let operations;
      try {
        operations = JSON.parse(content);
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", content);
        throw new Error("AI returned invalid JSON format");
      }

      if (!operations.operations || !Array.isArray(operations.operations)) {
        throw new Error("AI response missing 'operations' array");
      }

      return operations;
    } catch (error) {
      console.error("Failed to generate database operations:", error);
      throw error;
    }
  }

  /**
   * Identify company information from a domain using OpenAI
   * @param {string} domain - The domain to research (e.g., "aexp.com")
   * @returns {Promise<string>} - Company information and insights
   */
  async identifyCompanyFromDomain(domain) {
    try {
      console.log(`🔍 Researching company domain: ${domain}`);
      
      const prompt = `Analyze the domain "${domain}" and provide comprehensive company information.

Please provide:
1. Full company name (e.g., "aexp.com" → "American Express")
2. Company type/industry (e.g., "Financial Services", "Technology", "Healthcare")
3. Brief company description
4. Headquarters location if known
5. Company size estimate (if available)
6. Any notable recent news or developments

Format your response as structured information that can be used to create a database record.

Domain to analyze: ${domain}`;

      const payload = {
        model: this.model,
        messages: [
          { 
            role: "system", 
            content: "You are a company research expert. Provide accurate, factual information about companies based on their domains. Focus on well-known, established companies and be clear about any uncertainty." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 500
      };

      const response = await this._request(payload);
      const companyInfo = response.choices[0].message.content.trim();
      
      console.log(`✅ Company research completed for ${domain}`);
      return companyInfo;
      
    } catch (error) {
      console.error(`Company research failed for ${domain}:`, error);
      throw new Error(`Failed to research company domain ${domain}: ${error.message}`);
    }
  }

  /**
   * Check email history with a specific contact
   * @param {string} email - The email address to check history for
   * @returns {Promise<string>} - Email history information
   */
  async checkEmailHistory(email) {
    try {
      console.log(`📧 Checking email history for: ${email}`);
      
      // Import email service dynamically to avoid circular dependencies
      const { default: emailService } = await import('./emailService');
      
      // Search for recent emails with this contact
      const emails = await emailService.searchEmails(email, 5);
      
      if (!emails || emails.length === 0) {
        return `No email history found with ${email}. This would be a new contact.`;
      }
      
      // Get the most recent email
      const lastEmail = emails[0];
      const lastEmailDate = new Date(lastEmail.date);
      const daysSinceLastEmail = Math.floor((new Date() - lastEmailDate) / (1000 * 60 * 60 * 24));
      
      let historyInfo = `📧 Email History with ${email}:\n`;
      historyInfo += `📅 Last email: ${lastEmailDate.toLocaleDateString()} (${daysSinceLastEmail} days ago)\n`;
      historyInfo += `📝 Subject: "${lastEmail.subject}"\n`;
      historyInfo += `👤 From: ${lastEmail.from}\n`;
      historyInfo += `📊 Total emails found: ${emails.length}\n`;
      
      // Add context about email frequency
      if (daysSinceLastEmail <= 7) {
        historyInfo += `🟢 Recent contact - active communication\n`;
      } else if (daysSinceLastEmail <= 30) {
        historyInfo += `🟡 Moderate contact - monthly communication\n`;
      } else if (daysSinceLastEmail <= 90) {
        historyInfo += `🟠 Infrequent contact - quarterly communication\n`;
      } else {
        historyInfo += `🔴 Rare contact - infrequent communication\n`;
      }
      
      // Add snippet from most recent email if available
      if (lastEmail.snippet) {
        historyInfo += `📄 Recent context: "${lastEmail.snippet}"\n`;
      }
      
      console.log(`✅ Email history check completed for ${email}`);
      return historyInfo;
      
    } catch (error) {
      console.error(`Email history check failed for ${email}:`, error);
      return `Unable to check email history for ${email}: ${error.message}`;
    }
  }

  /**
   * Search emails for contact information about a specific person
   * @param {string} personName - The name of the person to search for
   * @returns {Promise<string>} - Formatted contact information found in emails
   */
  async searchEmailsForContact(personName) {
    try {
      // Import email service dynamically to avoid circular dependencies
      const { default: emailService } = await import('./emailService');
      
      console.log(`🔍 Searching for contact: "${personName}"`);
      
      // Create multiple search variations for better matching
      const searchVariations = this.generateNameVariations(personName);
      console.log(`📝 Search variations: ${searchVariations.join(', ')}`);
      
      let allEmails = [];
      
      // Search with each variation
      for (const variation of searchVariations) {
        try {
          const emails = await emailService.searchEmails(variation, 5);
          if (emails && emails.length > 0) {
            console.log(`✅ Found ${emails.length} emails for "${variation}"`);
            allEmails.push(...emails);
          }
        } catch (error) {
          console.warn(`⚠️ Search failed for "${variation}":`, error.message);
        }
      }
      
      // Remove duplicates based on email ID
      const uniqueEmails = allEmails.filter((email, index, self) => 
        index === self.findIndex(e => e.id === email.id)
      );
      
      if (uniqueEmails.length === 0) {
        return `No emails found for "${personName}" or similar name variations.`;
      }

      console.log(`📧 Found ${uniqueEmails.length} unique emails to analyze`);

      // Extract contact information from the emails
      const extractedInfo = this.extractContactInfoFromEmails(uniqueEmails, personName);
      
      // Format the results
      let contactInfo = `Found ${uniqueEmails.length} emails related to "${personName}":\n\n`;
      
      if (extractedInfo.emails.size > 0) {
        contactInfo += `✅ Email addresses found: ${Array.from(extractedInfo.emails).join(', ')}\n`;
      } else {
        contactInfo += `❌ No email addresses found in email content\n`;
      }
      
      if (extractedInfo.phones.size > 0) {
        contactInfo += `📞 Phone numbers: ${Array.from(extractedInfo.phones).join(', ')}\n`;
      }
      
      if (extractedInfo.titles.size > 0) {
        contactInfo += `💼 Job titles: ${Array.from(extractedInfo.titles).join(', ')}\n`;
      }
      
      if (extractedInfo.companies.size > 0) {
        contactInfo += `🏢 Companies/domains: ${Array.from(extractedInfo.companies).join(', ')}\n`;
      }
      
      // Add sample email content for context
      contactInfo += `\n📋 Sample email context:\n`;
      uniqueEmails.slice(0, 2).forEach((email, index) => {
        contactInfo += `${index + 1}. From: ${email.from}\n   Subject: ${email.subject}\n   Snippet: ${email.snippet || 'No preview'}\n\n`;
      });
      
      return contactInfo;
      
    } catch (error) {
      console.error('Email search failed:', error);
      throw new Error(`Failed to search emails: ${error.message}`);
    }
  }

  /**
   * Generate name variations for better email searching
   * @param {string} personName - The original name
   * @returns {Array<string>} - Array of name variations to search
   */
  generateNameVariations(personName) {
    const variations = new Set();
    
    // Original name
    variations.add(`"${personName}"`);
    
    // Split into parts
    const nameParts = personName.split(/[\s.]+/).filter(part => part.length > 1);
    
    if (nameParts.length >= 2) {
      const [first, ...rest] = nameParts;
      const last = rest[rest.length - 1];
      
      // Common variations
      variations.add(`"${first} ${last}"`); // First Last
      variations.add(`"${last}, ${first}"`); // Last, First
      variations.add(`"${first}.${last}"`); // First.Last
      variations.add(`${first}.${last}@`); // Email pattern
      variations.add(`${first}${last}@`); // Email pattern without dot
      variations.add(`${first[0]}.${last}@`); // F.Last@
      variations.add(`${first}.${last[0]}@`); // First.L@
      
      // Handle middle names/initials
      if (rest.length > 1) {
        const middle = rest[0];
        variations.add(`"${first} ${middle} ${last}"`);
        variations.add(`"${first}.${middle}.${last}"`);
        variations.add(`${first}.${middle}.${last}@`);
      }
    }
    
    // Search for individual name parts too
    nameParts.forEach(part => {
      if (part.length > 2) {
        variations.add(part);
      }
    });
    
    return Array.from(variations);
  }

  /**
   * Extract contact information from email content
   * @param {Array} emails - Array of email objects
   * @param {string} personName - The person we're looking for
   * @returns {Object} - Extracted contact information
   */
  extractContactInfoFromEmails(emails, personName) {
    const extractedEmails = new Set();
    const extractedPhones = new Set();
    const extractedTitles = new Set();
    const extractedCompanies = new Set();
    
    for (const email of emails) {
      // Combine all text content
      const allContent = `${email.from} ${email.subject} ${email.snippet || ''} ${email.body || ''}`;
      
      // Extract email addresses - more comprehensive regex
      const emailMatches = allContent.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
      if (emailMatches) {
        emailMatches.forEach(e => {
          // Only add if it looks like a real email (not a placeholder)
          if (!e.includes('{{') && !e.includes('}}') && !e.includes('found_email') && !e.includes('placeholder')) {
            extractedEmails.add(e.toLowerCase());
          }
        });
      }
      
      // Extract from email headers (From field)
      if (email.from) {
        const fromEmailMatch = email.from.match(/<([^>]+)>/);
        if (fromEmailMatch) {
          const fromEmail = fromEmailMatch[1];
          if (!fromEmail.includes('{{') && !fromEmail.includes('}}')) {
            extractedEmails.add(fromEmail.toLowerCase());
          }
        } else {
          // Simple email format
          const simpleEmailMatch = email.from.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
          if (simpleEmailMatch) {
            extractedEmails.add(simpleEmailMatch[0].toLowerCase());
          }
        }
      }
      
      // Extract phone numbers
      const phoneMatches = allContent.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g);
      if (phoneMatches) {
        phoneMatches.forEach(p => extractedPhones.add(p.trim()));
      }
      
      // Extract job titles
      const titleMatches = allContent.match(/\b(CEO|CTO|CFO|VP|Vice President|Director|Manager|Senior|Lead|Head of|President|Founder|Engineer|Developer|Analyst|Consultant|Specialist|Coordinator|Executive)\b[^.]*?(?=\n|$|,|\.|;)/gi);
      if (titleMatches) {
        titleMatches.forEach(t => extractedTitles.add(t.trim()));
      }
      
      // Extract company domains and names
      const domainMatches = allContent.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
      if (domainMatches) {
        domainMatches.forEach(d => {
          const domain = d.substring(1).toLowerCase();
          if (!['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com'].includes(domain)) {
            extractedCompanies.add(domain);
          }
        });
      }
    }
    
    return {
      emails: extractedEmails,
      phones: extractedPhones,
      titles: extractedTitles,
      companies: extractedCompanies
    };
  }

  async triageEmail(email, triageLogic) {
    const prompt = `${triageLogic}\n\n--- EMAIL CONTENT ---\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`;
    
    // Extract company name from email for research
    let companyResearch = null;
    const companyMatch = email.from.match(/@([^.]+)/);
    if (companyMatch) {
      const domain = companyMatch[1];
      // Skip common email providers
      const commonProviders = ['gmail', 'yahoo', 'outlook', 'hotmail', 'icloud'];
      if (!commonProviders.includes(domain.toLowerCase())) {
        try {
          companyResearch = await this.searchCompanyInfo(domain);
        } catch (error) {
          console.warn('Company research failed:', error.message);
        }
      }
    }

    const systemPrompt = `You are an email action decision engine with database management capabilities. You must return a JSON object with both action decisions AND database entry suggestions AND debug information.

REQUIRED JSON FORMAT:
{
  "key_point": "Archive|Schedule|Respond|Update_Database|Review",
  "confidence": 8,
  "action_reason": "Specific actionable next step to take (or FYI summary for Archive emails)",
  "suggested_draft": "Primary draft text (same as option_1 for backward compatibility)",
  "suggested_draft_option_1": "First contextually appropriate response approach with type label",
  "suggested_draft_option_2": "Second contextually appropriate response approach with type label",
  "draft_approach_1": "DIRECT|CONSULTATIVE|FOLLOW_UP|CLARIFYING|RELATIONSHIP|SCHEDULING",
  "draft_approach_2": "DIRECT|CONSULTATIVE|FOLLOW_UP|CLARIFYING|RELATIONSHIP|SCHEDULING",
  "alternative_options": [
    {
      "action": "Schedule",
      "reason": "Alternative action reason",
      "likelihood": 30
    }
  ],
  "uncertainty_factors": ["Factor 1", "Factor 2"],
  "database_suggestions": {
    "has_business_relevance": true,
    "suggested_entries": [
      {
        "type": "contact",
        "description": "Add John Smith from TechCorp as a new contact",
        "data": {
          "name": "John Smith",
          "email": "john@techcorp.com",
          "title": "CEO",
          "company_name": "TechCorp"
        }
      }
    ]
  },
  "participants": {
    "sender": {
      "name": "John Smith",
      "email": "john@techcorp.com",
      "company": "TechCorp",
      "extracted_from": "email_signature"
    },
    "recipients": [
      {
        "name": "Ohad Kotler",
        "email": "ohad@tweezr.com",
        "company": "Tweezr"
      }
    ]
  },
  "database_insights": {
    "contact_exists": true,
    "company_exists": false,
    "recent_interactions": [
      {
        "type": "email",
        "date": "2024-01-15",
        "summary": "Previous discussion about partnership"
      }
    ],
    "context_used": "Found sender in contacts database with 3 previous interactions"
  },
  "examples": {
    "similar_cases": [
      {
        "email_type": "partnership_inquiry",
        "action_taken": "Schedule",
        "reason": "Similar business development emails typically require scheduling"
      }
    ],
    "patterns_matched": ["business_inquiry", "meeting_request"]
  },
  "activated_agents": [
    "participant_extractor",
    "database_lookup",
    "calendar_checker",
    "draft_generator"
  ],
  "agent_prompts": {
    "main": "Analyze this email for business relevance and determine next action",
    "context": "Email from potential business partner requesting meeting",
    "examples": "Similar partnership emails in the past resulted in successful meetings"
  }
}

DEBUG INFORMATION REQUIREMENTS:
- participants: Extract sender and recipient information from email headers and signatures
- database_insights: Report what was found in database lookups and how it influenced the decision
- examples: Identify similar email patterns and how they were handled
- activated_agents: List which processing agents were used (participant_extractor, database_lookup, calendar_checker, draft_generator, etc.)
- agent_prompts: Show the key prompts and context used for decision making

CONFIDENCE SCORING GUIDELINES:
- 9-10: Very clear action, obvious next step
- 7-8: Clear action with minor uncertainty
- 5-6: Moderate uncertainty, multiple valid options
- 3-4: High uncertainty, requires human judgment
- 1-2: Very unclear, insufficient information

CALENDAR-AWARE SCHEDULING GUIDELINES:
- When AVAILABLE TIME SLOTS are provided in the context, ALWAYS use them in your suggested_draft
- For scheduling emails, include 2-3 specific time options from the available slots
- Format time suggestions clearly: "I'm available on [Day, Date] at [Time]"
- If no specific slots are available, ask for the sender's availability
- Use "Schedule" as key_point for meeting coordination emails
- Set confidence to 8-9 for scheduling emails when calendar context is available

COMPANY RESEARCH INTEGRATION:
- When responding to business emails from companies, ALWAYS search for recent information about the company first
- Use web search to find: recent news, funding, partnerships, product launches, market position
- Incorporate relevant findings into your response to demonstrate knowledge and identify opportunities
- This makes responses more strategic and shows you've done your homework

STRUCTURED TIME SLOT FORMATTING:
- Always propose exactly 3 time slots for meetings
- Each slot should be 2-3 hours long (e.g., "2:00 PM - 4:00 PM")
- Start scheduling from 2 business days from today (skip weekends)
- Format: "Day, Month Date, Time Range (Duration)"
- Example: "Tuesday, December 17, 2:00 PM - 4:00 PM (2 hours)"

DRAFT CREATION FOR SCHEDULING:
- Start with a professional greeting
- Acknowledge the meeting request
- Provide 2-3 specific available time options when calendar data is available
- Include meeting duration if mentioned in original email
- End with a request for confirmation
- Keep tone professional but friendly

INTELLIGENT DUAL DRAFT CREATION:
The AI should analyze the email context and intelligently choose TWO different response approaches that make sense for the situation. Always be action-oriented, but vary the approach based on context.

DRAFT SELECTION STRATEGY:
- Analyze the email type, sender relationship, urgency, and business context
- Choose the two most appropriate response types from these options:
  * DIRECT: Immediate action, clear next steps, decisive response
  * CONSULTATIVE: Strategic discussion, exploring options, collaborative approach  
  * FOLLOW_UP: Checking status, maintaining momentum, ensuring progress
  * CLARIFYING: Asking specific questions to move forward, gathering requirements
  * RELATIONSHIP: Building rapport, acknowledging value, strengthening connection
  * SCHEDULING: Coordinating meetings, proposing times, confirming availability

DRAFT GENERATION RULES:
- suggested_draft_option_1: First contextually appropriate response approach
- suggested_draft_option_2: Second contextually appropriate response approach (different style/focus)
- suggested_draft: Use option_1 for backward compatibility
- Generate BOTH options when key_point is "Respond" AND confidence >= 4
- Each draft should be action-oriented but with different tactical approaches
- Label each draft with its approach type (e.g., "DIRECT", "CONSULTATIVE")

SPECIAL CASE - FYI EMAILS:
- For pure informational emails (newsletters, updates, announcements) where no action is needed:
- key_point: "Archive" 
- confidence: 8-9 (high confidence for clear FYI emails)
- action_reason: "FYI email - Quick summary: [2-3 sentence summary of key information]"
- No drafts needed for FYI emails
- Focus on extracting and summarizing the key information for quick review

EXAMPLE CONTEXTUAL DRAFT PAIRS:

For Partnership Inquiry:
Option 1 (DIRECT): "Hi [Name], I'm interested in exploring this partnership. Let's schedule a 30-minute call this week to discuss specifics. I have availability on [times]. Which works for you?"

Option 2 (CONSULTATIVE): "Hi [Name], Thank you for the partnership proposal. I'd like to understand your strategic goals and how our companies might create mutual value. Could we start with a brief call to explore the opportunity?"

For Customer Issue:
Option 1 (DIRECT): "Hi [Name], I understand the urgency of this issue. I'm escalating this to our technical team immediately and will have an update for you by [time]. Here's what we're doing: [specific steps]."

Option 2 (FOLLOW_UP): "Hi [Name], Thank you for bringing this to our attention. I want to ensure we resolve this properly. Can you provide [specific details] so we can implement the right solution?"

DATABASE SUGGESTIONS GUIDELINES:
- has_business_relevance: true if email involves customers, banks, investors, partners, prospects, vendors, or business opportunities
- suggested_entries: Array of database entries that should be created/updated based on email content
- Each entry should have: type (contact/company/activity), description (human-readable explanation), data (actual database fields)
- CRITICAL: Only suggest entries for NEW information not already in the database context
- DUPLICATE PREVENTION: If SENDER CONTEXT or RECIPIENT CONTEXT shows the person/company already exists, do NOT suggest adding them again
- For contacts: extract name, email, title, company from email signature/content
- For companies: identify company names, types (Fintech, Bank, Investor, etc.), locations
- For activities: suggest tracking important business interactions, meetings, follow-ups
- EXISTING DATA CHECK: If the email context shows existing contact/company information, focus on activity suggestions instead

DUPLICATE PREVENTION RULES:
- If SENDER CONTEXT shows "known contact" - do NOT suggest adding that contact again
- If RECIPIENT CONTEXT shows "known contact" - do NOT suggest adding that contact again  
- If company is mentioned in existing contact context - do NOT suggest adding that company again
- Focus on NEW contacts, companies, or activities not already captured in the database
- When in doubt, suggest activities to track the interaction rather than duplicate entries

CRITICAL REQUIREMENTS:
- key_point: MUST be exactly one of the 5 values above (your primary recommendation)
- confidence: MUST be a number 1-10 representing confidence in the ACTION decision
- action_reason: MUST be a concrete next step, NOT a summary (EXCEPTION: For FYI emails, provide "FYI email - Quick summary: [summary]")
- suggested_draft_option_1: REQUIRED when key_point is "Respond" AND confidence >= 4
- suggested_draft_option_2: REQUIRED when key_point is "Respond" AND confidence >= 4
- draft_approach_1: REQUIRED when providing option_1 (specify the approach type)
- draft_approach_2: REQUIRED when providing option_2 (specify the approach type, must be different from approach_1)
- suggested_draft: Use option_1 for backward compatibility
- database_suggestions: ALWAYS include this object, even if has_business_relevance is false
- participants: ALWAYS extract sender and recipient information
- database_insights: ALWAYS report database lookup results
- examples: ALWAYS identify similar patterns
- activated_agents: ALWAYS list processing agents used
- agent_prompts: ALWAYS show key prompts used
- Return JSON only, no explanations or other text

EXAMPLES OF GOOD database suggestions:
- "Add Sarah Johnson from Goldman Sachs as a new investor contact"
- "Create activity to track partnership discussion with Microsoft"
- "Add Revolut as a potential integration partner company"

FOR UNCERTAIN CASES (confidence < 7):
- Provide 2-3 alternative_options with different actions
- Include likelihood percentages that sum to roughly 100%
- List specific uncertainty_factors that make the decision unclear
- Lower confidence score appropriately (3-6 range for complex decisions)`;

    const payload = {
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: companyResearch ? 
          `${prompt}\n\n--- COMPANY RESEARCH ---\n${companyResearch}` : 
          prompt }
      ]
    };

    const result = await this._request(payload);
    try {
      const content = result.choices[0].message.content;
      const parsed = JSON.parse(content);
      
      // Validate the response has required fields
      if (!parsed.key_point || !parsed.confidence || !parsed.action_reason) {
        console.warn("AI response missing required fields:", parsed);
        throw new Error("AI response missing required fields");
      }
      
      // Ensure confidence is a number
      parsed.confidence = Number(parsed.confidence) || 0;
      
      // Ensure alternative_options exists for low confidence
      if (parsed.confidence < 7 && !parsed.alternative_options) {
        parsed.alternative_options = [];
      }
      
      // Ensure uncertainty_factors exists for low confidence
      if (parsed.confidence < 7 && !parsed.uncertainty_factors) {
        parsed.uncertainty_factors = [];
      }
      
      // Ensure database_suggestions exists
      if (!parsed.database_suggestions) {
        parsed.database_suggestions = {
          has_business_relevance: false,
          suggested_entries: []
        };
      }
      
      // Ensure debug information exists
      if (!parsed.participants) {
        parsed.participants = {
          sender: { name: "Unknown", email: "Unknown", company: "Unknown" },
          recipients: []
        };
      }
      
      if (!parsed.database_insights) {
        parsed.database_insights = {
          contact_exists: false,
          company_exists: false,
          recent_interactions: [],
          context_used: "No database context available"
        };
      }
      
      if (!parsed.examples) {
        parsed.examples = {
          similar_cases: [],
          patterns_matched: []
        };
      }
      
      if (!parsed.activated_agents) {
        parsed.activated_agents = ["basic_triage"];
      }
      
      if (!parsed.agent_prompts) {
        parsed.agent_prompts = {
          main: "Basic email triage",
          context: "No specific context",
          examples: "No examples used"
        };
      }
      
      return parsed;
    } catch (e) {
      console.error("Failed to parse JSON from OpenAI response for triage:", e);
      throw new Error("AI did not return valid JSON for triage.");
    }
  }

  async testConnection() {
    console.log('[OpenAI Test] Testing connection...');
    try {
      const res = await this._request({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say hi' }],
        max_tokens: 2
      });

      if (res.choices && res.choices.length > 0) {
        console.log('[OpenAI Test] Connection successful.');
        return { success: true, data: res };
      } else {
        throw new Error("Invalid response structure from test.");
      }
    } catch (error) {
      console.error('[OpenAI Test] Connection failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async analyzeTableForCleanup(tableName, tableData, relatedTables = {}) {
    if (!this.dbSchema) {
      throw new Error("Database schema is not set. Cannot analyze table for cleanup.");
    }

    const systemPrompt = `You are a database cleanup expert. Analyze the provided table data and suggest cleanup operations to improve data quality, remove duplicates, fix inconsistencies, and optimize relationships.

Here is the database schema you are working with:
${this.dbSchema}

### Analysis Guidelines:
1. **Duplicates**: Identify potential duplicate records based on similar names, emails, or other key fields
2. **Inconsistencies**: Find inconsistent formatting, naming conventions, or data patterns
3. **Missing Relationships**: Identify records that should be linked but aren't
4. **Data Quality**: Find incomplete, outdated, or incorrectly formatted data
5. **Optimization**: Suggest merging, updating, or reorganizing data for better structure

### Response Format:
Return a JSON object with cleanup suggestions:
{
  "analysis_summary": "Brief overview of issues found",
  "total_issues": 5,
  "cleanup_suggestions": [
    {
      "type": "merge_duplicates",
      "priority": "high",
      "description": "Merge duplicate companies: TechCorp and Tech Corp",
      "affected_records": ["Company ID 1", "Company ID 2"],
      "operations": [
        {
          "action": "update",
          "table": "contacts",
          "payload": {"company_id": 1},
          "where": {"company_id": 2}
        },
        {
          "action": "delete",
          "table": "companies",
          "where": {"id": 2}
        }
      ]
    },
    {
      "type": "fix_inconsistency",
      "priority": "medium",
      "description": "Standardize company type naming",
      "affected_records": ["Company ID 3"],
      "operations": [
        {
          "action": "update",
          "table": "companies",
          "payload": {"company_type_name": "Fintech"},
          "where": {"id": 3}
        }
      ]
    }
  ]
}

### Cleanup Types:
- "merge_duplicates": Combine duplicate records
- "fix_inconsistency": Standardize formatting or naming
- "add_missing_relationship": Link related records
- "update_incomplete_data": Fill in missing information
- "remove_orphaned_data": Clean up records with broken relationships
- "standardize_format": Fix formatting issues (emails, phone numbers, etc.)

### Priority Levels:
- "high": Critical issues affecting data integrity
- "medium": Important improvements for consistency
- "low": Minor optimizations

CRITICAL: Return only valid JSON. No explanations or other text.`;

    const userPrompt = `Analyze the ${tableName} table for cleanup opportunities.

TABLE DATA:
${JSON.stringify(tableData, null, 2)}

${Object.keys(relatedTables).length > 0 ? `
RELATED TABLES:
${Object.entries(relatedTables).map(([name, data]) => `
${name.toUpperCase()}:
${JSON.stringify(data, null, 2)}
`).join('\n')}
` : ''}

Focus on finding duplicates, inconsistencies, and data quality issues specific to this table and its relationships.`;

    const payload = {
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    };

    const result = await this._request(payload);
    
    try {
      const content = result.choices[0].message.content;
      const parsed = JSON.parse(content);
      
      // Validate the response has required fields
      if (!parsed.cleanup_suggestions || !Array.isArray(parsed.cleanup_suggestions)) {
        console.warn("AI response missing cleanup_suggestions array:", parsed);
        throw new Error("AI response missing required cleanup_suggestions field");
      }
      
      // Ensure each suggestion has required fields
      parsed.cleanup_suggestions = parsed.cleanup_suggestions.map(suggestion => ({
        type: suggestion.type || 'unknown',
        priority: suggestion.priority || 'medium',
        description: suggestion.description || 'No description provided',
        affected_records: suggestion.affected_records || [],
        operations: suggestion.operations || []
      }));
      
      return parsed;
    } catch (e) {
      console.error("Failed to parse JSON from OpenAI response for cleanup analysis:", e);
      throw new Error("AI did not return valid JSON for cleanup analysis.");
    }
  }

  async searchCompanyInfo(companyDomain) {
    // Use a web search to find recent information about the company
    const searchQuery = `${companyDomain} company news funding partnerships 2024`;
    
    try {
      // Note: In a real implementation, you'd use a proper search API like Google Custom Search, Bing Search API, etc.
      // For now, we'll use a simple fetch to a search service or return mock data
      
      // Mock implementation - replace with actual search API
      const searchResults = await this.performWebSearch(searchQuery);
      
      return `Recent information about ${companyDomain}:\n${searchResults}`;
    } catch (error) {
      console.warn(`Failed to search for company info: ${error.message}`);
      return null;
    }
  }

  async performWebSearch(query) {
    try {
      console.log(`🌐 Performing web search: ${query}`);
      
      // Use OpenAI's function calling with web search capabilities
      const searchPrompt = `Search the web for: ${query}

Please provide comprehensive search results including:
1. LinkedIn profile URLs (linkedin.com/in/...)
2. Professional information and job titles
3. Company information and affiliations
4. Any relevant professional details

Focus on finding accurate, up-to-date information from reliable sources.`;

      const payload = {
        model: this.model,
        messages: [
          { 
            role: "system", 
            content: "You are a web search assistant. Use your web search capabilities to find comprehensive, accurate information. Return structured results with URLs, titles, and relevant snippets." 
          },
          { role: "user", content: searchPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1500,
        tools: [
          {
            type: "function",
            function: {
              name: "web_search",
              description: "Search the web for current information",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The search query to execute"
                  }
                },
                required: ["query"]
              }
            }
          }
        ],
        tool_choice: "auto"
      };

      const response = await this._request(payload);
      
      // Check if the model used tools
      if (response.choices[0].message.tool_calls) {
        console.log('🔧 OpenAI used web search tools');
        // The response will contain the search results
        return this._parseWebSearchResults(response.choices[0].message.content);
      } else {
        // Fallback to content-based response
        const content = response.choices[0].message.content;
        console.log('📄 OpenAI provided direct search response');
        return this._parseWebSearchResults(content);
      }
      
    } catch (error) {
      console.warn('Web search failed:', error.message);
      
      // No fallback - only real search is supported
      
      return `Unable to search for information at this time: ${error.message}`;
    }
  }

  /**
   * Parse web search results into a structured format
   */
  _parseWebSearchResults(content) {
    try {
      // Try to extract structured information from the response
      const results = [];
      
      // Look for LinkedIn URLs in the content
      const linkedinUrls = content.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s]+/gi) || [];
      
      // Extract other structured information
      const lines = content.split('\n').filter(line => line.trim());
      
      let currentResult = null;
      for (const line of lines) {
        if (line.includes('http')) {
          if (currentResult) {
            results.push(currentResult);
          }
          currentResult = {
            url: line.match(/https?:\/\/[^\s]+/)?.[0] || '',
            title: '',
            snippet: ''
          };
        } else if (currentResult && line.trim()) {
          if (!currentResult.title) {
            currentResult.title = line.trim();
          } else {
            currentResult.snippet += line.trim() + ' ';
          }
        }
      }
      
      if (currentResult) {
        results.push(currentResult);
      }
      
      // If we found LinkedIn URLs but no structured results, create results from URLs
      if (linkedinUrls.length > 0 && results.length === 0) {
        linkedinUrls.forEach(url => {
          results.push({
            url: url,
            title: `LinkedIn Profile - ${url.split('/').pop()}`,
            snippet: 'LinkedIn professional profile'
          });
        });
      }
      
      return results.length > 0 ? results : [{ 
        url: '', 
        title: 'Search completed', 
        snippet: content.substring(0, 200) + '...' 
      }];
      
    } catch (error) {
      console.warn('Failed to parse search results:', error);
      return [{ url: '', title: 'Search Error', snippet: content }];
    }
  }


}

const openAIService = new OpenAIService();
export default openAIService; 