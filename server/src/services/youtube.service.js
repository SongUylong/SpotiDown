const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const youtubedl = require('youtube-dl-exec');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const config = require('../config');
const { ensureDirectoryExists } = require('../utils/file.utils');
const path = require('path');
const fs = require('fs');

class YouTubeService {
    constructor() {
        // Configure ytdl-core agent with better headers to avoid bot detection
        this.ytdlOptions = {
            filter: 'audioonly',
            quality: 'highestaudio',
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            }
        };
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

    async downloadAudioWithYtdl(url, outputPath) {
        return new Promise((resolve, reject) => {
            try {
                // First check if the video is available
                ytdl.getBasicInfo(url, this.ytdlOptions)
                    .then(() => {
                        const audioStream = ytdl(url, this.ytdlOptions);

                        // Add error handling for the stream
                        audioStream.on('error', (err) => {
                            console.error('YouTube stream error:', err.message);
                            if (err.message.includes('Sign in to confirm you\'re not a bot')) {
                                reject(new Error('YouTube bot detection triggered. Please try again later or use a different video.'));
                            } else {
                                reject(new Error(`YouTube download failed: ${err.message}`));
                            }
                        });

                        ffmpeg()
                            .setFfmpegPath(ffmpegStatic)
                            .input(audioStream)
                            .audioBitrate(config.download.audioBitrate)
                            .save(outputPath)
                            .on('end', async () => {
                                resolve();
                            })
                            .on('error', (err) => {
                                console.error('FFmpeg error:', err.message);
                                reject(new Error(`Audio conversion failed: ${err.message}`));
                            });
                    })
                    .catch((err) => {
                        console.error('YouTube video info error:', err.message);
                        if (err.message.includes('Sign in to confirm you\'re not a bot')) {
                            reject(new Error('YouTube bot detection triggered. Please try again later.'));
                        } else if (err.message.includes('Video unavailable')) {
                            reject(new Error('Video is unavailable or private.'));
                        } else {
                            reject(new Error(`Failed to access YouTube video: ${err.message}`));
                        }
                    });
            } catch (err) {
                reject(new Error(`Download setup failed: ${err.message}`));
            }
        });
    }

    async downloadAudioWithYoutubeDl(url, outputPath) {
        return new Promise((resolve, reject) => {
            try {
                console.log('[FALLBACK] Using youtube-dl-exec as fallback method');
                
                youtubedl(url, {
                    extractAudio: true,
                    audioFormat: 'mp3',
                    audioQuality: '320K',
                    output: outputPath.replace('.mp3', '.%(ext)s'),
                    noPlaylist: true,
                    preferFreeFormats: true,
                    addHeader: [
                        'referer:youtube.com',
                        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    ]
                })
                .then(() => {
                    console.log('[FALLBACK] youtube-dl-exec download completed');
                    resolve();
                })
                .catch((err) => {
                    console.error('[FALLBACK] youtube-dl-exec failed:', err.message);
                    reject(new Error(`Fallback download failed: ${err.message}`));
                });
            } catch (err) {
                reject(new Error(`Fallback setup failed: ${err.message}`));
            }
        });
    }

    async downloadAudio(url, trackName) {
        const sanitizedTrackName = this.sanitizeFilename(trackName);
        const outputPath = path.join(config.paths.downloads, `${sanitizedTrackName}.mp3`);

        await ensureDirectoryExists(config.paths.downloads);

        try {
            // Try ytdl-core first
            console.log('[DOWNLOAD] Attempting download with ytdl-core...');
            await this.downloadAudioWithYtdl(url, outputPath);
        } catch (ytdlError) {
            console.log('[DOWNLOAD] ytdl-core failed, trying youtube-dl-exec...');
            
            // If ytdl-core fails with bot detection, try youtube-dl-exec
            if (ytdlError.message.includes('bot detection') || 
                ytdlError.message.includes('Sign in to confirm')) {
                
                try {
                    await this.downloadAudioWithYoutubeDl(url, outputPath);
                } catch (fallbackError) {
                    throw new Error(`Both download methods failed. ytdl-core: ${ytdlError.message}, youtube-dl: ${fallbackError.message}`);
                }
            } else {
                throw ytdlError;
            }
        }

        // Verify the file was created successfully
        const filename = path.basename(outputPath);
        
        // Add a small delay and verify file exists and is readable
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        
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