/**
 * pdfkit-highlight.ts
 * Syntax highlighting for PDFKit using Prism.js
 * Supports: javascript, typescript, java
 *
 * Usage:
 *   import { renderCode } from './highlight.prism.js';
 *   renderCode(doc, sourceCode, { language: 'javascript', x: 50, y: 100 });
 */

import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-java';
import type PDFDocument from 'pdfkit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokenColors {
  [key: string]: string;
}

interface HighlightTheme {
  background: string;
  gutter: string;
  defaultText: string;
  lineHighlight: string;
  tokens: TokenColors;
}

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
  theme?: Partial<HighlightTheme>;
}

// ---------------------------------------------------------------------------
// Theme — VS Code Dark+ inspired. Swap hex values to retheme.
// ---------------------------------------------------------------------------
export const THEME: HighlightTheme = {
  background: '#1e1e1e',
  gutter: '#858585',
  defaultText: '#d4d4d4',
  lineHighlight: '#2a2a2a',

  tokens: {
    comment: '#6a9955',
    prolog: '#6a9955',
    doctype: '#6a9955',
    cdata: '#6a9955',

    keyword: '#569cd6',
    'control-flow': '#c586c0',
    builtin: '#4ec9b0',

    'class-name': '#4ec9b0',
    function: '#dcdcaa',
    'function-variable': '#dcdcaa',

    string: '#ce9178',
    'template-string': '#ce9178',
    'template-punctuation': '#ce9178',
    regex: '#d16969',

    number: '#b5cea8',
    boolean: '#569cd6',
    null: '#569cd6',
    undefined: '#569cd6',

    operator: '#d4d4d4',
    punctuation: '#d4d4d4',
    parameter: '#9cdcfe',
    property: '#9cdcfe',
    'literal-property': '#9cdcfe',

    annotation: '#dcdcaa',
    'generic-function': '#dcdcaa',

    default: '#d4d4d4',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function colorFor(tokenType: string | null): string {
  if (!tokenType) return THEME.tokens.default;
  const types = tokenType.split(' ');
  for (const t of types) {
    if (THEME.tokens[t]) return THEME.tokens[t];
  }
  return THEME.tokens.default;
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
  if (!grammar) throw new Error(`Prism grammar not found for: ${language}`);

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

  const theme: HighlightTheme = opts.theme
    ? {
        ...THEME,
        tokens: { ...THEME.tokens, ...(opts.theme.tokens || {}) },
        ...opts.theme,
      } as HighlightTheme
    : THEME;

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
      const color = colorFor(seg.type);
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