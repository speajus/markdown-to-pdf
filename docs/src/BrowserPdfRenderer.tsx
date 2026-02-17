import { useState, useEffect, useRef } from 'react';
import { renderMarkdownToPdf, createBrowserImageRenderer } from '../../src/browser';

interface BrowserPdfRendererProps {
  markdown: string;
}

export function BrowserPdfRenderer({ markdown }: BrowserPdfRendererProps) {
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
          const renderImage = createBrowserImageRenderer(true);

          // Generate PDF using the refactored library (src/index.ts)
          const buffer = await renderMarkdownToPdf(markdown, {
            renderImage,
          });

          if (!mounted) return;

          // Create blob URL for the PDF to display in iframe
          // Convert Buffer to Uint8Array for browser compatibility
          const uint8Array = new Uint8Array(buffer);
          const blob = new Blob([uint8Array], { type: 'application/pdf' });
          objectUrl = URL.createObjectURL(blob);
          setPdfUrl(objectUrl);
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
  }, [markdown]);

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
