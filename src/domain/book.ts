// bisiyata dishmaya, leharbot ahava biyisral
import type { Colophon } from './colophon';
import type { Cover } from './cover';
import type { IntroPage, StoryPage } from './page';

export type TrimPresetId = 'shop-206x291';

export interface PageFormat {
  trimWidthMm: number;
  trimHeightMm: number;
  orientation: 'portrait';
  textPosition: 'below';
  presetId: TrimPresetId;
  /** Null until Setup is confirmed; the format cannot change afterwards. */
  lockedAt: string | null;
}

export interface BookShape {
  textZoneHeightMm: number;
  /** Picture width divided by height. */
  pictureAspect: number;
  computedAt: string;
}

export type BindingSide = 'right' | 'left';
export type ThemePresetId = 'sky' | 'mint' | 'peach' | 'lavender';
export type BorderStyle = 'scalloped' | 'dotted' | 'clouds' | 'stars';

export interface ThemeSettings {
  presetId: ThemePresetId;
  borderStyle: BorderStyle;
  textPanel: boolean;
}

export interface LayoutSettings {
  marginTopMm: number;
  marginBottomMm: number;
  marginOuterMm: number;
  /** Margin on the spine side. */
  gutterMm: number;
  pictureTextGapMm: number;
}

export interface TypographySettings {
  hebrewFontId: string;
  englishFontId: string;
  /** Large, medium, small. */
  sizeStepsPt: [number, number, number];
  alignment: 'start' | 'center';
  hebrewEnglishSpacingMm: number;
  minFontSizePt: number;
}

export interface PrintSettings {
  sheetMode: 'exact' | 'centredA4';
}

export interface Book {
  id: string;
  schemaVersion: number;
  title: string;
  createdAt: string;
  modifiedAt: string;
  format: PageFormat;
  /** Null until computed once after Setup. */
  shape: BookShape | null;
  bindingSide: BindingSide;
  theme: ThemeSettings;
  layout: LayoutSettings;
  typography: TypographySettings;
  showPageNumbers: boolean;
  print: PrintSettings;
  artStyleText: string;
  intro: IntroPage;
  /** Always an even number of pages. */
  storyPages: StoryPage[];
  colophon: Colophon;
  cover: Cover;
  lastBackupAt: string | null;
}

export interface BookSummary {
  id: string;
  title: string;
  /** Interior pages including intro and colophon. */
  pageCount: number;
  modifiedAt: string;
  thumbImageId: string | null;
}
