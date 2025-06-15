import openAIService from './openAIService';

describe('Triage Integration', () => {
  beforeAll(() => {
    // Ensure API key is set from environment
    const envKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (envKey) {
      openAIService.setApiKey(envKey);
    }
  });

  test('should complete full triage flow without API key errors', async () => {
    const envKey = process.env.REACT_APP_OPENAI_API_KEY;
    
    // Skip test if no API key (but don't use conditional expects)
    if (!envKey) {
      console.warn('Skipping integration test - no API key available');
      return;
    }

    // Simulate the exact scenario from EmailList.jsx
    const mockEmail = {
      id: 'test-email-123',
      from: 'john.doe@techcorp.com',
      subject: 'Re: Partnership Discussion',
      body: 'Hi, I wanted to follow up on our conversation about the potential partnership. Could we schedule a meeting next week to discuss the details?',
      date: new Date().toISOString(),
      snippet: 'Hi, I wanted to follow up on our conversation...'
    };

    const triageLogic = `You are an expert email triage assistant. Based on the email content, provide a concise summary and categorize it. Then, suggest relevant next actions. For scheduling-related emails, always suggest checking the calendar.`;

    console.log('🧪 Testing triage with API key:', openAIService.apiKey ? 'Set' : 'Not set');
    
    const result = await openAIService.triageEmail(mockEmail, triageLogic);
    
    // Verify the result structure
    expect(result).toBeDefined();
    expect(result.key_point).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(result.action_reason).toBeDefined();
    
    // Verify debug information is present
    expect(result.participants).toBeDefined();
    expect(result.database_insights).toBeDefined();
    expect(result.examples).toBeDefined();
    expect(result.activated_agents).toBeDefined();
    expect(result.agent_prompts).toBeDefined();
    
    console.log('✅ Triage completed successfully:', {
      key_point: result.key_point,
      confidence: result.confidence,
      hasParticipants: !!result.participants,
      hasDebugInfo: !!(result.database_insights && result.examples)
    });
  }, 60000); // 60 second timeout

  test('should handle API key not set scenario gracefully', async () => {
    // Temporarily remove API key
    const originalKey = openAIService.apiKey;
    openAIService.apiKey = null;

    const mockEmail = {
      from: 'test@example.com',
      subject: 'Test',
      body: 'Test email'
    };

    await expect(openAIService.triageEmail(mockEmail, 'Test logic'))
      .rejects.toThrow('OpenAI API key is not set.');
    
    // Restore API key
    openAIService.apiKey = originalKey;
  });
}); 