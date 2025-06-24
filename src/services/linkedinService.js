import supabaseService from './supabaseService';

class LinkedInService {
  constructor() {
    this.baseUrl = 'https://api.linkedin.com/v2';
    this.shortLinkService = 'https://tinyurl.com/api-create.php'; // Using TinyURL as example
  }

  /**
   * Search for LinkedIn profiles based on contact information
   * This is a simulation of LinkedIn search - in real implementation,
   * you would use LinkedIn's People Search API or web scraping (with proper permissions)
   */
  async searchLinkedInProfile(contact) {
    try {
      console.log(`🔍 Searching LinkedIn for: ${contact.name} (${contact.email})`);
      
      // For now, we'll create a simulated LinkedIn URL based on the contact's name
      // In a real implementation, you would:
      // 1. Use LinkedIn's People Search API
      // 2. Use web scraping with proper permissions
      // 3. Use third-party services like Apollo, ZoomInfo, etc.
      
      const searchQuery = this._buildSearchQuery(contact);
      const linkedinUrl = await this._simulateLinkedInSearch(searchQuery, contact);
      
      if (linkedinUrl) {
        // Shorten the LinkedIn URL
        const shortUrl = await this._shortenUrl(linkedinUrl);
        return {
          originalUrl: linkedinUrl,
          shortUrl: shortUrl || linkedinUrl,
          found: true
        };
      }
      
      return {
        originalUrl: null,
        shortUrl: null,
        found: false
      };
    } catch (error) {
      console.error('Error searching LinkedIn profile:', error);
      return {
        originalUrl: null,
        shortUrl: null,
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
   * Simulate LinkedIn search (replace with real implementation)
   */
  async _simulateLinkedInSearch(searchQuery, contact) {
    // This is a simulation - in reality, you'd implement actual search
    if (!contact.name || contact.name.trim().length < 2) {
      return null;
    }
    
    // Create a realistic LinkedIn URL based on the contact's name
    const firstName = contact.name.split(' ')[0]?.toLowerCase() || '';
    const lastName = contact.name.split(' ').slice(1).join('-').toLowerCase() || '';
    
    if (firstName && lastName) {
      // Generate different URL patterns
      const patterns = [
        `https://www.linkedin.com/in/${firstName}-${lastName}`,
        `https://www.linkedin.com/in/${firstName}${lastName}`,
        `https://www.linkedin.com/in/${firstName}-${lastName}-${Math.random().toString(36).substr(2, 5)}`,
      ];
      
      // Randomly select a pattern (in real implementation, you'd actually search)
      const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
      
      // Simulate some contacts not being found
      if (Math.random() < 0.2) { // 20% chance of not finding
        return null;
      }
      
      return selectedPattern;
    }
    
    return null;
  }

  /**
   * Shorten LinkedIn URL using a URL shortening service
   */
  async _shortenUrl(longUrl) {
    try {
      // Using TinyURL as an example - you can replace with your preferred service
      const response = await fetch(`${this.shortLinkService}?url=${encodeURIComponent(longUrl)}`);
      
      if (response.ok) {
        const shortUrl = await response.text();
        return shortUrl;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to shorten URL:', error);
      return null;
    }
  }

  /**
   * Update contact with LinkedIn information
   */
  async updateContactLinkedIn(contactId, linkedinData, connectionStatus = 'unknown') {
    try {
      const updates = {
        linkedin_url: linkedinData.shortUrl || linkedinData.originalUrl,
        linkedin_connection_status: connectionStatus
      };

      const result = await supabaseService.update('contacts', contactId, updates);
      return result;
    } catch (error) {
      console.error('Failed to update contact LinkedIn info:', error);
      throw error;
    }
  }

  /**
   * Batch search and update LinkedIn profiles for all contacts
   */
  async findLinkedInForAllContacts(onProgress = null) {
    try {
      // Get all contacts from database
      const contacts = await supabaseService.getAll('contacts');
      console.log(`🔍 Starting LinkedIn search for ${contacts.length} contacts`);
      
      const results = {
        total: contacts.length,
        found: 0,
        updated: 0,
        errors: 0,
        skipped: 0
      };

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        
        // Skip if already has LinkedIn URL
        if (contact.linkedin_url) {
          results.skipped++;
          onProgress?.({
            current: i + 1,
            total: contacts.length,
            contact: contact.name,
            status: 'skipped - already has LinkedIn',
            results
          });
          continue;
        }

        try {
          // Search for LinkedIn profile
          const linkedinData = await this.searchLinkedInProfile(contact);
          
          if (linkedinData.found) {
            // Update the contact with LinkedIn info
            await this.updateContactLinkedIn(contact.id, linkedinData, 'unknown');
            results.found++;
            results.updated++;
            
            onProgress?.({
              current: i + 1,
              total: contacts.length,
              contact: contact.name,
              status: `found - ${linkedinData.shortUrl}`,
              results
            });
          } else {
            onProgress?.({
              current: i + 1,
              total: contacts.length,
              contact: contact.name,
              status: 'not found',
              results
            });
          }
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error processing ${contact.name}:`, error);
          results.errors++;
          
          onProgress?.({
            current: i + 1,
            total: contacts.length,
            contact: contact.name,
            status: `error - ${error.message}`,
            results
          });
        }
      }

      console.log('✅ LinkedIn search completed:', results);
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
   * Get emoji for connection status
   */
  getConnectionStatusEmoji(status) {
    const emojiMap = {
      'connected': '✅',
      'not_connected': '❌', 
      'unknown': '❓',
      'sent_message_no_response': '📩'
    };
    
    return emojiMap[status] || '❓';
  }

  /**
   * Get display text for connection status
   */
  getConnectionStatusText(status) {
    const textMap = {
      'connected': 'Connected',
      'not_connected': 'Not Connected',
      'unknown': 'Unknown',
      'sent_message_no_response': 'Message Sent (No Response)'
    };
    
    return textMap[status] || 'Unknown';
  }
}

const linkedinService = new LinkedInService();
export default linkedinService;