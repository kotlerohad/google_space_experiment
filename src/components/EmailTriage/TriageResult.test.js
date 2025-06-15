import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TriageResult from './TriageResult';
import { AppContext } from '../../AppContext';

// Mock the DebugWindow component
jest.mock('./DebugWindow', () => {
  return function MockDebugWindow({ onCollapse }) {
    return (
      <div data-testid="debug-window">
        <button onClick={onCollapse} data-testid="debug-collapse-btn">
          Collapse Debug
        </button>
        Debug Window Content
      </div>
    );
  };
});

// Mock the OpenAI service
const mockOpenAIService = {
  triageEmail: jest.fn()
};

// Mock context
const mockContext = {
  openAIService: mockOpenAIService
};

// Mock triage result
const mockTriageResult = {
  key_point: 'Respond',
  confidence: 8,
  action_reason: 'Test action reason',
  suggested_draft: 'Test draft content',
  participants: { sender: 'test@example.com' },
  database_insights: { contacts: [] },
  examples: { similar_emails: [] },
  activated_agents: ['response_agent'],
  agent_prompts: { response_agent: 'Test prompt' },
  database_suggestions: { suggested_entries: [] }
};

// Mock email
const mockEmail = {
  id: 'test-email-1',
  from: 'test@example.com',
  subject: 'Test Subject',
  body: 'Test email body'
};

