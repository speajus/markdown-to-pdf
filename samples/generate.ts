import path from 'path';
import fs from 'fs';
import { readMdWritePdf } from '../src/cli.js';
import { themes } from '../src/themes/index.js';

async function main() {
  const outputDir = path.join(__dirname, '..', 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const mdFiles = fs.readdirSync(__dirname).filter((f) => f.endsWith('.md'));
  const all: Promise<void>[] = [];

  for (const [themeName, theme] of Object.entries(themes)) {
    const suffix = `-${themeName.toLowerCase()}`;
    for (const file of mdFiles) {
      const pdfFile = file.replace(/\.md$/i, `${suffix}.pdf`);
      all.push(readMdWritePdf(path.join(__dirname, file), path.join(outputDir, pdfFile), { theme }));
    }
  }

  await Promise.all(all);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

