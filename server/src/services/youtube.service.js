const yts = require('yt-search');
const { YtDlp } = require('ytdlp-nodejs');
const config = require('../config');
const { ensureDirectoryExists } = require('../utils/file.utils');
const path = require('path');
const fs = require('fs');

class YouTubeService {
    constructor() {
        this.ytdlp = new YtDlp();
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Modern browser User-Agent strings (as recommended in FAQ)
        this.userAgents = {
            firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
            chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
        };
        
        // Cookie file path
        this.cookieFilePath = path.join(process.cwd(), 'cookies.txt');
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

    async checkCookieFile() {
        try {
            await fs.promises.access(this.cookieFilePath, fs.constants.F_OK);
            const stats = await fs.promises.stat(this.cookieFilePath);
            return stats.size > 0;
        } catch {
            return false;
        }
    }

    async downloadAudioWithStrategy(url, outputPath, strategy = 'default') {
        const hasCookieFile = await this.checkCookieFile();
        
        const strategies = {
            default: {
                format: {
                    filter: 'audioonly',
                    type: 'mp3',
                    quality: 'highest'
                },
                output: outputPath
            },
            cookieFile: {
                format: {
                    filter: 'audioonly',
                    type: 'mp3',
                    quality: 'highest'
                },
                output: outputPath,
                cookies: this.cookieFilePath,
                userAgent: this.userAgents.firefox
            },
            firefox: {
                format: {
                    filter: 'audioonly',
                    type: 'mp3',
                    quality: 'highest'
                },
                output: outputPath,
                cookiesFromBrowser: 'firefox',
                userAgent: this.userAgents.firefox
            },
            chrome: {
                format: {
                    filter: 'audioonly',
                    type: 'mp3',
                    quality: 'highest'
                },
                output: outputPath,
                cookiesFromBrowser: 'chrome',
                userAgent: this.userAgents.chrome
            },
            edge: {
                format: {
                    filter: 'audioonly',
                    type: 'mp3',
                    quality: 'highest'
                },
                output: outputPath,
                cookiesFromBrowser: 'edge',
                userAgent: this.userAgents.edge
            },
            minimal: {
                format: 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio',
                output: outputPath,
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: '192K',
                userAgent: this.userAgents.firefox
            },
            fallback: {
                format: 'worst[ext=mp4]/worst',
                output: outputPath,
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: '128K',
                userAgent: this.userAgents.chrome
            }
        };

        // If cookie file strategy is requested but no file exists, fall back to firefox
        if (strategy === 'cookieFile' && !hasCookieFile) {
            console.log('[DOWNLOAD] Cookie file not found, falling back to Firefox browser cookies');
            strategy = 'firefox';
        }

        const options = strategies[strategy] || strategies.default;
        
        console.log(`[DOWNLOAD] Trying strategy: ${strategy}`);
        if (options.cookies) {
            console.log(`[DOWNLOAD] Using cookie file: ${options.cookies}`);
        } else if (options.cookiesFromBrowser) {
            console.log(`[DOWNLOAD] Using cookies from: ${options.cookiesFromBrowser}`);
        }
        
        return await this.ytdlp.downloadAsync(url, {
            ...options,
            onProgress: (progress) => {
                if (progress.percent) {
                    console.log(`[DOWNLOAD] Progress: ${progress.percent}%`);
                }
            }
        });
    }

    async downloadAudio(url, trackName) {
        const sanitizedTrackName = this.sanitizeFilename(trackName);
        const outputPath = path.join(config.paths.downloads, `${sanitizedTrackName}.mp3`);

        await ensureDirectoryExists(config.paths.downloads);

        // Check if yt-dlp is installed
        const isInstalled = await this.ytdlp.checkInstallationAsync();
        if (!isInstalled) {
            throw new Error('yt-dlp is not installed. Please install it manually or restart the application.');
        }

        // Check for cookie file and prioritize it
        const hasCookieFile = await this.checkCookieFile();
        
        // Try different strategies in order, prioritizing manual cookie file if available
        let strategies;
        if (hasCookieFile) {
            strategies = ['cookieFile', 'firefox', 'chrome', 'edge', 'minimal', 'fallback'];
            console.log('[DOWNLOAD] Found cookies.txt file, prioritizing manual cookies');
        } else {
            strategies = ['default', 'firefox', 'chrome', 'edge', 'minimal', 'fallback'];
        }
        
        let lastError = null;

        for (const strategy of strategies) {
            try {
                console.log(`[DOWNLOAD] Attempting download with strategy: ${strategy}`);
                await this.downloadAudioWithStrategy(url, outputPath, strategy);
                console.log('[DOWNLOAD] yt-dlp download completed successfully');
                break; // Success, exit the loop
            } catch (error) {
                console.error(`[DOWNLOAD] Strategy ${strategy} failed:`, error.message);
                lastError = error;
                
                // If it's a bot detection error, continue to next strategy
                if (error.message.includes('Sign in to confirm') || 
                    error.message.includes('not a bot') ||
                    error.message.includes('HTTP Error 429') ||
                    error.message.includes('HTTP Error 403') ||
                    error.message.includes('Cloudflare')) {
                    console.log(`[DOWNLOAD] Anti-bot detection with ${strategy}, trying next strategy...`);
                    
                    // Add a small delay between attempts to avoid rapid-fire requests
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }
                
                // For other errors, break and throw
                break;
            }
        }

        // If all strategies failed, throw the last error with helpful message
        if (lastError && !await this.fileExists(outputPath)) {
            console.error('[DOWNLOAD] All download strategies failed');
            
            if (lastError.message.includes('Sign in to confirm') || 
                lastError.message.includes('not a bot') ||
                lastError.message.includes('HTTP Error 403') ||
                lastError.message.includes('Cloudflare')) {
                throw new Error('YouTube is blocking automated access. This may be due to your IP being flagged. Please try again later (wait 30+ minutes) or try a different track.');
            } else if (lastError.message.includes('Video unavailable')) {
                throw new Error('This video is unavailable, private, or has been removed from YouTube.');
            } else if (lastError.message.includes('HTTP Error 429')) {
                throw new Error('YouTube is rate limiting requests. Please wait a few minutes before trying again.');
            } else {
                throw new Error(`Download failed: ${lastError.message}. Please try again or try a different track.`);
            }
        }

        // Verify the file was created successfully
        const filename = path.basename(outputPath);
        
        // Add a small delay and verify file exists and is readable
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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

    async exportCookiesFromBrowser(browser = 'firefox') {
        try {
            console.log(`[COOKIES] Exporting cookies from ${browser} to cookies.txt...`);
            
            // Use yt-dlp to export cookies from browser
            await this.ytdlp.execAsync('--cookies-from-browser', {
                [`--cookies-from-browser`]: browser,
                '--cookies': this.cookieFilePath
            });
            
            console.log(`[COOKIES] Cookies exported to ${this.cookieFilePath}`);
            return true;
        } catch (error) {
            console.error('[COOKIES] Failed to export cookies:', error.message);
            return false;
        }
    }

    async fileExists(filePath) {
        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
            const stats = await fs.promises.stat(filePath);
            return stats.size > 0;
        } catch {
            return false;
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