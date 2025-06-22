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

// Middleware
const isDevelopment = process.env.NODE_ENV !== 'production';

const corsOptions = {
  origin: [
    // Development origins
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Alternative React dev server
    'http://127.0.0.1:5173', // Alternative localhost
    'http://127.0.0.1:3000',
    // Production domains
    'https://spotidown-e2ys.onrender.com'
  ],
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Apply CORS middleware
app.use(cors(corsOptions));

// Fallback CORS headers for all responses
app.use((req, res, next) => {
  if (req.headers.origin) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

// Add CORS debugging middleware in development
if (isDevelopment) {
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS' || req.headers.origin) {
      console.log(`[CORS] ${req.method} ${req.url} from origin: ${req.headers.origin || 'none'}`);
    }
    next();
  });
}

// Configure environment
const DOWNLOAD_DIR = config.paths.downloads;
app.use('/audio', express.static(DOWNLOAD_DIR));

// Ensure required directories exist
ensureDirectoryExists(config.paths.downloads);

// Routes - MOVED BEFORE global OPTIONS handler
app.use('/api/download', downloadRoutes);

// Handle preflight requests explicitly for all routes
app.options('*', (req, res) => {
  console.log(`[GLOBAL CORS] OPTIONS ${req.url} from origin: ${req.headers.origin || 'none'}`);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
    });
});

// Start the server with proper timeout configuration
const server = app.listen(config.server.port, () => {
    console.log(`Server is running on http://localhost:${config.server.port}`);
});

// Configure server timeouts to handle large file downloads
server.timeout = 300000; // 5 minutes
server.keepAliveTimeout = 300000; // 5 minutes
server.headersTimeout = 300000; // 5 minutes