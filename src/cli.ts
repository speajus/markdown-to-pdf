#!/usr/bin/env ts-node

import path from 'path';
import fs from 'fs';
import { generatePdf, createNodeImageRenderer } from './index.js';
import type { PdfOptions } from './types.js';

export async function readMdWritePdf(inputPath: string, outputPath: string, extraOptions?: Partial<PdfOptions>): Promise<void> {

  console.log(`Converting ${inputPath} → ${outputPath}`);

  const resolvedInput = path.resolve(inputPath);
  const markdown = fs.readFileSync(resolvedInput, "utf-8");
  const basePath = path.dirname(resolvedInput);

  // Use Node.js image renderer with the basePath
  const renderImage = createNodeImageRenderer(basePath);

  const buffer = await generatePdf(markdown, { basePath, renderImage, ...extraOptions });

  const dir = path.dirname(path.resolve(outputPath));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.resolve(outputPath), buffer);

  console.log(`Done. PDF written to ${path.resolve(outputPath)}`);

}
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: ts-node src/cli.ts <input.md> [output.pdf]');
    process.exit(1);
  }

  readMdWritePdf(args[0], args[1]);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
}

