require('./setup_local'); // Load environment variables
const emailService = require('./src/services/emailService');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function runOAuthProcess() {
  console.log('--- Gmail OAuth Refresh Token Generator ---');

  try {
    const clientId = process.env.REACT_APP_GMAIL_CLIENT_ID;
    const clientSecret = process.env.REACT_APP_GMAIL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('REACT_APP_GMAIL_CLIENT_ID and REACT_APP_GMAIL_CLIENT_SECRET must be set in your .env file.');
    }

    emailService.setOAuthConfig(clientId, clientSecret);
    
    // DEBUG: Print the exact redirect URI being used.
    console.log(`\n[DEBUG] Using redirect URI: "${emailService.oauthConfig.redirectUri}"\n`);
    
    const authUrl = emailService.generateAuthURL();
    
    console.log('\n✅ Step 1: Authorize the application');
    console.log('Please open the following URL in your browser:\n');
    console.log(authUrl);
    console.log('\nAfter authorizing, you will be redirected to a blank page.');
    console.log('Copy the full URL from that page\'s address bar.');

    rl.question('\n✅ Step 2: Paste the full redirect URL here: ', async (url) => {
      try {
        const code = emailService.getCodeFromUrl(url);
        console.log('\nFetching tokens...');
        
        const tokens = await emailService.getTokens(code);

        if (tokens.refresh_token) {
          console.log('\n✅ --- SUCCESS! --- ✅');
          console.log('Your new Refresh Token is:\n');
          console.log(tokens.refresh_token);
          console.log('\nCopy this token and add it to your .env file as REACT_APP_GMAIL_REFRESH_TOKEN');
        } else {
          console.error('❌ Failed to retrieve refresh token. The response did not include one.');
          console.error('This can happen if you have already authorized this app before.');
          console.error('Please go to your Google Account settings -> Security -> Third-party apps with account access, remove this app, and try again.');
        }

        if (tokens.access_token) {
          console.log('\nYour new Access Token is:\n');
          console.log(tokens.access_token);
        }
        
      } catch (error) {
        console.error('\n❌ An error occurred:', error.message);
      } finally {
        rl.close();
      }
    });

  } catch (error) {
    console.error('❌ Failed to start OAuth process:', error.message);
    rl.close();
  }
}

runOAuthProcess(); 