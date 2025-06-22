import { useState } from 'react';
import type { Track, DownloadResult } from '../types/spotify';

interface SingleTrackDisplayProps {
    track: Track;
    onDownload: (track: Track) => Promise<DownloadResult>;
}

export function SingleTrackDisplay({ track, onDownload }: SingleTrackDisplayProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(null);

    const handleDownload = async () => {
        setIsDownloading(true);
        setDownloadResult(null);
        
        try {
            const result = await onDownload(track);
            setDownloadResult(result);
        } catch (error) {
            setDownloadResult({
                status: 'failed',
                track: track.songName,
                message: error instanceof Error ? error.message : 'Download failed'
            });
        } finally {
            setIsDownloading(false);
        }
    };

    const formatDuration = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="flex-1 w-full">
                        <h3 className="text-xl font-semibold text-gray-900">{track.name}</h3>
                        <p className="text-gray-600 mt-1">{track.artist}</p>
                        {track.album && (
                            <p className="text-gray-500 text-sm mt-1">Album: {track.album}</p>
                        )}
                        {track.duration && (
                            <p className="text-gray-500 text-sm mt-1">Duration: {formatDuration(track.duration)}</p>
                        )}
                    </div>
                    
                    <div className="w-full sm:w-auto flex flex-col items-center sm:items-end gap-2">
                        {track.isDownloaded && (
                            <div className="flex items-center gap-1 text-green-600 text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Downloaded</span>
                            </div>
                        )}
                        
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading || track.isDownloaded}
                            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                ${track.isDownloaded
                                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                    : isDownloading
                                        ? 'bg-blue-100 text-blue-600 cursor-wait'
                                        : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md transform hover:-translate-y-0.5'
                                }`}
                        >
                            {isDownloading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Downloading...</span>
                                </div>
                            ) : track.isDownloaded ? (
                                'Already Downloaded'
                            ) : (
                                'Download Track'
                            )}
                        </button>
                    </div>
                </div>

                {/* Download Result */}
                {downloadResult && (
                    <div className={`mt-4 p-3 rounded-lg ${
                        downloadResult.status === 'DOWNLOADED' || downloadResult.status === 'success'
                            ? 'bg-green-50 border border-green-200'
                            : downloadResult.status === 'skipped'
                                ? 'bg-yellow-50 border border-yellow-200'
                                : 'bg-red-50 border border-red-200'
                    }`}>
                        <div className="flex items-center gap-2">
                            {downloadResult.status === 'DOWNLOADED' || downloadResult.status === 'success' ? (
                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            ) : downloadResult.status === 'skipped' ? (
                                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            <p className={`text-sm ${
                                downloadResult.status === 'DOWNLOADED' || downloadResult.status === 'success'
                                    ? 'text-green-800'
                                    : downloadResult.status === 'skipped'
                                        ? 'text-yellow-800'
                                        : 'text-red-800'
                            }`}>
                                {downloadResult.message || downloadResult.error || 'Operation completed'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 