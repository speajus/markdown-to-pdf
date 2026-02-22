import path from 'path';
import fs from 'fs';
import { readMdWritePdf } from '../src/cli.js';
import { themes } from '../src/themes/index.js';
import { pdf2png } from './pdf2png.js';

async function convertToPng(pdfPath: string) {
  const baseName = path.basename(pdfPath, '.pdf');
  const pngDir = path.dirname(pdfPath);

  const pdfData = fs.readFileSync(pdfPath);
  const pages = await pdf2png(pdfData);

  for (let i = 0; i < pages.length; i++) {
    const pngPath = path.join(pngDir, `${baseName}_page_${i + 1}.png`);
    fs.writeFileSync(pngPath, pages[i]);
    console.log(`  → ${pngPath}`);
  }
}

async function main() {
  const outputDir = path.join(__dirname, '..', 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const mdFiles = fs.readdirSync(__dirname).filter((f) => f.endsWith('.md'));

  // Step 1: Generate all PDFs in parallel
  const pdfPaths: string[] = [];
  const all: Promise<void>[] = [];

  for (const [themeName, theme] of Object.entries(themes)) {
    const suffix = `-${themeName.toLowerCase()}`;
    for (const file of mdFiles) {
      const pdfFile = file.replace(/\.md$/i, `${suffix}.pdf`);
      const pdfPath = path.join(outputDir, pdfFile);
      pdfPaths.push(pdfPath);
      all.push(readMdWritePdf(path.join(__dirname, file), pdfPath, { theme }));
    }
  }

  await Promise.all(all);

  // Step 2: Convert PDFs to PNGs sequentially (avoids pdfjs-dist worker conflicts)
  for (const pdfPath of pdfPaths) {
    await convertToPng(pdfPath);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

