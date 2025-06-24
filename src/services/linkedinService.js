import supabaseService from './supabaseService';

class LinkedInService {
  constructor() {
    this.baseUrl = 'https://api.linkedin.com/v2';
    this.openAIService = null;
  }

  /**
   * Set the OpenAI service instance for web search capabilities
   */
  setOpenAIService(openAIService) {
    this.openAIService = openAIService;
  }

  /**
   * Search for LinkedIn profiles using OpenAI web search
   * Only returns real LinkedIn profiles found through web search
   */
  async searchLinkedInProfile(contact) {
    try {
      if (!this.openAIService) {
        console.warn('⚠️ OpenAI service not available for LinkedIn search');
        return {
          originalUrl: null,
          found: false,
          error: 'OpenAI service not configured'
        };
      }

      console.log(`🔍 [REAL] Searching LinkedIn for: ${contact.name} (${contact.email || 'no email'})`);
      
      const searchQuery = this._buildSearchQuery(contact);
      const linkedinUrl = await this._realLinkedInSearch(searchQuery, contact);
      
      if (linkedinUrl) {
        return {
          originalUrl: linkedinUrl,
          found: true
        };
      }
      
      return {
        originalUrl: null,
        found: false
      };
    } catch (error) {
      console.error('Error searching LinkedIn profile:', error);
      return {
        originalUrl: null,
        found: false,
        error: error.message
      };
    }
  }

  /**
   * Build search query for LinkedIn
   */
  _buildSearchQuery(contact) {
    const parts = [];
    
    if (contact.name) {
      parts.push(contact.name);
    }
    
    if (contact.company_name && contact.company_name !== 'No Company') {
      parts.push(contact.company_name);
    }
    
    if (contact.title) {
      parts.push(contact.title);
    }
    
    return parts.join(' ');
  }

  /**
   * Real LinkedIn search using OpenAI web search capabilities
   */
  async _realLinkedInSearch(searchQuery, contact) {
    try {
      // Skip contacts with incomplete information
      if (!contact.name || contact.name.trim().length < 3) {
        console.log(`⚠️ Skipping contact with incomplete name: "${contact.name}"`);
        return null;
      }

      // Build comprehensive search query
      const searchTerms = [];
      searchTerms.push(`"${contact.name}"`);
      searchTerms.push('site:linkedin.com/in');
      
      if (contact.company_name && contact.company_name !== 'No Company') {
        searchTerms.push(`"${contact.company_name}"`);
      }
      
      if (contact.title && contact.title.length > 2) {
        searchTerms.push(`"${contact.title}"`);
      }

      const fullSearchQuery = searchTerms.join(' ');
      console.log(`🌐 Real search query: ${fullSearchQuery}`);

      // Use OpenAI's web search to find LinkedIn profile
      const searchResults = await this.openAIService.performWebSearch(fullSearchQuery);
      
      if (!searchResults || searchResults.length === 0) {
        console.log(`❌ No web search results for: ${contact.name}`);
        return null;
      }

      // Use OpenAI to analyze search results and extract LinkedIn profile
      const linkedinUrl = await this._extractLinkedInFromResults(searchResults, contact);
      
      if (linkedinUrl) {
        console.log(`✅ Real LinkedIn profile found for: ${contact.name} -> ${linkedinUrl}`);
        return linkedinUrl;
      } else {
        console.log(`❌ No LinkedIn profile found in search results for: ${contact.name}`);
        return null;
      }

    } catch (error) {
      console.error(`❌ Real LinkedIn search failed for ${contact.name}:`, error);
      return null;
    }
  }

