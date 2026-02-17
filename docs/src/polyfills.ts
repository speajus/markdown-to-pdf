/**
 * Polyfills for Node.js modules in the browser
 * Required for PDFKit to work in browser environment
 */

import { Buffer } from 'buffer';
import process from 'process';

// Make Buffer and process available globally
(window as any).Buffer = Buffer;
(window as any).process = process;
(window as any).global = window;

// Define __dirname and __filename for browser
(window as any).__dirname = '/';
(window as any).__filename = '/index.js';

// Stub fs module for PDFKit font loading
// PDFKit will use embedded fonts when fs is not available
(window as any).fs = {
  readFileSync: () => {
    throw new Error('fs.readFileSync is not available in browser');
  },
  existsSync: () => false,
  readFile: () => {
    throw new Error('fs.readFile is not available in browser');
  },
};

