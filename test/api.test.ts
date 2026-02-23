import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { generatePdf, createNodeImageRenderer } from '../src/index.js';

const SAMPLES_DIR = path.resolve(__dirname, '..', 'samples');

describe('generatePdf', () => {
  it('produces a valid PDF buffer from simple markdown', async () => {
    const buf = await generatePdf('# Hello\n\nWorld');
    assert.ok(buf.length > 0, 'PDF buffer should not be empty');
    assert.strictEqual(buf.subarray(0, 5).toString(), '%PDF-', 'Buffer should start with PDF magic bytes');
  });

  it('handles markdown with inline formatting', async () => {
    const md = '# Title\n\nSome **bold** and *italic* text with `inline code`.';
    const buf = await generatePdf(md);
    assert.strictEqual(buf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(buf.length > 500, 'PDF with formatting should have reasonable size');
  });

  it('handles markdown with a code block', async () => {
    const md = '# Code\n\n```javascript\nconst x = 1;\n```\n';
    const buf = await generatePdf(md);
    assert.strictEqual(buf.subarray(0, 5).toString(), '%PDF-');
  });

  it('handles markdown with a table', async () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |\n';
    const buf = await generatePdf(md);
    assert.strictEqual(buf.subarray(0, 5).toString(), '%PDF-');
  });

  it('handles empty markdown gracefully', async () => {
    const buf = await generatePdf('');
    assert.ok(buf.length > 0, 'Even empty markdown should produce a PDF');
    assert.strictEqual(buf.subarray(0, 5).toString(), '%PDF-');
  });
});

describe('createNodeImageRenderer', () => {
  it('renders a local PNG file', async () => {
    const render = createNodeImageRenderer(SAMPLES_DIR);
    const buf = await render('logo.png');
    // PNG magic bytes: 89 50 4E 47
    assert.strictEqual(buf.subarray(0, 4).toString('hex'), '89504e47', 'Should return PNG data');
  });

  it('renders a local SVG file to PNG via @resvg/resvg-js', async () => {
    const render = createNodeImageRenderer(SAMPLES_DIR);
    const buf = await render('logo.svg');
    // resvg-js converts SVG → PNG, so output should have PNG magic bytes
    assert.strictEqual(buf.subarray(0, 4).toString('hex'), '89504e47', 'SVG should be rasterized to PNG');
    assert.ok(buf.length > 100, 'Rasterized PNG should have reasonable size');
  });

  it('rejects on missing file', async () => {
    const render = createNodeImageRenderer(SAMPLES_DIR);
    await assert.rejects(() => render('nonexistent.png'), 'Should reject for missing files');
  });
});

describe('generatePdf with images', () => {
  it('produces a PDF that includes a local image', async () => {
    const md = '# With Image\n\n![logo](./logo.png)\n';
    const renderImage = createNodeImageRenderer(SAMPLES_DIR);
    const buf = await generatePdf(md, { basePath: SAMPLES_DIR, renderImage });
    assert.strictEqual(buf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(buf.length > 2000, 'PDF with image should be larger than text-only');
  });

  it('produces a PDF that includes an SVG image', async () => {
    const md = '# SVG Image\n\n![logo](./logo.svg)\n';
    const renderImage = createNodeImageRenderer(SAMPLES_DIR);
    const buf = await generatePdf(md, { basePath: SAMPLES_DIR, renderImage });
    assert.strictEqual(buf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(buf.length > 2000, 'PDF with SVG image should be larger than text-only');
  });
});

