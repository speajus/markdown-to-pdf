/**
 * Node.js color emoji renderer using `@resvg/resvg-js`.
 *
 * Separated from `color-emoji.ts` so that the browser entry point
 * (`src/browser.ts`) can import the shared helpers and browser factory
 * without pulling in the native `@resvg/resvg-js` addon.
 */

import type { ColorEmojiRenderer } from './color-emoji.js';
import { twemojiSvgUrl, sizeSvg, EMOJI_RENDER_SIZE } from './color-emoji.js';

/**
 * Creates a color-emoji renderer for **Node.js** using `@resvg/resvg-js`.
 *
 * Fetches Twemoji SVGs over HTTPS on first use and caches the resulting
 * PNGs for the lifetime of the returned function.
 */
export function createNodeColorEmojiRenderer(): ColorEmojiRenderer {
  const cache = new Map<string, Buffer>();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resvg } = require('@resvg/resvg-js') as typeof import('@resvg/resvg-js');

  function fetchSvg(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = url.startsWith('https') ? require('https') : require('http');
      mod.get(url, (res: import('http').IncomingMessage) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          fetchSvg(res.headers.location).then(resolve, reject);
          return;
        }
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        res.on('error', reject);
      }).on('error', reject);
    });
  }

  return async (emoji: string): Promise<Buffer> => {
    const hit = cache.get(emoji);
    if (hit) return hit;

    const svg = await fetchSvg(twemojiSvgUrl(emoji));
    const sized = sizeSvg(svg, EMOJI_RENDER_SIZE);
    const resvg = new Resvg(Buffer.from(sized), {
      fitTo: { mode: 'width' as const, value: EMOJI_RENDER_SIZE },
    });
    const png = Buffer.from(resvg.render().asPng());
    cache.set(emoji, png);
    return png;
  };
}

