const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { Readable } = require('stream');

router.post('/upload-resume', async (req, res) => {
  try {
    console.log('Uploading resume to Google Drive...');

    const oauth2Client = global.oauth2Client;
    if (!oauth2Client || !process.env.GOOGLE_REFRESH_TOKEN) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please visit /auth/google to authorize the application'
      });
    }

    try {
      await oauth2Client.refreshAccessToken();
    } catch (authError) {
      console.error('OAuth refresh error:', authError);
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Failed to refresh Google OAuth token'
      });
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const { fileName, fileData, applicantName } = req.body;

    if (!fileName || !fileData || !applicantName) {
      return res.status(400).json({
        error: 'Missing required fields: fileName, fileData, applicantName'
      });
    }

    const fileBuffer = Buffer.from(fileData.split(',')[1], 'base64');
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);

    const fileMetadata = {
      name: `Resume_${applicantName}_${new Date().getTime()}.${fileName.split('.').pop()}`,
      parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined
    };

    const getMediaType = (filename) => {
      const ext = filename.toLowerCase().split('.').pop();
      switch (ext) {
        case 'pdf': return 'application/pdf';
        case 'doc': return 'application/msword';
        case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        default: return 'application/octet-stream';
      }
    };

    const media = {
      mimeType: getMediaType(fileName),
      body: readableStream
    };

    const fileResponse = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    });

    const fileId = fileResponse.data.id;
    console.log(`File uploaded successfully with ID: ${fileId}`);

    await drive.permissions.create({
      fileId: fileId,
      resource: {
        role: 'reader',
        type: 'anyone'
      }
    });

    console.log('File permissions set to public');

    const shareableLink = `https://drive.google.com/file/d/${fileId}/view`;

    res.json({
      success: true,
      fileId: fileId,
      shareableLink: shareableLink,
      downloadLink: `https://drive.google.com/uc?export=download&id=${fileId}`
    });

  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    res.status(500).json({
      error: 'Failed to upload file to Google Drive',
      details: error.message
    });
  }
});

module.exports = router;
