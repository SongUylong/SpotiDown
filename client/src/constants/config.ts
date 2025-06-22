export const CONFIG = {
    API: {
        BASE_URL: '/api',
        ENDPOINTS: {
            PLAYLIST_INFO: '/download/playlist-info',
            DOWNLOAD_SONG: '/download/song',
            DOWNLOAD_SELECTED: '/download/download-selected',
            FILES: '/download/files'
        }
    },
    UI: {
        PLAYLIST_TITLE: 'Spotify Playlist Downloader',
        PLAYLIST_SUBTITLE: 'Download your favorite playlists',
        FOOTER_TEXT: 'Made with ❤️ for music lovers'
    }
} as const; 