  /**
   * Use OpenAI to analyze search results and extract the best LinkedIn profile URL
   */
  async _extractLinkedInFromResults(searchResults, contact) {
    try {
      const prompt = `You are a LinkedIn profile extraction expert. Analyze the following web search results and find the most relevant LinkedIn profile URL for the contact.

CONTACT INFORMATION:
- Name: ${contact.name}
- Company: ${contact.company_name || 'Unknown'}
- Title: ${contact.title || 'Unknown'}
- Email: ${contact.email || 'Unknown'}

SEARCH RESULTS:
${searchResults.map((result, index) => `
${index + 1}. Title: ${result.title}
   URL: ${result.url}
   Snippet: ${result.snippet}
`).join('\n')}

INSTRUCTIONS:
1. Look for LinkedIn profile URLs (linkedin.com/in/...) in the search results
2. Match the profile to the contact based on name, company, and title
3. Return ONLY the most relevant LinkedIn profile URL
4. If no good match is found, return "NOT_FOUND"
5. Ensure the URL is a valid LinkedIn profile URL (not company page or other LinkedIn content)
6. NEVER return fake, simulated, or empty URLs

RESPONSE FORMAT:
Return only the LinkedIn profile URL or "NOT_FOUND"`;

      const response = await this.openAIService._request({
        model: this.openAIService.model,
        messages: [
          { role: "system", content: "You are a LinkedIn profile extraction expert. Return only the requested LinkedIn URL or 'NOT_FOUND'. Never return fake or simulated URLs." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 200
      });

      const result = response.choices[0].message.content.trim();
      
      if (result === 'NOT_FOUND' || !result.includes('linkedin.com/in/')) {
        return null;
      }

      // Extract and validate the LinkedIn URL
      const urlMatch = result.match(/(https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s]+)/i);
      if (urlMatch) {
        return urlMatch[1];
      }

      return null;

    } catch (error) {
      console.error('Error extracting LinkedIn URL from results:', error);
      return null;
    }
  }

  /**
   * Update contact with LinkedIn information
   */
  async updateContactLinkedIn(contactId, linkedinData, connectionStatus = 'unknown') {
    try {
      // Only update if we have a real LinkedIn URL
      if (!linkedinData.originalUrl || !linkedinData.found) {
        console.log(`⚠️ Skipping update for contact ${contactId} - no valid LinkedIn URL found`);
        return null;
      }

      const updates = {
        linkedin: linkedinData.originalUrl,
        linkedin_connection_status: connectionStatus
      };

      const result = await supabaseService.update('contacts', contactId, updates);
      console.log(`✅ Updated contact ${contactId} with LinkedIn: ${linkedinData.originalUrl}`);
      return result;
    } catch (error) {
      console.error('Failed to update contact LinkedIn info:', error);
      throw error;
    }
  }

  /**
   * Batch search and update LinkedIn profiles for all contacts
   * Only finds and saves real LinkedIn profiles
   */
  async findLinkedInForAllContacts(onProgress = null) {
    try {
      if (!this.openAIService) {
        throw new Error('OpenAI service not configured for LinkedIn search');
      }

      // Get all contacts from database
      const contacts = await supabaseService.getAll('contacts');
      console.log(`🔍 Starting REAL LinkedIn search for ${contacts.length} contacts`);
      
      const results = {
        total: contacts.length,
        found: 0,
        updated: 0,
        errors: 0,
        skipped: 0,
        skipped_incomplete: 0
      };

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        
        // Skip if already has LinkedIn URL
        if (contact.linkedin) {
          results.skipped++;
          onProgress?.({
            current: i + 1,
            total: contacts.length,
            contact: contact.name || 'Unknown',
            status: 'skipped - already has LinkedIn',
            results
          });
          continue;
        }

        // Skip contacts with incomplete names
        if (!contact.name || 
            contact.name.trim().length < 3 ||
            contact.name.toLowerCase().includes('tbd') ||
            contact.name.toLowerCase().includes('name tbd')) {
          results.skipped_incomplete++;
          onProgress?.({
            current: i + 1,
            total: contacts.length,
            contact: contact.name || 'Unknown',
            status: 'skipped - incomplete name',
            results
          });
          continue;
        }

        try {
          // Search for LinkedIn profile using real search only
          const linkedinData = await this.searchLinkedInProfile(contact);
          
          if (linkedinData.found && linkedinData.originalUrl) {
            // Update the contact with real LinkedIn info
            await this.updateContactLinkedIn(contact.id, linkedinData, 'unknown');
            results.found++;
            results.updated++;
            
            onProgress?.({
              current: i + 1,
              total: contacts.length,
              contact: contact.name,
              status: `✅ found - ${linkedinData.originalUrl}`,
              results
            });
          } else {
            onProgress?.({
              current: i + 1,
              total: contacts.length,
              contact: contact.name,
              status: '❌ not found',
              results
            });
          }
          
          // Add delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`Error processing ${contact.name}:`, error);
          results.errors++;
          
          onProgress?.({
            current: i + 1,
            total: contacts.length,
            contact: contact.name || 'Unknown',
            status: `❌ error - ${error.message}`,
            results
          });
        }
      }

      console.log('✅ Real LinkedIn search completed:', results);
      return results;
      
    } catch (error) {
      console.error('Failed to search LinkedIn for contacts:', error);
      throw error;
    }
  }

  /**
   * Update connection status for a contact
   */
  async updateConnectionStatus(contactId, status) {
    try {
      const validStatuses = ['connected', 'not_connected', 'unknown', 'sent_message_no_response'];
      
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid connection status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const result = await supabaseService.update('contacts', contactId, {
        linkedin_connection_status: status
      });
      
      return result;
    } catch (error) {
      console.error('Failed to update connection status:', error);
      throw error;
    }
  }

  /**
   * Get emoji representation for connection status
   */
  getConnectionStatusEmoji(status) {
    const statusEmojis = {
      'connected': '✅',
      'not_connected': '❌',
      'unknown': '❓',
      'sent_message_no_response': '📩'
    };
    return statusEmojis[status] || '❓';
  }

  /**
   * Get text representation for connection status
   */
  getConnectionStatusText(status) {
    const statusTexts = {
      'connected': 'Connected',
      'not_connected': 'Not Connected',
      'unknown': 'Unknown',
      'sent_message_no_response': 'Message Sent (No Response)'
    };
    return statusTexts[status] || 'Unknown';
  }
}

const linkedinService = new LinkedInService();
export default linkedinService;