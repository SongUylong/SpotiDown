const express = require('express');
const router = express.Router();
const downloadManager = require('../services/download-manager.service');
const spotifyService = require('../services/spotify.service');
const config = require('../config');
const path = require('path');
const archiver = require('archiver');
const fs = require('fs');

// Get single track information from Spotify track URL
router.post('/track-info', async (req, res) => {
    try {
        const { trackUrl } = req.body;
        
        if (!trackUrl) {
            return res.status(400).json({ error: "Track URL is required" });
        }

        // Authenticate and get track info
        await spotifyService.authenticate();
        const trackId = spotifyService.extractTrackId(trackUrl);
        
        if (!trackId) {
            return res.status(400).json({ error: "Invalid track URL" });
        }

        const track = await spotifyService.getTrackInfo(trackId);
        
        // No longer check for downloaded status - always false initially
        const trackWithStatus = {
            ...track,
            songName: `${track.artist} - ${track.name}`,
            isDownloaded: false
        };

        res.json({
            track: trackWithStatus
        });
    } catch (err) {
        console.error('Track info error:', err);
        res.status(500).json({ 
            error: "Failed to fetch track information",
            details: err.message 
        });
    }
});

// Get playlist information
router.post('/playlist-info', async (req, res) => {
    try {
        const { playlistUrl } = req.body;
        
        if (!playlistUrl) {
            return res.status(400).json({ error: "Playlist URL is required" });
        }

        // Authenticate and get playlist info
        await spotifyService.authenticate();
        const playlistId = spotifyService.extractPlaylistId(playlistUrl);
        
        if (!playlistId) {
            return res.status(400).json({ error: "Invalid playlist URL" });
        }

        console.log(`📋 Getting playlist information for: ${playlistId}`);
        
        // Get basic playlist info first
        const playlistInfo = await spotifyService.getPlaylistInfo(playlistId);
        
        console.log(`📋 Playlist "${playlistInfo.name}" has ${playlistInfo.totalTracks} tracks`);
        
        // Get all tracks (this will handle pagination automatically)
        const tracks = await spotifyService.getPlaylistTracks(playlistId);
        
        // No longer check for downloaded status - always false initially
        const tracksWithStatus = tracks.map(track => {
            const songName = `${track.artist} - ${track.name}`;
            return {
                ...track,
                songName,
                isDownloaded: false
            };
        });

        console.log(`✅ Successfully processed ${tracksWithStatus.length} tracks from playlist`);

        res.json({
            playlistInfo: {
                name: playlistInfo.name,
                description: playlistInfo.description,
                owner: playlistInfo.owner,
                totalTracks: playlistInfo.totalTracks,
                isPublic: playlistInfo.isPublic,
                followers: playlistInfo.followers
            },
            tracks: tracksWithStatus,
            totalTracks: tracksWithStatus.length,
            fetchedTracks: tracksWithStatus.length
        });
    } catch (err) {
        console.error('Playlist info error:', err);
        res.status(500).json({ 
            error: "Failed to fetch playlist information",
            details: err.message 
        });
    }
});

// Download single song
router.post('/song', async (req, res) => {
    try {
        const { track } = req.body;
        
        if (!track || !track.name || !track.artist) {
            return res.status(400).json({ error: "Track information is required" });
        }

        const result = await downloadManager.downloadSingleTrack(track);

        // Always return JSON response, let the client handle the file download
        if (result.status === 'DOWNLOADED') {
            res.status(200).json(result);
        } else if (result.status === 'skipped') {
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }

    } catch (err) {
        console.error('Song download error:', err);
        res.status(500).json({ 
            error: "Failed to download song",
            details: err.message 
        });
    }
});

// Download multiple songs
router.post('/songs', async (req, res) => {
    try {
        const { tracks } = req.body;
        
        if (!Array.isArray(tracks) || tracks.length === 0) {
            return res.status(400).json({ error: "Track list is required" });
        }

        const results = await downloadManager.downloadMultipleTracks(tracks);
        
        // No immediate cleanup - files are scheduled for cleanup individually
        console.log('[BATCH DOWNLOAD] Batch download completed. Files will be cleaned up individually after 10 minutes.');
        
        res.json(results);
    } catch (err) {
        console.error('Multiple songs download error:', err);
        res.status(500).json({ 
            error: "Failed to download songs",
            details: err.message 
        });
    }
});

// Manual cleanup route (optional - for admin purposes)
router.post('/cleanup', async (req, res) => {
    try {
        await downloadManager.cleanupOldDownloads();
        res.json({ 
            message: "Old download files cleaned up successfully"
        });
    } catch (err) {
        console.error('Cleanup error:', err);
        res.status(500).json({ 
            error: "Failed to cleanup downloads",
            details: err.message 
        });
    }
});

// Get list of downloaded files
router.get('/files', (req, res) => {
    try {
        if (!fs.existsSync(config.paths.downloads)) {
            return res.status(404).json({ error: "No downloaded files found." });
        }

        const files = fs.readdirSync(config.paths.downloads)
            .filter(file => file.endsWith('.mp3'))
            .map(file => ({
                name: file,
                size: fs.statSync(path.join(config.paths.downloads, file)).size
            }));

        res.json({ files });
    } catch (err) {
        res.status(500).json({ error: "Failed to list files" });
    }
});

