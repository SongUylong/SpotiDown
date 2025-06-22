const config = require('../config');
const spotifyService = require('./spotify.service');
const youtubeService = require('./youtube.service');
const { loadJsonFile, saveJsonFile } = require('../utils/file.utils');
const fs = require('fs');
const path = require('path');

class DownloadManagerService {
    constructor() {
        this.pendingCleanups = new Map(); // Track files scheduled for cleanup
    }

    async downloadSingleTrack(track, isBatchDownload = false) {
        try {
            const songName = `${track.artist} - ${track.name}`;
            // Use just the song name for the filename to keep it simple
            const simpleFileName = track.name;

            // Search on YouTube
            const query = `${track.name} ${track.artist}`;
            const youtubeUrl = await youtubeService.searchVideo(query);

            if (!youtubeUrl) {
                return {
                    status: 'failed',
                    track: songName,
                    error: 'No YouTube results found'
                };
            }

            // Download and convert using simple filename
            const filename = await youtubeService.downloadAudio(youtubeUrl, simpleFileName);

            // Different cleanup times for single vs batch downloads
            if (isBatchDownload) {
                // Batch downloads: 10 minutes (users might download multiple files)
                this.scheduleFileCleanup(filename, 10 * 60 * 1000);
                var messageText = 'Download completed - file will be available for 10 minutes';
            } else {
                // Single downloads: 2 minutes (faster cleanup for individual tracks)
                this.scheduleFileCleanup(filename, 2 * 60 * 1000);
                var messageText = 'Download completed - file will be available for 2 minutes';
            }

            return {
                status: 'DOWNLOADED',
                track: songName,
                filename: filename,
                message: messageText
            };

        } catch (err) {
            return {
                status: 'failed',
                track: `${track.artist} - ${track.name}`,
                error: err.message
            };
        }
    }

    async downloadMultipleTracks(tracks) {
        const results = {
            success: [],
            failed: [],
            skipped: []
        };

        for (let i = 0; i < tracks.length; i++) {
            // Pass true to indicate this is part of a batch download
            const result = await this.downloadSingleTrack(tracks[i], true);
            
            switch (result.status) {
                case 'DOWNLOADED':
                case 'success':
                    results.success.push(result.track);
                    break;
                case 'failed':
                    results.failed.push({
                        track: result.track,
                        error: result.error
                    });
                    break;
                case 'skipped':
                    results.skipped.push(result.track);
                    break;
            }

            // Delay between tracks if not the last one
            if (i < tracks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, config.download.delayBetweenTracks));
            }
        }

        return results;
    }

    scheduleFileCleanup(filename, delayMs) {
        // Cancel any existing cleanup for this file
        if (this.pendingCleanups.has(filename)) {
            clearTimeout(this.pendingCleanups.get(filename));
        }

        // Schedule new cleanup
        const timeoutId = setTimeout(async () => {
            await this.cleanupDownloadedFile(filename);
            this.pendingCleanups.delete(filename);
        }, delayMs);

        this.pendingCleanups.set(filename, timeoutId);
        console.log(`[CLEANUP SCHEDULED] File ${filename} will be deleted in ${delayMs / 1000} seconds`);
    }

    async cleanupDownloadedFile(filename) {
        try {
            const filePath = path.join(config.paths.downloads, filename);
            
            // Check if file exists before attempting to delete
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
                console.log(`[CLEANUP] Deleted downloaded file: ${filename}`);
            }
        } catch (err) {
            console.error(`[CLEANUP] Failed to delete file ${filename}:`, err.message);
            // Don't throw error - cleanup failure shouldn't affect the download success
        }
    }

    // Clean up old files (files older than 15 minutes)
    async cleanupOldDownloads() {
        try {
            const downloadDir = config.paths.downloads;
            
            if (!fs.existsSync(downloadDir)) {
                return;
            }

            const files = await fs.promises.readdir(downloadDir);
            const mp3Files = files.filter(file => file.endsWith('.mp3'));
            
            const now = Date.now();
            const maxAge = 15 * 60 * 1000; // 15 minutes in milliseconds
            let cleanedCount = 0;

            for (const file of mp3Files) {
                const filePath = path.join(downloadDir, file);
                try {
                    const stats = await fs.promises.stat(filePath);
                    const fileAge = now - stats.mtime.getTime();
                    
                    // Only delete files older than 15 minutes
                    if (fileAge > maxAge) {
                        await fs.promises.unlink(filePath);
                        console.log(`[CLEANUP] Deleted old file: ${file} (age: ${Math.floor(fileAge / 1000 / 60)} minutes)`);
                        cleanedCount++;
                    }
                } catch (err) {
                    console.error(`[CLEANUP] Error processing file ${file}:`, err.message);
                }
            }

            if (cleanedCount > 0) {
                console.log(`[CLEANUP] Cleaned up ${cleanedCount} old files from downloads folder`);
            }
        } catch (err) {
            console.error('[CLEANUP] Failed to cleanup downloads folder:', err.message);
        }
    }

    // Cancel cleanup for a specific file (useful if user downloads it)
    cancelFileCleanup(filename) {
        if (this.pendingCleanups.has(filename)) {
            clearTimeout(this.pendingCleanups.get(filename));
            this.pendingCleanups.delete(filename);
            console.log(`[CLEANUP] Cancelled scheduled cleanup for: ${filename}`);
        }
    }

    // Remove these methods as we're no longer tracking downloads
    // async saveProgress() { ... }
    // getDownloadedSongs() { ... }
}

module.exports = new DownloadManagerService(); 