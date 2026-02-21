/**
 * Color emoji rendering via SVG → PNG conversion.
 *
 * Converts emoji characters to color PNG images using Twemoji SVG assets,
 * with factory functions for Node.js and browser environments.
 */

/**
 * Twemoji SVG CDN base URL.
 * Uses the community-maintained fork (`jdecked/twemoji`) since the original
 * Twitter project was discontinued.
 */
const TWEMOJI_BASE =
  'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/';

/** Pixel size at which emoji PNGs are rasterised (scaled to font size by PDFKit). */
export const EMOJI_RENDER_SIZE = 128;

// ── Codepoint helpers ──────────────────────────────────────────────────────

/**
 * Convert an emoji string to its Twemoji SVG filename (without extension).
 *
 * Twemoji filenames use lower-case hex codepoints separated by hyphens,
 * with the variation selector U+FE0F omitted.
 *
 * @example
 *   emojiToTwemojiCodepoints('🎉')        // '1f389'
 *   emojiToTwemojiCodepoints('👨‍👩‍👧‍👦') // '1f468-200d-1f469-200d-1f467-200d-1f466'
 */
export function emojiToTwemojiCodepoints(emoji: string): string {
  const cps: string[] = [];
  for (const ch of emoji) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    // Twemoji filenames omit VS16 (U+FE0F)
    if (cp === 0xfe0f) continue;
    cps.push(cp.toString(16));
  }
  return cps.join('-');
}

/** Build the full Twemoji CDN URL for a single emoji. */
export function twemojiSvgUrl(emoji: string): string {
  return `${TWEMOJI_BASE}${emojiToTwemojiCodepoints(emoji)}.svg`;
}

// ── SVG sizing ─────────────────────────────────────────────────────────────

/** Ensure the SVG has explicit pixel dimensions for consistent rasterisation. */
export function sizeSvg(svg: string, size: number): string {
  // Replace existing width/height attributes …
  let out = svg;
  if (/width="[^"]*"/.test(out)) {
    out = out.replace(/width="[^"]*"/, `width="${size}"`);
    out = out.replace(/height="[^"]*"/, `height="${size}"`);
    return out;
  }
  // … or insert them.
  return out.replace('<svg', `<svg width="${size}" height="${size}"`);
}

// ── Public types ───────────────────────────────────────────────────────────

/** Converts a single emoji string to a PNG `Buffer`. */
export type ColorEmojiRenderer = (emoji: string) => Promise<Buffer>;

// ── Browser factory ─────────────────────────────────────────────────────────

/**
 * Creates a color-emoji renderer for **browser** environments.
 *
 * Fetches Twemoji SVGs via `fetch()`, rasterises them on a `<canvas>`, and
 * returns a PNG `Buffer`. Results are cached.
 */
export function createBrowserColorEmojiRenderer(): ColorEmojiRenderer {
  const cache = new Map<string, Buffer>();

  return async (emoji: string): Promise<Buffer> => {
    const hit = cache.get(emoji);
    if (hit) return hit;

    const url = twemojiSvgUrl(emoji);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    const svgText = await res.text();
    const sized = sizeSvg(svgText, EMOJI_RENDER_SIZE);

    // Render SVG → Canvas → PNG Blob → Buffer
    const png = await new Promise<Buffer>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = EMOJI_RENDER_SIZE;
        canvas.height = EMOJI_RENDER_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }
        ctx.drawImage(img, 0, 0, EMOJI_RENDER_SIZE, EMOJI_RENDER_SIZE);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('toBlob failed')); return; }
          blob.arrayBuffer().then(
            (ab) => resolve(Buffer.from(ab)),
            reject,
          );
        }, 'image/png');
      };
      img.onerror = () => reject(new Error(`Failed to load SVG as image: ${url}`));
      img.src = `data:image/svg+xml;base64,${btoa(sized)}`;
    });

    cache.set(emoji, png);
    return png;
  };
}

// ── Pre-render helper ───────────────────────────────────────────────────────

/**
 * Scans the full markdown text for all unique emoji and pre-renders them to
 * PNG `Buffer`s.  The returned `Map` allows `renderTextWithEmoji` to stay
 * synchronous during rendering.
 *
 * @param text     The raw markdown (or any text) to scan.
 * @param renderer A `ColorEmojiRenderer` (Node.js or browser factory).
 * @param emojiRe  The emoji-matching regex (from `emoji.ts`).
 * @returns A `Map` from individual emoji string → PNG Buffer.
 */
export async function preRenderEmoji(
  text: string,
  renderer: ColorEmojiRenderer,
  emojiRe: RegExp,
): Promise<Map<string, Buffer>> {
  const unique = new Set<string>();
  emojiRe.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = emojiRe.exec(text)) !== null) {
    unique.add(m[0]);
  }

  const map = new Map<string, Buffer>();
  // Render all unique emoji in parallel
  await Promise.all(
    [...unique].map(async (emoji) => {
      try {
        const png = await renderer(emoji);
        map.set(emoji, png);
      } catch {
        // If a specific emoji fails (missing from Twemoji), skip it —
        // it will fall back to the monochrome font or the body font.
      }
    }),
  );
  return map;
}

