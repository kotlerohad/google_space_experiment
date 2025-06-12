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
      const { action, table, payload, where } = op;
      
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
        throw new Error(`Database operation failed: ${error.message}`);
      }
    }
  }
}

const supabaseService = new SupabaseService();
export default supabaseService; 