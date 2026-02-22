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

export interface TokenColors {
  [key: string]: string;
}

export interface SyntaxHighlightTheme {
  background: string;
  gutter: string;
  defaultText: string;
  lineHighlight: string;
  tokens: TokenColors;
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
  /**
   * Syntax highlighting colors for fenced code blocks.
   * When omitted, falls back to a VS Code Dark+ inspired palette.
   */
  syntaxHighlight?: SyntaxHighlightTheme;
}

/** Converts a single emoji string to a PNG `Buffer`. */
export type ColorEmojiRenderer = (emoji: string) => Promise<Buffer>;

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
   * Uses Prism.js for tokenization.
   * @default true
   */
  syntaxHighlight?: boolean;
  /**
   * Which Prism.js language grammars to load for syntax highlighting.
   *
   * - `undefined` (default) — load **all** available Prism.js languages (~300).
   * - An array of language identifiers (e.g. `['javascript', 'python', 'bash']`)
   *   to load only the specified grammars (and their dependencies).
   *
   * Has no effect when `syntaxHighlight` is `false`.
   */
  languages?: string[];
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
  /**
   * Color emoji renderer.
   *
   * When provided, emoji characters are rendered as inline color PNG images
   * (sourced from Twemoji SVGs) instead of monochrome font glyphs.
   *
   * Use `createNodeColorEmojiRenderer()` (Node.js) or
   * `createBrowserColorEmojiRenderer()` (browser) to obtain a renderer.
   *
   * Takes priority over `emojiFont` for emoji that are successfully rendered.
   * Emoji that fail to render (e.g. missing from Twemoji) fall back to the
   * monochrome font or the body font.
   */
  colorEmoji?: ColorEmojiRenderer;
}

