/**
 * Google Fonts integration service.
 *
 * Provides font search (from a curated list of popular families) and
 * TTF font-buffer fetching via the Google Fonts CSS API v2.
 *
 * The CSS request is routed through a Vite dev-server proxy
 * (`/__font_css_proxy/`) so we can spoof the User-Agent header and
 * receive TTF URLs instead of woff2.  The actual font-file downloads
 * go directly to fonts.gstatic.com (CORS-enabled).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FontCategory = 'serif' | 'sans-serif' | 'monospace' | 'display' | 'handwriting';

export interface GoogleFontFamily {
  family: string;
  category: FontCategory;
}

export interface GoogleFontBuffers {
  regular: Buffer;
  bold: Buffer | null;
  italic: Buffer | null;
  boldItalic: Buffer | null;
}

// ---------------------------------------------------------------------------
// Curated list of ~50 popular Google Fonts
// ---------------------------------------------------------------------------

const POPULAR_FONTS: GoogleFontFamily[] = [
  { family: 'Roboto', category: 'sans-serif' },
  { family: 'Open Sans', category: 'sans-serif' },
  { family: 'Lato', category: 'sans-serif' },
  { family: 'Montserrat', category: 'sans-serif' },
  { family: 'Oswald', category: 'sans-serif' },
  { family: 'Raleway', category: 'sans-serif' },
  { family: 'Poppins', category: 'sans-serif' },
  { family: 'Nunito', category: 'sans-serif' },
  { family: 'Playfair Display', category: 'serif' },
  { family: 'Merriweather', category: 'serif' },
  { family: 'Source Sans 3', category: 'sans-serif' },
  { family: 'Ubuntu', category: 'sans-serif' },
  { family: 'PT Sans', category: 'sans-serif' },
  { family: 'Noto Sans', category: 'sans-serif' },
  { family: 'Inter', category: 'sans-serif' },
  { family: 'Work Sans', category: 'sans-serif' },
  { family: 'Fira Sans', category: 'sans-serif' },
  { family: 'Quicksand', category: 'sans-serif' },
  { family: 'Barlow', category: 'sans-serif' },
  { family: 'Cabin', category: 'sans-serif' },
  { family: 'Arimo', category: 'sans-serif' },
  { family: 'Tinos', category: 'serif' },
  { family: 'Cousine', category: 'monospace' },
  { family: 'Roboto Slab', category: 'serif' },
  { family: 'Roboto Mono', category: 'monospace' },
  { family: 'Noto Serif', category: 'serif' },
  { family: 'PT Serif', category: 'serif' },
  { family: 'Libre Baskerville', category: 'serif' },
  { family: 'Crimson Text', category: 'serif' },
  { family: 'EB Garamond', category: 'serif' },
  { family: 'Lora', category: 'serif' },
  { family: 'Bitter', category: 'serif' },
  { family: 'Josefin Sans', category: 'sans-serif' },
  { family: 'Dancing Script', category: 'handwriting' },
  { family: 'Pacifico', category: 'handwriting' },
  { family: 'Caveat', category: 'handwriting' },
  { family: 'Satisfy', category: 'handwriting' },
  { family: 'Lobster', category: 'display' },
  { family: 'Bebas Neue', category: 'display' },
  { family: 'Abril Fatface', category: 'display' },
  { family: 'Righteous', category: 'display' },
  { family: 'Permanent Marker', category: 'display' },
  { family: 'Fira Code', category: 'monospace' },
  { family: 'Source Code Pro', category: 'monospace' },
  { family: 'JetBrains Mono', category: 'monospace' },
  { family: 'IBM Plex Mono', category: 'monospace' },
  { family: 'Space Mono', category: 'monospace' },
  { family: 'Inconsolata', category: 'monospace' },
  { family: 'DM Sans', category: 'sans-serif' },
  { family: 'Rubik', category: 'sans-serif' },
];



// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Search the curated font list by query string.  The query is matched
 * case-insensitively against the family name.  An empty query returns
 * the full list.  Users can also type any Google Font family name that
 * isn't in the curated list — the fetcher will still attempt to
 * download it.
 */
