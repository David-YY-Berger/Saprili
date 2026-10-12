// bisiyata dishmaya, leharbot ahava biyisral
import { AUTOSAVE_DEBOUNCE_MS } from '@/shared/timing';
import type { TrimPresetId } from './book';

export { AUTOSAVE_DEBOUNCE_MS };

export const HEADER_COMMENT_TEXT = 'bisiyata dishmaya, leharbot ahava biyisral';

/** Current data version of stored books, images and settings. */
export const CURRENT_SCHEMA_VERSION = 5;

export interface TrimPreset {
  id: TrimPresetId;
  label: string;
  widthMm: number;
  heightMm: number;
}

export const DEFAULT_TRIM_PRESET_ID: TrimPresetId = 'shop-206x291';
export const TRIM_PRESETS: readonly TrimPreset[] = [
  { id: 'shop-206x291', label: 'Print shop 20.6 × 29.1 cm', widthMm: 206, heightMm: 291 },
];

export const SAFE_MARGIN_FLOOR_MM = 10;

// Shop-dependent values below are placeholders until the shop answers (see PLACEHOLDER_KEYS).
export const DEFAULT_GUTTER_MM = 15; // S2
export const INTERIOR_BLEED_MM = 3; // S1
export const CROP_MARK_LENGTH_MM = 5; // S4
export const CROP_MARK_OFFSET_MM = 3; // S4
export const CROP_MARK_STROKE_MM = 0.25; // S4

export const COVER_PANEL_WIDTH_MM = 206;
export const COVER_HEIGHT_MM = 297;
export const COVER_HINGE_WIDTH_MM = 8;
export const COVER_BLEED_MM = 15;
export const COVER_SAFE_INSET_MM = 10; // placeholder

export interface SpineWidthRow {
  pages: number;
  spineMm: number;
}
export const SPINE_WIDTH_TABLE: readonly SpineWidthRow[] = [{ pages: 40, spineMm: 8 }]; // S6

export const MAX_AI_PHOTOS_INTRO = 3;
export const MAX_AI_PHOTOS_PAGE = 3;
export const MAX_AI_CHARACTERS = 6;
export const ORIGINAL_LONG_EDGE_PX = 2000;
export const AI_COPY_LONG_EDGE_PX = 1024;
export const THUMB_LONG_EDGE_PX = 256;
export const ILLUSTRATION_HISTORY_MAX = 3;
export const MAX_AI_CROP_PERCENT = 3;
export const JOB_CONCURRENCY = 2;
export const UNDO_WINDOW_MS = 8000;
/** The colophon has no id of its own; its PageRef always uses this one. */
export const COLOPHON_PAGE_ID = 'colophon';

/** Names of exported constants above that still depend on a print-shop answer. */
export const PLACEHOLDER_KEYS = [
  'DEFAULT_GUTTER_MM',
  'INTERIOR_BLEED_MM',
  'CROP_MARK_LENGTH_MM',
  'CROP_MARK_OFFSET_MM',
  'CROP_MARK_STROKE_MM',
  'COVER_SAFE_INSET_MM',
  'SPINE_WIDTH_TABLE',
] as const;
export type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number];

export const PRINT_SPEC = {
  safeMarginFloorMm: SAFE_MARGIN_FLOOR_MM,
  defaultGutterMm: DEFAULT_GUTTER_MM,
  interiorBleedMm: INTERIOR_BLEED_MM,
  cropMark: {
    lengthMm: CROP_MARK_LENGTH_MM,
    offsetMm: CROP_MARK_OFFSET_MM,
    strokeMm: CROP_MARK_STROKE_MM,
  },
  cover: {
    panelWidthMm: COVER_PANEL_WIDTH_MM,
    heightMm: COVER_HEIGHT_MM,
    hingeWidthMm: COVER_HINGE_WIDTH_MM,
    bleedMm: COVER_BLEED_MM,
    safeInsetMm: COVER_SAFE_INSET_MM,
    spineWidthTable: SPINE_WIDTH_TABLE,
  },
} as const;
