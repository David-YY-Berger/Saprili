<!-- bisiyata dishmaya, leharbot ahava biyisral -->

# Saprili: Development Plan
*Your storybook scribe. Implementation plan derived from `mission-brief.md`.*

**Audience:** a human owner and GitHub Copilot (or any coding agent). Nothing in this file is code. It names files, classes, functions and rules so an agent can implement without guessing.

---

## 0. How to use this plan

### 0.1 Task tags
- **[SYNC]** needs the human (a decision, a physical action, a judgement, supplying an input). An agent must **stop and ask**, never guess. Each SYNC task states a **Default** so ASYNC work can continue on the default when the human has not answered yet. Defaults are marked *assumed* and logged in the Decisions Register (section 2).
- **[ASYNC]** an agent can do it alone from this plan. Each has: **Files**, **Names** (classes/functions/components to create), **Rules**, **Done when**.

### 0.2 Running a phase in its own chat
Phases are built to run in separate chat contexts. Each phase section is self-contained apart from sections 0 to 5 (shared rules and contracts). To start a phase in a fresh chat, give the agent:

> Read `saprili-plan.md` sections 0 to 5 and Phase N only. Implement the ASYNC tasks of Phase N in order. Stop at every SYNC task and ask me. Do not touch other phases. When finished, run the Definition of Done checklist, fill the Phase N log, and tick Phase N in the Status tracker.

Tick each task checkbox as that task is completed. Tick a phase in the Status tracker only when all of its tasks and Definition of Done checks are complete.

### 0.3 Rules for the implementing agent
1. Work only on the current phase. Do not "helpfully" build later features.
2. **Shared contracts (section 5) are frozen.** Do not rename or reshape them. If a contract must change, stop and raise it as a SYNC item; the human updates section 5 first.
3. A phase may touch earlier phases' files only where its section lists **Touches earlier files**.
4. All geometry is in **millimetres** (floating point). Pixels only appear at render time.
5. Every source file starts with the header comment from rule 9.4 of the brief (see 0.4).
6. No new top-level folders. No new runtime dependencies beyond section 3.3 without asking.
7. Pure logic (geometry, validation, ordering, parsing, prompt building) lives in plain TypeScript modules with unit tests. React components stay thin.
8. When done: update the Status tracker, fill the phase log (files created, deviations, new decisions, follow-ups), and list anything left for the human.

### 0.4 Conventions
- **Header comment** on the first line of every source code file (`.ts`, `.tsx`, `.css`, `.html`, `.mjs`), in that file's comment syntax, text exactly: `bisiyata dishmaya, leharbot ahava biyisral`. Not on CSV, JSON, or exported files. Enforced by `scripts/check-headers.mjs` (Phase 1).
- Naming: React components `PascalCase.tsx`; modules `camelCase.ts`; tests `*.test.ts(x)` beside the source; end-to-end tests in `tests/e2e/`.
- Errors: always thrown/returned as `AppError` (see 5.7); never show raw error text to users.
- Accessibility: every icon-only control uses `IconButton` (requires `label`).
- Hebrew is right-to-left wherever it appears (`dir="rtl"`, `lang="he"`). Use CSS logical properties everywhere so a Hebrew interface can be added later.
- Modification date: bumped only through `BookRepository.save(book, reason)` with reason `userEdit` or `generation` (rule 9.2).

### 0.5 Generic Definition of Done (applies to every phase, plus its own checks)
- `npm run typecheck`, `npm run lint`, `npm run lint:headers`, `npm test` all pass.
- `npm run build` succeeds and the unpacked extension loads in Chrome without console errors.
- Phase's own **Human verification** checklist is ticked by the human.
- Phase log filled; Status tracker updated.

---

## 1. Status tracker

| Phase | Name | Brief phase | Status |
|---|---|---|---|
| P0 | Spikes: de-risk (4 independent tracks) | 0 | [ ] |
| P1 | Scaffold, domain model, storage layer | 1 | [ ] (ASYNC done; P1.8 human check pending) |
| P2 | UI kit, My settings, Library | 1 | [ ] |
| P3 | CSV import, Setup, Book view | 2 | [x] |
| P4 | Page view: spread editor, text, photos | 3 | [ ] |
| P5 | Layout engine core, theme, borders | 4 | [ ] (P5.2–P5.6 and P5.7 unit tests done; P5.1, visual baselines, and P5.8 pending) |
| P6 | Previews, Book settings, pre-flight, colophon | 4 | [~] (P6.1–P6.7 implementation and tests complete; P6.8 human verification pending) |
| P7 | Print export: page, book, colouring book | 4 | [~] (P7.1–P7.6 complete using documented fallback assumptions; owner verification pending) |
| P8 | Cover editor and cover PDF | 5 | [ ] |
| P9 | AI generation: provider, prompts, retry, history | 6 | [~] (P9.1–P9.7 and P9.9 implemented; P9.8 real-key owner test pending) |
| P10 | Background job queue and Generate dialog | 7 | [ ] |
| P11 | Backup, restore, per-page download | 7 | [ ] |
| P12 | Hardening, user test, Web Store | 8 | [ ] |

### 1.1 Dependency map (what can run in parallel)

| Phase | Needs (code) | Needs (decisions/inputs) |
|---|---|---|
| P0-A AI test | nothing | owner's real photos and API key(s) |
| P0-B Print test | nothing | shop answers (start asking immediately) |
| P0-C Background test | nothing | none |
| P0-D Hebrew date test | nothing | none |
| P1 | none | D-01 to D-06 confirmed |
| P2 | P1 | none |
| P3 | P1, P2 | the CSV (can use a sample until supplied) |
| P4 | P3 | none |
| P5 | P1, P4 | fonts shortlist (P0-B), palette review |
| P6 | P5 | P0-D (date rules), colophon wording, QR image |
| P7 | P5, P6 | P0-B findings and S1, S3, S4, S5, S7 answers, or owner-authorized fallback policy |
| P8 | P5, P7 | shop answers S6, S8; cover wording |
| P9 | P4, P5, P8 | **P0-A decision (D-AI), settled for Gemini** |
| P10 | P9 | **P0-C decision (D-BG)** |
| P11 | P1, P4 (can move earlier) | none |
| P12 | all | privacy-policy hosting, Web Store account |

P0 tracks are independent of each other and can be run in four separate chats. P1 to P4 do not depend on any P0 outcome and can start immediately.

---

## 2. Decisions Register

Status values: **open**, **assumed** (default in use), **settled**. When the human answers, update this table; agents read it.

### 2.1 Technical decisions (confirm at P1.1)

| ID | Decision | Default (assumed) | Why |
|---|---|---|---|
| D-01 | Language and build | TypeScript (strict), Vite multi-page build, Manifest V3 | single stack, no Python (brief 2) |
| D-02 | UI library | React 18, plain CSS Modules with CSS variables, `react-router-dom` HashRouter, `zustand` for stores, `@dnd-kit/core` + `@dnd-kit/sortable`, `lucide-react` icons | print CSS needs full control; no CSS framework |
| D-03 | Storage backend behind the single storage layer | IndexedDB (via `idb`) for books, images, thumbnails, jobs; `chrome.storage.local` for user settings only; `unlimitedStorage` permission | blobs and per-record access; readable from the service worker. Brief says "extension local storage"; this is the interpretation that keeps the layer swappable |
| D-04 | PDF method | print-styled page `print.html` + `window.print()`; user picks "Save as PDF" | brief 5.4; avoids the scary `debugger` permission |
| D-05 | Internationalisation | small own module `src/i18n` with `t(key)` and an `en` catalogue; direction from locale | interface English now, Hebrew RTL later |
| D-06 | Tooling | Vitest + Testing Library + `fake-indexeddb`; Playwright (Chromium, extension loaded) for end-to-end and automated PDF checks; `papaparse` (CSV), `fflate` (zip), `pdf-lib` (test-time PDF inspection only) | |
| D-AI | AI provider and models | **settled:** Google Gemini API; Gemini 3 Pro Image (`gemini-3-pro-image`) for illustrations and Gemini 3.1 Flash Lite Image (`gemini-3.1-flash-lite-image`) for colouring by default. Gemini 3.1 Flash Image (`gemini-3.1-flash-image`) is an additional selectable image model. | P9 owner choice; image-capable models verified against Google's Gemini API image-generation documentation |
| D-BG | Where jobs run | **open**, decided by P0-C. Fallback: in-tab runner with same saved state | brief 7 |
| D-RGB | Is RGB PDF accepted by the shop | **open**, shop answer S5 | brief 5.4 |
| D-FONT | Hebrew (with nikud) and English font families | **assumed** (P5): Noto Sans Hebrew + Nunito, owner still to confirm; see `docs/font-licenses.md` | brief 2 |
| D-AI-SHAPE | Gemini output does not match the fixed picture ratio | **settled:** centre-crop the smallest excess edge; pre-flight warns when more than 3% of an edge is removed. | Owner decision during P9 |

### 2.2 Print-shop questions (send now; they block P7 and P8)

| ID | Question | Placeholder used meanwhile |
|---|---|---|
| S1 | Interior bleed amount | 3 mm |
| S2 | Spine-side margin: is 15 mm the **total** margin on the spine side, or 1 cm **plus** 15 mm? | 15 mm total |
| S3 | What does "you can send it as A4" mean (interior sheets only, or the cover too, which cannot be A4)? | exact sheet size, with "centred on A4" as an option |
| S4 | Exact sheet size and crop-mark offset for interior and for cover | trim + bleed + 10 mm mark zone |
| S5 | Is an RGB PDF acceptable, or is CMYK / PDF/X required? | RGB |
| S6 | Spine width per page count (their rule) | 8 mm at 40 pages |
| S7 | Interior as single pages in reading order? | yes |
| S8 | Opens to the right: is the front cover the **left** half of the flat cover file? | yes |
| S9 | Do they need PDF TrimBox/BleedBox, or are crop marks enough? | crop marks only |

### 2.3 Owner decisions and inputs

| ID | Item | Default (assumed) | Blocks |
|---|---|---|---|
| O-01 | The CSV (inputs: title, English text, Hebrew text; first data row = intro) | use a generated sample | P3 final check |
| O-02 | The QR image | placeholder square | P6 |
| O-03 | Portrait only in v1 | confirmed recommended | P3 |
| O-04 | Cover wording: title "משפחת ברגר, גבעת מרדכי, 5787", subtitle "צילום מצב מהחיים שלנו", short spine text "משפחת ברגר 5787" | as written | P8 |
| O-05 | Colophon wording for "created by Saprili" (Hebrew) | "נוצר בספרילי" (placeholder to confirm) | P6 |
| O-06 | Colouring-cover marker wording (Hebrew) | "ספר צביעה" (placeholder to confirm) | P8 |
| O-07 | Hebrew date day format (numerals or Hebrew letters) | letters for the day, numerals for the year | P6 |
| O-08 | Library: include "Duplicate book" and "Delete book" (with undo) | yes | P2 |
| O-09 | Minimum story-page count | 2 (one pair) | P3 |
| O-10 | Book title default and where it is edited | "book1"; editable in Book settings | P3, P6 |
| O-11 | Minimum text size for the longest page | 14 pt | P5 |
| O-12 | Low-resolution notice threshold | below 150 effective dpi gives a gentle notice | P6 |
| O-13 | Web Store visibility (public or unlisted) | unlisted | P12 |
| O-14 | Place for "Restore from backup" button | Library header, always visible | P11 |

---

## 3. Architecture

### 3.1 Runtime pieces
1. **App tab** (`app.html`): the single full-tab UI. Toolbar icon opens it or focuses the existing one.
2. **Service worker** (`background/service-worker.ts`): toolbar click handler and, from P10, the job queue host.
3. **Print page** (`print.html`): print-styled rendering of a print job; opened by the app in a new tab.
4. **One layout engine** (`src/layout`): pure geometry and rendering components shared by previews, print, colophon and cover. Preview equals output.

### 3.2 Repository layout (final shape; phases create their parts)

```
saprili/
  saprili-plan.md
  package.json, tsconfig.json, vite.config.ts, eslint config, prettier config
  public/
    manifest.json
    icons/                      (16, 32, 48, 128 png + logo.svg)
    fonts/                      (packaged woff2, licences in docs/font-licenses.md)
  app.html
  print.html
  src/
    app/                        AppRoot.tsx, routes.tsx, AppHeader.tsx, main.tsx
    background/
      service-worker.ts
      jobs/                     JobQueue.ts, JobRunner.ts, RetryPolicy.ts, KeepAlive.ts, resume.ts
    print/                      PrintApp.tsx, printJob.ts, CropMarks.tsx, print.css, PrintToolbar.tsx
    domain/                     book.ts, page.ts, cover.ts, colophon.ts, image.ts, job.ts, settings.ts,
                                constants.ts, factories.ts, validators.ts, spreads.ts, ordering.ts
    storage/                    StorageProvider.ts, IdbStorageProvider.ts, repositories.ts,
                                settingsStore.ts, migrations/, thumbnails.ts
    images/                     importPhoto.ts, imageOps.ts, aiCopy.ts, useFullImage.ts
    layout/                     specs.ts, geometry.ts, shape.ts, textFit.ts, theme.ts, borders.ts,
                                preflight.ts, coverGeometry.ts, render/ (React renderers)
    ai/                         ImageProvider.ts, providers/, promptTemplates.ts, prompts.ts,
                                postprocess.ts, generationService.ts, modelCatalog.ts, errors.ts
    features/
      library/ settings/ importcsv/ setup/ bookview/ pageview/ booksettings/
      colophon/ cover/ generate/ backup/
    shared/                     ids.ts, units.ts, errors.ts, clock.ts, messaging.ts, hebrewDate.ts, async.ts
    i18n/                       index.ts, en.ts
    ui/                         IconButton.tsx, Button.tsx, Tooltip.tsx, Modal.tsx, Banner.tsx,
                                SavedIndicator.tsx, ToastHost.tsx, UndoManager.ts, EmptyState.tsx, tokens.css
  scripts/                      check-headers.mjs, check-manifest-permissions.mjs, pdf-inspect.mjs
  spikes/                       throwaway P0 labs (never imported by src/)
  tests/e2e/                    Playwright specs, fixtures/
  docs/                         decisions.md, shop-questions.md, spike-findings.md, privacy-policy.md, etc.
```

### 3.3 Dependencies allowed
`react`, `react-dom`, `react-router-dom`, `zustand`, `idb`, `papaparse`, `fflate`, `@dnd-kit/core`, `@dnd-kit/sortable`, `lucide-react`. Dev: `typescript`, `vite`, `vitest`, `@testing-library/react`, `fake-indexeddb`, `playwright`, `eslint`, `prettier`, `pdf-lib`, `axe-core` (a11y test). Anything else needs a SYNC approval.

### 3.4 Routes (HashRouter, in `src/app/routes.tsx`)

