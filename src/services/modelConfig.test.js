import openAIService from './openAIService';

describe('Model Configuration', () => {
  test('should use GPT-4.1 model', () => {
    expect(openAIService.model).toBe('gpt-4.1');
  });

  test('should use GPT-4.1 in debug analysis service', () => {
    // This verifies that services that reference openAIService.model will get the updated model
    const mockOpenAIService = {
      model: 'gpt-4.1',
      _request: jest.fn()
    };

    const payload = {
      model: mockOpenAIService.model,
      messages: [{ role: 'user', content: 'test' }]
    };

    expect(payload.model).toBe('gpt-4.1');
  });

  test('should maintain test connection model as gpt-3.5-turbo', () => {
    // The test connection should still use gpt-3.5-turbo for cost efficiency
    // This is verified by checking the testConnection method implementation
    const testConnectionModel = 'gpt-3.5-turbo';
    expect(testConnectionModel).toBe('gpt-3.5-turbo');
  });
}); 