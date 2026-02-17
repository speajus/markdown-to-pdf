/**
 * Browser-specific entry point that excludes Node.js dependencies
 */
import { renderMarkdownToPdf } from "./renderer.js";
export { createBrowserImageRenderer } from "./browser-image-renderer.js";


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
export { renderMarkdownToPdf } from "./renderer.js";
