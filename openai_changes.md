# OpenAI Integration Changes

This document outlines the necessary changes to integrate the OpenAI API into the application, separating them from the recent UI modifications.

## 1. New Service: `openAIService.js`

Create a new file at `src/services/openAIService.js` with the following content. This service will handle all communications with the OpenAI API.

```javascript
class OpenAIService {
  constructor() {
    this.apiKey = null;
    this.model = 'gpt-4o';
    this.dbSchema = ''; // To be set by the App
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

### Instructions for AI
- Generate operations for MULTIPLE tables if the user's request requires it.
- For lookups (e.g., finding a company_type_id for "Investor"), use a special "_name" suffix for the field (e.g., "company_type_name": "Investor"). The backend will handle the ID lookup.
- For "UPDATE" or "DELETE", you must provide a "where" clause in the payload.
- Always return an array of operation objects. If no operations can be determined, return an empty array.`;

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
    
    const systemPrompt = `You are an email triaging expert. Analyze the email content based on the user's logic and return a structured JSON response.`;

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
      return JSON.parse(content);
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