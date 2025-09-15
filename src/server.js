const express = require('express');
const { google } = require('googleapis');
const helmet = require('helmet');
const hpp = require('hpp');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const rateLimiter = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(hpp());
app.use(rateLimiter);

// CORS configuration
app.use((req, res, next) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
  const origin = req.headers.origin;

  if (process.env.NODE_ENV === 'production') {
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Body parser with request size limits
app.use(express.json({ limit: '10mb' }));  // Reduced from 50mb for security
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.OAUTH_REDIRECT_URL || 'http://localhost:3001/auth/google/callback'
);

global.oauth2Client = oauth2Client;

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ Missing Google OAuth credentials in .env file');
  console.error('Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set');
  process.exit(1);
}

if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  oauth2Client.refreshAccessToken((err, credentials) => {
    if (err) {
      console.error('❌ Failed to refresh access token:', err.message);
      console.error('Please ensure your GOOGLE_REFRESH_TOKEN is valid');
      return;
    }
    oauth2Client.setCredentials(credentials);
    console.log('✅ Google OAuth client configured and access token refreshed');
  });
} else {
  console.log('⚠️ No refresh token found. Visit /auth/google to authorize the application');
}

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const healthRoutes = require('./routes/health');

app.use('/api', authRoutes);
app.use('/auth', authRoutes);
app.use('/api', uploadRoutes);
app.use('/api', healthRoutes);

// Production error logging
const errorHandler = (err, req, res, next) => {
  console.error(new Date().toISOString(), 'ERROR:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🔒' : err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
};

// Error handling
app.use(errorHandler);

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Performing graceful shutdown...');
  server.close(() => {
    console.log('Server closed. Exiting process.');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Mauli Placements Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.log(`🔗 First-time setup: Visit http://localhost:${PORT}/auth/google to authorize`);
  }
});
