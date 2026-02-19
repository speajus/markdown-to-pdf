import type { ThemeConfig } from '../types.js';
import { defaultTheme } from '../styles.js';

export { defaultTheme } from '../styles.js';

/** Modern — clean sans-serif with teal accents */
export const modernTheme: ThemeConfig = {
  headings: {
    h1: { font: 'Helvetica-Bold', fontSize: 30, color: '#0d7377', bold: true },
    h2: { font: 'Helvetica-Bold', fontSize: 23, color: '#14919b', bold: true },
    h3: { font: 'Helvetica-Bold', fontSize: 18, color: '#0d7377', bold: true },
    h4: { font: 'Helvetica-Bold', fontSize: 15, color: '#14919b', bold: true },
    h5: { font: 'Helvetica-Bold', fontSize: 13, color: '#0d7377', bold: true },
    h6: { font: 'Helvetica-Bold', fontSize: 11, color: '#14919b', bold: true },
  },
  body: { font: 'Helvetica', fontSize: 11, color: '#2d3436', lineGap: 5 },
  code: {
    inline: { font: 'Courier', fontSize: 10, color: '#e17055', backgroundColor: '#ffeaa7' },
    block: { font: 'Courier', fontSize: 9, color: '#2d3436', backgroundColor: '#dfe6e9', padding: 10 },
  },
  blockquote: { borderColor: '#0d7377', borderWidth: 3, italic: true, indent: 20 },
  linkColor: '#0984e3',
  horizontalRuleColor: '#b2bec3',
  table: { headerBackground: '#dfe6e9', borderColor: '#b2bec3', cellPadding: 7 },
};

/** Academic — serif fonts, formal look inspired by LaTeX */
export const academicTheme: ThemeConfig = {
  headings: {
    h1: { font: 'Times-Bold', fontSize: 26, color: '#1a1a2e', bold: true },
    h2: { font: 'Times-Bold', fontSize: 21, color: '#16213e', bold: true },
    h3: { font: 'Times-Bold', fontSize: 17, color: '#1a1a2e', bold: true },
    h4: { font: 'Times-Bold', fontSize: 15, color: '#16213e', bold: true },
    h5: { font: 'Times-Bold', fontSize: 13, color: '#1a1a2e', bold: true },
    h6: { font: 'Times-Bold', fontSize: 11, color: '#16213e', bold: true },
  },
  body: { font: 'Times-Roman', fontSize: 12, color: '#1a1a2e', lineGap: 4 },
  code: {
    inline: { font: 'Courier', fontSize: 10, color: '#6c3483', backgroundColor: '#f4ecf7' },
    block: { font: 'Courier', fontSize: 9, color: '#1a1a2e', backgroundColor: '#f2f3f4', padding: 8 },
  },
  blockquote: { borderColor: '#6c3483', borderWidth: 2, italic: true, indent: 24 },
  linkColor: '#2e4057',
  horizontalRuleColor: '#aab7b8',
  table: { headerBackground: '#eaecee', borderColor: '#aab7b8', cellPadding: 6 },
};

/** Minimal — lots of whitespace, muted greys */
export const minimalTheme: ThemeConfig = {
  headings: {
    h1: { font: 'Helvetica-Bold', fontSize: 26, color: '#000000', bold: true },
    h2: { font: 'Helvetica-Bold', fontSize: 20, color: '#111111', bold: true },
    h3: { font: 'Helvetica-Bold', fontSize: 16, color: '#222222', bold: true },
    h4: { font: 'Helvetica-Bold', fontSize: 14, color: '#333333', bold: true },
    h5: { font: 'Helvetica-Bold', fontSize: 12, color: '#444444', bold: true },
    h6: { font: 'Helvetica-Bold', fontSize: 11, color: '#555555', bold: true },
  },
  body: { font: 'Helvetica', fontSize: 10, color: '#444444', lineGap: 5 },
  code: {
    inline: { font: 'Courier', fontSize: 9, color: '#555555', backgroundColor: '#f7f7f7' },
    block: { font: 'Courier', fontSize: 9, color: '#444444', backgroundColor: '#fafafa', padding: 10 },
  },
  blockquote: { borderColor: '#cccccc', borderWidth: 2, italic: false, indent: 18 },
  linkColor: '#555555',
  horizontalRuleColor: '#e0e0e0',
  table: { headerBackground: '#fafafa', borderColor: '#e0e0e0', cellPadding: 8 },
};

/** Ocean — deep blue palette */
export const oceanTheme: ThemeConfig = {
  headings: {
    h1: { font: 'Helvetica-Bold', fontSize: 28, color: '#1b4f72', bold: true },
    h2: { font: 'Helvetica-Bold', fontSize: 22, color: '#1a5276', bold: true },
    h3: { font: 'Helvetica-Bold', fontSize: 18, color: '#21618c', bold: true },
    h4: { font: 'Helvetica-Bold', fontSize: 16, color: '#2874a6', bold: true },
    h5: { font: 'Helvetica-Bold', fontSize: 14, color: '#2e86c1', bold: true },
    h6: { font: 'Helvetica-Bold', fontSize: 12, color: '#3498db', bold: true },
  },
  body: { font: 'Helvetica', fontSize: 11, color: '#2c3e50', lineGap: 4 },
  code: {
    inline: { font: 'Courier', fontSize: 10, color: '#c0392b', backgroundColor: '#eaf2f8' },
    block: { font: 'Courier', fontSize: 9, color: '#2c3e50', backgroundColor: '#eaf2f8', padding: 8 },
  },
  blockquote: { borderColor: '#2980b9', borderWidth: 3, italic: true, indent: 20 },
  linkColor: '#2471a3',
  horizontalRuleColor: '#aed6f1',
  table: { headerBackground: '#d4e6f1', borderColor: '#85c1e9', cellPadding: 6 },
};

/** Record of all built-in themes keyed by display name */
export const themes: Record<string, ThemeConfig> = {
  Default: defaultTheme,
  Modern: modernTheme,
  Academic: academicTheme,
  Minimal: minimalTheme,
  Ocean: oceanTheme,
};

