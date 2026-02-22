import type { PdfOptions } from './types.js';
import { defaultTheme, defaultPageLayout } from './styles.js';
import PDFDocument from 'pdfkit';
import { marked, type Token, type Tokens } from 'marked';
import { PassThrough } from 'stream';
import { DEFAULTS } from './defaults.js';
import { renderCode, loadHighlightLanguages } from './highlight.prism.js';
import { splitEmojiSegments, containsEmoji, getEmojiRegex } from './emoji.js';
import { preRenderEmoji } from './color-emoji.js';

/** Name used to register the emoji font with PDFKit */
const EMOJI_FONT_NAME = 'NotoEmoji';

export async function renderMarkdownToPdf(
  markdown: string,
  options?: PdfOptions,
): Promise<Buffer> {
  const theme = options?.theme ?? defaultTheme;
  const layout = options?.pageLayout ?? defaultPageLayout;
  const basePath = options?.basePath ?? '';
  const syntaxHighlight = options?.syntaxHighlight !== false;
  if (syntaxHighlight) {
    loadHighlightLanguages(options?.languages);
  }
  const emojiFontOpt = options?.emojiFont ?? true;

  // Use provided image renderer or create default Node.js renderer
  const imageRenderer = options?.renderImage ?? DEFAULTS.renderImage(basePath);

  const { margins } = layout;

  const doc = new PDFDocument({ size: layout.pageSize, margins });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  doc.pipe(stream);
  stream.on('data', (chunk: Buffer) => chunks.push(chunk));

  // ── Emoji font registration ───────────────────────────────────────────────
  // The font registration block uses dynamic require() for `path` and `fs` so
  // that the renderer module can also be imported in browser environments where
  // those Node.js built-ins are unavailable.  If they aren't available the
  // try/catch simply falls through and emoji support is disabled (unless the
  // caller passes a Buffer directly via the `emojiFont` option).
  let emojiEnabled = false;
  if (emojiFontOpt !== false) {
    try {
      if (Buffer.isBuffer(emojiFontOpt)) {
        // Raw font data — works in both Node.js and browser environments.
        doc.registerFont(EMOJI_FONT_NAME, emojiFontOpt);
        emojiEnabled = true;
      } else {
        // Resolve a file path — requires Node.js built-ins.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodePath: typeof import('path') = require('path');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodeFs: typeof import('fs') = require('fs');
        const fontPath =
          typeof emojiFontOpt === 'string'
            ? emojiFontOpt
            : nodePath.join(__dirname, 'fonts', 'NotoEmoji-Regular.ttf');
        if (nodeFs.existsSync(fontPath)) {
          doc.registerFont(EMOJI_FONT_NAME, fontPath);
          emojiEnabled = true;
        }
      }
    } catch {
      // Font registration failed or Node.js APIs not available (browser) —
      // fall through without emoji support.
    }
  }

  // ── Color emoji pre-render ─────────────────────────────────────────────
  // When a colorEmoji renderer is provided, pre-scan the entire markdown for
  // every unique emoji and convert them all to PNG buffers up-front.  This
  // lets `renderTextWithEmoji` remain synchronous during page rendering.
  let emojiImageCache: Map<string, Buffer> | undefined;
  const colorEmojiEnabled = !!options?.colorEmoji;
  if (options?.colorEmoji) {
    emojiImageCache = await preRenderEmoji(
      markdown,
      options.colorEmoji,
      getEmojiRegex(),
    );
  }

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

  /**
   * Render a text string switching to the emoji font for emoji characters.
   *
   * Preserves the caller's current font / fontSize / fillColor for the
   * non-emoji portions.  The `continued` flag behaves exactly like the
   * native PDFKit option — pass `true` to keep the line open.
   *
   * When `colorEmojiEnabled` is true and `emojiImageCache` is populated,
   * emoji characters are rendered as inline PNG images instead of font
   * glyphs, with manual (x, y) positioning to keep them in the text flow.
   *
   * Supports both `renderTextWithEmoji(text, opts?)` and the positioned
   * form `renderTextWithEmoji(text, x, y, opts?)` used by table cells.
   */
  function renderTextWithEmoji(
    text: string,
    xOrOpts?: number | { continued?: boolean; [k: string]: unknown },
    yOrUndefined?: number,
    posOpts?: { continued?: boolean; [k: string]: unknown },
  ): void {
    // Normalise the two call signatures into a single (opts, firstX, firstY).
    let opts: { continued?: boolean; [k: string]: unknown };
    let firstX: number | undefined;
    let firstY: number | undefined;
    if (typeof xOrOpts === 'number') {
      firstX = xOrOpts;
      firstY = yOrUndefined;
      opts = posOpts ?? {};
    } else {
      opts = xOrOpts ?? {};
    }

    const hasEmoji = containsEmoji(text);

    // ── Fast path: no emoji handling needed ──────────────────────────────
    if ((!emojiEnabled && !colorEmojiEnabled) || !hasEmoji) {
      if (firstX !== undefined) {
        doc.text(text, firstX, firstY, opts);
      } else {
        doc.text(text, opts);
      }
      return;
    }

    // Remember the caller's font state so we can restore after emoji runs.
    const prevFont = (doc as any)._font?.name ?? theme.body.font;
    const prevSize = (doc as any)._fontSize ?? theme.body.fontSize;

    const segments = splitEmojiSegments(text);

    // ── Color emoji path: render emoji as inline PNG images ──────────────
    // Strategy: two-pass rendering.
    //   Pass 1 – Render all text through doc.text() with `continued`,
    //            exactly like the monochrome path.  For emoji segments,
    //            render a space-placeholder to reserve width.  Read the
    //            real X position from PDFKit's internal wrapper state
    //            (_wrapper.startX + _wrapper.continuedX) — doc.x stays
    //            at the left margin after continued:true so it is NOT
    //            usable for positioning.
    //   Pass 2 – Overlay emoji PNG images at the recorded positions.
    if (colorEmojiEnabled && emojiImageCache && emojiImageCache.size > 0) {
      const emojiRe = getEmojiRegex();
      const emojiSize = prevSize;  // match font size
      const emojiPlacements: Array<{ png: Buffer; x: number; y: number }> = [];

      // Read the actual text-flow X from PDFKit's internal LineWrapper.
      // After doc.text(…, {continued:true}), _wrapper.continuedX tracks
      // cumulative rendered width; startX is the original doc.x at
      // wrapper creation time.
      const getFlowX = (): number => {
        const w = (doc as any)._wrapper;
        if (w) return w.startX + w.continuedX;
        return firstX ?? doc.x;
      };

      // Build a space-placeholder string whose width ≈ emojiSize.
      doc.font(prevFont).fontSize(prevSize);
      const spaceW = doc.widthOfString(' ');
      const spacesPerEmoji = Math.max(1, Math.round(emojiSize / spaceW));
      const placeholder = ' '.repeat(spacesPerEmoji);
      const placeholderW = doc.widthOfString(placeholder);

      // Vertical alignment: centre emoji within the current line height.
      const lineH = doc.currentLineHeight(true);
      const yOffset = Math.max(0, (lineH - emojiSize) / 2);

      // Only use explicit (firstX, firstY) coordinates on the very first
      // doc.text() call, and only when no wrapper already exists (i.e.
      // we are not continuing from a prior renderTextWithEmoji call).
      let usedExplicitCoords = false;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const isLast = i === segments.length - 1;
        const cont = isLast ? !!opts.continued : true;

        if (seg.isEmoji) {
          emojiRe.lastIndex = 0;
          let em: RegExpExecArray | null;
          while ((em = emojiRe.exec(seg.text)) !== null) {
            const png = emojiImageCache.get(em[0]);
            const isLastEmoji = isLast && emojiRe.lastIndex >= seg.text.length;
            const eCont = isLastEmoji ? !!opts.continued : true;

            if (png) {
              // Position BEFORE rendering the placeholder.
              const emojiX = getFlowX();
              // For positioned calls (table cells), doc.y may be stale from
              // a previous cell — use the explicit firstY instead.
              const emojiY = (!usedExplicitCoords && firstY !== undefined) ? firstY : doc.y;

              doc.font(prevFont).fontSize(prevSize);
              if (!usedExplicitCoords && firstX !== undefined) {
                doc.text(placeholder, firstX, firstY, { ...opts, continued: eCont });
                usedExplicitCoords = true;
              } else {
                doc.text(placeholder, { ...opts, continued: eCont });
              }

              // Compute alignment-aware X position for the emoji image.
              let placedX = emojiX + (placeholderW - emojiSize) / 2;
              if (firstX !== undefined && typeof opts.width === 'number' && !(doc as any)._wrapper) {
                // Table cell with alignment — PDFKit already rendered the
                // placeholder at the aligned position; match it.
                const cellW = opts.width as number;
                const a = (opts.align as string) || 'left';
                if (a === 'center') placedX = firstX + (cellW - emojiSize) / 2;
                else if (a === 'right') placedX = firstX + cellW - emojiSize;
              }

              emojiPlacements.push({
                png,
                x: placedX,
                y: emojiY + yOffset,
              });
            } else {
              // Fallback: monochrome glyph.
              if (emojiEnabled) doc.font(EMOJI_FONT_NAME).fontSize(prevSize);
              if (!usedExplicitCoords && firstX !== undefined) {
                doc.text(em[0], firstX, firstY, { ...opts, continued: isLastEmoji ? !!opts.continued : true });
                usedExplicitCoords = true;
              } else {
                doc.text(em[0], { ...opts, continued: isLastEmoji ? !!opts.continued : true });
              }
              doc.font(prevFont).fontSize(prevSize);
            }
          }
        } else {
          // ── Text segment ──
          doc.font(prevFont).fontSize(prevSize);
          if (!usedExplicitCoords && firstX !== undefined) {
            doc.text(seg.text, firstX, firstY, { ...opts, continued: cont });
            usedExplicitCoords = true;
          } else {
            doc.text(seg.text, { ...opts, continued: cont });
          }
        }
      }

      // ── Pass 2: overlay emoji images at recorded positions ──
      const savedY = doc.y;
      const savedX = doc.x;
      for (const ep of emojiPlacements) {
        doc.image(ep.png, ep.x, ep.y, {
          width: emojiSize,
          height: emojiSize,
        });
      }
      doc.y = savedY;
      doc.x = savedX;

      doc.font(prevFont).fontSize(prevSize);
      return;
    }

    // ── Monochrome font path (original behaviour) ────────────────────────
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isLast = i === segments.length - 1;
      const cont = isLast ? !!opts.continued : true;

      if (seg.isEmoji) {
        doc.font(EMOJI_FONT_NAME).fontSize(prevSize);
      } else {
        doc.font(prevFont).fontSize(prevSize);
      }

      // Only pass explicit x,y for the very first segment.
      if (i === 0 && firstX !== undefined) {
        doc.text(seg.text, firstX, firstY, { ...opts, continued: cont });
      } else {
        doc.text(seg.text, { ...opts, continued: cont });
      }
    }

    // Restore the original font so subsequent calls aren't surprised.
    doc.font(prevFont).fontSize(prevSize);
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
    renderTextWithEmoji(linkText, { continued, underline: true, link: tok.href });
    doc.fillColor(theme.body.color);
  }

  async function renderInlineTokens(
    inlineTokens: Token[],
    continued: boolean,
    insideBold = false,
    insideItalic = false,
  ): Promise<void> {
    for (let i = 0; i < inlineTokens.length; i++) {
      const isLast = i === inlineTokens.length - 1;
      const cont = continued || !isLast;
      const tok = inlineTokens[i];
      switch (tok.type) {
        case 'text': {
          const t = tok as Tokens.Text;
          if (t.tokens && t.tokens.length > 0) {
            await renderInlineTokens(t.tokens, cont, insideBold, insideItalic);
          } else {
            applyBodyFont(insideBold, insideItalic);
            renderTextWithEmoji(t.text, { continued: cont });
          }
          break;
        }
        case 'strong': {
          const t = tok as Tokens.Strong;
          await renderInlineTokens(t.tokens, cont, true, insideItalic);
          break;
        }
        case 'em': {
          const t = tok as Tokens.Em;
          await renderInlineTokens(t.tokens, cont, insideBold, true);
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
        case 'image': {
          await renderImage(tok as Tokens.Image);
          break;
        }
        case 'del': {
          applyBodyFont(insideBold, insideItalic);
          renderTextWithEmoji((tok as Tokens.Del).text, { continued: cont, strike: true });
          break;
        }
        case 'escape': {
          applyBodyFont(insideBold, insideItalic);
          renderTextWithEmoji((tok as Tokens.Escape).text, { continued: cont });
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
            renderTextWithEmoji(raw, { continued: cont });
          }
          break;
        }
      }
    }
  }

  async function renderImage(tok: Tokens.Image): Promise<void> {
    try {
      // Use the pluggable image renderer
      const imgBuffer = await imageRenderer(tok.href);

      // Read the image's intrinsic dimensions via pdfkit
      // openImage exists at runtime but is missing from @types/pdfkit
      const img = (doc as any).openImage(imgBuffer) as { width: number; height: number };
      const maxHeight = doc.page.height - margins.top - margins.bottom;

      // Scale down to fit content area, but never scale up beyond natural size
      let displayWidth = Math.min(img.width, contentWidth);
      let displayHeight = img.height * (displayWidth / img.width);

      // Also cap height to the printable area
      if (displayHeight > maxHeight) {
        displayHeight = maxHeight;
        displayWidth = img.width * (displayHeight / img.height);
      }

      ensureSpace(displayHeight + 10);
      doc.image(imgBuffer, { width: displayWidth, height: displayHeight });
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
            await renderInlineTokens(t.tokens, false);
          } else {
            renderTextWithEmoji(t.text);
          }
        } else if (child.type === 'paragraph') {
          await renderInlineTokens((child as Tokens.Paragraph).tokens, false);
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
    const textInsetY = (rowH - theme.body.fontSize) / 2;

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
      renderTextWithEmoji(table.header[c].text, cellX + cellPad, y + textInsetY, {
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
        renderTextWithEmoji(row[c].text, cellX + cellPad, y + textInsetY, {
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
        renderTextWithEmoji(t.text);
        doc.moveDown(spaceBelow / doc.currentLineHeight());
        resetBodyFont();
        break;
      }
      case 'paragraph': {
        const t = token as Tokens.Paragraph;
        ensureSpace(theme.body.fontSize * 2);
        resetBodyFont();
        await renderInlineTokens(t.tokens, false);
        doc.moveDown(0.5);
        break;
      }
      case 'code': {
        const t = token as Tokens.Code;
        const cs = theme.code.block;

        // Use syntax highlighting when a language is specified and highlighting is enabled
        if (syntaxHighlight && t.lang) {
          const lines = t.text.split('\n');
          const lineH = cs.fontSize * 1.5;
          const blockH = lines.length * lineH + cs.padding * 2;
          ensureSpace(blockH + 10);
          const newY = renderCode(doc as any, t.text, {
            language: t.lang,
            x: margins.left,
            y: doc.y,
            width: contentWidth,
            font: cs.font,
            fontSize: cs.fontSize,
            lineHeight: 1.5,
            padding: cs.padding,
            lineNumbers: true,
            drawBackground: true,
            theme: theme.syntaxHighlight,
          });
          doc.x = margins.left;
          doc.y = newY;
          doc.moveDown(0.5);
          resetBodyFont();
        } else {
          // Plain code block (no language or highlighting disabled)
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
        }
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
            await renderInlineTokens(p.tokens, false, false, bq.italic);
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

