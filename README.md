# 🎵 SpotiDown - Spotify Playlist Downloader

A full-stack web application that allows users to download Spotify playlists and individual tracks as high-quality MP3 files. SpotiDown bridges the gap between Spotify's streaming service and local music files by finding YouTube equivalents and converting them to MP3 format.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

## 🌟 Features

### ✨ Core Functionality
- **Playlist Downloads**: Download entire Spotify playlists as MP3 files
- **Individual Tracks**: Download single Spotify tracks
- **High Quality Audio**: 320kbps MP3 conversion
- **Batch Processing**: Download multiple tracks with progress tracking
- **Smart Search**: Intelligent YouTube search for matching tracks
- **Duplicate Prevention**: Avoids re-downloading existing tracks

### 🎨 User Experience  
- **Modern UI**: Beautiful, responsive interface built with React + Material-UI
- **Real-time Progress**: Live download progress with status updates
- **Error Handling**: Graceful error recovery and user feedback
- **Mobile Friendly**: Responsive design for all devices
- **Dark Theme**: Sleek dark mode interface

### 🔧 Technical Features
- **Cookie Support**: Bypass YouTube bot detection using browser cookies
- **Rate Limiting**: Intelligent delays to avoid service restrictions
- **Auto-retry**: Automatic fallback strategies for failed downloads
- **Background Processing**: Non-blocking download operations
- **ZIP Downloads**: Bulk download as compressed archives

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Material-UI (MUI)** - Professional component library
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool and dev server
- **Axios** - HTTP client for API communication

### Backend
- **Node.js** (≥18.0.0) - JavaScript runtime
- **Express.js** - Web application framework
- **Spotify Web API** - Official Spotify API integration
- **yt-search** - YouTube search functionality
- **ytdlp-nodejs** - YouTube video/audio downloading
- **FFmpeg** - Audio processing and conversion
- **Archiver** - ZIP file creation for batch downloads

### Development Tools
- **ESLint** - Code linting
- **Jest** - Testing framework
- **Nodemon** - Development auto-reload
- **CORS** - Cross-origin resource sharing

## 📋 Prerequisites

Before setting up SpotiDown, ensure you have:

1. **Node.js** (≥18.0.0) - [Download here](https://nodejs.org/)
2. **npm** or **yarn** - Package manager
3. **FFmpeg** - Audio processing (auto-installed via ffmpeg-static)
4. **Spotify Developer Account** - For API access

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/SpotifyPlaylistDownload.git
cd SpotifyPlaylistDownload
```

### 2. Server Setup
```bash
cd server
npm install
```

Create a `.env` file in the server directory:
```env
# Spotify API Credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Server Configuration  
PORT=5000
NODE_ENV=development
```

### 3. Client Setup
```bash
cd ../client
npm install
```

### 4. Get Spotify API Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy your **Client ID** and **Client Secret**
4. Add them to your `.env` file

### 5. Cookie Setup (Optional but Recommended)

To avoid YouTube bot detection, set up browser cookies:

```bash
cd server
# Install browser cookie export tool
npm install -g yt-dlp

# Export cookies from your browser (visit YouTube first)
node export-cookies.js

# Or use different browsers
node export-cookies.js chrome
node export-cookies.js edge
```

See `server/COOKIES.md` for detailed cookie setup instructions.

## 🚀 Running the Application

### Development Mode

1. **Start the Backend Server**:
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

2. **Start the Frontend** (in a new terminal):
```bash
cd client  
npm run dev
# Client runs on http://localhost:5173
```

### Production Mode

1. **Build the Client**:
```bash
cd client
npm run build
```

2. **Start the Server**:
```bash
cd server
npm start
```

## 📖 Usage Guide

### Download a Playlist

1. **Get Spotify Playlist URL**:
   - Open Spotify and navigate to any playlist
   - Click **Share** → **Copy link to playlist**

2. **In SpotiDown**:
   - Paste the playlist URL in the input field
   - Click **"Load Playlist"**
   - Select tracks you want to download
   - Click **"Download Selected"** or **"Download All"**

### Download Individual Tracks

1. **Get Spotify Track URL**:
   - Open any Spotify track
   - Click **Share** → **Copy song link**

2. **In SpotiDown**:
   - Paste the track URL
   - Click **"Load Track"**
   - Click **"Download"**

### Batch Operations

- **Select Multiple**: Use checkboxes to select multiple tracks
- **Download Progress**: Monitor real-time progress for each track
- **ZIP Download**: Automatically creates ZIP files for batch downloads
- **Resume Downloads**: Skips already downloaded tracks

## 🔧 Configuration

### Server Configuration

Edit `server/src/config/index.js`:

```javascript
module.exports = {
  server: {
    port: process.env.PORT || 5000,
  },
  paths: {
    downloads: path.join(__dirname, '../downloads'),
  },
  download: {
    quality: '320',
    format: 'mp3',
    delayBetweenTracks: 10000, // 10 seconds
  }
};
```

### Environment Variables

```env
# Required
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# Optional
PORT=5000
NODE_ENV=development
DOWNLOAD_DELAY=10000
MAX_CONCURRENT_DOWNLOADS=3
```

## 🐛 Troubleshooting

### Common Issues

**1. "Sign in to confirm you're not a bot" Error**
```bash
# Solution: Set up browser cookies
cd server
node export-cookies.js
```

**2. Spotify API Authentication Failed**
- Verify your `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`
- Check if your Spotify app is properly configured

**3. Downloads Failing**
- Check your internet connection
- Ensure FFmpeg is properly installed
- Try refreshing browser cookies

**4. CORS Errors**
- Verify the client URL is in the server's CORS whitelist
- Check if both client and server are running

### Log Levels

Enable detailed logging:
```bash
# Server logs
cd server
DEBUG=* npm run dev

# Check download logs
tail -f src/downloads/download.log
```

## 📁 Project Structure

```
SpotifyPlaylistDownload/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   └── pages/          # Page components
│   ├── public/             # Static assets
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   ├── config/         # Configuration
│   │   └── downloads/      # Downloaded files
│   ├── cookies.txt         # Browser cookies (optional)
│   └── package.json
└── README.md              # This file
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Legal Disclaimer

**Important**: This tool is for educational and personal use only. Users are responsible for complying with:

- **Spotify Terms of Service**
- **YouTube Terms of Service** 
- **Local copyright laws**
- **Fair use guidelines**

Only download content you have the legal right to access. The developers are not responsible for any misuse of this software.

## 🔗 Links

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api/)
- [YouTube Terms of Service](https://www.youtube.com/static?template=terms)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

## 💡 Tips & Best Practices

1. **Cookie Maintenance**: Refresh cookies weekly for consistent downloads
2. **Rate Limiting**: Avoid downloading too many tracks simultaneously
3. **Quality Settings**: Use 320kbps for best audio quality
4. **Storage**: Ensure sufficient disk space for large playlists
5. **Network**: Use stable internet connection for uninterrupted downloads

---

**Made with ❤️ for music lovers everywhere**

*Happy downloading! 🎵* 