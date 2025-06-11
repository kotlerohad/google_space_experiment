// Local Development Setup Script
// Run this in browser console to set up Firebase configuration

// Step 1: Set Firebase Configuration
window.__firebase_config = JSON.stringify({
  // Replace these with your actual Firebase project values
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
});

// Step 2: Set App ID
window.__app_id = "productivity-assistant-v1";

// Step 3: Optional - Set initial auth token (if you have one)
// window.__initial_auth_token = "your-custom-token-here";

console.log("✅ Firebase configuration set up for local development");
console.log("📝 Next steps:");
console.log("1. Configure your API keys in the UI");
console.log("2. Get Gmail OAuth token from https://developers.google.com/oauthplayground");
console.log("3. Get Gemini API key from https://aistudio.google.com/app/apikey");
console.log("4. Get Monday.com API token from your account settings");

// Test Firebase connection
if (typeof firebase !== 'undefined') {
  console.log("🔥 Firebase SDK detected - ready to connect");
} else {
  console.log("⚠️  Firebase SDK not detected - will use manual initialization");
} 