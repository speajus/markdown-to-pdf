import { renderMarkdownToPdf } from '../src/index.js';
import { createNodeColorEmojiRenderer } from '../src/node-color-emoji.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const md = fs.readFileSync(path.join(__dirname, 'emoji.md'), 'utf-8');
  const colorEmoji = createNodeColorEmojiRenderer();
  const buf = await renderMarkdownToPdf(md, { colorEmoji });
  const out = path.join(__dirname, '..', 'output', 'color-emoji.pdf');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  console.log(`Written to ${out}`);
}

main().catch((err) => { console.error(err); process.exit(1); });

