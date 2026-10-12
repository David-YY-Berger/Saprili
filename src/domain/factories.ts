// bisiyata dishmaya, leharbot ahava biyisral
import { newId } from '@/shared/ids';
import type { Book } from './book';
import type { Colophon } from './colophon';
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_GUTTER_MM,
  DEFAULT_TRIM_PRESET_ID,
  SAFE_MARGIN_FLOOR_MM,
  TRIM_PRESETS,
} from './constants';
import type { Cover } from './cover';
import type { ColouringState, IllustrationState, IntroPage, StoryPage } from './page';
import type { UserSettings } from './settings';

export interface CreateBookInit {
  nowIso: string;
  id?: string;
  title?: string;
}

export type StoryPageInit = Partial<Pick<StoryPage, 'id' | 'privateTitle' | 'textEn' | 'textHe'>>;

export function createEmptyIllustrationState(): IllustrationState {
  return { currentImageId: null, history: [], customPrompt: '', useEditMode: false };
}

export function createEmptyColouringState(): ColouringState {
  return { imageId: null, sourceIllustrationImageId: null, outdated: false };
}

export function createIntroPage(init: Partial<Omit<IntroPage, 'photos'>> = {}): IntroPage {
  return {
    id: newId(),
    privateTitle: '',
    textEn: '',
    textHe: '',
    photos: [],
    photoLayout: 'firstLarge',
    characters: [],
    ...init,
  };
}

export function createStoryPage(init: StoryPageInit = {}): StoryPage {
  return {
    id: newId(),
    privateTitle: '',
    textEn: '',
    textHe: '',
    photos: [],
    illustration: createEmptyIllustrationState(),
    colouring: createEmptyColouringState(),
    ...init,
  };
}

export function createStoryPagePair(): [StoryPage, StoryPage] {
  return [createStoryPage(), createStoryPage()];
}

export function createDefaultColophon(createdAtIso: string): Colophon {
  return {
    dateIso: createdAtIso,
    place: 'Jerusalem',
    createdByTextHe: 'נוצר בספרילי', // placeholder wording (O-05)
    qrImageId: null,
  };
}

export function createDefaultCover(): Cover {
  return {
    titleHe: 'משפחת ברגר, גבעת מרדכי, 5787',
    subtitleHe: 'צילום מצב מהחיים שלנו',
    spineTextHe: 'משפחת ברגר 5787',
    illustration: createEmptyIllustrationState(),
    artworkMode: 'single',
    characterPortraits: [],
    ownImageId: null,
    back: { note: '' },
    colouringMarkerText: 'ספר צביעה', // placeholder wording (O-06)
  };
}

export function createDefaultUserSettings(): UserSettings {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    illustrationModelId: 'gemini-3-pro-image',
    colouringModelId: 'gemini-3.1-flash-lite-image',
    apiKey: null,
  };
}

export function createEmptyBook(init: CreateBookInit): Book {
  const preset = TRIM_PRESETS.find((p) => p.id === DEFAULT_TRIM_PRESET_ID) ?? TRIM_PRESETS[0]!;
  return {
    id: init.id ?? newId(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: init.title ?? 'book1',
    createdAt: init.nowIso,
    modifiedAt: init.nowIso,
    format: {
      trimWidthMm: preset.widthMm,
      trimHeightMm: preset.heightMm,
      orientation: 'portrait',
      textPosition: 'below',
      presetId: preset.id,
      lockedAt: null,
    },
    shape: null,
    bindingSide: 'right',
    theme: { presetId: 'sky', borderStyle: 'scalloped', textPanel: false },
    layout: {
      marginTopMm: SAFE_MARGIN_FLOOR_MM,
      marginBottomMm: SAFE_MARGIN_FLOOR_MM,
      marginOuterMm: SAFE_MARGIN_FLOOR_MM,
      gutterMm: DEFAULT_GUTTER_MM,
      pictureTextGapMm: 5,
    },
    // Font ids and size steps are placeholders until the font choice and P5.
    typography: {
      hebrewFontId: 'hebrew-default',
      englishFontId: 'english-default',
      sizeStepsPt: [22, 18, 14],
      alignment: 'start',
      hebrewEnglishSpacingMm: 3,
      minFontSizePt: 14,
    },
    showPageNumbers: true,
    print: { sheetMode: 'exact' },
    artStyleText:
      'Cute, simple children\u2019s book cartoon with soft colours and friendly rounded shapes.',
    intro: createIntroPage(),
    storyPages: [],
    colophon: createDefaultColophon(init.nowIso),
    cover: createDefaultCover(),
    lastBackupAt: null,
  };
}
