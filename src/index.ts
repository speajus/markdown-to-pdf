export type {
  TextStyle,
  PageLayout,
  CodeStyle,
  CodeBlockStyle,
  BlockquoteStyle,
  TableStyles,
  TokenColors,
  SyntaxHighlightTheme,
  ThemeConfig,
  PdfOptions,
} from './types.js';

export { defaultTheme, defaultPageLayout, defaultSyntaxHighlightTheme } from './styles.js';
export {
  renderMarkdownToPdf as generatePdf,
  renderMarkdownToPdf,
} from "./renderer.js";
export { createBrowserImageRenderer } from './browser-image-renderer.js';
export { createNodeImageRenderer } from './node-image-renderer.js';

