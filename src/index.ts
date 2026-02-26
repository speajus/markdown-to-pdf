export type {
  TextStyle,
  PageLayout,
  CodeStyle,
  CodeBlockStyle,
  BlockquoteStyle,
  TableStyles,
  TokenColors,
  SyntaxHighlightTheme,
  SpacingConfig,
  ThemeConfig,
  PdfOptions,
  CustomFontDefinition,
  MermaidThemeConfig,
} from './types.js';

export { defaultTheme, defaultPageLayout, defaultSyntaxHighlightTheme, defaultSpacing } from './styles.js';
export {
  renderMarkdownToPdf as generatePdf,
  renderMarkdownToPdf,
} from "./renderer.js";
export { createBrowserImageRenderer } from './browser-image-renderer.js';
export { createNodeImageRenderer } from './node-image-renderer.js';
export { loadHighlightLanguages } from './highlight.prism.js';

