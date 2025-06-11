class MondayService {
  constructor() {
    this.apiToken = '';
    this.contextBoards = `
Relevant Monday.com Boards and their common columns (for AI reference):
- Companies Board: Key columns: Company Name, Industry.
- Activities Board: Key columns: Activity Name, Status, Related Contact, Action, Next Action.
- Contacts Board: Key columns: Name, Email, Company.
- Artifacts Board: Key columns: Document Name, Type, Related Project.
`;
  }

  setApiToken(token) {
    this.apiToken = token;
  }

  getContextBoards() {
    return this.contextBoards;
  }

  async executeGraphQL(query) {
    if (!this.apiToken) {
      throw new Error('Monday.com API token is required');
    }

    const apiUrl = "https://api.monday.com/v2";
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiToken,
          'API-Version': '2023-04'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`Monday.com API call failed with HTTP status ${response.status}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(`Monday.com API errors: ${result.errors.map(e => e.message).join(', ')}`);
      }

      return result;
    } catch (error) {
      console.error('Monday.com API call failed:', error);
      throw error;
    }
  }

  async getBoardIdByName(boardName) {
    const query = `{ boards(limit: 100) { id name } }`;
    
    try {
      const result = await this.executeGraphQL(query);
      if (result.data && result.data.boards) {
        const foundBoard = result.data.boards.find(board => 
          board.name.toLowerCase() === boardName.toLowerCase()
        );
        return foundBoard ? String(foundBoard.id) : null;
      }
    } catch (error) {
      console.error("Error fetching board by name:", error);
    }
    return null;
  }

  async getColumnIdByName(boardId, columnName) {
    const query = `{ boards(ids: ${boardId}) { columns { id title } } }`;
    
    try {
      const result = await this.executeGraphQL(query);
      if (result.data && result.data.boards && result.data.boards.length > 0 &&
          result.data.boards[0].columns) {
        
        const foundColumn = result.data.boards[0].columns.find(column => 
          column.title.toLowerCase() === columnName.toLowerCase()
        );
        return foundColumn ? foundColumn.id : null;
      }
    } catch (error) {
      console.error("Error fetching column by name:", error);
    }
    return null;
  }

  async queryBoardItems(boardId, columnTitlesToFetch) {
    // First, get column IDs from titles
    const columnsQuery = `{ boards(ids: ${boardId}) { columns { id title } } }`;
    const columnsResult = await this.executeGraphQL(columnsQuery);
    
    if (!columnsResult.data || !columnsResult.data.boards || !columnsResult.data.boards[0] || !columnsResult.data.boards[0].columns) {
      throw new Error(`Could not retrieve columns for board ID ${boardId}`);
    }
    
    const boardColumns = columnsResult.data.boards[0].columns;
    const columnIdsToFetch = [];
    
    columnTitlesToFetch.forEach(title => {
      const col = boardColumns.find(c => c.title.toLowerCase() === title.toLowerCase());
      if (col) {
        columnIdsToFetch.push(col.id);
      }
    });

    const itemQuery = `{
      boards(ids: ${boardId}) {
        items_page {
          items {
            id
            name
            column_values(ids: [${columnIdsToFetch.map(id => `"${id}"`).join(', ')}]) {
              id
              text
              title
              type
              value
            }
          }
        }
      }
    }`;
    
    try {
      const result = await this.executeGraphQL(itemQuery);
      if (result.data && result.data.boards && result.data.boards.length > 0 && 
          result.data.boards[0].items_page && result.data.boards[0].items_page.items) {
        return result.data.boards[0].items_page.items;
      }
    } catch (error) {
      console.error(`Error querying items for board ID ${boardId}:`, error);
    }
    return [];
  }

  async createItem(boardId, itemName) {
    const numericBoardId = Number(boardId);
    if (isNaN(numericBoardId)) {
      throw new Error('Board ID must be a valid number');
    }

    const query = `
      mutation {
        create_item (
          board_id: ${numericBoardId},
          item_name: "${itemName}"
        ) {
          id
          name
        }
      }
    `;

    const result = await this.executeGraphQL(query);
    if (result.data && result.data.create_item) {
      return result.data.create_item;
    } else {
      throw new Error('Failed to create item');
    }
  }

  async updateItemName(boardId, itemId, newName) {
    const numericBoardId = Number(boardId);
    const numericItemId = Number(itemId);
    
    if (isNaN(numericBoardId) || isNaN(numericItemId)) {
      throw new Error('Board ID and Item ID must be valid numbers');
    }

    const query = `
      mutation {
        change_item_name (
          board_id: ${numericBoardId},
          item_id: ${numericItemId},
          item_name: "${newName}"
        ) {
          id
          name
        }
      }
    `;

    const result = await this.executeGraphQL(query);
    if (result.data && result.data.change_item_name) {
      return result.data.change_item_name;
    } else {
      throw new Error('Failed to update item name');
    }
  }

  async updateColumnValue(boardId, itemId, columnId, newValue) {
    const numericBoardId = Number(boardId);
    const numericItemId = Number(itemId);
    
    if (isNaN(numericBoardId) || isNaN(numericItemId)) {
      throw new Error('Board ID and Item ID must be valid numbers');
    }

    // Format value based on column type
    let formattedValue;
    if (columnId.toLowerCase().includes('status')) { 
      formattedValue = JSON.stringify({ label: newValue });
    } else {
      formattedValue = JSON.stringify(newValue); 
    }

    const query = `
      mutation {
        change_column_value (
          board_id: ${numericBoardId},
          item_id: ${numericItemId},
          column_id: "${columnId}",
          value: "${formattedValue.replace(/"/g, '\\"')}"
        ) {
          id
          name
          column_values {
            id
            text
            value
            title
          }
        }
      }
    `;

    const result = await this.executeGraphQL(query);
    if (result.data && result.data.change_column_value) {
      return result.data.change_column_value;
    } else {
      throw new Error('Failed to update column value');
    }
  }

  async getBoardsByName(names) {
    const query = `{ boards(limit: 100) { id name } }`;
    
    try {
      const result = await this.executeGraphQL(query);
      if (result.data && result.data.boards) {
        const foundBoards = {};
        names.forEach(name => {
          const board = result.data.boards.find(b => 
            b.name.toLowerCase() === name.toLowerCase()
          );
          if (board) {
            foundBoards[name] = String(board.id);
          }
        });
        return foundBoards;
      }
    } catch (error) {
      console.error("Error fetching boards by names:", error);
    }
    return {};
  }

  // Helper method to resolve action parameters dynamically
  async resolveActionParameters(aiResponse, originalPrompt) {
    let boardForActionId = null;
    let resolvedItemId = null;
    
    // 1. Resolve Board ID
    if (aiResponse.targetBoardForAction) {
      if (!isNaN(Number(aiResponse.targetBoardForAction))) {
        boardForActionId = String(Number(aiResponse.targetBoardForAction));
      } else {
        const lookupId = await this.getBoardIdByName(aiResponse.targetBoardForAction);
        if (lookupId) {
          boardForActionId = lookupId;
        } else {
          throw new Error(`Could not find board with name "${aiResponse.targetBoardForAction}"`);
        }
      }
    }

    if (!boardForActionId || isNaN(Number(boardForActionId))) {
      throw new Error('A valid Board ID is required for the action');
    }

    // 2. Resolve Item ID (if needed)
    if (aiResponse.action !== "create_item" && aiResponse.entityToIdentify) {
      const entityType = aiResponse.entityToIdentify.type;
      const entityProperties = aiResponse.entityToIdentify.properties;
      let itemsToChooseFrom = [];
      let lookupBoardId = null;
      let relevantColumns = [];

      // Determine which board to query based on entity type
      if (entityType === 'contact') {
        lookupBoardId = await this.getBoardIdByName('Contacts');
        relevantColumns = ['Name', 'Company', 'Email'];
      } else if (entityType === 'activity') {
        lookupBoardId = await this.getBoardIdByName('Activities');
        relevantColumns = ['Activity Name', 'Status', 'Related Contact', 'Due Date'];
      } else if (entityType === 'company') {
        lookupBoardId = await this.getBoardIdByName('Companies');
        relevantColumns = ['Company Name', 'Industry', 'Website'];
      } else if (entityType === 'item') {
        lookupBoardId = boardForActionId;
        relevantColumns = ['Name'];
      } else {
        throw new Error(`Unknown entity type '${entityType}' for item lookup`);
      }

      if (!lookupBoardId) {
        throw new Error(`Could not resolve lookup board for entity type '${entityType}'`);
      }

      itemsToChooseFrom = await this.queryBoardItems(lookupBoardId, relevantColumns);
      
      if (itemsToChooseFrom.length === 0) {
        throw new Error(`No items found on board for entity type '${entityType}'`);
      }

      // Use Gemini to select best item (this will be called from the main service)
      return { boardForActionId, itemsToChooseFrom, entityProperties, originalPrompt };
    } else if (aiResponse.itemId) {
      resolvedItemId = aiResponse.itemId;
    }

    return { boardForActionId, resolvedItemId };
  }
}

const mondayServiceInstance = new MondayService();
export default mondayServiceInstance; 