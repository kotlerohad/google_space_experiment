class EmailService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.clientId = null;
    this.clientSecret = null;
    this.isOAuthConfigured = false;
    
    // OAuth configuration
    this.oauthConfig = {
      authURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token',
      scope: [
        'https://www.googleapis.com/auth/gmail.modify', // Read, write, modify emails, but not delete
        'https://www.googleapis.com/auth/gmail.compose', // Create and send drafts
        'https://www.googleapis.com/auth/calendar.readonly' // Read access to calendars
      ].join(' '),
      redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/oauth-callback.html` : 'http://localhost/oauth-callback.html'
    };
  }

  setOAuthConfig(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.isOAuthConfigured = !!(clientId && clientSecret);
    console.log('📧 Gmail OAuth configured:', this.isOAuthConfigured);
  }

  // Generate OAuth authorization URL
  generateAuthURL() {
    if (!this.isOAuthConfigured) {
      throw new Error('OAuth not configured. Please set client ID and secret.');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      scope: this.oauthConfig.scope,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `${this.oauthConfig.authURL}?${params.toString()}`;
  }

  getCodeFromUrl(url) {
    try {
      const urlObject = new URL(url);
      const code = urlObject.searchParams.get('code');
      if (!code) {
        throw new Error('Authorization code not found in the URL.');
      }
      return code;
    } catch (error) {
      throw new Error('Invalid URL provided.');
    }
  }

  async getTokens(code) {
    if (!this.isOAuthConfigured) {
      throw new Error('OAuth not configured. Please set client ID and secret.');
    }
    const response = await fetch(this.oauthConfig.tokenURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.oauthConfig.redirectUri,
      }),
    });
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token exchange failed: ${errorData}`);
    }
    return response.json();
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(authorizationCode) {
    if (!this.isOAuthConfigured) {
      throw new Error('OAuth not configured. Please set client ID and secret.');
    }

    try {
      const response = await fetch(this.oauthConfig.tokenURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: authorizationCode,
          grant_type: 'authorization_code',
          redirect_uri: this.oauthConfig.redirectUri
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Token exchange failed: ${errorData}`);
      }

      const tokens = await response.json();
      
      // Store tokens
      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token || this.refreshToken;
      this.tokenExpiry = new Date(Date.now() + (tokens.expires_in * 1000));

      // Save to localStorage for persistence
      localStorage.setItem('gmail_tokens', JSON.stringify({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        tokenExpiry: this.tokenExpiry.toISOString()
      }));

      console.log('📧 OAuth tokens obtained successfully');
      return tokens;
    } catch (error) {
      console.error('OAuth token exchange failed:', error);
      throw error;
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available. Re-authorization required.');
    }

    try {
      const response = await fetch(this.oauthConfig.tokenURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Token refresh failed: ${errorData}`);
      }

      const tokens = await response.json();
      
      // Update access token
      this.accessToken = tokens.access_token;
      this.tokenExpiry = new Date(Date.now() + (tokens.expires_in * 1000));

      // Update stored tokens, but only if in a browser context
      if (typeof localStorage !== 'undefined') {
        const stored = JSON.parse(localStorage.getItem('gmail_tokens') || '{}');
        stored.accessToken = this.accessToken;
        stored.tokenExpiry = this.tokenExpiry.toISOString();
        // Also update refresh token if a new one was issued
        if (tokens.refresh_token) {
            stored.refreshToken = tokens.refresh_token;
        }
        localStorage.setItem('gmail_tokens', JSON.stringify(stored));
      }

      console.log('📧 Access token refreshed successfully');
      return tokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  // Load tokens from localStorage
  loadStoredTokens() {
    try {
      const stored = JSON.parse(localStorage.getItem('gmail_tokens') || '{}');
      if (stored.accessToken) {
        this.accessToken = stored.accessToken;
        this.refreshToken = stored.refreshToken;
        this.tokenExpiry = stored.tokenExpiry ? new Date(stored.tokenExpiry) : null;
        console.log('📧 Stored Gmail tokens loaded');
        return true;
      }
    } catch (error) {
      console.error('Error loading stored tokens:', error);
    }
    return false;
  }

  // Check if token needs refresh (5 minutes buffer)
  needsTokenRefresh() {
    if (!this.tokenExpiry) return false;
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    return new Date(Date.now() + bufferTime) >= this.tokenExpiry;
  }

  // Ensure valid token (refresh if needed)
  async ensureValidToken() {
    if (!this.accessToken) {
      // Try to load from storage first
      if (!this.loadStoredTokens()) {
        throw new Error('No access token available. Authorization required.');
      }
    }

    if (this.needsTokenRefresh()) {
      if (!this.refreshToken) {
        throw new Error('Token expired and no refresh token available. Re-authorization required.');
      }
      await this.refreshAccessToken();
    }

    return this.accessToken;
  }

  // Start OAuth flow
  async startOAuthFlow() {
    if (!this.isOAuthConfigured) {
      throw new Error('OAuth not configured. Please set client ID and secret.');
    }

    const authURL = this.generateAuthURL();
    
    // Open OAuth window
    const popup = window.open(
      authURL,
      'gmail-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          reject(new Error('OAuth popup was closed'));
        }
      }, 1000);

      // Listen for the authorization code
      const messageListener = async (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GMAIL_OAUTH_SUCCESS' && event.data.code) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          popup.close();
          
          try {
            const tokens = await this.exchangeCodeForTokens(event.data.code);
            resolve(tokens);
          } catch (error) {
            reject(error);
          }
        }
        
        if (event.data.type === 'GMAIL_OAUTH_ERROR') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          popup.close();
          reject(new Error(event.data.error || 'OAuth failed'));
        }
      };

      window.addEventListener('message', messageListener);
    });
  }

  // Clear stored tokens (logout)
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    // Clear from localStorage as well
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('gmail_tokens');
    }
    console.log('📧 All Gmail tokens cleared');
  }

  // Check OAuth status
  getOAuthStatus() {
    const hasAccessToken = !!this.accessToken && new Date() < this.tokenExpiry;
    // Check if the scope for calendar access was granted
    const hasCalendarAccess = this.oauthConfig.scope.includes('calendar');

    return {
      isConfigured: this.isOAuthConfigured,
      hasAccessToken,
      hasCalendarAccess,
      needsReauth: this.isOAuthConfigured && !this.refreshToken
    };
  }

  // --- Main API Methods ---

  parseEmailMessage(message) {
    // Handle error responses from Gmail API
    if (message && message.error) {
      console.warn('Gmail API returned error for message:', message.error);
      return null;
    }
    
    if (!message || !message.payload) {
      console.warn('Skipping message with missing payload:', message?.id || 'unknown');
      return null;
    }

    try {
      const headers = message.payload.headers || [];
      const getHeader = (name) => {
        const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return header ? header.value : '';
      };

      let body = '';
      if (message.payload.parts) {
        const part = message.payload.parts.find(p => p.mimeType === 'text/plain') || message.payload.parts[0];
         if (part && part.body && part.body.data) {
          body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
      } else if (message.payload.body && message.payload.body.data) {
        body = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }

      return {
        id: message.id,
        threadId: message.threadId,
        from: getHeader('From'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        snippet: message.snippet || '',
        body: body.substring(0, 2000), // Truncate for performance
      };
    } catch (error) {
      console.warn('Failed to parse email message:', error.message, 'Message ID:', message?.id);
      return null;
    }
  }

  async fetchEmails(maxResults = 20) {
    await this.ensureValidToken();

    // 1. Get list of message IDs
    const listResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=-is:draft`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    if (!listResponse.ok) throw new Error('Failed to fetch email list.');
    const listData = await listResponse.json();
    if (!listData.messages || listData.messages.length === 0) return [];

    // 2. Fetch email details sequentially with rate limiting to avoid 429 errors
    const emails = [];
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let i = 0; i < listData.messages.length; i++) {
      const msg = listData.messages[i];
      
      try {
        const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        
        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`Rate limited on message ${i + 1}/${listData.messages.length}. Waiting 2 seconds...`);
            await delay(2000);
            // Retry the request
            const retryResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
              headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            if (retryResponse.ok) {
              const message = await retryResponse.json();
              const parsedEmail = this.parseEmailMessage(message);
              if (parsedEmail) emails.push(parsedEmail);
            }
          }
          continue;
        }
        
        const message = await response.json();
        const parsedEmail = this.parseEmailMessage(message);
        if (parsedEmail) {
          emails.push(parsedEmail);
        }
        
        // Add small delay between requests to be respectful to the API
        if (i < listData.messages.length - 1) {
          await delay(100);
        }
        
      } catch (error) {
        console.warn(`Failed to fetch message ${msg.id}:`, error.message);
        continue;
      }
    }

    return emails;
  }

  async archiveEmail(emailId) {
    await this.ensureValidToken();
    const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ removeLabelIds: ['INBOX'] })
    });
    if (!response.ok) {
      throw new Error('Failed to archive email.');
    }
    return response.json();
  }

  async createDraft(to, subject, body) {
    await this.ensureValidToken();
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset="UTF-8"',
      'MIME-Version: 1.0',
      '',
      body
    ].join('\n');

    const base64EncodedMessage = btoa(unescape(encodeURIComponent(message)));

    const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/drafts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: { raw: base64EncodedMessage } })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Draft creation failed:', errorData);
      throw new Error(`Failed to create draft. API responded with: ${JSON.stringify(errorData.error.message)}`);
    }

    return response.json();
  }

  async testCalendarConnection() {
    await this.ensureValidToken();
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=5&orderBy=startTime&singleEvents=true', {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch calendar events.');
    }
    const data = await response.json();
    return data.items || [];
  }

  async getDetailedCalendarInfo(daysAhead = 7) {
    await this.ensureValidToken();
    
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + daysAhead);
    
    const timeMin = now.toISOString();
    const timeMax = endDate.toISOString();
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&` +
      `timeMax=${encodeURIComponent(timeMax)}&` +
      `singleEvents=true&orderBy=startTime&maxResults=50`,
      {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch detailed calendar events.');
    }
    
    const data = await response.json();
    const events = data.items || [];
    
    // Process events to extract busy times
    const busyTimes = events
      .filter(event => event.start && event.end)
      .map(event => ({
        title: event.summary || 'Busy',
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date),
        isAllDay: !event.start.dateTime
      }))
      .sort((a, b) => a.start - b.start);
    
    // Generate available time slots (9 AM - 6 PM, weekdays)
    const availableSlots = this.generateAvailableTimeSlots(busyTimes, daysAhead);
    
    return {
      totalEvents: events.length,
      busyTimes,
      availableSlots,
      timeRange: {
        start: timeMin,
        end: timeMax
      }
    };
  }

  generateAvailableTimeSlots(busyTimes, daysAhead = 7) {
    const slots = [];
    const now = new Date();
    
    for (let day = 0; day < daysAhead; day++) {
      const currentDate = new Date(now);
      currentDate.setDate(now.getDate() + day);
      
      // Skip weekends
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        continue;
      }
      
      // Skip past days or current day if it's past 5 PM
      if (day === 0 && now.getHours() >= 17) {
        continue;
      }
      
      // Generate time slots from 9 AM to 6 PM (30-minute slots)
      const startHour = day === 0 ? Math.max(9, now.getHours() + 1) : 9;
      const endHour = 18;
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, minute, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotStart.getMinutes() + 30);
          
          // Check if this slot conflicts with any busy time
          const isConflict = busyTimes.some(busy => {
            if (busy.isAllDay) {
              return slotStart.toDateString() === busy.start.toDateString();
            }
            return (slotStart < busy.end && slotEnd > busy.start);
          });
          
          if (!isConflict) {
            slots.push({
              start: slotStart,
              end: slotEnd,
              formatted: this.formatTimeSlot(slotStart, slotEnd)
            });
          }
        }
      }
    }
    
    return slots.slice(0, 10); // Return first 10 available slots
  }

  formatTimeSlot(start, end) {
    const options = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    const startStr = start.toLocaleDateString('en-US', options);
    const endStr = end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    
    return `${startStr} - ${endStr}`;
  }

  async markAsSpam(emailId) {
    await this.ensureValidToken();
    const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        addLabelIds: ['SPAM'],
        removeLabelIds: ['INBOX']
      })
    });
    if (!response.ok) {
      throw new Error('Failed to mark email as spam.');
    }
    return response.json();
  }

  async markAsImportant(emailId) {
    if (!this.accessToken) {
      throw new Error('Gmail access token is required');
    }

    try {
      const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          addLabelIds: ['IMPORTANT']
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gmail API error: ${errorData.error.message}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error marking as important:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.ensureValidToken();
      const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/profile`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch profile.');
      return await response.json();
    } catch (error) {
      console.error('Gmail connection test failed:', error);
      throw error;
    }
  }

  generateStructuredMeetingSlots(busyTimes = []) {
    const slots = [];
    const now = new Date();
    
    // Start from 2 business days from now
    let currentDate = new Date(now);
    let businessDaysAdded = 0;
    
    // Find the date that is 2 business days from now
    while (businessDaysAdded < 2) {
      currentDate.setDate(currentDate.getDate() + 1);
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        businessDaysAdded++;
      }
    }
    
    // Generate 3 meeting slots over the next few business days
    let slotsGenerated = 0;
    let dayOffset = 0;
    
    while (slotsGenerated < 3 && dayOffset < 10) {
      const slotDate = new Date(currentDate);
      slotDate.setDate(currentDate.getDate() + dayOffset);
      
      // Skip weekends
      if (slotDate.getDay() === 0 || slotDate.getDay() === 6) {
        dayOffset++;
        continue;
      }
      
      // Define potential meeting times (2-3 hour slots)
      const meetingTimes = [
        { start: 9, duration: 2 },   // 9 AM - 11 AM
        { start: 10, duration: 3 },  // 10 AM - 1 PM  
        { start: 14, duration: 2 },  // 2 PM - 4 PM
        { start: 15, duration: 2.5 } // 3 PM - 5:30 PM
      ];
      
      for (const timeSlot of meetingTimes) {
        if (slotsGenerated >= 3) break;
        
        const slotStart = new Date(slotDate);
        slotStart.setHours(timeSlot.start, 0, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(slotStart.getHours() + Math.floor(timeSlot.duration));
        slotEnd.setMinutes(slotStart.getMinutes() + ((timeSlot.duration % 1) * 60));
        
        // Check if this slot conflicts with any busy time
        const isConflict = busyTimes.some(busy => {
          if (busy.isAllDay) {
            return slotStart.toDateString() === busy.start.toDateString();
          }
          return (slotStart < busy.end && slotEnd > busy.start);
        });
        
        if (!isConflict) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            formatted: this.formatMeetingSlot(slotStart, slotEnd, timeSlot.duration),
            duration: timeSlot.duration
          });
          slotsGenerated++;
          break; // Move to next day after finding a slot
        }
      }
      
      dayOffset++;
    }
    
    return slots;
  }

  formatMeetingSlot(start, end, duration) {
    const options = {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    };
    
    const dateStr = start.toLocaleDateString('en-US', options);
    const startTime = start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    const endTime = end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    
    const durationStr = duration === Math.floor(duration) ? 
      `${duration} hours` : 
      `${Math.floor(duration)} hours ${((duration % 1) * 60)} minutes`;
    
    return `${dateStr}, ${startTime} - ${endTime} (${durationStr})`;
  }
}

const emailService = new EmailService();
export default emailService; 