<!-- bisiyata dishmaya, leharbot ahava biyisral -->

# 02. Data and storage

## Platform
- Chrome extension, Manifest V3, desktop Chromium (min Chrome 116). The app is one full tab (`app.html`); the toolbar icon opens it or focuses the existing tab (no side panel, no popup, no `tabs` permission).
- **Permissions:** `storage`, `unlimitedStorage`; **optional** host permission `https://generativelanguage.googleapis.com/*`, requested only when the user starts generation (`ai/geminiPermission.ts`). `scripts/check-manifest-permissions.mjs` enforces the allowed list.
- Fonts are packaged inside the extension (no remote loading); see [04](./04-layout-and-print.md).
- Distribution: Chrome Web Store; privacy policy required (`docs/privacy-policy.md`).

## Storage
- All persistence goes through `src/storage` (nothing else touches IndexedDB or `chrome.storage`; enforced by ESLint).
- **IndexedDB** DB `saprili`, stores `books`, `images`, `thumbs`, `jobs`, `batches`, `meta`. One record per book (text, order, settings), one per image, thumbnails separate, full images loaded on demand.
- **`chrome.storage.local`** holds only `userSettings` (key `userSettings`).
- `StorageProvider` is a small typed port (`get`, `getAll`, `getAllByIndex`, `getAllKeysByIndex`, atomic `apply(ops)`); repositories are factories so tests inject a fake clock and `fake-indexeddb`.
- Records carry `schemaVersion` (current **2**). Reads always pass through `migrateBookRecord` / `migrateImageRecord` / `migrateSettings`.
- Storage failures throw `AppError` `STORAGE_FAILED` or `STORAGE_QUOTA`.
- `MetaRepository` is a generic key/value used for `printJob:<id>`, `jobHostMode`, and flags.
- `chrome.storage.session` holds a flag used to tell a worker idle-restart from a browser restart (`storage/sessionFlag.ts`).

### Repositories (API)
- **BookRepository**: `listBookSummaries()` (small data only), `getBook`, `createBook`, `save(book, reason)` (`userEdit` | `generation` | `system`; only the first two bump `modifiedAt`), `deleteBook` (also removes images, thumbs, jobs), `duplicateBook`.
- **ImageRepository**: `putImage(record, thumb?)` (thumb = `{blob, widthPx, heightPx}`), `getImage`, `getThumb`, `deleteImage`, `listImageIdsForBook`, `deleteImagesForBook`, `purgeOrphanImages(book)`.
- **SettingsRepository**: `getUserSettings`, `saveUserSettings`. **JobRepository**: `putJob`, `getJob`, `listJobsForBatch`, `putBatch`, `getBatch`, `listOpenBatches`, `listBatchesForBook`. **MetaRepository**: key/value.

## Image handling
- Per imported photo, one atomic transaction stores: `original` (long edge ≈2000 px, never upscaled, never printed except on the intro page), linked `aiCopy` (≈1024 px, moderate JPEG), and a 256 px thumbnail.
- Camera orientation is honoured. Unsupported formats (e.g. HEIC) raise `IMAGE_DECODE_FAILED` with a "save as JPEG or PNG" next step.
- All image functions are worker-safe (`createImageBitmap`, `OffscreenCanvas`; no DOM `Image`) because the job runner reuses them in the service worker.
- AI calls use only AI copies. Photo cap per call: 3 from the intro, 3 from the page; extras are **flagged in the UI ("Not sent to AI"), never silently dropped** (`getAiPhotoSelection`).
- Generated images are stored as returned (plus the centre-crop in [06](./06-ai-generation.md)).

