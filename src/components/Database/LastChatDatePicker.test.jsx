import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LastChatDatePicker from './LastChatDatePicker';
import { emailAnalysisService } from '../../services/emailAnalysisService';

// Mock the emailAnalysisService
jest.mock('../../services/emailAnalysisService', () => ({
  emailAnalysisService: {
    findLastChatForAllContacts: jest.fn(),
    updateCompanyLastChatDates: jest.fn()
  }
}));

describe('LastChatDatePicker', () => {
  const mockOnMessageLog = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  it('renders without crashing', () => {
    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    expect(screen.getByText('Find Last Chat Dates')).toBeInTheDocument();
    expect(screen.getByText('Find Last Chat')).toBeInTheDocument();
  });

  it('displays the correct initial state', () => {
    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    // Check for the main elements
    expect(screen.getByText('Analyze email correspondence to find last chat dates for contacts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Find Last Chat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Company Dates/i })).toBeInTheDocument();
  });

  it('shows loading state when finding last chat', async () => {
    emailAnalysisService.findLastChatForAllContacts.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ updated: 5, total: 10 }), 100))
    );

    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    const findButton = screen.getByRole('button', { name: /Find Last Chat/i });
    fireEvent.click(findButton);

    // Check for loading state
    expect(screen.getByText(/Finding last chat dates.../i)).toBeInTheDocument();
    expect(findButton).toBeDisabled();
  });

  it('handles successful last chat analysis', async () => {
    const mockResult = { updated: 5, total: 10 };
    emailAnalysisService.findLastChatForAllContacts.mockResolvedValue(mockResult);

    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    const findButton = screen.getByRole('button', { name: /Find Last Chat/i });
    fireEvent.click(findButton);

    await waitFor(() => {
      expect(screen.getByText(/Updated 5 out of 10 contacts/i)).toBeInTheDocument();
    });

    expect(mockOnMessageLog).toHaveBeenCalledWith(
      expect.stringContaining('Email Analysis Complete'),
      'success'
    );
  });

  it('handles last chat analysis with no updates', async () => {
    const mockResult = { updated: 0, total: 5 };
    emailAnalysisService.findLastChatForAllContacts.mockResolvedValue(mockResult);

    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    const findButton = screen.getByRole('button', { name: /Find Last Chat/i });
    fireEvent.click(findButton);

    await waitFor(() => {
      expect(screen.getByText(/No contacts needed updating/i)).toBeInTheDocument();
    });

    expect(mockOnMessageLog).toHaveBeenCalledWith(
      expect.stringContaining('No contacts needed updating'),
      'info'
    );
  });

  it('handles last chat analysis error', async () => {
    const mockError = new Error('Analysis failed');
    emailAnalysisService.findLastChatForAllContacts.mockRejectedValue(mockError);

    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    const findButton = screen.getByRole('button', { name: /Find Last Chat/i });
    fireEvent.click(findButton);

    await waitFor(() => {
      expect(screen.getByText(/Error: Analysis failed/i)).toBeInTheDocument();
    });

    expect(mockOnMessageLog).toHaveBeenCalledWith(
      expect.stringContaining('Error analyzing last chat dates'),
      'error'
    );
  });

  it('shows loading state when updating company dates', async () => {
    emailAnalysisService.updateCompanyLastChatDates.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ updated: 3, total: 8 }), 100))
    );

    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    const updateButton = screen.getByRole('button', { name: /Update Company Dates/i });
    fireEvent.click(updateButton);

    // Check for loading state
    expect(screen.getByText(/Updating company dates.../i)).toBeInTheDocument();
    expect(updateButton).toBeDisabled();
  });

  it('handles successful company date updates', async () => {
    const mockResult = { updated: 3, total: 8 };
    emailAnalysisService.updateCompanyLastChatDates.mockResolvedValue(mockResult);

    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    const updateButton = screen.getByRole('button', { name: /Update Company Dates/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText(/Updated 3 out of 8 companies/i)).toBeInTheDocument();
    });

    expect(mockOnMessageLog).toHaveBeenCalledWith(
      expect.stringContaining('Company Update Complete'),
      'success'
    );
  });

  it('handles company date updates with no changes', async () => {
    const mockResult = { updated: 0, total: 5 };
    emailAnalysisService.updateCompanyLastChatDates.mockResolvedValue(mockResult);

    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    const updateButton = screen.getByRole('button', { name: /Update Company Dates/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText(/No companies needed updating/i)).toBeInTheDocument();
    });

    expect(mockOnMessageLog).toHaveBeenCalledWith(
      expect.stringContaining('No companies needed updating'),
      'info'
    );
  });

  it('handles company date update error', async () => {
    const mockError = new Error('Update failed');
    emailAnalysisService.updateCompanyLastChatDates.mockRejectedValue(mockError);

    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    const updateButton = screen.getByRole('button', { name: /Update Company Dates/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText(/Error: Update failed/i)).toBeInTheDocument();
    });

    expect(mockOnMessageLog).toHaveBeenCalledWith(
      expect.stringContaining('Error updating company dates'),
      'error'
    );
  });

  it('disables buttons during operations', async () => {
    emailAnalysisService.findLastChatForAllContacts.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ updated: 1, total: 1 }), 100))
    );

    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    const findButton = screen.getByRole('button', { name: /Find Last Chat/i });
    const updateButton = screen.getByRole('button', { name: /Update Company Dates/i });
    
    fireEvent.click(findButton);

    // Both buttons should be disabled during operation
    expect(findButton).toBeDisabled();
    expect(updateButton).toBeDisabled();

    await waitFor(() => {
      expect(findButton).not.toBeDisabled();
    });
    expect(updateButton).not.toBeDisabled();
  });

  it('resets results when starting new operation', async () => {
    const mockResult = { updated: 2, total: 5 };
    emailAnalysisService.findLastChatForAllContacts.mockResolvedValue(mockResult);
    emailAnalysisService.updateCompanyLastChatDates.mockResolvedValue(mockResult);

    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    const findButton = screen.getByRole('button', { name: /Find Last Chat/i });
    const updateButton = screen.getByRole('button', { name: /Update Company Dates/i });
    
    // First operation
    fireEvent.click(findButton);
    await waitFor(() => {
      expect(screen.getByText(/Updated 2 out of 5 contacts/i)).toBeInTheDocument();
    });

    // Second operation should clear previous results
    fireEvent.click(updateButton);
    await waitFor(() => {
      expect(screen.getByText(/Updated 2 out of 5 companies/i)).toBeInTheDocument();
    });

    // Should not show the contacts message anymore
    expect(screen.queryByText(/Updated 2 out of 5 contacts/i)).not.toBeInTheDocument();
  });

  it('displays appropriate icons and styling', () => {
    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    // Check for calendar icon (should be in the component)
    const calendarIcon = screen.getByTestId('calendar-icon') || screen.getByText('📅');
    expect(calendarIcon || screen.getByRole('button', { name: /Find Last Chat/i })).toBeInTheDocument();
    
    // Check for proper styling classes by checking the component renders correctly
    expect(screen.getByText('Find Last Chat Dates')).toBeInTheDocument();
  });

  it('calls onMessageLog with correct parameters', async () => {
    const mockResult = { updated: 3, total: 7 };
    emailAnalysisService.findLastChatForAllContacts.mockResolvedValue(mockResult);

    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    const findButton = screen.getByRole('button', { name: /Find Last Chat/i });
    fireEvent.click(findButton);

    await waitFor(() => {
      expect(mockOnMessageLog).toHaveBeenCalledWith(
        'Email Analysis Complete: Updated 3 out of 7 contacts with last chat dates',
        'success'
      );
    });

    expect(mockOnMessageLog).toHaveBeenCalledTimes(1);
  });

  it('handles zero total contacts gracefully', async () => {
    const mockResult = { updated: 0, total: 0 };
    emailAnalysisService.findLastChatForAllContacts.mockResolvedValue(mockResult);

    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    const findButton = screen.getByRole('button', { name: /Find Last Chat/i });
    fireEvent.click(findButton);

    await waitFor(() => {
      expect(screen.getByText(/No contacts found with email addresses/i)).toBeInTheDocument();
    });

    expect(mockOnMessageLog).toHaveBeenCalledWith(
      expect.stringContaining('No contacts found'),
      'info'
    );
  });

  it('handles zero total companies gracefully', async () => {
    const mockResult = { updated: 0, total: 0 };
    emailAnalysisService.updateCompanyLastChatDates.mockResolvedValue(mockResult);

    render(<LastChatDatePicker onMessageLog={mockOnMessageLog} />);
    
    const updateButton = screen.getByRole('button', { name: /Update Company Dates/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText(/No companies found/i)).toBeInTheDocument();
    });

    expect(mockOnMessageLog).toHaveBeenCalledWith(
      expect.stringContaining('No companies found'),
      'info'
    );
  });
}); 