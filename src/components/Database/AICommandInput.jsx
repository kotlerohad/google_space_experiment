import React, { useState, useContext } from 'react';
import { AppContext } from '../../AppContext';
import { Send, Loader2 } from 'lucide-react';

const AICommandInput = ({ onCommandExecuted }) => {
  const { openAIService, supabaseService, onMessageLog } = useContext(AppContext);
  const [command, setCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!command.trim() || isExecuting) return;

    setIsExecuting(true);
    try {
      onMessageLog(`Executing AI command: "${command}"`, 'info');
      
      // Use OpenAI to generate database operations
      console.log('🤖 Sending command to AI:', command);
      const operations = await openAIService.generateDbOperations(command);
      console.log('🤖 AI generated operations:', operations);
      
      if (!operations.operations || operations.operations.length === 0) {
        console.log('⚠️ No operations generated by AI');
        onMessageLog('No database operations generated from command', 'warning');
        return;
      }

      console.log(`🚀 About to execute ${operations.operations.length} operation(s):`);
      operations.operations.forEach((op, index) => {
        console.log(`  ${index + 1}. ${op.action.toUpperCase()} on ${op.table}:`, op);
      });

      // Execute the operations
      await supabaseService.executeDbOperations(operations.operations);
      
      onMessageLog(`Successfully executed ${operations.operations.length} database operation(s)`, 'success');
      setCommand(''); // Clear the input
      
      // Notify parent to refresh data
      if (onCommandExecuted) {
        onCommandExecuted();
      }
      
    } catch (error) {
      console.error('❌ AI command execution failed:', error);
      onMessageLog(`Command failed: ${error.message}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const exampleCommands = [
    "Add a new company called 'TechCorp' in the Software industry",
    "Create a contact named 'John Smith' with email john@techcorp.com",
    "Add an activity 'Follow up call' for contact ID 1",
    "Update company ID 2 to have industry 'Fintech'"
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <h3 className="font-semibold text-blue-800">AI Database Commands</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Tell me what you want to do with the database..."
            className="flex-1 px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isExecuting}
          />
          <button
            type="submit"
            disabled={!command.trim() || isExecuting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExecuting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {isExecuting ? 'Executing...' : 'Execute'}
          </button>
        </div>
        
        <div className="text-xs text-blue-600">
          <details className="cursor-pointer">
            <summary className="hover:text-blue-800">💡 Example commands</summary>
            <div className="mt-2 space-y-1">
              {exampleCommands.map((example, index) => (
                <div 
                  key={index}
                  onClick={() => setCommand(example)}
                  className="cursor-pointer hover:bg-blue-100 p-1 rounded text-blue-700"
                >
                  • {example}
                </div>
              ))}
            </div>
          </details>
        </div>
      </form>
    </div>
  );
};

export default AICommandInput; 