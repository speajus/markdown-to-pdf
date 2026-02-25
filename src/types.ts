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
  borderRadius?: number;
}

export interface BlockquoteStyle {
  borderColor: string;
  borderWidth: number;
  italic: boolean;
  indent: number;
  backgroundColor?: string;
  padding?: number;
}

export interface TableStyles {
  headerBackground: string;
  borderColor: string;
  cellPadding: number;
  /** Background color for alternating (even) body rows when zebra striping is enabled.
   *  @default '#f9f9f9'
   */
  zebraColor?: string;
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

export interface SpacingConfig {
  headingSpaceAbove?: number;
  headingSpaceBelow?: number;
  paragraphSpacing?: number;
  listItemSpacing?: number;
  listIndent?: number;
  blockquoteSpacing?: number;
  codeBlockSpacing?: number;
  hrSpacing?: number;
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
  /** Configurable spacing multipliers and indentation values. */
  spacing?: SpacingConfig;
  /** Image horizontal alignment. */
  imageAlign?: 'left' | 'center';
  /** Emoji font to use for rendering emoji characters.
   * - `'twemoji'` (default) — use the bundled Twemoji.Mozilla.ttf color emoji font.
   * - `'none'` — disable emoji font; emoji render with the body font.
   */
  emojiFont?: 'twemoji' | 'none';
}

/**
 * A custom font definition providing font data for registration with PDFKit.
 *
 * Supply at minimum a `name` and `regular` buffer.  Missing bold / italic /
 * bold-italic variants fall back: boldItalic → bold → regular,
 * italic → regular, bold → regular.
 */
export interface CustomFontDefinition {
  /** The name to use in ThemeConfig font fields (e.g. 'Roboto'). */
  name: string;
  /** Regular weight font data. */
  regular: Buffer;
  /** Bold variant (falls back to regular). */
  bold?: Buffer;
  /** Italic variant (falls back to regular). */
  italic?: Buffer;
  /** Bold-italic variant (falls back to bold or regular). */
  boldItalic?: Buffer;
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
   * Show line numbers in fenced code blocks.
   *
   * Only applies when `syntaxHighlight` is enabled and the code block
   * specifies a language.
   *
   * @default false
   */
  lineNumbers?: boolean;
  /**
   * Enable zebra striping (alternating row backgrounds) on tables.
   *
   * The stripe color is controlled by `theme.table.zebraColor`.
   *
   * @default true
   */
  zebraStripes?: boolean;
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
   * Custom font definitions to register with PDFKit.
   *
   * Each entry provides font data (as `Buffer`s) for a named font family
   * with optional bold, italic, and bold-italic variants.  The `name` can
   * then be used in any `ThemeConfig` font field (e.g. `body.font`).
   */
  customFonts?: CustomFontDefinition[];
}

