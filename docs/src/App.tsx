import { useState, useCallback, useRef, useEffect } from 'react';
import { BrowserPdfRenderer } from './BrowserPdfRenderer';
import MDEditor from '@uiw/react-md-editor';
import { themes, defaultTheme } from '../../src/browser';
import {
  loadCustomThemes,
  deleteCustomTheme as deleteStoredTheme,
  type StoredTheme,
} from './services/themeStorage';
import { fetchGoogleFontBuffers } from './services/googleFonts';
import type { ThemeConfig, CustomFontDefinition } from '../../src/browser';
import { ThemeCreator } from './components/ThemeCreator';
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

## Mermaid Diagrams

Fenced code blocks with the \\\`mermaid\\\` language are automatically rendered as diagrams. Supported types include flowchart, sequence, class, state, ER, gantt, pie, and mindmap.

\`\`\`mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process A]
    B -->|No| D[Process B]
    C --> E[Result]
    D --> E
    E --> F[End]
\`\`\`

\`\`\`mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB
    Client->>API: POST /login
    API->>DB: Query user
    DB-->>API: User record
    API-->>Client: JWT token
\`\`\`

\`\`\`mermaid
pie title Time Allocation
    "Development" : 40
    "Testing" : 20
    "Design" : 15
    "Documentation" : 10
    "Meetings" : 15
\`\`\`

> Mermaid diagrams are rendered via [@speajus/mermaid-to-svg](https://github.com/speajus/mermaid-to-svg) and work in both Node.js and browser environments.

## Sample Images

**SVG image:**

![SVG logo](https://upload.wikimedia.org/wikipedia/commons/0/02/SVG_logo.svg)

**PNG image:**

![PNG demo](https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png)

## Load External Markdown

You can load markdown from a URL using query parameters:

- **\`?url=\`** — load markdown from a URL (supports http, data URIs, and GitHub Gists)
- **\`?theme=\`** — set the PDF theme (Default, Modern, Academic, Minimal, Ocean)
- **\`?download\`** — automatically download the PDF on load

### Examples

- [Load this project's README](./?url=https://raw.githubusercontent.com/speajus/markdown-to-pdf/main/README.md)
- [README with Ocean theme](./?url=https://raw.githubusercontent.com/speajus/markdown-to-pdf/main/README.md&theme=Ocean)
- [README with Modern theme + auto-download](./?url=https://raw.githubusercontent.com/speajus/markdown-to-pdf/main/README.md&theme=Modern&download)

---

Try editing this markdown and see the PDF preview update live!
`;

/**
 * Decode a `data:` URI into its text content.
 * Supports `base64` encoding and plain text (with optional charset).
 */
function decodeDataUrl(url: string): string {
  // data:[<mediatype>][;base64],<data>
  const commaIdx = url.indexOf(',');
  if (commaIdx === -1) throw new Error('Invalid data URL: missing comma');
  const meta = url.slice(5, commaIdx); // after "data:"
  const encoded = url.slice(commaIdx + 1);
  if (meta.endsWith(';base64')) {
    return atob(encoded);
  }
  return decodeURIComponent(encoded);
}

/**
 * If the URL points to a GitHub Gist page, convert it to the raw content URL.
 */
function resolveGistUrl(url: string): string {
  const match = url.match(/^https:\/\/gist\.github\.com\/([^/]+)\/([^/]+)\/?$/);
  if (match) {
    return `https://gist.githubusercontent.com/${match[1]}/${match[2]}/raw`;
  }
  return url;
}

const builtinThemeNames = Object.keys(themes);

