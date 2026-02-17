import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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

