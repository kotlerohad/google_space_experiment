import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ColumnFilterDropdown } from '../ColumnFilterDropdown';

describe('ColumnFilterDropdown', () => {
  const mockColumn = {
    key: 'status',
    label: 'Status'
  };

  const mockRecords = [
    { id: 1, status: 'Active', priority: 1 },
    { id: 2, status: 'Inactive', priority: 2 },
    { id: 3, status: 'Active', priority: 1 },
    { id: 4, status: null, priority: 3 }
  ];

  const mockFilters = {};
  const mockOnFiltersChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders filter button', () => {
    render(
      <ColumnFilterDropdown
        column={mockColumn}
        records={mockRecords}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.getByTitle('Filter Status')).toBeInTheDocument();
  });

  it('opens dropdown when filter button is clicked', () => {
    render(
      <ColumnFilterDropdown
        column={mockColumn}
        records={mockRecords}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const filterButton = screen.getByTitle('Filter Status');
    fireEvent.click(filterButton);

    expect(screen.getByText('Filter Status')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('displays unique values from records', () => {
    render(
      <ColumnFilterDropdown
        column={mockColumn}
        records={mockRecords}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const filterButton = screen.getByTitle('Filter Status');
    fireEvent.click(filterButton);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('(Empty)')).toBeInTheDocument();
  });

  it('handles value selection', () => {
    render(
      <ColumnFilterDropdown
        column={mockColumn}
        records={mockRecords}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const filterButton = screen.getByTitle('Filter Status');
    fireEvent.click(filterButton);

    const activeCheckbox = screen.getByLabelText(/Active/);
    fireEvent.click(activeCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      status: ['Active']
    });
  });

  it('handles select all functionality', () => {
    render(
      <ColumnFilterDropdown
        column={mockColumn}
        records={mockRecords}
        filters={{ status: ['Active'] }}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const filterButton = screen.getByTitle('Filter Status');
    fireEvent.click(filterButton);

    const allButton = screen.getByText('All');
    fireEvent.click(allButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });

  it('handles select none functionality', () => {
    render(
      <ColumnFilterDropdown
        column={mockColumn}
        records={mockRecords}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const filterButton = screen.getByTitle('Filter Status');
    fireEvent.click(filterButton);

    const noneButton = screen.getByText('None');
    fireEvent.click(noneButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      status: []
    });
  });

  it('closes dropdown when clicking outside', async () => {
    render(
      <div>
        <ColumnFilterDropdown
          column={mockColumn}
          records={mockRecords}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
        />
        <div data-testid="outside">Outside element</div>
      </div>
    );

    const filterButton = screen.getByTitle('Filter Status');
    fireEvent.click(filterButton);

    expect(screen.getByText('Filter Status')).toBeInTheDocument();

    const outsideElement = screen.getByTestId('outside');
    fireEvent.mouseDown(outsideElement);

    await waitFor(() => {
      expect(screen.queryByText('Filter Status')).not.toBeInTheDocument();
    });
  });

  it('handles date column filtering', () => {
    const dateColumn = { key: 'created_at', label: 'Created At' };
    const dateRecords = [
      { id: 1, created_at: '2024-01-01T10:00:00Z' },
      { id: 2, created_at: '2024-01-02T10:00:00Z' },
      { id: 3, created_at: '2024-01-01T15:00:00Z' }
    ];

    render(
      <ColumnFilterDropdown
        column={dateColumn}
        records={dateRecords}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const filterButton = screen.getByTitle('Filter Created At');
    fireEvent.click(filterButton);

    // Should display formatted dates
    expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/1\/2\/2024/)).toBeInTheDocument();
  });

  it('handles company_type_id column filtering', () => {
    const typeColumn = { key: 'company_type_id', label: 'Company Type' };
    const typeRecords = [
      { id: 1, company_type_id: 2 },
      { id: 2, company_type_id: 3 },
      { id: 3, company_type_id: 2 }
    ];

    render(
      <ColumnFilterDropdown
        column={typeColumn}
        records={typeRecords}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const filterButton = screen.getByTitle('Filter Company Type');
    fireEvent.click(filterButton);

    // Should display company type labels
    expect(screen.getByText('Customer (Bank)')).toBeInTheDocument();
    expect(screen.getByText('Channel Partner')).toBeInTheDocument();
  });
});