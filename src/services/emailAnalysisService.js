import supabaseService from './supabaseService';

/**
 * Service for analyzing email correspondence to find last chat dates
 */
export const emailAnalysisService = {
  /**
   * Find the last chat date for a specific contact by analyzing triage results
   * @param {string} contactEmail - The email address of the contact
   * @returns {Promise<Date|null>} - The date of the last email correspondence, or null if none found
   */
  async findLastChatForContact(contactEmail) {
    try {
      if (!contactEmail) {
        return null;
      }

      console.log(`Searching for last chat with: ${contactEmail}`);
      
      // First, let's see what columns are available and what data exists
      const { data: sampleData, error: sampleError } = await supabaseService.supabase
        .from('triage_results')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.error('Error getting sample data:', sampleError);
      } else if (sampleData && sampleData.length > 0) {
        console.log('Sample triage_results record:', sampleData[0]);
      } else {
        console.log('No triage_results records found in database');
      }
      
      // Query triage_results for emails involving this contact
      // Search in multiple fields: email_from, email_to, participants, etc.
      const { data: triageResults, error } = await supabaseService.supabase
        .from('triage_results')
        .select('created_at, email_from, email_to, subject, participants')
        .or(`email_from.ilike.%${contactEmail}%,email_to.ilike.%${contactEmail}%,participants.ilike.%${contactEmail}%,subject.ilike.%${contactEmail}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error querying triage results:', error);
        return null;
      }

      if (triageResults && triageResults.length > 0) {
        const result = triageResults[0];
        const lastChatDate = new Date(result.created_at);
        console.log(`Found last chat for ${contactEmail}: ${lastChatDate.toISOString()}`);
        console.log(`Email details - From: ${result.email_from}, To: ${result.email_to}, Subject: ${result.subject}`);
        return lastChatDate;
      }

      console.log(`No email correspondence found for ${contactEmail}`);
      return null;
    } catch (error) {
      console.error('Error in findLastChatForContact:', error);
      return null;
    }
  },

  /**
   * Update the last_chat field for a contact if the found date is newer than existing
   * @param {number} contactId - The ID of the contact
   * @param {Date} lastChatDate - The date of the last chat
   * @param {Date|null} existingDate - The existing last_chat date
   * @returns {Promise<boolean>} - True if updated successfully
   */
  async updateContactLastChat(contactId, lastChatDate, existingDate) {
    try {
      // Only update if we found a date and it's newer than existing (or no existing date)
      if (!lastChatDate || (existingDate && lastChatDate <= existingDate)) {
        return false;
      }

      const { error } = await supabaseService.supabase
        .from('contacts')
        .update({ last_chat: lastChatDate.toISOString() })
        .eq('id', contactId);

      if (error) {
        console.error(`Error updating last_chat for contact ${contactId}:`, error);
        return false;
      }

      console.log(`Updated last_chat for contact ${contactId}: ${lastChatDate.toISOString()}`);
      return true;
    } catch (error) {
      console.error('Error in updateContactLastChat:', error);
      return false;
    }
  },

  /**
   * Find and update last chat dates for all contacts
   * @returns {Promise<{updated: number, total: number}>} - Summary of the operation
   */
  async findLastChatForAllContacts() {
    try {
      console.log('Starting email analysis for all contacts...');
      
      // Get all contacts with their email addresses
      const { data: contacts, error: contactsError } = await supabaseService.supabase
        .from('contacts')
        .select('id, email, last_chat')
        .not('email', 'is', null)
        .neq('email', '');

      if (contactsError) {
        console.error('Error fetching contacts:', contactsError);
        return { updated: 0, total: 0 };
      }

      if (!contacts || contacts.length === 0) {
        console.log('No contacts with email addresses found');
        return { updated: 0, total: 0 };
      }

      console.log(`Found ${contacts.length} contacts with email addresses`);
      
      let updatedCount = 0;
      const totalContacts = contacts.length;

      // Process contacts in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        
        // Process batch with delay to be respectful to the database
        const batchResults = await Promise.all(batch.map(async (contact, index) => {
          // Add small delay between requests
          await new Promise(resolve => setTimeout(resolve, index * 100));
          
          const existingDate = contact.last_chat ? new Date(contact.last_chat) : null;
          const lastChatDate = await this.findLastChatForContact(contact.email);
          
          return await this.updateContactLastChat(contact.id, lastChatDate, existingDate);
        }));
        
        // Count successful updates
        updatedCount += batchResults.filter(result => result === true).length;

        // Small delay between batches
        if (i + batchSize < contacts.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`Email analysis complete: Updated ${updatedCount} out of ${totalContacts} contacts`);
      return { updated: updatedCount, total: totalContacts };
    } catch (error) {
      console.error('Error in findLastChatForAllContacts:', error);
      return { updated: 0, total: 0 };
    }
  },

  /**
   * Update company last_chat dates based on their contacts' last_chat dates
   * @returns {Promise<{updated: number, total: number}>} - Summary of the operation
   */
  async updateCompanyLastChatDates() {
    try {
      console.log('Updating company last_chat dates...');
      
      // Get all companies
      const { data: companies, error: companiesError } = await supabaseService.supabase
        .from('companies')
        .select('id, name');

      if (companiesError) {
        console.error('Error fetching companies:', companiesError);
        return { updated: 0, total: 0 };
      }

      if (!companies || companies.length === 0) {
        console.log('No companies found');
        return { updated: 0, total: 0 };
      }

      let updatedCount = 0;
      const totalCompanies = companies.length;

      for (const company of companies) {
        try {
          // Find the most recent last_chat date among all contacts for this company
          const { data: contacts, error: contactsError } = await supabaseService.supabase
            .from('contacts')
            .select('last_chat')
            .eq('company_id', company.id)
            .not('last_chat', 'is', null)
            .order('last_chat', { ascending: false })
            .limit(1);

          if (contactsError) {
            console.error(`Error fetching contacts for company ${company.id}:`, contactsError);
            continue;
          }

          if (contacts && contacts.length > 0) {
            const latestLastChat = contacts[0].last_chat;
            
            // Update the company's last_chat date
            const { error: updateError } = await supabaseService.supabase
              .from('companies')
              .update({ last_chat: latestLastChat })
              .eq('id', company.id);

            if (updateError) {
              console.error(`Error updating company ${company.id}:`, updateError);
            } else {
              console.log(`Updated company ${company.name} last_chat: ${latestLastChat}`);
              updatedCount++;
            }
          }
        } catch (error) {
          console.error(`Error processing company ${company.id}:`, error);
        }
      }

      console.log(`Company update complete: Updated ${updatedCount} out of ${totalCompanies} companies`);
      return { updated: updatedCount, total: totalCompanies };
    } catch (error) {
      console.error('Error in updateCompanyLastChatDates:', error);
      return { updated: 0, total: 0 };
    }
  }
}; 