| Path | Page component |
|---|---|
| `#/` | `LibraryPage` |
| `#/settings` | `MySettingsPage` |
| `#/import` | `ImportCsvPage` |
| `#/book/:bookId/setup` | `SetupPage` |
| `#/book/:bookId` | `BookViewPage` |
| `#/book/:bookId/settings` | `BookSettingsPage` |
| `#/book/:bookId/page/:pageId` | `PageViewPage` |
| `#/book/:bookId/cover` | `CoverEditorPage` |
| `#/book/:bookId/colophon` | `ColophonEditorPage` |

`print.html` receives `?job=<printJobId>`; the app first saves the `PrintJobSpec` through `MetaRepository` (key `printJob:<id>`), then opens the print page, which reads it back.

---

## 4. Product rules every phase must respect (short form of the brief)

- Interior order is fixed: Cover (outside sequence), Intro (alone), story pairs, Colophon (alone). Intro + even story pages + colophon is always even.
- Book1 **opens to the right** (spine on the right). Intro alone on the left of the first spread; story pairs read right-to-left; colophon alone on the right of the last spread. Binding side is editable and never invalidates illustrations.
- Page format (trim, orientation, text position) locks at setup. Portrait only.
- Add/delete story pages only in pairs. Intro pinned first, colophon pinned last, neither deletable.
- Safe margin floor: 10 mm from trim on every edge. Interior bleed placeholder 3 mm. Spine-side margin placeholder 15 mm.
- Picture shape is fixed per book; text adapts; overflow shrinks to minimum then warns; text is never cut.
- AI: every call stands alone; Hebrew is never sent; other pages are never sent; no text inside generated pictures.
- Illustrations are never printed from originals; originals are about 2000 px long edge; AI copies about 1024 px.
- Interface English; Hebrew RTL everywhere it appears; Hebrew above English in print.

---

## 5. Shared contracts (FROZEN)

All defined under `src/domain` and `src/shared` in Phase 1 (5.1 to 5.7), and extended only by the phase named. Names below are exact.

### 5.1 Entities

**`Book`** (one storage record per book; texts and order live inside it)

| Field | Type / meaning |
|---|---|
| `id` | string, from `newId()` |
| `schemaVersion` | number, current `CURRENT_SCHEMA_VERSION` |
| `title` | string, default "book1" |
| `createdAt`, `modifiedAt` | ISO 8601 strings |
| `format` | `PageFormat` (below) |
| `shape` | `BookShape` or null until computed (P5) |
| `bindingSide` | `'right'` or `'left'`, default `'right'` |
| `theme` | `ThemeSettings`: `presetId` (`'sky'`,`'mint'`,`'peach'`,`'lavender'`), `borderStyle` (`'scalloped'`,`'dotted'`,`'clouds'`,`'stars'`), `textPanel` boolean |
| `layout` | `LayoutSettings`: `marginTopMm`, `marginBottomMm`, `marginOuterMm`, `gutterMm` (spine side), `pictureTextGapMm` |
| `typography` | `TypographySettings`: `hebrewFontId`, `englishFontId`, `sizeStepsPt` (array of 3: large, medium, small), `alignment` (`'start'`,`'center'`), `hebrewEnglishSpacingMm`, `minFontSizePt` |
| `showPageNumbers` | boolean |
| `print` | `PrintSettings`: `sheetMode` (`'exact'`,`'centredA4'`) |
| `artStyleText` | string, the book's art-style sentence for AI |
| `intro` | `IntroPage` |
| `storyPages` | ordered `StoryPage[]` (always even length) |
| `colophon` | `Colophon` |
| `cover` | `Cover` |
| `lastBackupAt` | ISO string or null |

**`PageFormat`**: `trimWidthMm` (206), `trimHeightMm` (291), `orientation` (`'portrait'`), `textPosition` (`'below'`), `presetId` (`'shop-206x291'`), `lockedAt` (ISO or null).

**`BookShape`**: `textZoneHeightMm`, `pictureAspect` (width divided by height), `computedAt`. Computed once; see P5.

**`PageRef`**: `{ kind: 'intro' | 'story' | 'colophon'; id: string }`.

**`PhotoRef`**: `originalImageId`, `aiCopyImageId`.

**`IntroPage`**: `id`, `privateTitle`, `textEn`, `textHe`, `photos: PhotoRef[]`, `photoLayout` (`'firstLarge'`,`'collage'`).

**`StoryPage`**: `id`, `privateTitle`, `textEn`, `textHe`, `photos: PhotoRef[]`, `illustration: IllustrationState`, `colouring: ColouringState`.

**`IllustrationState`**: `currentImageId` or null, `history` (max 3 entries of `{ imageId, replacedAt }`), `customPrompt` string, `useEditMode` boolean. Also used by `Cover.illustration`.

**`ColouringState`**: `imageId` or null, `sourceIllustrationImageId` or null, `outdated` boolean.

**`Cover`**: `titleHe`, `subtitleHe`, `spineTextHe`, `illustration: IllustrationState`, `ownImageId` or null, `back: BackCover` (placeholder fields: `note` string), `colouringMarkerText`.

**`Colophon`**: `dateIso` (Gregorian, defaults to book creation date), `place` (default "Jerusalem"), `createdByTextHe`, `qrImageId` or null.

**`ImageRecord`** (one per image): `id`, `bookId`, `kind` (`'original'`,`'aiCopy'`,`'illustration'`,`'colouring'`,`'coverIllustration'`,`'coverUserImage'`,`'qr'`), `blob`, `mime`, `widthPx`, `heightPx`, `byteSize`, `createdAt`, `meta` (`source` `'uploaded'|'generated'`, `modelId?`, `generatedAt?`).
**`ThumbRecord`**: `imageId`, `bookId`, `blob`, `widthPx`, `heightPx`.

**`Spread`**: `index`, `kind` (`'intro'`,`'pair'`,`'colophon'`), `left: PageRef | null`, `right: PageRef | null`. Built only by `buildSpreads(book)` (right-binding: intro on left; pairs `right` = first page, `left` = second; colophon on right. Left-binding mirrors all of this).

**`UserSettings`**: `schemaVersion`, `illustrationModelId`, `colouringModelId`, `apiKey` or null. Defaults are `gemini-3-pro-image` and `gemini-3.1-flash-lite-image`.

**`Job`**: `id`, `batchId`, `bookId`, `kind` (`'illustration'`,`'colouring'`,`'coverIllustration'`), `target` (`{ kind: 'story', pageId }` or `{ kind: 'cover' }`), `overwrite`, `dependsOnJobId` or null, `status` (`'queued'`,`'running'`,`'succeeded'`,`'failed'`,`'cancelled'`,`'paused'`), `step` (`'pending'`,`'generating'`,`'postprocessing'`,`'saving'`,`'done'`), `attempts`, `errorCode?`, `errorMessage?`, `createdAt`, `updatedAt`.
**`JobBatch`**: `id`, `bookId`, `jobIds`, `createdAt`, `state` (`'running'`,`'paused'`,`'completed'`,`'cancelled'`), `pauseReason?`.

### 5.2 Constants (`src/domain/constants.ts`)
One exported object `PRINT_SPEC` plus named constants. Every value that depends on the shop carries a `placeholder: true` marker in a sibling `PLACEHOLDER_KEYS` list so the UI and docs can find them.

| Name | Value |
|---|---|
| `TRIM_PRESETS` | one preset `shop-206x291`: 206 by 291 mm |
| `SAFE_MARGIN_FLOOR_MM` | 10 |
| `DEFAULT_GUTTER_MM` | 15 (placeholder, S2) |
| `INTERIOR_BLEED_MM` | 3 (placeholder, S1) |
| `CROP_MARK_LENGTH_MM`, `CROP_MARK_OFFSET_MM`, `CROP_MARK_STROKE_MM` | 5, 3, 0.25 (placeholders, S4) |
| `COVER_PANEL_WIDTH_MM`, `COVER_HEIGHT_MM` | 206, 297 |
| `COVER_HINGE_WIDTH_MM`, `COVER_BLEED_MM` | 8, 15 |
| `SPINE_WIDTH_TABLE` | list of `{ pages, spineMm }`, single row `{40, 8}` (placeholder, S6) |
| `COVER_SAFE_INSET_MM` | 10 (placeholder) |
| `MAX_AI_PHOTOS_INTRO`, `MAX_AI_PHOTOS_PAGE` | 3, 3 |
| `ORIGINAL_LONG_EDGE_PX` | 2000 |
| `AI_COPY_LONG_EDGE_PX` | 1024 |
| `THUMB_LONG_EDGE_PX` | 256 |
| `ILLUSTRATION_HISTORY_MAX` | 3 |
| `MAX_AI_CROP_PERCENT` | 3 (pre-flight warning threshold) |
| `JOB_CONCURRENCY` | 2 |
| `UNDO_WINDOW_MS` | 8000 |
| `AUTOSAVE_DEBOUNCE_MS` | 500 |
| `HEADER_COMMENT_TEXT` | "bisiyata dishmaya, leharbot ahava biyisral" |

### 5.3 Storage API (`src/storage`)
`StorageProvider` is the only thing the rest of the app talks to. Methods used through repositories:

- **`BookRepository`**: `listBookSummaries()` → `BookSummary[]` (id, title, pageCount, modifiedAt, thumbImageId); `getBook(id)`; `createBook(book)`; `save(book, reason)` where reason is `'userEdit'`, `'generation'`, or `'system'` (only the first two update `modifiedAt`); `deleteBook(id)`; `duplicateBook(id)`.
- **`ImageRepository`**: `putImage(record, thumbBlob?)`, `getImage(id)`, `getThumb(id)`, `deleteImage(id)`, `listImageIdsForBook(bookId)`, `deleteImagesForBook(bookId)`, `purgeOrphanImages(book)`.
- **`SettingsRepository`**: `getUserSettings()`, `saveUserSettings(settings)`.
- **`JobRepository`**: `putJob`, `getJob`, `listJobsForBatch`, `putBatch`, `getBatch`, `listOpenBatches`.
- **`MetaRepository`**: generic small key/value for `printJob:<id>` and flags.
- **Migrations**: `CURRENT_SCHEMA_VERSION`, `migrateBookRecord(raw)`, `migrateImageRecord(raw)`, `migrateSettings(raw)`; registry in `storage/migrations/index.ts`.

### 5.4 Layout API (`src/layout`, defined in P5, consumed by P6 to P9)
- `getPrintSpec(book)`: merged print constants and book overrides.
- `computePageGeometry(book, pageRef, side)`: returns rectangles (trim, bleed, safe, border, picture, text, pageNumber) in page-local mm.
- `ensureBookShape(book)`: computes and stores `BookShape` once.
- `getPictureZoneSpec(book)`: `{ widthMm, heightMm, aspect }`. **P9 uses this to ask the AI for the right shape.**
- `getCoverPictureZoneSpec(book)`: same for the cover.
- `PageSheet` component: renders a page in an edition (`'colour'` or `'colouring'`).
- `runPreflight(book, edition)`: report of issues.
- `computeCoverGeometry(book, pageCount)` (P8).

### 5.5 Messaging (`src/shared/messaging.ts`, defined P10)
Commands tab to worker: `jobs/enqueue`, `jobs/cancelBatch`, `jobs/retryFailed`, `jobs/getSnapshot`, `jobs/resume`. Events worker to tab: `jobs/progress`, `jobs/batchStateChanged`, `jobs/fatalStop`. All payloads typed in one `JobsMessage` union.

### 5.6 Test-data conventions
- `tests/e2e/fixtures/sample-book.csv`: 1 intro + 6 story rows, English and Hebrew with nikud, one long row, one empty-ish short row.
- `tests/e2e/fixtures/photos/`: 6 small generic images (no real family photos in the repo).
- `MockImageProvider` (P9) is the only provider used in automated tests.

### 5.7 Errors (`src/shared/errors.ts`)
`AppError` has `code`, `userMessage`, `nextStep`, optional `cause`. `ErrorCode` values: `STORAGE_FAILED`, `STORAGE_QUOTA`, `MIGRATION_FAILED`, `CSV_BAD_COLUMNS`, `CSV_ODD_ROWS`, `CSV_EMPTY_ROWS`, `CSV_BAD_ENCODING`, `IMAGE_DECODE_FAILED`, `IMAGE_TOO_LARGE`, `AI_NO_KEY`, `AI_AUTH`, `AI_QUOTA`, `AI_REFUSED`, `AI_TEMPORARY`, `AI_BAD_RESPONSE`, `AI_UNSUPPORTED_MODEL`, `JOB_INTERRUPTED`, `BACKUP_INVALID`, `BACKUP_TOO_NEW`, `PRINT_ASSET_FAILED`. Messages live in `src/i18n/en.ts` under `errors.<code>.message` and `errors.<code>.next`.

---

## PHASE 0: Spikes (de-risk)

**Goal:** answer the four biggest unknowns with throwaway experiments before committing code to them. Four independent tracks; run each in its own chat. Spike code lives in `spikes/<track>/`, is never imported by `src/`, and may skip tests and the header rule (it still gets the header comment where cheap).

**Outputs:** `docs/spike-findings.md` (one section per track) and updated rows in the Decisions Register (D-AI, D-BG, D-RGB, D-FONT, date rules).

### Track P0-A: AI quality test

- [ ] **P0-A.1 [SYNC] Supply inputs.** Owner provides: intro English text and intro photos (including a group photo), 3 to 4 real story pages (English text and photos), at least two image-capable provider/model candidates from different vendors, paid-tier API keys, and confirms photos may be sent to those providers. Stored only on the owner's machine, never committed. *Default:* none; blocked until supplied.
- [ ] **P0-A.2 [ASYNC] Build the AI lab extension** in `spikes/ai-lab/` (its own `manifest.json` with host permissions for the candidate providers).
  - Names: `lab.html`, `labApp.ts`, `reduceImageForAi(file, longEdgePx, quality)`, `buildIllustrationRequest(introText, introPhotos, pageText, pagePhotos, artStyle)`, `buildColouringRequest(illustrationBlob)`, `buildCoverRequest(introText, introPhotos, artStyle)`, `callProvider(providerId, modelId, apiKey, request)`, `recordResult(entry)`, `exportResultsJson()`.
  - Rules: prompts follow brief section 7 exactly (no Hebrew sent, no other pages, no text in picture, fixed picture shape, calm edges). Show per result: output image, pixel size, latency, token or cost info if returned, refusal text. Store results in memory and export.
  - Done when: one click runs 4 illustrations, 4 colouring pages, and 1 cover for a chosen model and shows a results grid.
- [ ] **P0-A.3 [ASYNC] Prompt variants and clean-up.** Add switches in the lab: with and without a "cast list" paragraph on the intro text; "edit current illustration" mode if the model supports it; `forceBlackWhite(imageData, threshold)` clean-up for colouring output; try 2 to 3 target aspect ratios.
  - Done when: the lab can compare variants side by side.
