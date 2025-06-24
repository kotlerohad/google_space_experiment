import supabaseService from './supabaseService';
import emailService from './emailService';

/**
 * Service for analyzing email correspondence to find last chat dates using Gmail API
 */
export const emailAnalysisService = {
  /**
   * Find the last chat date for a specific contact by searching Gmail
   * @param {string} contactEmail - The email address of the contact
   * @returns {Promise<Date|null>} - The date of the last email correspondence, or null if none found
   */
  async findLastChatForContact(contactEmail) {
    try {
      if (!contactEmail) {
        return null;
      }

      console.log(`🔍 Searching Gmail for last chat with: ${contactEmail}`);
      
      // Use Gmail API to search for emails involving this contact
      const emails = await emailService.searchEmails(contactEmail, 1); // Get just the most recent email
      
      if (emails && emails.length > 0) {
        const lastEmail = emails[0];
        const lastChatDate = new Date(lastEmail.date);
        console.log(`📧 Found last chat for ${contactEmail}: ${lastChatDate.toISOString()}`);
        console.log(`📧 Email details - Subject: "${lastEmail.subject}", From: ${lastEmail.from}`);
        return lastChatDate;
      }

      console.log(`📧 No email correspondence found in Gmail for ${contactEmail}`);
      return null;
    } catch (error) {
      console.error(`❌ Error searching Gmail for ${contactEmail}:`, error);
      return null;
    }
  },

  /**
   * Update the last_chat field for a contact if the found date is newer than existing
   * @param {number} contactId - The ID of the contact
   * @param {string} contactEmail - The email address of the contact
   * @param {Date} lastChatDate - The date of the last chat
   * @param {Date|null} existingDate - The existing last_chat date
   * @returns {Promise<boolean>} - True if updated successfully
   */
  async updateContactLastChat(contactId, contactEmail, lastChatDate, existingDate) {
    try {
      // Only update if we found a date and it's newer than existing (or no existing date)
      if (!lastChatDate || (existingDate && lastChatDate <= existingDate)) {
        console.log(`⏭️ Skipping update for ${contactEmail} - no newer date found`);
        return false;
      }

      const { error } = await supabaseService.supabase
        .from('contacts')
        .update({ last_chat: lastChatDate.toISOString() })
        .eq('id', contactId);

      if (error) {
        console.error(`❌ Error updating last_chat for contact ${contactId} (${contactEmail}):`, error);
        return false;
      }

      console.log(`✅ Updated last_chat for ${contactEmail}: ${lastChatDate.toISOString()}`);
      return true;
    } catch (error) {
      console.error('❌ Error in updateContactLastChat:', error);
      return false;
    }
  },

  /**
   * Find and update last chat dates for all contacts using Gmail API
   * @returns {Promise<{updated: number, total: number, skipped: number}>} - Summary of the operation
   */
  async findLastChatForAllContacts() {
    try {
      console.log('🚀 Starting Gmail-based email analysis for all contacts...');
      
      // Get all contacts with their email addresses
      const { data: contacts, error: contactsError } = await supabaseService.supabase
        .from('contacts')
        .select('id, name, email, last_chat')
        .not('email', 'is', null)
        .neq('email', '');

      if (contactsError) {
        console.error('❌ Error fetching contacts:', contactsError);
        return { updated: 0, total: 0, skipped: 0 };
      }

      if (!contacts || contacts.length === 0) {
        console.log('📭 No contacts with email addresses found');
        return { updated: 0, total: 0, skipped: 0 };
      }

      console.log(`📊 Found ${contacts.length} contacts with email addresses`);
      
      let updatedCount = 0;
      let skippedCount = 0;
      const totalContacts = contacts.length;

      // Process contacts in smaller batches to avoid rate limiting
      const batchSize = 5; // Smaller batch size for Gmail API
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        
        console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(contacts.length/batchSize)} (contacts ${i+1}-${Math.min(i+batchSize, contacts.length)})`);
        
        // Process each contact in the batch sequentially to avoid closure issues
        for (let j = 0; j < batch.length; j++) {
          const contact = batch[j];
          
          // Add delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, j * 200));
          
          try {
            const existingDate = contact.last_chat ? new Date(contact.last_chat) : null;
            const lastChatDate = await this.findLastChatForContact(contact.email);
            
            if (!lastChatDate) {
              skippedCount++;
              continue;
            }
            
            const updated = await this.updateContactLastChat(contact.id, contact.email, lastChatDate, existingDate);
            if (updated) {
              updatedCount++;
            }
          } catch (error) {
            console.error(`❌ Error processing contact ${contact.name} (${contact.email}):`, error);
            skippedCount++;
          }
        }

        // Longer delay between batches to be respectful to Gmail API
        if (i + batchSize < contacts.length) {
          console.log('⏳ Waiting before next batch...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`🎉 Gmail email analysis complete: Updated ${updatedCount} out of ${totalContacts} contacts (${skippedCount} skipped)`);
      return { updated: updatedCount, total: totalContacts, skipped: skippedCount };
    } catch (error) {
      console.error('❌ Error in findLastChatForAllContacts:', error);
      return { updated: 0, total: 0, skipped: 0 };
    }
  },

  /**
   * Update company last_chat dates based on their contacts' last_chat dates
   * @returns {Promise<{updated: number, total: number}>} - Summary of the operation
   */
  async updateCompanyLastChatDates() {
    try {
      console.log('🏢 Updating company last_chat dates...');
      
      // Get all companies
      const { data: companies, error: companiesError } = await supabaseService.supabase
        .from('companies')
        .select('id, name');

      if (companiesError) {
        console.error('❌ Error fetching companies:', companiesError);
        return { updated: 0, total: 0 };
      }

      if (!companies || companies.length === 0) {
        console.log('🏢 No companies found');
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
            console.error(`❌ Error fetching contacts for company ${company.id}:`, contactsError);
            continue;
          }

          if (contacts && contacts.length > 0) {
            const mostRecentLastChat = new Date(contacts[0].last_chat);
            
            // Update the company's last_chat field
            const { error: updateError } = await supabaseService.supabase
              .from('companies')
              .update({ last_chat: mostRecentLastChat.toISOString() })
              .eq('id', company.id);

            if (updateError) {
              console.error(`❌ Error updating company ${company.id} last_chat:`, updateError);
            } else {
              console.log(`✅ Updated company "${company.name}" last_chat: ${mostRecentLastChat.toISOString()}`);
              updatedCount++;
            }
          }
        } catch (error) {
          console.error(`❌ Error processing company ${company.id}:`, error);
        }
      }

      console.log(`🎉 Company last_chat update complete: Updated ${updatedCount} out of ${totalCompanies} companies`);
      return { updated: updatedCount, total: totalCompanies };
    } catch (error) {
      console.error('❌ Error in updateCompanyLastChatDates:', error);
      return { updated: 0, total: 0 };
    }
  }
};

export default emailAnalysisService; 