/**
 * pdfkit-highlight.ts
 * Syntax highlighting for PDFKit using Prism.js
 *
 * Usage:
 *   import { loadHighlightLanguages, renderCode } from './highlight.prism.js';
 *   loadHighlightLanguages(['javascript', 'python']); // or omit to load all
 *   renderCode(doc, sourceCode, { language: 'javascript', x: 50, y: 100 });
 */

import Prism from 'prismjs';
// Static imports for commonly-used languages — these are self-registering
// side-effect imports that work in both Node.js and browser environments.
// Base Prism already includes: markup, css, clike, javascript.
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-tsx.js';
import 'prismjs/components/prism-yaml.js';
import 'prismjs/components/prism-sql.js';
import 'prismjs/components/prism-go.js';
import 'prismjs/components/prism-rust.js';
import 'prismjs/components/prism-java.js';
import 'prismjs/components/prism-c.js';
import 'prismjs/components/prism-cpp.js';
import 'prismjs/components/prism-diff.js';
import 'prismjs/components/prism-markdown.js';
import 'prismjs/components/prism-docker.js';

import type PDFDocument from 'pdfkit';
import type { SyntaxHighlightTheme } from './types.js';
import { defaultSyntaxHighlightTheme } from './styles.js';

// ---------------------------------------------------------------------------
// Language loading
// ---------------------------------------------------------------------------

let languagesLoaded = false;

/**
 * Load Prism.js language grammars for syntax highlighting.
 *
 * @param languages  Optional array of language identifiers to load
 *                   (e.g. `['javascript', 'python', 'bash']`).
 *                   When omitted or `undefined`, **all** available Prism.js
 *                   languages (~300) are loaded.
 *
 * In Node.js, this dynamically loads grammars via `prismjs/components/`.
 * In browser environments (Vite, webpack, etc.) the dynamic loader is not
 * available; a set of common languages is pre-loaded via static imports
 * and unknown languages degrade to unstyled plain text.
 *
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function loadHighlightLanguages(languages?: string[]): void {
  if (languagesLoaded) return;

  try {
    // prismjs/components/index.js uses require.resolve() internally,
    // which is only available in Node.js.  In browser bundlers (Vite,
    // webpack) it is transformed to __require.resolve which does not exist.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loadLanguages = require('prismjs/components/index.js') as {
      (languages?: string | string[]): void;
      silent: boolean;
    };
    loadLanguages.silent = true;
    if (languages && languages.length > 0) {
      loadLanguages(languages);
    } else {
      loadLanguages();           // loads every language
    }
  } catch {
    // Browser / ESM environment — require.resolve not available.
    // The static imports above cover the most common languages;
    // any unsupported language falls back to unstyled plain text
    // in tokenizeToLines().
  }

  languagesLoaded = true;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlatToken {
  type: string | null;
  content: string;
}

export interface RenderCodeOptions {
  language?: string;
  x: number;
  y: number;
  width?: number;
  font?: string;
  fontSize?: number;
  lineHeight?: number;
  padding?: number;
  lineNumbers?: boolean;
  drawBackground?: boolean;
  theme?: Partial<SyntaxHighlightTheme>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function colorFor(tokenType: string | null, theme: SyntaxHighlightTheme): string {
  if (!tokenType) return theme.tokens.default;
  const types = tokenType.split(' ');
  for (const t of types) {
    if (theme.tokens[t]) return theme.tokens[t];
  }
  return theme.tokens.default;
}

/**
 * Flatten Prism's nested token tree into a simple
 * [{ type: string|null, content: string }] array.
 */
function flattenTokens(tokens: Array<string | Prism.Token>): FlatToken[] {
  const result: FlatToken[] = [];
  for (const token of tokens) {
    if (typeof token === 'string') {
      result.push({ type: null, content: token });
    } else if (token.type) {
      const inner = flattenTokens(
        Array.isArray(token.content)
          ? token.content
          : [token.content as string | Prism.Token],
      );
      for (const child of inner) {
        result.push({ type: child.type || token.type, content: child.content });
      }
    }
  }
  return result;
}

