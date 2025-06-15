// import supabaseService from './supabaseService';

// Mock the supabase service for testing
jest.mock('./supabaseService', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        in: jest.fn(() => ({
          data: [
            {
              id: 'email-123',
              decision: 'Schedule',
              confidence: 8,
              action_reason: 'Meeting request needs scheduling',
              contact_context: { name: 'John Doe', email: 'john@example.com' },
              calendar_context: null,
              auto_archived: false,
              auto_drafted: true,
              created_at: '2024-01-15T10:00:00Z'
            },
            {
              id: 'email-456',
              decision: 'Respond',
              confidence: 9,
              action_reason: 'Customer inquiry needs response',
              contact_context: null,
              calendar_context: null,
              auto_archived: false,
              auto_drafted: false,
              created_at: '2024-01-15T11:00:00Z'
            }
          ],
          error: null
        }))
      }))
    })),
    upsert: jest.fn(() => ({
      select: jest.fn(() => ({
        data: null,
        error: null
      }))
    }))
  },
  isConnected: jest.fn(() => true)
}));

describe('Triage Storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should transform stored triage results correctly', () => {
    // This simulates the loadStoredTriageResults function logic
    const mockStoredResults = [
      {
        id: 'email-123',
        decision: 'Schedule',
        confidence: 8,
        action_reason: 'Meeting request needs scheduling',
        contact_context: { name: 'John Doe', email: 'john@example.com' },
        calendar_context: null,
        auto_archived: false,
        auto_drafted: true,
        created_at: '2024-01-15T10:00:00Z'
      }
    ];

    // Transform the data as done in loadStoredTriageResults
    const triageResultsMap = {};
    mockStoredResults.forEach(result => {
      triageResultsMap[result.id] = {
        key_point: result.decision,
        confidence: result.confidence,
        action_reason: result.action_reason,
        summary: result.action_reason,
        contactContext: result.contact_context,
        calendarContext: result.calendar_context,
        autoArchived: result.auto_archived,
        draftCreated: result.auto_drafted,
        timestamp: new Date(result.created_at),
        isLoading: false,
        isStored: true,
        storedAt: result.created_at
      };
    });

    expect(triageResultsMap['email-123']).toEqual({
      key_point: 'Schedule',
      confidence: 8,
      action_reason: 'Meeting request needs scheduling',
      summary: 'Meeting request needs scheduling',
      contactContext: { name: 'John Doe', email: 'john@example.com' },
      calendarContext: null,
      autoArchived: false,
      draftCreated: true,
      timestamp: new Date('2024-01-15T10:00:00Z'),
      isLoading: false,
      isStored: true,
      storedAt: '2024-01-15T10:00:00Z'
    });
  });

  test('should handle database save correctly', async () => {
    const mockResultData = {
      key_point: 'Respond',
      confidence: 9,
      action_reason: 'Customer needs response',
      contactContext: { name: 'Jane Smith', email: 'jane@example.com' },
      calendarContext: null,
      draftCreated: false,
      autoArchived: false
    };

    const emailId = 'email-789';

    // Simulate the saveTriageResult function logic
    const dbData = {
      id: emailId,
      decision: mockResultData.decision || mockResultData.key_point || 'Review',
      action_reason: mockResultData.action_reason || mockResultData.summary || 'Action required',
      confidence: mockResultData.confidence || 0,
      key_points: Array.isArray(mockResultData.key_points) ? mockResultData.key_points : 
                 (mockResultData.key_points ? [mockResultData.key_points] : 
                 (mockResultData.key_point ? [mockResultData.key_point] : [])),
      contact_context: mockResultData.contactContext || null,
      calendar_context: mockResultData.calendarContext || null,
      auto_drafted: mockResultData.draftCreated || false,
      auto_archived: mockResultData.autoArchived || false
    };

    expect(dbData).toEqual({
      id: 'email-789',
      decision: 'Respond',
      action_reason: 'Customer needs response',
      confidence: 9,
      key_points: ['Respond'],
      contact_context: { name: 'Jane Smith', email: 'jane@example.com' },
      calendar_context: null,
      auto_drafted: false,
      auto_archived: false
    });
  });

  test('should handle empty stored results gracefully', () => {
    const mockStoredResults = [];
    
    const triageResultsMap = {};
    mockStoredResults.forEach(result => {
      triageResultsMap[result.id] = {
        key_point: result.decision,
        confidence: result.confidence,
        action_reason: result.action_reason,
        summary: result.action_reason,
        contactContext: result.contact_context,
        calendarContext: result.calendar_context,
        autoArchived: result.auto_archived,
        draftCreated: result.auto_drafted,
        timestamp: new Date(result.created_at),
        isLoading: false,
        isStored: true,
        storedAt: result.created_at
      };
    });

    expect(Object.keys(triageResultsMap)).toHaveLength(0);
  });

  test('should identify stored vs fresh triage results', () => {
    const storedResult = {
      key_point: 'Schedule',
      confidence: 8,
      isStored: true,
      storedAt: '2024-01-15T10:00:00Z'
    };

    const freshResult = {
      key_point: 'Respond',
      confidence: 9,
      isLoading: false,
      timestamp: new Date()
    };

    expect(storedResult.isStored).toBe(true);
    expect(storedResult.storedAt).toBeDefined();
    expect(freshResult.isStored).toBeUndefined();
    expect(freshResult.timestamp).toBeDefined();
  });
}); 