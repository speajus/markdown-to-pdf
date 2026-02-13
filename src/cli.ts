#!/usr/bin/env ts-node

import path from 'path';
import { generatePdf } from './index.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: ts-node src/cli.ts <input.md> [output.pdf]');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1] ?? inputPath.replace(/\.md$/i, '.pdf');

  console.log(`Converting ${inputPath} → ${outputPath}`);
  await generatePdf(inputPath, outputPath);
  console.log(`Done. PDF written to ${path.resolve(outputPath)}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

