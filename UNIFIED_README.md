# AI Productivity Assistant

A unified React application that combines intelligent email triage with Monday.com integration, powered by Google's Gemini AI.

## Features

### 🧠 Intelligent Email Triage
- **Gmail Integration**: Fetch and analyze emails using Gmail API
- **AI-Powered Analysis**: Gemini AI categorizes emails and suggests actions
- **Structured Actions**: Organized suggestions for Gmail, Calendar, Monday.com, and Human tasks
- **Feedback Loop**: Learn from your corrections to improve AI performance
- **Decision Memory**: Track feedback history for future AI fine-tuning
- **🆕 Token Refresh**: Easy Gmail OAuth token refresh directly from the UI

### 🚀 Smart Monday.com Integration
- **Natural Language Processing**: Describe actions in plain English
- **Two-Stage AI Reasoning**: Intent recognition + dynamic item selection
- **Cross-Board Intelligence**: Find items across different boards automatically
- **Manual Controls**: Traditional board/item creation alongside AI features
- **Investigation Mode**: Preview AI actions before execution

### 🔧 Unified Architecture
- **Shared Configuration**: Centralized API key management
- **Real-time Activity Log**: Track all operations and AI decisions
- **Firebase Backend**: Secure data persistence and user authentication
- **Modern React UI**: Clean, responsive interface with Tailwind CSS

### 🆕 Developer & Debugging Features
- **LLM Communication Log**: Real-time view of all AI model interactions
  - See exact prompts sent to AI models
  - View structured responses and JSON schemas
  - Monitor errors and debugging information
  - Track token usage and performance
- **Prompt Editor**: Edit core AI prompts directly from the UI
  - Customize email triage logic prompts
  - Modify Monday.com context prompts
  - Reset to default configurations
  - See changes take effect immediately
- **Enhanced Token Management**: Better handling of expiring API tokens

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- Firebase project (for backend)
- Gmail API access token
- Gemini API key
- Monday.com API token

### Installation

1. **Clone and Install**
   ```bash
   git clone <your-repo>
   cd ai-productivity-assistant
   npm install
   ```

2. **Configure Firebase**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Firestore Database
   - Enable Authentication (Anonymous sign-in)
   - Copy your config and either:
     - Create `.env` file with Firebase config
     - Or set global variables `__firebase_config`, `__app_id`, etc.

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Configure APIs**
   - Open the app and expand "API Configuration"
   - Add your Gmail access token (from OAuth Playground)
   - Add your Gemini API key (from AI Studio)
   - Add your Monday.com API token
   - Save configuration

### Getting API Keys

