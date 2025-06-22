const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const config = require('../config');
const { ensureDirectoryExists } = require('../utils/file.utils');
const path = require('path');
const fs = require('fs');

class YouTubeService {
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

        return new Promise((resolve, reject) => {
            const audioStream = ytdl(url, { 
                filter: 'audioonly', 
                quality: 'highestaudio' 
            });

            ffmpeg()
                .setFfmpegPath(ffmpegStatic)
                .input(audioStream)
                .audioBitrate(config.download.audioBitrate)
                .save(outputPath)
                .on('end', async () => {
                    // Ensure file is fully written and accessible before resolving
                    const filename = path.basename(outputPath);
                    
                    // Add a small delay and verify file exists and is readable
                    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
                    
                    // Verify file exists and is accessible
                    try {
                        await fs.promises.access(outputPath, fs.constants.F_OK | fs.constants.R_OK);
                        const stats = await fs.promises.stat(outputPath);
                        
                        // Ensure file has some content (not empty)
                        if (stats.size > 0) {
                            console.log(`[DOWNLOAD] File ready: ${filename} (${stats.size} bytes)`);
                            resolve(filename);
                        } else {
                            reject(new Error('Downloaded file is empty'));
                        }
                    } catch (err) {
                        reject(new Error(`File not accessible after download: ${err.message}`));
                    }
                })
                .on('error', (err) => reject(err));
        });
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