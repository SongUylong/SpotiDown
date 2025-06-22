import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        timeout: 0, // Disable timeout
        proxyTimeout: 0, // Disable proxy timeout
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Set keep-alive headers for better connection handling
            proxyReq.setHeader('Connection', 'keep-alive');
            proxyReq.setHeader('Keep-Alive', 'timeout=0');
            
            // For file downloads, disable all timeouts
            if (req.url && req.url.includes('/download/files/')) {
              proxyReq.setTimeout(0); // Disable timeout for file downloads
              // Increase max listeners to prevent memory warnings
              proxyReq.setMaxListeners(0);
              
              // eslint-disable-next-line no-console
              console.log(`[PROXY] Proxying file download: ${req.url}`);
            }
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // For file downloads, disable response timeout and set proper headers
            if (req.url && req.url.includes('/download/files/')) {
              res.setTimeout(0); // Disable timeout
              proxyRes.setTimeout(0); // Disable source timeout
              
              // Set headers to prevent chunking issues
              res.setHeader('Transfer-Encoding', 'chunked');
              res.setHeader('Connection', 'keep-alive');
              
              // eslint-disable-next-line no-console
              console.log(`[PROXY] Streaming file: ${req.url}, Size: ${proxyRes.headers['content-length']} bytes`);
              
              // Handle stream errors
              proxyRes.on('error', (err: Error) => {
                // eslint-disable-next-line no-console
                console.error(`[PROXY] ProxyRes stream error for ${req.url}:`, err.message);
              });
              
              res.on('error', (err: Error) => {
                // eslint-disable-next-line no-console
                console.error(`[PROXY] Response stream error for ${req.url}:`, err.message);
              });
            }
          });
          
          proxy.on('error', (err, req, res) => {
            // eslint-disable-next-line no-console
            console.error(`[PROXY] Proxy error for ${req.url}:`, err.message);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Proxy error: ' + err.message);
            }
          });
          
          // Add close event handler
          proxy.on('close', () => {
            // eslint-disable-next-line no-console
            console.log('[PROXY] Proxy connection closed');
          });
        },
        headers: {
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=0'
        }
      }
    }
  }
})
