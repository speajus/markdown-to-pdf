/**
 * Browser-specific entry point that excludes Node.js dependencies
 */
export { createBrowserImageRenderer } from "./browser-image-renderer.js";
export { createBrowserColorEmojiRenderer } from './color-emoji.js';


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
  ColorEmojiRenderer,
  CustomFontDefinition,
} from './types.js';

export { defaultTheme, defaultPageLayout, defaultSyntaxHighlightTheme, defaultSpacing } from './styles.js';
export { themes, modernTheme, academicTheme, minimalTheme, oceanTheme } from './themes/index.js';
export { renderMarkdownToPdf } from "./renderer.js";
