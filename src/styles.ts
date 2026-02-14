import type { ThemeConfig, PageLayout } from './types.js';

export const defaultTheme: ThemeConfig = {
  headings: {
    h1: { font: 'Helvetica-Bold', fontSize: 28, color: '#1a1a1a', bold: true },
    h2: { font: 'Helvetica-Bold', fontSize: 22, color: '#2a2a2a', bold: true },
    h3: { font: 'Helvetica-Bold', fontSize: 18, color: '#3a3a3a', bold: true },
    h4: { font: 'Helvetica-Bold', fontSize: 16, color: '#4a4a4a', bold: true },
    h5: { font: 'Helvetica-Bold', fontSize: 14, color: '#5a5a5a', bold: true },
    h6: { font: 'Helvetica-Bold', fontSize: 12, color: '#6a6a6a', bold: true },
  },
  body: {
    font: 'Helvetica',
    fontSize: 11,
    color: '#333333',
    lineGap: 4,
  },
  code: {
    inline: {
      font: 'Courier',
      fontSize: 10,
      color: '#c7254e',
      backgroundColor: '#f9f2f4',
    },
    block: {
      font: 'Courier',
      fontSize: 9,
      color: '#333333',
      backgroundColor: '#f5f5f5',
      padding: 8,
    },
  },
  blockquote: {
    borderColor: '#3498db',
    borderWidth: 3,
    italic: true,
    indent: 20,
  },
  linkColor: '#2980b9',
  horizontalRuleColor: '#cccccc',
  table: {
    headerBackground: '#f0f0f0',
    borderColor: '#cccccc',
    cellPadding: 6,
  },
};

export const defaultPageLayout: PageLayout = {
  pageSize: 'LETTER',
  margins: {
    top: 50,
    right: 50,
    bottom: 50,
    left: 50,
  },
};

