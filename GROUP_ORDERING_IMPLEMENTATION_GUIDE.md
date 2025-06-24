# Group Ordering Implementation Guide

## Overview

I've implemented a comprehensive drag-and-drop group ordering system for your data tables. This allows you to:

1. **Drag and drop groups** to reorder them visually
2. **Persist the order** in the database per user
3. **Apply saved ordering** automatically when you return to the same grouping
4. **Reset to default order** when needed

## Database Setup

### 1. Create the Group Ordering Table

Run this SQL in your Supabase database:

```sql
-- Create table for storing group ordering preferences
CREATE TABLE IF NOT EXISTS group_orderings (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    group_by_column VARCHAR(100) NOT NULL,
    group_value TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_orderings_table_column ON group_orderings(table_name, group_by_column);
CREATE INDEX IF NOT EXISTS idx_group_orderings_user ON group_orderings(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_orderings_unique_per_user ON group_orderings(table_name, group_by_column, group_value, user_id);

-- Create trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_group_orderings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_group_orderings_updated_at
    BEFORE UPDATE ON group_orderings
    FOR EACH ROW
    EXECUTE FUNCTION update_group_orderings_updated_at();

-- RLS (Row Level Security) policies
ALTER TABLE group_orderings ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own group orderings
CREATE POLICY "Users can view their own group orderings" ON group_orderings
    FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own group orderings
CREATE POLICY "Users can insert their own group orderings" ON group_orderings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own group orderings
CREATE POLICY "Users can update their own group orderings" ON group_orderings
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own group orderings
CREATE POLICY "Users can delete their own group orderings" ON group_orderings
    FOR DELETE USING (auth.uid() = user_id);
```

## Features Implemented

### 1. **Enhanced SupabaseService**
- `getGroupOrdering(tableName, groupByColumn)` - Load saved group order
- `saveGroupOrdering(tableName, groupByColumn, orderedGroups)` - Save group order
- `clearGroupOrdering(tableName, groupByColumn)` - Reset to default order

### 2. **Enhanced DataTable Component**
- **Drag Handle**: Each group header now has a grip icon indicating it's draggable
- **Visual Feedback**: Groups become semi-transparent while being dragged
- **Smooth Ordering**: Groups reorder immediately with visual feedback
- **Loading States**: Shows spinner while loading/saving group order
- **Reset Function**: "Reset Order" button to return to default ordering

### 3. **User Experience Improvements**
- **Intuitive UI**: Clear visual indicators for drag-and-drop functionality
- **Persistent State**: Group order is automatically saved and restored
- **Per-User Settings**: Each user has their own group ordering preferences
- **Per-Table/Column**: Different orderings for different table and grouping combinations

## How to Use

### 1. **Enable Grouping**
- Select a grouping column from the "Group by" dropdown in the table navigation
- Groups will appear as separate expandable sections

### 2. **Reorder Groups**
- **Drag**: Click and hold the grip icon (⋮⋮) on any group header
- **Drop**: Drag to the position where you want the group to appear
- **Save**: The order is automatically saved to the database
- **Visual Feedback**: You'll see a success message confirming the save

### 3. **Reset Order**
- If you want to return to the default alphabetical order
- Click the "Reset Order" button in the footer
- This clears your custom ordering and returns to default

### 4. **Automatic Restoration**
- When you return to the same table and grouping combination
- Your custom group order will be automatically applied
- No manual action required

## Technical Details

### Database Schema
The `group_orderings` table stores:
- `table_name`: Which table the ordering applies to ('companies', 'contacts', etc.)
- `group_by_column`: Which column is being grouped by ('company_type_id', 'priority', etc.)
- `group_value`: The actual group value ('Customer (Bank)', 'High Priority', etc.)
- `display_order`: The desired display position (1, 2, 3, etc.)
- `user_id`: Which user this ordering belongs to (via RLS)

### Security
- **Row Level Security (RLS)** ensures users can only see/modify their own group orderings
- **Foreign Key Constraints** maintain data integrity
- **Indexes** provide fast lookups for better performance

### Error Handling
- Graceful fallback to default order if database is unavailable
- Clear error messages if save operations fail
- Automatic retry logic for transient failures

## Example Usage Scenarios

### Scenario 1: Company Type Grouping
1. Group companies by "Company Type"
2. Drag "Customer (Bank)" to the top
3. Move "Investors" to second position
4. Leave "Other" at the bottom
5. Order is saved automatically

### Scenario 2: Priority Grouping
1. Group contacts by "Priority"
2. Arrange as: High → Medium → Low
3. Your arrangement persists across sessions

### Scenario 3: Multiple Users
- Each user can have their own preferred group ordering
- User A prefers: Banks → NeoBank → Investors
- User B prefers: Investors → Banks → NeoBank
- Both preferences are maintained independently

## Testing

### Test the Implementation
1. **Create some grouped data** in your companies/contacts table
2. **Group by a column** (e.g., company_type_id)  
3. **Drag groups** to reorder them
4. **Refresh the page** to verify persistence
5. **Try the reset button** to return to default order

### Verify Database Storage
```sql
-- Check saved group orderings
SELECT * FROM group_orderings 
WHERE table_name = 'companies' 
  AND group_by_column = 'company_type_id'
ORDER BY display_order;
```

## Troubleshooting

### Groups Not Saving
- Check that you're authenticated (user_id is set)
- Verify Supabase connection is working
- Check browser console for error messages

### Groups Not Loading
- Verify the `group_orderings` table exists
- Check RLS policies are correctly set up
- Confirm user has proper permissions

### Drag and Drop Not Working
- Ensure you're dragging from the grip icon area
- Check that the grouping is active (groups are visible)
- Verify browser supports HTML5 drag and drop

## Future Enhancements

The implementation is designed to be extensible for:
- **Bulk reordering** via keyboard shortcuts
- **Group templates** for common arrangements  
- **Sharing orderings** between users
- **Import/export** of group configurations
- **Undo/redo** functionality for order changes

---

## Summary

You now have a complete drag-and-drop group ordering system that:
✅ **Works immediately** - just drag groups to reorder them  
✅ **Persists across sessions** - your order is saved in the database  
✅ **Scales per user** - each user has their own preferences  
✅ **Provides feedback** - clear visual and text confirmations  
✅ **Includes reset option** - easy return to default ordering  

The system is production-ready and handles edge cases gracefully while providing an intuitive user experience.