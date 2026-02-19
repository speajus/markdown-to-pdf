export interface TextStyle {
  font: string;
  fontSize: number;
  color: string;
  lineGap?: number;
  bold?: boolean;
  italic?: boolean;
}

export interface PageLayout {
  pageSize: string;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface CodeStyle {
  font: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
}

export interface CodeBlockStyle extends CodeStyle {
  padding: number;
}

export interface BlockquoteStyle {
  borderColor: string;
  borderWidth: number;
  italic: boolean;
  indent: number;
}

export interface TableStyles {
  headerBackground: string;
  borderColor: string;
  cellPadding: number;
}

export interface ThemeConfig {
  headings: {
    h1: TextStyle;
    h2: TextStyle;
    h3: TextStyle;
    h4: TextStyle;
    h5: TextStyle;
    h6: TextStyle;
  };
  body: TextStyle;
  code: {
    inline: CodeStyle;
    block: CodeBlockStyle;
  };
  blockquote: BlockquoteStyle;
  linkColor: string;
  horizontalRuleColor: string;
  table: TableStyles;
}

export interface PdfOptions {
  theme?: ThemeConfig;
  pageLayout?: PageLayout;
  /** Base directory for resolving relative image paths */
  basePath?: string;
  /**
   * Custom image renderer function.
   * Takes an image URL/path and returns a Buffer containing the image data (PNG/JPEG).
   * If not provided, a default Node.js implementation will be used.
   */
  renderImage?: (imageUrl: string) => Promise<Buffer>;
  /**
   * Enable syntax highlighting for fenced code blocks with a language tag.
   * Uses Prism.js for tokenization. Supported languages: javascript, typescript, java.
   * @default true
   */
  syntaxHighlight?: boolean;
  /**
   * Emoji font configuration.
   *
   * - `true` (default) — use the bundled Noto Emoji font (Node.js only;
   *   silently skipped in browser environments).
   * - `false` — disable emoji font switching; emoji will render with the
   *   current body font (which usually means missing glyphs).
   * - A `string` path to a custom `.ttf` / `.otf` emoji font file (Node.js).
   * - A `Buffer` containing raw font data (works in both Node.js and browser).
   *
   * @default true
   */
  emojiFont?: boolean | string | Buffer;
}

