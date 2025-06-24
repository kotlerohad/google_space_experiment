import supabaseService from './supabaseService';

// Mock the Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      update: jest.fn(() => Promise.resolve({ data: [], error: null })),
      delete: jest.fn(() => Promise.resolve({ error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        select: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      match: jest.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}));

describe('SupabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  describe('Import/Export functionality', () => {
    it('should be importable as default export', () => {
      expect(supabaseService).toBeDefined();
      expect(typeof supabaseService).toBe('object');
    });

    it('should have all required methods', () => {
      expect(typeof supabaseService.initialize).toBe('function');
      expect(typeof supabaseService.isConnected).toBe('function');
      expect(typeof supabaseService.testConnection).toBe('function');
      expect(typeof supabaseService.getCompanies).toBe('function');
      expect(typeof supabaseService.getContacts).toBe('function');
      expect(typeof supabaseService.getActivities).toBe('function');
      expect(typeof supabaseService.deleteCompanyById).toBe('function');
    });

    it('should have supabase client property', () => {
      expect(supabaseService.supabase).toBeDefined();
    });
  });

  describe('Initialization', () => {
    it('should initialize with valid credentials', () => {
      const mockUrl = 'https://test.supabase.co';
      const mockKey = 'test-key-123';
      
      supabaseService.initialize(mockUrl, mockKey);
      
      expect(supabaseService.isInitialized).toBe(true);
      expect(supabaseService.supabaseUrl).toBe(mockUrl);
      expect(supabaseService.supabaseKey).toBe(mockKey);
    });

    it('should not initialize with missing credentials', () => {
      supabaseService.initialize('', '');
      
      expect(supabaseService.isInitialized).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        'Supabase URL or Key is missing. Supabase client not initialized.'
      );
    });

    it('should not initialize with placeholder credentials', () => {
      supabaseService.initialize(
        'https://your_supabase_url_here.supabase.co',
        'your_supabase_key_here'
      );
      
      expect(supabaseService.isInitialized).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Supabase credentials contain placeholder values!'
      );
    });

    it('should prevent re-initialization with same credentials', () => {
      const mockUrl = 'https://test.supabase.co';
      const mockKey = 'test-key-123';
      
      // First initialization
      supabaseService.initialize(mockUrl, mockKey);
      expect(supabaseService.isInitialized).toBe(true);
      
      // Clear console logs
      console.log.mockClear();
      
      // Second initialization with same credentials
      supabaseService.initialize(mockUrl, mockKey);
      expect(console.log).toHaveBeenCalledWith(
        '✅ Supabase already initialized with same credentials'
      );
    });
  });

  describe('Connection status', () => {
    it('should return false when not connected', () => {
      // Reset the service
      supabaseService.supabase = null;
      supabaseService.isInitialized = false;
      
      expect(supabaseService.isConnected()).toBe(false);
    });

    it('should return true when connected', () => {
      supabaseService.initialize('https://test.supabase.co', 'test-key');
      
      expect(supabaseService.isConnected()).toBe(true);
    });
  });

  describe('Generic CRUD operations', () => {
    beforeEach(() => {
      supabaseService.initialize('https://test.supabase.co', 'test-key');
    });

    it('should get all records from a table', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      supabaseService.supabase.from().select.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await supabaseService.getAll('companies');
      
      expect(result).toEqual(mockData);
      expect(supabaseService.supabase.from).toHaveBeenCalledWith('companies');
    });

    it('should get a record by ID', async () => {
      const mockData = { id: 1, name: 'Test Company' };
      supabaseService.supabase.from().select().eq().single.mockResolvedValue({
        data: mockData,
        error: null
      });

      // eslint-disable-next-line testing-library/no-await-sync-query
      const result = await supabaseService.getById('companies', 1);
      
      expect(result).toEqual(mockData);
    });

    it('should create a new record', async () => {
      const mockData = [{ id: 1, name: 'New Company' }];
      const newRecord = { name: 'New Company' };
      
      supabaseService.supabase.from().insert().select.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await supabaseService.create('companies', newRecord);
      
      expect(result).toEqual(mockData);
    });

    it('should update a record', async () => {
      const mockData = [{ id: 1, name: 'Updated Company' }];
      const updates = { name: 'Updated Company' };
      
      supabaseService.supabase.from().update().eq().select.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await supabaseService.update('companies', 1, updates);
      
      expect(result).toEqual(mockData);
    });

    it('should delete a record', async () => {
      supabaseService.supabase.from().delete().eq.mockResolvedValue({
        error: null
      });

      const result = await supabaseService.delete('companies', 1);
      
      expect(result).toBe(true);
    });

    it('should handle database errors', async () => {
      const mockError = { message: 'Database error' };
      supabaseService.supabase.from().select.mockResolvedValue({
        data: null,
        error: mockError
      });

      await expect(supabaseService.getAll('companies')).rejects.toThrow(mockError);
    });

    it('should throw error when not initialized', async () => {
      supabaseService.supabase = null;

      await expect(supabaseService.getAll('companies')).rejects.toThrow(
        'Supabase client not initialized'
      );
    });
  });

  describe('Enhanced company deletion', () => {
    beforeEach(() => {
      supabaseService.initialize('https://test.supabase.co', 'test-key');
    });

    it('should delete company with no related contacts', async () => {
      // Mock no related contacts
      supabaseService.supabase.from().select().eq.mockResolvedValue({
        data: [],
        error: null
      });
      
      // Mock successful company deletion
      supabaseService.supabase.from().delete().eq.mockResolvedValue({
        error: null
      });

      const result = await supabaseService.deleteCompanyById(1);
      
      expect(result).toBe(true);
    });

    it('should throw error when company has related contacts (default behavior)', async () => {
      // Mock related contacts
      const mockContacts = [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' }
      ];
      
      supabaseService.supabase.from().select().eq.mockResolvedValue({
        data: mockContacts,
        error: null
      });

      await expect(supabaseService.deleteCompanyById(1)).rejects.toThrow(
        'Cannot delete company - it has 2 related contact(s): John Doe, Jane Smith'
      );
    });

    it('should delete related contacts when handleRelatedRecords is "delete"', async () => {
      // Mock related contacts
      const mockContacts = [{ id: 1, name: 'John Doe' }];
      
      let callCount = 0;
      supabaseService.supabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => Promise.resolve({
            data: mockContacts,
            error: null
          })
        }),
        delete: () => ({
          eq: () => {
            callCount++;
            return Promise.resolve({ error: null });
          }
        })
      }));

      const result = await supabaseService.deleteCompanyById(1, { 
        handleRelatedRecords: 'delete' 
      });
      
      expect(result).toBe(true);
      expect(callCount).toBe(2); // Once for contact, once for company
    });

    it('should unlink related contacts when handleRelatedRecords is "unlink"', async () => {
      // Mock related contacts
      const mockContacts = [{ id: 1, name: 'John Doe' }];
      
      let updateCalled = false;
      let deleteCalled = false;
      
      supabaseService.supabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => Promise.resolve({
            data: mockContacts,
            error: null
          })
        }),
        update: () => ({
          eq: () => {
            updateCalled = true;
            return Promise.resolve({ error: null });
          }
        }),
        delete: () => ({
          eq: () => {
            deleteCalled = true;
            return Promise.resolve({ error: null });
          }
        })
      }));

      const result = await supabaseService.deleteCompanyById(1, { 
        handleRelatedRecords: 'unlink' 
      });
      
      expect(result).toBe(true);
      expect(updateCalled).toBe(true);
      expect(deleteCalled).toBe(true);
    });

    it('should handle errors during company deletion', async () => {
      // Mock no related contacts
      supabaseService.supabase.from().select().eq.mockResolvedValue({
        data: [],
        error: null
      });
      
      // Mock deletion error
      supabaseService.supabase.from().delete().eq.mockResolvedValue({
        error: { message: 'Deletion failed' }
      });

      await expect(supabaseService.deleteCompanyById(1)).rejects.toThrow('Deletion failed');
    });
  });

  describe('Lookup resolution', () => {
    beforeEach(() => {
      supabaseService.initialize('https://test.supabase.co', 'test-key');
    });

    it('should resolve name lookups to IDs', async () => {
      const payload = { company_type_name: 'Investor' };
      
      supabaseService.supabase.from().select().eq().single.mockResolvedValue({
        data: { id: 5 },
        error: null
      });

      const result = await supabaseService._resolveLookups(payload);
      
      expect(result).toEqual({ company_type_id: 5 });
      expect(supabaseService.supabase.from).toHaveBeenCalledWith('company_types');
    });

    it('should handle lookup failures', async () => {
      const payload = { company_type_name: 'NonExistent' };
      
      supabaseService.supabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      await expect(supabaseService._resolveLookups(payload)).rejects.toThrow(
        'Could not find NonExistent in company_types'
      );
    });
  });

  describe('Database operations execution', () => {
    beforeEach(() => {
      supabaseService.initialize('https://test.supabase.co', 'test-key');
    });

    it('should execute insert operations', async () => {
      const operations = [
        {
          action: 'insert',
          table: 'companies',
          payload: { name: 'Test Company' }
        }
      ];

      supabaseService.supabase.from().insert.mockResolvedValue({
        error: null
      });

      await supabaseService.executeDbOperations(operations);
      
      expect(supabaseService.supabase.from).toHaveBeenCalledWith('companies');
    });

    it('should execute update operations', async () => {
      const operations = [
        {
          action: 'update',
          table: 'companies',
          payload: { name: 'Updated Company' },
          where: { id: 1 }
        }
      ];

      // Mock the query chain with proper method calls
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      });
      
      supabaseService.supabase.from.mockReturnValue({
        update: mockUpdate
      });

      await supabaseService.executeDbOperations(operations);
      
      expect(supabaseService.supabase.from).toHaveBeenCalledWith('companies');
      expect(mockUpdate).toHaveBeenCalledWith({ name: 'Updated Company' });
    });

    it('should execute delete operations', async () => {
      const operations = [
        {
          action: 'delete',
          table: 'companies',
          where: { id: 1 }
        }
      ];

      // Mock the query chain with proper method calls
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      });
      
      supabaseService.supabase.from.mockReturnValue({
        delete: mockDelete
      });

      await supabaseService.executeDbOperations(operations);
      
      expect(supabaseService.supabase.from).toHaveBeenCalledWith('companies');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should handle foreign key constraint errors', async () => {
      const operations = [
        {
          action: 'delete',
          table: 'companies',
          where: { id: 1 }
        }
      ];

      supabaseService.supabase.from().delete().match.mockResolvedValue({
        error: { code: '23503', message: 'Foreign key violation' }
      });

      await expect(supabaseService.executeDbOperations(operations)).rejects.toThrow(
        'Cannot delete companies record - it\'s still referenced by other records'
      );
    });

    it('should handle unique constraint errors', async () => {
      const operations = [
        {
          action: 'insert',
          table: 'companies',
          payload: { name: 'Duplicate Company' }
        }
      ];

      supabaseService.supabase.from().insert.mockResolvedValue({
        error: { code: '23505', message: 'Unique violation' }
      });

      await expect(supabaseService.executeDbOperations(operations)).rejects.toThrow(
        'Duplicate entry: A record with these values already exists'
      );
    });

    it('should validate operation structure', async () => {
      const invalidOperations = [
        {
          // Missing action
          table: 'companies',
          payload: { name: 'Test' }
        }
      ];

      await expect(supabaseService.executeDbOperations(invalidOperations)).rejects.toThrow(
        'Invalid operation: missing or invalid \'action\' field'
      );
    });

    it('should require where clause for update/delete', async () => {
      const operations = [
        {
          action: 'update',
          table: 'companies',
          payload: { name: 'Test' }
          // Missing where clause
        }
      ];

      await expect(supabaseService.executeDbOperations(operations)).rejects.toThrow(
        'UPDATE operation requires a "where" clause'
      );
    });
  });

  describe('Prompts management', () => {
    beforeEach(() => {
      supabaseService.initialize('https://test.supabase.co', 'test-key');
    });

    it('should get a prompt by name', async () => {
      const mockPrompt = { content: 'Test prompt content' };
      
      supabaseService.supabase.from().select().eq().single.mockResolvedValue({
        data: mockPrompt,
        error: null
      });

      const result = await supabaseService.getPrompt('test-prompt');
      
      expect(result).toBe('Test prompt content');
    });

    it('should return null for non-existent prompt', async () => {
      supabaseService.supabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found error
      });

      const result = await supabaseService.getPrompt('non-existent');
      
      expect(result).toBeNull();
    });

    it('should save a prompt', async () => {
      supabaseService.supabase.from().upsert().select.mockResolvedValue({
        data: [{ name: 'test-prompt', content: 'Test content' }],
        error: null
      });

      const result = await supabaseService.savePrompt('test-prompt', 'Test content');
      
      expect(result).toEqual([{ name: 'test-prompt', content: 'Test content' }]);
    });
  });
}); 