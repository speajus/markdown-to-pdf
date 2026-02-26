/**
 * Patches fontkit's COLRGlyph class to guard against null baseGlyphRecord.
 *
 * Some emoji fonts have a COLR table but null/missing baseGlyphRecord,
 * causing `TypeError: Cannot read properties of null (reading 'length')`
 * when fontkit's COLRGlyph.layers getter is called.
 *
 * This script patches both the src and dist files of fontkit in node_modules.
 */
const fs = require('fs');
const path = require('path');

const nmDir = path.join(__dirname, '..', 'node_modules');

function patchFile(filePath, patches) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [search, replace] of patches) {
    if (content.includes(search) && !content.includes(replace)) {
      // Replace ALL occurrences (some bundled files may have multiple copies)
      content = content.split(search).join(replace);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Patched: ${filePath}`);
  }
  return changed;
}

// Patch 1: Guard against null baseGlyphRecord in COLRGlyph.layers getter
const layersGetterPatch = [
  'let high = colr.baseGlyphRecord.length - 1;',
  'if (!colr || !colr.baseGlyphRecord) { return null; } let high = colr.baseGlyphRecord.length - 1;',
];

// Patch 2: Don't create COLRGlyph for COLR v1 fonts (no v0 baseGlyphRecord)
// COLR v1 uses a different paint-based structure that fontkit doesn't support.
// Without this, COLR v1 glyphs (e.g. OpenMoji) get typed as COLR but can't
// render, and they also won't fall back to SBIX/CBDT/SVG alternatives.
const getGlyphPatch = [
  'this.directory.tables.COLR && this.directory.tables.CPAL)',
  'this.directory.tables.COLR && this.directory.tables.CPAL && this.COLR && this.COLR.baseGlyphRecord)',
];

// Patch 3: Fix _getContours crash for composite glyphs in COLR fonts
// When a composite TTF glyph references a component that is a COLRGlyph,
// calling _getContours() on it crashes because COLRGlyph doesn't have that method.
// Use _getBaseGlyph to get the TTF outline instead.
const getContoursPatch = [
  'this._font.getGlyph(component.glyphID)._getContours()',
  '((g) => { if (!g || typeof g._getContours !== "function") return []; return g._getContours(); })(this._font._getBaseGlyph(component.glyphID) || this._font.getGlyph(component.glyphID))',
];

// Patch 4: Fix _decode crash in TTF subsetter for COLR glyphs
// COLRGlyph doesn't have _decode() method. The subsetter needs to handle
// COLR glyphs gracefully by treating them as simple (non-compound) glyphs.
const decodePatch = [
  'let glyf = glyph._decode();',
  'let glyf = typeof glyph._decode === "function" ? glyph._decode() : null;',
];

const allPatches = [layersGetterPatch, getGlyphPatch, getContoursPatch, decodePatch];

let patchCount = 0;

// 1. Patch fontkit dist/src files directly
const fontkitPaths = [
  path.join(nmDir, 'fontkit'),
  path.join(nmDir, 'pdfkit', 'node_modules', 'fontkit'),
];

for (const fontkitDir of fontkitPaths) {
  if (!fs.existsSync(fontkitDir)) continue;
  for (const distFile of ['dist/browser-module.mjs', 'dist/main.cjs']) {
    if (patchFile(path.join(fontkitDir, distFile), allPatches)) patchCount++;
  }
  if (patchFile(path.join(fontkitDir, 'src', 'glyph', 'COLRGlyph.js'), [layersGetterPatch])) patchCount++;
}

// 2. Patch pdfkit standalone bundles (these embed fontkit inline)
const pdfkitBundles = [
  path.join(nmDir, 'pdfkit', 'js', 'pdfkit.standalone.js'),
  path.join(nmDir, 'pdfkit', 'js', 'pdfkit.js'),
];

for (const bundle of pdfkitBundles) {
  if (patchFile(bundle, allPatches)) patchCount++;
}

// 3. Clear Vite dep cache so it re-bundles with patched files
const viteCacheDir = path.join(nmDir, '.vite');
if (fs.existsSync(viteCacheDir)) {
  fs.rmSync(viteCacheDir, { recursive: true, force: true });
  console.log('  Cleared Vite dep cache (.vite)');
}

if (patchCount > 0) {
  console.log(`fontkit COLR patch: ${patchCount} file(s) patched.`);
} else {
  console.log('fontkit COLR patch: already applied or fontkit not found.');
}

