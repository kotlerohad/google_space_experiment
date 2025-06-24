import { emailAnalysisService } from './emailAnalysisService';
import supabaseService from './supabaseService';
import emailService from './emailService';

// Mock the services
jest.mock('./supabaseService', () => ({
  __esModule: true,
  default: {
    supabase: {
      from: jest.fn()
    }
  }
}));

jest.mock('./emailService', () => ({
  __esModule: true,
  default: {
    searchEmails: jest.fn()
  }
}));

describe('EmailAnalysisService (Gmail-based)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('findLastChatForContact', () => {
    it('should return null for empty email', async () => {
      const result = await emailAnalysisService.findLastChatForContact('');
      expect(result).toBeNull();
    });

    it('should return null for null email', async () => {
      const result = await emailAnalysisService.findLastChatForContact(null);
      expect(result).toBeNull();
    });

    it('should return last chat date when Gmail emails found', async () => {
      const mockDate = '2024-01-15T10:30:00Z';
      const mockEmails = [
        { 
          date: mockDate, 
          from: 'test@example.com',
          subject: 'Test Email'
        }
      ];
      
      emailService.searchEmails.mockResolvedValue(mockEmails);

      const result = await emailAnalysisService.findLastChatForContact('test@example.com');
      
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(mockDate);
      expect(emailService.searchEmails).toHaveBeenCalledWith('test@example.com', 1);
    });

    it('should return null when no Gmail emails found', async () => {
      emailService.searchEmails.mockResolvedValue([]);

      const result = await emailAnalysisService.findLastChatForContact('notfound@example.com');
      expect(result).toBeNull();
    });

    it('should handle Gmail API errors gracefully', async () => {
      emailService.searchEmails.mockRejectedValue(new Error('Gmail API error'));

      const result = await emailAnalysisService.findLastChatForContact('test@example.com');
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        '❌ Error searching Gmail for test@example.com:',
        expect.any(Error)
      );
    });
  });

  describe('updateContactLastChat', () => {
    it('should return false when no lastChatDate provided', async () => {
      const result = await emailAnalysisService.updateContactLastChat(1, 'test@example.com', null, null);
      expect(result).toBe(false);
    });

    it('should return false when existing date is newer', async () => {
      const existingDate = new Date('2024-01-20T10:00:00Z');
      const lastChatDate = new Date('2024-01-15T10:00:00Z');
      
      const result = await emailAnalysisService.updateContactLastChat(1, 'test@example.com', lastChatDate, existingDate);
      expect(result).toBe(false);
    });

    it('should update contact when new date is newer', async () => {
      const existingDate = new Date('2024-01-10T10:00:00Z');
      const lastChatDate = new Date('2024-01-15T10:00:00Z');
      
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      });

      supabaseService.supabase.from.mockReturnValue({
        update: mockUpdate
      });

      const result = await emailAnalysisService.updateContactLastChat(1, 'test@example.com', lastChatDate, existingDate);
      
      expect(result).toBe(true);
      expect(supabaseService.supabase.from).toHaveBeenCalledWith('contacts');
      expect(mockUpdate).toHaveBeenCalledWith({ last_chat: lastChatDate.toISOString() });
    });

    it('should update contact when no existing date', async () => {
      const lastChatDate = new Date('2024-01-15T10:00:00Z');
      
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      });

      supabaseService.supabase.from.mockReturnValue({
        update: mockUpdate
      });

      const result = await emailAnalysisService.updateContactLastChat(1, 'test@example.com', lastChatDate, null);
      
      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({ last_chat: lastChatDate.toISOString() });
    });

    it('should handle update errors gracefully', async () => {
      const lastChatDate = new Date('2024-01-15T10:00:00Z');
      
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Update failed' }
        })
      });

      supabaseService.supabase.from.mockReturnValue({
        update: mockUpdate
      });

      const result = await emailAnalysisService.updateContactLastChat(1, 'test@example.com', lastChatDate, null);
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '❌ Error updating last_chat for contact 1 (test@example.com):',
        { message: 'Update failed' }
      );
    });
  });

  describe('findLastChatForAllContacts', () => {
    it('should return zero counts when no contacts found', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        not: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      supabaseService.supabase.from.mockReturnValue({
        select: mockSelect
      });

      const result = await emailAnalysisService.findLastChatForAllContacts();
      
      expect(result).toEqual({ updated: 0, total: 0, skipped: 0 });
    });

    it('should handle contacts fetch error', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        not: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Fetch error' }
          })
        })
      });

      supabaseService.supabase.from.mockReturnValue({
        select: mockSelect
      });

      const result = await emailAnalysisService.findLastChatForAllContacts();
      
      expect(result).toEqual({ updated: 0, total: 0, skipped: 0 });
      expect(console.error).toHaveBeenCalledWith('❌ Error fetching contacts:', { message: 'Fetch error' });
    });

    it('should process contacts and update last chat dates', async () => {
      const mockContacts = [
        { id: 1, name: 'John Doe', email: 'john@example.com', last_chat: null },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', last_chat: '2024-01-01T00:00:00Z' }
      ];

      const mockSelect = jest.fn().mockReturnValue({
        not: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({
            data: mockContacts,
            error: null
          })
        })
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      });

      supabaseService.supabase.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate
      });

      // Mock Gmail search results
      emailService.searchEmails
        .mockResolvedValueOnce([{ date: '2024-01-15T10:00:00Z', from: 'john@example.com' }])
        .mockResolvedValueOnce([{ date: '2024-01-20T10:00:00Z', from: 'jane@example.com' }]);

      const result = await emailAnalysisService.findLastChatForAllContacts();
      
      expect(result.total).toBe(2);
      expect(result.updated).toBe(2);
      expect(result.skipped).toBe(0);
      expect(emailService.searchEmails).toHaveBeenCalledTimes(2);
    });

    it('should skip contacts with no Gmail correspondence', async () => {
      const mockContacts = [
        { id: 1, name: 'John Doe', email: 'john@example.com', last_chat: null }
      ];

      const mockSelect = jest.fn().mockReturnValue({
        not: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({
            data: mockContacts,
            error: null
          })
        })
      });

      supabaseService.supabase.from.mockReturnValue({
        select: mockSelect
      });

      // Mock no Gmail emails found
      emailService.searchEmails.mockResolvedValue([]);

      const result = await emailAnalysisService.findLastChatForAllContacts();
      
      expect(result.total).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should handle Gmail API errors for individual contacts', async () => {
      const mockContacts = [
        { id: 1, name: 'John Doe', email: 'john@example.com', last_chat: null }
      ];

      const mockSelect = jest.fn().mockReturnValue({
        not: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({
            data: mockContacts,
            error: null
          })
        })
      });

      supabaseService.supabase.from.mockReturnValue({
        select: mockSelect
      });

      // Mock Gmail API error
      emailService.searchEmails.mockRejectedValue(new Error('Gmail API error'));

      const result = await emailAnalysisService.findLastChatForAllContacts();
      
      expect(result.total).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(1);
    });
  });

  describe('updateCompanyLastChatDates', () => {
    it('should return zero counts when no companies found', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: [],
        error: null
      });

      supabaseService.supabase.from.mockReturnValue({
        select: mockSelect
      });

      const result = await emailAnalysisService.updateCompanyLastChatDates();
      
      expect(result).toEqual({ updated: 0, total: 0 });
    });

    it('should update company last_chat based on contact dates', async () => {
      const mockCompanies = [
        { id: 1, name: 'Company A' },
        { id: 2, name: 'Company B' }
      ];

      const mockContacts = [
        { last_chat: '2024-01-15T10:00:00Z' }
      ];

      const mockSelect = jest.fn()
        .mockResolvedValueOnce({ data: mockCompanies, error: null })
        .mockResolvedValueOnce({ data: mockContacts, error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      });

      supabaseService.supabase.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate
      });

      const result = await emailAnalysisService.updateCompanyLastChatDates();
      
      expect(result.total).toBe(2);
      expect(result.updated).toBe(1);
    });

    it('should handle company update errors gracefully', async () => {
      const mockCompanies = [{ id: 1, name: 'Company A' }];
      const mockContacts = [{ last_chat: '2024-01-15T10:00:00Z' }];

      const mockSelect = jest.fn()
        .mockResolvedValueOnce({ data: mockCompanies, error: null })
        .mockResolvedValueOnce({ data: mockContacts, error: null });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Update failed' }
        })
      });

      supabaseService.supabase.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate
      });

      const result = await emailAnalysisService.updateCompanyLastChatDates();
      
      expect(result.total).toBe(1);
      expect(result.updated).toBe(0);
      expect(console.error).toHaveBeenCalledWith(
        '❌ Error updating company 1 last_chat:',
        { message: 'Update failed' }
      );
    });
  });
}); 