- [ ] **P0-A.4 [SYNC] Judge results** using this rubric, per model: cartoon style and charm; likeness of characters to photos; **character drift** across the 4 pages; no written text in pictures; calm space at the edges; refusal rate on photos of children; delivered pixel size versus the need (about 2400 by 3400); colouring page suitability for a 4-year-old; cost per call and per 20-page book; ability to hit the fixed picture aspect without crop. Pick provider and model. *Default:* the model with best drift and refusal results; record as D-AI.
- [ ] **P0-A.5 [ASYNC] Write findings**: `docs/spike-findings.md` section with the rubric table, chosen model, supported aspect ratios or sizes, input image limits, whether edit mode is supported, and a cost model (cost per illustration, per colouring page, per 20-page book). This feeds P9 interface design.

### Track P0-B: Print test

- [ ] **P0-B.1 [SYNC] Send the shop questions S1 to S9** (section 2.2). *Default:* send as soon as `docs/shop-questions.md` exists.
- [ ] **P0-B.2 [ASYNC] Draft `docs/shop-questions.md`**: S1 to S9 in plain English with a Hebrew version, ready to paste, and a line for each question stating what we assume if unanswered.
- [ ] **P0-B.3 [ASYNC] Build the print lab** in `spikes/print-lab/`: `print-lab.html` with a control panel (hidden when printing) and three printable pages:
  1. one interior page at exactly 206 by 291 mm plus bleed and crop marks: themed background flooding into bleed, scalloped border, rounded picture frame with a placeholder, Hebrew paragraph with nikud above an English paragraph, optional soft white panel, page number;
  2. the flat cover 436 by 297 mm cut size plus 15 mm bleed (466 by 327 mm) plus crop marks, with hinge and spine guides drawn only in a preview mode;
  3. the same interior page in colouring edition (white, black outline border).
  - Names: `buildSheetCss(sheetWidthMm, sheetHeightMm)`, `renderInteriorSample(options)`, `renderCoverSample(options)`, `renderCropMarks(trimRect, bleedMm, offsetMm, lengthMm)`, toggle `sheetMode` exact versus centred on A4.
  - Rules: use CSS `@page` with exact size and zero margin, and forced background colours.
  - Done when: Chrome's print preview shows the exact sheet size with marks visible.
- [ ] **P0-B.4 [ASYNC] Font specimen page** `spikes/print-lab/fonts.html`: shows candidate Hebrew and English families rendering the same child-friendly sample (Hebrew with nikud, mixed Hebrew/English line, large and small sizes). Candidates to test (nikud support must be **verified**, not assumed): Hebrew: Noto Sans Hebrew, Rubik, Heebo, Assistant, Varela Round, Secular One, Frank Ruhl Libre; English: Nunito, Baloo 2, Fredoka, Quicksand. Only openly licensed fonts, files packaged locally.
- [ ] **P0-B.5 [ASYNC] PDF inspection script** `scripts/pdf-inspect.mjs` (uses `pdf-lib`): prints page count, each page's MediaBox in mm, and whether boxes exist. Plus `docs/pdf-inspection-checklist.md`: page size exact; backgrounds present; fonts embedded (`pdffonts`); no added margins; crop marks only outside the bleed band; Hebrew direction and nikud correct; opens in two PDF viewers.
- [ ] **P0-B.6 [SYNC] Print to PDF in Chrome** (Save as PDF, margins None, background graphics on), run the inspection checklist, send the PDFs to the shop for review (and optionally order one test copy). Record results.
- [ ] **P0-B.7 [SYNC] Decide RGB (D-RGB)** from shop answer S5. If CMYK/PDF/X is required, add a documented external conversion step in P7 (manual instruction page, not code). *Default:* RGB.
- [ ] **P0-B.8 [SYNC] Pick fonts (D-FONT)** from the specimen. Provide final choices and confirm licences allow packaging. *Default:* top nikud-correct Hebrew family plus a rounded English family.

### Track P0-C: Background job test

- [ ] **P0-C.1 [ASYNC] Build the background lab** in `spikes/bg-lab/` (own manifest, service worker, `lab.html`).
  - Names: `service-worker.ts` with `startFakeJob(totalSteps, stepSeconds)`, `runStep(jobState)`, `resumeIfNeeded()`, `saveJobState(state)` (IndexedDB), `logEvent(message)` (persisted with timestamps); keepalive strategies selectable at start: `none`, `alarmKeepAlive` (chrome.alarms), `portKeepAlive` (open port from the tab), `combined`; a step mode that awaits a real slow network request (30 to 90 s) instead of a timer.
  - Tab shows live progress and the persisted event log, and can be closed at any time.
  - Done when: a 40-step job survives a service worker restart by resuming from saved state.
- [ ] **P0-C.2 [SYNC] Run scenarios and report**: (a) tab open; (b) tab closed immediately after start; (c) Chrome fully quit and reopened; (d) laptop sleep for several minutes; (e) a single 60 to 90 s request per step. Record: did it finish, how many steps lost, did the service worker die, which keepalive worked.
- [ ] **P0-C.3 [SYNC] Decide D-BG**: background worker, or in-tab runner with the same saved state. *Default:* background worker with persistent state and the in-tab fallback kept available (`JOB_HOST_MODE` setting) in P10.
- [ ] **P0-C.4 [ASYNC] Write findings** including the exact keepalive recipe that worked, for P10.

### Track P0-D: Hebrew date test