// Explicit OPTIONS handler for the files route (MUST come before GET handler)
router.options('/files/:filename', (req, res) => {
    console.log(`[CORS] OPTIONS /files/${req.params.filename} from origin: ${req.headers.origin}`);
    res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
});

// Download specific file
router.get('/files/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(config.paths.downloads, filename);

        console.log(`[FILE DOWNLOAD] Request for: ${filename} from origin: ${req.headers.origin || 'none'}`);
        console.log(`[FILE DOWNLOAD] Full file path: ${filePath}`);

        // Set CORS headers explicitly for this endpoint
        if (req.headers.origin) {
            res.header('Access-Control-Allow-Origin', req.headers.origin);
            res.header('Access-Control-Allow-Credentials', 'true');
        } else {
            res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
        }

        // Set headers to prevent connection issues and handle large files
        res.header('Connection', 'keep-alive');
        res.header('Keep-Alive', 'timeout=300');
        res.header('Cache-Control', 'no-cache');

        if (!fs.existsSync(filePath)) {
            console.log(`[FILE DOWNLOAD] File not found: ${filePath}`);
            return res.status(404).json({ error: "File not found." });
        }

        // Get file stats for debugging
        const stats = fs.statSync(filePath);
        console.log(`[FILE DOWNLOAD] File size: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        console.log(`[FILE DOWNLOAD] File accessible: ${fs.constants.R_OK & stats.mode ? 'Yes' : 'No'}`);

        // Set specific timeout for this request - disable timeouts to prevent ECONNRESET
        req.setTimeout(0); // Disable request timeout
        res.setTimeout(0); // Disable response timeout

        // Handle client disconnect
        req.on('close', () => {
            console.log(`[FILE DOWNLOAD] Client disconnected during download of ${filename}`);
        });

        req.on('aborted', () => {
            console.log(`[FILE DOWNLOAD] Request aborted for ${filename}`);
        });

        // Add error event handler for the response
        res.on('error', (err) => {
            console.error(`[FILE DOWNLOAD] Response error for ${filename}:`, err.message);
        });

        console.log(`[FILE DOWNLOAD] Starting download of ${filename}...`);

        // Use res.download with proper error handling - this is more reliable than streaming
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error(`[FILE DOWNLOAD] Error while sending file ${filename}:`, err.message, err.code);
                // Only send error response if headers haven't been sent yet
                if (!res.headersSent) {
                    res.status(500).json({ error: "Could not download the file." });
                }
            } else {
                console.log(`[FILE DOWNLOAD] Successfully sent file: ${filename}`);
            }
        });

    } catch (err) {
        console.error(`[FILE DOWNLOAD] Unexpected error:`, err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Failed to download file" });
        }
    }
});

// Download selected songs as zip
router.post('/download-selected', async (req, res) => {
    try {
        const { filenames } = req.body;
        
        console.log('=== DEBUG: Download Selected Request ===');
        console.log('Requested filenames:', filenames);
        
        if (!Array.isArray(filenames) || filenames.length === 0) {
            return res.status(400).json({ error: "No files selected for download" });
        }

        // List all actual files in downloads directory for debugging
        const actualFiles = fs.readdirSync(config.paths.downloads)
            .filter(file => file.endsWith('.mp3'));
        console.log('Actual files in downloads folder:', actualFiles);

        // Create a zip file
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        // Set the appropriate headers
        res.attachment('playlist_songs.zip');

        // Handle archive warnings
        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Archive warning:', err);
            } else {
                throw err;
            }
        });

        // Handle archive errors
        archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: "Failed to create zip file",
                    details: err.message 
                });
            }
        });

        // Set up the finish handler BEFORE finalizing
        archive.on('finish', () => {
            console.log('Archive has been finalized and sent to client');
        });

        // Handle client disconnect
        req.on('close', () => {
            console.log('Client disconnected during download');
        });

        // Keep track of missing files for logging
        const missingFiles = [];
        const addedFiles = [];

        // Add each file to the archive
        for (const filename of filenames) {
            const filePath = path.join(config.paths.downloads, filename);
            console.log(`Checking file: ${filename}`);
            console.log(`Full path: ${filePath}`);
            console.log(`File exists: ${fs.existsSync(filePath)}`);
            
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: filename });
                addedFiles.push(filename);
                console.log(`✓ Added to archive: ${filename}`);
            } else {
                missingFiles.push(filename);
                console.warn(`✗ File not found: ${filename}`);
            }
        }

        if (addedFiles.length === 0) {
            console.log('No files found to download!');
            return res.status(404).json({ error: "No files found to download" });
        }

        if (missingFiles.length > 0) {
            console.warn(`Missing files: ${missingFiles.join(', ')}`);
        }

        // Pipe archive data to the response
        archive.pipe(res);

        // Finalize the archive - this MUST be called to complete the zip
        archive.finalize();

        console.log(`🚀 Streaming zip file with ${addedFiles.length} files to client`);

    } catch (err) {
        console.error('Error creating zip file:', err);
        // Only send error if headers haven't been sent
        if (!res.headersSent) {
            res.status(500).json({ 
                error: "Failed to create zip file",
                details: err.message 
            });
        }
    }
});

module.exports = router; 