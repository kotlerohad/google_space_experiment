# 🔧 Gemini API Key Troubleshooting

## ❌ Error: "API key not valid. Please pass a valid API key."

This is the most common issue when setting up the Gemini API. Here's how to fix it:

## ✅ Step-by-Step Solution

### 1. Get a NEW Personal API Key

🚨 **Important**: You MUST use your personal Google AI Studio key, not any environment/Canvas key.

1. **Go to Google AI Studio**: https://aistudio.google.com/app/apikey
2. **Sign in** with YOUR personal Google account (not work/school account)
3. **Click "Create API Key"**
4. **Copy the key** (starts with `AIza...`)

### 2. Common Mistakes to Avoid

❌ **Don't use**:
- Canvas/Cursor environment API keys
- Keys from Google Cloud Console (different service)
- Expired or revoked keys
- Keys from shared/work accounts

✅ **Do use**:
- Fresh key from Google AI Studio
- Your personal Google account
- The full key string (usually ~39 characters)

### 3. Verify Your Setup

1. **Paste the key** in the Gemini API Key field
2. **Click the "Test" button** next to the field
3. **Look for success message**: "Gemini API test successful!"

### 4. If Still Not Working

#### Check Account Status
- **Billing**: Ensure your Google account has billing enabled
- **Quotas**: Check you haven't exceeded free tier limits
- **Region**: Some regions have restrictions

#### Common Solutions
1. **Create a new key**: Delete old key, create fresh one
2. **Wait 5 minutes**: New keys sometimes take time to propagate
3. **Try different browser**: Clear cache/cookies
4. **Check network**: Ensure no firewall/proxy blocking API calls

## 🔍 Testing Your Key

### Manual Test (in browser console):
```javascript
// Test your key manually
fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_KEY_HERE', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: "Say hello" }] }]
  })
})
.then(r => r.json())
.then(d => console.log('✅ Success:', d))
.catch(e => console.log('❌ Error:', e));
```

Replace `YOUR_KEY_HERE` with your actual key.

### Expected Success Response:
```json
{
  "candidates": [
    {
      "content": {
        "parts": [{ "text": "Hello! How can I help you today?" }]
      }
    }
  ]
}
```

## 🆘 Still Having Issues?

### Quick Checklist:
- [ ] Using personal Google account (not work/school)
- [ ] Key from https://aistudio.google.com/app/apikey
- [ ] Key starts with `AIza`
- [ ] Billing enabled on Google account
- [ ] No firewall blocking googleapis.com
- [ ] Tried creating a new key

### Alternative Solutions:
1. **Try different Google account**: Personal vs work accounts have different access
2. **Use VPN**: Some regions have API restrictions
3. **Contact Google Support**: For persistent billing/access issues

## 💡 Pro Tips:

- **Keep key secure**: Don't commit to Git or share publicly
- **Rotate regularly**: Create new keys periodically for security
- **Monitor usage**: Check quotas in Google AI Studio
- **Test immediately**: Verify key works right after creation

Once you have a working key, all AI features in the app will work perfectly! 🎉 