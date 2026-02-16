import { Resvg } from '@resvg/resvg-js';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

function isSvg(buf: Buffer): boolean {
  // Check for XML/SVG signature in the first 256 bytes
  const head = buf.subarray(0, 256).toString('utf-8').trimStart();
  return head.startsWith('<svg') || head.startsWith('<?xml');
}

function convertSvgToPng(svgData: Buffer): Buffer {
  const resvg = new Resvg(svgData, { font: { loadSystemFonts: true } });
  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}

const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

function fetchImageBuffer(url: string, redirectCount = 0): Promise<Buffer> {
  if (redirectCount > MAX_REDIRECTS) {
    return Promise.reject(new Error(`Too many redirects fetching ${url}`));
  }
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    const req = get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); // drain the response so the socket can be reused / freed
        fetchImageBuffer(res.headers.location, redirectCount + 1).then(resolve, reject);
        return;
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(FETCH_TIMEOUT_MS, () => {
      req.destroy(new Error(`Timeout fetching ${url} after ${FETCH_TIMEOUT_MS}ms`));
    });
  });
}

/**
 * Creates a Node.js-based image renderer that supports:
 * - Remote images (http/https)
 * - Local file system images
 * - SVG to PNG conversion
 * 
 * @param basePath - Base directory for resolving relative image paths
 * @returns A function that takes an image URL/path and returns a Buffer
 */
export function createNodeImageRenderer(basePath: string = process.cwd()): (imageUrl: string) => Promise<Buffer> {
  return async (imageUrl: string): Promise<Buffer> => {
    let imgBuffer: Buffer;
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Remote image - fetch via HTTP/HTTPS
      imgBuffer = await fetchImageBuffer(imageUrl);
    } else {
      // Local file path — resolve relative to the basePath
      const imgPath = path.resolve(basePath, imageUrl);
      imgBuffer = fs.readFileSync(imgPath);
    }

    // Convert SVG to PNG since pdfkit doesn't support SVG natively
    if (isSvg(imgBuffer)) {
      imgBuffer = convertSvgToPng(imgBuffer);
    }

    return imgBuffer;
  };
}

