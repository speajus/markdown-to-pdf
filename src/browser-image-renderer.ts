import { DEFAULTS } from './defaults.js';
/**
 * Browser-based image renderer using Canvas API and Fetch API.
 * This implementation works in browser environments where Node.js APIs are not available.
 */

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Path prefix for the image proxy endpoint.
 * When running behind a dev server (e.g. Vite) that exposes this endpoint,
 * remote image URLs are rewritten to go through the proxy so that the
 * browser fetch is same-origin and avoids CORS restrictions.
 */
const IMAGE_PROXY_PREFIX = '/__image_proxy/';

/**
 * Fetches an image using the Fetch API and returns the raw bytes as a Buffer.
 * Works for http/https URLs, blob URLs, and data URLs in modern browsers.
 *
 * @param url - Image URL to fetch
 * @returns A Buffer containing the image data
 */
async function fetchImageInBrowser(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Timeout fetching ${url} after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Converts an SVG buffer to PNG by rendering it onto a canvas.
 * This is necessary because pdfkit doesn't support SVG natively.
 *
 * @param svgBuffer - Buffer containing SVG data
 * @returns A Buffer containing the PNG image data
 */
function renderSvgToPng(svgBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([new Uint8Array(svgBuffer)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error(`Timeout rendering SVG after ${FETCH_TIMEOUT_MS}ms`));
    }, FETCH_TIMEOUT_MS);

    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 150;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          URL.revokeObjectURL(url);
          return;
        }

        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to convert SVG canvas to blob'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(Buffer.from(reader.result as ArrayBuffer));
          reader.onerror = () => reject(new Error('Failed to read SVG blob'));
          reader.readAsArrayBuffer(blob);
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG for rendering'));
    };

    img.src = url;
  });
}

function isSvg(buf: Buffer): boolean {
  const head = buf.subarray(0, 256).toString('utf-8').trimStart();
  return head.startsWith('<svg') || head.startsWith('<?xml');
}

/**
 * Loads a cross-origin image via an <img> element with crossOrigin="anonymous",
 * draws it to a canvas, and exports as PNG. This works when the server supports
 * CORS for <img> requests (many CDNs do) even if fetch() was blocked.
 *
 * @param imageUrl - URL of the image
 * @returns A Buffer containing PNG image data
 */
function loadImageViaCanvas(imageUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout loading image: ${imageUrl} after ${FETCH_TIMEOUT_MS}ms`));
    }, FETCH_TIMEOUT_MS);

    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to convert canvas to blob'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(Buffer.from(reader.result as ArrayBuffer));
          reader.onerror = () => reject(new Error('Failed to read blob'));
          reader.readAsArrayBuffer(blob);
        }, 'image/png');
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(
        new Error(
          `Failed to load image: ${imageUrl}. The server may not support CORS. ` +
          `To fix this, either serve the image from the same origin, use a CORS proxy, ` +
          `or convert it to a data URL before passing it to the renderer.`
        ),
      );
    };

    img.src = imageUrl;
  });
}

/**
 * Loads an image in the browser and returns it as a Buffer.
 *
 * Strategy:
 * 1. Try fetch() — works for same-origin, data/blob URLs, and CORS-enabled servers.
 * 2. If fetch fails (CORS), fall back to <img crossOrigin="anonymous"> + canvas,
 *    which works for servers that support CORS on image requests.
 * 3. If both fail, throw a descriptive error with remediation steps.
 *
 * SVG images are rasterized to PNG via a same-origin blob URL on a canvas.
 *
 * @param basePath - Base path (unused in browser, kept for API compatibility)
 * @param imageUrl - URL of the image (http/https/data/blob URL)
 * @returns A Buffer containing the image data
 */
async function loadImageInBrowser(_basePath: string, imageUrl: string): Promise<Buffer> {
  // For remote URLs, try the same-origin image proxy first (avoids CORS entirely).
  const isRemote = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
  const proxyUrl = isRemote
    ? `${IMAGE_PROXY_PREFIX}${encodeURIComponent(imageUrl)}`
    : imageUrl;

  try {
    const imgBuffer = await fetchImageInBrowser(proxyUrl);

    // SVGs must be rasterized to PNG for pdfkit
    if (isSvg(imgBuffer)) {
      return renderSvgToPng(imgBuffer);
    }

    return imgBuffer;
  } catch {
    // Proxy or fetch failed — fall back to <img crossOrigin="anonymous"> + canvas.
    // This still works when the remote server sends CORS headers for <img> requests.
    return loadImageViaCanvas(imageUrl);
  }
}

/**
 * Creates a browser-based image renderer that supports:
 * - Remote images (http/https) via fetch with <img> + canvas fallback
 * - Data URLs
 * - Blob URLs
 *
 * SVG images are automatically converted to PNG via Canvas rendering using a
 * same-origin blob URL so the canvas is never tainted.
 *
 * @returns A function that takes an image URL and returns a Buffer
 */
export const createBrowserImageRenderer = (basePath: string) => loadImageInBrowser.bind(null, basePath);

DEFAULTS.renderImage = createBrowserImageRenderer;