export function searchGoogleFonts(query: string): GoogleFontFamily[] {
  const q = query.trim().toLowerCase();
  if (!q) return POPULAR_FONTS;
  return POPULAR_FONTS.filter((f) => f.family.toLowerCase().includes(q));
}

// ---------------------------------------------------------------------------
// Font CSS proxy path (must match the Vite plugin route)
// ---------------------------------------------------------------------------

const FONT_CSS_PROXY_PREFIX = '/__font_css_proxy/';

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const fontCache = new Map<string, GoogleFontBuffers>();

// ---------------------------------------------------------------------------
// CSS parsing helpers
// ---------------------------------------------------------------------------

interface FontFaceEntry {
  style: string;   // "normal" | "italic"
  weight: string;  // "400" | "700"
  url: string;
}

/**
 * Parse a Google Fonts CSS response and extract @font-face entries.
 *
 * Each block looks roughly like:
 * ```
 * @font-face {
 *   font-family: 'Roboto';
 *   font-style: normal;
 *   font-weight: 400;
 *   src: url(https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf) format('truetype');
 * }
 * ```
 */
function parseFontFaceCss(css: string): FontFaceEntry[] {
  const entries: FontFaceEntry[] = [];
  const blockRe = /@font-face\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(css)) !== null) {
    const block = match[1];

    const styleMatch = /font-style:\s*(\w+)/.exec(block);
    const weightMatch = /font-weight:\s*(\d+)/.exec(block);
    const urlMatch = /url\(([^)]+)\)/.exec(block);

    if (styleMatch && weightMatch && urlMatch) {
      entries.push({
        style: styleMatch[1],
        weight: weightMatch[1],
        url: urlMatch[1],
      });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchFontBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font file fetch failed: ${res.status} ${url}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

/**
 * Fetch the Google Fonts CSS for a given family through the Vite proxy.
 * The proxy spoofs the User-Agent so Google returns TTF URLs.
 */
async function fetchFontCss(family: string): Promise<string> {
  const encodedFamily = encodeURIComponent(family);
  // Request regular (400), bold (700), italic (400i), bold-italic (700i)
  const cssUrl =
    `https://fonts.googleapis.com/css2?family=${encodedFamily}:ital,wght@0,400;0,700;1,400;1,700`;
  const proxyUrl = `${FONT_CSS_PROXY_PREFIX}${encodeURIComponent(cssUrl)}`;

  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Font CSS fetch failed: ${res.status} for ${family}`);
  return res.text();
}

// ---------------------------------------------------------------------------
// Main public API
// ---------------------------------------------------------------------------

/**
 * Fetch TTF buffers for all four variants of a Google Font family.
 *
 * Results are cached in memory so repeated calls for the same family
 * return instantly.  Missing variants (e.g. a display font that has no
 * italic) are set to `null`; the `regular` variant always falls back
 * to whatever is available.
 */
export async function fetchGoogleFontBuffers(family: string): Promise<GoogleFontBuffers> {
  const cached = fontCache.get(family);
  if (cached) return cached;

  const css = await fetchFontCss(family);
  const entries = parseFontFaceCss(css);

  // Map entries to variants
  const findEntry = (style: string, weight: string): FontFaceEntry | undefined =>
    entries.find((e) => e.style === style && e.weight === weight);

  const regularEntry = findEntry('normal', '400');
  const boldEntry = findEntry('normal', '700');
  const italicEntry = findEntry('italic', '400');
  const boldItalicEntry = findEntry('italic', '700');

  // We must have at least one variant
  const fallbackEntry = regularEntry ?? entries[0];
  if (!fallbackEntry) {
    throw new Error(`No font variants found for "${family}"`);
  }

  // Fetch all available variants in parallel
  const [regular, bold, italic, boldItalic] = await Promise.all([
    fetchFontBuffer(fallbackEntry.url),
    boldEntry ? fetchFontBuffer(boldEntry.url) : Promise.resolve(null),
    italicEntry ? fetchFontBuffer(italicEntry.url) : Promise.resolve(null),
    boldItalicEntry ? fetchFontBuffer(boldItalicEntry.url) : Promise.resolve(null),
  ]);

  const result: GoogleFontBuffers = { regular, bold, italic, boldItalic };
  fontCache.set(family, result);
  return result;
}