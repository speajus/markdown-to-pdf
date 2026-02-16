import { generatePdf } from '../src/index.js';
import path from 'path';
import fs from 'fs';
import { readMdWritePdf } from '../src/cli.js';
async function main() {
  const outputDir = path.join(__dirname, '..', 'output');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const all: Promise<void>[] = [];
  for (const file of fs.readdirSync(__dirname)) {
    const pdfFile = file.replace(/\.md$/i, '.pdf');
    if (pdfFile === file) continue;
    all.push(readMdWritePdf(path.join(__dirname, file), path.join(outputDir, pdfFile)));
  }
  await Promise.all(all);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

