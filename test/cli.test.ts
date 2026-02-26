import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CLI_PATH = path.resolve(__dirname, '..', 'src', 'cli.ts');
const TSX_PATH = path.resolve(__dirname, '..', 'node_modules', '.bin', 'tsx');
const SAMPLES_DIR = path.resolve(__dirname, '..', 'samples');

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-test-'));
}

describe('CLI', () => {
  it('converts a simple markdown file to PDF', () => {
    const tmp = makeTmpDir();
    try {
      const input = path.join(tmp, 'test.md');
      const output = path.join(tmp, 'test.pdf');
      fs.writeFileSync(input, '# CLI Test\n\nHello from the CLI.');

      execFileSync(TSX_PATH, [CLI_PATH, input, output], {
        stdio: 'pipe',
        timeout: 30_000,
      });

      assert.ok(fs.existsSync(output), 'PDF file should be created');
      const buf = fs.readFileSync(output);
      assert.strictEqual(buf.subarray(0, 5).toString(), '%PDF-', 'Output should be a valid PDF');
      assert.ok(buf.length > 500, 'PDF should have reasonable size');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('defaults output path to .pdf extension when omitted', () => {
    const tmp = makeTmpDir();
    try {
      const input = path.join(tmp, 'auto.md');
      fs.writeFileSync(input, '# Auto Output\n\nShould create auto.pdf');

      execFileSync(TSX_PATH, [CLI_PATH, input], {
        stdio: 'pipe',
        timeout: 30_000,
      });

      const expectedOutput = path.join(tmp, 'auto.pdf');
      assert.ok(fs.existsSync(expectedOutput), 'Should auto-generate .pdf alongside .md');
      const buf = fs.readFileSync(expectedOutput);
      assert.strictEqual(buf.subarray(0, 5).toString(), '%PDF-');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('converts a markdown file with images', () => {
    const tmp = makeTmpDir();
    try {
      // Copy a sample image so the renderer can find it
      const input = path.join(tmp, 'img-test.md');
      fs.copyFileSync(path.join(SAMPLES_DIR, 'logo.png'), path.join(tmp, 'logo.png'));
      fs.writeFileSync(input, '# Image Test\n\n![logo](./logo.png)\n');

      const output = path.join(tmp, 'img-test.pdf');
      execFileSync(TSX_PATH, [CLI_PATH, input, output], {
        stdio: 'pipe',
        timeout: 30_000,
      });

      assert.ok(fs.existsSync(output), 'PDF with image should be created');
      const buf = fs.readFileSync(output);
      assert.strictEqual(buf.subarray(0, 5).toString(), '%PDF-');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('exits with code 1 when no arguments are provided', () => {
    try {
      execFileSync(TSX_PATH, [CLI_PATH], { stdio: 'pipe', timeout: 10_000 });
      assert.fail('Should have exited with non-zero code');
    } catch (err: any) {
      assert.ok(err.status === 1, `Expected exit code 1, got ${err.status}`);
      const stderr = err.stderr?.toString() || '';
      assert.ok(stderr.includes('Usage'), 'Stderr should contain usage instructions');
    }
  });

  it('creates output directory if it does not exist', () => {
    const tmp = makeTmpDir();
    try {
      const input = path.join(tmp, 'test.md');
      const output = path.join(tmp, 'sub', 'dir', 'out.pdf');
      fs.writeFileSync(input, '# Nested Output\n');

      execFileSync(TSX_PATH, [CLI_PATH, input, output], {
        stdio: 'pipe',
        timeout: 30_000,
      });

      assert.ok(fs.existsSync(output), 'PDF should be created in nested directory');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

