import { renderHook, act, waitFor } from '@testing-library/react';
import { useSupabaseData } from '../useSupabaseData';
import supabaseService from '../../../../services/supabaseService';

// Mock the supabase service
jest.mock('../../../../services/supabaseService', () => ({
  __esModule: true,
  default: {
    isConnected: jest.fn(() => true),
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            range: jest.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          range: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    }
  }
}));

describe('useSupabaseData', () => {
  const mockOnMessageLog = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => 
      useSupabaseData('companies', true, mockOnMessageLog)
    );

    expect(result.current.records).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.totalRecords).toBe(0);
  });

  it('fetches data on mount when config is loaded', async () => {
    const mockData = [
      { id: 1, name: 'Test Company', company_type_id: 1 }
    ];

    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({
            data: mockData,
            error: null,
            count: 1
          })
        })
      })
    });

    const { result } = renderHook(() => 
      useSupabaseData('companies', true, mockOnMessageLog)
    );

    await waitFor(() => {
      expect(result.current.records).toEqual(mockData);
      expect(result.current.totalRecords).toBe(1);
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockOnMessageLog).toHaveBeenCalledWith(
      expect.stringContaining('Loading companies from Supabase'),
      'info'
    );
  });

  it('handles loading errors', async () => {
    const errorMessage = 'Database connection failed';
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({
            data: null,
            error: { message: errorMessage }
          })
        })
      })
    });

    const { result } = renderHook(() => 
      useSupabaseData('companies', true, mockOnMessageLog)
    );

    await waitFor(() => {
      expect(result.current.error).toContain(errorMessage);
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockOnMessageLog).toHaveBeenCalledWith(
      expect.stringContaining(errorMessage),
      'error'
    );
  });

  it('handles pagination correctly', async () => {
    const mockData = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Company ${i + 1}`
    }));

    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({
            data: mockData,
            error: null,
            count: 100
          })
        })
      })
    });

    const { result } = renderHook(() => 
      useSupabaseData('companies', true, mockOnMessageLog)
    );

    await waitFor(() => {
      expect(result.current.records).toHaveLength(50);
      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.totalRecords).toBe(100);
    });
  });

  it('loads more data correctly', async () => {
    const firstPageData = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Company ${i + 1}`
    }));

    const secondPageData = Array.from({ length: 25 }, (_, i) => ({
      id: i + 51,
      name: `Company ${i + 51}`
    }));

    let callCount = 0;
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                data: firstPageData,
                error: null,
                count: 75
              });
            } else {
              return Promise.resolve({
                data: secondPageData,
                error: null,
                count: 75
              });
            }
          })
        })
      })
    });

    const { result } = renderHook(() => 
      useSupabaseData('companies', true, mockOnMessageLog)
    );

    await waitFor(() => {
      expect(result.current.records).toHaveLength(50);
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.records).toHaveLength(75);
      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.currentPage).toBe(2);
    });
  });

  it('refreshes data correctly', async () => {
    const initialData = [{ id: 1, name: 'Initial Company' }];
    const refreshedData = [
      { id: 1, name: 'Updated Company' },
      { id: 2, name: 'New Company' }
    ];

    let callCount = 0;
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                data: initialData,
                error: null,
                count: 1
              });
            } else {
              return Promise.resolve({
                data: refreshedData,
                error: null,
                count: 2
              });
            }
          })
        })
      })
    });

    const { result } = renderHook(() => 
      useSupabaseData('companies', true, mockOnMessageLog)
    );

    await waitFor(() => {
      expect(result.current.records).toEqual(initialData);
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.records).toEqual(refreshedData);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.totalRecords).toBe(2);
    });
  });

  it('handles contacts view with search filter', async () => {
    const mockContacts = [
      { id: 1, name: 'John Doe', email: 'john@test.com', companies: { name: 'Test Co' } }
    ];

    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        or: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: mockContacts,
              error: null,
              count: 1
            })
          })
        })
      })
    });

    const { result } = renderHook(() => 
      useSupabaseData('contacts', true, mockOnMessageLog, 'John')
    );

    await waitFor(() => {
      expect(result.current.records).toEqual([
        { ...mockContacts[0], company_name: 'Test Co' }
      ]);
    });
  });

  it('does not fetch data when config is not loaded', () => {
    const { result } = renderHook(() => 
      useSupabaseData('companies', false, mockOnMessageLog)
    );

    expect(result.current.isLoading).toBe(false);
    expect(supabaseService.supabase.from).not.toHaveBeenCalled();
  });

  it('does not fetch data when supabase is not connected', () => {
    supabaseService.isConnected.mockReturnValue(false);

    const { result } = renderHook(() => 
      useSupabaseData('companies', true, mockOnMessageLog)
    );

    expect(result.current.isLoading).toBe(false);
    expect(supabaseService.supabase.from).not.toHaveBeenCalled();
  });
});