const yts = require('yt-search');
const { YtDlp } = require('ytdlp-nodejs');
const config = require('../config');
const { ensureDirectoryExists } = require('../utils/file.utils');
const path = require('path');
const fs = require('fs');

class YouTubeService {
    constructor() {
        this.ytdlp = new YtDlp();
    }

    async searchVideo(query) {
        try {
            const { videos } = await yts(query);
            return videos.length > 0 ? videos[0].url : null;
        } catch (err) {
            console.error('Failed to search YouTube:', err.message);
            return null;
        }
    }

    async downloadAudio(url, trackName) {
        const sanitizedTrackName = this.sanitizeFilename(trackName);
        const outputPath = path.join(config.paths.downloads, `${sanitizedTrackName}.mp3`);

        await ensureDirectoryExists(config.paths.downloads);

        try {
            console.log('[DOWNLOAD] Attempting download with yt-dlp...');
            
            // Check if yt-dlp is installed
            const isInstalled = await this.ytdlp.checkInstallationAsync();
            if (!isInstalled) {
                throw new Error('yt-dlp is not installed. Please install it manually or restart the application.');
            }

            // Download audio using yt-dlp with audio-only format
            await this.ytdlp.downloadAsync(url, {
                format: {
                    filter: 'audioonly',
                    type: 'mp3',
                    quality: 'highest'
                },
                output: outputPath,
                onProgress: (progress) => {
                    if (progress.percent) {
                        console.log(`[DOWNLOAD] Progress: ${progress.percent}%`);
                    }
                }
            });

            console.log('[DOWNLOAD] yt-dlp download completed');

        } catch (ytdlpError) {
            console.error('[DOWNLOAD] yt-dlp failed:', ytdlpError.message);
            
            // Provide helpful error messages for common issues
            if (ytdlpError.message.includes('Video unavailable')) {
                throw new Error('This video is unavailable, private, or has been removed from YouTube.');
            } else if (ytdlpError.message.includes('not installed')) {
                throw new Error('Download tool not available. Please try again later.');
            } else if (ytdlpError.message.includes('HTTP Error 429')) {
                throw new Error('YouTube is rate limiting requests. Please try again later.');
            } else if (ytdlpError.message.includes('Sign in to confirm')) {
                throw new Error('YouTube has detected automated access. Please try again later.');
            } else {
                throw new Error(`Download failed: ${ytdlpError.message}. Please try again or try a different track.`);
            }
        }

        // Verify the file was created successfully
        const filename = path.basename(outputPath);
        
        // Add a small delay and verify file exists and is readable
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1000ms delay
        
        try {
            await fs.promises.access(outputPath, fs.constants.F_OK | fs.constants.R_OK);
            const stats = await fs.promises.stat(outputPath);
            
            // Ensure file has some content (not empty)
            if (stats.size > 0) {
                console.log(`[DOWNLOAD] File ready: ${filename} (${stats.size} bytes)`);
                return filename;
            } else {
                throw new Error('Downloaded file is empty');
            }
        } catch (err) {
            throw new Error(`File not accessible after download: ${err.message}`);
        }
    }

    sanitizeFilename(name) {
        // Create a simple, URL-friendly filename
        return name
            .toLowerCase()                    // Convert to lowercase
            .replace(/[^a-z0-9\s-]/g, '')    // Remove all special characters except spaces and hyphens
            .replace(/\s+/g, '_')            // Replace spaces with underscores
            .replace(/-+/g, '_')             // Replace hyphens with underscores
            .replace(/_+/g, '_')             // Replace multiple underscores with single
            .replace(/^_|_$/g, '')           // Remove leading/trailing underscores
            .substring(0, 50);               // Limit length to 50 characters
    }
}

module.exports = new YouTubeService(); 