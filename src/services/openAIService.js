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
- created_at (timestamp)

### companies
- id (int, primary key)
- name (text, required)
- country (text)
- status (text)
- company_type_id (int, foreign key to company_types.id)
- priority (int)
- number_of_employees (int)
- number_of_developers (int)
- potential_arr_eur (decimal)
- created_at (timestamp)
- updated_at (timestamp)

### activities
- id (int, primary key)
- name (text, required)
- status (text)
- description (text)
- relationship_type_id (int, foreign key to relationship_types.id)
- priority (int)
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
- Use "action" not "operation" as the field name.`;

    const payload = {
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInstruction }
      ]
    };

    const result = await this._request(payload);
    
    try {
      const content = result.choices[0].message.content;
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse JSON from OpenAI response:", e);
      throw new Error("AI did not return a valid JSON object of operations.");
    }
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
    // This method would be called from the browser environment
    // We'll emit an event that the frontend can listen to and perform the search
    
    try {
      // Emit a search request event
      this.emitLLMEvent('search_request', { query });
      
      // In a real implementation, this would wait for the search results
      // For now, we'll return a placeholder that indicates search is happening
      return `Searching for recent information about this company...`;
    } catch (error) {
      console.warn('Web search failed:', error.message);
      return `Unable to search for company information at this time.`;
    }
  }
}

const openAIService = new OpenAIService();
export default openAIService; 