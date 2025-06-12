class GeminiService {
  constructor() {
    this.apiKey = '';
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      lastRequestTime: null,
      responseTimes: []
    };
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  emitLLMEvent(type, data) {
    // Emit custom event for LLM communication logging
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('llm-communication', {
        detail: { type, data }
      }));
    }
  }

  async makeRequest(prompt, schema = null) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    if (schema) {
      payload.generationConfig = {
        responseMimeType: "application/json",
        responseSchema: schema
      };
    }

    // Log the request
    this.emitLLMEvent('request', {
      service: 'Gemini',
      prompt: prompt.length > 500 ? prompt.substring(0, 500) + '...' : prompt,
      schema: schema,
      metadata: { apiUrl, model: 'gemini-2.0-flash' }
    });

    const startTime = Date.now();
    this.stats.totalRequests++;
    this.stats.lastRequestTime = new Date();

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.stats.failedRequests++;
        this.emitLLMEvent('error', { service: 'Gemini', error: `API Error: ${response.status}`, metadata: { responseText: errorText } });
        throw new Error(`Gemini API call failed with HTTP status ${response.status}. Response: ${errorText}`);
      }

      const result = await response.json();
      const responseTime = Date.now() - startTime;

      if (!result.candidates || result.candidates.length === 0) {
        throw new Error('Gemini API did not return any candidates.');
      }
      
      const candidate = result.candidates[0];
      const text = candidate.content?.parts[0]?.text;

      if (!text) {
        throw new Error('Gemini API response is missing text content.');
      }

      this.stats.successfulRequests++;
      this.stats.responseTimes.push(responseTime);
      this.stats.averageResponseTime = this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length;

      // If a schema is expected, always try to parse as JSON.
      if (schema) {
        try {
          const cleanedText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          const parsedResponse = JSON.parse(cleanedText);
          this.emitLLMEvent('response', { service: 'Gemini', response: parsedResponse, metadata: { responseType: 'JSON' } });
          return parsedResponse;
        } catch (parseError) {
          this.emitLLMEvent('error', { service: 'Gemini', error: 'JSON Parse Error', metadata: { rawText: text } });
          throw new Error(`AI did not return valid JSON. Output: ${text}`);
        }
      }
      
      // Otherwise, return plain text.
      this.emitLLMEvent('response', { service: 'Gemini', response: text, metadata: { responseType: 'text' } });
      return text;
    } catch (error) {
      this.stats.failedRequests++;
      this.emitLLMEvent('error', { service: 'Gemini', error: error.message });
      throw error;
    }
  }

  async generateText(prompt) {
    return this.makeRequest(prompt);
  }

  // Email Triage specific methods
  async triageEmail(email, triageLogic) {
    const prompt = `${triageLogic}\n\n--- EMAIL CONTENT ---\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`;
    
    const schema = {
      type: "OBJECT",
      properties: {
        summary: { type: "STRING" },
        key_point: { type: "STRING" },
        confidence: { type: "NUMBER" },
        suggested_draft: { type: "STRING" },
      },
      required: ["summary", "key_point", "confidence"]
    };

    return this.makeRequest(prompt, schema);
  }

  // Monday.com Integration specific methods
  async analyzeMondayIntent(prompt, contextBoards) {
    const intentPrompt = `You are an intelligent assistant for Monday.com. Your goal is to interpret user requests and extract the necessary parameters for Monday.com API calls. If you need to search for an item or column by name, specify the name and relevant properties for lookup.

${contextBoards}

Based on the following request, identify the Monday.com action, the target board for the action, and details about the entity to identify (if the action is not 'create_item'). Return the result as a JSON object. If a field is not applicable or cannot be confidently determined from the prompt alone, omit it.

**Instructions for AI (Stage 1):**
- **action**: The type of Monday.com action.
- **targetBoardForAction**: The board where the final action should occur (name or ID). This is crucial.
- **itemName**: For 'create_item' action, or the new name for 'update_item_name'.
- **entityToIdentify**: This object describes the item the user wants to target.
    - **type**: Infer the entity type (e.g., 'contact', 'activity', 'company', 'item').
    - **properties**: Key-value pairs describing the entity (e.g., {name: 'George', company: 'Alphabak'}, {name: 'Website Redesign'}).
- **updates**: For 'update_column_value', an array of column updates. Each update should have:
    - **columnId**: Numerical ID if explicit.
    - **columnNameToLookup**: Name if provided.
    - **newValue**: The value to set.
- **Fail fast**: If a required field cannot be determined, omit it.

**Current Request:**
"${prompt}"`;

    const schema = {
      type: "OBJECT",
      properties: {
        "action": { "type": "STRING", "enum": ["create_item", "update_item_name", "update_column_value"] },
        "targetBoardForAction": { "type": "STRING" },
        "itemName": { "type": "STRING" },
        "entityToIdentify": {
          "type": "OBJECT",
          "properties": {
            "type": { "type": "STRING", "enum": ["contact", "activity", "company", "item"] },
            "properties": {
              "type": "OBJECT",
              "properties": {
                "name": { "type": "STRING" },
                "company": { "type": "STRING" },
                "email": { "type": "STRING" },
                "phone": { "type": "STRING" },
                "status": { "type": "STRING" },
                "description": { "type": "STRING" }
              }
            }
          },
          "required": ["type", "properties"]
        },
        "updates": {
          "type": "ARRAY",
          "items": {
            "type": "OBJECT",
            "properties": {
              "columnId": { "type": "STRING" },
              "columnNameToLookup": { "type": "STRING" },
              "newValue": { "type": "STRING" }
            },
            "required": ["newValue"]
          }
        }
      },
      "required": ["action", "targetBoardForAction"]
    };

    return await this.makeRequest(intentPrompt, schema);
  }

  async selectBestItem(originalPrompt, itemsToChooseFrom, entityProperties) {
    const simplifiedItems = itemsToChooseFrom.map(item => {
      const simpleItem = { id: item.id, name: item.name };
      item.column_values.forEach(col => {
        if (['Company Name', 'Related Contact', 'Activity Name', 'Name', 'Company', 'Email'].includes(col.title)) {
          simpleItem[col.title.toLowerCase().replace(/\s/g, '')] = col.text || '';
        }
      });
      return simpleItem;
    }).slice(0, 50);

    const prompt = `The user's original request was: "${originalPrompt}"

I have retrieved the following items from Monday.com. Each item has an 'id', 'name', and other column values.

Available Items (JSON array):
${JSON.stringify(simplifiedItems, null, 2)}

The target entity to identify has these properties (JSON object):
${JSON.stringify(entityProperties, null, 2)}

Please return ONLY the 'id' of the single best matching item from the 'Available Items' list based on the user's original request and the target entity's properties. If no item perfectly matches the intent, return 'null'. Consider both the item's name and its column values for a match.`;

    const schema = {
      type: "OBJECT",
      properties: {
        "bestMatchItemId": { "type": "STRING", "nullable": true }
      }
    };

    const result = await this.makeRequest(prompt, schema);
    return result.bestMatchItemId;
  }

  // Enhanced email triage with Monday.com action detection
  async triageEmailWithMondayActions(email, triageLogic, mondayBoardSchemas) {
    const prompt = `${triageLogic}

MONDAY.COM CONTEXT:
${mondayBoardSchemas}

Analyze this email and provide:
1. Standard triage (category, summary)
2. Standard actions (Gmail, Calendar, Human)
3. Monday.com action opportunities with confidence scores
4. Specific board/item recommendations based on content

--- EMAIL CONTENT ---
From: ${email.from}
Subject: ${email.subject}

${email.body}`;

    const schema = {
      type: "OBJECT",
      properties: {
        "category": { "type": "STRING" },
        "summary": { "type": "STRING" },
        "actions": {
          "type": "OBJECT",
          "properties": {
            "Gmail": { "type": "ARRAY", "items": { "type": "STRING" } },
            "Calendar": { "type": "ARRAY", "items": { "type": "STRING" } },
            "Human": { "type": "ARRAY", "items": { "type": "STRING" } },
            "Monday.com": {
              "type": "ARRAY",
              "items": {
                "type": "OBJECT", 
                "properties": {
                  "action": { "type": "STRING" },
                  "confidence": { "type": "NUMBER" },
                  "description": { "type": "STRING" },
                  "targetBoard": { "type": "STRING" },
                  "details": { "type": "STRING" }
                }
              }
            }
          }
        }
      },
      required: ["category", "summary", "actions"]
    };

    return await this.makeRequest(prompt, schema);
  }

  async testConnection() {
    const testPrompt = "Hello, Gemini! What's 2+2?";
    try {
      const result = await this.makeRequest(testPrompt);
      return { success: true, response: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getStats() {
    return this.stats;
  }

  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      lastRequestTime: null,
      responseTimes: []
    };
  }
}

const geminiService = new GeminiService();
module.exports = geminiService; 