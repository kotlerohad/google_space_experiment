import React, { useState, useEffect, useCallback } from 'react';
import mondayService from '../../services/mondayService';

const MondayIntegration = ({ onMessageLog, config }) => {
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [boardItems, setBoardItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadBoardItems = useCallback(async (boardId) => {
    setIsLoading(true);
    setError(null);

    try {
      onMessageLog?.(`Loading items from board ${boardId}...`, 'info');
      const items = await mondayService.getBoardItems(boardId);
      setBoardItems(items);
      onMessageLog?.(`Loaded ${items.length} items from board`, 'success');
    } catch (err) {
      setError(err.message);
      onMessageLog?.(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onMessageLog]);

  const loadBoards = useCallback(async () => {
    if (!config?.mondayApiToken) {
      setError('Please configure your Monday.com API token.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      onMessageLog?.('Loading Monday.com boards...', 'info');
      const boardsData = await mondayService.getBoards();
      setBoards(boardsData);
      onMessageLog?.(`Loaded ${boardsData.length} boards from Monday.com`, 'success');
      
      if (config.mondayBoardId) {
        const configuredBoard = boardsData.find(board => board.id === config.mondayBoardId);
        if (configuredBoard) {
          setSelectedBoard(configuredBoard);
          loadBoardItems(configuredBoard.id);
        }
      }
    } catch (err) {
      setError(err.message);
      onMessageLog?.(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [config?.mondayApiToken, config.mondayBoardId, onMessageLog, loadBoardItems]);

  useEffect(() => {
    if (config?.mondayApiToken) {
      mondayService.setApiToken(config.mondayApiToken);
      loadBoards();
    }
  }, [config?.mondayApiToken, loadBoards]);

  const handleBoardSelect = (board) => {
    setSelectedBoard(board);
    loadBoardItems(board.id);
  };

  const createTestItem = async () => {
    if (!selectedBoard) {
      onMessageLog?.('Please select a board first.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      onMessageLog?.('Creating test item...', 'info');
      
      const itemData = {
        name: `Test Item - ${new Date().toLocaleString()}`,
        column_values: {}
      };

      const newItem = await mondayService.createItem(selectedBoard.id, itemData);
      onMessageLog?.(`Created test item: ${newItem.name}`, 'success');
      
      // Reload board items to show the new one
      loadBoardItems(selectedBoard.id);
    } catch (err) {
      onMessageLog?.(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!config?.mondayApiToken) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Monday.com Integration</h3>
        <p className="text-gray-500">Configure your Monday.com API token to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Monday.com Integration</h3>
          <p className="text-sm text-gray-500">Manage your boards and items</p>
        </div>
        <button
          onClick={loadBoards}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            '🔄'
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Boards List */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-3">Available Boards ({boards.length})</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => handleBoardSelect(board)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedBoard?.id === board.id
                  ? 'bg-blue-100 border-blue-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{board.name}</div>
              <div className="text-sm text-gray-500">ID: {board.id}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Board Actions */}
      {selectedBoard && (
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">
              Board: {selectedBoard.name} ({boardItems.length} items)
            </h4>
            <button
              onClick={createTestItem}
              disabled={isLoading}
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:bg-green-300 text-sm"
            >
              + Create Test Item
            </button>
          </div>

          {/* Board Items */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {boardItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div>
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-gray-500">ID: {item.id}</div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {boardItems.length === 0 && !isLoading && (
              <div className="text-center py-4 text-gray-500">
                No items in this board
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      )}
    </div>
  );
};

export default MondayIntegration; 