## Entities (`src/domain`)
- **Book**: `id`, `schemaVersion`, `title` (default "book1"), `createdAt`, `modifiedAt`, `format`, `shape`, `bindingSide` (`right` default | `left`), `theme {presetId: sky|mint|peach|lavender, borderStyle: scalloped|dotted|clouds|stars, textPanel}`, `layout {marginTopMm, marginBottomMm, marginOuterMm, gutterMm, pictureTextGapMm}`, `typography {hebrewFontId, englishFontId, sizeStepsPt[3], alignment: start|center, hebrewEnglishSpacingMm, minFontSizePt}`, `showPageNumbers`, `print {sheetMode: exact|centredA4}`, `artStyleText`, `intro`, `storyPages[]` (always even), `colophon`, `cover`, `lastBackupAt`.
- **PageFormat**: `trimWidthMm` 206, `trimHeightMm` 291, `orientation` portrait, `textPosition` below, `presetId` `shop-206x291`, `lockedAt` (ISO or null until Setup confirms).
- **BookShape** (computed once): `textZoneHeightMm`, `pictureAspect` (w/h), `computedAt`.
- **PageRef** `{kind: intro|story|colophon, id}`; the colophon id is the constant `COLOPHON_PAGE_ID = 'colophon'`. **PhotoRef** `{originalImageId, aiCopyImageId}`.
- **IntroPage**: `id`, `privateTitle`, `textEn`, `textHe`, `photos`, `photoLayout` (`firstLarge` | `collage` up to 4).
- **StoryPage**: `id`, `privateTitle`, `textEn`, `textHe`, `photos`, `illustration`, `colouring`.
- **IllustrationState** (also `Cover.illustration`): `currentImageId`, `history` (≤3 `{imageId, replacedAt}`), `customPrompt`, `useEditMode`. **ColouringState**: `imageId`, `sourceIllustrationImageId`, `outdated`.
- **Cover**: `titleHe`, `subtitleHe`, `spineTextHe`, `illustration`, `ownImageId`, `back {note}`, `colouringMarkerText`.
- **Colophon**: `dateIso` (defaults to creation date), `place` (default "Jerusalem"), `createdByTextHe`, `qrImageId`.
- **ImageRecord**: `id`, `bookId`, `kind` (`original|aiCopy|illustration|colouring|coverIllustration|coverUserImage|qr`), `blob`, `mime`, `widthPx`, `heightPx`, `byteSize`, `createdAt`, `meta {source: uploaded|generated, modelId?, generatedAt?}`. **ThumbRecord**: `imageId`, `bookId`, `blob`, `widthPx`, `heightPx`.
- **Spread**: `index`, `kind` (`intro|pair|colophon`), `left`, `right`; built only by `buildSpreads(book)`.
- **UserSettings**: `schemaVersion`, `illustrationModelId`, `colouringModelId`, `apiKey`. **Job** / **JobBatch**: see [06](./06-ai-generation.md).
- Default texts (placeholders, see [09](./09-decisions-and-open-questions.md)): cover title "משפחת ברגר, גבעת מרדכי, 5787", subtitle "צילום מצב מהחיים שלנו", spine "משפחת ברגר 5787", colouring marker "ספר צביעה", colophon "נוצר בספרילי".

## Constants (`src/domain/constants.ts`)
Shop-dependent values are listed in `PLACEHOLDER_KEYS` (do not remove until confirmed).

| Name | Value | Placeholder |
|---|---|---|
| `SAFE_MARGIN_FLOOR_MM` | 10 | no (shop advice) |
| `DEFAULT_GUTTER_MM` | 15 (total spine-side margin) | yes (S2) |
| `INTERIOR_BLEED_MM` | 3 | yes (S1) |
| `CROP_MARK_LENGTH/OFFSET/STROKE_MM` | 5 / 3 / 0.25 | yes (S4) |
| `COVER_PANEL_WIDTH_MM`, `COVER_HEIGHT_MM` | 206, 297 | no |
| `COVER_HINGE_WIDTH_MM`, `COVER_BLEED_MM` | 8, 15 | hinge assumed |
| `SPINE_WIDTH_TABLE` | one row `{40 pages, 8 mm}` | yes (S6) |
| `COVER_SAFE_INSET_MM` | 10 | yes |
| `MAX_AI_PHOTOS_INTRO` / `_PAGE` | 3 / 3 | |
| `ORIGINAL_LONG_EDGE_PX`, `AI_COPY_LONG_EDGE_PX`, `THUMB_LONG_EDGE_PX` | 2000, 1024, 256 | |
| `ILLUSTRATION_HISTORY_MAX`, `MAX_AI_CROP_PERCENT` | 3, 3 | |
| `JOB_CONCURRENCY`, `UNDO_WINDOW_MS`, `AUTOSAVE_DEBOUNCE_MS` | 2, 8000, 500 | |

## Errors (`src/shared/errors.ts`)
`AppError` has `code`, `userMessage`, `nextStep`, optional `cause`. Never show raw error text. Messages live in `src/i18n/en.ts`; `docs/error-messages.md` is generated from it (`scripts/generate-error-messages.mjs`).

Codes: `STORAGE_FAILED`, `STORAGE_QUOTA`, `MIGRATION_FAILED`, `CSV_BAD_COLUMNS`, `CSV_ODD_ROWS`, `CSV_EMPTY_ROWS`, `CSV_BAD_ENCODING`, `IMAGE_DECODE_FAILED`, `IMAGE_TOO_LARGE`, `AI_NO_KEY`, `AI_AUTH`, `AI_QUOTA`, `AI_REFUSED`, `AI_TEMPORARY`, `AI_BAD_RESPONSE`, `AI_UNSUPPORTED_MODEL`, `JOB_INTERRUPTED`, `BACKUP_INVALID`, `BACKUP_TOO_NEW`, `PRINT_ASSET_FAILED` (plus `DEPENDENCY_FAILED` for jobs whose illustration failed).
