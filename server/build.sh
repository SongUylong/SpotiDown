#!/bin/bash

# Spotify Playlist Downloader Server Build Script
echo "🚀 Starting build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --silent

# Run linting (optional - can be skipped in production)
if [ "$NODE_ENV" != "production" ]; then
  echo "🔍 Running linter..."
  npm run lint || echo "⚠️  Linting issues found but continuing build..."
fi

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p src/downloads

echo "✅ Build completed successfully!"
echo "🌟 Ready to start server with: npm start" 