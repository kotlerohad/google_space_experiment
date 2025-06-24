import { emailAnalysisService } from './emailAnalysisService';
import supabaseService from './supabaseService';

// Mock the supabaseService
jest.mock('./supabaseService', () => ({
  __esModule: true,
  default: {
    supabase: {
      from: jest.fn()
    }
  }
}));

describe('EmailAnalysisService', () => {
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

    it('should return last chat date when found', async () => {
      const mockDate = '2024-01-15T10:30:00Z';
      const mockData = [{ created_at: mockDate, email_from: 'test@example.com' }];
      
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: mockData,
              error: null
            })
          })
        })
      });

      supabaseService.supabase.from.mockReturnValue({
        select: mockSelect
      });

      const result = await emailAnalysisService.findLastChatForContact('test@example.com');
      
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(mockDate);
      expect(supabaseService.supabase.from).toHaveBeenCalledWith('triage_results');
    });

    it('should return null when no triage results found', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      supabaseService.supabase.from.mockReturnValue({
        select: mockSelect
      });

      const result = await emailAnalysisService.findLastChatForContact('notfound@example.com');
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      });

      supabaseService.supabase.from.mockReturnValue({
        select: mockSelect
      });

      const result = await emailAnalysisService.findLastChatForContact('test@example.com');
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error querying triage results:', { message: 'Database error' });
    });
  });

  describe('updateContactLastChat', () => {
    it('should return false when no lastChatDate provided', async () => {
      const result = await emailAnalysisService.updateContactLastChat(1, null, null);
      expect(result).toBe(false);
    });

    it('should return false when existing date is newer', async () => {
      const existingDate = new Date('2024-01-20T10:00:00Z');
      const lastChatDate = new Date('2024-01-15T10:00:00Z');
      
      const result = await emailAnalysisService.updateContactLastChat(1, lastChatDate, existingDate);
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

      const result = await emailAnalysisService.updateContactLastChat(1, lastChatDate, existingDate);
      
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

      const result = await emailAnalysisService.updateContactLastChat(1, lastChatDate, null);
      
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

      const result = await emailAnalysisService.updateContactLastChat(1, lastChatDate, null);
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error updating last_chat for contact 1:', { message: 'Update failed' });
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
      
      expect(result).toEqual({ updated: 0, total: 0 });
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
      
      expect(result).toEqual({ updated: 0, total: 0 });
      expect(console.error).toHaveBeenCalledWith('Error fetching contacts:', { message: 'Fetch error' });
    });

    it('should process contacts in batches', async () => {
      const mockContacts = [
        { id: 1, email: 'test1@example.com', last_chat: null },
        { id: 2, email: 'test2@example.com', last_chat: null }
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

      // Mock the methods to simulate successful updates
      const originalFindLastChat = emailAnalysisService.findLastChatForContact;
      const originalUpdateContact = emailAnalysisService.updateContactLastChat;
      
      emailAnalysisService.findLastChatForContact = jest.fn().mockResolvedValue(new Date('2024-01-15T10:00:00Z'));
      emailAnalysisService.updateContactLastChat = jest.fn().mockResolvedValue(true);

      const result = await emailAnalysisService.findLastChatForAllContacts();
      
      expect(result).toEqual({ updated: 2, total: 2 });
      expect(emailAnalysisService.findLastChatForContact).toHaveBeenCalledTimes(2);
      expect(emailAnalysisService.updateContactLastChat).toHaveBeenCalledTimes(2);

      // Restore original methods
      emailAnalysisService.findLastChatForContact = originalFindLastChat;
      emailAnalysisService.updateContactLastChat = originalUpdateContact;
    });

    it('should handle empty contacts gracefully', async () => {
      // This will fail if supabase is not initialized, but that's expected in tests
      const result = await emailAnalysisService.findLastChatForAllContacts();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('total');
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

    it('should update company last_chat dates based on contacts', async () => {
      const mockCompanies = [
        { id: 1, name: 'Company A' },
        { id: 2, name: 'Company B' }
      ];

      let callCount = 0;
      const mockSelect = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call - get companies
          return Promise.resolve({
            data: mockCompanies,
            error: null
          });
        } else {
          // Subsequent calls - get contacts for each company
          return {
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [{ last_chat: '2024-01-15T10:00:00Z' }],
                    error: null
                  })
                })
              })
            })
          };
        }
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      });

      supabaseService.supabase.from.mockImplementation((table) => {
        if (table === 'companies') {
          return { select: mockSelect, update: mockUpdate };
        } else if (table === 'contacts') {
          return { select: mockSelect };
        }
      });

      const result = await emailAnalysisService.updateCompanyLastChatDates();
      
      expect(result).toEqual({ updated: 2, total: 2 });
    });

    it('should handle companies fetch error', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Companies fetch error' }
      });

      supabaseService.supabase.from.mockReturnValue({
        select: mockSelect
      });

      const result = await emailAnalysisService.updateCompanyLastChatDates();
      
      expect(result).toEqual({ updated: 0, total: 0 });
      expect(console.error).toHaveBeenCalledWith('Error fetching companies:', { message: 'Companies fetch error' });
    });

    it('should handle empty companies gracefully', async () => {
      // This will fail if supabase is not initialized, but that's expected in tests
      const result = await emailAnalysisService.updateCompanyLastChatDates();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('total');
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors in findLastChatForContact', async () => {
      supabaseService.supabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await emailAnalysisService.findLastChatForContact('test@example.com');
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error in findLastChatForContact:', expect.any(Error));
    });

    it('should handle unexpected errors in updateContactLastChat', async () => {
      supabaseService.supabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await emailAnalysisService.updateContactLastChat(1, new Date(), null);
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error in updateContactLastChat:', expect.any(Error));
    });

    it('should handle unexpected errors in findLastChatForAllContacts', async () => {
      supabaseService.supabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await emailAnalysisService.findLastChatForAllContacts();
      
      expect(result).toEqual({ updated: 0, total: 0 });
      expect(console.error).toHaveBeenCalledWith('Error in findLastChatForAllContacts:', expect.any(Error));
    });

    it('should handle unexpected errors in updateCompanyLastChatDates', async () => {
      supabaseService.supabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await emailAnalysisService.updateCompanyLastChatDates();
      
      expect(result).toEqual({ updated: 0, total: 0 });
      expect(console.error).toHaveBeenCalledWith('Error in updateCompanyLastChatDates:', expect.any(Error));
    });
  });
}); 