import { useState } from 'react';

interface SpotifyInputProps {
    onPlaylistSubmit: (url: string) => void;
    onTrackSubmit: (url: string) => void;
    isLoading: boolean;
}

export function PlaylistInput({ onPlaylistSubmit, onTrackSubmit, isLoading }: SpotifyInputProps) {
    const [url, setUrl] = useState('');

    const detectUrlType = (url: string): 'playlist' | 'track' | 'invalid' => {
        if (url.includes('/playlist/')) return 'playlist';
        if (url.includes('/track/')) return 'track';
        return 'invalid';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            const urlType = detectUrlType(url.trim());
            if (urlType === 'playlist') {
                onPlaylistSubmit(url.trim());
            } else if (urlType === 'track') {
                onTrackSubmit(url.trim());
            }
        }
    };

    const urlType = url.trim() ? detectUrlType(url.trim()) : null;
    const isValidUrl = urlType === 'playlist' || urlType === 'track';

    return (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Enter Spotify URL</h2>
                <p className="mt-2 text-sm text-gray-600">
                    Paste your Spotify playlist or track URL below to start downloading
                </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-2">
                    <div className="relative">
                        <input
                            id="spotify-url"
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://open.spotify.com/playlist/... or https://open.spotify.com/track/..."
                            className={`w-full px-4 py-3 border rounded-lg bg-white
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                ${isLoading ? 'bg-gray-50 text-gray-500' : 'text-gray-900'}
                                ${isValidUrl ? 'border-blue-300' : url.trim() && urlType === 'invalid' ? 'border-red-300' : 'border-gray-300'}`}
                            disabled={isLoading}
                        />
                        {url.trim() && (
                            <button
                                type="button"
                                onClick={() => setUrl('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    
                    {/* URL Type Indicator */}
                    {url.trim() && (
                        <div className="flex items-center gap-2 text-sm">
                            {urlType === 'playlist' && (
                                <div className="flex items-center gap-1 text-green-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2zm12-3c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2z" />
                                    </svg>
                                    <span>Playlist detected</span>
                                </div>
                            )}
                            {urlType === 'track' && (
                                <div className="flex items-center gap-1 text-blue-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2zm12-3c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2z" />
                                    </svg>
                                    <span>Single track detected</span>
                                </div>
                            )}
                            {urlType === 'invalid' && (
                                <div className="flex items-center gap-1 text-red-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Invalid Spotify URL</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={!isValidUrl || isLoading}
                    className={`w-full py-3 px-6 rounded-lg text-white font-medium transition-all duration-200
                        ${!isValidUrl || isLoading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600 hover:shadow-md transform hover:-translate-y-0.5'}`}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Loading...</span>
                        </div>
                    ) : urlType === 'track' ? (
                        'Download Track'
                    ) : (
                        'Load Playlist'
                    )}
                </button>

                <p className="text-center text-sm text-gray-500 mt-4">
                    {urlType === 'track' 
                        ? 'Make sure the track is available and accessible'
                        : 'Make sure your playlist is public or shared with a valid link'
                    }
                </p>
            </form>
        </div>
    );
} 