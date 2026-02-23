/**
 * Theme storage service — persists custom themes in localStorage
 * and provides JSON export/import.
 */
import type { ThemeConfig } from '../../../src/browser';

const STORAGE_KEY = 'md2pdf-custom-themes';

export interface StoredTheme {
  name: string;
  config: ThemeConfig;
  fontFamilies: string[];
}

function readAll(): StoredTheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredTheme[];
  } catch {
    return [];
  }
}

function writeAll(themes: StoredTheme[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

/** Load all custom themes from localStorage. */
export function loadCustomThemes(): StoredTheme[] {
  return readAll();
}

/** Save (create or update) a custom theme. */
export function saveCustomTheme(
  name: string,
  config: ThemeConfig,
  fontFamilies: string[],
): void {
  const all = readAll();
  const idx = all.findIndex((t) => t.name === name);
  const entry: StoredTheme = { name, config, fontFamilies };
  if (idx >= 0) {
    all[idx] = entry;
  } else {
    all.push(entry);
  }
  writeAll(all);
}

/** Delete a custom theme by name. */
export function deleteCustomTheme(name: string): void {
  const all = readAll().filter((t) => t.name !== name);
  writeAll(all);
}

/** Export a theme as a JSON string (for file download). */
export function exportThemeJson(
  name: string,
  config: ThemeConfig,
  fontFamilies: string[],
): string {
  return JSON.stringify({ name, config, fontFamilies }, null, 2);
}

/** Import a theme from a JSON string. Returns the parsed StoredTheme. */
export function importThemeJson(json: string): StoredTheme {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed.name !== 'string' || !parsed.config) {
    throw new Error('Invalid theme JSON: must contain "name" and "config"');
  }
  return {
    name: parsed.name,
    config: parsed.config as ThemeConfig,
    fontFamilies: Array.isArray(parsed.fontFamilies) ? parsed.fontFamilies : [],
  };
}

