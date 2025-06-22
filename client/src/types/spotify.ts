export interface Track {
    name: string;
    artist: string;
    songName: string;
    isDownloaded: boolean;
    album?: string;
    duration?: number;
    id?: string;
}

export interface PlaylistInfo {
    playlistInfo?: {
        name: string;
        description: string | null;
        owner: string;
        totalTracks: number;
        isPublic: boolean;
        followers: number;
    };
    tracks: Track[];
    totalTracks: number;
    fetchedTracks: number;
}

export interface DownloadResult {
    status: 'success' | 'failed' | 'skipped' | 'DOWNLOADED';
    track: string;
    message?: string;
    error?: string;
    filename?: string;
}

export interface DownloadProgress {
    track: string;
    progress: number;
    status: 'downloading' | 'complete' | 'error';
    message?: string;
} 