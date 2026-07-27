import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'
import http from 'http'

// Custom download proxy middleware
function downloadProxyPlugin() {
  return {
    name: 'download-proxy',
    configureServer(server) {
      server.middlewares.use('/api/download', (req, res) => {
        const urlParam = new URL(req.url, 'http://localhost').searchParams.get('url');
        const filename = new URL(req.url, 'http://localhost').searchParams.get('name') || 'video.mp4';

        if (!urlParam) {
          res.writeHead(400); res.end('Missing url parameter'); return;
        }

        try {
          const target = new URL(urlParam);
          const lib = target.protocol === 'https:' ? https : http;

          const proxyReq = lib.get(urlParam, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (proxyRes) => {
            res.writeHead(200, {
              'Content-Type': proxyRes.headers['content-type'] || 'video/mp4',
              'Content-Length': proxyRes.headers['content-length'] || '',
              'Content-Disposition': `attachment; filename="${filename}"`,
              'Access-Control-Allow-Origin': '*',
            });
            proxyRes.pipe(res);
          });

          proxyReq.on('error', (err) => {
            console.error('[DownloadProxy] Error:', err.message);
            res.writeHead(502); res.end('Proxy error: ' + err.message);
          });

        } catch (e) {
          res.writeHead(400); res.end('Invalid URL');
        }
      });
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), downloadProxyPlugin()],
  server: {
    port: 3000,
    open: true,
  }
})
