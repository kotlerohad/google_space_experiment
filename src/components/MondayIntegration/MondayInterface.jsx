import React, { useState } from 'react';
import { PlayIcon, SearchIcon, SparklesIcon } from '../shared/Icons';
import mondayService from '../../services/mondayService';
import geminiService from '../../services/geminiService';

const MondayInterface = ({ onMessageLog, config }) => {
  const [manualItem, setManualItem] = useState({ name: '', boardId: '' });
  const [aiPrompt, setAiPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInvestigating, setIsInvestigating] = useState(false);

  const createManualItem = async () => {
    if (!config?.mondayApiToken) {
      onMessageLog?.('Please configure your Monday.com API token.', 'error');
      return;
    }

    if (!manualItem.name || !manualItem.boardId) {
      onMessageLog?.('Please provide both item name and board ID.', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      onMessageLog?.('Creating Monday.com item manually...', 'info');
      
      mondayService.setApiToken(config.mondayApiToken);
      const result = await mondayService.createItem(manualItem.boardId, manualItem.name);
      
      onMessageLog?.(`Successfully created item: "${result.name}" (ID: ${result.id})`, 'success');
      setManualItem({ name: '', boardId: '' });
    } catch (error) {
      onMessageLog?.(`Failed to create item: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const processWithAI = async (investigateOnly = false) => {
    if (!config?.mondayApiToken || !config?.geminiApiKey) {
      onMessageLog?.('Please configure both Monday.com API token and Gemini API key.', 'error');
      return;
    }

    if (!aiPrompt.trim()) {
      onMessageLog?.('Please provide an AI prompt describing what you want to do.', 'error');
      return;
    }

    const setLoadingState = investigateOnly ? setIsInvestigating : setIsProcessing;

    try {
      setLoadingState(true);
      onMessageLog?.('Stage 1: AI analyzing your request...', 'info');
      
      // Set up services
      mondayService.setApiToken(config.mondayApiToken);
      geminiService.setApiKey(config.geminiApiKey);
      
      // Stage 1: Intent Recognition
      const contextBoards = mondayService.getContextBoards();
      const aiResponse = await geminiService.analyzeMondayIntent(aiPrompt, contextBoards);
      
      onMessageLog?.(`AI identified action: ${aiResponse.action} on board: ${aiResponse.targetBoardForAction}`, 'info');

      // Stage 2: Resolve Parameters
      onMessageLog?.('Stage 2: Resolving board and item IDs...', 'info');
      const resolutionResult = await mondayService.resolveActionParameters(aiResponse, aiPrompt);
      
      if (resolutionResult.itemsToChooseFrom) {
        // Need AI to select best item
        onMessageLog?.(`Found ${resolutionResult.itemsToChooseFrom.length} potential items, asking AI to select best match...`, 'info');
        
        const selectedItemId = await geminiService.selectBestItem(
          aiPrompt,
          resolutionResult.itemsToChooseFrom,
          resolutionResult.entityProperties
        );
        
        if (!selectedItemId) {
          throw new Error('AI could not identify a matching item from the available options');
        }
        
        resolutionResult.resolvedItemId = selectedItemId;
        onMessageLog?.(`AI selected item ID: ${selectedItemId}`, 'success');
      }

      if (investigateOnly) {
        onMessageLog?.('Investigation complete! All parameters resolved successfully.', 'success');
        onMessageLog?.(`Final parameters: Board ID: ${resolutionResult.boardForActionId}, Item ID: ${resolutionResult.resolvedItemId || 'N/A (creating new item)'}`, 'info');
        return;
      }

      // Stage 3: Execute Monday.com Action
      onMessageLog?.('Stage 3: Executing Monday.com action...', 'info');
      
      const { boardForActionId, resolvedItemId } = resolutionResult;
      
      if (aiResponse.action === "create_item") {
        if (!aiResponse.itemName) {
          throw new Error('Item name is required for creating new items');
        }
        
        const result = await mondayService.createItem(boardForActionId, aiResponse.itemName);
        onMessageLog?.(`Successfully created item: "${result.name}" (ID: ${result.id})`, 'success');
        
      } else if (aiResponse.action === "update_item_name") {
        if (!resolvedItemId || !aiResponse.itemName) {
          throw new Error('Item ID and new name are required for updating item names');
        }
        
        const result = await mondayService.updateItemName(boardForActionId, resolvedItemId, aiResponse.itemName);
        onMessageLog?.(`Successfully updated item name to "${result.name}"`, 'success');
        
      } else if (aiResponse.action === "update_column_value") {
        if (!resolvedItemId) {
          throw new Error('Item ID is required for updating column values');
        }
        
        const updates = aiResponse.updates || [];
        if (updates.length === 0) {
          throw new Error('No column updates specified');
        }
        
        for (const update of updates) {
          let columnId = update.columnId;
          
          if (!columnId && update.columnNameToLookup) {
            columnId = await mondayService.getColumnIdByName(boardForActionId, update.columnNameToLookup);
            if (!columnId) {
              onMessageLog?.(`Warning: Could not find column "${update.columnNameToLookup}", skipping this update.`, 'error');
              continue;
            }
          }
          
          if (!columnId) {
            onMessageLog?.('Warning: Column ID could not be resolved for an update, skipping.', 'error');
            continue;
          }
          
          const result = await mondayService.updateColumnValue(boardForActionId, resolvedItemId, columnId, update.newValue);
          const updatedColumn = result.column_values.find(cv => cv.id === columnId);
          onMessageLog?.(`Successfully updated "${updatedColumn?.title || columnId}" to "${updatedColumn?.text || update.newValue}"`, 'success');
        }
      } else {
        throw new Error(`Unsupported action: ${aiResponse.action}`);
      }

      setAiPrompt(''); // Clear the prompt on success
      
    } catch (error) {
      onMessageLog?.(`AI processing failed: ${error.message}`, 'error');
    } finally {
      setLoadingState(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Manual Item Creation */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Manual Monday.com Actions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Item Name</label>
            <input
              type="text"
              value={manualItem.name}
              onChange={(e) => setManualItem(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter item name (e.g., 'Review Q3 Report')"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none transition"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Board ID</label>
            <input
              type="text"
              value={manualItem.boardId}
              onChange={(e) => setManualItem(prev => ({ ...prev, boardId: e.target.value }))}
              placeholder="Enter board ID (e.g., 1234567890)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none transition"
            />
          </div>
        </div>
        
        <button
          onClick={createManualItem}
          disabled={isProcessing || !config?.mondayApiToken}
          className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition duration-300 disabled:bg-green-300 flex items-center justify-center gap-2"
        >
          <PlayIcon className="h-4 w-4" />
          {isProcessing ? 'Creating...' : 'Create Item Manually'}
        </button>
      </div>

      {/* AI-Powered Monday.com Actions */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">AI-Powered Monday.com Actions</h2>
        
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">Describe what you want to do</label>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Examples:
• Create a new task called 'Review Q3 Report' on board 'Project Management'
• Change the status of 'Website Redesign' on 'Marketing Initiatives' to 'Done'
• Update the 'Action' for 'George from Alphabak' working at 'Alphabak' on board 'Activities' to 'Intro email sent'"
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => processWithAI(false)}
            disabled={isProcessing || !config?.mondayApiToken || !config?.geminiApiKey}
            className="bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 transition duration-300 disabled:bg-purple-300 flex items-center justify-center gap-2"
          >
            <SparklesIcon className="h-4 w-4" />
            {isProcessing ? 'Processing...' : 'Process & Execute'}
          </button>
          
          <button
            onClick={() => processWithAI(true)}
            disabled={isInvestigating || !config?.mondayApiToken || !config?.geminiApiKey}
            className="bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition duration-300 disabled:bg-gray-300 flex items-center justify-center gap-2"
          >
            <SearchIcon className="h-4 w-4" />
            {isInvestigating ? 'Investigating...' : 'Investigate Only'}
          </button>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Process & Execute:</strong> AI will analyze your request and perform the Monday.com action.</p>
          <p><strong>Investigate Only:</strong> AI will show you what it would do without actually making changes.</p>
        </div>
      </div>

      {/* Context Information */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Monday.com Context</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Available Boards:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>Companies Board:</strong> Company Name, Industry</li>
            <li><strong>Activities Board:</strong> Activity Name, Status, Related Contact, Action, Next Action</li>
            <li><strong>Contacts Board:</strong> Name, Email, Company</li>
            <li><strong>Artifacts Board:</strong> Document Name, Type, Related Project</li>
          </ul>
          <p className="mt-4 text-xs">
            The AI can find items by name across these boards and intelligently resolve relationships between them.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MondayInterface; 