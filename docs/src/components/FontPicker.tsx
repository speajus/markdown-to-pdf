import { useState, useRef, useEffect } from 'react';
import {
  searchGoogleFonts,
  fetchGoogleFontBuffers,
  type GoogleFontBuffers,
} from '../services/googleFonts';

const BUILTIN_FONTS = [
  { name: 'Helvetica', category: 'sans-serif' },
  { name: 'Helvetica-Bold', category: 'sans-serif' },
  { name: 'Times-Roman', category: 'serif' },
  { name: 'Times-Bold', category: 'serif' },
  { name: 'Courier', category: 'monospace' },
  { name: 'Courier-Bold', category: 'monospace' },
];

interface FontPickerProps {
  value: string;
  onChange: (fontName: string) => void;
  onFontLoad?: (fontName: string, buffers: GoogleFontBuffers) => void;
  label?: string;
}

export function FontPicker({ value, onChange, onFontLoad, label }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const googleResults = searchGoogleFonts(query);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Load Google Font preview stylesheets when dropdown is open
  useEffect(() => {
    if (!open) return;

    const results = searchGoogleFonts(query);

    // Remove any existing preview links before adding new ones
    document.querySelectorAll('link[data-font-preview]').forEach((el) => el.remove());

    for (const f of results) {
      const familyParam = f.family.replace(/ /g, '+');
      const textParam = encodeURIComponent(f.family);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${familyParam}&text=${textParam}&display=swap`;
      link.dataset.fontPreview = 'true';
      document.head.appendChild(link);
    }

    return () => {
      document.querySelectorAll('link[data-font-preview]').forEach((el) => el.remove());
    };
  }, [open, query]);

  async function handleSelectGoogle(family: string) {
    setLoading(family);
    setOpen(false);
    setQuery('');
    onChange(family);

    if (onFontLoad) {
      try {
        const buffers = await fetchGoogleFontBuffers(family);
        onFontLoad(family, buffers);
      } catch (err) {
        console.error(`Failed to load font "${family}":`, err);
      }
    }
    setLoading(null);
  }

  function handleSelectBuiltin(name: string) {
    setOpen(false);
    setQuery('');
    onChange(name);
  }

  return (
    <div className="font-picker" ref={containerRef}>
      {label && <label className="font-picker-label">{label}</label>}
      <button
        type="button"
        className="font-picker-trigger"
        onClick={() => setOpen(!open)}
      >
        {loading ? `Loading ${loading}…` : value || 'Select font…'}
      </button>

      {open && (
        <div className="font-picker-dropdown">
          <input
            type="text"
            className="font-picker-search"
            placeholder="Search fonts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />

          <div className="font-picker-list">
            <div className="font-picker-section-label">Built-in (PDFKit)</div>
            {BUILTIN_FONTS.map((f) => (
              <button
                key={f.name}
                type="button"
                className={`font-picker-item${f.name === value ? ' selected' : ''}`}
                onClick={() => handleSelectBuiltin(f.name)}
              >
                <span className="font-picker-item-name">{f.name}</span>
                <span className="font-picker-item-cat">{f.category}</span>
              </button>
            ))}

            <div className="font-picker-section-label">Google Fonts</div>
            {googleResults.length === 0 && (
              <div className="font-picker-empty">No fonts found</div>
            )}
            {googleResults.map((f) => (
              <button
                key={f.family}
                type="button"
                className={`font-picker-item${f.family === value ? ' selected' : ''}`}
                onClick={() => handleSelectGoogle(f.family)}
              >
                <span className="font-picker-item-name" style={{ fontFamily: `"${f.family}", ${f.category}` }}>{f.family}</span>
                <span className="font-picker-item-cat">{f.category}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

