# Mauli Placements Backend

This is the backend server for Mauli Placements, handling resume uploads and Google Drive integration.

## Setup Instructions

1. Clone this repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example` and fill in your Google OAuth credentials:
```bash
cp .env.example .env
```

4. Set up Google OAuth:
   - Go to Google Cloud Console
   - Create a new project or select existing one
   - Enable Google Drive API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
   - Copy Client ID and Client Secret to your `.env` file

5. First-time setup:
   - Start the server: `npm run dev`
   - Visit `http://localhost:3001/auth/google`
   - Follow the authorization flow
   - Copy the provided refresh token to your `.env` file

## Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/upload-resume` - Upload resume to Google Drive
- `POST /api/google-token` - Get Google Drive access token
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - OAuth callback handler

## Environment Variables

- `PORT` - Server port (default: 3001)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REFRESH_TOKEN` - Google OAuth refresh token
- `GOOGLE_DRIVE_FOLDER_ID` - (Optional) Specific folder ID for uploads
- `NODE_ENV` - Environment (development/production)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
