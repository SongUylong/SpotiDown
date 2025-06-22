require('dotenv').config();
const path = require('path');

// Validate required environment variables
const requiredEnvVars = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.warn(`[CONFIG WARNING] Missing environment variables: ${missingEnvVars.join(', ')}`);
    console.warn('[CONFIG WARNING] Some features may not work properly without these variables');
    // Don't crash the server, just warn
}

module.exports = {
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID || 'missing_client_id',
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || 'missing_client_secret'
    },
    server: {
        port: process.env.PORT || 5000,
        environment: process.env.NODE_ENV || 'development'
    },
    paths: {
        downloads: path.join(__dirname, '..', 'downloads'),
        downloadedSongsFile: path.join(__dirname, '..', 'data', 'downloaded_songs.json')
    },
    download: {
        delayBetweenTracks: parseInt(process.env.DELAY_BETWEEN_TRACKS) || 10000,
        audioBitrate: 320
    }
}; 