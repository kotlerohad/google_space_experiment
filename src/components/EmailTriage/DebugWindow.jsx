import React, { useState } from 'react';
import { DatabaseIcon, UserIcon, SearchIcon, SparklesIcon, MailIcon, EditIcon, ArchiveIcon, ChevronUpIcon } from '../shared/Icons';
import DebugAnalysisService from '../../services/debugAnalysisService';

const DebugWindow = ({ triageResult, email, openAIService, onCollapse }) => {
  // Each column manages its own selected sub-box
  const [selectedInputs, setSelectedInputs] = useState('participants');
  const [selectedAgents, setSelectedAgents] = useState('selection');
  const [selectedOutputs, setSelectedOutputs] = useState('answer');
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const runAnalysis = async () => {
    if (!openAIService || !triageResult || !email) return;
    
    setIsAnalyzing(true);
    try {
      const debugService = new DebugAnalysisService(openAIService);
      const result = await debugService.analyzeDebugInfo(triageResult, email);
      setAnalysis(result);
    } catch (error) {
      setAnalysis({ error: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sub-box definitions
  const inputSubBoxes = [
    { key: 'participants', label: 'Participants', icon: <UserIcon className="h-4 w-4" /> },
    { key: 'database', label: 'Database', icon: <DatabaseIcon className="h-4 w-4" /> },
    { key: 'examples', label: 'Examples', icon: <SearchIcon className="h-4 w-4" /> },
  ];
  const agentSubBoxes = [
    { key: 'selection', label: 'Selection', icon: <SparklesIcon className="h-4 w-4" /> },
    { key: 'prompts', label: 'Prompts', icon: <MailIcon className="h-4 w-4" /> },
  ];
  const outputSubBoxes = [
    { key: 'answer', label: 'Answer & Confidence', icon: <EditIcon className="h-4 w-4" /> },
    { key: 'databaseActions', label: 'Database Actions', icon: <DatabaseIcon className="h-4 w-4" /> },
    { key: 'draftActions', label: 'Draft Actions', icon: <EditIcon className="h-4 w-4" /> },
    { key: 'archiveActions', label: 'Archive Actions', icon: <ArchiveIcon className="h-4 w-4" /> },
  ];

  // Content renderers
  const inputContent = {
    participants: (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Extracted Participants</h4>
        <div className="bg-gray-50 p-2 rounded">
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(triageResult.participants || {}, null, 2)}</pre>
        </div>
        {analysis?.inputs?.participants && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <h5 className="text-xs font-medium text-blue-700">Analysis</h5>
            <p className="text-xs text-blue-600">{analysis.inputs.participants}</p>
          </div>
        )}
      </div>
    ),
    database: (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Database Insights</h4>
        <div className="bg-gray-50 p-2 rounded">
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(triageResult.database_insights || {}, null, 2)}</pre>
        </div>
        {analysis?.inputs?.database && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <h5 className="text-xs font-medium text-blue-700">Analysis</h5>
            <p className="text-xs text-blue-600">{analysis.inputs.database}</p>
          </div>
        )}
      </div>
    ),
    examples: (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Provided Examples</h4>
        <div className="bg-gray-50 p-2 rounded">
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(triageResult.examples || {}, null, 2)}</pre>
        </div>
        {analysis?.inputs?.examples && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <h5 className="text-xs font-medium text-blue-700">Analysis</h5>
            <p className="text-xs text-blue-600">{analysis.inputs.examples}</p>
          </div>
        )}
      </div>
    ),
  };
  const agentContent = {
    selection: (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Activated Agents</h4>
        <div className="bg-gray-50 p-2 rounded">
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(triageResult.activated_agents || [], null, 2)}</pre>
        </div>
        {analysis?.agents?.selection && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <h5 className="text-xs font-medium text-blue-700">Analysis</h5>
            <p className="text-xs text-blue-600">{analysis.agents.selection}</p>
          </div>
        )}
      </div>
    ),
    prompts: (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Agent Prompts</h4>
        <div className="bg-gray-50 p-2 rounded">
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(triageResult.agent_prompts || {}, null, 2)}</pre>
        </div>
        {analysis?.agents?.prompts && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <h5 className="text-xs font-medium text-blue-700">Analysis</h5>
            <p className="text-xs text-blue-600">{analysis.agents.prompts}</p>
          </div>
        )}
      </div>
    ),
  };
  const outputContent = {
    answer: (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Core Answer</h4>
        <div className="bg-gray-50 p-2 rounded">
          <p className="text-sm">{triageResult.action_reason || 'No answer provided'}</p>
          <div className="mt-2">
            <span className="text-xs font-medium">Confidence: {triageResult.confidence || 0}/10</span>
          </div>
        </div>
        {analysis?.outputs?.answer && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <h5 className="text-xs font-medium text-blue-700">Analysis</h5>
            <p className="text-xs text-blue-600">{analysis.outputs.answer}</p>
          </div>
        )}
      </div>
    ),
    databaseActions: (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Proposed Database Changes</h4>
        <div className="bg-gray-50 p-2 rounded">
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(triageResult.database_suggestions || {}, null, 2)}</pre>
        </div>
        {analysis?.outputs?.databaseActions && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <h5 className="text-xs font-medium text-blue-700">Analysis</h5>
            <p className="text-xs text-blue-600">{analysis.outputs.databaseActions}</p>
          </div>
        )}
      </div>
    ),
    draftActions: (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Draft Email Content</h4>
        <div className="bg-gray-50 p-2 rounded">
          {triageResult.suggested_draft_pushy && (
            <div className="mb-2">
              <h5 className="text-xs font-medium text-purple-700">Pushy Draft</h5>
              <pre className="text-xs whitespace-pre-wrap">{triageResult.suggested_draft_pushy}</pre>
            </div>
          )}
          {triageResult.suggested_draft_exploratory && (
            <div className="mb-2">
              <h5 className="text-xs font-medium text-blue-700">Exploratory Draft</h5>
              <pre className="text-xs whitespace-pre-wrap">{triageResult.suggested_draft_exploratory}</pre>
            </div>
          )}
          {triageResult.suggested_draft && !triageResult.suggested_draft_pushy && !triageResult.suggested_draft_exploratory && (
            <div>
              <h5 className="text-xs font-medium text-gray-700">Standard Draft</h5>
              <pre className="text-xs whitespace-pre-wrap">{triageResult.suggested_draft}</pre>
            </div>
          )}
        </div>
        {analysis?.outputs?.draftActions && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <h5 className="text-xs font-medium text-blue-700">Analysis</h5>
            <p className="text-xs text-blue-600">{analysis.outputs.draftActions}</p>
          </div>
        )}
      </div>
    ),
    archiveActions: (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Archive Status</h4>
        <div className="bg-gray-50 p-2 rounded">
          {triageResult.key_point === 'Archive' && (
            <div className="space-y-1">
              <p className="text-xs">Confidence: {triageResult.confidence}/10</p>
              <p className="text-xs">Auto-archive: {triageResult.confidence >= 9 ? 'Enabled' : 'Disabled'}</p>
              {triageResult.confidence >= 9 && (
                <p className="text-xs text-yellow-600">
                  Will auto-archive after 2 hours from email receipt
                </p>
              )}
            </div>
          )}
        </div>
        {analysis?.outputs?.archiveActions && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <h5 className="text-xs font-medium text-blue-700">Analysis</h5>
            <p className="text-xs text-blue-600">{analysis.outputs.archiveActions}</p>
          </div>
        )}
      </div>
    ),
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
      {/* Header with controls */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <SparklesIcon className="h-4 w-4" />
            Debug Information
            {isAnalyzing && (
              <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600 ml-2"></div>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={runAnalysis}
              disabled={isAnalyzing || !openAIService}
              className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-1"
            >
              <SparklesIcon className="h-3 w-3" />
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
            <button
              onClick={onCollapse}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
              title="Collapse Debug Window"
            >
              <ChevronUpIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {isAnalyzing && (
        <div className="p-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-2 text-xs text-blue-700">
            <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
            Analyzing debug information...
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 p-4">
        {/* Inputs Column */}
        <div>
          <div className="font-semibold flex items-center gap-2 mb-2 text-purple-700"><DatabaseIcon className="h-5 w-5" />Inputs</div>
          <div className="flex flex-col gap-1 mb-2">
            {inputSubBoxes.map(sub => (
              <button
                key={sub.key}
                onClick={() => setSelectedInputs(sub.key)}
                className={`flex items-center gap-2 px-2 py-1 rounded text-sm font-medium transition-colors ${selectedInputs === sub.key ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {sub.icon}
                {sub.label}
              </button>
            ))}
          </div>
          <div className="mt-2">{inputContent[selectedInputs]}</div>
        </div>
        {/* Agents Column */}
        <div>
          <div className="font-semibold flex items-center gap-2 mb-2 text-purple-700"><SparklesIcon className="h-5 w-5" />Agents</div>
          <div className="flex flex-col gap-1 mb-2">
            {agentSubBoxes.map(sub => (
              <button
                key={sub.key}
                onClick={() => setSelectedAgents(sub.key)}
                className={`flex items-center gap-2 px-2 py-1 rounded text-sm font-medium transition-colors ${selectedAgents === sub.key ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {sub.icon}
                {sub.label}
              </button>
            ))}
          </div>
          <div className="mt-2">{agentContent[selectedAgents]}</div>
        </div>
        {/* Outputs Column */}
        <div>
          <div className="font-semibold flex items-center gap-2 mb-2 text-purple-700"><EditIcon className="h-5 w-5" />Outputs</div>
          <div className="flex flex-col gap-1 mb-2">
            {outputSubBoxes.map(sub => (
              <button
                key={sub.key}
                onClick={() => setSelectedOutputs(sub.key)}
                className={`flex items-center gap-2 px-2 py-1 rounded text-sm font-medium transition-colors ${selectedOutputs === sub.key ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {sub.icon}
                {sub.label}
              </button>
            ))}
          </div>
          <div className="mt-2">{outputContent[selectedOutputs]}</div>
        </div>
      </div>
      {/* Overall Analysis */}
      {analysis?.overall && (
        <div className="border-t border-gray-200 p-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-700 mb-2">Overall Analysis</h4>
            <p className="text-xs text-blue-600">{analysis.overall}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugWindow; 