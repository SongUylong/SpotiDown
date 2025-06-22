const express = require('express');
const cors = require('cors');
const downloadRoutes = require('./routes/download.routes');
const config = require('./config');
const downloadManager = require('./services/download-manager.service');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/download', downloadRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Periodic cleanup - run every hour to clean up old files (15+ minutes old)
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

setInterval(async () => {
    console.log('[PERIODIC CLEANUP] Running scheduled cleanup for old files...');
    try {
        await downloadManager.cleanupOldDownloads();
    } catch (err) {
        console.error('[PERIODIC CLEANUP] Failed:', err.message);
    }
}, CLEANUP_INTERVAL);

// Initial cleanup on server start
(async () => {
    console.log('[STARTUP CLEANUP] Cleaning up old downloads on server start...');
    try {
        await downloadManager.cleanupOldDownloads();
    } catch (err) {
        console.error('[STARTUP CLEANUP] Failed:', err.message);
    }
})();

const PORT = config.server.port;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`[CLEANUP] Automatic cleanup enabled (every ${CLEANUP_INTERVAL / 1000 / 60} minutes)`);
});

module.exports = app; 