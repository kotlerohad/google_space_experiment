import linkedinService from './linkedinService';

// Mock supabaseService
jest.mock('./supabaseService', () => ({
  update: jest.fn(),
  getAll: jest.fn(),
}));

import supabaseService from './supabaseService';

describe('LinkedInService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch for URL shortening
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getConnectionStatusEmoji', () => {
    it('should return correct emojis for each status', () => {
      expect(linkedinService.getConnectionStatusEmoji('connected')).toBe('✅');
      expect(linkedinService.getConnectionStatusEmoji('not_connected')).toBe('❌');
      expect(linkedinService.getConnectionStatusEmoji('unknown')).toBe('❓');
      expect(linkedinService.getConnectionStatusEmoji('sent_message_no_response')).toBe('📩');
      expect(linkedinService.getConnectionStatusEmoji('invalid_status')).toBe('❓');
    });
  });

  describe('getConnectionStatusText', () => {
    it('should return correct text for each status', () => {
      expect(linkedinService.getConnectionStatusText('connected')).toBe('Connected');
      expect(linkedinService.getConnectionStatusText('not_connected')).toBe('Not Connected');
      expect(linkedinService.getConnectionStatusText('unknown')).toBe('Unknown');
      expect(linkedinService.getConnectionStatusText('sent_message_no_response')).toBe('Message Sent (No Response)');
      expect(linkedinService.getConnectionStatusText('invalid_status')).toBe('Unknown');
    });
  });

  describe('searchLinkedInProfile', () => {
    it('should generate LinkedIn URL for valid contact', async () => {
      const contact = {
        name: 'John Smith',
        email: 'john@company.com',
        company_name: 'Tech Corp',
        title: 'Software Engineer'
      };

      // Mock OpenAI service for real search
      linkedinService.setOpenAIService({
        performWebSearch: jest.fn().mockResolvedValue([
          {
            url: 'https://www.linkedin.com/in/john-smith',
            title: 'John Smith - Software Engineer',
            snippet: 'Software Engineer at Tech Corp'
          }
        ]),
        _request: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'https://www.linkedin.com/in/john-smith' } }]
        })
      });

      const result = await linkedinService.searchLinkedInProfile(contact);
      
      expect(result.found).toBe(true);
      expect(result.originalUrl).toBe('https://www.linkedin.com/in/john-smith');
    });

    it('should handle contact with no name', async () => {
      const contact = {
        email: 'john@company.com',
        company_name: 'Tech Corp'
      };

      // Mock OpenAI service
      linkedinService.setOpenAIService({
        performWebSearch: jest.fn(),
        _request: jest.fn()
      });

      const result = await linkedinService.searchLinkedInProfile(contact);
      
      expect(result.found).toBe(false);
      expect(result.originalUrl).toBeNull();
    });

    it('should handle OpenAI service errors gracefully', async () => {
      const contact = {
        name: 'John Smith',
        email: 'john@company.com'
      };

      // Mock OpenAI service with error
      linkedinService.setOpenAIService({
        performWebSearch: jest.fn().mockRejectedValue(new Error('Search failed')),
        _request: jest.fn()
      });

      const result = await linkedinService.searchLinkedInProfile(contact);
      
      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateContactLinkedIn', () => {
    it('should update contact with LinkedIn data', async () => {
      const contactId = 123;
      const linkedinData = {
        originalUrl: 'https://www.linkedin.com/in/john-smith',
        found: true
      };

      supabaseService.update.mockResolvedValueOnce({ success: true });

      await linkedinService.updateContactLinkedIn(contactId, linkedinData, 'connected');

      expect(supabaseService.update).toHaveBeenCalledWith('contacts', contactId, {
        linkedin: 'https://www.linkedin.com/in/john-smith',
        linkedin_connection_status: 'connected'
      });
    });

    it('should handle database update errors', async () => {
      const contactId = 123;
      const linkedinData = {
        originalUrl: 'https://www.linkedin.com/in/john-smith',
        found: true
      };

      supabaseService.update.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        linkedinService.updateContactLinkedIn(contactId, linkedinData)
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateConnectionStatus', () => {
    it('should update connection status for valid status', async () => {
      const contactId = 123;
      const status = 'connected';

      supabaseService.update.mockResolvedValueOnce({ success: true });

      await linkedinService.updateConnectionStatus(contactId, status);

      expect(supabaseService.update).toHaveBeenCalledWith('contacts', contactId, {
        linkedin_connection_status: 'connected'
      });
    });

    it('should reject invalid connection status', async () => {
      const contactId = 123;
      const status = 'invalid_status';

      await expect(
        linkedinService.updateConnectionStatus(contactId, status)
      ).rejects.toThrow('Invalid connection status');
    });
  });

  describe('findLinkedInForAllContacts', () => {
    it('should process all contacts and return results', async () => {
      const mockContacts = [
        { id: 1, name: 'John Smith', email: 'john@company.com' },
        { id: 2, name: 'Jane Doe', email: 'jane@company.com', linkedin: 'existing-url' },
        { id: 3, name: 'Bob Wilson', email: 'bob@company.com' }
      ];

      supabaseService.getAll.mockResolvedValueOnce(mockContacts);
      supabaseService.update.mockResolvedValue({ success: true });

      // Mock OpenAI service for real search
      linkedinService.setOpenAIService({
        performWebSearch: jest.fn().mockResolvedValue([
          {
            url: 'https://www.linkedin.com/in/john-smith',
            title: 'John Smith Profile',
            snippet: 'Professional profile'
          }
        ]),
        _request: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'https://www.linkedin.com/in/john-smith' } }]
        })
      });

      const mockProgressCallback = jest.fn();
      const results = await linkedinService.findLinkedInForAllContacts(mockProgressCallback);

      expect(results.total).toBe(3);
      expect(results.skipped).toBe(1); // Jane Doe already has LinkedIn URL
      expect(mockProgressCallback).toHaveBeenCalled();
    });

    it('should handle errors during batch processing', async () => {
      const mockContacts = [
        { id: 1, name: 'John Smith', email: 'john@company.com' }
      ];

      supabaseService.getAll.mockResolvedValueOnce(mockContacts);
      supabaseService.update.mockRejectedValueOnce(new Error('Update failed'));

      // Mock OpenAI service for real search
      linkedinService.setOpenAIService({
        performWebSearch: jest.fn().mockResolvedValue([
          {
            url: 'https://www.linkedin.com/in/john-smith',
            title: 'John Smith Profile',
            snippet: 'Professional profile'
          }
        ]),
        _request: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'https://www.linkedin.com/in/john-smith' } }]
        })
      });

      const results = await linkedinService.findLinkedInForAllContacts();

      expect(results.errors).toBeGreaterThan(0);
    });
  });

  describe('_buildSearchQuery', () => {
    it('should build comprehensive search query', () => {
      const contact = {
        name: 'John Smith',
        company_name: 'Tech Corp',
        title: 'Software Engineer'
      };

      const query = linkedinService._buildSearchQuery(contact);
      
      expect(query).toBe('John Smith Tech Corp Software Engineer');
    });

    it('should handle missing fields', () => {
      const contact = {
        name: 'John Smith',
        company_name: 'No Company'
      };

      const query = linkedinService._buildSearchQuery(contact);
      
      expect(query).toBe('John Smith');
    });

    it('should handle empty contact', () => {
      const contact = {};

      const query = linkedinService._buildSearchQuery(contact);
      
      expect(query).toBe('');
    });
  });
});