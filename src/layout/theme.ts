// bisiyata dishmaya, leharbot ahava biyisral
import type { Book, ThemePresetId } from '@/domain/book';

export type Edition = 'colour' | 'colouring';

export interface ThemePreset {
  id: ThemePresetId;
  label: string;
  background: string;
  /** Soft colours only, so CMYK conversion stays safe. */
  accents: readonly string[];
  textColor: string;
  panelColor: string;
}

const SUNNY = '#FFD966';
const CORAL = '#FF9E8A';
const MINT = '#A8E6CF';
const LILAC = '#C9B6F2';
const SKY = '#9ADBF0';

export const THEME_PRESETS: Record<ThemePresetId, ThemePreset> = {
  sky: {
    id: 'sky',
    label: 'Sky',
    background: '#DCEFFB',
    accents: [SUNNY, CORAL, MINT, LILAC],
    textColor: '#2B3A55',
    panelColor: '#FFFFFF',
  },
  mint: {
    id: 'mint',
    label: 'Mint',
    background: '#DDF6EA',
    accents: [SUNNY, CORAL, SKY, LILAC],
    textColor: '#24433A',
    panelColor: '#FFFFFF',
  },
  peach: {
    id: 'peach',
    label: 'Peach',
    background: '#FFE8D9',
    accents: [CORAL, SUNNY, MINT, SKY],
    textColor: '#4F2F2A',
    panelColor: '#FFFFFF',
  },
  lavender: {
    id: 'lavender',
    label: 'Lavender',
    background: '#ECE4FA',
    accents: [SUNNY, CORAL, MINT, SKY],
    textColor: '#38305A',
    panelColor: '#FFFFFF',
  },
};

export interface ResolvedTheme {
  edition: Edition;
  background: string;
  accents: readonly string[];
  textColor: string;
  panelColor: string;
  /** Border and picture frame are drawn as black outlines the child can colour in. */
  outline: boolean;
  /** Soft white panel behind the text (colour edition only). */
  showTextPanel: boolean;
  frameColor: string;
}

export function resolveTheme(book: Book, edition: Edition): ResolvedTheme {
  if (edition === 'colouring') {
    return {
      edition,
      background: '#FFFFFF',
      accents: [],
      textColor: '#000000',
      panelColor: '#FFFFFF',
      outline: true,
      showTextPanel: false,
      frameColor: '#000000',
    };
  }
  const preset = THEME_PRESETS[book.theme.presetId] ?? THEME_PRESETS.sky;
  return {
    edition,
    background: preset.background,
    accents: preset.accents,
    textColor: preset.textColor,
    panelColor: preset.panelColor,
    outline: false,
    showTextPanel: book.theme.textPanel,
    frameColor: preset.accents[1] ?? preset.textColor,
  };
}
