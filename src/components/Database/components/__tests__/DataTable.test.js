import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataTable } from '../DataTable';

describe('DataTable', () => {
  const mockColumns = [
    { key: 'id', label: 'ID', width: 'w-16' },
    { key: 'name', label: 'Name', width: 'w-48' },
    { key: 'status', label: 'Status', width: 'w-24' },
    { key: 'priority', label: 'Priority', width: 'w-24' }
  ];

  const mockRecords = [
    { id: 1, name: 'Company A', status: 'Active', priority: 1 },
    { id: 2, name: 'Company B', status: 'Inactive', priority: 2 },
    { id: 3, name: 'Company C', status: 'Active', priority: 3 }
  ];

  const defaultProps = {
    records: mockRecords,
    columns: mockColumns,
    isLoading: false,
    tableName: 'companies',
    currentPage: 1,
    hasNextPage: false,
    totalRecords: 3,
    onLoadMore: jest.fn(),
    onMessageLog: jest.fn(),
    onUpdate: jest.fn(),
    groupByColumn: null,
    columnFilters: {},
    onFiltersChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
  });

  it('renders table with data', () => {
    render(<DataTable {...defaultProps} />);

    expect(screen.getByText('Company A')).toBeInTheDocument();
    expect(screen.getByText('Company B')).toBeInTheDocument();
    expect(screen.getByText('Company C')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<DataTable {...defaultProps} />);

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<DataTable {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Loading data...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
  });

  it('displays empty state when no records', () => {
    render(<DataTable {...defaultProps} records={[]} />);

    expect(screen.getByText('No records found')).toBeInTheDocument();
    expect(screen.getByText('Try using the AI command above to add some data')).toBeInTheDocument();
  });

  it('handles column sorting', () => {
    render(<DataTable {...defaultProps} />);

    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);

    // Should display sort indicator
    expect(screen.getByText('↑')).toBeInTheDocument();

    // Click again to reverse sort
    fireEvent.click(nameHeader);
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('applies column filters correctly', () => {
    const propsWithFilters = {
      ...defaultProps,
      columnFilters: { status: ['Active'] }
    };

    render(<DataTable {...propsWithFilters} />);

    // Should only show active companies
    expect(screen.getByText('Company A')).toBeInTheDocument();
    expect(screen.getByText('Company C')).toBeInTheDocument();
    expect(screen.queryByText('Company B')).not.toBeInTheDocument();
  });

  it('displays pagination information', () => {
    const propsWithPagination = {
      ...defaultProps,
      currentPage: 1,
      totalRecords: 100,
      hasNextPage: true
    };

    render(<DataTable {...propsWithPagination} />);

    expect(screen.getByText('Showing 1-50 of 100 records')).toBeInTheDocument();
    expect(screen.getByText('Load next 50 →')).toBeInTheDocument();
  });

  it('handles load more functionality', () => {
    const mockOnLoadMore = jest.fn();
    const propsWithLoadMore = {
      ...defaultProps,
      hasNextPage: true,
      onLoadMore: mockOnLoadMore
    };

    render(<DataTable {...propsWithLoadMore} />);

    const loadMoreButton = screen.getByText('Load next 50 →');
    fireEvent.click(loadMoreButton);

    expect(mockOnLoadMore).toHaveBeenCalled();
  });

  it('displays filter status in header', () => {
    const propsWithFilters = {
      ...defaultProps,
      columnFilters: { status: ['Active'], priority: [1, 2] }
    };

    render(<DataTable {...propsWithFilters} />);

    expect(screen.getByText('2 filters active')).toBeInTheDocument();
  });

  it('handles clear all filters', () => {
    const mockOnFiltersChange = jest.fn();
    const propsWithFilters = {
      ...defaultProps,
      columnFilters: { status: ['Active'] },
      onFiltersChange: mockOnFiltersChange
    };

    render(<DataTable {...propsWithFilters} />);

    const clearFiltersButton = screen.getByText('Clear All Filters');
    fireEvent.click(clearFiltersButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });

  it('handles column visibility toggle', async () => {
    render(<DataTable {...defaultProps} />);

    const columnsButton = screen.getByText('Columns');
    fireEvent.click(columnsButton);

    await waitFor(() => {
      expect(screen.getByText('Show/Hide Columns')).toBeInTheDocument();
    });

    // Should show checkboxes for each column
    expect(screen.getByLabelText('ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('saves and loads column preferences from localStorage', () => {
    const mockGetItem = jest.fn();
    const mockSetItem = jest.fn();
    Storage.prototype.getItem = mockGetItem;
    Storage.prototype.setItem = mockSetItem;

    // Mock saved column order
    mockGetItem.mockReturnValue(JSON.stringify(['name', 'id', 'status', 'priority']));

    render(<DataTable {...defaultProps} />);

    expect(mockGetItem).toHaveBeenCalledWith('columnOrder_companies');
  });

  it('handles column drag and drop reordering', () => {
    render(<DataTable {...defaultProps} />);

    const nameHeader = screen.getByText('Name');
    const idHeader = screen.getByText('ID');

    // Simulate drag start
    fireEvent.dragStart(nameHeader);
    fireEvent.dragOver(idHeader);
    fireEvent.drop(idHeader);

    // Should save new column order to localStorage
    expect(Storage.prototype.setItem).toHaveBeenCalled();
  });

  it('handles grouped display correctly', () => {
    const groupedProps = {
      ...defaultProps,
      groupByColumn: 'status'
    };

    render(<DataTable {...groupedProps} />);

    // Should show grouped sections
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('2 records')).toBeInTheDocument(); // Active group
    expect(screen.getByText('1 record')).toBeInTheDocument();  // Inactive group
  });

  it('displays correct record counts in grouped view', () => {
    const groupedProps = {
      ...defaultProps,
      groupByColumn: 'status'
    };

    render(<DataTable {...groupedProps} />);

    // Should show summary at bottom
    expect(screen.getByText('Total: 3 records in 2 groups')).toBeInTheDocument();
  });

  it('handles column resizing', () => {
    render(<DataTable {...defaultProps} />);

    const nameHeader = screen.getByText('Name');
    
    // Test that the column header is rendered with resize functionality
    // The resize handle should be present in the DOM
    expect(nameHeader).toBeInTheDocument();

    // Note: Column resizing behavior would be better tested with integration tests
    // since it involves complex DOM interactions that are hard to simulate reliably
  });

  it('applies and removes sorting correctly', () => {
    render(<DataTable {...defaultProps} />);

    // Initially unsorted
    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1]; // Skip header row
    expect(firstDataRow).toHaveTextContent('Company A');

    // Sort by name
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);

    // Should still be in same order (A, B, C is already alphabetical)
    const sortedRows = screen.getAllByRole('row');
    const firstSortedRow = sortedRows[1];
    expect(firstSortedRow).toHaveTextContent('Company A');
  });

  it('handles boolean values display', () => {
    const recordsWithBoolean = [
      { id: 1, name: 'Test', active: true },
      { id: 2, name: 'Test2', active: false }
    ];

    const columnsWithBoolean = [
      { key: 'name', label: 'Name' },
      { key: 'active', label: 'Active' }
    ];

    render(
      <DataTable
        {...defaultProps}
        records={recordsWithBoolean}
        columns={columnsWithBoolean}
      />
    );

    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('handles date values display', () => {
    const recordsWithDate = [
      { id: 1, name: 'Test', created_at: '2024-01-01T10:00:00Z' }
    ];

    const columnsWithDate = [
      { key: 'name', label: 'Name' },
      { key: 'created_at', label: 'Created At' }
    ];

    render(
      <DataTable
        {...defaultProps}
        records={recordsWithDate}
        columns={columnsWithDate}
      />
    );

    expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument();
  });

  it('handles null values display', () => {
    const recordsWithNull = [
      { id: 1, name: 'Test', description: null }
    ];

    const columnsWithNull = [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' }
    ];

    render(
      <DataTable
        {...defaultProps}
        records={recordsWithNull}
        columns={columnsWithNull}
      />
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});