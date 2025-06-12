# 🔧 OpenAI API Key Troubleshooting

This is the most common issue when setting up the OpenAI API. Here's how to fix it:

### 1. Verify Your API Key

- **Is it the right key?** Make sure you're using your secret key from the [OpenAI Platform](https://platform.openai.com/api-keys), which starts with `sk-...`.
- **Is it active?** Ensure the key is enabled in your OpenAI account.
- **Is it copied correctly?** Double-check for any extra spaces or missing characters.

### 2. Check Your Account Status

- **Billing Information**: OpenAI requires a valid payment method on file for API usage, even if you have free credits. Make sure your billing information is up to date.
- **Usage Limits**: Check if you have exceeded your usage limits for the month.

### 3. Test in the UI

1.  **Paste the key** in the OpenAI API Key field in the application's "Settings" modal.
2.  **Save the configuration**.
3.  **Look for success message**: The app will test the connection. Look for a "Connection successful" message or check the browser's developer console.

### 4. Direct API Test (Advanced)

If the UI test fails, you can test the key directly using a `curl` command in your terminal. This helps isolate the problem.

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Replace `YOUR_API_KEY` with your actual key. If it's working, you will see a JSON list of available models. If it fails, you'll get an error message from the API that can help you debug. 