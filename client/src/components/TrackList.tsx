import { useState } from 'react';
import type { Track, DownloadProgress } from '../types/spotify';

interface TrackListProps {
    tracks: Track[];
    onDownloadSingle: (track: Track) => Promise<void>;
    onDownloadSelected: (tracks: Track[], onProgress: (progress: DownloadProgress) => void) => Promise<void>;
}

export function TrackList({ tracks, onDownloadSingle, onDownloadSelected }: TrackListProps) {
    const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
    const [downloading, setDownloading] = useState<Set<string>>(new Set());
    const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({});
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Filter tracks based on search query
    const filteredTracks = tracks.filter(track => {
        if (!searchQuery.trim()) return true;
        
        const query = searchQuery.toLowerCase().trim();
        const trackName = track.name.toLowerCase();
        const artistName = track.artist.toLowerCase();
        
        return trackName.includes(query) || artistName.includes(query);
    });

    const toggleTrack = (track: Track) => {
        const newSelected = new Set(selectedTracks);
        if (newSelected.has(track.songName)) {
            newSelected.delete(track.songName);
        } else {
            newSelected.add(track.songName);
        }
        setSelectedTracks(newSelected);
    };

    const selectAll = () => {
        const availableTracks = filteredTracks.filter(track => !track.isDownloaded && !downloading.has(track.songName));
        const allTrackNames = availableTracks.map(track => track.songName);
        setSelectedTracks(prev => {
            const newSet = new Set(prev);
            allTrackNames.forEach(name => newSet.add(name));
            return newSet;
        });
    };

    const unselectAll = () => {
        // Only unselect tracks that are currently visible (filtered)
        const visibleTrackNames = filteredTracks.map(track => track.songName);
        setSelectedTracks(prev => {
            const newSet = new Set<string>();
            prev.forEach(trackName => {
                if (!visibleTrackNames.includes(trackName)) {
                    newSet.add(trackName);
                }
            });
            return newSet;
        });
    };

    const isAllSelected = () => {
        const availableTracks = filteredTracks.filter(track => !track.isDownloaded && !downloading.has(track.songName));
        return availableTracks.length > 0 && availableTracks.every(track => selectedTracks.has(track.songName));
    };

    const availableTracksCount = filteredTracks.filter(track => !track.isDownloaded && !downloading.has(track.songName)).length;
    const selectedFromFiltered = filteredTracks.filter(track => selectedTracks.has(track.songName)).length;

    const handleSingleDownload = async (track: Track) => {
        try {
            setDownloading(prev => new Set(prev).add(track.songName));
            await onDownloadSingle(track);
        } finally {
            setDownloading(prev => {
                const next = new Set(prev);
                next.delete(track.songName);
                return next;
            });
        }
    };

    const handleDownloadSelected = async () => {
        const tracksToDownload = tracks.filter(track => selectedTracks.has(track.songName));
        if (tracksToDownload.length > 0) {
            try {
                const downloadingTracks = new Set(tracksToDownload.map(t => t.songName));
                setDownloading(downloadingTracks);
                setDownloadProgress({});

                await onDownloadSelected(tracksToDownload, (progress) => {
                    setDownloadProgress(prev => ({
                        ...prev,
                        [progress.track]: progress
                    }));
                });

                setSelectedTracks(new Set());
            } catch (error) {
                console.error('Batch download failed:', error);
            } finally {
                setDownloading(new Set());
                setDownloadProgress({});
            }
        }
    };

    const getTrackStatus = (track: Track) => {
        const progress = downloadProgress[track.songName];
        if (!progress) return null;

        if (progress.status === 'downloading') {
            return (
                <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${progress.progress}%` }}
                        />
                    </div>
                    <span className="text-sm text-gray-600">{progress.message}</span>
                </div>
            );
        }

        if (progress.status === 'error') {
            return (
                <span className="text-sm text-red-600">
                    {progress.message || 'Download failed'}
                </span>
            );
        }

        return null;
    };

    const clearSearch = () => {
        setSearchQuery('');
    };

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    // Function to highlight search terms in text
    const highlightText = (text: string, query: string): JSX.Element => {
        if (!query.trim()) {
            return <span>{text}</span>;
        }
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        
        return (
            <>
                {parts.map((part, index) => {
                    if (regex.test(part)) {
                        return (
                            <span 
                                key={index}
                                style={{
                                    backgroundColor: '#fef08a',
                                    color: '#a16207',
                                    padding: '2px 4px',
                                    borderRadius: '4px',
                                    fontWeight: '500'
                                }}
                            >
                                {part}
                            </span>
                        );
                    }
                    return <span key={index}>{part}</span>;
                })}
            </>
        );
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            {tracks.length > 0 && (
                <div className="flex flex-col gap-4 mb-6 bg-white p-4 rounded-lg shadow">
                    {/* Search Bar */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Search tracks by name or artist..."
                            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="text-center sm:text-left">
                            <h2 className="text-xl font-bold text-gray-900">
                                Playlist Tracks
                            </h2>
                            <p className="text-sm text-gray-600">
                                {searchQuery ? (
                                    <>
                                        {filteredTracks.length} of {tracks.length} tracks • {selectedFromFiltered} selected • {availableTracksCount} available
                                        <span className="ml-2 text-blue-600">
                                            (searching: "{searchQuery}")
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        {tracks.length} tracks • {selectedTracks.size} selected • {availableTracksCount} available
                                    </>
                                )}
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadSelected}
                            disabled={selectedTracks.size === 0 || downloading.size > 0}
                            className={`w-full sm:w-auto px-6 py-3 rounded-lg text-white font-medium transition-colors duration-200
                                ${selectedTracks.size === 0 || downloading.size > 0
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-green-500 hover:bg-green-600 transform hover:scale-105'}`}
                        >
                            {downloading.size > 0 
                                ? `Downloading ${downloading.size} tracks...` 
                                : `Download Selected (${selectedTracks.size})`}
                        </button>
                    </div>
                    
                    {/* Selection Controls */}
                    {availableTracksCount > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
                            <span className="text-sm text-gray-600 mr-2">Quick select:</span>
                            <button
                                onClick={selectAll}
                                disabled={downloading.size > 0 || isAllSelected()}
                                className={`px-3 py-1 text-sm rounded-md transition-colors duration-200
                                    ${downloading.size > 0 || isAllSelected()
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                            >
                                {isAllSelected() ? '✓ All Selected' : `Select All (${availableTracksCount})`}
                            </button>
                            <button
                                onClick={unselectAll}
                                disabled={downloading.size > 0 || selectedTracks.size === 0}
                                className={`px-3 py-1 text-sm rounded-md transition-colors duration-200
                                    ${downloading.size > 0 || selectedTracks.size === 0
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                Unselect All
                            </button>
                        </div>
                    )}
                </div>
            )}
            <div className="space-y-3">
                {filteredTracks.map((track) => (
                    <div
                        key={track.songName}
                        className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white rounded-lg shadow transition-all duration-200 hover:shadow-md
                            ${downloading.has(track.songName) ? 'bg-blue-50' : ''}
                            ${track.isDownloaded ? 'bg-green-50' : ''}`}
                    >
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <input
                                type="checkbox"
                                checked={selectedTracks.has(track.songName)}
                                onChange={() => toggleTrack(track)}
                                disabled={downloading.has(track.songName) || track.isDownloaded}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-grow">
                                <h3 className="font-medium text-gray-900">{highlightText(track.name, searchQuery)}</h3>
                                <p className="text-sm text-gray-600">{highlightText(track.artist, searchQuery)}</p>
                            </div>
                        </div>
                        
                        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ml-9 sm:ml-0">
                            {getTrackStatus(track) && (
                                <div className="flex-grow min-w-[200px]">
                                    {getTrackStatus(track)}
                                </div>
                            )}
                            <button
                                onClick={() => handleSingleDownload(track)}
                                disabled={downloading.has(track.songName) || track.isDownloaded}
                                className={`px-3 py-2 rounded-lg text-white font-medium sm:w-auto w-64 transition-colors duration-200 text-sm
                                    ${track.isDownloaded
                                        ? 'bg-green-500 cursor-not-allowed'
                                        : downloading.has(track.songName)
                                        ? 'bg-blue-500 animate-pulse'
                                        : 'bg-blue-500 hover:bg-blue-600 transform hover:scale-105'}`}
                            >
                                {track.isDownloaded
                                    ? '✓ Downloaded'
                                    : downloading.has(track.songName)
                                    ? 'Downloading...'
                                    : 'Download'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {tracks.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-gray-600">No tracks found in the playlist</p>
                </div>
            )}
            {tracks.length > 0 && filteredTracks.length === 0 && searchQuery && (
                <div className="text-center py-8">
                    <div className="flex flex-col items-center gap-3">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <div>
                            <p className="text-gray-600 font-medium">No tracks found</p>
                            <p className="text-gray-500 text-sm mt-1">
                                No tracks match your search "{searchQuery}"
                            </p>
                            <button
                                onClick={clearSearch}
                                className="mt-3 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Clear search
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 