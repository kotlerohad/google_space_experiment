import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SupabaseIntegration from './SupabaseIntegrationRefactored';
import { AppContext } from '../../AppContext';

// Mock all the services and components
jest.mock('../../services/supabaseService', () => ({
  __esModule: true,
  default: {
    isConnected: jest.fn(() => true),
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            range: jest.fn(() => Promise.resolve({ 
              data: [
                { id: 1, name: 'Test Company', company_type_id: 1, priority: 1 }
              ], 
              error: null,
              count: 1
            }))
          }))
        }))
      }))
    }
  }
}));

jest.mock('./AICommandInput', () => {
  return function MockAICommandInput({ onCommandExecuted }) {
    return <div data-testid="ai-command-input">AI Command Input</div>;
  };
});

jest.mock('./CleanupSuggestions', () => {
  return function MockCleanupSuggestions({ suggestions }) {
    return suggestions ? <div data-testid="cleanup-suggestions">Cleanup Suggestions</div> : null;
  };
});

const mockContextValue = {
  isConfigLoaded: true,
  openAIService: {
    analyzeTableForCleanup: jest.fn()
  }
};

const renderWithContext = (component) => {
  return render(
    <AppContext.Provider value={mockContextValue}>
      {component}
    </AppContext.Provider>
  );
};

describe('SupabaseIntegration Refactored', () => {
  const mockOnMessageLog = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    expect(screen.getByTestId('ai-command-input')).toBeInTheDocument();
  });

  it('renders table navigation', () => {
    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    expect(screen.getByText('Companies')).toBeInTheDocument();
    expect(screen.getByText('Contacts')).toBeInTheDocument();
  });

  it('loads data from hook', async () => {
    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    await waitFor(() => {
      // Should show data from the hook
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
  });

  it('displays table with data', async () => {
    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    await waitFor(() => {
      expect(screen.getByText('Company Name')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
  });

  it('has modular structure with separate components', () => {
    renderWithContext(<SupabaseIntegration onMessageLog={mockOnMessageLog} />);
    
    // Verify the main structural elements are present
    expect(screen.getByTestId('ai-command-input')).toBeInTheDocument();
    expect(screen.getByText('Companies')).toBeInTheDocument(); // Navigation
    
    // The table should be rendered by the DataTable component
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});