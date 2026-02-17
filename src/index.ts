export type {
  TextStyle,
  PageLayout,
  CodeStyle,
  CodeBlockStyle,
  BlockquoteStyle,
  TableStyles,
  ThemeConfig,
  PdfOptions,
} from './types.js';

export { defaultTheme, defaultPageLayout } from './styles.js';
export {
  renderMarkdownToPdf as generatePdf,
  renderMarkdownToPdf,
} from "./renderer.js";
export { createBrowserImageRenderer } from './browser-image-renderer.js';