#### Gmail Access Token
1. Go to [Google OAuth Playground](https://developers.google.com/oauthplayground)
2. Select Gmail API v1 → https://www.googleapis.com/auth/gmail.modify
3. Authorize and get access token
4. **Note**: This is temporary (~1 hour). For production, implement proper OAuth flow.

#### Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. **Important**: Use your personal key for structured JSON responses

#### Monday.com API Token
1. Go to your Monday.com account → Admin → API
2. Generate a new API token with appropriate permissions

## Usage Guide

### Email Triage Workflow
1. **Fetch Emails**: Click "Fetch Emails" to load from Gmail
2. **Triage Individual Emails**: Click "Triage" to analyze with AI
3. **Review Suggestions**: Check categorization and suggested actions
4. **Execute Actions**: Use quick action buttons or Monday.com integration
5. **Provide Feedback**: Mark as "Correct" or provide corrections
6. **Improve Logic**: Edit triage logic or let feedback train the AI

### Monday.com Integration
1. **Manual Actions**: Create items with specific board ID and name
2. **AI Actions**: Describe what you want in natural language
3. **Investigation**: Use "Investigate Only" to preview AI decisions
4. **Execution**: Use "Process & Execute" to perform actions

#### Example AI Prompts
```
Create a new task called 'Review Q3 Report' on board 'Project Management'

Change the status of 'Website Redesign' on 'Marketing Initiatives' to 'Done'

Update the 'Action' for 'George from Alphabak' working at 'Alphabak' on board 'Activities' to 'Intro email sent'
```

### Using New Developer Features

#### LLM Communication Log
1. **Expand the Log**: Click "Expand" on the "LLM Communication" panel
2. **Monitor AI Calls**: Watch real-time AI requests and responses
3. **Debug Issues**: See exactly what prompts are sent and responses received
4. **Clear History**: Use "Clear" to reset the log

#### Prompt Editor
1. **Expand Editor**: Click "Expand" on the "Core Prompts" panel
2. **Edit Prompts**: Click the edit icon next to any prompt
3. **Test Changes**: New prompts take effect immediately
4. **Reset Defaults**: Use the refresh icon to restore default prompts

#### Token Refresh
1. **Gmail Token**: Click "Refresh" next to Gmail token field
2. **Opens OAuth Playground**: Automatically opens Google's OAuth playground
3. **Get New Token**: Follow the standard OAuth flow
4. **Paste Back**: Copy the new token into the field

## Architecture Overview

```
src/
├── components/
│   ├── EmailTriage/
│   │   ├── EmailList.jsx          # Email fetching and display
│   │   └── TriageResult.jsx       # AI analysis results
│   ├── MondayIntegration/
│   │   └── MondayInterface.jsx    # AI-powered Monday.com actions
│   └── shared/
│       ├── ApiConfig.jsx          # Unified configuration
│       ├── MessageLog.jsx         # Activity logging
│       ├── DecisionMemory.jsx     # Feedback history
│       └── Icons.jsx              # Shared icon components
├── services/
│   ├── firebaseService.js         # Firebase operations
│   ├── geminiService.js           # AI/Gemini integration
│   ├── emailService.js            # Gmail API wrapper
│   └── mondayService.js           # Monday.com API wrapper
└── App.js                         # Main application
```

## Key Improvements Over Previous Versions

### Technical
- **Unified Codebase**: Single React app vs. separate HTML/React apps
- **Shared Services**: Reusable API service layer
- **Better State Management**: Centralized configuration and messaging
- **Real-time Updates**: Firebase subscriptions for live data

### User Experience
- **Tabbed Interface**: Easy switching between email and Monday.com features
- **Integrated Workflow**: Email actions can trigger Monday.com operations
- **Comprehensive Logging**: See exactly what the AI is doing
- **Persistent Config**: No need to re-enter API keys

### AI Intelligence
- **Enhanced Prompts**: Better context and structured responses
- **Cross-Platform Actions**: Email triage can suggest Monday.com actions
- **Improved Error Handling**: Graceful failures with helpful messages
- **Investigation Mode**: Understand AI decisions before committing

## Development Roadmap

### Phase 1: Current Features ✅
- Unified React application
- Email triage with AI feedback
- Monday.com integration with AI reasoning
- Firebase persistence

### Phase 2: Enhanced Integration
- Direct Monday.com actions from email triage
- Calendar integration
- Batch email processing
- Action scheduling

### Phase 3: Advanced AI
- Custom model fine-tuning from feedback data
- Automated workflows
- Predictive action suggestions
- Context-aware learning

### Phase 4: Production Ready
- Proper OAuth implementation
- Multi-user support
- Advanced security
- Performance optimization

## Troubleshooting

### Common Issues

**"Failed to initialize Firebase"**
- Check your Firebase configuration
- Ensure Firestore and Authentication are enabled
- Verify project permissions

**"Gmail API error"**
- Ensure your access token is valid (they expire!)
- Check that Gmail API is enabled in Google Cloud Console
- Verify the token has `gmail.modify` scope

**"Gemini API unauthorized"**
- Use your personal API key, not the Canvas environment key
- Verify the key is active at Google AI Studio
- Check for API quota limits

**"Monday.com API errors"**
- Verify your API token has the necessary permissions
- Check board IDs are correct (numeric)
- Ensure the workspace/board exists

### Getting Help
1. Check the Activity Log for detailed error messages
2. Use "Investigate Only" mode to debug AI reasoning
3. Test individual API connections using the configuration panel

## Contributing

This is a unified version of the previously separate Email Triage and Monday.com Integration applications. The architecture is designed for:
- Easy addition of new AI providers
- Simple integration of additional productivity tools
- Flexible UI customization
- Scalable backend operations

Feel free to extend the services, add new components, or enhance the AI capabilities! 