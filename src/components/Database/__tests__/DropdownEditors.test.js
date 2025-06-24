import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  CompanyTypeDropdown, 
  PriorityDropdown, 
  StatusDropdown, 
  ConnectionStatusDropdown 
} from '../DropdownEditors';
import supabaseService from '../../../services/supabaseService';
import linkedinService from '../../../services/linkedinService';

// Mock services
jest.mock('../../../services/supabaseService', () => ({
  __esModule: true,
  default: {
    supabase: {
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        }))
      }))
    }
  }
}));

jest.mock('../../../services/linkedinService', () => ({
  __esModule: true,
  default: {
    updateConnectionStatus: jest.fn(() => Promise.resolve())
  }
}));

describe('DropdownEditors', () => {
  const mockOnUpdate = jest.fn();
  const mockOnMessageLog = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CompanyTypeDropdown', () => {
    it('renders current company type', () => {
      render(
        <CompanyTypeDropdown
          currentTypeId={2}
          companyId={1}
          onUpdate={mockOnUpdate}
          onMessageLog={mockOnMessageLog}
        />
      );

      expect(screen.getByText('Customer (Bank)')).toBeInTheDocument();
    });

    it('opens dropdown when clicked', () => {
      render(
        <CompanyTypeDropdown
          currentTypeId={2}
          companyId={1}
          onUpdate={mockOnUpdate}
          onMessageLog={mockOnMessageLog}
        />
      );

      const dropdown = screen.getByText('Customer (Bank)');
      fireEvent.click(dropdown);

      expect(screen.getByText('Other')).toBeInTheDocument();
      expect(screen.getByText('Channel Partner')).toBeInTheDocument();
      expect(screen.getByText('Customer (NeoBank)')).toBeInTheDocument();
    });

    it('handles type change', async () => {
      render(
        <CompanyTypeDropdown
          currentTypeId={2}
          companyId={1}
          onUpdate={mockOnUpdate}
          onMessageLog={mockOnMessageLog}
        />
      );

      const dropdown = screen.getByText('Customer (Bank)');
      fireEvent.click(dropdown);

      const channelPartnerOption = screen.getByText('Channel Partner');
      fireEvent.click(channelPartnerOption);

      await waitFor(() => {
        expect(supabaseService.supabase.from).toHaveBeenCalledWith('companies');
        expect(mockOnMessageLog).toHaveBeenCalledWith(
          expect.stringContaining('Updating company 1 type to Channel Partner'),
          'info'
        );
      });
    });

    it('shows updating state during update', async () => {
      // Mock a delayed response
      supabaseService.supabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => new Promise(resolve => 
            setTimeout(() => resolve({ error: null }), 100)
          ))
        }))
      });

      render(
        <CompanyTypeDropdown
          currentTypeId={2}
          companyId={1}
          onUpdate={mockOnUpdate}
          onMessageLog={mockOnMessageLog}
        />
      );

      const dropdown = screen.getByText('Customer (Bank)');
      fireEvent.click(dropdown);

      const otherOption = screen.getByText('Other');
      fireEvent.click(otherOption);

      expect(screen.getByText('Updating...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
      });
    });
  });

  describe('PriorityDropdown', () => {
    it('renders current priority', () => {
      render(
        <PriorityDropdown
          currentPriority={1}
          companyId={1}
          companyTypeId={2}
          country="USA"
          onUpdate={mockOnUpdate}
          onMessageLog={mockOnMessageLog}
        />
      );

      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('shows suggested priority for Israeli banks', () => {
      render(
        <PriorityDropdown
          currentPriority={null}
          companyId={1}
          companyTypeId={2} // Customer (Bank)
          country="Israel"
          onUpdate={mockOnUpdate}
          onMessageLog={mockOnMessageLog}
        />
      );

      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('(suggested)')).toBeInTheDocument();
    });

    it('shows suggested priority for channel partners', () => {
      render(
        <PriorityDropdown
          currentPriority={null}
          companyId={1}
          companyTypeId={3} // Channel Partner
          country="USA"
          onUpdate={mockOnUpdate}
          onMessageLog={mockOnMessageLog}
        />
      );

      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('(suggested)')).toBeInTheDocument();
    });

    it('handles priority change', async () => {
      render(
        <PriorityDropdown
          currentPriority={3}
          companyId={1}
          companyTypeId={2}
          country="USA"
          onUpdate={mockOnUpdate}
          onMessageLog={mockOnMessageLog}
        />
      );

      const dropdown = screen.getByText('Low');
      fireEvent.click(dropdown);

      const highOption = screen.getByText('High');
      fireEvent.click(highOption);

      await waitFor(() => {
        expect(mockOnMessageLog).toHaveBeenCalledWith(
          expect.stringContaining('Updating company 1 priority to High'),
          'info'
        );
      });
    });
  });

  describe('StatusDropdown', () => {
    it('renders current status', () => {
      render(
        <StatusDropdown
          currentStatus="Active"
          companyId={1}
          onUpdate={mockOnUpdate}
          onMessageLog={mockOnMessageLog}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('opens dropdown with all status options', () => {
      render(
        <StatusDropdown
          currentStatus="Active"
          companyId={1}
          onUpdate={mockOnUpdate}
          onMessageLog={mockOnMessageLog}
        />
      );

      const dropdown = screen.getByText('Active');
      fireEvent.click(dropdown);

      expect(screen.getByText('Inactive')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Prospect')).toBeInTheDocument();
      expect(screen.getByText('Lead')).toBeInTheDocument();
    });

    it('handles status change', async () => {
      render(
        <StatusDropdown
          currentStatus="Active"
          companyId={1}
          onUpdate={mockOnUpdate}
          onMessageLog={mockOnMessageLog}
        />
      );

      const dropdown = screen.getByText('Active');
      fireEvent.click(dropdown);

      const prospectOption = screen.getByText('Prospect');
      fireEvent.click(prospectOption);

      await waitFor(() => {
        expect(mockOnMessageLog).toHaveBeenCalledWith(
          expect.stringContaining('Updating company 1 status to Prospect'),
          'info'
        );
      });
    });
  });

  describe('ConnectionStatusDropdown', () => {
    it('renders current connection status', () => {
      render(
        <ConnectionStatusDropdown
          currentStatus="connected"
          contactId={1}
          onUpdate={mockOnUpdate}
          onMessageLog={mockOnMessageLog}
        />
      );

      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
    });

    it('opens dropdown with all connection status options', () => {
      render(
        <ConnectionStatusDropdown
          currentStatus="connected"
          contactId={1}
          onUpdate={mockOnUpdate}
          onMessageLog={mockOnMessageLog}
        />
      );

      const dropdown = screen.getByText('Connected');
      fireEvent.click(dropdown);

      expect(screen.getByText('Not Connected')).toBeInTheDocument();
      expect(screen.getByText('Unknown')).toBeInTheDocument();
      expect(screen.getByText('Message Sent (No Response)')).toBeInTheDocument();
    });

    it('handles connection status change', async () => {
      render(
        <ConnectionStatusDropdown
          currentStatus="connected"
          contactId={1}
          onUpdate={mockOnUpdate}
          onMessageLog={mockOnMessageLog}
        />
      );

      const dropdown = screen.getByText('Connected');
      fireEvent.click(dropdown);

      const notConnectedOption = screen.getByText('Not Connected');
      fireEvent.click(notConnectedOption);

      await waitFor(() => {
        expect(linkedinService.updateConnectionStatus).toHaveBeenCalledWith(1, 'not_connected');
        expect(mockOnMessageLog).toHaveBeenCalledWith(
          expect.stringContaining('Updating LinkedIn connection status to Not Connected'),
          'info'
        );
      });
    });
  });
});