// bisiyata dishmaya, leharbot ahava biyisral
import './fonts.css';

export type FontScript = 'hebrew' | 'latin';

export interface FontEntry {
  id: string;
  label: string;
  script: FontScript;
  /** CSS family name declared in fonts.css. */
  family: string;
  fallback: string;
  weights: readonly number[];
  /** Used to trigger loading of the right unicode-range subset. */
  sampleText: string;
}

// Ids match the placeholders written by createEmptyBook, so existing books keep working.
export const FONT_REGISTRY: readonly FontEntry[] = [
  {
    id: 'hebrew-default',
    label: 'Noto Sans Hebrew',
    script: 'hebrew',
    family: 'Noto Sans Hebrew',
    fallback: 'sans-serif',
    weights: [400, 700],
    sampleText: 'בְּרֵאשִׁית',
  },
  {
    id: 'english-default',
    label: 'Nunito',
    script: 'latin',
    family: 'Nunito',
    fallback: 'sans-serif',
    weights: [400, 700],
    sampleText: 'Abc xyz 123',
  },
];

export function getFontEntry(fontId: string): FontEntry {
  const found = FONT_REGISTRY.find((f) => f.id === fontId);
  if (found) return found;
  const fallbackId = fontId.startsWith('hebrew') ? 'hebrew-default' : 'english-default';
  return FONT_REGISTRY.find((f) => f.id === fallbackId)!;
}

/** Value for the CSS `font-family` property. */
export function getFontFamilyCss(fontId: string): string {
  const entry = getFontEntry(fontId);
  return `"${entry.family}", ${entry.fallback}`;
}

/** Resolves once the packaged fonts are usable. Safe outside a browser (resolves at once). */
export async function ensureFontsLoaded(fontIds: readonly string[]): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const entries = [...new Set(fontIds)].map(getFontEntry);
  await Promise.all(
    entries.flatMap((entry) =>
      entry.weights.map((weight) =>
        document.fonts.load(`${weight} 16px "${entry.family}"`, entry.sampleText).catch(() => []),
      ),
    ),
  );
}
