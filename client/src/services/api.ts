import type { Track, PlaylistInfo, DownloadResult, DownloadProgress } from '../types/spotify';
import { CONFIG } from '../constants/config';

class SpotifyAPI {
    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `API request failed: ${endpoint}`);
        }

        return response.json();
    }

    async getPlaylistInfo(playlistUrl: string): Promise<PlaylistInfo> {
        return this.request<PlaylistInfo>(CONFIG.API.ENDPOINTS.PLAYLIST_INFO, {
            method: 'POST',
            body: JSON.stringify({ playlistUrl }),
        });
    }

    async getTrackInfo(trackUrl: string): Promise<{ track: Track }> {
        return this.request<{ track: Track }>('/download/track-info', {
            method: 'POST',
            body: JSON.stringify({ trackUrl }),
        });
    }

    async downloadSong(track: Track): Promise<DownloadResult> {
        try {
            // First, make a request to download the song and wait for completion
            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DOWNLOAD_SONG}`, {
                method: 'POST',
                body: JSON.stringify({ track }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorResult = await response.json();
                return {
                    status: 'failed',
                    track: track.songName,
                    message: errorResult.message || 'Download failed.'
                };
            }

            const result = await response.json();
            
            // If the download was successful and we have a filename, trigger the download
            if (result.status === 'DOWNLOADED' && result.filename) {
                // Add a small delay to ensure the file is ready on the server
                await new Promise(resolve => setTimeout(resolve, 750)); // 750ms delay
                
                // Use the Vite proxy instead of direct server connection for better reliability
                const downloadUrl = `${CONFIG.API.BASE_URL}/download/files/${encodeURIComponent(result.filename)}`;
                
                // Create a temporary link to trigger the download
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = result.filename;
                link.style.display = 'none';
                // Remove target="_blank" to prevent opening new tab and potential CORS issues
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                return {
                    status: 'DOWNLOADED',
                    track: track.songName,
                    message: 'Download completed and file downloaded.'
                };
            }
            
            // Return the result from the server (could be skipped, failed, etc.)
            return {
                status: result.status === 'skipped' ? 'skipped' : result.status === 'DOWNLOADED' ? 'DOWNLOADED' : 'failed',
                track: track.songName,
                message: result.message || result.error || 'Download completed.'
            };
            
        } catch (error) {
            return {
                status: 'failed',
                track: track.songName,
                message: error instanceof Error ? error.message : 'Download failed.'
            };
        }
    }

    async downloadSelectedSongs(
        tracks: Track[],
        onProgress?: (progress: DownloadProgress) => void
    ): Promise<void> {
        // First, download each song to the server and wait for completion
        const completedTracks: Track[] = [];
        
        for (const track of tracks) {
            try {
                onProgress?.({
                    track: track.songName,
                    progress: 0,
                    status: 'downloading',
                    message: 'Processing on server...'
                });

                // Wait for the server to complete the download
                const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DOWNLOAD_SONG}`, {
                    method: 'POST',
                    body: JSON.stringify({ track }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    if (result.status === 'DOWNLOADED' || result.status === 'skipped') {
                        completedTracks.push(track);
                        onProgress?.({
                            track: track.songName,
                            progress: 100,
                            status: 'complete',
                            message: result.status === 'skipped' ? 'Already downloaded' : 'Downloaded successfully'
                        });
                    } else {
                        onProgress?.({
                            track: track.songName,
                            progress: 0,
                            status: 'error',
                            message: result.message || result.error || 'Download failed'
                        });
                    }
                } else {
                    onProgress?.({
                        track: track.songName,
                        progress: 0,
                        status: 'error',
                        message: 'Server error during download'
                    });
                }
            } catch (error) {
                onProgress?.({
                    track: track.songName,
                    progress: 0,
                    status: 'error',
                    message: error instanceof Error ? error.message : 'Processing failed'
                });
            }
        }

        // Now get the list of files and download them as a zip if we have completed tracks
        if (completedTracks.length > 0) {
            try {
                const downloadedFiles = await this.getDownloadedFiles();
                
                // Create filenames based on the completed tracks
                const expectedFilenames = completedTracks.map(track => this.createSimpleFilename(track.name) + '.mp3');
                const filenames = expectedFilenames.filter(filename => downloadedFiles.includes(filename));
                
                console.log('Completed tracks:', completedTracks.map(t => t.name));
                console.log('Expected filenames:', expectedFilenames);
                console.log('Downloaded files on server:', downloadedFiles);
                console.log('Matching filenames for zip:', filenames);
                
                if (filenames.length > 0) {
                    // Add a small delay to ensure all files are ready
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay for multiple files
                    
                    // Use fetch POST request instead of form submission for better proxy compatibility
                    const response = await fetch(`${CONFIG.API.BASE_URL}/download/download-selected`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ filenames }),
                    });

                    if (response.ok) {
                        // Handle the zip file download
                        const blob = await response.blob();
                        const downloadUrl = window.URL.createObjectURL(blob);
                        
                        // Create a temporary link to trigger the download
                        const link = document.createElement('a');
                        link.href = downloadUrl;
                        link.download = 'playlist_songs.zip';
                        link.style.display = 'none';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // Clean up the object URL
                        window.URL.revokeObjectURL(downloadUrl);
                        
                        console.log(`Successfully downloaded zip with ${filenames.length} files`);
                    } else {
                        const error = await response.json();
                        console.error('Zip download failed:', error);
                        throw new Error(error.error || 'Failed to create zip file');
                    }
                } else {
                    console.warn('No matching files found for zip download');
                    throw new Error('No files ready for download');
                }
            } catch (error) {
                console.error('Error creating zip download:', error);
                throw error; // Re-throw to let the caller handle it
            }
        }
    }

    async getDownloadedFiles(): Promise<string[]> {
        const data = await this.request<{ files: Array<{ name: string }> }>(CONFIG.API.ENDPOINTS.FILES);
        return data.files.map(file => file.name);
    }

    private createSimpleFilename(songName: string): string {
        // Match the server-side sanitizeFilename logic exactly
        return songName
            .toLowerCase()                    // Convert to lowercase
            .replace(/[^a-z0-9\s-]/g, '')    // Remove all special characters except spaces and hyphens
            .replace(/\s+/g, '_')            // Replace spaces with underscores
            .replace(/-+/g, '_')             // Replace hyphens with underscores
            .replace(/_+/g, '_')             // Replace multiple underscores with single
            .replace(/^_|_$/g, '')           // Remove leading/trailing underscores
            .substring(0, 50);               // Limit length to 50 characters
    }
}

export const api = new SpotifyAPI();
