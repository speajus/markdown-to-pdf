import type { ThemeConfig, PageLayout, SyntaxHighlightTheme } from './types.js';

/** Xcode-light inspired syntax highlighting palette — used as the default. */
export const defaultSyntaxHighlightTheme: SyntaxHighlightTheme = {
  background: '#f5f5f5',
  gutter: '#8e8e93',
  defaultText: '#000000',
  lineHighlight: '#ecf5ff',

  tokens: {
    comment: '#8e8e93',
    prolog: '#8e8e93',
    doctype: '#8e8e93',
    cdata: '#8e8e93',

    keyword: '#ad3da4',
    'control-flow': '#ad3da4',
    builtin: '#3e6d8e',

    'class-name': '#3e6d8e',
    function: '#326d74',
    'function-variable': '#326d74',

    string: '#c41a16',
    'template-string': '#c41a16',
    'template-punctuation': '#c41a16',
    regex: '#e44d2e',

    number: '#1c00cf',
    boolean: '#ad3da4',
    null: '#ad3da4',
    undefined: '#ad3da4',

    operator: '#000000',
    punctuation: '#000000',
    parameter: '#000000',
    property: '#326d74',
    'literal-property': '#326d74',

    annotation: '#643820',
    'generic-function': '#326d74',

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

