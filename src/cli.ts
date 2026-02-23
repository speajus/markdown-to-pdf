#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { generatePdf, createNodeImageRenderer } from './index.js';
import type { PdfOptions } from './types.js';

export async function readMdWritePdf(inputPath: string, outputPath: string, extraOptions?: Partial<PdfOptions>): Promise<void> {

  if (inputPath === outputPath){
    throw new Error(`input path can not be the same as output path.`)
  }
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

  console.log(`PDF written to ${path.resolve(outputPath)}`);

}
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: markdown-to-pdf <input.md> [output.pdf]');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1] || inputPath.replace(/\.md$/i, '.pdf');

  readMdWritePdf(inputPath, outputPath);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
}

