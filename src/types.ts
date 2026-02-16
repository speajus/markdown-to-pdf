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
}

