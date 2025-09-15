const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const oauth2Client = global.oauth2Client;

const TOKEN_PATH = path.join(__dirname, '..', 'config', 'token.json');
const TOKEN_DIR = path.dirname(TOKEN_PATH);

if (!fs.existsSync(TOKEN_DIR)) {
  fs.mkdirSync(TOKEN_DIR, { recursive: true });
}

const saveTokens = (tokens) => {
  if (process.env.NODE_ENV === 'production') {
    process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
  } else {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  }
};

const loadTokens = () => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return { refresh_token: process.env.GOOGLE_REFRESH_TOKEN };
    } else if (fs.existsSync(TOKEN_PATH)) {
      return JSON.parse(fs.readFileSync(TOKEN_PATH));
    }
  } catch (error) {
    console.error('Error loading tokens:', error);
  }
  return null;
};

router.get('/google-token', async (req, res) => {
  try {
    console.log('Requesting Google Drive access token...');

    const savedTokens = loadTokens();
    if (!savedTokens?.refresh_token && !process.env.GOOGLE_REFRESH_TOKEN) {
      return res.status(400).json({
        error: 'Google OAuth not configured',
        message: 'Please visit /api/auth/google to authorize the application',
        authUrl: '/api/auth/google'
      });
    }

    oauth2Client.setCredentials({
      refresh_token: savedTokens?.refresh_token || process.env.GOOGLE_REFRESH_TOKEN
    });

    try {
      const response = await oauth2Client.refreshAccessToken();
      const credentials = response.credentials;

      saveTokens({
        ...savedTokens,
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date
      });

      console.log('Google Drive token refreshed successfully');

      res.json({
        access_token: credentials.access_token,
        expires_in: Math.floor((credentials.expiry_date - Date.now()) / 1000),
        token_type: 'Bearer'
      });
    } catch (refreshError) {
      console.error('Failed to refresh token:', refreshError);
      res.status(401).json({
        error: 'Token refresh failed',
        message: 'Please reauthorize the application',
        authUrl: '/api/auth/google'
      });
    }
  } catch (error) {
    console.error('Error getting Google token:', error);
    res.status(500).json({
      error: 'Failed to get Google Drive access token',
      details: error.message
    });
  }
});

router.get('/auth/google', (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_REFRESH_TOKEN) {
    return res.status(400).json({
      error: 'Authorization already completed',
      message: 'The application is already authorized in production'
    });
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent'
  });

  console.log('🔗 Visit this URL to authorize the application:');
  console.log(authUrl);

  res.redirect(authUrl);
});

router.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    saveTokens(tokens);

    console.log('✅ Google OAuth successful!');

    const instructionsHtml = process.env.NODE_ENV === 'production'
      ? `
        <h2>✅ Authorization Successful!</h2>
        <p>The application has been authorized with Google Drive.</p>
        <p>Refresh token has been saved securely.</p>
      `
      : `
        <h2>✅ Authorization Successful!</h2>
        <p>Copy this refresh token to your <code>.env</code> file:</p>
        <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-wrap: break-word;">GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</pre>
        <p>Then restart your server.</p>
      `;

    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          ${instructionsHtml}
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error during OAuth callback:', error);
    res.status(500).send('Authorization failed');
  }
});

module.exports = router;
