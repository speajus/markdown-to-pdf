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
  syntaxHighlight: {
    background: '#e8f0f2',
    gutter: '#636e72',
    defaultText: '#2d3436',
    lineHighlight: '#d4e6ec',
    tokens: {
      comment: '#636e72', prolog: '#636e72', doctype: '#636e72', cdata: '#636e72',
      keyword: '#0984e3', 'control-flow': '#6c5ce7', builtin: '#00a388',
      'class-name': '#e17055', function: '#e17055', 'function-variable': '#e17055',
      string: '#00a388', 'template-string': '#00a388', 'template-punctuation': '#00a388', regex: '#d63031',
      number: '#6c5ce7', boolean: '#0984e3', null: '#0984e3', undefined: '#0984e3',
      operator: '#636e72', punctuation: '#636e72', parameter: '#2d3436', property: '#6c5ce7',
      'literal-property': '#6c5ce7', annotation: '#0984e3', 'generic-function': '#e17055',
      default: '#2d3436',
    },
  },
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
  syntaxHighlight: {
    background: '#f2f3f4',
    gutter: '#7f8c8d',
    defaultText: '#1a1a2e',
    lineHighlight: '#e8e8ec',
    tokens: {
      comment: '#7f8c8d', prolog: '#7f8c8d', doctype: '#7f8c8d', cdata: '#7f8c8d',
      keyword: '#6c3483', 'control-flow': '#8e44ad', builtin: '#27ae60',
      'class-name': '#c0392b', function: '#c0392b', 'function-variable': '#c0392b',
      string: '#27ae60', 'template-string': '#27ae60', 'template-punctuation': '#27ae60', regex: '#e67e22',
      number: '#8e44ad', boolean: '#6c3483', null: '#6c3483', undefined: '#6c3483',
      operator: '#7f8c8d', punctuation: '#7f8c8d', parameter: '#1a1a2e', property: '#8e44ad',
      'literal-property': '#8e44ad', annotation: '#6c3483', 'generic-function': '#c0392b',
      default: '#1a1a2e',
    },
  },
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
  syntaxHighlight: {
    background: '#f8f8f8',
    gutter: '#999999',
    defaultText: '#333333',
    lineHighlight: '#f0f0f0',
    tokens: {
      comment: '#999999', prolog: '#999999', doctype: '#999999', cdata: '#999999',
      keyword: '#333333', 'control-flow': '#333333', builtin: '#555555',
      'class-name': '#555555', function: '#333333', 'function-variable': '#333333',
      string: '#666666', 'template-string': '#666666', 'template-punctuation': '#666666', regex: '#777777',
      number: '#444444', boolean: '#333333', null: '#333333', undefined: '#333333',
      operator: '#333333', punctuation: '#666666', parameter: '#555555', property: '#555555',
      'literal-property': '#555555', annotation: '#333333', 'generic-function': '#333333',
      default: '#333333',
    },
  },
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
  syntaxHighlight: {
    background: '#eaf2f8',
    gutter: '#5d6d7e',
    defaultText: '#1b2631',
    lineHighlight: '#d4e6f1',
    tokens: {
      comment: '#5d6d7e', prolog: '#5d6d7e', doctype: '#5d6d7e', cdata: '#5d6d7e',
      keyword: '#2471a3', 'control-flow': '#7d3c98', builtin: '#1e8449',
      'class-name': '#c0392b', function: '#c0392b', 'function-variable': '#c0392b',
      string: '#1e8449', 'template-string': '#1e8449', 'template-punctuation': '#1e8449', regex: '#d35400',
      number: '#7d3c98', boolean: '#2471a3', null: '#2471a3', undefined: '#2471a3',
      operator: '#5d6d7e', punctuation: '#5d6d7e', parameter: '#1b2631', property: '#7d3c98',
      'literal-property': '#7d3c98', annotation: '#2471a3', 'generic-function': '#c0392b',
      default: '#1b2631',
    },
  },
};

/** Record of all built-in themes keyed by display name */
export const themes: Record<string, ThemeConfig> = {
  Default: defaultTheme,
  Modern: modernTheme,
  Academic: academicTheme,
  Minimal: minimalTheme,
  Ocean: oceanTheme,
};

