import type { PdfOptions } from './types.js';
import { defaultTheme, defaultPageLayout } from './styles.js';
import PDFDocument from 'pdfkit';
import { marked, type Token, type Tokens } from 'marked';
import { PassThrough } from 'stream';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

function fetchImageBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchImageBuffer(res.headers.location).then(resolve, reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

export async function renderMarkdownToPdf(
  markdown: string,
  options?: PdfOptions,
): Promise<Buffer> {
  const theme = options?.theme ?? defaultTheme;
  const layout = options?.pageLayout ?? defaultPageLayout;
  const { margins } = layout;

  const doc = new PDFDocument({ size: layout.pageSize, margins });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  doc.pipe(stream);
  stream.on('data', (chunk: Buffer) => chunks.push(chunk));

  const tokens = marked.lexer(markdown);
  const contentWidth = doc.page.width - margins.left - margins.right;

  function ensureSpace(needed: number): void {
    if (doc.y + needed > doc.page.height - margins.bottom) {
      doc.addPage();
    }
  }

  function applyBodyFont(bold: boolean, italic: boolean): void {
    let font = theme.body.font;
    if (bold && italic) font = 'Helvetica-BoldOblique';
    else if (bold) font = 'Helvetica-Bold';
    else if (italic) font = 'Helvetica-Oblique';
    doc.font(font).fontSize(theme.body.fontSize).fillColor(theme.body.color);
  }

  function resetBodyFont(): void {
    doc.font(theme.body.font).fontSize(theme.body.fontSize).fillColor(theme.body.color);
  }

  function renderCodespan(text: string, continued: boolean): void {
    const cs = theme.code.inline;
    doc.font(cs.font).fontSize(cs.fontSize);
    const textW = doc.widthOfString(text);
    const textH = doc.currentLineHeight();
    const bgX = doc.x;
    const bgY = doc.y;
    doc.save();
    doc.rect(bgX, bgY, textW + 4, textH + 2).fill(cs.backgroundColor);
    doc.restore();
    doc.font(cs.font).fontSize(cs.fontSize).fillColor(cs.color);
    doc.text(text, bgX + 2, bgY + 1, { continued });
    resetBodyFont();
  }

  function renderLink(tok: Tokens.Link, continued: boolean): void {
    doc.font(theme.body.font).fontSize(theme.body.fontSize).fillColor(theme.linkColor);
    const linkText = tok.text || tok.href;
    doc.text(linkText, { continued, underline: true, link: tok.href });
    doc.fillColor(theme.body.color);
  }

  function renderInlineTokens(
    inlineTokens: Token[],
    continued: boolean,
    insideBold = false,
    insideItalic = false,
  ): void {
    for (let i = 0; i < inlineTokens.length; i++) {
      const isLast = i === inlineTokens.length - 1;
      const cont = continued || !isLast;
      const tok = inlineTokens[i];
      switch (tok.type) {
        case 'text': {
          const t = tok as Tokens.Text;
          if (t.tokens && t.tokens.length > 0) {
            renderInlineTokens(t.tokens, cont, insideBold, insideItalic);
          } else {
            applyBodyFont(insideBold, insideItalic);
            doc.text(t.text, { continued: cont });
          }
          break;
        }
        case 'strong': {
          const t = tok as Tokens.Strong;
          renderInlineTokens(t.tokens, cont, true, insideItalic);
          break;
        }
        case 'em': {
          const t = tok as Tokens.Em;
          renderInlineTokens(t.tokens, cont, insideBold, true);
          break;
        }
        case 'codespan': {
          renderCodespan((tok as Tokens.Codespan).text, cont);
          break;
        }
        case 'link': {
          renderLink(tok as Tokens.Link, cont);
          break;
        }
        case 'del': {
          applyBodyFont(insideBold, insideItalic);
          doc.text((tok as Tokens.Del).text, { continued: cont, strike: true });
          break;
        }
        case 'escape': {
          applyBodyFont(insideBold, insideItalic);
          doc.text((tok as Tokens.Escape).text, { continued: cont });
          break;
        }
        case 'br': {
          doc.moveDown(0.5);
          break;
        }
        default: {
          const raw = (tok as any).text ?? (tok as any).raw ?? '';
          if (raw) {
            applyBodyFont(insideBold, insideItalic);
            doc.text(raw, { continued: cont });
          }
          break;
        }
      }
    }
  }

  async function renderImage(tok: Tokens.Image): Promise<void> {
    try {
      let imgBuffer: Buffer;
      if (tok.href.startsWith('http://') || tok.href.startsWith('https://')) {
        imgBuffer = await fetchImageBuffer(tok.href);
      } else {
        // Local file path — resolve relative to CWD
        const imgPath = path.resolve(tok.href);
        imgBuffer = fs.readFileSync(imgPath);
      }
      ensureSpace(200);
      doc.image(imgBuffer, { fit: [contentWidth, 400], align: 'center' });
      doc.moveDown(0.5);
    } catch {
      ensureSpace(20);
      resetBodyFont();
      doc.text(`[Image: ${tok.text || 'image'}]`);
      doc.moveDown(0.3);
    }
  }

  async function renderList(list: Tokens.List, depth: number): Promise<void> {
    const indent = margins.left + depth * 20;
    for (let idx = 0; idx < list.items.length; idx++) {
      const item = list.items[idx];
      ensureSpace(theme.body.fontSize * 2);
      resetBodyFont();
      const bullet = list.ordered ? `${(list.start as number) + idx}.` : '•';
      doc.text(bullet, indent, doc.y, { continued: true, width: contentWidth - depth * 20 });
      doc.text(' ', { continued: true });
      // Render item inline tokens
      const itemTokens = item.tokens;
      for (const child of itemTokens) {
        if (child.type === 'text') {
          const t = child as Tokens.Text;
          if (t.tokens && t.tokens.length > 0) {
            renderInlineTokens(t.tokens, false);
          } else {
            doc.text(t.text);
          }
        } else if (child.type === 'paragraph') {
          renderInlineTokens((child as Tokens.Paragraph).tokens, false);
        } else if (child.type === 'list') {
          await renderList(child as Tokens.List, depth + 1);
        }
      }
      doc.moveDown(0.2);
    }
  }

  async function renderTable(table: Tokens.Table): Promise<void> {
    const colCount = table.header.length;
    if (colCount === 0) return;
    const cellPad = theme.table.cellPadding;
    const colWidth = contentWidth / colCount;
    const rowH = theme.body.fontSize + cellPad * 2 + 4;

    ensureSpace(rowH * 2);
    const startX = margins.left;
    let y = doc.y;

    // Header row
    doc.save();
    doc.rect(startX, y, contentWidth, rowH).fill(theme.table.headerBackground);
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(theme.body.fontSize).fillColor(theme.body.color);
    for (let c = 0; c < colCount; c++) {
      const cellX = startX + c * colWidth;
      doc.text(table.header[c].text, cellX + cellPad, y + cellPad, {
        width: colWidth - cellPad * 2,
        height: rowH,
        align: table.align[c] || 'left',
      });
    }
    // Header border
    doc.save();
    doc.strokeColor(theme.table.borderColor).lineWidth(0.5);
    doc.rect(startX, y, contentWidth, rowH).stroke();
    for (let c = 1; c < colCount; c++) {
      const cx = startX + c * colWidth;
      doc.moveTo(cx, y).lineTo(cx, y + rowH).stroke();
    }
    doc.restore();
    y += rowH;

    // Body rows
    resetBodyFont();
    for (const row of table.rows) {
      ensureSpace(rowH);
      for (let c = 0; c < colCount; c++) {
        const cellX = startX + c * colWidth;
        doc.text(row[c].text, cellX + cellPad, y + cellPad, {
          width: colWidth - cellPad * 2,
          height: rowH,
          align: table.align[c] || 'left',
        });
      }
      doc.save();
      doc.strokeColor(theme.table.borderColor).lineWidth(0.5);
      doc.rect(startX, y, contentWidth, rowH).stroke();
      for (let c = 1; c < colCount; c++) {
        const cx = startX + c * colWidth;
        doc.moveTo(cx, y).lineTo(cx, y + rowH).stroke();
      }
      doc.restore();
      y += rowH;
    }
    doc.x = margins.left;
    doc.y = y;
    doc.moveDown(0.5);
    resetBodyFont();
  }

  async function renderToken(token: Token): Promise<void> {
    switch (token.type) {
      case 'heading': {
        const t = token as Tokens.Heading;
        const key = `h${t.depth}` as keyof typeof theme.headings;
        const style = theme.headings[key];
        const spaceAbove = style.fontSize * 0.8;
        const spaceBelow = style.fontSize * 0.3;
        ensureSpace(spaceAbove + style.fontSize + spaceBelow);
        doc.moveDown(spaceAbove / doc.currentLineHeight());
        doc.font(style.font).fontSize(style.fontSize).fillColor(style.color);
        doc.text(t.text);
        doc.moveDown(spaceBelow / doc.currentLineHeight());
        resetBodyFont();
        break;
      }
      case 'paragraph': {
        const t = token as Tokens.Paragraph;
        ensureSpace(theme.body.fontSize * 2);
        resetBodyFont();
        renderInlineTokens(t.tokens, false);
        doc.moveDown(0.5);
        break;
      }
      case 'code': {
        const t = token as Tokens.Code;
        const cs = theme.code.block;
        const lines = t.text.split('\n');
        const lineH = cs.fontSize * 1.4;
        const blockH = lines.length * lineH + cs.padding * 2;
        ensureSpace(blockH + 10);
        const x = margins.left;
        const y = doc.y;
        doc.save();
        doc.rect(x, y, contentWidth, blockH).fill(cs.backgroundColor);
        doc.restore();
        doc.font(cs.font).fontSize(cs.fontSize).fillColor(cs.color);
        let textY = y + cs.padding;
        for (const line of lines) {
          doc.text(line, x + cs.padding, textY, { width: contentWidth - cs.padding * 2 });
          textY += lineH;
        }
        doc.x = margins.left;
        doc.y = y + blockH;
        doc.moveDown(0.5);
        resetBodyFont();
        break;
      }
      case 'blockquote': {
        const t = token as Tokens.Blockquote;
        const bq = theme.blockquote;
        ensureSpace(30);
        const bqPadding = 6; // vertical padding above and below text
        const startY = doc.y;
        doc.y += bqPadding; // add top padding before text
        const textX = margins.left + bq.borderWidth + bq.indent;
        const textWidth = contentWidth - bq.borderWidth - bq.indent;
        for (const child of t.tokens) {
          if (child.type === 'paragraph') {
            const p = child as Tokens.Paragraph;
            const font = bq.italic ? 'Helvetica-Oblique' : theme.body.font;
            doc.font(font).fontSize(theme.body.fontSize).fillColor(theme.body.color);
            doc.text('', textX, doc.y, { width: textWidth });
            renderInlineTokens(p.tokens, false, false, bq.italic);
            doc.moveDown(0.3);
          } else {
            await renderToken(child);
          }
        }
        doc.y += bqPadding; // add bottom padding after text
        const endY = doc.y;
        doc.save();
        doc.rect(margins.left, startY, bq.borderWidth, endY - startY).fill(bq.borderColor);
        doc.restore();
        doc.x = margins.left;
        doc.moveDown(0.3);
        resetBodyFont();
        break;
      }
      case 'list': {
        await renderList(token as Tokens.List, 0);
        doc.moveDown(0.3);
        break;
      }
      case 'hr': {
        ensureSpace(20);
        doc.moveDown(0.5);
        const y = doc.y;
        doc.save();
        doc.strokeColor(theme.horizontalRuleColor).lineWidth(1)
          .moveTo(margins.left, y)
          .lineTo(margins.left + contentWidth, y)
          .stroke();
        doc.restore();
        doc.y = y;
        doc.moveDown(0.5);
        resetBodyFont();
        break;
      }
      case 'table': {
        await renderTable(token as Tokens.Table);
        break;
      }
      case 'image': {
        await renderImage(token as Tokens.Image);
        break;
      }
      case 'space':
      case 'html':
        break;
      default:
        break;
    }
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  for (const token of tokens) {
    await renderToken(token);
  }

  doc.end();

  return new Promise<Buffer>((resolve) => {
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

