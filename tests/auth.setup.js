const { test, expect } = require('@playwright/test');
const emailService = require('../src/services/emailService');
const fs = require('fs');

const authFile = 'playwright/.auth/user.json';

test('authenticate programmatically', async ({ page }) => {
  // Ensure we have the necessary credentials from the .env file
  const clientId = process.env.REACT_APP_GMAIL_CLIENT_ID;
  const clientSecret = process.env.REACT_APP_GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.REACT_APP_GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Gmail OAuth credentials (client ID, secret, and refresh token) must be set in your .env file for testing.'
    );
  }

  // Use the email service to get a fresh access token
  emailService.setOAuthConfig(clientId, clientSecret);
  emailService.setRefreshToken(refreshToken);
  const { access_token, expires_in } = await emailService.refreshAccessToken();

  // Create the token object that the application expects in localStorage
  const gmailTokens = {
    accessToken: access_token,
    refreshToken: refreshToken,
    tokenExpiry: new Date(Date.now() + expires_in * 1000).toISOString(),
  };

  // Use a 'beforeunload' hook to ensure localStorage is set,
  // but this is tricky. A better way is to set it and then navigate.
  // Playwright's storageState is the most robust way to handle this.
  
  // First, create the directory if it doesn't exist
  fs.mkdirSync('playwright/.auth', { recursive: true });

  // Create an empty context state and then inject the localStorage value.
  // While we could navigate and set it, this ensures a clean state.
  const storageState = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: 'gmail_tokens',
            value: JSON.stringify(gmailTokens),
          },
        ],
      },
    ],
  };

  // Save the storage state to the auth file.
  fs.writeFileSync(authFile, JSON.stringify(storageState));

  console.log('Successfully authenticated and saved auth state.');
});

// We need to re-add setRefreshToken to emailService for this to work.
// This is a special case only for the test environment setup.
emailService.setRefreshToken = function (token) {
  this.refreshToken = token;
}; 