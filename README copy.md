# 🤖 AI Productivity Assistant

Email Triage & Monday.com Integration powered by Gemini AI

A modern React application that uses AI to automatically triage your Gmail emails and integrate with Monday.com for task management. Built with Gmail OAuth, Gemini AI, and real-time monitoring capabilities.

## ✨ Features

### 🔍 **Email Triage**
- **AI-Powered Analysis**: Gemini AI categorizes and summarizes emails automatically
- **Smart Actions**: Suggests appropriate actions (Archive, Reply, Create Task, etc.)
- **Batch Processing**: Process multiple emails with "Triage All" functionality
- **Table Interface**: Clean, responsive table layout for efficient email review
- **Feedback System**: Improve AI performance with user corrections

### 🔐 **Gmail Integration**
- **Full OAuth Flow**: Secure Gmail authentication with refresh token support
- **Real-time Access**: Automatic token refresh and persistent sessions
- **Email Actions**: Archive, mark as spam, mark important directly from the app
- **Read-only Access**: Safe, non-destructive email access

### 📋 **Monday.com Integration**
- **Task Creation**: Convert emails into Monday.com items automatically
- **Board Management**: Configure target boards and columns
- **Custom Fields**: Map email data to Monday.com fields

### 🔧 **Developer Features**
- **LLM Communication Log**: Real-time monitoring of AI interactions
- **Core Prompts Editor**: Edit AI prompts directly from the frontend
- **API Status Monitoring**: Visual dashboard for all service statuses
- **Environment Configuration**: Secure API key management

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ and npm
- **Google Cloud Account** (for Gmail API)
- **Gemini AI API Key** (from Google AI Studio)
- **Monday.com Account** (optional)

### 1. Clone & Install
```bash
git clone <repository-url>
cd ai-productivity-assistant
npm install
```

### 2. Environment Setup
Create a `.env` file in the project root:

```env
# =============================================================================
# GEMINI AI API CONFIGURATION
# =============================================================================
# Get your API key from: https://aistudio.google.com/app/apikey
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here

# =============================================================================
# GMAIL API CONFIGURATION (OAuth Method)
# =============================================================================
# Get OAuth credentials from: https://console.cloud.google.com/apis/credentials
# Create "OAuth 2.0 Client ID" for "Web application"

REACT_APP_GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
REACT_APP_GMAIL_CLIENT_SECRET=your_client_secret

# =============================================================================
# MONDAY.COM API CONFIGURATION (Optional)
# =============================================================================
# Get your API token from Monday.com account settings
REACT_APP_MONDAY_API_KEY=your_monday_api_token
REACT_APP_MONDAY_BOARD_ID=your_board_id

# =============================================================================
# FIREBASE CONFIGURATION (Optional - for data persistence)
# =============================================================================
# REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
# REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
# REACT_APP_FIREBASE_PROJECT_ID=your-project-id
```

### 3. Google Cloud Console Setup

#### Enable Gmail API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Gmail API**
4. Create **OAuth 2.0 Client ID** credentials

#### Configure OAuth
1. **Application Type**: Web application
2. **Authorized JavaScript Origins**: 
   - `http://localhost:3000`
3. **Authorized Redirect URIs**: 
   - `http://localhost:3000/oauth-callback.html`

### 4. Start Development Server
```bash
npm start
```

The app will be available at `http://localhost:3000`

## 📖 Usage Guide

### Initial Setup
1. **Start the app** and navigate to the **API Status & OAuth** section
2. **Click "Authorize"** next to Gmail API to start OAuth flow
3. **Grant permissions** in the popup window
4. **Verify green checkmarks** for all required services

### Email Triage Workflow
1. **Click "Fetch Emails"** to load recent messages
2. **Review AI suggestions** in the table format
3. **Use "Triage All"** for batch processing
4. **Provide feedback** to improve AI accuracy
5. **Execute actions** directly from the interface

### Monitoring & Configuration
- **LLM Communication**: Monitor AI requests/responses in real-time
- **Core Prompts**: Edit AI behavior prompts from the frontend
- **Activity Log**: Track system events and errors
- **Decision Memory**: View AI learning from user feedback

## 🏗️ Technical Architecture

### Frontend Stack
- **React 18** with functional components and hooks
- **Tailwind CSS** for styling and responsive design
- **Custom Components** for email triage, OAuth, and monitoring

### Backend Services
- **Gmail API** for email access and management
- **Gemini AI API** for intelligent email analysis
- **Monday.com API** for task management integration
- **Firebase** (optional) for data persistence

### Key Components
- **EmailService**: Gmail OAuth and API management
- **GeminiService**: AI request handling and response parsing
- **MondayService**: Monday.com integration and task creation
- **FirebaseService**: Optional data persistence with demo fallback

### Security Features
- **OAuth 2.0** with secure token storage
- **Environment Variables** for sensitive configuration
- **Read-only Gmail Access** for safety
- **Local Storage Encryption** for token persistence

## 🔧 Configuration

### API Keys Required
1. **Gemini AI**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Gmail OAuth**: Setup in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
3. **Monday.com**: Get from your Monday.com account settings

### Optional Integrations
- **Firebase**: For cloud data persistence instead of localStorage
- **Custom Prompts**: Modify AI behavior through the frontend editor
- **Additional APIs**: Extensible architecture for more integrations

## 🐛 Troubleshooting

### Common Issues

**Gmail OAuth Fails**
- Verify redirect URI in Google Cloud Console matches exactly
- Check that Gmail API is enabled
- Ensure authorized origins include your domain

**Gemini API Errors**
- Verify API key is correct and active
- Check API quotas and limits
- Review request formatting in LLM Communication Log

**Environment Variables Not Loading**
- Restart development server after .env changes
- Verify REACT_APP_ prefix for all frontend variables
- Check for syntax errors in .env file

**Token Expiry Issues**
- App automatically refreshes tokens when needed
- Use "Logout" and re-authorize if issues persist
- Check browser console for detailed error messages

### Debug Tools
- **LLM Communication Log**: Monitor AI API calls
- **Browser Console**: Check for JavaScript errors
- **Network Tab**: Inspect API requests and responses
- **Activity Log**: Track system events and user actions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for intelligent email analysis
- **Gmail API** for secure email access
- **Monday.com** for task management integration
- **React Team** for the excellent frontend framework

## 📞 Support

For support and questions:
- Check the troubleshooting section above
- Review browser console for error details
- Verify all environment variables are configured correctly
- Ensure all required APIs are enabled and properly configured

---

**Made with ❤️ for productive email management** 