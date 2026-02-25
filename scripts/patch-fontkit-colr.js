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

const fontkitPaths = [
  path.join(__dirname, '..', 'node_modules', 'fontkit'),
  path.join(__dirname, '..', 'node_modules', 'pdfkit', 'node_modules', 'fontkit'),
];

function patchFile(filePath, patches) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [search, replace] of patches) {
    if (content.includes(search) && !content.includes(replace)) {
      content = content.replace(search, replace);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Patched: ${filePath}`);
  }
  return changed;
}

const layersGetterPatch = [
  'let high = colr.baseGlyphRecord.length - 1;',
  'if (!colr || !colr.baseGlyphRecord) { return null; } let high = colr.baseGlyphRecord.length - 1;',
];

let patchCount = 0;

for (const fontkitDir of fontkitPaths) {
  if (!fs.existsSync(fontkitDir)) continue;

  // Patch dist files (used by bundlers like Vite)
  for (const distFile of ['dist/browser-module.mjs', 'dist/main.cjs']) {
    if (patchFile(path.join(fontkitDir, distFile), [layersGetterPatch])) {
      patchCount++;
    }
  }

  // Patch source file
  if (patchFile(path.join(fontkitDir, 'src', 'glyph', 'COLRGlyph.js'), [layersGetterPatch])) {
    patchCount++;
  }
}

if (patchCount > 0) {
  console.log(`fontkit COLR patch: ${patchCount} file(s) patched.`);
} else {
  console.log('fontkit COLR patch: already applied or fontkit not found.');
}

