import { useState, useEffect, useRef } from 'react';
import { renderMarkdownToPdf, createBrowserImageRenderer } from '../../src/browser';
import type { ThemeConfig, CustomFontDefinition } from '../../src/browser';

/**
 * Font file paths keyed by theme emojiFont value.
 */
const emojiFontPaths: Record<string, string> = {
  twemoji: `${import.meta.env.BASE_URL}fonts/Twemoji.Mozilla.ttf`,
  openmoji: `${import.meta.env.BASE_URL}fonts/OpenMoji-Color.ttf`,
  noto: `${import.meta.env.BASE_URL}fonts/NotoColorEmoji.ttf`,
};

/**
 * Per-font cache so each emoji font is fetched at most once.
 */
const emojiFontCache = new Map<string, Promise<Buffer | null>>();

/**
 * Load the emoji font buffer for the given theme emojiFont setting.
 * Returns `null` for `'none'` (no emoji font) and caches each font
 * independently so switching between Twemoji and OpenMoji doesn't
 * re-download.
 */
function loadEmojiFontForTheme(fontName: string): Promise<Buffer | null> {
  if (fontName === 'none') return Promise.resolve(null);

  const cached = emojiFontCache.get(fontName);
  if (cached) return cached;

  const path = emojiFontPaths[fontName];
  if (!path) return Promise.resolve(null);

  const promise = fetch(path)
    .then((res) => {
      if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
      return res.arrayBuffer();
    })
    .then((ab) => Buffer.from(ab))
    .catch((err) => {
      console.warn(`Could not load emoji font '${fontName}' – emoji will not render:`, err);
      emojiFontCache.delete(fontName);
      return null;
    });

  emojiFontCache.set(fontName, promise);
  return promise;
}


interface BrowserPdfRendererProps {
  markdown: string;
  theme?: ThemeConfig;
  customFonts?: CustomFontDefinition[];
  /** Called with the blob URL whenever a new PDF is generated successfully. */
  onPdfReady?: (blobUrl: string) => void;
}

export function BrowserPdfRenderer({ markdown, theme, customFonts, onPdfReady }: BrowserPdfRendererProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce PDF generation by 500ms
    debounceTimerRef.current = window.setTimeout(() => {
      async function generatePdf() {
        setLoading(true);
        setError('');

        try {
          // Create browser image renderer
          const renderImage = createBrowserImageRenderer('');

          // Load the correct emoji font based on theme setting
          const emojiFontName = theme?.emojiFont ?? 'twemoji';
          const emojiFont = await loadEmojiFontForTheme(emojiFontName);

          // Generate PDF using the refactored library (src/index.ts)
          const buffer = await renderMarkdownToPdf(markdown, {
            renderImage,
            theme,
            ...(emojiFont ? { emojiFont } : { emojiFont: false }),
            ...(customFonts && customFonts.length > 0 ? { customFonts } : {}),
          });

          if (!mounted) return;

          // Create blob URL for the PDF to display in iframe
          // Convert Buffer to Uint8Array for browser compatibility
          const uint8Array = new Uint8Array(buffer);
          const blob = new Blob([uint8Array], { type: 'application/pdf' });
          objectUrl = URL.createObjectURL(blob);
          setPdfUrl(objectUrl);
          onPdfReady?.(objectUrl);
        } catch (err) {
          if (!mounted) return;
          setError(err instanceof Error ? err.message : 'Failed to generate PDF');
          console.error('PDF generation error:', err);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }

      generatePdf();
    }, 500); // 500ms debounce

    return () => {
      mounted = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [markdown, theme, customFonts]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        fontSize: '16px',
        color: '#666'
      }}>
        Generating PDF...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        color: '#d32f2f',
        backgroundColor: '#ffebee',
        borderRadius: '4px',
        margin: '20px'
      }}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        fontSize: '16px',
        color: '#666'
      }}>
        No PDF generated
      </div>
    );
  }

  return (
    <iframe
      src={pdfUrl}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
      }}
      title="PDF Preview"
    />
  );
}
