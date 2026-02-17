/**
 * Polyfills for Node.js modules in the browser
 * Required for PDFKit to work in browser environment
 */

import { Buffer } from 'buffer';
import process from 'process';

// Make Buffer and process available globally
(window as any).Buffer = Buffer;
(window as any).process = process;

