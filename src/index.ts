export type {
  TextStyle,
  PageLayout,
  CodeStyle,
  CodeBlockStyle,
  BlockquoteStyle,
  TableStyles,
  ThemeConfig,
  PdfOptions,
} from './types.js';

export { renderMarkdownToPdf } from './renderer.js';
export { defaultTheme, defaultPageLayout } from './styles.js';

import fs from 'fs';
import path from 'path';
import type { PdfOptions } from './types.js';
import { renderMarkdownToPdf } from './renderer.js';

export async function generatePdf(
  inputPath: string,
  outputPath: string,
  options?: PdfOptions,
): Promise<void> {
  const resolvedInput = path.resolve(inputPath);
  const markdown = fs.readFileSync(resolvedInput, 'utf-8');
  const basePath = path.dirname(resolvedInput);
  const mergedOptions: PdfOptions = { ...options, basePath: options?.basePath ?? basePath };
  const buffer = await renderMarkdownToPdf(markdown, mergedOptions);
  const dir = path.dirname(path.resolve(outputPath));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.resolve(outputPath), buffer);
}