/**
 * Split flat tokens at newline boundaries so we get per-line arrays.
 * Each line is an array of { type, content } segments (no newlines).
 */
export function tokenizeToLines(code: string, language: string): FlatToken[][] {
  const grammar = Prism.languages[language];
  if (!grammar) {
    // Grammar not loaded / unknown language — fall back to plain (unstyled) text
    return code.split('\n').map(line =>
      line.length > 0 ? [{ type: null, content: line }] : [],
    );
  }

  const tokens = Prism.tokenize(code, grammar);
  const flat = flattenTokens(tokens);

  const lines: FlatToken[][] = [[]];
  for (const seg of flat) {
    const parts = seg.content.split('\n');
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length > 0) {
        lines[lines.length - 1].push({ type: seg.type, content: parts[i] });
      }
      if (i < parts.length - 1) {
        lines.push([]);
      }
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render syntax-highlighted code into a PDFKit document.
 *
 * @param doc       PDFKit document instance
 * @param code      Source code string
 * @param opts      Rendering options
 * @returns The Y position immediately after the rendered block
 */
export function renderCode(
  doc: InstanceType<typeof PDFDocument>,
  code: string,
  opts: RenderCodeOptions,
): number {
  const {
    language = 'javascript',
    x,
    y,
    font = 'Courier',
    fontSize = 10,
    lineHeight = 1.5,
    padding = 12,
    lineNumbers = true,
    drawBackground = true,
  } = opts;

  const theme: SyntaxHighlightTheme = opts.theme
    ? {
        ...defaultSyntaxHighlightTheme,
        tokens: { ...defaultSyntaxHighlightTheme.tokens, ...(opts.theme.tokens || {}) },
        ...opts.theme,
      } as SyntaxHighlightTheme
    : defaultSyntaxHighlightTheme;

  const blockWidth =
    opts.width || doc.page.width - x - (doc.page.margins as any).right;
  const lineH = fontSize * lineHeight;

  // Normalize tabs → 2 spaces
  const normalized = code.replace(/\t/g, '  ');
  const lines = tokenizeToLines(normalized, language);

  // Gutter width (only if line numbers enabled)
  const gutterWidth = lineNumbers
    ? doc.widthOfString(String(lines.length), { font, size: fontSize } as any) + 16
    : 0;
  const codeX = x + padding + gutterWidth;
  const blockHeight = lines.length * lineH + padding * 2;

  // --- Background ---
  if (drawBackground) {
    doc
      .save()
      .rect(x, y, blockWidth, blockHeight)
      .fill(theme.background);
    doc.restore();
  }

  // --- Set font once ---
  if (font !== 'Courier' && font !== 'Courier-Bold') {
    // Assume it's a path to an embedded font registered by the caller,
    // or register it here if it looks like a file path
    doc.font(font).fontSize(fontSize);
  } else {
    doc.font('Courier').fontSize(fontSize);
  }

  let curY = y + padding;

  for (let i = 0; i < lines.length; i++) {
    const lineTokens = lines[i];

    // Check for page overflow
    if (curY + lineH > doc.page.height - (doc.page.margins as any).bottom) {
      doc.addPage();
      curY = (doc.page.margins as any).top;
      // Optionally redraw background on new page — left to caller
    }

    // --- Line number ---
    if (lineNumbers) {
      doc.fillColor(theme.gutter).text(String(i + 1), x + padding, curY, {
        lineBreak: false,
        width: gutterWidth - 8,
        align: 'right',
      });
    }

    // --- Code tokens ---
    let curX = codeX;
    for (const seg of lineTokens) {
      if (!seg.content) continue;
      const color = colorFor(seg.type, theme);
      const segWidth = doc.widthOfString(seg.content);

      doc.fillColor(color).text(seg.content, curX, curY, {
        lineBreak: false,
        continued: false,
      });

      curX += segWidth;
    }

    curY += lineH;
  }

  // Reset fill color to black for subsequent content
  doc.fillColor('black');

  return curY + padding; // return Y after block
}