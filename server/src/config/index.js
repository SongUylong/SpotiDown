require('dotenv').config();
const path = require('path');

module.exports = {
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET
    },
    server: {
        port: process.env.PORT || 5000
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