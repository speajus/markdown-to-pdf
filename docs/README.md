# Markdown to PDF - Live Demo

This is an interactive demo application for testing the markdown-to-pdf conversion in the browser.

## Features

- **Live Markdown Editor**: Uses [@uiw/react-md-editor](https://github.com/uiwjs/react-md-editor) for a rich markdown editing experience with syntax highlighting and toolbar
- **Real-time PDF Preview**: Uses [@react-pdf/renderer](https://react-pdf.org/) to generate and display PDFs directly in the browser
- **No Server Required**: All PDF generation happens client-side in the browser
- **Full Markdown Support**: Supports headings, lists, tables, code blocks, blockquotes, links, and inline formatting

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

This will start the Vite development server. Open the URL shown in the terminal (usually http://localhost:5173) to use the editor.

### Build for Production

```bash
npm run build
```

The built files will be in `../dist-docs`.

### Preview Production Build

```bash
npm run preview
```

## How It Works

1. **Markdown Editor**: The left panel uses `@uiw/react-md-editor` which provides a feature-rich markdown editing experience
2. **PDF Generation**: The markdown is parsed using `marked` and converted to React components
3. **PDF Rendering**: `@react-pdf/renderer` renders the React components as a PDF document
4. **Live Preview**: The PDF is displayed in real-time using `PDFViewer` component

## Technology Stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **@uiw/react-md-editor**: Markdown editor component
- **@react-pdf/renderer**: PDF generation library
- **marked**: Markdown parser

## Usage

1. Edit the markdown in the left panel
2. See the PDF preview update in real-time on the right
3. The PDF includes all standard markdown features like headings, lists, tables, code blocks, etc.

## Customization

You can customize the PDF styling by editing `src/MarkdownPDF.tsx` and modifying the `StyleSheet.create()` styles.

