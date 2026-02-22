import type { ThemeConfig, PageLayout, SyntaxHighlightTheme } from './types.js';

/** Prism.js default light theme — used as the default (print-friendly). */
export const defaultSyntaxHighlightTheme: SyntaxHighlightTheme = {
  background: '#f5f2f0',
  gutter: '#708090',
  defaultText: '#000000',
  lineHighlight: '#b3d4fc',

  tokens: {
    comment: '#708090',
    prolog: '#708090',
    doctype: '#708090',
    cdata: '#708090',

    keyword: '#0077aa',
    'control-flow': '#0077aa',
    builtin: '#669900',

    'class-name': '#DD4A68',
    function: '#DD4A68',
    'function-variable': '#DD4A68',

    string: '#669900',
    'template-string': '#669900',
    'template-punctuation': '#669900',
    regex: '#ee9900',

    number: '#990055',
    boolean: '#990055',
    null: '#990055',
    undefined: '#990055',

    operator: '#9a6e3a',
    punctuation: '#999999',
    parameter: '#000000',
    property: '#990055',
    'literal-property': '#990055',

    annotation: '#0077aa',
    'generic-function': '#DD4A68',

    default: '#000000',
  },
};

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
  syntaxHighlight: defaultSyntaxHighlightTheme,
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

