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
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/oauth-callback.html` : ''
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

      // Update stored tokens
      const stored = JSON.parse(localStorage.getItem('gmail_tokens') || '{}');
      stored.accessToken = this.accessToken;
      stored.tokenExpiry = this.tokenExpiry.toISOString();
      localStorage.setItem('gmail_tokens', JSON.stringify(stored));

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
    localStorage.removeItem('gmail_tokens');
    console.log('📧 Gmail tokens cleared');
  }

  // Check OAuth status
  getOAuthStatus() {
    return {
      isConfigured: this.isOAuthConfigured,
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      tokenExpiry: this.tokenExpiry,
      needsRefresh: this.needsTokenRefresh()
    };
  }

  async fetchEmails(maxResults = 10) {
    try {
      // Ensure we have a valid token
      await this.ensureValidToken();

      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Gmail API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.messages) {
        return [];
      }

      // Fetch detailed information for each message
      const emailPromises = data.messages.slice(0, maxResults).map(async (message) => {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!detailResponse.ok) {
          console.error(`Failed to fetch message ${message.id}`);
          return null;
        }

        const messageData = await detailResponse.json();
        return this.parseEmailMessage(messageData);
      });

      const emails = await Promise.all(emailPromises);
      return emails.filter(email => email !== null);

    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  async archiveEmail(emailId) {
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
          removeLabelIds: ['INBOX']
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gmail API error: ${errorData.error.message}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error archiving email:', error);
      throw error;
    }
  }

  async markAsSpam(emailId) {
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
          addLabelIds: ['SPAM'],
          removeLabelIds: ['INBOX']
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gmail API error: ${errorData.error.message}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error marking as spam:', error);
      throw error;
    }
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

  async getProfile() {
    await this.ensureValidToken();
    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch Gmail profile');
    }
    return await response.json();
  }
}

const emailService = new EmailService();
module.exports = emailService; 