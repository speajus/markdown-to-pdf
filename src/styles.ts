import type { ThemeConfig, PageLayout, SyntaxHighlightTheme } from './types.js';

/** VS Code Dark+ inspired syntax highlighting palette — used as the default. */
export const defaultSyntaxHighlightTheme: SyntaxHighlightTheme = {
  background: '#1e1e1e',
  gutter: '#858585',
  defaultText: '#d4d4d4',
  lineHighlight: '#2a2a2a',

  tokens: {
    comment: '#6a9955',
    prolog: '#6a9955',
    doctype: '#6a9955',
    cdata: '#6a9955',

    keyword: '#569cd6',
    'control-flow': '#c586c0',
    builtin: '#4ec9b0',

    'class-name': '#4ec9b0',
    function: '#dcdcaa',
    'function-variable': '#dcdcaa',

    string: '#ce9178',
    'template-string': '#ce9178',
    'template-punctuation': '#ce9178',
    regex: '#d16969',

    number: '#b5cea8',
    boolean: '#569cd6',
    null: '#569cd6',
    undefined: '#569cd6',

    operator: '#d4d4d4',
    punctuation: '#d4d4d4',
    parameter: '#9cdcfe',
    property: '#9cdcfe',
    'literal-property': '#9cdcfe',

    annotation: '#dcdcaa',
    'generic-function': '#dcdcaa',

    default: '#d4d4d4',
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

