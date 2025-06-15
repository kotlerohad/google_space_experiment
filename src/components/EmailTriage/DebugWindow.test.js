import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DebugWindow from './DebugWindow';

// Mock the OpenAI service
const mockOpenAIService = {
  triageEmail: jest.fn()
};

// Mock triage result
const mockTriageResult = {
  key_point: 'Respond',
  confidence: 8,
  action_reason: 'Test action reason',
  participants: { sender: 'test@example.com' },
  database_insights: { contacts: [] },
  examples: { similar_emails: [] },
  activated_agents: ['response_agent'],
  agent_prompts: { response_agent: 'Test prompt' },
  database_suggestions: { suggested_entries: [] },
  suggested_draft: 'Test draft content'
};

// Mock email
const mockEmail = {
  id: 'test-email-1',
  from: 'test@example.com',
  subject: 'Test Subject',
  body: 'Test email body'
};

describe('DebugWindow Component', () => {
  const mockOnCollapse = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(
      <DebugWindow 
        triageResult={mockTriageResult}
        email={mockEmail}
        openAIService={mockOpenAIService}
        onCollapse={mockOnCollapse}
      />
    );
    
    expect(screen.getByText('Debug Information')).toBeInTheDocument();
  });

  test('displays analyze button', () => {
    render(
      <DebugWindow 
        triageResult={mockTriageResult}
        email={mockEmail}
        openAIService={mockOpenAIService}
        onCollapse={mockOnCollapse}
      />
    );
    
    expect(screen.getByText('Analyze')).toBeInTheDocument();
  });

  test('calls onCollapse when collapse button is clicked', () => {
    render(
      <DebugWindow 
        triageResult={mockTriageResult}
        email={mockEmail}
        openAIService={mockOpenAIService}
        onCollapse={mockOnCollapse}
      />
    );
    
    const collapseButton = screen.getByTitle('Collapse Debug Window');
    fireEvent.click(collapseButton);
    
    expect(mockOnCollapse).toHaveBeenCalledTimes(1);
  });

  test('displays input sections correctly', () => {
    render(
      <DebugWindow 
        triageResult={mockTriageResult}
        email={mockEmail}
        openAIService={mockOpenAIService}
        onCollapse={mockOnCollapse}
      />
    );
    
    expect(screen.getByText('Inputs')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Examples')).toBeInTheDocument();
  });

  test('displays agent sections correctly', () => {
    render(
      <DebugWindow 
        triageResult={mockTriageResult}
        email={mockEmail}
        openAIService={mockOpenAIService}
        onCollapse={mockOnCollapse}
      />
    );
    
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Selection')).toBeInTheDocument();
    expect(screen.getByText('Prompts')).toBeInTheDocument();
  });

  test('displays output sections correctly', () => {
    render(
      <DebugWindow 
        triageResult={mockTriageResult}
        email={mockEmail}
        openAIService={mockOpenAIService}
        onCollapse={mockOnCollapse}
      />
    );
    
    expect(screen.getByText('Outputs')).toBeInTheDocument();
    expect(screen.getByText('Answer & Confidence')).toBeInTheDocument();
    expect(screen.getByText('Database Actions')).toBeInTheDocument();
    expect(screen.getByText('Draft Actions')).toBeInTheDocument();
    expect(screen.getByText('Archive Actions')).toBeInTheDocument();
  });

  test('handles missing props gracefully', () => {
    // Test with minimal props to ensure no runtime errors
    render(
      <DebugWindow 
        triageResult={{}}
        email={{}}
        openAIService={null}
        onCollapse={mockOnCollapse}
      />
    );
    
    expect(screen.getByText('Debug Information')).toBeInTheDocument();
  });

  test('shows analyzing state correctly', () => {
    render(
      <DebugWindow 
        triageResult={mockTriageResult}
        email={mockEmail}
        openAIService={mockOpenAIService}
        onCollapse={mockOnCollapse}
      />
    );
    
    const analyzeButton = screen.getByText('Analyze');
    fireEvent.click(analyzeButton);
    
    // Should show analyzing state
    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
  });
}); 