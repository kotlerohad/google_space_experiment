import openAIService from './openAIService';

describe('OpenAI Service', () => {
  beforeEach(() => {
    // Reset the service state before each test
    openAIService.apiKey = null;
  });

  test('should set API key correctly', () => {
    const testKey = 'sk-test-key-123';
    openAIService.setApiKey(testKey);
    expect(openAIService.apiKey).toBe(testKey);
  });

  test('should throw error when API key is not set', async () => {
    await expect(openAIService._request({})).rejects.toThrow('OpenAI API key is not set.');
  });

  test('should have API key from environment', () => {
    // This test checks if the API key is available from environment
    const envKey = process.env.REACT_APP_OPENAI_API_KEY;
    expect(envKey).toBeDefined();
    expect(envKey).toMatch(/^sk-/);
  });

  test('should initialize with environment API key in real app', () => {
    // Simulate what happens in AppContext
    const envKey = process.env.REACT_APP_OPENAI_API_KEY;
    
    // Always test the behavior regardless of environment
    expect(envKey).toBeDefined(); // We know this should be set in our test environment
    
    openAIService.setApiKey(envKey);
    expect(openAIService.apiKey).toBe(envKey);
  });

  test('should validate triage email response structure', async () => {
    const envKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!envKey) {
      console.warn('Skipping API test - no API key available');
      return;
    }

    openAIService.setApiKey(envKey);
    
    const mockEmail = {
      from: 'test@example.com',
      subject: 'Test Email',
      body: 'This is a test email for triage.'
    };

    const mockTriageLogic = 'Analyze this email and provide a JSON response.';

    try {
      const result = await openAIService.triageEmail(mockEmail, mockTriageLogic);
      
      // Verify required fields exist
      expect(result).toHaveProperty('key_point');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('action_reason');
      expect(result).toHaveProperty('participants');
      expect(result).toHaveProperty('database_insights');
      expect(result).toHaveProperty('examples');
      expect(result).toHaveProperty('activated_agents');
      expect(result).toHaveProperty('agent_prompts');
      
      // Verify confidence is a number
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(1);
      expect(result.confidence).toBeLessThanOrEqual(10);
      
    } catch (error) {
      console.error('Triage test failed:', error);
      throw error;
    }
  }, 30000); // 30 second timeout for API calls
}); 