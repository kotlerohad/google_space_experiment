class DebugAnalysisService {
    constructor(openAIService) {
      this.openAIService = openAIService;
    }
  
    async analyzeDebugInfo(triageResult, email) {
      const systemPrompt = `
  You are a debug analysis expert. Your task is to analyze the triage process and identify potential issues or areas for improvement.
  
  Analyze the following aspects:
  1. Input Processing
     - Were participants correctly extracted?
     - Was database context properly retrieved?
     - Were relevant examples provided?
  
  2. Agent Selection & Execution
     - Were the appropriate agents activated?
     - Were the prompts well-formed and complete?
     - Did the agents have sufficient context?
  
  3. Output Quality
     - Is the confidence score appropriate?
     - Are database actions reasonable?
     - Are draft responses appropriate?
     - Is the archive timing correct?
  
  Provide your analysis in a structured format with specific observations and recommendations.
  
  Return a JSON object with this structure:
  {
    "inputs": {
      "participants": "Analysis of participant extraction",
      "database": "Analysis of database lookup",
      "examples": "Analysis of examples provided"
    },
    "agents": {
      "selection": "Analysis of agent selection",
      "prompts": "Analysis of prompt quality"
    },
    "outputs": {
      "answer": "Analysis of answer quality and confidence",
      "databaseActions": "Analysis of database suggestions",
      "draftActions": "Analysis of draft quality",
      "archiveActions": "Analysis of archive timing"
    },
    "overall": "Overall assessment and recommendations"
  }
  `;
  
      const prompt = `
  Triage Result:
  ${JSON.stringify(triageResult, null, 2)}
  
  Email:
  Subject: ${email.subject}
  From: ${email.from}
  To: ${email.to}
  Date: ${email.date}
  Body: ${email.body}
  `;
  
      const payload = {
        model: this.openAIService.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ]
      };
  
      try {
        const result = await this.openAIService._request(payload);
        const content = result.choices[0].message.content;
        return JSON.parse(content);
      } catch (error) {
        console.error("Failed to analyze debug info:", error);
        return {
          error: "Failed to analyze debug information",
          details: error.message
        };
      }
    }
  }
  
  export default DebugAnalysisService;