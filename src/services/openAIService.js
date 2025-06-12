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
- activity_name (text, required)
- status (text)
- related_contact_id (int, foreign key to contacts.id)
- action (text)
- next_action (text)
- created_at (timestamp)

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
    
    const systemPrompt = `You are an email action decision engine. You must return a JSON object with specific action decisions, not summaries.

REQUIRED JSON FORMAT:
{
  "key_point": "Archive|Schedule|Respond|Update_Database|Review",
  "confidence": 8,
  "action_reason": "Specific actionable next step to take",
  "suggested_draft": "Draft text if action is Respond and confidence >= 7, otherwise null"
}

CRITICAL REQUIREMENTS:
- key_point: MUST be exactly one of the 5 values above
- confidence: MUST be a number 1-10 representing confidence in the ACTION decision
- action_reason: MUST be a concrete next step, NOT a summary of what happened
- Return JSON only, no explanations or other text

EXAMPLES OF GOOD action_reason:
- "Follow up in 3 days to confirm meeting time"
- "Schedule the proposed Tuesday meeting slot"
- "Archive this automated notification"
- "Update contact database with new job title"

EXAMPLES OF BAD action_reason (these are summaries, not actions):
- "John confirmed the meeting time"
- "This is a scheduling email"
- "The sender provided information"`;

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
}

const openAIService = new OpenAIService();
export default openAIService; 