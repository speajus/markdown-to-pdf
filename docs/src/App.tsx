import { useState, useCallback, useRef, useEffect } from 'react';
import { BrowserPdfRenderer } from './BrowserPdfRenderer';
import MDEditor from '@uiw/react-md-editor';
import { themes, defaultTheme } from '../../src/browser';
import type { ThemeConfig, CustomFontDefinition } from '../../src/browser';
import { ThemeCreator } from './components/ThemeCreator';
import {
  loadCustomThemes,
  deleteCustomTheme as deleteStoredTheme,
  type StoredTheme,
} from './services/themeStorage';
import { fetchGoogleFontBuffers } from './services/googleFonts';
import '@uiw/react-md-editor/markdown-editor.css';
import './App.css';

const defaultMarkdown = `# Welcome to Markdown to PDF Editor 🚀

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

const builtinThemeNames = Object.keys(themes);

function App() {
  const [markdown, setMarkdown] = useState<string | undefined>(defaultMarkdown);
  const [themeName, setThemeName] = useState<string>('Default');
  const [customThemes, setCustomThemes] = useState<StoredTheme[]>([]);
  const [customFonts, setCustomFonts] = useState<CustomFontDefinition[]>([]);
  const [editorWidthPercent, setEditorWidthPercent] = useState(50);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creatorEditing, setCreatorEditing] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<ThemeConfig | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Load custom themes from localStorage on mount
  useEffect(() => {
    const stored = loadCustomThemes();
    setCustomThemes(stored);
    // Fetch Google Fonts used by custom themes
    for (const t of stored) {
      for (const family of t.fontFamilies) {
        fetchGoogleFontBuffers(family)
          .then((buffers) => {
            const def: CustomFontDefinition = {
              name: family,
              regular: buffers.regular,
              bold: buffers.bold ?? undefined,
              italic: buffers.italic ?? undefined,
              boldItalic: buffers.boldItalic ?? undefined,
            };
            setCustomFonts((prev) =>
              prev.some((f) => f.name === family) ? prev : [...prev, def],
            );
          })
          .catch((err) => console.warn(`Failed to load font "${family}":`, err));
      }
    }
  }, []);

  // Resolve the active theme config
  const allThemeNames = [...builtinThemeNames, ...customThemes.map((t) => t.name)];
  const isCustomTheme = !builtinThemeNames.includes(themeName);

  function resolveTheme(name: string): ThemeConfig {
    if (themes[name]) return themes[name];
    const custom = customThemes.find((t) => t.name === name);
    return custom?.config ?? defaultTheme;
  }

  // The theme used for rendering: preview override or resolved
  const activeTheme = previewConfig ?? resolveTheme(themeName);

  // Font load handler for ThemeCreator
  function handleFontLoad(fontDef: CustomFontDefinition) {
    setCustomFonts((prev) =>
      prev.some((f) => f.name === fontDef.name) ? prev : [...prev, fontDef],
    );
  }

  // Theme creator callbacks
  function handleOpenCreator(editing: boolean) {
    setCreatorEditing(editing);
    setCreatorOpen(true);
  }

  function handleCreatorSave(name: string, _config: ThemeConfig, _fontFamilies: string[]) {
    setCreatorOpen(false);
    setPreviewConfig(null);
    // Reload from storage
    const stored = loadCustomThemes();
    setCustomThemes(stored);
    setThemeName(name);
  }

  function handleCreatorDelete(name: string) {
    setCreatorOpen(false);
    setPreviewConfig(null);
    deleteStoredTheme(name);
    setCustomThemes(loadCustomThemes());
    setThemeName('Default');
  }

  function handleCreatorClose() {
    setCreatorOpen(false);
    setPreviewConfig(null);
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !contentRef.current) return;
      const rect = contentRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      setEditorWidthPercent(Math.min(80, Math.max(20, percent)));
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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
              {allThemeNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button className="theme-btn" onClick={() => handleOpenCreator(false)}>
              Create Theme
            </button>
            {isCustomTheme && (
              <>
                <button className="theme-btn" onClick={() => handleOpenCreator(true)}>
                  Edit
                </button>
                <button className="theme-btn danger" onClick={() => handleCreatorDelete(themeName)}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
        <div className="info">Edit markdown on the left, see PDF preview on the right</div>
      </div>

      <div className="content" ref={contentRef}>
        <div className="editor-panel" style={{ width: `${editorWidthPercent}%` }}>
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

        <div className="divider" onMouseDown={handleMouseDown} />

        <div className="preview-panel" style={{ width: `${100 - editorWidthPercent}%` }}>
          <div className="panel-header">PDF Preview (Live)</div>
          <div className="pdf-viewer">
            <BrowserPdfRenderer
              markdown={markdown ?? ''}
              theme={activeTheme}
              customFonts={customFonts}
            />
          </div>
        </div>
      </div>

      {creatorOpen && (
        <ThemeCreator
          initialConfig={resolveTheme(themeName)}
          initialName={creatorEditing ? themeName : ''}
          isEditing={creatorEditing}
          onPreview={setPreviewConfig}
          onSave={handleCreatorSave}
          onDelete={handleCreatorDelete}
          onClose={handleCreatorClose}
          onFontLoad={handleFontLoad}
        />
      )}
    </div>
  );
}

export default App;

