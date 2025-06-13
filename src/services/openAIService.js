class OpenAIService {
  constructor() {
    this.apiKey = null;
    this.model = 'gpt-4o';
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
    
    const systemPrompt = `You are an email action decision engine with database management capabilities. You must return a JSON object with both action decisions AND database entry suggestions.

REQUIRED JSON FORMAT:
{
  "key_point": "Archive|Schedule|Respond|Update_Database|Review",
  "confidence": 8,
  "action_reason": "Specific actionable next step to take",
  "suggested_draft": "Draft text if action is Respond and confidence >= 7, otherwise null",
  "suggested_draft_pushy": "More assertive draft pushing for next steps (scheduling, decisions, etc.)",
  "suggested_draft_exploratory": "More exploratory draft asking questions and gathering information",
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
      },
      {
        "type": "company", 
        "description": "Add TechCorp as a potential fintech partner",
        "data": {
          "name": "TechCorp",
          "company_type_name": "Fintech",
          "country": "USA"
        }
      },
      {
        "type": "activity",
        "description": "Track follow-up meeting with TechCorp",
        "data": {
          "name": "TechCorp Partnership Discussion",
          "status": "Pending",
          "description": "Follow up on partnership opportunities discussed in email",
          "priority": 1
        }
      }
    ]
  }
}

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

DRAFT CREATION FOR SCHEDULING:
- Start with a professional greeting
- Acknowledge the meeting request
- Provide 2-3 specific available time options when calendar data is available
- Include meeting duration if mentioned in original email
- End with a request for confirmation
- Keep tone professional but friendly

DUAL DRAFT CREATION:
- suggested_draft: Use this for the primary/default draft (backward compatibility)
- suggested_draft_pushy: More assertive, action-oriented draft that pushes for next steps
  * For scheduling: Offer specific times and ask for immediate confirmation
  * For business discussions: Push for decisions, next meetings, or commitments
  * Use phrases like "I'd like to move forward with...", "Let's schedule...", "Can we confirm..."
- suggested_draft_exploratory: More open-ended, information-gathering draft
  * Ask clarifying questions about their needs, timeline, or requirements
  * Explore potential collaboration areas or understand their situation better
  * Use phrases like "Could you tell me more about...", "I'm curious about...", "What are your thoughts on..."

DUAL DRAFT GENERATION RULES:
- Generate BOTH pushy and exploratory drafts when key_point is "Respond" AND confidence >= 4
- Even for uncertain responses (confidence 4-6), provide both draft options for user review
- This is low cost, high value since user reviews all drafts before sending
- For confidence < 4, focus on explaining uncertainty rather than drafting responses

EXAMPLE DUAL DRAFTS:
Pushy: "Hi [Name], I'd like to schedule our discussion about [topic]. I have these times available: [times]. Can we confirm one of these slots by end of day?"

Exploratory: "Hi [Name], Thank you for reaching out about [topic]. Could you tell me more about your specific needs and timeline? I'd love to understand how we might collaborate effectively."

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
- action_reason: MUST be a concrete next step, NOT a summary of what happened
- suggested_draft_pushy: REQUIRED when key_point is "Respond" AND confidence >= 4
- suggested_draft_exploratory: REQUIRED when key_point is "Respond" AND confidence >= 4
- suggested_draft: Use for backward compatibility (can be same as pushy or exploratory)
- database_suggestions: ALWAYS include this object, even if has_business_relevance is false
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
        { role: "user", content: prompt }
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
}

const openAIService = new OpenAIService();
export default openAIService; 