# 🚀 Demo Mode - Quick Start Without Firebase

Your AI Productivity Assistant is now running in **Demo Mode**! This allows you to test all features without setting up Firebase.

## ✅ What Works in Demo Mode

- **All UI Components**: Full interface with all features visible
- **API Configuration**: Set and save API keys (stored in localStorage)
- **LLM Communication Log**: Real-time AI interaction monitoring  
- **Prompt Editor**: Edit and save custom AI prompts
- **Email Triage**: With Gmail API token (when provided)
- **Monday.com Integration**: With Monday.com API token (when provided)
- **Local Storage**: All settings and data persisted locally

## 🔧 Quick Setup

1. **Your app is running at:** http://localhost:3001
2. **No Firebase setup needed** - demo mode is automatically active
3. **Add your API keys:**
   - Click "Refresh" for Gmail OAuth token
   - Add Gemini API key from [AI Studio](https://aistudio.google.com/app/apikey)
   - Add Monday.com API token from your account

## 📝 Demo Mode Indicators

Look for these console messages:
- `📝 Demo mode: Using demo configuration for now...`
- `📝 Demo mode: Triage logic saved to localStorage`
- `📝 Demo mode: Monday config saved to localStorage`

## 🆙 Upgrade to Full Firebase Later

When you're ready for full cloud persistence:

1. **Create Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project
   - Enable Firestore Database
   - Enable Authentication (Anonymous)

2. **Configure Firebase:**
   - Copy your Firebase config
   - Run the setup script from `setup_local.js` in browser console
   - Or create `.env` file with Firebase variables

3. **Restart App:**
   - Refresh the page
   - Firebase will automatically connect

## 🎯 Test the New Features

### LLM Communication Log
- Set up Gemini API key
- Triage an email or use Monday.com integration
- Expand "LLM Communication" to see real-time AI interactions

### Prompt Editor  
- Expand "Core Prompts" section
- Edit the Email Triage Logic or Monday.com Context
- Changes apply immediately to new AI requests

### Enhanced Token Management
- Click blue "Refresh" button next to Gmail token
- Automatically opens OAuth Playground
- Copy new token back to the field

## 💡 Benefits of Demo Mode

- **No Setup Required**: Start testing immediately
- **All Features Work**: Complete functionality demonstration
- **Local Storage**: Settings persist between sessions
- **Easy Migration**: Upgrade to Firebase when ready
- **Perfect for Development**: Test features without cloud dependencies

Enjoy exploring your AI Productivity Assistant! 🎉 