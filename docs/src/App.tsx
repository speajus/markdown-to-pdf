import { useState } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { MarkdownPDF } from './MarkdownPDF';
import MDEditor from '@uiw/react-md-editor';
import './App.css';

const defaultMarkdown = `# Welcome to Markdown to PDF Editor

This is a **live editor** where you can test the markdown-to-pdf conversion entirely in your browser!

## Features

- **Bold text** and *italic text*
- \`inline code\` and code blocks
- Lists (ordered and unordered)
- Tables
- Links
- Blockquotes
- And more!

## Sample Code Block

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## Sample Table

| Feature | Supported |
|---------|-----------|
| Headers | ✓ |
| Lists | ✓ |
| Tables | ✓ |
| Code | ✓ |

## Sample List

1. First item
2. Second item
   - Nested item
   - Another nested item
3. Third item

---

> This is a blockquote. You can use it to highlight important information.

Try editing this markdown and click **Generate PDF** to see the result!

Press **Ctrl/Cmd + Enter** to quickly generate the PDF.
`;

function App() {
  const [markdown, setMarkdown] = useState(defaultMarkdown);

  return (
    <div className="container">
      <div className="header">
        <h1>📝 Markdown to PDF Editor</h1>
        <div className="info">Edit markdown on the left, see PDF preview on the right</div>
      </div>

      <div className="content">
        <div className="editor-panel">
          <div className="panel-header">Markdown Editor</div>
          <div className="editor-wrapper">
            <MDEditor
              value={markdown}
              onChange={(val) => setMarkdown(val || '')}
              height="100%"
              preview="edit"
              hideToolbar={false}
            />
          </div>
        </div>

        <div className="preview-panel">
          <div className="panel-header">PDF Preview (Live)</div>
          <PDFViewer className="pdf-viewer">
            <MarkdownPDF markdown={markdown} />
          </PDFViewer>
        </div>
      </div>
    </div>
  );
}

export default App;

