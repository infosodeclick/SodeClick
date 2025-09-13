const express = require('express');
const router = express.Router();

// Google OAuth Configuration Check API
router.get('/google-config', (req, res) => {
  try {
    const backendUrl = process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' 
      ? 'https://sodeclick-backend-production.up.railway.app' 
      : 'http://localhost:5000');
    
    const config = {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      backendUrl: backendUrl,
      frontendUrl: process.env.FRONTEND_URL,
      environment: process.env.NODE_ENV,
      rawBackendUrl: process.env.BACKEND_URL
    };

    // Don't expose actual credentials in response
    const safeConfig = {
      ...config,
      clientIdPreview: config.hasClientId ? 
        `${process.env.GOOGLE_CLIENT_ID?.substring(0, 20)}...` : 
        'Not set',
      callbackUrl: `${config.backendUrl}/api/auth/google/callback`
    };

    res.json({
      success: true,
      message: 'Google OAuth configuration status',
      data: safeConfig
    });

  } catch (error) {
    console.error('OAuth config check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check OAuth configuration',
      error: error.message
    });
  }
});

// Set Google OAuth credentials (for development only)
router.post('/set-credentials', (req, res) => {
  try {
    const { clientId, clientSecret } = req.body;

    // Only allow in development environment
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only available in development environment'
      });
    }

    // Validate input
    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        message: 'Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required'
      });
    }

    // Set environment variables (only for current process)
    process.env.GOOGLE_CLIENT_ID = clientId;
    process.env.GOOGLE_CLIENT_SECRET = clientSecret;

    console.log('✅ Google OAuth credentials set via API');

    res.json({
      success: true,
      message: 'Google OAuth credentials set successfully',
      data: {
        clientIdPreview: `${clientId.substring(0, 20)}...`,
        environment: process.env.NODE_ENV
      }
    });

  } catch (error) {
    console.error('Set credentials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set OAuth credentials',
      error: error.message
    });
  }
});

module.exports = router;
