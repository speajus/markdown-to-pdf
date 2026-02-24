import { useState, useCallback, useRef, useEffect } from 'react';
import type { ThemeConfig, CustomFontDefinition } from '../../../src/browser';
import { defaultTheme, defaultSpacing } from '../../../src/browser';
import { ColorInput } from './ColorInput';
import { FontPicker } from './FontPicker';
import type { GoogleFontBuffers } from '../services/googleFonts';
import {
  saveCustomTheme,
  deleteCustomTheme,
  exportThemeJson,
  importThemeJson,
} from '../services/themeStorage';
import './ThemeCreator.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

type HeadingKey = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
const HEADING_KEYS: HeadingKey[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

const IMPORTANT_TOKENS = [
  'comment', 'keyword', 'string', 'number', 'function',
  'operator', 'punctuation', 'property', 'boolean', 'class-name', 'default',
];

// ── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="tc-section">
      <div className="tc-section-header" onClick={() => setOpen(!open)}>
        <span className={`tc-section-arrow${open ? ' open' : ''}`}>▶</span>
        {title}
      </div>
      {open && <div className="tc-section-content">{children}</div>}
    </div>
  );
}

// ── Props ───────────────────────────────────────────────────────────────────

export interface ThemeCreatorProps {
  /** The theme config to start editing (clone of selected theme). */
  initialConfig: ThemeConfig;
  /** Name of the theme being edited. */
  initialName: string;
  /** Whether the source theme is a built-in (read-only) theme. */
  isBuiltIn: boolean;
  /** Called on every change for live preview. */
  onPreview: (config: ThemeConfig) => void;
  /** Called when user saves. */
  onSave: (name: string, config: ThemeConfig, fontFamilies: string[]) => void;
  /** Called when user deletes (only for existing custom themes). */
  onDelete?: (name: string) => void;
  /** Called when user cancels / closes. */
  onClose: () => void;
  /** Called when a Google Font is loaded. */
  onFontLoad: (fontDef: CustomFontDefinition) => void;
}