describe('TriageResult Component', () => {
  const mockOnEmailAction = jest.fn();
  const mockOnFeedback = jest.fn();
  const mockOnMessageLog = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <AppContext.Provider value={mockContext}>
        <TriageResult
          email={mockEmail}
          result={mockTriageResult}
          onEmailAction={mockOnEmailAction}
          onFeedback={mockOnFeedback}
          onMessageLog={mockOnMessageLog}
          {...props}
        />
      </AppContext.Provider>
    );
  };

  test('renders without crashing', () => {
    renderComponent();
    expect(screen.getByText('Triage Result: Respond')).toBeInTheDocument();
  });

  test('displays confidence score correctly', () => {
    renderComponent();
    expect(screen.getByText('(8/10)')).toBeInTheDocument();
  });

  test('shows triage result content by default (not collapsed)', () => {
    renderComponent();
    
    // Should show the main content
    expect(screen.getByText('Action Decision')).toBeInTheDocument();
    expect(screen.getByText('Test action reason')).toBeInTheDocument();
    expect(screen.getByText('Was this helpful?')).toBeInTheDocument();
  });

  test('collapses triage result when collapse button is clicked', () => {
    renderComponent();
    
    // Find and click the collapse button
    const collapseButton = screen.getByRole('button', { name: /collapse triage result/i });
    fireEvent.click(collapseButton);
    
    // Should hide the main content
    expect(screen.queryByText('Action Decision')).not.toBeInTheDocument();
    expect(screen.queryByText('Test action reason')).not.toBeInTheDocument();
    expect(screen.queryByText('Was this helpful?')).not.toBeInTheDocument();
    
    // But header should still be visible
    expect(screen.getByText('Triage Result: Respond')).toBeInTheDocument();
  });

  test('expands triage result when collapse button is clicked again', () => {
    renderComponent();
    
    const collapseButton = screen.getByRole('button', { name: /collapse triage result/i });
    
    // Collapse first
    fireEvent.click(collapseButton);
    expect(screen.queryByText('Action Decision')).not.toBeInTheDocument();
    
    // Expand again (button text should change to "expand")
    const expandButton = screen.getByRole('button', { name: /expand triage result/i });
    fireEvent.click(expandButton);
    expect(screen.getByText('Action Decision')).toBeInTheDocument();
  });

  test('shows debug window collapsed by default', () => {
    renderComponent();
    
    // Should show collapsed debug window
    expect(screen.getByText('Debug Information')).toBeInTheDocument();
    expect(screen.getByText('Analyze')).toBeInTheDocument();
    
    // Should not show expanded debug window
    expect(screen.queryByTestId('debug-window')).not.toBeInTheDocument();
  });

  test('expands debug window when Analyze button is clicked', () => {
    renderComponent();
    
    // Click the Analyze button
    const analyzeButton = screen.getByText('Analyze');
    fireEvent.click(analyzeButton);
    
    // Should show expanded debug window
    expect(screen.getByTestId('debug-window')).toBeInTheDocument();
    expect(screen.getByText('Debug Window Content')).toBeInTheDocument();
    
    // Should not show collapsed debug window
    expect(screen.queryByText('Analyze')).not.toBeInTheDocument();
  });

  test('collapses debug window when collapse button in debug window is clicked', () => {
    renderComponent();
    
    // Expand debug window first
    const analyzeButton = screen.getByText('Analyze');
    fireEvent.click(analyzeButton);
    expect(screen.getByTestId('debug-window')).toBeInTheDocument();
    
    // Click collapse button in debug window
    const debugCollapseButton = screen.getByTestId('debug-collapse-btn');
    fireEvent.click(debugCollapseButton);
    
    // Should show collapsed debug window again
    expect(screen.getByText('Debug Information')).toBeInTheDocument();
    expect(screen.getByText('Analyze')).toBeInTheDocument();
    expect(screen.queryByTestId('debug-window')).not.toBeInTheDocument();
  });

  test('debug window state is independent of triage result collapse state', () => {
    renderComponent();
    
    // Collapse triage result
    const triageCollapseButton = screen.getByRole('button', { name: /collapse triage result/i });
    fireEvent.click(triageCollapseButton);
    
    // Debug window should still be visible (in collapsed state)
    expect(screen.getByText('Debug Information')).toBeInTheDocument();
    expect(screen.getByText('Analyze')).toBeInTheDocument();
    
    // Expand debug window
    const analyzeButton = screen.getByText('Analyze');
    fireEvent.click(analyzeButton);
    
    // Debug window should be expanded even though triage is collapsed
    expect(screen.getByTestId('debug-window')).toBeInTheDocument();
    expect(screen.queryByText('Action Decision')).not.toBeInTheDocument(); // Triage still collapsed
  });

  test('handles feedback correctly', async () => {
    renderComponent();
    
    // Click Good feedback
    const goodButton = screen.getByText('Good');
    fireEvent.click(goodButton);
    
    // Should show feedback confirmation
    await waitFor(() => {
      expect(screen.getByText('Thanks for the feedback!')).toBeInTheDocument();
    });
    
    // Should call onFeedback
    expect(mockOnFeedback).toHaveBeenCalledWith(
      mockEmail.id,
      mockEmail,
      mockTriageResult,
      'good',
      ''
    );
  });

  test('handles draft creation correctly', async () => {
    renderComponent();
    
    // Click create draft button
    const draftButton = screen.getByText('Create Gmail Draft');
    fireEvent.click(draftButton);
    
    // Should call onEmailAction
    await waitFor(() => {
      expect(mockOnEmailAction).toHaveBeenCalledWith(
        mockEmail.id,
        'create_draft',
        {
          to: mockEmail.from,
          subject: `Re: ${mockEmail.subject}`,
          body: mockTriageResult.suggested_draft
        }
      );
    });
  });

  test('shows loading state correctly', () => {
    const loadingResult = { isLoading: true };
    renderComponent({ result: loadingResult });
    
    expect(screen.getByText('AI is analyzing this email...')).toBeInTheDocument();
  });

  test('shows error state correctly', () => {
    const errorResult = { error: 'Test error message' };
    renderComponent({ result: errorResult });
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  test('displays stored result indicator', () => {
    const storedResult = { ...mockTriageResult, isStored: true };
    renderComponent({ result: storedResult });
    
    expect(screen.getByText('Stored')).toBeInTheDocument();
  });

  test('handles low confidence scenarios', () => {
    const lowConfidenceResult = { 
      ...mockTriageResult, 
      confidence: 3,
      uncertainty_factors: ['Factor 1', 'Factor 2'],
      alternative_options: [
        { action: 'Archive', likelihood: 30, reason: 'Could be archived' }
      ]
    };
    renderComponent({ result: lowConfidenceResult });
    
    expect(screen.getByText('Why AI is Uncertain')).toBeInTheDocument();
    expect(screen.getByText('Alternative Options')).toBeInTheDocument();
  });
}); 