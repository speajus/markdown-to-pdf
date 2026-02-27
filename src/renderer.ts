import type { PdfOptions, SpacingConfig, TextStyle } from './types.js';
import { defaultTheme, defaultPageLayout, defaultSpacing } from './styles.js';
import PDFDocument from 'pdfkit';
import { marked, type Token, type Tokens } from 'marked';
import { PassThrough } from 'stream';
import { DEFAULTS } from './defaults.js';
import { renderCode, loadHighlightLanguages } from './highlight.prism.js';

/** Name used to identify the emoji font (for safeFont checks). */
const EMOJI_FONT_NAME = 'EmojiFont';

/** Standard PDF fonts built into PDFKit — always available without filesystem access. */
const STANDARD_PDF_FONTS = new Set([
  'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique',
  'Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique',
  'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic',
  'Symbol', 'ZapfDingbats',
]);

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
  const lineNumbers = options?.lineNumbers ?? false;
  const zebraStripes = options?.zebraStripes !== false;
  // ── Resolve effective emoji font setting ──────────────────────────────
  // PdfOptions.emojiFont (boolean | string | Buffer) overrides theme when
  // explicitly set; otherwise fall back to theme.emojiFont ('twemoji'|'openmoji'|'none').
  const themeEmojiFont = theme.emojiFont ?? 'twemoji';
  const emojiFontOpt: boolean | string | Buffer =
    options?.emojiFont !== undefined
      ? options.emojiFont
      : themeEmojiFont === 'none'
        ? false
        : themeEmojiFont; // 'twemoji' | 'openmoji' | 'noto'

  // Use provided image renderer or create default Node.js renderer
  const imageRenderer = options?.renderImage ?? DEFAULTS.renderImage(basePath);

  const { margins } = layout;

  // ── Resolve emoji font for pdfkit native color emoji support ────────────
  // The fork at jspears/pdfkit#support-color-emoji-google handles emoji
  // segmentation and rendering (COLR/CPAL, SBIX, CBDT) internally when
  // an `emojiFont` option is passed to the PDFDocument constructor.
  let resolvedEmojiFont: string | Buffer | undefined;
  if (emojiFontOpt !== false) {
    try {
      if (Buffer.isBuffer(emojiFontOpt)) {
        resolvedEmojiFont = emojiFontOpt;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodePath: typeof import('path') = require('path');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodeFs: typeof import('fs') = require('fs');
        let fontPath: string;
        if (typeof emojiFontOpt === 'string' && emojiFontOpt !== 'twemoji' && emojiFontOpt !== 'openmoji' && emojiFontOpt !== 'noto' && emojiFontOpt !== 'none') {
          fontPath = emojiFontOpt; // custom file path
        } else if (emojiFontOpt === 'openmoji') {
          fontPath = nodePath.join(__dirname, 'fonts', 'OpenMoji-Color.ttf');
        } else if (emojiFontOpt === 'noto') {
          fontPath = nodePath.join(__dirname, 'fonts', 'NotoColorEmoji.ttf');
        } else {
          fontPath = nodePath.join(__dirname, 'fonts', 'Twemoji.Mozilla.ttf');
        }
        if (nodeFs.existsSync(fontPath)) {
          resolvedEmojiFont = fontPath;
        }
      }
    } catch {
      // Node.js APIs not available (browser) — no emoji font.
    }
  }

  const doc = new PDFDocument({
    size: layout.pageSize,
    margins,
    ...(resolvedEmojiFont ? { emojiFont: resolvedEmojiFont } : {}),
  });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  doc.pipe(stream);
  stream.on('data', (chunk: Buffer) => chunks.push(chunk));

  // ── Custom font registration ─────────────────────────────────────────────
  // Register user-supplied font families so they can be referenced by name
  // in ThemeConfig font fields.  Each variant is registered with a suffix:
  //   name (regular), name-Bold, name-Italic, name-BoldItalic
  // Missing variants fall back: boldItalic → bold → regular, italic → regular.
  const customFontNames = new Set<string>();
  if (options?.customFonts) {
    for (const cf of options.customFonts) {
      try {
        doc.registerFont(cf.name, cf.regular);
        doc.registerFont(`${cf.name}-Bold`, cf.bold ?? cf.regular);
        doc.registerFont(`${cf.name}-Italic`, cf.italic ?? cf.regular);
        doc.registerFont(
          `${cf.name}-BoldItalic`,
          cf.boldItalic ?? cf.bold ?? cf.regular,
        );
        customFontNames.add(cf.name);
      } catch {
        // Font registration failed — skip this font gracefully.
      }
    }
  }

  // ── Browser font safety ────────────────────────────────────────────────
  // In browser environments, `fs.readFileSync` doesn't exist.  When PDFKit
  // encounters an unknown font name it tries to load it from disk via
  // readFileSync, which crashes in the browser.  Detect whether we're in a
  // filesystem-capable environment so we can guard calls to `doc.font()`.
  let fsAvailable = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeFs: typeof import('fs') = require('fs');
    fsAvailable = typeof nodeFs.readFileSync === 'function';
  } catch {
    // Node.js `fs` not available — we're in a browser environment.
  }

  // ── Spacing config ────────────────────────────────────────────────────
  const sp: Required<SpacingConfig> = { ...defaultSpacing, ...theme.spacing };

  const tokens = marked.lexer(markdown);
  const contentWidth = doc.page.width - margins.left - margins.right;

  // ── Table cell context ──────────────────────────────────────────────────
  // When rendering inline tokens inside a table cell, the first text output
  // must be positioned at the cell's (x, y) with the cell's width/align.
  // Subsequent text outputs in the same cell use PDFKit's continued-flow.
  let cellCtx: { x: number; y: number; width: number; align: string; used: boolean } | null = null;

  // ── Heading context ───────────────────────────────────────────────────
  // When rendering inline tokens inside a heading, font helpers use the
  // heading's style (font, fontSize, color) instead of the body style.
  let headingCtx: TextStyle | null = null;

  function ensureSpace(needed: number): void {
    if (doc.y + needed > doc.page.height - margins.bottom) {
      doc.addPage();
    }
  }

  /** Check whether `font` (or its base name) is a registered custom font. */
  function isCustomFont(font: string): boolean {
    if (customFontNames.has(font)) return true;
    // Also match variant names like "Roboto-Bold"
    const dash = font.lastIndexOf('-');
    if (dash > 0) return customFontNames.has(font.substring(0, dash));
    return false;
  }

  /**
   * Return a safe font name that will not crash `doc.font()`.
   *
   * In Node.js (`fsAvailable === true`) this is a no-op — PDFKit can load
   * fonts from the filesystem.  In browser environments, if the font is
   * neither a standard PDF font nor a registered custom / emoji font, we
   * return a standard fallback and log a warning so the user knows which
   * font was unavailable.
   */
  function safeFont(name: string): string {
    if (fsAvailable) return name;
    if (STANDARD_PDF_FONTS.has(name) || isCustomFont(name) || name === EMOJI_FONT_NAME) return name;

    // Determine the closest standard fallback, preserving bold/italic intent
    // by inspecting the variant suffix added by resolveFont().
    let fallback: string;
    if (name.endsWith('-BoldOblique') || name.endsWith('-BoldItalic')) {
      fallback = 'Helvetica-BoldOblique';
    } else if (name.endsWith('-Bold')) {
      fallback = 'Helvetica-Bold';
    } else if (name.endsWith('-Oblique') || name.endsWith('-Italic')) {
      fallback = 'Helvetica-Oblique';
    } else {
      fallback = 'Helvetica';
    }

    console.warn(
      `[markdown-to-pdf] Font "${name}" is not available; falling back to "${fallback}"`,
    );
    return fallback;
  }

  /** Return the base (registered) name of a custom font, stripping any variant suffix. */
  function customFontBase(font: string): string {
    if (customFontNames.has(font)) return font;
    const dash = font.lastIndexOf('-');
    if (dash > 0) {
      const base = font.substring(0, dash);
      if (customFontNames.has(base)) return base;
    }
    return font;
  }

  /** Derive the italic variant of a font name. */
  function italicVariant(font: string): string {
    // Custom fonts use Name-Italic / Name-BoldItalic
    if (isCustomFont(font)) {
      const base = customFontBase(font);
      if (font.endsWith('-Bold')) return `${base}-BoldItalic`;
      return `${base}-Italic`;
    }
    // Built-in Times family
    if (font.startsWith('Times')) return font.replace(/-Bold$/, '-BoldItalic').replace(/^Times-Roman$/, 'Times-Italic');
    // Helvetica / Courier families use "Oblique"
    if (font.endsWith('-Bold')) return font + 'Oblique';
    return font + '-Oblique';
  }

  /** Resolve the correct font variant (regular / bold / italic / bold-italic). */
  function resolveFont(baseFont: string, bold: boolean, italic: boolean): string {
    if (isCustomFont(baseFont)) {
      const base = customFontBase(baseFont);
      if (bold && italic) return `${base}-BoldItalic`;
      if (bold) return `${base}-Bold`;
      if (italic) return `${base}-Italic`;
      return base;
    }
    // Built-in PDFKit fonts — strip existing variant suffix before applying,
    // so that e.g. 'Helvetica-Bold' + bold doesn't produce 'Helvetica-Bold-Bold'.
    if (baseFont.startsWith('Times')) {
      if (bold && italic) return 'Times-BoldItalic';
      if (bold) return 'Times-Bold';
      if (italic) return 'Times-Italic';
      return baseFont;
    }
    // Helvetica / Courier families: strip any existing variant suffix first
    const family = baseFont.replace(/-(Bold|Oblique|BoldOblique)$/, '');
    if (bold && italic) return `${family}-BoldOblique`;
    if (bold) return `${family}-Bold`;
    if (italic) return `${family}-Oblique`;
    return family;
  }

  function applyBodyFont(bold: boolean, italic: boolean): void {
    if (headingCtx) {
      // Inside a heading — use heading style as the base.
      let font = headingCtx.font;
      if (bold || italic) font = resolveFont(font, bold, italic);
      doc.font(safeFont(font)).fontSize(headingCtx.fontSize).fillColor(headingCtx.color);
      return;
    }
    const font = resolveFont(theme.body.font, bold, italic);
    doc.font(safeFont(font)).fontSize(theme.body.fontSize).fillColor(theme.body.color);
  }

  function resetBodyFont(): void {
    if (headingCtx) {
      doc.font(safeFont(headingCtx.font)).fontSize(headingCtx.fontSize).fillColor(headingCtx.color);
      return;
    }
    doc.font(safeFont(theme.body.font)).fontSize(theme.body.fontSize).fillColor(theme.body.color);
  }

  /**
   * Render text, delegating to `doc.text()`.
   *
   * pdfkit's native color emoji support (via the `emojiFont` constructor
   * option) handles emoji segmentation and rendering internally, so this
   * function only normalises call signatures and handles table cell context.
   *
   * Supports both `renderText(text, opts?)` and the positioned form
   * `renderText(text, x, y, opts?)` used by table cells.
   */
  function renderText(
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

    // If inside a table cell and this is the first text output, apply cell positioning.
    if (cellCtx && !cellCtx.used && firstX === undefined) {
      firstX = cellCtx.x;
      firstY = cellCtx.y;
      opts = { ...opts, width: cellCtx.width, align: cellCtx.align };
      cellCtx.used = true;
    }

    if (firstX !== undefined) {
      doc.text(text, firstX, firstY, opts);
    } else {
      doc.text(text, opts);
    }
  }

  function renderCodespan(text: string, continued: boolean): void {
    const cs = theme.code.inline;
    const hPad = 2;   // horizontal padding each side
    const vPad = 1;   // vertical padding each side

    doc.font(safeFont(cs.font)).fontSize(cs.fontSize);
    const textW = doc.widthOfString(text);
    const textH = doc.currentLineHeight();

    // Determine flow position.  If this is the first output in a table cell,
    // use the cell context coordinates; otherwise read from the LineWrapper.
    let flowX: number;
    let flowY: number;
    let useCellPos = false;
    let cellExtra: Record<string, unknown> = {};
    if (cellCtx && !cellCtx.used) {
      flowX = cellCtx.x;
      flowY = cellCtx.y;
      useCellPos = true;
      cellExtra = { width: cellCtx.width, align: cellCtx.align };
      cellCtx.used = true;
    } else {
      // Read the real flow X position from PDFKit's internal LineWrapper.
      // After continued:true, doc.x stays at the left margin — the actual
      // cursor position is _wrapper.startX + _wrapper.continuedX.
      const w = (doc as any)._wrapper;
      flowX = w ? (w.startX + w.continuedX) : doc.x;
      flowY = doc.y;
    }

    // Draw background at the current flow position (behind the text)
    doc.save();
    doc.roundedRect(flowX - hPad, flowY, textW + hPad * 2, textH + vPad * 2, 2)
      .fill(cs.backgroundColor);
    doc.restore();

    // Render inline — use positioned form for cell context, flow form otherwise
    doc.font(safeFont(cs.font)).fontSize(cs.fontSize).fillColor(cs.color);
    if (useCellPos) {
      doc.text(text, flowX, flowY, { continued, ...cellExtra });
    } else {
      doc.text(text, { continued });
    }
    resetBodyFont();
  }

  function renderLink(tok: Tokens.Link, continued: boolean): void | Promise<void> {
    // If the link wraps an image, render a clickable image instead of text
    const imgChild = tok.tokens?.find((t): t is Tokens.Image => t.type === 'image');
    if (imgChild) {
      return renderImage(imgChild, tok.href);
    }

    if (headingCtx) {
      doc.font(safeFont(headingCtx.font)).fontSize(headingCtx.fontSize).fillColor(theme.linkColor);
    } else {
      doc.font(safeFont(theme.body.font)).fontSize(theme.body.fontSize).fillColor(theme.linkColor);
    }
    const linkText = tok.text || tok.href;
    renderText(linkText, { continued, underline: true, link: tok.href });
    doc.fillColor(headingCtx ? headingCtx.color : theme.body.color);
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
            renderText(t.text, { continued: cont, underline: false, strike: false });
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
          await renderLink(tok as Tokens.Link, cont);
          break;
        }
        case 'image': {
          await renderImage(tok as Tokens.Image);
          break;
        }
        case 'del': {
          applyBodyFont(insideBold, insideItalic);
          renderText((tok as Tokens.Del).text, { continued: cont, strike: true, underline: false });
          break;
        }
        case 'escape': {
          applyBodyFont(insideBold, insideItalic);
          renderText((tok as Tokens.Escape).text, { continued: cont, underline: false, strike: false });
          break;
        }
        case 'br': {
          doc.moveDown(0.5);
          break;
        }
        case 'html': {
          const htmlText = ((tok as any).text ?? (tok as any).raw ?? '').trim();
          if (/^<br\s*\/?>$/i.test(htmlText)) {
            doc.moveDown(0.5);
          } else {
            // Non-br HTML: render as text (fall through to default behavior)
            const raw = (tok as any).text ?? (tok as any).raw ?? '';
            if (raw) {
              applyBodyFont(insideBold, insideItalic);
              renderText(raw, { continued: cont, underline: false, strike: false });
            }
          }
          break;
        }
        default: {
          const raw = (tok as any).text ?? (tok as any).raw ?? '';
          if (raw) {
            applyBodyFont(insideBold, insideItalic);
            renderText(raw, { continued: cont, underline: false, strike: false });
          }
          break;
        }
      }
    }
  }

  async function renderImage(tok: Tokens.Image, linkUrl?: string): Promise<void> {
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
      // Compute horizontal position based on imageAlign
      const imgX = theme.imageAlign === 'center'
        ? margins.left + (contentWidth - displayWidth) / 2
        : doc.x;
      const imgY = doc.y;
      doc.image(imgBuffer, imgX, imgY, { width: displayWidth, height: displayHeight });

      // If the image is wrapped in a link, overlay a clickable annotation
      if (linkUrl) {
        doc.link(imgX, imgY, displayWidth, displayHeight, linkUrl);
      }

      doc.y = imgY + displayHeight;
      doc.moveDown(0.5);
    } catch {
      ensureSpace(20);
      resetBodyFont();
      doc.text(`[Image: ${tok.text || 'image'}]`);
      doc.moveDown(0.3);
    }
  }

  async function renderList(list: Tokens.List, depth: number): Promise<void> {
    const indent = margins.left + depth * sp.listIndent;
    for (let idx = 0; idx < list.items.length; idx++) {
      const item = list.items[idx];
      ensureSpace(theme.body.fontSize * 2);
      resetBodyFont();
      const bullet = list.ordered ? `${(list.start as number) + idx}.` : '•';
      doc.text(bullet, indent, doc.y, { continued: true, width: contentWidth - depth * sp.listIndent });
      doc.text(' ', { continued: true });
      // Render item inline tokens
      const itemTokens = item.tokens;
      for (const child of itemTokens) {
        if (child.type === 'text') {
          const t = child as Tokens.Text;
          if (t.tokens && t.tokens.length > 0) {
            await renderInlineTokens(t.tokens, false);
          } else {
            renderText(t.text);
          }
        } else if (child.type === 'paragraph') {
          await renderInlineTokens((child as Tokens.Paragraph).tokens, false);
        } else if (child.type === 'list') {
          await renderList(child as Tokens.List, depth + 1);
        }
      }
      doc.moveDown(sp.listItemSpacing);
    }
  }

  async function renderCellTokens(
    cell: { text: string; tokens: Token[] },
    x: number, y: number,
    width: number, align: string,
    bold: boolean,
  ): Promise<void> {
    const savedY = doc.y;
    if (cell.tokens && cell.tokens.length > 0) {
      cellCtx = { x, y, width, align, used: false };
      applyBodyFont(bold, false);
      await renderInlineTokens(cell.tokens, false, bold, false);
      cellCtx = null;
    } else {
      // Fallback: plain text (no inline tokens)
      applyBodyFont(bold, false);
      renderText(cell.text, x, y, { width, align });
    }
    doc.y = savedY;
  }

  /**
   * Extract plain text from cell tokens, converting <br> HTML tokens to \n
   * so that heightOfString can measure the full multiline content.
   */
  function cellPlainText(cell: { text: string; tokens: Token[] }): string {
    if (!cell.tokens || cell.tokens.length === 0) return cell.text;
    function extract(tokens: Token[]): string {
      let result = '';
      for (const tok of tokens) {
        if (tok.type === 'br') {
          result += '\n';
        } else if (tok.type === 'html') {
          const raw = ((tok as any).text ?? (tok as any).raw ?? '').trim();
          if (/^<br\s*\/?>$/i.test(raw)) {
            result += '\n';
          } else {
            result += (tok as any).text ?? (tok as any).raw ?? '';
          }
        } else if ((tok as any).tokens && (tok as any).tokens.length > 0) {
          result += extract((tok as any).tokens);
        } else {
          result += (tok as any).text ?? (tok as any).raw ?? '';
        }
      }
      return result;
    }
    return extract(cell.tokens);
  }

  /**
   * Measure the height a cell needs given its content and available width.
   */
  function measureCellHeight(
    cell: { text: string; tokens: Token[] },
    cellWidth: number,
    bold: boolean,
  ): number {
    const text = cellPlainText(cell);
    const font = bold
      ? safeFont(resolveFont(theme.body.font, true, false))
      : safeFont(theme.body.font);
    doc.font(font).fontSize(theme.body.fontSize);
    return doc.heightOfString(text, { width: cellWidth });
  }

  async function renderTable(table: Tokens.Table): Promise<void> {
    const colCount = table.header.length;
    if (colCount === 0) return;
    const cellPad = theme.table.cellPadding;
    const colWidth = contentWidth / colCount;
    const minRowH = theme.body.fontSize + cellPad * 2 + 4;
    const textWidth = colWidth - cellPad * 2;

    ensureSpace(minRowH * 2);
    const startX = margins.left;
    let y = doc.y;

    // ── Measure header row height ──
    let headerH = minRowH;
    let maxHeaderTextHeight = 0;
    for (let c = 0; c < colCount; c++) {
      const h = measureCellHeight(table.header[c], textWidth, true);
      maxHeaderTextHeight = Math.max(maxHeaderTextHeight, h);
      headerH = Math.max(headerH, h + cellPad * 2 + 4);
    }
    const headerTextInsetY = (headerH - maxHeaderTextHeight) / 2;

    // Header row background
    doc.save();
    doc.rect(startX, y, contentWidth, headerH).fill(theme.table.headerBackground);
    doc.restore();
    for (let c = 0; c < colCount; c++) {
      const cellX = startX + c * colWidth;
      await renderCellTokens(
        table.header[c], cellX + cellPad, y + headerTextInsetY,
        textWidth, table.align[c] || 'left', true,
      );
    }
    // Header border
    doc.save();
    doc.strokeColor(theme.table.borderColor).lineWidth(0.5);
    doc.rect(startX, y, contentWidth, headerH).stroke();
    for (let c = 1; c < colCount; c++) {
      const cx = startX + c * colWidth;
      doc.moveTo(cx, y).lineTo(cx, y + headerH).stroke();
    }
    doc.restore();
    y += headerH;

    // Body rows
    const zebraColor = theme.table.zebraColor ?? '#f9f9f9';
    for (let r = 0; r < table.rows.length; r++) {
      const row = table.rows[r];

      // ── Measure row height ──
      let rowH = minRowH;
      let maxRowTextHeight = 0;
      for (let c = 0; c < colCount; c++) {
        const h = measureCellHeight(row[c], textWidth, false);
        maxRowTextHeight = Math.max(maxRowTextHeight, h);
        rowH = Math.max(rowH, h + cellPad * 2 + 4);
      }
      const textInsetY = (rowH - maxRowTextHeight) / 2;

      doc.y = y;           // sync doc.y BEFORE ensureSpace check
      ensureSpace(rowH);
      y = doc.y;           // re-sync AFTER possible page break

      // Zebra stripe: fill even rows (0-indexed, so odd visual rows) with a tinted background
      if (zebraStripes && r % 2 === 1) {
        doc.save();
        doc.rect(startX, y, contentWidth, rowH).fill(zebraColor);
        doc.restore();
      }

      for (let c = 0; c < colCount; c++) {
        const cellX = startX + c * colWidth;
        await renderCellTokens(
          row[c], cellX + cellPad, y + textInsetY,
          textWidth, table.align[c] || 'left', false,
        );
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
        const spaceAbove = style.fontSize * sp.headingSpaceAbove;
        const spaceBelow = style.fontSize * sp.headingSpaceBelow;
        ensureSpace(spaceAbove + style.fontSize + spaceBelow);
        doc.moveDown(spaceAbove / doc.currentLineHeight());
        doc.font(safeFont(style.font)).fontSize(style.fontSize).fillColor(style.color);
        headingCtx = style;
        if (t.tokens && t.tokens.length > 0) {
          await renderInlineTokens(t.tokens, false, style.bold ?? false, style.italic ?? false);
        } else {
          renderText(t.text);
        }
        headingCtx = null;

        // Draw an underline beneath h1 and h2
        if (t.depth <= 2) {
          const lineY = doc.y + 2;
          doc.save();
          doc.strokeColor(theme.horizontalRuleColor).lineWidth(t.depth === 1 ? 1.5 : 1)
            .moveTo(margins.left, lineY)
            .lineTo(margins.left + contentWidth, lineY)
            .stroke();
          doc.restore();
          doc.y = lineY + 2;
        }

        doc.moveDown(spaceBelow / doc.currentLineHeight());
        resetBodyFont();
        break;
      }
      case 'paragraph': {
        const t = token as Tokens.Paragraph;
        ensureSpace(theme.body.fontSize * 2);
        resetBodyFont();
        await renderInlineTokens(t.tokens, false);
        doc.moveDown(sp.paragraphSpacing);
        break;
      }
      case 'code': {
        const t = token as Tokens.Code;
        const cs = theme.code.block;

        // ── Mermaid diagrams ──────────────────────────────────────────────
        if (t.lang === 'mermaid') {
          try {
            const mermaidTheme = theme.mermaid;
            const { renderMermaidToPng } = await import('./mermaid-renderer.js');
            const pngBuf = await renderMermaidToPng(t.text, mermaidTheme);
            const img = (doc as any).openImage(pngBuf) as { width: number; height: number };
            const maxHeight = doc.page.height - margins.top - margins.bottom;
            let displayWidth = Math.min(img.width, contentWidth);
            let displayHeight = img.height * (displayWidth / img.width);
            if (displayHeight > maxHeight) {
              displayHeight = maxHeight;
              displayWidth = img.width * (displayHeight / img.height);
            }
            ensureSpace(displayHeight + 10);
            const imgX = theme.imageAlign === 'center'
              ? margins.left + (contentWidth - displayWidth) / 2
              : doc.x;
            const imgY = doc.y;
            doc.image(pngBuf, imgX, imgY, { width: displayWidth, height: displayHeight });
            // Advance past the image — doc.image() does not move doc.y
            doc.y = imgY + displayHeight;
            doc.moveDown(0.5);
          } catch (err) {
            // Fallback: render as plain code block on error
            ensureSpace(20);
            resetBodyFont();
            doc.text(`[Mermaid diagram error: ${(err as Error).message}]`);
            doc.moveDown(0.3);
          }
          break;
        }

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
            font: safeFont(cs.font),
            fontSize: cs.fontSize,
            lineHeight: 1.5,
            padding: cs.padding,
            lineNumbers,
            drawBackground: true,
            theme: theme.syntaxHighlight,
            borderRadius: cs.borderRadius,
          });
          doc.x = margins.left;
          doc.y = newY;
          doc.moveDown(sp.codeBlockSpacing);
          resetBodyFont();
        } else {
          // Plain code block (no language or highlighting disabled)
          const lines = t.text.split('\n');
          const lineH = cs.fontSize * 1.4;
          const blockH = lines.length * lineH + cs.padding * 2;
          ensureSpace(blockH + 10);
          const x = margins.left;
          const y = doc.y;
          const cbRadius = cs.borderRadius ?? 0;
          doc.save();
          if (cbRadius > 0) {
            doc.roundedRect(x, y, contentWidth, blockH, cbRadius).fill(cs.backgroundColor);
          } else {
            doc.rect(x, y, contentWidth, blockH).fill(cs.backgroundColor);
          }
          doc.restore();
          doc.font(safeFont(cs.font)).fontSize(cs.fontSize).fillColor(cs.color);
          let textY = y + cs.padding;
          for (const line of lines) {
            doc.text(line, x + cs.padding, textY, { width: contentWidth - cs.padding * 2 });
            textY += lineH;
          }
          doc.x = margins.left;
          doc.y = y + blockH;
          doc.moveDown(sp.codeBlockSpacing);
          resetBodyFont();
        }
        break;
      }
      case 'blockquote': {
        const t = token as Tokens.Blockquote;
        const bq = theme.blockquote;
        ensureSpace(30);
        const bqPadding = bq.padding ?? 6;
        const startY = doc.y;
        doc.y += bqPadding; // add top padding before text
        const textX = margins.left + bq.borderWidth + bq.indent;
        const textWidth = contentWidth - bq.borderWidth - bq.indent;
        for (const child of t.tokens) {
          if (child.type === 'paragraph') {
            const p = child as Tokens.Paragraph;
            const font = bq.italic ? italicVariant(theme.body.font) : theme.body.font;
            doc.font(safeFont(font)).fontSize(theme.body.fontSize).fillColor(theme.body.color);
            doc.text('', textX, doc.y, { width: textWidth });
            await renderInlineTokens(p.tokens, false, false, bq.italic);
            doc.moveDown(sp.blockquoteSpacing);
          } else {
            await renderToken(child);
          }
        }
        doc.y += bqPadding; // add bottom padding after text
        const endY = doc.y;
        // Draw optional background fill behind blockquote area
        if (bq.backgroundColor) {
          doc.save();
          doc.rect(margins.left + bq.borderWidth, startY, contentWidth - bq.borderWidth, endY - startY).fill(bq.backgroundColor);
          doc.restore();
        }
        // Draw left border
        doc.save();
        doc.rect(margins.left, startY, bq.borderWidth, endY - startY).fill(bq.borderColor);
        doc.restore();
        doc.x = margins.left;
        doc.moveDown(sp.blockquoteSpacing);
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
        doc.moveDown(sp.hrSpacing);
        const y = doc.y;
        doc.save();
        doc.strokeColor(theme.horizontalRuleColor).lineWidth(1)
          .moveTo(margins.left, y)
          .lineTo(margins.left + contentWidth, y)
          .stroke();
        doc.restore();
        doc.y = y;
        doc.moveDown(sp.hrSpacing);
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

  // Clean up mermaid jsdom window if it was used
  try {
    const { cleanupMermaid } = await import('./mermaid-renderer.js');
    await cleanupMermaid();
  } catch {
    // mermaid-renderer may not be available in browser builds
  }

  doc.end();

  return new Promise<Buffer>((resolve) => {
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

