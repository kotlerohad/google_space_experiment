import { createClient } from '@supabase/supabase-js';

class SupabaseService {
  constructor() {
    this.supabaseUrl = null;
    this.supabaseKey = null;
    this.supabase = null;
    this.isInitialized = false;
  }

  isConnected() {
    return !!this.supabase && this.isInitialized;
  }

  initialize(supabaseUrl, supabaseKey) {
    // Prevent re-initialization if already initialized with same credentials
    if (this.isInitialized && this.supabaseUrl === supabaseUrl && this.supabaseKey === supabaseKey) {
      console.log("✅ Supabase already initialized with same credentials");
      return;
    }
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase URL or Key is missing. Supabase client not initialized.");
      this.isInitialized = false;
      return;
    }
    
    // Check for placeholder values
    if (supabaseUrl.includes('your_supabase_url_here') || supabaseKey.includes('your_supabase_key_here')) {
      console.error("Supabase credentials contain placeholder values!");
      this.isInitialized = false;
      return;
    }
    
    try {
      console.log("🔧 Initializing Supabase client...");
      this.supabaseUrl = supabaseUrl;
      this.supabaseKey = supabaseKey;
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.isInitialized = true;
      console.log("✅ Supabase client initialized successfully.");
    } catch (error) {
      console.error("❌ Failed to initialize Supabase client:", error);
      this.isInitialized = false;
      this.supabase = null;
      throw error;
    }
  }

  async testConnection() {
    if (!this.supabase) {
      throw new Error("Supabase client not initialized");
    }
    
    try {
      console.log('🔍 Testing Supabase connection...');
      // A simple query to test the connection
      const { data, error } = await this.supabase.from('companies').select('id').limit(1);
      if (error) {
        console.error('🔍 Supabase query error:', error);
        throw error;
      }
      console.log('🔍 Supabase connection successful, data:', data);
      return data;
    } catch (error) {
      console.error('🔍 Supabase connection test failed:', error);
      throw error;
    }
  }

  // --- Generic Helper Methods ---
  
  async getAll(tableName) {
    if (!this.supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await this.supabase.from(tableName).select('*');
    if (error) throw error;
    return data;
  }

  async getById(tableName, id) {
    if (!this.supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await this.supabase.from(tableName).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async create(tableName, record) {
    if (!this.supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await this.supabase.from(tableName).insert([record]).select();
    if (error) throw error;
    return data;
  }

  async update(tableName, id, updates) {
    if (!this.supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await this.supabase.from(tableName).update(updates).eq('id', id).select();
    if (error) throw error;
    return data;
  }

  async delete(tableName, id) {
    if (!this.supabase) throw new Error("Supabase client not initialized");
    const { error } = await this.supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // --- Table-specific Methods ---

  // Companies
  getCompanies = () => this.getAll('companies');
  createCompany = (companyData) => this.create('companies', companyData);
  updateCompany = (id, updates) => this.update('companies', id, updates);

  // Safe delete company with option to handle related records
  async deleteCompanyById(companyId, options = {}) {
    if (!this.supabase) throw new Error("Supabase client not initialized");
    
    const { handleRelatedRecords = 'error' } = options; // 'error', 'delete', 'unlink'
    
    try {
      // First check if there are related contacts
      const { data: relatedContacts, error: contactsError } = await this.supabase
        .from('contacts')
        .select('id, name')
        .eq('company_id', companyId);
        
      if (contactsError) throw contactsError;
      
      if (relatedContacts && relatedContacts.length > 0) {
        const contactNames = relatedContacts.map(c => c.name || `Contact #${c.id}`).join(', ');
        
        if (handleRelatedRecords === 'error') {
          throw new Error(`Cannot delete company - it has ${relatedContacts.length} related contact(s): ${contactNames}. Use 'delete contacts first' or 'unlink contacts' option.`);
        } else if (handleRelatedRecords === 'delete') {
          // Delete related contacts first
          for (const contact of relatedContacts) {
            const { error: deleteContactError } = await this.supabase
              .from('contacts')
              .delete()
              .eq('id', contact.id);
            if (deleteContactError) throw deleteContactError;
          }
        } else if (handleRelatedRecords === 'unlink') {
          // Set company_id to null for related contacts
          const { error: unlinkError } = await this.supabase
            .from('contacts')
            .update({ company_id: null })
            .eq('company_id', companyId);
          if (unlinkError) throw unlinkError;
        }
      }
      
      // Now delete the company
      const { error: deleteError } = await this.supabase
        .from('companies')
        .delete()
        .eq('id', companyId);
        
      if (deleteError) throw deleteError;
      
      return true;
    } catch (error) {
      console.error(`Failed to delete company ${companyId}:`, error);
      throw error;
    }
  }

  // Contacts
  getContacts = () => this.getAll('contacts');
  createContact = (contactData) => this.create('contacts', contactData);
  updateContact = (id, updates) => this.update('contacts', id, updates);

  // Activities
  getActivities = () => this.getAll('activities');
  createActivity = (activityData) => this.create('activities', activityData);
  updateActivity = (id, updates) => this.update('activities', id, updates);

  // Artifacts
  getArtifacts = () => this.getAll('artifacts');
  createArtifact = (artifactData) => this.create('artifacts', artifactData);
  updateArtifact = (id, updates) => this.update('artifacts', id, updates);

  // --- Prompts ---

  async getPrompt(name) {
    if (!this.supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await this.supabase
      .from('prompts')
      .select('content')
      .eq('name', name)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore 'not found' errors
      throw error;
    }
    return data ? data.content : null;
  }

  async savePrompt(name, content) {
    if (!this.supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await this.supabase
      .from('prompts')
      .upsert({ name, content }, { onConflict: 'name' })
      .select();
      
    if (error) throw error;
    return data;
  }

  async getPrompts() {
    const { data, error } = await this.supabase.from('prompts').select('*');
    if (error) throw error;
    return data;
  }

  /**
   * Resolves foreign key lookups.
   * E.g., { company_type_name: "Investor" } becomes { company_type_id: 123 }
   * @param {object} payload - The data payload for the operation.
   * @returns {Promise<object>} - The resolved payload.
   */
  async _resolveLookups(payload) {
    const resolvedPayload = { ...payload };
    const lookupKeys = Object.keys(resolvedPayload).filter(k => k.endsWith('_name'));

    for (const key of lookupKeys) {
      const tableName = key.replace(/_name$/, 's'); // e.g., company_type_name -> company_types
      const name = resolvedPayload[key];
      
      try {
        const { data, error } = await this.supabase.from(tableName).select('id').eq('name', name).single();
        if (error) throw new Error(`Could not find ${name} in ${tableName}`);
        
        const idKey = key.replace(/_name$/, '_id');
        resolvedPayload[idKey] = data.id;
        delete resolvedPayload[key];
      } catch (error) {
        console.error(`Lookup failed for ${key}:`, error);
        throw error; // Propagate error to stop execution
      }
    }
    return resolvedPayload;
  }

  /**
   * Executes a batch of database operations generated by the AI.
   * @param {Array<object>} operations - An array of operation objects.
   */
  async executeDbOperations(operations) {
    if (!this.supabase) throw new Error("Supabase client not initialized");
    if (!operations || operations.length === 0) return;

    for (const op of operations) {
      // Handle both 'action' and 'operation' field names for backward compatibility
      const action = op.action || op.operation;
      const table = op.table;
      const payload = op.payload || op.data; // Handle both 'payload' and 'data'
      const where = op.where;
      
      // Validate required fields
      if (!action || typeof action !== 'string') {
        throw new Error(`Invalid operation: missing or invalid 'action' field in ${JSON.stringify(op)}`);
      }
      if (!table || typeof table !== 'string') {
        throw new Error(`Invalid operation: missing or invalid 'table' field in ${JSON.stringify(op)}`);
      }
      
      try {
        const resolvedPayload = payload ? await this._resolveLookups(payload) : {};

        switch (action.toLowerCase()) {
          case 'insert':
            const { error: insertError } = await this.supabase.from(table).insert(resolvedPayload);
            if (insertError) throw insertError;
            break;

          case 'update':
            if (!where) throw new Error('UPDATE operation requires a "where" clause.');
            const { error: updateError } = await this.supabase.from(table).update(resolvedPayload).match(where);
            if (updateError) throw updateError;
            break;

          case 'delete':
            if (!where) throw new Error('DELETE operation requires a "where" clause.');
            const { error: deleteError } = await this.supabase.from(table).delete().match(where);
            if (deleteError) throw deleteError;
            break;

          default:
            throw new Error(`Unsupported database operation: ${action}`);
        }
      } catch (error) {
        console.error(`Failed to execute operation: ${JSON.stringify(op)}`, error);
        
        // Provide better error messages for common issues
        if (error.code === '23503') {
          // Foreign key constraint violation
          if (action.toLowerCase() === 'delete') {
            throw new Error(`Cannot delete ${table} record - it's still referenced by other records. Please delete or update the referencing records first.`);
          } else {
            throw new Error(`Foreign key constraint violation: ${error.message}`);
          }
        } else if (error.code === '23505') {
          // Unique constraint violation
          throw new Error(`Duplicate entry: A record with these values already exists.`);
        } else if (error.code === '23502') {
          // Not null constraint violation
          throw new Error(`Missing required field: ${error.message}`);
        } else {
        throw new Error(`Database operation failed: ${error.message}`);
        }
      }
    }
  }
}

const supabaseService = new SupabaseService();
export default supabaseService; 