- [ ] **P0-D.1 [ASYNC] Build the date lab** in `spikes/hebdate-lab/`.
  - Names: `getHebrewDateParts(date)`, `HEBREW_MONTH_NAMES` map (including the spelling "מרחשוון" and leap-year Adar I and Adar II), `formatHebrewDateLong(date)`, `formatYearNumerals(date)`, test table page `lab.html` showing 40 dates (month boundaries, Rosh Hashana, leap years, the browser's locale differences).
  - Rules: use the browser's built-in Hebrew calendar support; extract numeric day, month identity and year as data parts and map month names through the table, because the browser's own month spellings and numeral style may differ from the brief ("month spelled like מרחשוון, year as numerals").
  - Done when: table renders deterministically with no locale surprises.
- [ ] **P0-D.2 [SYNC] Verify** 10 to 15 dates against a trusted Hebrew calendar and approve the month-name table and number formats (day as letters or numerals: O-07). Note the evening/sunset boundary is ignored (date only).
- [ ] **P0-D.3 [ASYNC] Save fixtures** `docs/hebrew-date-fixtures.json` (input ISO date, expected day, month key, year). P6 turns these into unit tests.

### Phase 0 Definition of Done
- `docs/spike-findings.md` has all four sections; D-AI, D-BG, D-RGB, D-FONT, and date rules updated in section 2.
- Shop questions sent; answers tracked in section 2.2.
- **Human verification:** you have seen real AI output, a real PDF through Chrome, a job finishing with the tab closed, and correct dates.

### Phase 0 log
_(agent fills: files, findings, deviations)_

---

## PHASE 1: Scaffold, domain model, storage layer

**Goal:** a loadable extension with strict TypeScript, the frozen domain model, the single storage layer with versioned data, and guard-rail scripts. No real UI yet.
**Needs:** nothing from P0. **Produces:** `domain/*`, `storage/*`, `shared/*`, build tooling, toolbar behaviour.

- [ ] **P1.1 [SYNC] Confirm technical decisions D-01 to D-06** and project names: extension name "Saprili", short description, package name. Provide or approve a simple playful logo (agent may supply a placeholder SVG). *Default:* all defaults in 2.1, placeholder logo.
- [x] **P1.2 [ASYNC] Tooling and manifest.**
  - Files: `package.json` (scripts: `dev`, `build`, `typecheck`, `lint`, `lint:headers`, `test`, `e2e`, `package`), `tsconfig.json` (strict), eslint and prettier configs, `vite.config.ts` (three inputs: `app.html`, `print.html`, `src/background/service-worker.ts`), `public/manifest.json`.
  - Manifest rules: Manifest V3; permissions exactly `storage` and `unlimitedStorage`; background service worker as module; `action` without a popup; **no** host permissions yet (added in P9); no `tabs` permission; CSP default.
  - Done when: `npm run build` outputs a loadable `dist/`.
- [x] **P1.3 [ASYNC] Toolbar behaviour** in `src/background/service-worker.ts`.
  - Names: `registerActionClickHandler()`, `focusOrOpenAppTab()`.
  - Rules: clicking the icon opens `app.html` in a full tab, or focuses (and activates its window) the existing app tab if one is open. Prefer `chrome.runtime.getContexts` to find the tab. If finding it would need the `tabs` permission, **stop and ask** (SYNC) rather than adding the permission.
  - Done when: clicking the icon twice opens one tab only.
- [x] **P1.4 [ASYNC] Shared utilities.**
  - Files and names: `shared/ids.ts` `newId()`; `shared/units.ts` `cmToMm`, `mmToPx(mm, dpi)`, `pxToMm`, `mmToCss(mm)`; `shared/errors.ts` `AppError`, `ErrorCode`, `toAppError(unknown)`; `shared/clock.ts` `Clock` interface, `systemClock`, `fixedClock(iso)`; `shared/async.ts` `debounce`, `sleep`, `withTimeout`; `i18n/index.ts` `t(key, params?)`, `getDirection(locale)`; `i18n/en.ts` initial catalogue including all `ErrorCode` messages from 5.7.
- [x] **P1.5 [ASYNC] Domain model.**
  - Files: `domain/book.ts`, `page.ts`, `cover.ts`, `colophon.ts`, `image.ts`, `job.ts`, `settings.ts` (types from 5.1 exactly); `constants.ts` (5.2 exactly, with `PLACEHOLDER_KEYS`); `factories.ts`; `validators.ts`; `spreads.ts`; `ordering.ts`.
  - Names: `createEmptyBook(init)`, `createIntroPage()`, `createStoryPage()`, `createStoryPagePair()`, `createDefaultColophon(createdAtIso)`, `createDefaultCover()`, `createDefaultUserSettings()`; `validateBook(book)` (even story count, ≥ 0 pairs, margins ≥ floor, history ≤ 3, ids unique) returning a list of problems; `isInteriorPageCountEven(book)`; `getInteriorPageCount(book)`; `buildSpreads(book)`; `getPageRefsInReadingOrder(book)`; `findPage(book, ref)`; `getStoryPageIndex(book, pageId)`.
  - Rules: `buildSpreads` follows section 5.1 exactly, including mirroring for `bindingSide`. Defaults: margins top/bottom/outer 10 mm, gutter 15 mm, typography sizes 3 steps (placeholders, finalised P5).
  - Done when: unit tests cover right and left binding with 0, 2 and 6 story pages.
- [x] **P1.6 [ASYNC] Storage layer.**
  - Files: `storage/StorageProvider.ts` (interface), `storage/IdbStorageProvider.ts` (DB name `saprili`; stores `books`, `images`, `thumbs`, `jobs`, `batches`, `meta`), `storage/repositories.ts` (exports `bookRepository`, `imageRepository`, `jobRepository`, `metaRepository`, `getStorage()` / `setStorageForTests()`), `storage/settingsStore.ts` (`chrome.storage.local`, key `userSettings`; wrapper `SettingsRepository` with an in-memory test double), `storage/thumbnails.ts` (`createThumbnail(blob, longEdgePx)`), `storage/migrations/index.ts` (`CURRENT_SCHEMA_VERSION = 1`, registry, `migrateBookRecord`, `migrateImageRecord`, `migrateSettings`).
  - Rules: no other module touches IndexedDB or `chrome.storage` directly. `BookRepository.save(book, reason)` updates `modifiedAt` only for `userEdit` and `generation`. Reads always pass through migration. `deleteBook` also removes the book's images, thumbnails, jobs. `listBookSummaries` reads small data only (no blobs). Storage failures throw `AppError` with `STORAGE_FAILED` or `STORAGE_QUOTA`.
  - Done when: repository tests pass on `fake-indexeddb`.
- [x] **P1.7 [ASYNC] Guard-rail scripts and tests.**
  - `scripts/check-headers.mjs`: fails if any source file in `src`, `scripts`, `tests`, root configs lacks the header on line 1 (ignores JSON/CSV/md); wired as `lint:headers`.
  - `scripts/check-manifest-permissions.mjs`: fails if `dist/manifest.json` permissions differ from the allowed list in the script (updated by P9).
  - Tests: migration test with a hand-written "version 0" fixture upgraded to version 1; `save` modification-date rule; `buildSpreads`; validators.
- [ ] **P1.8 [SYNC] Human verification.** Load unpacked `dist/` in Chrome; click the icon (one tab only); inspect permissions (only storage and unlimited storage); open DevTools and confirm the `saprili` database exists.

### Phase 1 Definition of Done
Generic DoD (0.5) plus the checks above.
### Phase 1 log
- **Files:** tooling (`package.json`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.mjs`, prettier), `public/manifest.json`, icons (`scripts/generate-icons.mjs`), `app.html`, `print.html`, `src/{shared,i18n,domain,storage,background,app,print}`, `scripts/{check-headers,check-manifest-permissions,pending,generate-icons}.mjs`. 36 unit tests.
- **Architecture additions:** path alias `@/` = `src/`; ESLint layer rules (domain and storage free of React/UI, only `src/storage` may touch IndexedDB or `chrome.storage`); `StorageProvider` is a small typed port (`get`, `getAll`, `getAllByIndex`, `getAllKeysByIndex`, atomic `apply(ops)`) and repositories are factories (`createBookRepository(deps)`) so tests inject a fake clock and `fake-indexeddb`; `domain/imageRefs.ts` (`listReferencedImageIds`, `remapImageIds`) used by purge and duplicate; `background/appTab.ts` holds the testable tab logic behind `service-worker.ts`.
- **Deviations:** `ImageRepository.putImage(record, thumb?)` takes a `ThumbPayload` (`blob`, `widthPx`, `heightPx`) instead of a bare blob, because `ThumbRecord` needs dimensions. `CURRENT_SCHEMA_VERSION` is defined in `domain/constants.ts` and re-exported from `storage/migrations` (domain cannot import storage). Colophon has no id in 5.1, so its `PageRef.id` is the constant `COLOPHON_PAGE_ID` (`'colophon'`). `toAppError(error, fallback?)` has an optional second argument. Only `react`, `react-dom`, `idb` installed; `e2e` and `package` scripts are stubs until P2 and P12. Version 0 migration fixtures describe a prototype shape (`innerMarginMm`, no `print`/`lastBackupAt`/image `meta`).
- **Decisions assumed:** D-01 to D-06 defaults, placeholder logo.
- **For the human:** P1.1 confirm decisions and logo; P1.8 load `dist/` unpacked, click the icon twice (one tab), check permissions, confirm DB `saprili` exists (the app page opens it).
- **Follow-up for P3:** `data.csv` has header `Title,eng_descrip,heb_descr` (add aliases), `---------,,` separator rows and a `,,,` blank row between pairs (parser must skip them, not report them as empty rows), titles are image-like names, and the sample has 1 intro + 2 rows per pair groups.

---

## PHASE 2: UI kit, My settings, Library

**Goal:** the app shell, shared UI parts, autosave pattern, My settings, and an empty-state Library.
**Needs:** P1. **Produces:** `ui/*`, `app/*`, `features/settings`, `features/library`.

- [x] **P2.1 [ASYNC] Design tokens and UI kit.**
  - Files: `ui/tokens.css` (CSS variables for the playful palette from brief 5.3: sky-blue base, sunny yellow, coral, mint, lilac), `ui/IconButton.tsx` (props: `icon`, `label` **required** (accessible name and tooltip), `onClick`, `disabled`, `disabledReason`), `ui/Button.tsx`, `ui/Tooltip.tsx`, `ui/Modal.tsx` (focus trap, Escape closes), `ui/ConfirmDialog.tsx`, `ui/Banner.tsx` (types `info`, `warning`, `error`), `ui/SavedIndicator.tsx` (states `idle`, `saving`, `saved`, `failed`), `ui/ToastHost.tsx`, `ui/EmptyState.tsx`, `ui/Spinner.tsx`, `ui/UndoManager.ts` (`registerUndo({label, undo, onExpire})`, uses `UNDO_WINDOW_MS`) with `ui/UndoToast.tsx`.
  - Icons: person icon (My settings), sliders icon (Book settings). **No gear icon anywhere.**
  - Rules: logical CSS properties only; no hard-coded left/right.
- [x] **P2.2 [ASYNC] Autosave pattern.**
  - Files: `shared/useAutosave.ts`: `useAutosave(value, saveFn, options)` returns `{ status, lastSavedAt, error, flush }` with debounce `AUTOSAVE_DEBOUNCE_MS`; `ui/SaveErrorBanner.tsx` (loud banner with retry); `app/useBeforeUnloadGuard.ts` (warns only while a save is pending or failed).
- [x] **P2.3 [ASYNC] App shell.**
  - Files: `app/main.tsx`, `app/AppRoot.tsx`, `app/routes.tsx` (table in 3.4; unbuilt pages render `ComingSoonPage`), `app/AppHeader.tsx` ("Saprili" and "Your storybook scribe"; person icon to `#/settings`), `app/NotFoundPage.tsx`, `app/ErrorBoundary.tsx` (plain-language fallback with a way back to the Library).
- [x] **P2.4 [ASYNC] My settings.**
  - Files: `features/settings/MySettingsPage.tsx`, `ModelDropdown.tsx` (lists image-capable models only from `ai/modelCatalog.ts`), `ApiKeyField.tsx` (masked with show/hide toggle), `PrivacyNotice.tsx`; `ai/modelCatalog.ts` with `ImageModelEntry` (`id`, `provider`, `label`, `supportsEdit`, `imageCapable`) and a **placeholder** list (real list in P9).
  - Rules: autosave with the "Saved" indicator; key stored only via `SettingsRepository`; never logged or put in URLs; notice says photos and English text go to the chosen provider.
- [x] **P2.5 [ASYNC] Library.**
  - Files: `features/library/LibraryPage.tsx`, `BookCard.tsx`, `BookThumbnail.tsx` (cover illustration thumb, else first intro photo thumb, else placeholder), `useBookSummaries.ts` (sorted by `modifiedAt` descending), `EmptyLibraryState.tsx` (friendly), `ImportCsvButton.tsx` (labelled "Import book1 from CSV", **shown only while no book exists**, navigates to `#/import`).
  - Rules: card shows title, page count (interior pages incl. intro and colophon), last modified date, thumbnail; thumbnails only, never full images.
  - Per O-08 (assumed yes): `BookCardMenu` with **Duplicate book** (`duplicateBook`) and **Delete book** (confirm dialog, then undo window via `UndoManager`; physical delete after expiry).
- [x] **P2.6 [ASYNC] Tests.** Component tests for `IconButton` (name required), autosave states, Library empty and filled; an axe check that every icon button has an accessible name; end-to-end: open extension tab, see empty state, change My settings, reload, values persisted.
- [ ] **P2.7 [SYNC] Human verification.** Click through Library and My settings; judge the look of the palette and header; confirm the key is masked and persists. Answer O-08.

### Phase 2 Definition of Done
Generic DoD plus: no gear icon; every icon has an accessible name; key not visible in any log.
### Phase 2 log
- **Files:** `src/ui` (design tokens, shared controls, dialogs, notifications and undo), `src/shared/useAutosave.ts`, `src/app` (header, hash routes, error boundary and unload guard), `src/ai/modelCatalog.ts`, `src/features/settings`, `src/features/library`, and `scripts/e2e-phase2.mjs`.
- **Behavior:** My settings autosaves through `SettingsRepository`; the key is masked by default and is never logged or placed in a URL. Library cards use only thumbnails, sort by modification time, and support duplicate plus delayed delete with an undo window. Import is offered only when there are no books. Import and later book routes show a coming-soon page.
- **Architecture addition:** `AUTOSAVE_DEBOUNCE_MS` lives in `shared/timing.ts` and is re-exported from `domain/constants.ts`, so the shared hook can use it without reversing the domain/shared dependency rule.
- **Tests:** 115 unit/component tests pass, including axe button-name checks and modal focus behavior. `npm run e2e` builds the extension and verifies the empty state and settings persistence after reload in Playwright Chromium.
- **Not yet verified by a person:** P2.7 palette/header review and O-08 confirmation remain open.

---

## PHASE 3: CSV import, Setup, Book view

**Goal:** go from a CSV file to a configured book and a working Book view with pairs, reordering, and add/delete in pairs.
**Needs:** P1, P2. **Produces:** `features/importcsv`, `features/setup`, `features/bookview`, `domain/ordering.ts` operations.

- [x] **P3.1 [ASYNC] CSV parsing and validation.**
  - Files: `features/importcsv/csvParser.ts`, `csvErrors.ts`.
  - Names: `decodeCsvBuffer(buffer)` (handles UTF-8 with or without BOM; detects likely wrong encoding, e.g. replacement characters or legacy Hebrew codepage mojibake, and raises `CSV_BAD_ENCODING`), `parseBookCsv(buffer)` → `ParsedCsv`, `validateParsedCsv(parsed)` → `CsvValidationResult`.
  - Rules: columns are title, English text, Hebrew text (header names matched case-insensitively; accept aliases including `Title`, `eng_descrip`, and `heb_descr`); first data row is the intro. Ignore entirely blank records. A record whose title is only hyphens and whose English and Hebrew cells are blank is a pair separator, not a page; separators may follow the intro or a complete story pair, and story pages pair in source order. The remaining data rows must be 1 plus an even number. Errors with row numbers: wrong columns (`CSV_BAD_COLUMNS`), odd count or a separator that splits a pair (`CSV_ODD_ROWS`), an empty file (`CSV_EMPTY_ROWS`), or bad encoding. Paragraph line breaks preserved. **Atomic:** nothing is created on any error.
  - `buildBookFromCsv(parsed, nowIso)`: creates the `Book` (title "book1", `format.lockedAt = null`, `shape = null`, first row to `intro`, rest to `storyPages` in order, default colophon and cover).
- [x] **P3.2 [ASYNC] Import screen.**
  - Files: `ImportCsvPage.tsx`, `CsvFilePicker.tsx`, `ImportErrorList.tsx` (plain language, row numbers, next step), `importBookFromCsv(file)` (validate, then `bookRepository.createBook`, then navigate to `#/book/:id/setup`). Page only reachable while no book exists (guard); otherwise redirects to Library.
- [x] **P3.3 [ASYNC] Setup screen.**
  - Files: `features/setup/SetupPage.tsx`, `TrimSizePicker.tsx` (preset list from `TRIM_PRESETS`), `OrientationPicker.tsx` (portrait selected; landscape shown disabled with tooltip "Not in this version"), `TextPositionPicker.tsx` (below only), `FormatLockNotice.tsx` (exact message: "This can't be changed later, because your illustrations are drawn to fit this exact shape."), `confirmSetup(bookId, choices)`, `useSetupGuard(bookId)` (any edit route redirects to Setup while `format.lockedAt` is null).
  - Rules: `confirmSetup` sets `format` and `lockedAt` through `save(book, 'userEdit')`. It also calls `onFormatLocked(book)`, a hook (initially a no-op in `features/setup/formatLockHook.ts`) that P5 fills with `ensureBookShape`.
  - Duplicate into a new format: `duplicateBookWithNewFormat` is **deferred** (see the Backlog section at the end); this phase only blocks changing format.
- [x] **P3.4 [ASYNC] Book view layout.**
  - Files: `features/bookview/BookViewPage.tsx`, `CoverRow.tsx`, `IntroRow.tsx`, `StoryRow.tsx`, `PairGroup.tsx`, `ColophonRow.tsx`, `RowIndicators.tsx`, `rowStatus.ts`.
  - Names: `getRowStatus(page)` → `{ hasEnglish, hasHebrew, photoCount, hasIllustration, hasColouring, colouringOutdated }`; indicators are icons with tooltips (not checkboxes), "outdated" mark on colouring.
  - Rules: fixed top-to-bottom order: Cover row (shows whether a cover illustration exists), Intro (visually separated), story pages grouped in visible pairs, Colophon row (separated). Clicking a row routes to its page (`#/book/:id/page/:pageId`, cover row to `#/book/:id/cover`, colophon to `#/book/:id/colophon`). Pair labels from `buildSpreads`.
  - `BookToolbar.tsx`: buttons Print book, Print colouring book, Print cover, Download all/backup, Generate, Add pages, Delete pages, Book settings (sliders icon). Buttons whose feature is not built yet are **disabled with a tooltip** naming the future phase.
- [x] **P3.5 [ASYNC] Reordering.**
  - Pure functions in `domain/ordering.ts`: `moveStoryPage(book, pageId, newIndex)`, `moveStoryPageUp(book, pageId)`, `moveStoryPageDown(book, pageId)`, `previewPairsAfterMove(book, pageId, newIndex)`.
  - UI: `useStoryReorder.ts` with `@dnd-kit` sortable on story rows only (intro and colophon pinned, not draggable); drag handle plus move up/down `IconButton`s; **live pair regrouping** while dragging using `previewPairsAfterMove`; keyboard accessible.
  - Rules: reordering never touches page content; saves with `userEdit`.
- [x] **P3.6 [ASYNC] Add and delete in pairs.**
  - Pure functions: `addStoryPagePairs(book, count, atPairIndex?)`, `deleteStoryPagePair(book, pageId)` (deletes the pair containing the page; always even).
  - UI: `AddPagesDialog.tsx` (number of pairs, where), `DeletePagesDialog.tsx` (select pairs, shows what will be removed), delete uses `UndoManager` and delays `purgeOrphanImages` until the undo window expires.
  - Rules: minimum pair count per O-09 (assumed 1 pair); intro and colophon never deletable.
- [x] **P3.7 [ASYNC] Tests.**
  -  Unit: CSV fixtures (valid, wrong columns, odd rows, blank records, dashed pair separators, BOM, Windows-1255 bytes), `buildBookFromCsv`, ordering functions (invariants: always even, intro/colophon unchanged), pairing after moves.
  - End-to-end: Library to import (sample CSV) to Setup to Book view; reorder; add a pair; delete a pair and undo.
- [x] **P3.8 [SYNC] Human verification.** Owner imported the **real CSV** (O-01), checked text, Hebrew, row count and the first-row-is-intro rule; confirmed the default book title (O-10) and minimum pairs (O-09); tried drag reordering and the setup lock message. Owner reports that it looks great.

### Phase 3 Definition of Done
Generic DoD plus: every CSV error case leaves the Library without a new book; any edit route before Setup redirects to Setup.
### Phase 3 log
P3.1–P3.7 ASYNC work is implemented. CSV import supports UTF-8/BOM, the provided header aliases, ignored blank records, and ignored dashed pair separators; separators are validated at pair boundaries. Setup locks the selected format, and the Book view supports pair regrouping, reordering, add/delete, and undo before orphan cleanup. Added unit, route-flow, and extension-browser coverage.

Owner-approved CSV rule update: entirely blank records are ignored; rows with a hyphen-only title and empty text cells are pair separators, not pages. The provided `data.csv` structure has one intro, 46 story pages (23 pairs), one ignored blank record, and 24 valid separator boundaries.

P3.8 human verification is complete; the owner reports that the real CSV import and UI look great. Phase 3 is complete.

---

## PHASE 4: Page view: spread editor, text, photos

**Goal:** open any page, edit its text and photos, see pictures full size, and have everything autosave. Preview area is a plug-in slot filled by P6.
**Needs:** P3. **Produces:** `images/*`, `features/pageview/*`.

- [x] **P4.1 [ASYNC] Photo import pipeline** (`src/images`).
  - Files: `importPhoto.ts`, `imageOps.ts`, `aiCopy.ts`.
  - Names: `PhotoImportService.importFiles(bookId, files)` → `PhotoRef[]`; `decodeImageFile(file)` (honour camera orientation metadata; unsupported formats such as HEIC raise `IMAGE_DECODE_FAILED` with a "save as JPEG or PNG" next step); `resizeToLongEdge(bitmap, longEdgePx, mime, quality)`; `makeOriginal(bitmap)` (about `ORIGINAL_LONG_EDGE_PX`, never upscale); `makeAiCopy(bitmap)` (about `AI_COPY_LONG_EDGE_PX`, moderate JPEG compression); `createThumbnail` from P1.
  - Rules: per photo store three records: `original`, linked `aiCopy`, and a thumbnail of the original; all in one storage transaction; all functions worker-safe (use `createImageBitmap` and `OffscreenCanvas`, no DOM `Image`), because P9 and P10 reuse them in the service worker.
  - `getAiPhotoSelection(page, cap)` → `{ used: PhotoRef[], flaggedExtra: PhotoRef[] }` (first N photos used, rest flagged, never silently dropped; caps `MAX_AI_PHOTOS_INTRO` / `MAX_AI_PHOTOS_PAGE`).
- [x] **P4.2 [ASYNC] Photo inputs and strip.**
  - Files: `features/pageview/PhotoDropZone.tsx` (drag and drop, file picker button, accepts images only), `usePasteImages.ts` (clipboard paste anywhere on the page view), `PhotoStrip.tsx` (thumbnails, remove with undo, drag to reorder, badge "Not sent to AI (limit 3)" on flagged extras), `useThumb(imageId)`.
  - Rules: thumbnails in lists, full images only on demand.
- [x] **P4.3 [ASYNC] Image overlay.**
  - Files: `ui/ImageOverlay.tsx`, `images/useFullImage.ts` (loads the full blob on demand and revokes the object URL on close).
  - Rules: click any picture opens a full-size overlay; Escape closes; focus returns to the trigger.
- [x] **P4.4 [ASYNC] Book working copy and autosave.**
  - Files: `features/pageview/useBookStore.ts` (zustand: `loadBook(id)`, `updateBook(mutator)`, `commit(reason)`), `useBookAutosave.ts` (uses `useAutosave` from P2; debounced `bookRepository.save(book, 'userEdit')`), `SaveStatusBar.tsx`.
  - Rules: only real changes bump the modified date (compare before saving); photo imports save immediately; failure shows the loud banner with retry.
- [x] **P4.5 [ASYNC] Spread editor.**
  - Files: `features/pageview/PageViewPage.tsx`, `SpreadEditor.tsx` (reads `buildSpreads`; **mirrored for right binding**: intro alone on the left, colophon alone on the right), `SpreadFrame.tsx`, `PageSlot.tsx` (shows the page's preview slot, click selects the page being edited), `SpreadNavigator.tsx` (previous/next spread; arrow keys mirrored for right binding), `PageEditorPanel.tsx`.
  - Panel parts: `PrivateTitleField.tsx`, `HebrewTextField.tsx` (`dir="rtl"`, `lang="he"`), `EnglishTextField.tsx`, `PhotosSection.tsx`, `IntroPhotoLayoutPicker.tsx` (intro only: first photo large or collage of up to 4), `IllustrationSection.tsx` and `ColouringSection.tsx` (read-only placeholders now; P9 fills actions), `PreviewSlot.tsx` (renders a `PagePreviewPlaceholder` until P6 swaps in the real preview; the slot prop interface is `{ book, pageRef, edition }`).
  - Colophon page: the panel shows a link to `#/book/:id/colophon` (editor built in P6). Intro has no illustration/colouring sections.
  - `PageActionsBar.tsx`: Generate/Retry, Make colouring page, Download page files, Print page, all disabled with tooltips naming their phase.
  - Rules: paragraphs allowed, no rich formatting; text edits keep paragraph breaks.
- [x] **P4.6 [ASYNC] Tests.**
  - Unit: `getAiPhotoSelection`, `resizeToLongEdge` dimension math.
  - End-to-end (Chromium): import a rotated phone-style JPEG fixture and verify displayed orientation and stored sizes; drag/drop, paste, remove with undo; edit Hebrew and English, reload, verify persistence; overlay opens and Escape closes.
- [ ] **P4.7 [SYNC] Human verification.** Use real phone photos (very large, rotated, PNG, one HEIC) and confirm speed and sizes; confirm the intro photo layout default; confirm mirrored spread feels right for a right-opening book.

### Phase 4 Definition of Done
Generic DoD plus: no full-size image loaded in lists; photo functions contain no DOM `Image` usage (worker-safe).
### Phase 4 log
Implemented worker-safe photo decoding/resizing and atomic original/AI-copy/thumbnail storage; AI photo selection flags overflow without dropping it. Added drag/drop, picker, paste, sortable thumbnail strip with undo, and an on-demand full-size overlay. Added the Zustand book working copy with debounced autosave, mirrored spread navigation, bilingual text editing, intro photo layout, preview placeholders, and phase-disabled actions. Unit, editor-flow, and Chromium extension tests cover photo dimensions/orientation, persistence, paste, undo, and overlay dismissal.

P4.7 human verification remains: confirm speed and sizes with real phone photos (including HEIC), the intro layout default, and right-binding spread feel.

---

## PHASE 5: Layout engine core, theme, borders

**Goal:** one engine that turns a book and a page into exact geometry and a rendered page, with theme and vector borders, for both colour and colouring editions. This is the foundation of preview, print, colophon and cover.
**Needs:** P1, P4; font choice D-FONT from P0-B. **Produces:** `src/layout/*`, `public/fonts/*`.
**Touches earlier files:** `features/setup/formatLockHook.ts` (fill the hook with `ensureBookShape`); `features/pageview/PreviewSlot.tsx` is left for P6.

- [ ] **P5.1 [SYNC] Provide fonts and review the palette inputs.** Confirm D-FONT files and licences (record in `docs/font-licenses.md`), the 4 theme presets' colour values, and the default for text panel on or off. *Default:* palette from brief 5.3 chosen by the agent, panel off.
- [x] **P5.2 [ASYNC] Print spec and geometry.**
  - Files: `layout/specs.ts`, `layout/geometry.ts`.
  - Names: `getPrintSpec(book)` → `{ trim, bleedMm, safeFloorMm, sheetMode, cropMark {lengthMm, offsetMm, strokeMm} }` from constants and book settings; `Rect` type; `insetRect`, `unionRects`; `clampLayoutSettings(settings)` (enforce `SAFE_MARGIN_FLOOR_MM`, return what was clamped); `computePageGeometry(book, pageRef, side)` where `side` is `'left'` or `'right'` of the spread, so the gutter margin sits on the spine side; returns `PageGeometry` with `trimRect`, `bleedRect`, `safeRect`, `borderRect`, `pictureRect`, `textRect`, `pageNumberRect`, all in page-local mm with origin at trim top-left.
  - Rules: the gutter margin always sits on the **inner edge** (toward the centre fold): the right edge of a left-hand page and the left edge of a right-hand page. Binding side does not change this rule; it only changes which pages are left or right, through `buildSpreads`. So a right-opening book has the intro on the left (gutter on its right edge) and the colophon on the right (gutter on its left edge).
- [x] **P5.3 [ASYNC] Fixed picture shape and text zone.**
  - Files: `layout/shape.ts`, `layout/textFit.ts`.
  - Names: `TextMeasurer` interface (`measureBlockHeightMm(text, fontFamily, sizePt, widthMm, direction)`); `DomTextMeasurer` (hidden DOM element, waits for fonts via `ensureFontsLoaded(fontIds)`); `FakeTextMeasurer` (tests); `computeTextZoneHeightMm(book, measurer)` (measures **every page's real text** at `minFontSizePt` including Hebrew above English and spacing, takes the maximum, adds padding, caps at a maximum page fraction and reports a warning if capped); `computeSizeStepThresholds(book)` (3 fixed steps chosen by text length distribution); `chooseFontStep(textLength, thresholds)`; `fitTextInZone(page, zone, steps, measurer)` → `TextFitResult { stepIndex, overflow, usedHeightMm }` (shrink to minimum, then flag overflow; **never cut text**).
  - `ensureBookShape(book, measurer)` → book with `shape` set **once** (`textZoneHeightMm`, `pictureAspect` derived from the picture zone at default margins) and never recomputed silently. Wire it into `onFormatLocked` (P3 hook).
  - `computePictureRect(availableRect, aspect)`: uniform scaling: margin changes **scale the picture zone evenly** (aspect never changes); `getPictureZoneSpec(book)` and (stub for P8) `getCoverPictureZoneSpec(book)`.
  - `recomputeBookShape(book, measurer)`: explicit user action only; documented to invalidate illustration fit and warn (used by P6 Book settings).
- [x] **P5.4 [ASYNC] Theme and borders.**
  - Files: `layout/theme.ts`, `layout/borders.ts`, `layout/render/BorderLayer.tsx`.
  - Names: `THEME_PRESETS` (sky default, mint, peach, lavender: background, accent list, text colour, panel colour); `resolveTheme(book, edition)` (colouring edition: white background, black outlines); border generators `buildScallopedBorderPath(rect, params)`, `buildDottedBorderPath`, `buildCloudsBorderPath`, `buildStarsBorderPath` returning vector path data; `BorderLayer` draws them in palette colours (or black outline in colouring edition) inside the safe margin.
  - Rules: sharp at any size, no raster images, no AI calls; soft colours so CMYK conversion stays safe.
- [x] **P5.5 [ASYNC] Renderers** (`layout/render/`, all positioned in `mm` via geometry).
  - Components: `PageSheet.tsx` (props: `book`, `pageRef`, `side`, `edition`, `showBleed`), `BackgroundLayer.tsx` (floods to bleed), `PictureLayer.tsx` (rounded corners, thin frame, empty frame when missing), `TextLayer.tsx` (Hebrew block above English, Hebrew RTL, each in its own font, size step from `fitTextInZone`, optional soft white rounded panel), `PageNumberLayer.tsx`, `IntroPhotoLayer.tsx` with `computeIntroPhotoLayout(photoCount, mode, pictureRect)` (first photo large, or collage grid for up to 4).
  - Rules: intro prints the original photos (as-is, also in colouring edition). Illustration and colouring images come from `ImageRepository` through a `useBlobUrl(imageId)` hook for screen and a synchronous `ResolvedImages` map for print.
- [x] **P5.6 [ASYNC] Fonts packaging.**
  - Files: `public/fonts/*.woff2`, `layout/fonts.css` (`@font-face` for the chosen families), `layout/fontRegistry.ts` (`FONT_REGISTRY`, `getFontFamilyCss(fontId)`, `ensureFontsLoaded`), `docs/font-licenses.md`.
  - Rules: files packaged inside the extension; no remote font loading; nikud verified in a test page.
- [ ] **P5.7 [ASYNC] Tests.** (partially complete; see Phase 5 log)
  - [x] Unit tests: `computePageGeometry` for left and right pages with both binding sides (spine-side margin correct, safe floor respected); `clampLayoutSettings`; picture scaling keeps aspect; text-zone maximum from sample texts with `FakeTextMeasurer`; step choice; overflow flag. Also covered shape locking/recompute, themes, all border styles, both render editions, intro photo layouts, and page rendering.
  - [ ] Visual: Playwright screenshots of `PageSheet` for intro, story, long-text story, colouring edition, stored as baselines. Playwright is not installed yet; browser inspection of the dev page is recorded in the Phase 5 log but does not replace checked-in baselines.
- [ ] **P5.8 [SYNC] Human verification.** Review rendered sample pages (screenshots or a dev route `#/dev/layout`): colours, border styles, text sizes for a small child, nikud correctness, panel on/off, minimum font size (O-11).

### Phase 5 Definition of Done
Generic DoD plus: geometry numbers for the 206 by 291 page match hand calculation in the tests; `ensureBookShape` runs once at setup and never changes an existing shape.
### Phase 5 log
- **Files:** `src/layout/{specs,geometry,shape,textFit,pageText,theme,borders,fontRegistry,index}.ts`, `layout/fonts.css`, `layout/render/{PageSheet,BackgroundLayer,BorderLayer,PictureLayer,TextLayer,PageNumberLayer,IntroPhotoLayer}.tsx`, `render/{introPhotos,pageImages,useBlobUrl,useFontsReady,layerStyle}.ts`, tests beside each module (69 new tests), `public/fonts/*.woff2` (Noto Sans Hebrew 400/700, Nunito latin 400/700), `docs/font-licenses.md`, dev page `src/features/devlayout/*` (`#/dev/layout`, only in non-production builds; one lazy import added to `app/AppRoot.tsx`). ESLint now ignores unused args and vars that start with `_`.
- **Page model:** safe rect = trim minus margins (gutter on the inner edge); border band (7 mm) sits inside the safe rect; content = safe rect inset 9 mm; a 6 mm page-number band is always reserved at the bottom (so toggling numbers never moves anything); text zone under the picture; picture area gets the rest and the picture is fitted centred with the book's aspect. Default 206 x 291 numbers are hand-checked in `geometry.test.ts`. Constants (`BORDER_BAND_MM`, `PAGE_NUMBER_BAND_MM`, `TEXT_ZONE_PADDING_MM`, `MAX_TEXT_ZONE_FRACTION` 0.4, `MIN_TEXT_ZONE_HEIGHT_MM`, `DEFAULT_TEXT_ZONE_HEIGHT_MM` 60) are in `layout/specs.ts`.
- **Shape:** `ensureBookShape(book, measurer?, clock?)` returns the same object when a shape exists; `recomputeBookShape` is the only way to replace it. `createBookMeasurer(book)` awaits the fonts and returns the DOM measurer; call it before `ensureBookShape` in the browser. Before a shape exists, geometry uses a provisional 60 mm text zone.
- **Deviations / additions:** `computePictureRect` lives in `geometry.ts` (avoids an import cycle) and is re-exported from `shape.ts`. `TextFitResult` also has `fontSizePt`. Border generators are one `buildBorderShapes(style, rect, theme)` returning shape data (paths and circles) instead of four path functions. `PageSheet` takes optional `images` (the print `ResolvedImages` map) and `measurer`. Intro and story page numbers: only story pages show a number (position in the printed interior, intro = 1). Photos and illustrations use `object-fit: contain` (never cropped). Font ids stay `hebrew-default` and `english-default` so books made in P1 keep working. The colophon renders background and border only; its content is P6.
- **Not done:**
  - `features/setup/formatLockHook.ts` does not exist yet (P2 to P4 are not built), so `ensureBookShape` is not wired into `onFormatLocked`. P3 must call `await createBookMeasurer(book)` then `ensureBookShape(book, measurer)` when the format is locked.
  - Playwright visual baselines (P5.7): Playwright is not installed yet (e2e arrives later). Rendering is covered by server-render tests; the dev page was visually inspected in a browser for intro/story, long text, Hebrew nikud, all four borders, colour/colouring editions, and text panel on/off. No screenshot baselines were committed.
- **Decisions assumed:** D-FONT = Noto Sans Hebrew + Nunito; palette: sky `#DCEFFB`, mint `#DDF6EA`, peach `#FFE8D9`, lavender `#ECE4FA` with sunny/coral/mint/lilac/sky accents; text panel off by default.
- **For the human:** P5.1 confirm fonts, palette and panel default. P5.8 run `npx vite build --mode development`, load `dist/`, open `app.html#/dev/layout` (switch edition, theme, border, panel, binding, min font; check nikud and text sizes for a small child, and O-11).

---

## PHASE 6: Previews, Book settings, pre-flight, colophon

**Goal:** make previews print-accurate with guides, add Book settings, pre-flight checks, the Hebrew date, and the colophon page and editor.
**Needs:** P5; P0-D results. **Produces:** `features/booksettings`, `features/colophon`, `layout/preflight.ts`, `shared/hebrewDate.ts`.
**Touches earlier files:** `features/pageview/PreviewSlot.tsx` (swap placeholder for `PagePreview`); `features/bookview/BookToolbar.tsx` (enable Book settings).

- [x] **P6.1 [ASYNC] Print-accurate preview.**
  - Files: `features/pageview/PagePreview.tsx` (wraps `PageSheet`), `GuideOverlay.tsx` (trim, bleed, safe lines, spine side), `PreviewToggleBar.tsx` (toggles for guides), `useEdition.ts` (colour versus colouring preview toggle).
  - Rules: preview uses the **same** `PageSheet` as print, nothing separate.
- [x] **P6.2 [ASYNC] Hebrew date.**
  - Files: `shared/hebrewDate.ts`, `shared/hebrewDate.test.ts`.
  - Names: `getHebrewDateParts(date)`, `HEBREW_MONTH_NAMES`, `formatHebrewDate(date, options)` (month spelled per the approved table such as "מרחשוון", year as numerals, day format per O-07), `isHebrewLeapYear(year)`.
  - Rules: implementation is the approved P0-D lab code; tests load `docs/hebrew-date-fixtures.json`.
- [x] **P6.3 [ASYNC] Colophon.**
  - Files: `layout/render/ColophonLayer.tsx`, `features/colophon/ColophonEditorPage.tsx`, `ColophonDateField.tsx` (Gregorian date input with live Hebrew form shown; defaults to book creation date), `PlaceField.tsx` (default "Jerusalem"), `CreatedByField.tsx`, `QrImageField.tsx` (upload; stored as image kind `qr`; shown on a white square with clear space), `ColophonPreview.tsx`.
  - Rules: colophon is generated, not typed; same theme and margins as other pages; appears in the colouring book too (colouring edition: white themed page, outline border); text wording per O-05.
- [x] **P6.4 [ASYNC] Book settings.**
  - Files: `features/booksettings/BookSettingsPage.tsx` with groups: `BindingSidePicker.tsx`, `ThemePicker.tsx`, `BorderStylePicker.tsx`, `MarginControls.tsx` (live clamp to the floor with an inline explanation), `FontPicker.tsx`, `TextSizeStepsControl.tsx`, `AlignmentPicker.tsx`, `HebrewEnglishSpacingControl.tsx`, `PageNumbersToggle.tsx`, `ArtStyleTextField.tsx`, `BookTitleField.tsx` (O-10), `RecomputeShapeButton.tsx` (explicit, with a clear warning that existing illustrations will no longer fit exactly), and links to the colophon editor. Page format is shown read-only with the lock explanation.
  - Rules: autosave; a **live preview** pane uses `PagePreview`; changing binding side flips margins, spreads and cover front panel (P8 reads it) and **never** touches illustrations (test it).
- [x] **P6.5 [ASYNC] Pre-flight.**
  - Files: `layout/preflight.ts`, `print/PreflightDialog.tsx`.
  - Names: `runPreflight(book, edition, resolvedImages)` → `PreflightReport`; `PreflightIssue` has `code` (`ITEM_OUTSIDE_SAFE_AREA`, `MISSING_ILLUSTRATION`, `MISSING_COLOURING`, `OUTDATED_COLOURING`, `TEXT_OVERFLOW`, `LOW_RESOLUTION`, `PAGE_COUNT`, `MISSING_QR`), `severity` (`warning` or `info`), `pageRef`, `message`, `nextStep`; `computeEffectiveDpi(imageWidthPx, pictureWidthMm)`; threshold per O-12.
  - Rules: export is **allowed with warnings**; the dialog groups by page and lets the user jump to the page. Missing illustrations print as blank picture areas. Low resolution is a gentle notice only.
- [x] **P6.6 [ASYNC] Odd page-count fallback.** `appendBlankFallbackPage(model)` used only by the export model if an odd count somehow occurs; pre-flight flags `PAGE_COUNT`.
- [x] **P6.7 [ASYNC] Tests.** Hebrew date fixtures; pre-flight unit tests per code; end-to-end: change binding side and verify spread mirroring and that illustration ids are unchanged; margin below floor is clamped.
- [ ] **P6.8 [SYNC] Human verification.** Confirm colophon wording (O-05), supply the QR image (O-02), check the Hebrew date against a real calendar, read pre-flight messages for tone, review Book settings ergonomics.

### Phase 6 Definition of Done
Generic DoD plus: previews and the future print path both go through `PageSheet`; no setting can go below the safe-margin floor.
### Phase 6 log
- Implemented PageSheet-backed previews with bleed, trim, safe-area, and spine guides plus colour/colouring toggles.
- Added Hebrew date conversion with 15 fixtures, a generated colophon with QR upload, and autosaved Book settings with safe-margin clamping and explicit shape recomputation.
- Added non-blocking pre-flight reports and an odd-page fallback export model. Full suite: 168 tests passed; production build, type checks, lint, and source-header check passed.
- P6.8 remains for owner verification: approve the colophon wording, supply the real QR image, verify dates against a trusted calendar, and review pre-flight wording/settings ergonomics.

---


## PHASE 7: Print export (page, book, colouring book)

**Goal:** produce print-shop-ready PDFs of the interior from the print page, with bleed and crop marks, through the same layout engine.
**Needs:** P5, P6; P0-B findings; shop answers or owner-authorized fallback assumptions for S1, S3, S4, S5, S7. **Produces:** `src/print/*`.
**Touches earlier files:** `features/bookview/BookToolbar.tsx` (enable Print book, Print colouring book); `features/pageview/PageActionsBar.tsx` (enable Print page).

- [x] **P7.1 [SYNC] Apply shop answers or owner-authorized fallbacks.** The owner does not expect shop answers. Keep the current provisional S1/S4 values (3 mm bleed; 5 mm crop marks, 3 mm offset, 0.25 mm stroke), keep one interior page per PDF page in reading order for S7, and use the bleed-safe A4 minimum/expand behavior for S3. Do not remove `PLACEHOLDER_KEYS` while those values remain unverified. S5 remains unknown: exports stay RGB and show a prominent compatibility warning; do not claim shop approval or silently convert.
- [x] **P7.2 [ASYNC] Print job model.**
  - Files: `print/printJob.ts`.
  - Names: `PrintJobSpec` (`bookId`, `output` of `'book'`, `'colouring'`, `'cover'`, `'page'`, `pageId?`, `sheetMode`, `coverEdition?`); `createPrintJob(spec)` (saves via `MetaRepository` key `printJob:<id>`); `openPrintTab(jobId)`; `buildPrintDocument(book, spec)` → `PrintDocumentModel { sheets: SheetModel[] }` where `SheetModel` has `pageRef`, `side`, `edition`, `sheetSizeMm`, `placementMm`; `computeSheetLayout(printSpec, sheetMode)` (sheet = trim + 2 × bleed + mark zone; `centredA4` is an A4 minimum and expands symmetrically if required to avoid clipping bleed or marks); use the single reading-order export model (intro, story pages in order, colophon; one per PDF page; honours S7 by isolating ordering so a spread-order variant can be added).
- [x] **P7.3 [ASYNC] Crop marks and sheet rendering.**
  - Files: `print/CropMarks.tsx`, `print/SheetView.tsx`.
  - Names: `computeCropMarkSegments(trimRect, bleedMm, offsetMm, lengthMm)` returns 8 segments (pure, unit-tested); `CropMarks` draws them **outside the bleed band only**; no marks or colour bars inside the bleed.
  - Rules: each `SheetView` renders one `PageSheet` (showBleed on) centred in its sheet.
- [x] **P7.4 [ASYNC] Print page app.**
  - Files: `print/PrintApp.tsx`, `print/print.css`, `print/PrintToolbar.tsx`, `print/PrintHelpDialog.tsx`, `print/usePrintAssets.ts`.
  - Names: `injectPageStyle(sheetSizeMm)` (exact `@page` size, zero margin); `waitForPrintAssets(model)` (all images decoded, fonts loaded; failures raise `PRINT_ASSET_FAILED`); `buildPrintFileName(book, output)` (set as the document title so Chrome suggests it as the PDF name).
  - Rules: print CSS forces exact colours and backgrounds; one sheet per PDF page with page breaks; toolbar and help are hidden when printing; screen view shows sheets stacked and scaled with a trim/bleed/safe guide toggle (screen only). The **Print** button calls the browser print dialog; `PrintHelpDialog` explains "Choose Save as PDF, Margins: None, Background graphics: on".
  - Print page reads its job from storage; it never receives data in the URL beyond the job id.
- [x] **P7.5 [ASYNC] Entry points and pre-flight gate.**
  -  Files: `print/printJob.ts` with `startPrint(bookId, output, pageId?)`; it creates the print job and opens the print page after the `PreflightDialog` confirmation.
  - Wire: Book view toolbar "Print book" and "Print colouring book"; Page view "Print page" (page printed per book settings; colophon and intro included).
  - Colouring edition: colouring images in place of illustrations, white themed pages with outline border, intro photos as-is, colophon included. Pages lacking an image print a blank picture area.
- [x] **P7.6 [ASYNC] Automated PDF checks.** Playwright spec `tests/e2e/print-pdf.spec.ts` renders the print page using the same CSS (`preferCSSPageSize`, backgrounds on) and checks with `scripts/pdf-inspect.mjs`: page count equals interior pages; every page size equals the sheet size within 0.1 mm; fonts embedded; crop boxes remain inside the expected sheet. Unit tests cover `computeSheetLayout` and `computeCropMarkSegments`.
- [ ] **P7.7 [SYNC] Human verification.** Export a real book PDF through Chrome and run `docs/pdf-inspection-checklist.md`. Record that no shop approval is available and that RGB compatibility remains unverified. If print-shop feedback ever becomes available, record it, update confirmed constants, and re-run the automated PDF checks.

### Phase 7 Definition of Done
Generic DoD plus: preview and print show identical layout; no crop marks inside bleed; export works with warnings.
### Phase 7 log
- Implemented saved print jobs, single-page and whole-book document models, crop-mark sheet sizing, a shared `PageSheet`-based print view, pre-flight confirmation, and print entry points for book, colouring book, and individual pages. Missing images/fonts fail visibly; missing illustrations remain blank as specified.
- Added `scripts/pdf-inspect.mjs` with test-only `pdf-lib`, plus a Chrome/Playwright export test. The test verifies a four-page interior, exact 228 × 313 mm sheets within 0.1 mm, embedded fonts, and successful book, colouring-book, and single-page output routes. `computeSheetLayout`/crop-mark unit tests cover bleed-safe placement and eight marks outside bleed.
- Resolved the user's A4 clarification conservatively: A4 is a minimum sheet size, and the canvas expands symmetrically when required to preserve all bleed and crop marks. Recorded in the mission brief.
- The owner confirms shop answers will not be available. P7.1 is resolved with documented provisional defaults; placeholder markers remain, and RGB compatibility is explicitly warned as unknown. P7.7 remains for the owner to inspect a real Chrome export; no shop approval is claimed.
- Validation: typecheck, lint, header check, full unit suite (174 tests), production build, and `npm run e2e:print` passed.

---

## PHASE 8: Cover editor and cover PDF

**Goal:** edit and print the flat hard-cover sticker with bleed, hinges, spine and crop marks.
**Needs:** P5, P7; shop answers S6, S8; cover wording O-04. **Produces:** `layout/coverGeometry.ts`, `features/cover/*`.
**Touches earlier files:** `features/bookview/BookToolbar.tsx` (enable Print cover); `layout/shape.ts` (`getCoverPictureZoneSpec` real implementation).

- [x] **P8.1 [SYNC] Confirm cover content (owner-authorized defaults applied).** Title "משפחת ברגר, גבעת מרדכי, 5787" and subtitle "צילום מצב מהחיים שלנו" (split to confirm), spine text (O-04), colouring marker wording (O-06), back cover decision (v1 default: themed background and border only), and shop answers S6 and S8. *Default:* as written in the brief; front is the **left** panel for right binding.
- [x] **P8.2 [ASYNC] Cover geometry.**
  - Files: `layout/coverGeometry.ts`.
  - Names: `getSpineWidthMm(pageCount)` (from `SPINE_WIDTH_TABLE`); `computeCoverGeometry(book, pageCount)` → `CoverGeometry` with `cutRect`, `bleedRect`, `frontPanelRect`, `backPanelRect`, `spineRect`, `hingeRects` (two), `safeRects` (inset by `COVER_SAFE_INSET_MM` from edges and hinges), `frontPictureRect`, `titleRect`, `subtitleRect`, `spineTextRect`, `colouringMarkerRect`.
  - Rules: across: panel 206, hinge 8, spine (8 for 40 pages), hinge 8, panel 206; cut size 436 by 297 mm; bleed 15 mm on every side (total 466 by 327 mm for 40 pages); right binding puts the **front on the left**, left binding flips it. Unit tests assert these exact numbers.
  - `getCoverPictureZoneSpec(book)` becomes real here (aspect of `frontPictureRect`) for P9.
- [x] **P8.3 [ASYNC] Cover renderer.**
  - Files: `layout/render/CoverSheet.tsx`, `CoverFront.tsx`, `CoverSpine.tsx`, `CoverBack.tsx` (themed background and border; a visible TODO note only in the editor, never in print), `ColouringMarker.tsx`, `CoverGuides.tsx` (editor only: trim, hinge, safe, crop marks).
  - Rules: Hebrew only on the front; text is typeset by the app, never drawn by the AI; cover illustration framed in the theme, not running to the edge; background floods into bleed; nothing important within the safe inset or across hinges; `fitSpineText(text, spineWidthMm, fontId)` shrinks then warns if it cannot fit; spine text orientation decided by a mock-up (placeholder: rotated reading top to bottom).
- [x] **P8.4 [ASYNC] Cover editor.**
  - Files: `features/cover/CoverEditorPage.tsx`, `CoverFlatPreview.tsx`, `TitleField.tsx`, `SubtitleField.tsx`, `SpineTextField.tsx`, `CoverIllustrationControl.tsx` (Generate/Retry disabled until P9 with tooltip; "Use own image" works now through `CoverImageUpload.tsx`, stored as `coverUserImage`), `BackCoverNote.tsx` (placeholder, "coming later").
  - Rules: autosave; guides toggle; cover row in Book view shows illustration status.
- [x] **P8.5 [ASYNC] Cover export.**
  - Extend `PrintJobSpec` use: `output: 'cover'`, `coverEdition` (`'colour'` or `'colouring'`; the colouring edition adds the small Hebrew marker). `buildPrintDocument` returns a single sheet: bleed rectangle plus crop-mark zone (larger than 466 by 327 mm), marks outside the bleed band only. Entry: Book view "Print cover" with a small `CoverEditionSwitch` in the pre-flight dialog.
  - Pre-flight additions in `runPreflight`: `COVER_TEXT_IN_UNSAFE_AREA`, `COVER_SPINE_TEXT_TOO_WIDE`, `MISSING_COVER_ILLUSTRATION`.
- [x] **P8.6 [ASYNC] Tests.** Geometry numbers; mirror for left binding; automated cover PDF size check; visual baseline of the flat cover.
- [ ] **P8.7 [SYNC] Human verification.** Print a cover test PDF, check hinges and spine against the shop's template, send to shop, confirm front/back orientation (S8) and spine width (S6); decide spine text orientation.

### Phase 8 Definition of Done
Generic DoD plus: cover numbers match the brief; text never inside bleed band or across hinges.
### Phase 8 log
- **Files:** `layout/coverGeometry.ts` (+ test), `layout/render/{CoverSheet,CoverFront,CoverSpine,CoverBack,ColouringMarker}.tsx` (+ `CoverSheet.test.tsx`), `features/cover/{CoverEditorPage,CoverFlatPreview,CoverGuides,TitleField,SubtitleField,SpineTextField,CoverIllustrationControl,CoverImageUpload,BackCoverNote}.tsx` (+ page test), `print/CoverEditionSwitch.tsx`. Changed: `print/{printJob,PrintApp,SheetView,usePrintAssets,PreflightDialog}`, `layout/{preflight,shape,index}.ts`, `layout/render/pageImages.ts`, `features/bookview/{BookToolbar,BookViewPage}.tsx`, `app/routes.tsx` (`#/book/<id>/cover` route), `ui/tokens.css`, `tests/e2e/print-pdf.spec.ts`.
- **Geometry (cut-local mm, origin at the cut corner, bleed at -15):** across 206 | hinge 8 | spine | hinge 8 | 206; cut 436 x 297; with bleed 466 x 327 (asserted in tests). Front panel is the **left** one for right binding and the right one for left binding. Safe rects are the panels inset 10 mm on all sides (so also from the hinges); the spine safe rect is inset 10 mm top and bottom only. Front stack (inside safe inset + 9 mm border/content inset, 168 x 259 mm): title 38 mm, 4 gap, subtitle 16, 6 gap, picture (168 x 181 mm), 4 gap, 10 mm band for the colouring marker (always reserved, so the marker never moves the picture). `getCoverPictureZoneSpec` is now the real front picture zone (aspect about 0.928).
- **Spine width:** `getSpineWidthMm(pageCount)` returns the first `SPINE_WIDTH_TABLE` row that holds the page count, and the last row's width beyond it. The table still has one row (40 pages = 8 mm) and stays a placeholder (S6), so a book of a different page count still gets an 8 mm spine until the shop's rule is known.
- **Renderer:** one `CoverSheet` (bleed canvas) is used by the editor preview and by print. Background floods the bleed; each panel has the themed border on its safe rect (back and front), nothing is drawn on the hinges; title, subtitle and spine text are typeset by the app in the book's Hebrew font (title/subtitle/marker fitted with `fitTextInZone`, never cut; overflow is flagged by pre-flight). `fitSpineText(text, spineWidthMm, fontId, options?)` shrinks from 14 pt to 6 pt (line must fit the spine width minus 1 mm each side and stay on one line along the 277 mm length) and returns `fits: false` otherwise. **Spine rotation placeholder:** `SPINE_TEXT_ROTATION_DEG = -90` (counter-clockwise, so the Hebrew starts at the top and reads downwards); to be confirmed with the printed mock-up in P8.7. The back panel shows a "TODO: back cover design" reminder only when `showTodoNote` is set (editor preview); it never appears in print (tested, and the e2e checks that no editor-only node is in the print page).
- **Cover image:** the user's own image (`cover.ownImageId`, kind `coverUserImage`) wins over a generated illustration (`getCoverImageIds`); "Remove own image" lets a generated one show again. Pictures are shown whole (`contain`), never cropped. Replaced images are removed with `purgeOrphanImages` once the book has been saved.
- **Cover editions:** the colouring edition uses the **same colour cover** plus the small Hebrew marker (`cover.colouringMarkerText`, placeholder wording "ספר צביעה", O-06); it is not an outline page.
- **Export:** `buildPrintDocument` returns one sheet for `output: 'cover'` with `isCover: true`, `bleedMm: 15` and `edition` = `coverEdition` (default colour). `SheetModel` gained a required `bleedMm` (interior sheets 3 mm). Sheet = cut 436 x 297 + 2 x (15 bleed + 3 offset + 5 mark length) = **482 x 343 mm** with the existing placeholder crop-mark values; marks are outside the bleed. `startPrint(bookId, output, pageId?, coverEdition?)`; the pre-flight dialog shows `CoverEditionSwitch` for the cover and passes the choice on. The print file is named "<title> - cover" or "<title> - colouring book cover".
- **Pre-flight:** `runPreflight(book, edition, images, scope = 'interior' | 'cover')`; the `cover` scope adds `COVER_TEXT_IN_UNSAFE_AREA` (title/subtitle outside the front safe rect or overflowing), `COVER_SPINE_TEXT_TOO_WIDE`, `MISSING_COVER_ILLUSTRATION` plus the gentle `LOW_RESOLUTION` notice. Issues carry `pageRef: PageRef | CoverRef` (`COVER_REF`, kind `cover`); the dialog titles them "Cover" and its jump button opens the cover editor. Interior reports are unchanged.
- **Cover editor / Book view:** `#/book/<id>/cover` autosaves title, subtitle, spine text and the own image; the flat preview (scale 0.4, on the full crop-mark sheet) has a colour/colouring toggle and a guides toggle (cut, bleed, hinges, safe areas, crop marks). Generate and Retry are disabled with an "Available in Phase 9" tooltip. The back cover shows a "coming later" note. Book view "Print cover" is enabled; the cover row already shows illustration status.
- **Deviations:** `CoverGuides` lives in `features/cover/` (editor only; it reuses the print crop-mark function) instead of `layout/render/`. Cover pre-flight is a scope of `runPreflight` rather than extra checks mixed into the interior report. The PDF size check uses a 0.2 mm tolerance for the cover: Chrome rounds PDF page sizes to whole points (up to about 0.18 mm), which the 0.1 mm interior check happened to stay within.
- **Not done:** the P8.6 "visual baseline of the flat cover" is not committed (Playwright screenshot baselines are still not set up, same as P5.7); instead the cover print page was inspected as a full-size screenshot (front on the left, spine text centred, hinges clear, crop marks outside the bleed). S6/S8 shop answers are still unavailable, so spine width, front/back orientation, hinge numbers and the spine-text direction remain provisional; `COVER_SAFE_INSET_MM` and `SPINE_WIDTH_TABLE` stay in `PLACEHOLDER_KEYS`.
- **Validation:** typecheck, lint, header check, full unit suite (198 tests) and `npm run e2e:print` (now also exports the cover: 1 page of 482 x 343 mm, fonts embedded) pass.
- **For the human (P8.7):** print `cover` to PDF from Book view > Print cover (try both editions), compare hinges/spine against the shop's template, check the front/back orientation (S8) and spine width (S6), decide the spine text direction, and confirm the cover wording (title, subtitle, spine text, colouring marker).

---

## PHASE 9: AI generation: provider, prompts, retry, history

**Goal:** generate and retry illustrations, cover illustration and colouring pages for a single target at a time, store results with history, with clear explained failures. Runs in the tab for now; the code is written so P10 can move it into the service worker unchanged.
**Needs:** P4, P5, P8; **D-AI (P0-A)**. **Produces:** `src/ai/*`, AI UI parts.
**Touches earlier files:** `public/manifest.json` (optional Gemini host permission); `scripts/check-manifest-permissions.mjs` (allowed list); `ai/modelCatalog.ts` (real list); `features/pageview/IllustrationSection.tsx`, `ColouringSection.tsx`, `PageActionsBar.tsx`; `features/cover/CoverIllustrationControl.tsx`; `features/settings/*` and settings migrations (separate model selectors and Gemini key label).

- [x] **P9.1 [SYNC] Gate and permissions.** Owner selected Gemini and approved its API host. Request the optional host permission only when the user starts generation (to keep install warnings smaller). Cost guardrail: each image call is user-triggered; no automatic retries or batches in P9; the UI identifies each action as a provider call. No dollar estimate is promised; the user checks Google AI account usage.
- [x] **P9.2 [ASYNC] Provider interface.**
  - Files: `ai/ImageProvider.ts`, `ai/providers/GeminiImageProvider.ts`, `ai/providers/MockImageProvider.ts`, `ai/errors.ts`, `ai/modelCatalog.ts`.
  - Names: `ImageProvider` with `generateImage(request)` and `editImage(request)`; `ImageGenRequest` (`instructions`, `referenceImages: Blob[]`, `targetAspect`, `sizeHint`, `qualityTier`); `ImageGenResult` (`image`, `widthPx`, `heightPx`, `modelId`, `usage?`); `createProvider(modelId, apiKey)`; `mapProviderError(response)` → `AppError` (`AI_NO_KEY`, `AI_AUTH`, `AI_QUOTA`, `AI_REFUSED`, `AI_TEMPORARY`, `AI_BAD_RESPONSE`); `MODEL_CATALOG` with real image-capable models only.
  - `MockImageProvider`: deterministic generated placeholder images with correct aspect; fault injection (`refuse`, `rateLimit`, `timeout`, `badResponse`) for tests; selected with the build flag `SAPRILI_PROVIDER=mock`.
  - Rules: the provider is the **only** module that knows vendor request formats; key passed in, never logged; medium image-quality tier if available; honour prompt caching for the repeated intro if the vendor offers it.
- [x] **P9.3 [ASYNC] Prompts.**
  - Files: `ai/promptTemplates.ts` (named constants `ILLUSTRATION_INSTRUCTIONS`, `COLOURING_INSTRUCTIONS`, `COVER_INSTRUCTIONS`, `EDIT_INSTRUCTIONS` written from brief section 7, easy for the owner to tune), `ai/prompts.ts`.
  - Names: `buildIllustrationRequest(book, pageId, options)` (intro English text + intro AI-copy photos + page English text + page AI-copy photos; caps via `getAiPhotoSelection`; art-style text; custom prompt **appended to instructions, never to page text**; target aspect from `getPictureZoneSpec`); `buildColouringRequest(book, pageId)` (only that page's illustration); `buildCoverIllustrationRequest(book)` (intro English text + intro photos + art-style text; aspect from `getCoverPictureZoneSpec`); `buildEditRequest(book, pageId, customPrompt)`; `describeRequestForDebug(request)` (no keys, no image bytes).
  - Rules: instructions include: learn characters from the intro; use page text and photos to decide who appears and what happens; match people in photos to text; cute simple cartoon in the art style; reuse real objects and places from photos; **no written text in the picture**; calm space at the edges; colouring: pure black-and-white line art for a 4-year-old, thick clean outlines, big shapes, no shading or grey, no text, same shape.
  - **Payload tests (mandatory):** assert no Hebrew characters in any request, no other pages' text or photos, no illustration in an illustration request, only that page's illustration in a colouring request.
- [x] **P9.4 [ASYNC] Post-processing** (`ai/postprocess.ts`, worker-safe).
  - Names: `measureImage(blob)`, `fitToShape(blob, aspect)` (resolve any aspect mismatch with the smallest edge crop or calm-colour padding; **ask the human first** if the provider cannot produce the needed aspect: see P9.9), `detectGreyLevels(blob)`, `forceBlackWhite(blob, threshold)` (applied only when grey is detected).
- [x] **P9.5 [ASYNC] Generation service** (`ai/generationService.ts`; takes a `deps` object `{ providerFactory, imageRepository, bookRepository, settingsRepository, clock }`, no DOM, no React).
  - Names: `generateIllustrationForPage(bookId, pageId, options)`; `generateColouringForPage(bookId, pageId)`; `generateCoverIllustration(bookId, options)`; `restoreIllustrationVersion(bookId, pageId, imageId)`; `uploadOwnIllustration(bookId, pageId, file)`; `pushIllustrationVersion(state, newImageId, nowIso)` (keeps at most 3 older versions, deletes older images after expiry); `markColouringOutdated(page)`.
  - Rules: stores generated images as returned (`meta.source = 'generated'`, model, date); replacing an illustration moves the previous one into history and marks that page's colouring `outdated`; colouring generation requires a current illustration (no AI call is made otherwise); saves with reason `'generation'` only after success; refusals and quota problems return explained `AppError`s.
- [x] **P9.6 [ASYNC] UI wiring.**
  - Files: `features/pageview/RetryPanel.tsx` (custom prompt remembered per page in `illustration.customPrompt`; checkbox "edit current illustration", disabled with reason when the model lacks edit support), `VersionHistoryStrip.tsx` (up to 3 older versions with restore), `GenerateButton.tsx`, `MakeColouringButton.tsx` (disabled without an illustration, with reason), `OutdatedBadge.tsx`, `ProviderResultNotice.tsx` (refusals explained as a normal result with a retry suggestion; missing key links to My settings; quota stops clearly), `useGenerationRun.ts` (single-target run state in the tab).
  - Cover editor: enable Generate/Retry in `CoverIllustrationControl`.
- [x] **P9.7 [ASYNC] Tests.** Payload-composition tests (above); version-history cap; outdated flag; colouring gating; post-processing tests on synthetic pixel data; generation-service tests with `MockImageProvider`: generate, retry with a custom prompt, restore version, make colouring page, refusal path, no-key path. Full UI and build checks are covered by the phase validation run.
- [ ] **P9.8 [SYNC] Live test with a real key.** Owner to run the real provider on selected pages (one user-triggered request at a time): check likeness, drift, edges, picture shape, colouring quality. Tune `promptTemplates.ts` wording and the default art-style text. No live call was made during this implementation.
- [x] **P9.9 [SYNC] Aspect-ratio decision.** Owner approved centre-cropping the smallest excess edge, with a pre-flight warning when more than 3 percent of an edge is removed.

### Phase 9 Definition of Done
Generic DoD plus: payload tests green; key never appears in logs or stored images; `generationService.ts` imports nothing from React or the DOM. Human live-provider verification is still pending.
### Phase 9 log
Implementation: Gemini provider, isolated image prompts, post-processing, single-target generation and retry/history, per-task model settings and UI. Settings schema migrated to separate illustration and colouring model IDs. The owner confirmed per-call cost guardrails and the crop/warning policy.

Owner verification still pending: P9.8 (real-key live quality/cost test). P9.9's crop-and-warning policy was confirmed by the owner and implemented; actual output behavior should still be observed during P9.8. No live API request was made during implementation.

---

## PHASE 10: Background job queue and Generate dialog

**Goal:** batch generation that continues with the tab closed, resumes after interruptions, and a Generate dialog matching the brief.
**Needs:** P9; **D-BG (P0-C)**. **Produces:** `src/background/jobs/*`, `features/generate/*`, `shared/messaging.ts`.
**Touches earlier files:** `background/service-worker.ts` (host the runner); `features/bookview/BookToolbar.tsx` (enable Generate).

- [x] **P10.1 [ASYNC] Messaging contract.** `shared/messaging.ts` with the `JobsMessage` union (5.5) and helpers `sendJobsCommand`, `subscribeJobsEvents`.
- [x] **P10.2 [ASYNC] Queue, runner, resilience** (`src/background/jobs/`).
  - Files and names: `JobQueue.ts` (`enqueueBatch(plan)`, `cancelBatch`, `retryFailed`, `getSnapshot`, state persisted through `JobRepository` **after every step**); `JobRunner.ts` (`runNext()`, concurrency `JOB_CONCURRENCY`, executes jobs by calling P9 `generationService` with a service-worker `deps`); `RetryPolicy.ts` (`shouldRetry(error, attempts)`, backoff for `AI_TEMPORARY`, max 3 attempts); `KeepAlive.ts` (the recipe recorded by P0-C; active only while work is queued); `resume.ts` (`resumeOnStartup()`, called on service worker start and `onStartup`/`onInstalled`; marks interrupted running jobs and continues from the saved `step`); `hostMode.ts` (`JOB_HOST_MODE`: `'background'` or `'tab'`); `InTabJobHost.ts` (same queue and runner running in the tab for the fallback).
  - Rules: results saved one by one; **fatal stop** (`AI_AUTH`, `AI_QUOTA`, `AI_NO_KEY`) pauses the whole batch with `pauseReason` and a clear next step; `AI_REFUSED` marks only that job failed; when Chrome closes, jobs are `paused` and the next app open shows a `ResumePrompt`; dependent colouring jobs wait for their illustration job; image work uses only worker-safe code.
- [x] **P10.3 [ASYNC] Job plan builder** (`features/generate/jobPlan.ts`, pure).
  - Names: `parsePageRange(text, maxIndex)` (e.g. "3-6, 9"); `selectAll`, `selectMissingIllustration(book)`; `getColouringBlockReason(page, willGenerateIllustrationNow)`; `buildJobPlan(book, selection, switches)` → `JobPlan { jobs, summary { illustrations, colourings, totalCalls }, skipped }`.
  - Rules: Cover row first, illustration job only; two switches (illustrations, colouring pages) each with its own "overwrite existing" (default off; pages with existing output are skipped and not counted); colouring needs an illustration, rows lacking one are greyed with a reason; if both switches are on, each page runs illustration then colouring.
- [x] **P10.4 [ASYNC] Generate dialog UI.**
  - Files: `features/generate/GenerateDialog.tsx`, `GeneratePageList.tsx`, `StatusPill.tsx`, `SelectionShortcuts.tsx` (select all, select pages missing an illustration, page-range field), `JobSwitches.tsx`, `PlanSummary.tsx` (text such as "12 illustrations, 12 colouring pages, 24 AI calls"), `BatchProgress.tsx` (per-row status, cancel, retry failed), `GenerateStatusChip.tsx` (toolbar chip, dialog can be closed while jobs continue), `ResumePrompt.tsx`, `JobsClient.ts` (wraps messaging; `enqueueBatch`, `cancelBatch`, `retryFailed`, `subscribe`).
  - Rules: summary shown before start; reopening shows live state; the tab only displays progress.
- [x] **P10.5 [ASYNC] Tests.** Queue unit tests with a fake clock and `MockImageProvider`: concurrency never exceeds 2, resume after a simulated worker restart continues from the saved step, fatal stop pauses the batch, cancel, retry failed, dependency order; plan builder tests (range parsing, skip rules, summary counts); end-to-end: start a batch, close the tab, reopen, verify completion.
- [ ] **P10.6 [SYNC] Long real-world run.** 20-page book with a real key: close the tab mid-run, quit Chrome, reopen, resume; check cost against the P0-A estimate. Decide whether to ship `'background'` or `'tab'` host mode. *Default:* background with in-tab fallback switchable in My settings advanced section.

### Phase 10 Definition of Done
Generic DoD plus: no job is lost or run twice after an interruption; queue state is in storage after every step.
### Phase 10 log
- **Files:** `shared/messaging.ts` (`JobsCommand`/`JobsEvent`/`JobsMessage`, `sendJobsCommand`, `subscribeJobsEvents`, plus the local bus used by the in-tab host); `background/jobs/{JobQueue,JobRunner,RetryPolicy,KeepAlive,resume,hostMode,JobHost,InTabJobHost,workerHost,realDeps}.ts`; `background/service-worker.ts` (registers the host); `storage/sessionFlag.ts`; `features/generate/{jobPlan,JobsClient,useBookJobs,useGeneratedResultSync,GenerateDialog,GeneratePageList,StatusPill,SelectionShortcuts,JobSwitches,PlanSummary,BatchProgress,GenerateStatusChip,ResumePrompt}`; `features/settings/JobHostModeField.tsx`. Changed: `domain/job.ts` (`PlannedJob`, `SkippedJob`, `JobPlan`, `Job.retryAfter`), `storage/jobRepository.ts` (`listBatchesForBook`), `ai/generationService.ts`, `features/pageview/useBookStore.ts` (`mergeGenerated`), `features/bookview/{BookToolbar,BookViewPage}.tsx`, `app/AppRoot.tsx`, `features/settings/MySettingsPage.tsx`, `ai/providers/{MockImageProvider,index}.ts`, `ui/tokens.css`, `vite.config.ts`, `eslint.config.mjs`, `package.json` (`e2e:jobs`).
- **Queue model:** every change goes through `JobQueue`, which serialises changes and writes them to storage before announcing them (`jobs/progress`, `jobs/batchStateChanged`, `jobs/fatalStop`). `JobRunner` claims jobs (status `running`, step `generating`, `attempts + 1`) up to `JOB_CONCURRENCY` (2) and calls P9 `generationService` through `JobHost` (worker-safe deps). Dependent colouring jobs wait for their illustration job; if it failed or was cancelled they fail with `DEPENDENCY_FAILED` (then come back with "retry failed"). `AI_AUTH`/`AI_QUOTA`/`AI_NO_KEY` hand the job back unspent and pause the batch with a `pauseReason` plus a `ResumePrompt`; `AI_REFUSED`/other errors fail only that job; `AI_TEMPORARY` is retried with a 2 s then 8 s backoff (`Job.retryAfter`, max 3 attempts). The batch becomes `completed` when nothing is queued or running (even with failed jobs; "retry failed" reopens it).
- **Interruptions:** `resumeOnStartup` runs once per host start. A `running` job is put back in the queue, unless its picture was already saved after the job started (`hasOutputSince`), in which case it is marked done and not run again. The worker tells an idle-restart from a browser/extension restart with a `chrome.storage.session` flag: idle restart continues automatically; a browser restart pauses open batches (`JOB_INTERRUPTED` text) and the app shows `ResumePrompt` on next open. The generation service has no cancellable steps, so an interrupted call restarts at `pending` (the "saved step" is therefore `pending`/`generating`/`done`; `postprocessing`/`saving` are not separately resumable).
- **Cancel:** stops everything not yet sent; calls already sent finish and keep their result.
- **Concurrency fix in P9 code:** concurrent jobs on one book used to read the book at the start and save the whole book at the end, which could lose results. `generationService` now applies each result to the freshly re-read book under a per-book lock (`applyToLatestBook`). The open page editor re-reads generated pictures when a job succeeds (`useBookStore.mergeGenerated`, `BookViewPage` refresh) so its own autosave does not overwrite them.
- **KeepAlive recipe (UNVERIFIED, P0-C was never run):** while a job runs or a retry is waiting, the worker calls `chrome.runtime.getPlatformInfo()` every 20 s (any extension API call resets Chrome's 30 s idle timer; a provider request in flight also keeps it alive). No `alarms` permission was added, so nothing wakes a worker that Chrome killed while the browser stays open with the tab closed; that case is recovered the next time the app opens or a message arrives. P10.6 must test this with a real run.
- **Host mode:** `JOB_HOST_MODE` is stored as the meta key `jobHostMode` (default `'background'`), switched in My settings > Advanced ("Run generation inside this tab"); takes effect on the next app open. The in-tab host (`InTabJobHost`) is the same `JobHost` with a local message bus; it pauses open batches on start because a closed tab stopped the old runner.
- **Deviations:** (1) the batch plan carries `key`/`dependsOnKey` and `JobQueue` assigns ids; (2) `shared/messaging.ts` is exempted from the "shared must not import domain" lint rule (types only) because the contract is typed with domain job records; (3) the e2e needs a mock-provider build, so `SAPRILI_MOCK_DELAY_MS` was added next to `SAPRILI_PROVIDER=mock`, and the mock provider now draws a PNG (not SVG) when `OffscreenCanvas` exists because worker contexts cannot decode SVG; (4) the host-mode switch lives in the meta store, not `UserSettings`, to avoid a settings migration; (5) page-range numbers are 1-based story page numbers in reading order.
- **Tests:** `JobHost.test.ts` (concurrency never above 2, dependency order, state written before a job finishes, fatal stop and resume, refusal then retry failed, backoff and the 3-attempt limit, cancel, restart continue / pause / already-saved), `jobPlan.test.ts` (range parsing, skip rules, summary counts, greyed colouring), `policy.test.ts`; `npm run e2e:jobs` builds a mock-provider extension (outside `dist/`), starts a 5-job batch, closes the tab, reopens and checks the batch completes with no duplicate pictures.
- **Validation:** typecheck, lint, header check, full unit suite (241 tests), production build with permission check, and `npm run e2e:jobs` pass.
- **For the human (P10.6):** with a real key, run a ~20-page book (illustrations plus colouring), close the tab mid-run, then quit Chrome and reopen to use the resume prompt; confirm the keep-alive recipe holds for long real calls and compare the cost with the P0-A estimate; decide the shipped host mode (default `'background'` with the in-tab switch).

---

## PHASE 11: Backup, restore, per-page download

**Goal:** one zip with everything that also restores the book; one-page downloads.
**Needs:** P1, P4 (best placed after P10 per the brief, but independent of AI; **may be pulled earlier**). **Produces:** `features/backup/*`.
**Touches earlier files:** `features/bookview/BookToolbar.tsx` (enable Download all/backup); `features/pageview/PageActionsBar.tsx` (Download page files); `features/library/LibraryPage.tsx` (Restore button per O-14).

- [ ] **P11.1 [ASYNC] Backup format** (`features/backup/backupFormat.ts`).
  - Zip layout: `manifest.json` (`formatVersion`, `appVersion`, `schemaVersion`, `createdAt`, `bookId`, file list with sizes); `book.json` (the full `Book` record, source of truth); human-readable files: `pages/00-intro/photo-1.jpg`, `pages/03/photo-1.jpg`, `pages/03/illustration.png`, `pages/03/colouring.png`, `pages/03/text-en.txt`, `pages/03/text-he.txt`, `cover/…`, `colophon/qr.png`; `images.json` maps every `ImageRecord` id to its zip path and `kind`/`meta`. Names: `BACKUP_FORMAT_VERSION`, `buildBackupFilePlan(book, imageRecords)`, `zipPathForImage(record, book)`.
  - Rules: JSON files in the zip carry no header comment (exports).
- [ ] **P11.2 [ASYNC] Export and restore.**
  - Files: `backupExport.ts`, `backupRestore.ts`.
  - Names: `exportBookBackup(bookId, onProgress)` → Blob (streamed zip with `fflate`, images added one at a time to limit memory); `downloadBlob(blob, fileName)`; `restoreBookBackup(file, onProgress)` → `RestoreResult`; `validateBackup(manifest, book)`; `RestoreConflictDialog.tsx` (same book id already exists: restore as a new copy or replace).
  - Rules: restore is **atomic** (stage under a temporary id, validate, then commit; on any failure remove staged images and leave existing data untouched); newer `schemaVersion` than supported raises `BACKUP_TOO_NEW`; older versions are migrated through the migration registry; invalid file raises `BACKUP_INVALID`; export sets `lastBackupAt` through `save(book, 'system')` (does not change the modified date).
- [ ] **P11.3 [ASYNC] Per-page download.** `downloadPageFiles(bookId, pageId)`: same folder structure for one page (photos, illustration, colouring, both texts).
- [ ] **P11.4 [ASYNC] UI.** `BackupButton.tsx` (progress, cancel), `LastBackupBadge.tsx` ("Last backed up N days ago", via `formatDaysAgo(iso, now)`; gentle nudge colour after 14 days), `RestoreBackupButton.tsx` in the Library header, `RestoreProgressDialog.tsx`.
- [ ] **P11.5 [ASYNC] Tests.** Round trip: build a fixture book with images, export, wipe storage, restore, deep-compare the book and per-image hashes; corrupted zip; future schema version; conflict paths; memory sanity on a book with 40 pages of images.
- [ ] **P11.6 [SYNC] Real round trip.** Back up a real book, clear the extension's data (or reinstall), restore, compare visually. Confirm the Restore button placement (O-14).

### Phase 11 Definition of Done
Generic DoD plus: round-trip test green; a failed restore leaves existing data unchanged.
### Phase 11 log
_(agent fills)_

---

## PHASE 12: Hardening, user test, Web Store

**Goal:** a non-technical relative can finish a book unaided; the extension is ready for the Chrome Web Store.
**Needs:** all phases. **Produces:** fixes, `docs/privacy-policy.md`, store assets, release package.

- [ ] **P12.1 [ASYNC] Usability script.** `docs/usability-test-script.md`: tasks for a non-technical relative (open app, set up key, import, add photos, generate, fix a page, print preview, back up) with observation sheet and success criteria.
- [ ] **P12.2 [SYNC] Run the usability test** with a relative; collect issues in `docs/usability-findings.md`. Triage into must-fix and later.
- [ ] **P12.3 [ASYNC] Fix pass** for must-fix items plus audits:
  - Plain-language errors: `docs/error-messages.md` generated from `en.ts` for review; every error has a next step.
  - Accessibility: axe run in Playwright over every route; every icon has an accessible name; full keyboard path through Book view and Page view.
  - Performance: large book (40 pages, 3 photos each): list scrolling, thumbnails only, lazy full images, storage size display.
  - Data safety review: autosave failure paths, quota exceeded, undo windows, backup nudges.
  - Security: key never logged, no remote code, extension CSP intact, no analytics; `check-manifest-permissions` passes.
  - Hebrew RTL correctness spot-check in every screen.
- [ ] **P12.4 [ASYNC] Store assets and documents.**
  - `docs/privacy-policy.md` (photos and API keys handled; photos and English text sent only to the user's chosen provider; stored locally only; no accounts, no analytics), `docs/store-listing.md` (name, short and long description, single purpose statement, justification for each permission), screenshots generated from the end-to-end fixture book (no real family photos), icons 16/32/48/128, promo tile; `scripts/package.mjs` → `saprili-<version>.zip`.
- [ ] **P12.5 [SYNC] Publish.** Host the privacy policy at a public URL; submit in the developer account; choose visibility (O-13, default unlisted); answer review questions.
- [ ] **P12.6 [SYNC] Final acceptance.** Produce and print one real book end to end (interior, colouring book, cover); confirm with the shop proof.

### Phase 12 Definition of Done
Generic DoD plus: usability must-fixes closed; store listing submitted; package built from a clean checkout.
### Phase 12 log
_(agent fills)_

---

## Backlog (not in v1; do not build)

Cast-list paragraph on the intro to reduce character drift; back-cover design; Hebrew interface; duplicate a book into a new page format (`duplicateBookWithNewFormat`); other languages, landscape, other print shops; in-app image editing; accounts and sync; mobile.

---

## Appendix: quick reference for the human

**Where your time is needed, in order:**
1. Now: confirm D-01 to D-06 (P1.1); send shop questions (P0-B.1); supply AI inputs (P0-A.1).
2. During P0: judge AI output, print a PDF, run the background test, check dates, pick fonts.
3. P3: supply the real CSV. P6: supply the QR image and confirm colophon wording.
4. P7 and P8: shop answers and PDF reviews.
5. P9 and P10: live runs with a real key.
6. P12: relative test, privacy policy hosting, store submission.
