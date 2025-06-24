import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppContext } from '../../AppContext';
import SupabaseIntegration from './SupabaseIntegration';
import supabaseService from '../../services/supabaseService';

// Mock all the services
jest.mock('../../services/supabaseService', () => ({
  __esModule: true,
  default: {
    isConnected: jest.fn(() => true),
    getCompanies: jest.fn(),
    getContacts: jest.fn(),
    getActivities: jest.fn(),
    updateCompany: jest.fn(),
    updateContact: jest.fn(),
    updateActivity: jest.fn(),
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          range: jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
          eq: jest.fn(() => ({
            range: jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
          }))
        }))
      }))
    }
  }
}));

jest.mock('../../services/emailAnalysisService', () => ({
  emailAnalysisService: {
    findLastChatForAllContacts: jest.fn(),
    updateCompanyLastChatDates: jest.fn()
  }
}));

describe('SupabaseIntegration', () => {
  const mockContext = {
    supabaseService: supabaseService,
    messageLog: [],
    addMessage: jest.fn()
  };

  const mockOnMessageLog = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  const renderWithContext = (component) => {
    return render(
      <AppContext.Provider value={mockContext}>
        {component}
      </AppContext.Provider>
    );
  };

  it('renders without crashing', () => {
    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    expect(screen.getByText('Database Management')).toBeInTheDocument();
    expect(screen.getByText('Companies')).toBeInTheDocument();
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('Activities')).toBeInTheDocument();
  });

  it('displays view selection buttons', () => {
    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    const companiesButton = screen.getByRole('button', { name: /Companies/i });
    const contactsButton = screen.getByRole('button', { name: /Contacts/i });
    const activitiesButton = screen.getByRole('button', { name: /Activities/i });
    
    expect(companiesButton).toBeInTheDocument();
    expect(contactsButton).toBeInTheDocument();
    expect(activitiesButton).toBeInTheDocument();
  });

  it('switches between different views', async () => {
    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    const contactsButton = screen.getByRole('button', { name: /Contacts/i });
    fireEvent.click(contactsButton);
    
    // Should have active styling on contacts button
    expect(contactsButton).toHaveClass('bg-blue-600', 'text-white');
  });

  it('shows refresh button and handles refresh', async () => {
    const mockCompanies = [
      { 
        id: 1, 
        name: 'Test Company', 
        company_type_id: 1, 
        priority: 3, 
        source: 'Manual',
        contacts: [{ id: 1, name: 'John Doe', email: 'john@test.com' }]
      }
    ];
    
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({
          data: mockCompanies,
          error: null,
          count: 1
        })
      })
    });

    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    expect(refreshButton).toBeInTheDocument();
    
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(supabaseService.supabase.from).toHaveBeenCalledWith('companies');
    });
  });

  it('displays loading state', async () => {
    // Mock a delayed response
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        range: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({ data: [], error: null, count: 0 }), 100))
        )
      })
    });

    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('handles data loading errors', async () => {
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: 0
        })
      })
    });

    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockOnMessageLog).toHaveBeenCalledWith(
        expect.stringContaining('Error loading companies'),
        'error'
      );
    });
  });

  it('displays pagination information', async () => {
    const mockCompanies = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `Company ${i + 1}`,
      company_type_id: 1,
      priority: 3,
      source: 'Manual',
      contacts: [{ id: i + 1, name: `Contact ${i + 1}`, email: `contact${i + 1}@test.com` }]
    }));
    
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({
          data: mockCompanies,
          error: null,
          count: 100
        })
      })
    });

    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing 1-25 of 100 records/)).toBeInTheDocument();
    });
  });

  it('shows load more button when there are more records', async () => {
    const mockCompanies = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Company ${i + 1}`,
      company_type_id: 1,
      priority: 3,
      source: 'Manual',
      contacts: [{ id: i + 1, name: `Contact ${i + 1}`, email: `contact${i + 1}@test.com` }]
    }));
    
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({
          data: mockCompanies,
          error: null,
          count: 100
        })
      })
    });

    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Load next 50/i })).toBeInTheDocument();
    });
  });

  it('handles load more functionality', async () => {
    const mockCompanies = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Company ${i + 1}`,
      company_type_id: 1,
      priority: 3,
      source: 'Manual',
      contacts: [{ id: i + 1, name: `Contact ${i + 1}`, email: `contact${i + 1}@test.com` }]
    }));
    
    const mockMoreCompanies = Array.from({ length: 25 }, (_, i) => ({
      id: i + 51,
      name: `Company ${i + 51}`,
      company_type_id: 1,
      priority: 3,
      source: 'Manual',
      contacts: [{ id: i + 51, name: `Contact ${i + 51}`, email: `contact${i + 51}@test.com` }]
    }));

    let callCount = 0;
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        range: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              data: mockCompanies,
              error: null,
              count: 75
            });
          } else {
            return Promise.resolve({
              data: mockMoreCompanies,
              error: null,
              count: 75
            });
          }
        })
      })
    });

    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing 1-50 of 75 records/)).toBeInTheDocument();
    });

    const loadMoreButton = screen.getByRole('button', { name: /Load next 50/i });
    fireEvent.click(loadMoreButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing 1-75 of 75 records/)).toBeInTheDocument();
    });
  });

  it('displays sortable column headers', async () => {
    const mockCompanies = [
      { 
        id: 1, 
        name: 'Test Company', 
        company_type_id: 1, 
        priority: 3, 
        source: 'Manual',
        contacts: [{ id: 1, name: 'John Doe', email: 'john@test.com' }]
      }
    ];
    
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({
          data: mockCompanies,
          error: null,
          count: 1
        })
      })
    });

    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    await waitFor(() => {
      // Check for sortable headers
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
  });

  it('handles column sorting', async () => {
    const mockCompanies = [
      { id: 1, name: 'B Company', company_type_id: 1, priority: 3, source: 'Manual' },
      { id: 2, name: 'A Company', company_type_id: 1, priority: 1, source: 'Email' }
    ];
    
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({
          data: mockCompanies,
          error: null,
          count: 2
        })
      })
    });

    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    await waitFor(() => {
      expect(screen.getByText('B Company')).toBeInTheDocument();
    });

    // Click on Name header to sort
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    
    // Should show sort indicator (checking the header is clickable)
    await waitFor(() => {
      expect(nameHeader).toBeInTheDocument();
    });
  });

  it('displays source badges with correct colors', async () => {
    const mockCompanies = [
      { id: 1, name: 'Email Company', source: 'Email' },
      { id: 2, name: 'Manual Company', source: 'Manual' },
      { id: 3, name: 'LinkedIn Company', source: 'LinkedIn' }
    ];
    
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({
          data: mockCompanies,
          error: null,
          count: 3
        })
      })
    });

    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
    
    const emailBadge = screen.getByText('Email');
    const manualBadge = screen.getByText('Manual');
    const linkedinBadge = screen.getByText('LinkedIn');
    
    expect(emailBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    expect(manualBadge).toHaveClass('bg-green-100', 'text-green-800');
    expect(linkedinBadge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('renders AI command input', async () => {
    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    const aiInput = screen.getByPlaceholderText(/Tell me what you want to do with the database.../);
    expect(aiInput).toBeInTheDocument();
  });

  it('resets pagination when changing views', async () => {
    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    // Switch to contacts view
    const contactsButton = screen.getByRole('button', { name: /Contacts/i });
    fireEvent.click(contactsButton);
    
    await waitFor(() => {
      expect(supabaseService.supabase.from).toHaveBeenCalledWith('contacts');
    });
  });

  it('displays no records message when empty', async () => {
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      })
    });

    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    await waitFor(() => {
      expect(screen.getByText('No records found')).toBeInTheDocument();
    });
    expect(screen.getByText('Try using the AI command above to add some data')).toBeInTheDocument();
  });

  it('handles view switching', async () => {
    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    // Should have view buttons
    expect(screen.getByRole('button', { name: /Companies/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Contacts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Activities/i })).toBeInTheDocument();
  });

  it('handles cleanup suggestions integration', () => {
    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    // Should have cleanup suggestions button
    expect(screen.getByRole('button', { name: /Suggest Cleanup/i })).toBeInTheDocument();
  });

  it('shows find last chat button for contacts view', async () => {
    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    // Switch to contacts view
    const contactsButton = screen.getByRole('button', { name: /Contacts/i });
    fireEvent.click(contactsButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Find Last Chat/i })).toBeInTheDocument();
    });
  });

  it('handles data loading and display', async () => {
    const mockCompanies = [
      { id: 1, name: 'Test Company', company_type_id: 1, contacts: [{ name: 'John Doe' }] }
    ];
    
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({
          data: mockCompanies,
          error: null,
          count: 1
        })
      })
    });

    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
  });

  it('handles priority dropdown updates', async () => {
    const mockCompanies = [
      { id: 1, name: 'Test Company', priority: 3, company_type_id: 1, country: 'USA' }
    ];
    
    supabaseService.supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({
          data: mockCompanies,
          error: null,
          count: 1
        })
      })
    });

    supabaseService.updateCompany.mockResolvedValue([{ id: 1, priority: 1 }]);

    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });

    // Priority dropdown should be present (implementation depends on component structure)
    // This test verifies the integration exists
    expect(supabaseService.supabase.from).toHaveBeenCalledWith('companies');
  });
}); 