import { useState } from 'react';
import { BrowserPdfRenderer } from './BrowserPdfRenderer';
import MDEditor from '@uiw/react-md-editor';
import { themes } from '../../src/browser';
import '@uiw/react-md-editor/markdown-editor.css';
import './App.css';

const defaultMarkdown = `# Welcome to Markdown to PDF Editor

This is a **live editor** where you can test the markdown-to-pdf conversion entirely in your browser!

## Features

- **Bold text** and *italic text*
- \`inline code\` and code blocks with **syntax highlighting**
- Lists (ordered and unordered)
- Tables, Links, Blockquotes, and more!

## Syntax Highlighted Code

Fenced code blocks with a language tag are automatically syntax highlighted.

### JavaScript

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Print the first 10 Fibonacci numbers
const results = [];
for (let i = 0; i < 10; i++) {
  results.push(fibonacci(i));
}
console.log("Fibonacci:", results);
\`\`\`

### TypeScript

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

async function fetchUser(id: number): Promise<User> {
  const response = await fetch(\\\`/api/users/\\\${id}\\\`);
  if (!response.ok) {
    throw new Error("User not found");
  }
  return response.json();
}
\`\`\`

### Plain Code Block (no highlighting)

\`\`\`
This is a plain code block without a language tag.
It uses the default monospace style with no syntax colors.
\`\`\`

## Sample Table

| Feature | Supported |
|---------|-----------|
| Headers | Yes |
| Lists | Yes |
| Tables | Yes |
| Syntax Highlighting | Yes |

## Sample List

1. First item
2. Second item
   - Nested item
   - Another nested item
3. Third item

---

> This is a blockquote. You can use it to highlight important information.

## Emoji Support 🎉

Emoji characters render correctly in the PDF:

- 🚀 Rocket launch
- ✅ Task complete
- 🎯 Hit the target
- 👋🏻 Wave (with skin tone)

| Status | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In progress |
| ❌ | Blocked |

> 💬 Blockquotes with emoji work too!

## Sample Images

**SVG image:**

![SVG logo](https://upload.wikimedia.org/wikipedia/commons/0/02/SVG_logo.svg)

**PNG image:**

![PNG demo](https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png)

Try editing this markdown and see the PDF preview update live!
`;

const themeNames = Object.keys(themes);

function App() {
  const [markdown, setMarkdown] = useState<string | undefined>(defaultMarkdown);
  const [themeName, setThemeName] = useState<string>('Default');

  return (
    <div className="container">
      <div className="header">
        <div className="header-top">
          <h1>📝 Markdown to PDF Editor</h1>
          <div className="theme-selector">
            <label htmlFor="theme-select">Theme:</label>
            <select
              id="theme-select"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
            >
              {themeNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="info">Edit markdown on the left, see PDF preview on the right</div>
      </div>

      <div className="content">
        <div className="editor-panel">
          <div className="panel-header">Markdown Editor</div>
          <div className="editor-wrapper" style={{ height:'100%', overflow:'visible' }}>
            <MDEditor
              value={markdown}
              onChange={setMarkdown}
              preview="edit"
              highlightEnable={false}
              style={{ flex: 1 }} 
               height="100%"
  visibleDragbar={false}
  overflow={false}
             
            />
          </div>
        </div>

        <div className="preview-panel">
          <div className="panel-header">PDF Preview (Live)</div>
          <div className="pdf-viewer">
            <BrowserPdfRenderer markdown={markdown??''} theme={themes[themeName]} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

