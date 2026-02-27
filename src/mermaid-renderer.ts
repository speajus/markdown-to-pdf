import { DEFAULTS } from './defaults.js';
import type { MermaidThemeConfig } from './types.js';

let mermaidModule: typeof import('@speajus/mermaid-to-svg') | null = null;

async function loadMermaid(): Promise<typeof import('@speajus/mermaid-to-svg')> {
  if (!mermaidModule) {
    mermaidModule = await import('@speajus/mermaid-to-svg');
  }
  return mermaidModule;
}

/**
 * Resolve a mermaid theme config (string name or partial object) into
 * a `Theme` object from `@speajus/mermaid-to-svg`.
 */
function resolveTheme(
  mermaidMod: typeof import('@speajus/mermaid-to-svg'),
  config?: MermaidThemeConfig | 'default' | 'dark' | 'forest' | 'neutral',
) {
  if (!config || config === 'default') return mermaidMod.defaultTheme;
  if (config === 'dark') return mermaidMod.darkTheme;
  if (config === 'forest') return mermaidMod.forestTheme;
  if (config === 'neutral') return mermaidMod.neutralTheme;
  // Custom partial config — merge onto default
  return mermaidMod.createTheme(config as any);
}

/**
 * Render a mermaid diagram string to a PNG buffer.
 *
 * Uses `@speajus/mermaid-to-svg` to produce SVG, then `@resvg/resvg-js` to
 * rasterise to PNG so PDFKit can embed it.
 */
export async function renderMermaidToPng(
  mermaidCode: string,
  themeConfig?: MermaidThemeConfig | 'default' | 'dark' | 'forest' | 'neutral',
): Promise<Buffer> {
  const mod = await loadMermaid();
  const theme = resolveTheme(mod, themeConfig);
  const result = await mod.renderMermaid(mermaidCode, { theme });

  // Convert SVG → PNG via resvg
  return DEFAULTS.renderSvg(result.svg);
}

/**
 * Call this once when you are done rendering all mermaid diagrams to
 * release the jsdom window that `@speajus/mermaid-to-svg` creates internally.
 */
export async function cleanupMermaid(): Promise<void> {
  if (mermaidModule) {
    mermaidModule.cleanup();
  }
}

