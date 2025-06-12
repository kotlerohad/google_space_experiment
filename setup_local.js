const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.warn(
      '⚠️  .env file not found. Falling back to environment variables.'
    );
    return;
  }

  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
  console.log('✅ .env file loaded successfully.');
}

// Automatically load env when this file is required
loadEnv();
