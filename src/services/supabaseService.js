const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    this.client = null;
  }

  initialize(supabaseUrl, supabaseKey) {
    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase URL and Key are required for initialization.");
      return;
    }
    this.client = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized.");
  }

  // --- Generic Helper Methods ---
  
  async getAll(tableName) {
    if (!this.client) throw new Error("Supabase client not initialized");
    const { data, error } = await this.client.from(tableName).select('*');
    if (error) throw error;
    return data;
  }

  async getById(tableName, id) {
    if (!this.client) throw new Error("Supabase client not initialized");
    const { data, error } = await this.client.from(tableName).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async create(tableName, record) {
    if (!this.client) throw new Error("Supabase client not initialized");
    const { data, error } = await this.client.from(tableName).insert([record]).select();
    if (error) throw error;
    return data;
  }

  async update(tableName, id, updates) {
    if (!this.client) throw new Error("Supabase client not initialized");
    const { data, error } = await this.client.from(tableName).update(updates).eq('id', id).select();
    if (error) throw error;
    return data;
  }

  async delete(tableName, id) {
    if (!this.client) throw new Error("Supabase client not initialized");
    const { error } = await this.client.from(tableName).delete().eq('id', id);
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
    if (!this.client) throw new Error("Supabase client not initialized");
    const { data, error } = await this.client
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
    if (!this.client) throw new Error("Supabase client not initialized");
    const { data, error } = await this.client
      .from('prompts')
      .upsert({ name, content }, { onConflict: 'name' })
      .select();
      
    if (error) throw error;
    return data;
  }
}

const supabaseService = new SupabaseService();
module.exports = supabaseService; 