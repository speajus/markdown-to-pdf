import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import https from 'https';
import http from 'http';

/**
 * Vite plugin that proxies remote image requests to avoid CORS issues.
 * Requests to /__image_proxy/<encoded-url> are fetched server-side and piped back.
 */
function imageProxyPlugin(): Plugin {
  return {
    name: 'image-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const prefix = '/__image_proxy/';
        if (!req.url?.startsWith(prefix)) return next();

        const encoded = req.url.slice(prefix.length);
        if (!encoded) {
          res.statusCode = 400;
          res.end('Missing URL');
          return;
        }

        const targetUrl = decodeURIComponent(encoded);
        const client = targetUrl.startsWith('https') ? https : http;

        const proxyReq = client.get(
          targetUrl,
          { headers: { 'User-Agent': 'markdown-to-pdf-proxy' } },
          (proxyRes) => {
            // Follow one redirect
            if (
              proxyRes.statusCode &&
              proxyRes.statusCode >= 300 &&
              proxyRes.statusCode < 400 &&
              proxyRes.headers.location
            ) {
              const redirectClient = proxyRes.headers.location.startsWith('https') ? https : http;
              redirectClient
                .get(proxyRes.headers.location, { headers: { 'User-Agent': 'markdown-to-pdf-proxy' } }, (rRes) => {
                  res.writeHead(rRes.statusCode || 200, {
                    'Content-Type': rRes.headers['content-type'] || 'application/octet-stream',
                    'Cache-Control': 'public, max-age=86400',
                  });
                  rRes.pipe(res);
                })
                .on('error', () => {
                  res.statusCode = 502;
                  res.end('Proxy redirect failed');
                });
              return;
            }

            res.writeHead(proxyRes.statusCode || 200, {
              'Content-Type': proxyRes.headers['content-type'] || 'application/octet-stream',
              'Cache-Control': 'public, max-age=86400',
            });
            proxyRes.pipe(res);
          },
        );
        proxyReq.on('error', () => {
          res.statusCode = 502;
          res.end('Proxy fetch failed');
        });
      });
    },
  };
}

/**
 * Vite plugin that proxies Google Fonts CSS requests so we can spoof the
 * User-Agent header and receive TTF URLs instead of woff2.
 *
 * Requests to /__font_css_proxy/<encoded-css-url> are fetched server-side
 * with an old-IE User-Agent string that causes Google Fonts to serve
 * TrueType font URLs.
 */
function fontCssProxyPlugin(): Plugin {
  return {
    name: 'font-css-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const prefix = '/__font_css_proxy/';
        if (!req.url?.startsWith(prefix)) return next();

        const encoded = req.url.slice(prefix.length);
        if (!encoded) {
          res.statusCode = 400;
          res.end('Missing URL');
          return;
        }

        const targetUrl = decodeURIComponent(encoded);

        // Only allow proxying to fonts.googleapis.com
        if (!targetUrl.startsWith('https://fonts.googleapis.com/')) {
          res.statusCode = 403;
          res.end('Forbidden: only fonts.googleapis.com URLs are allowed');
          return;
        }

        // Use an old-IE User-Agent so Google Fonts returns TTF URLs
        const spoofedUA =
          'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)';

        https
          .get(targetUrl, { headers: { 'User-Agent': spoofedUA } }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 200, {
              'Content-Type': proxyRes.headers['content-type'] || 'text/css',
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*',
            });
            proxyRes.pipe(res);
          })
          .on('error', () => {
            res.statusCode = 502;
            res.end('Font CSS proxy fetch failed');
          });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), imageProxyPlugin(), fontCssProxyPlugin()],
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      stream: path.resolve(__dirname, 'node_modules/stream-browserify'),
      buffer: path.resolve(__dirname, 'node_modules/buffer'),
      util: path.resolve(__dirname, 'node_modules/util'),
      process: path.resolve(__dirname, 'node_modules/process/browser.js'),
      events: path.resolve(__dirname, 'node_modules/events'),
      // Use standalone browser build of PDFKit with embedded fonts
      pdfkit: path.resolve(__dirname, 'node_modules/pdfkit/js/pdfkit.standalone.js'),
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
    __dirname: '""',
    __filename: '""',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
});

