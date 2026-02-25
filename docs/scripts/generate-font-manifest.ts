#!/usr/bin/env npx tsx
/**
 * Generate a font manifest mapping Google Font families → TTF URLs.
 *
 * This script fetches the Google Fonts CSS API with a spoofed User-Agent
 * (IE 11) so Google returns complete TTF file URLs instead of woff2 subsets.
 * The resulting manifest is written to docs/public/font-manifest.json and
 * used at runtime to fetch fonts directly — no proxy needed.
 *
 * Usage:  npx tsx docs/scripts/generate-font-manifest.ts
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Same curated list as googleFonts.ts
const POPULAR_FONTS = [
  'Roboto','Open Sans','Lato','Montserrat','Oswald','Raleway','Poppins',
  'Nunito','Playfair Display','Merriweather','Source Sans 3','Ubuntu',
  'PT Sans','Noto Sans','Inter','Work Sans','Fira Sans','Quicksand',
  'Barlow','Cabin','Arimo','Tinos','Cousine','Roboto Slab','Roboto Mono',
  'Noto Serif','PT Serif','Libre Baskerville','Crimson Text','EB Garamond',
  'Lora','Bitter','Josefin Sans','Dancing Script','Pacifico','Caveat',
  'Satisfy','Lobster','Bebas Neue','Abril Fatface','Righteous',
  'Permanent Marker','Fira Code','Source Code Pro','JetBrains Mono',
  'IBM Plex Mono','Space Mono','Inconsolata','DM Sans','Rubik',
];

/** User-Agent that causes Google to return TTF URLs (complete, not subset). */
const TTF_USER_AGENT =
  'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)';

interface FontVariants {
  [key: string]: string;  // e.g. "normal-400": "https://fonts.gstatic.com/..."
}

function fetchCss(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': TTF_USER_AGENT } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseFontFaceCss(css: string): FontVariants {
  const variants: FontVariants = {};
  const blockRe = /@font-face\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(css)) !== null) {
    const block = match[1];
    const styleMatch = /font-style:\s*(\w+)/.exec(block);
    const weightMatch = /font-weight:\s*(\d+)/.exec(block);
    const urlMatch = /url\(([^)]+)\)/.exec(block);

    if (styleMatch && weightMatch && urlMatch) {
      const key = `${styleMatch[1]}-${weightMatch[1]}`;
      variants[key] = urlMatch[1];
    }
  }
  return variants;
}

async function main() {
  const manifest: Record<string, FontVariants> = {};
  let failed = 0;

  for (const family of POPULAR_FONTS) {
    const encoded = encodeURIComponent(family);
    const url =
      `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,400;0,700;1,400;1,700`;

    try {
      const css = await fetchCss(url);
      const variants = parseFontFaceCss(css);
      if (Object.keys(variants).length > 0) {
        manifest[family] = variants;
        console.log(`✓ ${family} (${Object.keys(variants).length} variants)`);
      } else {
        console.warn(`⚠ ${family}: no variants found`);
        failed++;
      }
    } catch (err: any) {
      console.warn(`✗ ${family}: ${err.message}`);
      failed++;
    }
  }

  const outPath = path.resolve(__dirname, '../public/font-manifest.json');
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nWrote ${Object.keys(manifest).length} fonts to ${outPath}`);
  if (failed) console.warn(`${failed} font(s) failed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

