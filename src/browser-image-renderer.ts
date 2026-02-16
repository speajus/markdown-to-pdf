/**
 * Browser-based image renderer using Canvas API and Fetch API.
 * This implementation works in browser environments where Node.js APIs are not available.
 */

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Loads an image in the browser and converts it to a PNG Buffer.
 * Supports both remote URLs (via fetch) and data URLs.
 * 
 * @param imageUrl - URL of the image (http/https/data URL)
 * @returns A Buffer containing the PNG image data
 */
async function loadImageInBrowser(imageUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Set crossOrigin for remote images
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }

    // Set timeout
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout loading image: ${imageUrl} after ${FETCH_TIMEOUT_MS}ms`));
    }, FETCH_TIMEOUT_MS);

    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        // Create a canvas with the image dimensions
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw the image onto the canvas
        ctx.drawImage(img, 0, 0);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to convert canvas to blob'));
            return;
          }

          // Convert blob to Buffer
          const reader = new FileReader();
          reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            resolve(Buffer.from(arrayBuffer));
          };
          reader.onerror = () => reject(new Error('Failed to read blob'));
          reader.readAsArrayBuffer(blob);
        }, 'image/png');
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };

    img.src = imageUrl;
  });
}

/**
 * Fetches an image from a remote URL using the Fetch API.
 * 
 * @param url - Remote image URL
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
 * Creates a browser-based image renderer that supports:
 * - Remote images (http/https) via fetch or Image element
 * - Data URLs
 * - Blob URLs
 * 
 * Note: SVG images are automatically converted to PNG via Canvas rendering.
 * 
 * @param useCanvas - If true, uses Canvas API to render images (converts to PNG).
 *                    If false, uses fetch to get raw image data.
 * @returns A function that takes an image URL and returns a Buffer
 */
export function createBrowserImageRenderer(useCanvas: boolean = true): (imageUrl: string) => Promise<Buffer> {
  return async (imageUrl: string): Promise<Buffer> => {
    if (useCanvas) {
      // Use Canvas API - this handles SVG conversion automatically
      return loadImageInBrowser(imageUrl);
    } else {
      // Use fetch for raw image data
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return fetchImageInBrowser(imageUrl);
      } else if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
        // For data URLs and blob URLs, we need to use the Image element approach
        return loadImageInBrowser(imageUrl);
      } else {
        throw new Error(`Unsupported image URL in browser: ${imageUrl}`);
      }
    }
  };
}

