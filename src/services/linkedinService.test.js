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

      // Mock successful URL shortening
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('https://tinyurl.com/abc123')
      });

      const result = await linkedinService.searchLinkedInProfile(contact);
      
      expect(result.found).toBe(true);
      expect(result.originalUrl).toContain('linkedin.com/in/john');
      expect(result.shortUrl).toBe('https://tinyurl.com/abc123');
    });

    it('should handle contact with no name', async () => {
      const contact = {
        email: 'john@company.com',
        company_name: 'Tech Corp'
      };

      const result = await linkedinService.searchLinkedInProfile(contact);
      
      expect(result.found).toBe(false);
      expect(result.originalUrl).toBeNull();
      expect(result.shortUrl).toBeNull();
    });

    it('should handle URL shortening failure gracefully', async () => {
      const contact = {
        name: 'John Smith',
        email: 'john@company.com'
      };

      // Mock failed URL shortening
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await linkedinService.searchLinkedInProfile(contact);
      
      if (result.found) {
        // Should fall back to original URL if shortening fails
        expect(result.shortUrl).toBe(result.originalUrl);
      }
    });
  });

  describe('updateContactLinkedIn', () => {
    it('should update contact with LinkedIn data', async () => {
      const contactId = 123;
      const linkedinData = {
        originalUrl: 'https://linkedin.com/in/john-smith',
        shortUrl: 'https://tinyurl.com/abc123',
        found: true
      };

      supabaseService.update.mockResolvedValueOnce({ success: true });

      await linkedinService.updateContactLinkedIn(contactId, linkedinData, 'connected');

      expect(supabaseService.update).toHaveBeenCalledWith('contacts', contactId, {
        linkedin_url: 'https://tinyurl.com/abc123',
        linkedin_connection_status: 'connected'
      });
    });

    it('should handle database update errors', async () => {
      const contactId = 123;
      const linkedinData = {
        shortUrl: 'https://tinyurl.com/abc123'
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
        { id: 2, name: 'Jane Doe', email: 'jane@company.com', linkedin_url: 'existing-url' },
        { id: 3, name: 'Bob Wilson', email: 'bob@company.com' }
      ];

      supabaseService.getAll.mockResolvedValueOnce(mockContacts);
      supabaseService.update.mockResolvedValue({ success: true });

      // Mock URL shortening
      global.fetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('https://tinyurl.com/mock123')
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