function App() {
  const [markdown, setMarkdown] = useState<string | undefined>(defaultMarkdown);
  const [themeName, setThemeName] = useState<string>('Default');
  const [customThemes, setCustomThemes] = useState<StoredTheme[]>([]);
  const [customFonts, setCustomFonts] = useState<CustomFontDefinition[]>([]);
  const [editorWidthPercent, setEditorWidthPercent] = useState(50);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<ThemeConfig | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [pendingDownload, setPendingDownload] = useState(false);
  const downloadFilenameRef = useRef('document.pdf');
  const contentRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Load markdown from ?url= query parameter and handle ?theme= and ?download on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Handle ?theme= parameter
    const themeParam = params.get('theme');
    if (themeParam) {
      const matchedTheme = builtinThemeNames.find(
        (name) => name.toLowerCase() === themeParam.toLowerCase(),
      );
      if (matchedTheme) {
        setThemeName(matchedTheme);
      }
      // Invalid theme names silently fall back to Default (already the default)
    }

    // Handle ?download parameter
    const downloadParam = params.get('download');
    if (downloadParam !== null) {
      setPendingDownload(true);
    }

    const url = params.get('url');

    // Derive download filename from URL
    if (url && url.startsWith('http')) {
      try {
        const pathname = new URL(url).pathname;
        const basename = pathname.split('/').pop();
        if (basename) {
          const name = basename.replace(/\.(md|markdown|txt)$/i, '');
          downloadFilenameRef.current = `${name || 'document'}.pdf`;
        }
      } catch {
        // keep default filename
      }
    }

    if (!url) return;

    // Validate scheme
    if (!/^(https?:\/\/|data:)/i.test(url)) {
      setUrlError('Invalid URL: must start with http://, https://, or data:');
      return;
    }

    // Handle data: URLs synchronously
    if (url.startsWith('data:')) {
      try {
        setMarkdown(decodeDataUrl(url));
      } catch (err) {
        setUrlError(`Failed to decode data URL: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    // Fetch remote URL
    const fetchUrl = resolveGistUrl(url);
    let cancelled = false;
    setUrlLoading(true);
    setUrlError(null);

    // Proxy http(s) URLs through the Vite dev server to avoid CORS issues
    const proxyUrl = fetchUrl.match(/^https?:\/\//)
      ? '/__md_proxy/' + encodeURIComponent(fetchUrl)
      : fetchUrl;

    fetch(proxyUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) {
          setMarkdown(text);
          setUrlLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const isCors = err instanceof TypeError;
          const hint = isCors
            ? ' This may be due to CORS restrictions — the remote server must include Access-Control-Allow-Origin headers.'
            : '';
          setUrlError(`Failed to load URL: ${err instanceof Error ? err.message : String(err)}.${hint}`);
          setUrlLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

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
  function handleOpenCreator() {
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

  // Handle auto-download when PDF is ready
  const handlePdfReady = useCallback((blobUrl: string) => {
    if (!pendingDownload) return;
    setPendingDownload(false);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = downloadFilenameRef.current;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [pendingDownload]);

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
              onChange={(e) => {
                const newTheme = e.target.value;
                setThemeName(newTheme);
                if (window.goatcounter?.count) {
                  window.goatcounter.count({ path: `theme-changed/${newTheme}`, title: `Theme: ${newTheme}`, event: true });
                }
              }}
            >
              {allThemeNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button className="theme-btn" onClick={() => handleOpenCreator()}>
              Edit Theme
            </button>
            {isCustomTheme && (
              <button className="theme-btn danger" onClick={() => handleCreatorDelete(themeName)}>
                Delete
              </button>
            )}
          </div>
        </div>
        <div className="info">Edit markdown on the left, see PDF preview on the right</div>
      </div>

      {urlLoading && (
        <div className="url-banner url-loading">Loading markdown from URL…</div>
      )}
      {urlError && (
        <div className="url-banner url-error">{urlError}</div>
      )}

      {creatorOpen ? (
        <div className="content theme-editor-content">
          <div className="theme-editor-preview">
            <div className="panel-header">Theme Preview (Live)</div>
            <div className="pdf-viewer">
              <BrowserPdfRenderer
                markdown={markdown ?? ''}
                theme={activeTheme}
                customFonts={customFonts}
                onPdfReady={handlePdfReady}
              />
            </div>
          </div>
          <div className="theme-editor-panel">
            <ThemeCreator
              initialConfig={resolveTheme(themeName)}
              initialName={themeName}
              isBuiltIn={builtinThemeNames.includes(themeName)}
              onPreview={setPreviewConfig}
              onSave={handleCreatorSave}
              onDelete={handleCreatorDelete}
              onClose={handleCreatorClose}
              onFontLoad={handleFontLoad}
            />
          </div>
        </div>
      ) : (
        <div className="content" ref={contentRef}>
          <div className="editor-panel" style={{ width: `${editorWidthPercent}%` }}>
            <div className="panel-header">Markdown Editor</div>
            <div className="editor-wrapper">
              <MDEditor
                value={markdown}
                onChange={setMarkdown}
                preview="edit"
                highlightEnable={false}
                style={{ flex: 1 }}
                height="100%"
                visibleDragbar={false}
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
                onPdfReady={handlePdfReady}
              />
            </div>
        </div>
    </div>
      )}
    </div>
  );
}

export default App;

