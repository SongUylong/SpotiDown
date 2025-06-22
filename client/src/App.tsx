import { useState } from 'react';
import { PlaylistInput } from './components/PlaylistInput';
import { TrackList } from './components/TrackList';
import { SingleTrackDisplay } from './components/SingleTrackDisplay';
import { api } from './services/api';
import { CONFIG } from './constants/config';
import type { Track, PlaylistInfo, DownloadProgress } from './types/spotify';

export default function App() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
    const [singleTrack, setSingleTrack] = useState<Track | null>(null);
    const [mode, setMode] = useState<'none' | 'playlist' | 'track'>('none');

    const handlePlaylistSubmit = async (url: string) => {
        setIsLoading(true);
        setError(null);
        setSingleTrack(null);
        setPlaylistInfo(null);
        
        try {
            const info = await api.getPlaylistInfo(url);
            setPlaylistInfo(info);
            setMode('playlist');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load playlist');
            setMode('none');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTrackSubmit = async (url: string) => {
        setIsLoading(true);
        setError(null);
        setSingleTrack(null);
        setPlaylistInfo(null);
        
        try {
            const result = await api.getTrackInfo(url);
            setSingleTrack(result.track);
            setMode('track');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load track');
            setMode('none');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSingleDownload = async (track: Track) => {
        try {
            const result = await api.downloadSong(track);
            if (result.status === 'DOWNLOADED') {
                if (mode === 'playlist' && playlistInfo) {
                    const updatedTracks = playlistInfo.tracks.map(t => 
                        t.songName === track.songName ? { ...t, isDownloaded: true } : t
                    );
                    setPlaylistInfo({ ...playlistInfo, tracks: updatedTracks });
                } else if (mode === 'track' && singleTrack) {
                    setSingleTrack({ ...singleTrack, isDownloaded: true });
                }
            } else if (result.status === 'failed') {
                setError(result.message || 'Failed to download track');
            }
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to download track';
            setError(errorMessage);
            return {
                status: 'failed' as const,
                track: track.songName,
                message: errorMessage
            };
        }
    };

    const handlePlaylistTrackDownload = async (track: Track): Promise<void> => {
        await handleSingleDownload(track);
    };

    const handleBatchDownload = async (tracks: Track[], onProgress: (progress: DownloadProgress) => void) => {
        setError(null);
        try {
            await api.downloadSelectedSongs(tracks, onProgress);
            if (playlistInfo) {
                const downloadedSongNames = new Set(tracks.map(t => t.songName));
                const updatedTracks = playlistInfo.tracks.map(t => 
                    downloadedSongNames.has(t.songName) ? { ...t, isDownloaded: true } : t
                );
                setPlaylistInfo({ ...playlistInfo, tracks: updatedTracks });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to download selected tracks');
        }
    };

    const handleReset = () => {
        setPlaylistInfo(null);
        setSingleTrack(null);
        setError(null);
        setMode('none');
    };

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Enhanced Navbar */}
            <header className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 shadow-lg">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-black opacity-5"></div>
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/4 w-32 h-32 bg-white opacity-5 rounded-full blur-xl"></div>
                    <div className="absolute top-8 right-1/3 w-24 h-24 bg-yellow-300 opacity-10 rounded-full blur-lg"></div>
                    <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-pink-300 opacity-5 rounded-full blur-2xl"></div>
                </div>
                
                <div className="relative max-w-none mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center sm:flex-row sm:justify-between">
                        {/* Logo and Title Section */}
                        <div className="flex items-center mb-4 sm:mb-0 group">
                            {/* Logo with animation */}
                            <div className="relative mr-4">
                                <div className="absolute inset-0 bg-white rounded-xl opacity-20 blur-sm group-hover:opacity-30 transition-opacity duration-300"></div>
                                <div className="relative w-14 h-14 bg-gradient-to-br from-white to-gray-100 rounded-xl shadow-lg flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                                    {/* Music Note Icon */}
                                    <svg className="w-8 h-8 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                    </svg>
                                </div>
                            </div>
                            
                            {/* Title with gradient text */}
                            <div className="flex flex-col">
                                <h1 className="text-4xl font-black bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent transform group-hover:scale-105 transition-transform duration-300">
                                    SpotiDown
                                </h1>
                                <div className="flex items-center mt-1 space-x-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-white/80 font-medium tracking-wide">
                                        Music Downloader
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Right side - Features and Stats */}
                        <div className="flex flex-col items-center sm:items-end space-y-2">
                            {/* Feature badges */}
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20">
                                    <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                    </svg>
                                    <span className="text-white text-xs font-medium">Playlists</span>
                                </div>
                                <div className="flex items-center space-x-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20">
                                    <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2zm12-3c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2z" />
                                    </svg>
                                    <span className="text-white text-xs font-medium">Tracks</span>
                                </div>
                            </div>
                            
                            {/* Description */}
                            <p className="text-white/90 text-sm font-medium text-center sm:text-right">
                                Download Spotify playlists and tracks
                            </p>
                            
                            {/* Quality badge */}
                            <div className="flex items-center space-x-1 text-yellow-300">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                                <span className="text-xs font-semibold">High Quality MP3</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Animated bottom border */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                </div>
            </header>

            <main className="w-full py-8 px-4 sm:px-6 lg:px-8 h-full">
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                    <PlaylistInput 
                        onPlaylistSubmit={handlePlaylistSubmit} 
                        onTrackSubmit={handleTrackSubmit}
                        isLoading={isLoading} 
                    />
                    
                    {(mode !== 'none') && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={handleReset}
                                className="text-sm text-gray-500 hover:text-gray-700 underline"
                            >
                                Try a different URL
                            </button>
                        </div>
                    )}
                </div>
                
                {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <p className="text-red-800">{error}</p>
                        </div>
                    </div>
                )}

                {mode === 'track' && singleTrack && (
                    <div className="mb-8">
                        <SingleTrackDisplay
                            track={singleTrack}
                            onDownload={handleSingleDownload}
                        />
                    </div>
                )}

                {mode === 'playlist' && playlistInfo && (
                    <div className="space-y-6">
                        {/* Playlist Information Header */}
                        {playlistInfo.playlistInfo && (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                            {playlistInfo.playlistInfo.name}
                                        </h2>
                                        {playlistInfo.playlistInfo.description && (
                                            <p className="text-gray-600 mb-3 leading-relaxed">
                                                {playlistInfo.playlistInfo.description}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                            <span>👤 By {playlistInfo.playlistInfo.owner}</span>
                                            <span>🎵 {playlistInfo.fetchedTracks} tracks</span>
                                            {playlistInfo.playlistInfo.followers > 0 && (
                                                <span>👥 {playlistInfo.playlistInfo.followers.toLocaleString()} followers</span>
                                            )}
                                            <span>{playlistInfo.playlistInfo.isPublic ? '🌐 Public' : '🔒 Private'}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Progress indicator for large playlists */}
                                {playlistInfo.playlistInfo.totalTracks > 100 && (
                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-blue-800 text-sm">
                                                ✅ Successfully fetched all {playlistInfo.fetchedTracks} tracks from this large playlist!
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Track List */}
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <TrackList
                                tracks={playlistInfo.tracks}
                                onDownloadSingle={handlePlaylistTrackDownload}
                                onDownloadSelected={handleBatchDownload}
                            />
                        </div>
                    </div>
                )}
            </main>

            <footer className="relative mt-auto py-6 bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/4 w-20 h-20 bg-indigo-500 opacity-10 rounded-full blur-xl animate-pulse"></div>
                    <div className="absolute bottom-0 right-1/3 w-24 h-24 bg-purple-500 opacity-10 rounded-full blur-2xl animate-pulse delay-1000"></div>
                </div>
                
                {/* Animated top border */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                        {/* Developer credit */}
                        <div className="flex items-center space-x-2 bg-white/5 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10 hover:border-white/20 transition-all duration-300 group">
                            <div className="w-6 h-6 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div className="text-center">
                                <p className="text-white/60 text-xs font-medium">Developed by</p>
                                <p className="text-white font-bold text-sm bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                                    UylongSong
                                </p>
                            </div>
                        </div>
                        
                        {/* Tech stack section */}
                        <div className="flex items-center space-x-3">
                            <p className="text-white/70 text-xs font-medium hidden sm:block">Built with</p>
                            
                            {/* React */}
                            <div className="flex items-center space-x-1 bg-blue-500/10 backdrop-blur-sm rounded-full px-2 py-1 border border-blue-400/20 hover:border-blue-400/40 transition-all duration-300 group-hover:scale-105">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <span className="text-blue-300 text-xs font-semibold">React</span>
                            </div>
                            
                            {/* Node.js */}
                            <div className="flex items-center space-x-1 bg-green-500/10 backdrop-blur-sm rounded-full px-2 py-1 border border-green-400/20 hover:border-green-400/40 transition-all duration-300 group-hover:scale-105">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-green-300 text-xs font-semibold">Node.js</span>
                            </div>
                            
                            {/* Spotify API */}
                            <div className="flex items-center space-x-1 bg-green-600/10 backdrop-blur-sm rounded-full px-2 py-1 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 group-hover:scale-105">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-green-400 text-xs font-semibold">Spotify API</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Bottom glow effect */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent blur-sm"></div>
            </footer>
        </div>
    );
}