export function ThemeCreator({
  initialConfig,
  initialName,
  isBuiltIn,
  onPreview,
  onSave,
  onDelete,
  onClose,
  onFontLoad,
}: ThemeCreatorProps) {
  const [name, setName] = useState(initialName);
  const [config, setConfig] = useState<ThemeConfig>(() => deepClone(initialConfig));
  const [fontFamilies, setFontFamilies] = useState<string[]>([]);
  const [copyLabel, setCopyLabel] = useState('Copy Theme');
  const debounceRef = useRef<number | null>(null);

  // Determine if save is allowed
  const trimmedName = name.trim();
  const nameChanged = trimmedName !== '' && trimmedName !== initialName;
  const isExistingCustom = !isBuiltIn && initialName !== '';
  const saveDisabled = isBuiltIn && !nameChanged;

  // Debounced live preview
  const schedulePreview = useCallback(
    (cfg: ThemeConfig) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => onPreview(cfg), 200);
    },
    [onPreview],
  );

  // Update helper that also triggers preview
  function update(updater: (draft: ThemeConfig) => void) {
    setConfig((prev) => {
      const next = deepClone(prev);
      updater(next);
      schedulePreview(next);
      return next;
    });
  }

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Font load handler ──
  function handleFontLoad(fontName: string, buffers: GoogleFontBuffers) {
    setFontFamilies((prev) => (prev.includes(fontName) ? prev : [...prev, fontName]));
    onFontLoad({
      name: fontName,
      regular: buffers.regular,
      bold: buffers.bold ?? undefined,
      italic: buffers.italic ?? undefined,
      boldItalic: buffers.boldItalic ?? undefined,
    });
  }

  // ── Save ──
  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { alert('Please enter a theme name.'); return; }
    if (isBuiltIn && trimmed === initialName) { return; } // shouldn't happen since button is disabled
    saveCustomTheme(trimmed, config, fontFamilies);
    onSave(trimmed, config, fontFamilies);
  }

  // ── Delete ──
  function handleDelete() {
    if (!confirm(`Delete theme "${name}"?`)) return;
    deleteCustomTheme(name);
    onDelete?.(name);
  }

  // ── Export ──
  function handleExport() {
    const json = exportThemeJson(name || 'Untitled', config, fontFamilies);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name || 'theme').replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Copy to clipboard ──
  async function handleCopy() {
    const json = exportThemeJson(name || 'Untitled', config, fontFamilies);
    try {
      await navigator.clipboard.writeText(json);
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy Theme'), 1500);
    } catch {
      // Fallback: select-and-copy via a temporary textarea
      const ta = document.createElement('textarea');
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy Theme'), 1500);
    }
  }

  // ── Import ──
  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = importThemeJson(reader.result as string);
          setName(imported.name);
          setConfig(imported.config);
          setFontFamilies(imported.fontFamilies);
          schedulePreview(imported.config);
        } catch (err) {
          alert(`Import failed: ${err instanceof Error ? err.message : err}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ── Render ──
  return (
    <div className="theme-creator">
      {/* Header */}
      <div className="theme-creator-header">
        <div className="theme-creator-header-row">
          <input
            className="theme-creator-name-input"
            placeholder="Theme name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="theme-creator-btn primary"
            onClick={handleSave}
            disabled={saveDisabled}
            title={saveDisabled ? 'Change the theme name to save as a new theme' : undefined}
          >
            Save
          </button>
          <button className="theme-creator-btn" onClick={onClose}>Cancel</button>
        </div>
        {isBuiltIn && !nameChanged && (
          <div className="tc-builtin-warning">
            Built-in themes are read-only — change the name to save as a new theme.
          </div>
        )}
        <div className="theme-creator-header-row">
          <button className="theme-creator-btn" onClick={handleExport}>Export JSON</button>
          <button className="theme-creator-btn" onClick={handleCopy}>{copyLabel}</button>
          <button className="theme-creator-btn" onClick={handleImport}>Import JSON</button>
          {isExistingCustom && onDelete && (
            <button className="theme-creator-btn danger" onClick={handleDelete}>Delete</button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="theme-creator-body">
          {/* ── Typography: Headings ── */}
          <Section title="Typography — Headings">
            {HEADING_KEYS.map((hk) => (
              <div key={hk} className="tc-heading-group">
                <div className="tc-heading-group-title">{hk.toUpperCase()}</div>
                <FontPicker
                  label="Font"
                  value={config.headings[hk].font}
                  onChange={(v) => update((d) => { d.headings[hk].font = v; })}
                  onFontLoad={handleFontLoad}
                />
                <div className="tc-field-row">
                  <span className="tc-field-label">Size</span>
                  <input
                    type="number"
                    className="tc-number-input"
                    value={config.headings[hk].fontSize}
                    onChange={(e) => update((d) => { d.headings[hk].fontSize = Number(e.target.value); })}
                  />
                  <label className="tc-toggle">
                    <input
                      type="checkbox"
                      checked={config.headings[hk].bold ?? false}
                      onChange={(e) => update((d) => { d.headings[hk].bold = e.target.checked; })}
                    /> B
                  </label>
                  <label className="tc-toggle">
                    <input
                      type="checkbox"
                      checked={config.headings[hk].italic ?? false}
                      onChange={(e) => update((d) => { d.headings[hk].italic = e.target.checked; })}
                    /> I
                  </label>
                </div>
                <ColorInput
                  label="Color"
                  value={config.headings[hk].color}
                  onChange={(v) => update((d) => { d.headings[hk].color = v; })}
                />
              </div>
            ))}
          </Section>

          {/* ── Typography: Body ── */}
          <Section title="Typography — Body">
            <FontPicker
              label="Font"
              value={config.body.font}
              onChange={(v) => update((d) => { d.body.font = v; })}
              onFontLoad={handleFontLoad}
            />
            <div className="tc-field-row">
              <span className="tc-field-label">Size</span>
              <input
                type="number"
                className="tc-number-input"
                value={config.body.fontSize}
                onChange={(e) => update((d) => { d.body.fontSize = Number(e.target.value); })}
              />
              <span className="tc-field-label">Line gap</span>
              <input
                type="number"
                className="tc-number-input"
                value={config.body.lineGap ?? 0}
                onChange={(e) => update((d) => { d.body.lineGap = Number(e.target.value); })}
              />
            </div>
            <ColorInput
              label="Color"
              value={config.body.color}
              onChange={(v) => update((d) => { d.body.color = v; })}
            />
          </Section>

          {/* ── Typography: Code ── */}
          <Section title="Typography — Code">
            <div className="tc-heading-group">
              <div className="tc-heading-group-title">Inline Code</div>
              <FontPicker
                label="Font"
                value={config.code.inline.font}
                onChange={(v) => update((d) => { d.code.inline.font = v; })}
                onFontLoad={handleFontLoad}
              />
              <div className="tc-field-row">
                <span className="tc-field-label">Size</span>
                <input
                  type="number"
                  className="tc-number-input"
                  value={config.code.inline.fontSize}
                  onChange={(e) => update((d) => { d.code.inline.fontSize = Number(e.target.value); })}
                />
              </div>
              <ColorInput label="Color" value={config.code.inline.color} onChange={(v) => update((d) => { d.code.inline.color = v; })} />
              <ColorInput label="Background" value={config.code.inline.backgroundColor} onChange={(v) => update((d) => { d.code.inline.backgroundColor = v; })} />
            </div>
            <div className="tc-heading-group">
              <div className="tc-heading-group-title">Code Block</div>
              <FontPicker
                label="Font"
                value={config.code.block.font}
                onChange={(v) => update((d) => { d.code.block.font = v; })}
                onFontLoad={handleFontLoad}
              />
              <div className="tc-field-row">
                <span className="tc-field-label">Size</span>
                <input
                  type="number"
                  className="tc-number-input"
                  value={config.code.block.fontSize}
                  onChange={(e) => update((d) => { d.code.block.fontSize = Number(e.target.value); })}
                />
                <span className="tc-field-label">Padding</span>
                <input
                  type="number"
                  className="tc-number-input"
                  value={config.code.block.padding}
                  onChange={(e) => update((d) => { d.code.block.padding = Number(e.target.value); })}
                />
                <span className="tc-field-label">Radius</span>
                <input
                  type="number"
                  className="tc-number-input"
                  value={config.code.block.borderRadius ?? 0}
                  onChange={(e) => update((d) => { d.code.block.borderRadius = Number(e.target.value) || undefined; })}
                />
              </div>
              <ColorInput label="Color" value={config.code.block.color} onChange={(v) => update((d) => { d.code.block.color = v; })} />
              <ColorInput label="Background" value={config.code.block.backgroundColor} onChange={(v) => update((d) => { d.code.block.backgroundColor = v; })} />
            </div>
          </Section>

          {/* ── Blockquote ── */}
          <Section title="Blockquote">
            <ColorInput label="Border color" value={config.blockquote.borderColor} onChange={(v) => update((d) => { d.blockquote.borderColor = v; })} />
            <ColorInput label="Background" value={config.blockquote.backgroundColor ?? ''} onChange={(v) => update((d) => { d.blockquote.backgroundColor = v || undefined; })} />
            <div className="tc-field-row">
              <span className="tc-field-label">Border width</span>
              <input type="number" className="tc-number-input" value={config.blockquote.borderWidth} onChange={(e) => update((d) => { d.blockquote.borderWidth = Number(e.target.value); })} />
              <span className="tc-field-label">Indent</span>
              <input type="number" className="tc-number-input" value={config.blockquote.indent} onChange={(e) => update((d) => { d.blockquote.indent = Number(e.target.value); })} />
            </div>
            <div className="tc-field-row">
              <span className="tc-field-label">Padding</span>
              <input type="number" className="tc-number-input" value={config.blockquote.padding ?? 0} onChange={(e) => update((d) => { d.blockquote.padding = Number(e.target.value) || undefined; })} />
            </div>
            <label className="tc-toggle">
              <input type="checkbox" checked={config.blockquote.italic} onChange={(e) => update((d) => { d.blockquote.italic = e.target.checked; })} /> Italic
            </label>
          </Section>

          {/* ── Colors & Layout ── */}
          <Section title="Colors & Layout">
            <ColorInput label="Link color" value={config.linkColor} onChange={(v) => update((d) => { d.linkColor = v; })} />
            <ColorInput label="HR color" value={config.horizontalRuleColor} onChange={(v) => update((d) => { d.horizontalRuleColor = v; })} />
            <div className="tc-field-row">
              <span className="tc-field-label">Image align</span>
              <select
                className="tc-select-input"
                value={config.imageAlign ?? 'left'}
                onChange={(e) => update((d) => { d.imageAlign = e.target.value as 'left' | 'center'; })}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
              </select>
            </div>
            <div className="tc-heading-group">
              <div className="tc-heading-group-title">Table</div>
              <ColorInput label="Header bg" value={config.table.headerBackground} onChange={(v) => update((d) => { d.table.headerBackground = v; })} />
              <ColorInput label="Border" value={config.table.borderColor} onChange={(v) => update((d) => { d.table.borderColor = v; })} />
              <ColorInput label="Zebra" value={config.table.zebraColor ?? '#f9f9f9'} onChange={(v) => update((d) => { d.table.zebraColor = v; })} />
              <div className="tc-field-row">
                <span className="tc-field-label">Cell padding</span>
                <input type="number" className="tc-number-input" value={config.table.cellPadding} onChange={(e) => update((d) => { d.table.cellPadding = Number(e.target.value); })} />
              </div>
            </div>
          </Section>

          {/* ── Spacing & Layout ── */}
          <Section title="Spacing & Layout">
            {(() => {
              const sp = config.spacing ?? {};
              function updateSP(key: keyof typeof defaultSpacing, value: number) {
                update((d) => {
                  if (!d.spacing) d.spacing = {};
                  d.spacing[key] = value;
                });
              }
              return (
                <>
                  <div className="tc-field-row">
                    <span className="tc-field-label">Heading above</span>
                    <input type="number" step="0.1" className="tc-number-input" value={sp.headingSpaceAbove ?? defaultSpacing.headingSpaceAbove} onChange={(e) => updateSP('headingSpaceAbove', Number(e.target.value))} />
                    <span className="tc-field-label">Heading below</span>
                    <input type="number" step="0.1" className="tc-number-input" value={sp.headingSpaceBelow ?? defaultSpacing.headingSpaceBelow} onChange={(e) => updateSP('headingSpaceBelow', Number(e.target.value))} />
                  </div>
                  <div className="tc-field-row">
                    <span className="tc-field-label">Paragraph</span>
                    <input type="number" step="0.1" className="tc-number-input" value={sp.paragraphSpacing ?? defaultSpacing.paragraphSpacing} onChange={(e) => updateSP('paragraphSpacing', Number(e.target.value))} />
                    <span className="tc-field-label">HR spacing</span>
                    <input type="number" step="0.1" className="tc-number-input" value={sp.hrSpacing ?? defaultSpacing.hrSpacing} onChange={(e) => updateSP('hrSpacing', Number(e.target.value))} />
                  </div>
                  <div className="tc-field-row">
                    <span className="tc-field-label">List item</span>
                    <input type="number" step="0.1" className="tc-number-input" value={sp.listItemSpacing ?? defaultSpacing.listItemSpacing} onChange={(e) => updateSP('listItemSpacing', Number(e.target.value))} />
                    <span className="tc-field-label">List indent</span>
                    <input type="number" className="tc-number-input" value={sp.listIndent ?? defaultSpacing.listIndent} onChange={(e) => updateSP('listIndent', Number(e.target.value))} />
                  </div>
                  <div className="tc-field-row">
                    <span className="tc-field-label">Blockquote</span>
                    <input type="number" step="0.1" className="tc-number-input" value={sp.blockquoteSpacing ?? defaultSpacing.blockquoteSpacing} onChange={(e) => updateSP('blockquoteSpacing', Number(e.target.value))} />
                    <span className="tc-field-label">Code block</span>
                    <input type="number" step="0.1" className="tc-number-input" value={sp.codeBlockSpacing ?? defaultSpacing.codeBlockSpacing} onChange={(e) => updateSP('codeBlockSpacing', Number(e.target.value))} />
                  </div>
                </>
              );
            })()}
          </Section>

          {/* ── Syntax Highlighting ── */}
          <Section title="Syntax Highlighting">
            {(() => {
              const sh = config.syntaxHighlight ?? defaultTheme.syntaxHighlight!;
              function updateSH(updater: (s: NonNullable<ThemeConfig['syntaxHighlight']>) => void) {
                update((d) => {
                  if (!d.syntaxHighlight) d.syntaxHighlight = deepClone(defaultTheme.syntaxHighlight!);
                  updater(d.syntaxHighlight!);
                });
              }
              return (
                <>
                  <ColorInput label="Background" value={sh.background} onChange={(v) => updateSH((s) => { s.background = v; })} />
                  <ColorInput label="Gutter" value={sh.gutter} onChange={(v) => updateSH((s) => { s.gutter = v; })} />
                  <ColorInput label="Default text" value={sh.defaultText} onChange={(v) => updateSH((s) => { s.defaultText = v; })} />
                  <ColorInput label="Line highlight" value={sh.lineHighlight} onChange={(v) => updateSH((s) => { s.lineHighlight = v; })} />
                  <div className="tc-heading-group">
                    <div className="tc-heading-group-title">Token Colors</div>
                    <div className="tc-token-grid">
                      {IMPORTANT_TOKENS.map((tok) => (
                        <ColorInput
                          key={tok}
                          label={tok}
                          value={sh.tokens[tok] ?? sh.defaultText}
                          onChange={(v) => updateSH((s) => { s.tokens[tok] = v; })}
                        />
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </Section>
      </div>
    </div>
  );
}

