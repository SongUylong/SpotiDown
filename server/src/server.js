require('dotenv').config();
const express = require("express");
const path = require("path");
const fs = require('fs');
const cors = require('cors');
const config = require('./config');
const downloadManager = require('./services/download-manager.service');
const { ensureDirectoryExists } = require('./utils/file.utils');
const downloadRoutes = require('./routes/download.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - more permissive for deployment issues
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      // Development origins
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      // Production domains - expanded list
      'https://spotidown-e2ys.onrender.com',
      'https://spoti-down-iota.vercel.app',
      'https://spotidown.vercel.app',
      'https://spotidown.netlify.app',
      // Allow any subdomain of vercel.app for deployment previews
      /\.vercel\.app$/,
      /\.netlify\.app$/
    ];
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`[CORS] Blocked origin: ${origin}`);
      // Still allow but log for debugging
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Global CORS middleware to ensure headers are always set
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Always set CORS headers
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[CORS] Preflight request for ${req.url} from origin: ${origin || 'none'}`);
    return res.status(200).end();
  }
  
  next();
});

// Set timeout for all requests (5 minutes for large downloads)
app.use((req, res, next) => {
  // Set request timeout to 5 minutes
  req.setTimeout(300000);
  
  // Set response timeout to 5 minutes, especially for file downloads
  if (req.url && req.url.includes('/download/files/')) {
    res.setTimeout(300000);
  } else {
    res.setTimeout(60000); // 1 minute for other requests
  }
  
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Configure environment
const DOWNLOAD_DIR = config.paths.downloads;
app.use('/audio', express.static(DOWNLOAD_DIR));

// Ensure required directories exist
ensureDirectoryExists(config.paths.downloads);

// Health check endpoint (before routes for quick checks)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/download', downloadRoutes);

// Global error handling middleware - ensures CORS headers are set even on errors
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  
  // Ensure CORS headers are set even for errors
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Send error response
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
  }
});

// 404 handler with CORS
app.use('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.url
  });
});

// Start the server with proper timeout configuration
const server = app.listen(config.server.port, () => {
  console.log(`Server is running on http://localhost:${config.server.port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS enabled for multiple origins including: https://spoti-down-iota.vercel.app`);
});

// Configure server timeouts to handle large file downloads
server.timeout = 300000; // 5 minutes
server.keepAliveTimeout = 300000; // 5 minutes
server.headersTimeout = 300000; // 5 minutes

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});