const dotenv = require('dotenv');
dotenv.config();

const supabaseService = require('./src/services/supabaseService.js');
const geminiService = require('./src/services/geminiService.js');
const emailService = require('./src/services/emailService.js');

async function testSupabaseConnection() {
  console.log('\n--- Testing Supabase Connection ---');
  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or Key not found in .env');
    }
    supabaseService.initialize(supabaseUrl, supabaseKey);
    console.log('Supabase service initialized.');

    const prompts = await supabaseService.getAll('prompts');
    console.log(`✅ Successfully fetched ${prompts.length} prompts.`);
    if (prompts.length > 0) {
      console.log('Sample prompt:', prompts[0]);
    }
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error.message);
  }
}

async function testGeminiConnection() {
  console.log('\n--- Testing Gemini Connection ---');
  try {
    const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('Gemini API Key not found in .env');
    }
    geminiService.setApiKey(geminiApiKey);
    console.log('Gemini service initialized.');

    const response = await geminiService.generateText('Hello, this is a test.');
    if (response && response.length > 0) {
      console.log('✅ Gemini API responded successfully.');
    } else {
      throw new Error('Gemini API response was empty.');
    }
  } catch (error) {
    console.error('❌ Gemini connection test failed:', error.message);
  }
}

async function testGmailConnection() {
  console.log('\n--- Testing Gmail Connection ---');
  try {
    const clientId = process.env.REACT_APP_GMAIL_CLIENT_ID;
    const clientSecret = process.env.REACT_APP_GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.REACT_APP_GMAIL_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Gmail credentials not found in .env');
    }

    emailService.setOAuthConfig(clientId, clientSecret);
    emailService.setRefreshToken(refreshToken);
    console.log('Gmail service initialized.');

    await emailService.refreshAccessToken();
    const profile = await emailService.getProfile();

    if (profile && profile.emailAddress) {
      console.log(`✅ Successfully fetched Gmail profile for: ${profile.emailAddress}`);
    } else {
      throw new Error('Could not fetch Gmail profile.');
    }
  } catch (error) {
    console.error('❌ Gmail connection test failed:', error.message);
  }
}

async function runAllTests() {
  await testSupabaseConnection();
  await testGeminiConnection();
  await testGmailConnection();
  console.log('\n✅ All backend tests completed.');
}

runAllTests(); 