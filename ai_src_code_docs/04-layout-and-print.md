<!-- bisiyata dishmaya, leharbot ahava biyisral -->

# 04. Layout engine, print and cover

**One layout engine** (`src/layout`) drives previews, single-page print, book print, colouring-book print, colophon and cover, so preview equals output. Geometry is in **millimetres** (pixels only at render time). Main API: `getPrintSpec`, `computePageGeometry(book, pageRef, side)`, `ensureBookShape` / `recomputeBookShape`, `getPictureZoneSpec`, `getCoverPictureZoneSpec`, `computeCoverGeometry`, `PageSheet` (edition `colour` | `colouring`), `runPreflight`.

## Interior page geometry
- Trim 206 × 291 mm. **Safe margin ≥ 10 mm** from trim on every edge (`clampLayoutSettings` enforces the floor); gutter margin (default 15 mm total) on the **inner** edge: right edge of a left page, left edge of a right page. Binding side only changes which pages are left/right.
- Bleed 3 mm (placeholder): background floods into it.
- Zones inside the safe rect: decorative border band (7 mm) → content (inset 9 mm) → picture zone → text zone → reserved 6 mm page-number band (always reserved, so toggling numbers moves nothing).
- **Fixed picture:** same size/shape on every page. Shape is computed once per book at Setup (`BookShape`) and never recomputed silently. Margin changes scale the picture zone uniformly (aspect never changes). Pictures are framed with rounded corners and shown `object-fit: contain` (never cropped/stretched).
- **Text zone** is sized once from the real text of **every** page measured at the minimum size (Hebrew above English, with spacing), taking the maximum plus padding, capped at 40% of the page (warns if capped). Before a shape exists, a provisional 60 mm text zone is used.
- **Text fit:** 3 fixed size steps (default 22 / 18 / 14 pt) chosen by text length distribution; shrink to `minFontSizePt` (14 pt), then flag overflow. Text is **never cut**. Hebrew RTL in its own font above English; optional soft white rounded text panel (off by default).
- Page numbers: only story pages show one (position in the printed interior, intro = 1).
- Intro photos: `computeIntroPhotoLayout(count, mode, pictureRect)`.

## Theme and fonts
- Presets (`THEME_PRESETS`): sky `#DCEFFB` (default), mint `#DDF6EA`, peach `#FFE8D9`, lavender `#ECE4FA`, each with sunny/coral/mint/lilac/sky accents. Soft colours keep a later CMYK conversion safe.
- Border styles are bundled vector shapes (`buildBorderShapes`): scalloped, dotted, clouds, stars. No raster, no AI.
- **Colouring edition:** white background, black-outline border; intro photos print as-is; colophon included; cover is the colour cover plus a small marker.
- Fonts (packaged woff2, licences in `docs/font-licenses.md`): **Noto Sans Hebrew** 400/700 (nikud) and **Nunito** 400/700. Font ids `hebrew-default` / `english-default`. `ensureFontsLoaded` waits before measuring or printing.

## Pre-flight (`runPreflight(book, edition, images, scope)`)
Run before every export; export is **allowed with warnings**; the dialog groups by page and can jump to the page.
Issue codes: `ITEM_OUTSIDE_SAFE_AREA`, `MISSING_ILLUSTRATION`, `MISSING_COLOURING`, `OUTDATED_COLOURING`, `TEXT_OVERFLOW`, `LOW_RESOLUTION` (gentle notice, <150 effective dpi), `AI_ASPECT_CROP` (>3% of an edge cropped), `PAGE_COUNT`, `MISSING_QR`; cover scope adds `COVER_TEXT_IN_UNSAFE_AREA`, `COVER_SPINE_TEXT_TOO_WIDE`, `MISSING_COVER_ILLUSTRATION`. Missing illustrations print as blank picture areas. `appendBlankFallbackPage` is used only if an odd page count somehow occurs.

## Colophon
Generated: Hebrew date (browser Hebrew calendar via `shared/hebrewDate.ts`: month spelled like מרחשוון through `HEBREW_MONTH_NAMES`, day in Hebrew letters, year as numerals; sunset boundary ignored), place (default Jerusalem), "created by Saprili" in Hebrew (placeholder wording), QR image on a white square with clear space (owner supplies the image; `MISSING_QR` pre-flight otherwise). Date defaults to book creation date and is editable (`ColophonDateField` shows the live Hebrew form). Same theme/margins as other pages; also in the colouring book.

## Cover (flat, cut-local mm)
- Across: panel 206 | hinge 8 | spine | hinge 8 | panel 206; height 297 → **cut 436 × 297**; bleed 15 on every side → **466 × 327**. Spine = 8 mm for every page count until the shop's rule is known (`getSpineWidthMm`, single-row table).
- Right binding: front is the **left** panel, back the right; left binding flips (to confirm with shop, S8).
- Safe rects: panels inset 10 mm (so also from hinges); spine inset 10 mm top/bottom. Nothing drawn on hinges.
- Front stack (168 × 259 mm inside safe+border inset): title 38, gap 4, subtitle 16, gap 6, picture 168 × 181 (aspect ≈0.928), gap 4, 10 mm band reserved for the colouring marker. Title/subtitle/marker use `fitTextInZone` (never cut). Hebrew only on the front; text is typeset by the app, never drawn by AI.
- Spine text: `fitSpineText` shrinks 14 → 6 pt, one rotated line (`SPINE_TEXT_ROTATION_DEG = -90`, counter-clockwise, Hebrew reads top to bottom; placeholder direction); warns if it cannot fit.
- Cover picture: the user's own image (`ownImageId`) wins over a generated one; shown whole (`contain`) in the theme frame, not running to the edge.
- Back cover: themed background and border only. A "TODO: back cover design" note appears in the editor preview only, never in print.

## PDF export (`src/print`, `print.html`)
- Method: the app saves a `PrintJobSpec` (`bookId`, `output` book|colouring|cover|page, `pageId?`, `sheetMode`, `coverEdition?`) through `MetaRepository` (`printJob:<id>`), opens `print.html?job=<id>`, which renders one `PageSheet` per sheet with exact `@page` size, zero margin and forced backgrounds. The user clicks Print and chooses **Save as PDF, Margins: None, Background graphics: on** (`PrintHelpDialog` explains this). Browser print is used so Hebrew RTL, mixed text and nikud render correctly and no `debugger` permission is needed.
- One interior page per PDF page in reading order (intro, story pages, colophon), no spreads (provisional, S7). Sheet = trim + 2×bleed + crop-mark zone: interior **228 × 313 mm**, cover **482 × 343 mm** (cover cut + 2 × (15 bleed + 3 offset + 5 mark)). Crop marks (8 segments) are drawn outside the bleed band only; no marks inside bleed.
- `sheetMode`: `exact`, or `centredA4`, where A4 is a **minimum** canvas that expands symmetrically rather than clip bleed or marks (not shop-approved).
- Files are RGB. Every export warns that shop compatibility is unverified; the app never claims shop approval and never silently converts to CMYK. If CMYK/PDF/X is ever required, use an external prepress workflow with an agreed profile.
- Output names: `<title>`, `<title> - colouring book`, `<title> - cover`, `<title> - colouring book cover` (document title = suggested PDF name).
- Print asset failures raise `PRINT_ASSET_FAILED`; the print page reads its job from storage and never takes data from the URL beyond the job id.
- Automated check: `tests/e2e/print-pdf.spec.ts` + `scripts/pdf-inspect.mjs` (page count, sheet size within 0.1 mm interior / 0.2 mm cover, fonts embedded). Manual checklist: `docs/pdf-inspection-checklist.md`.
- Resolution: sharp print needs ≈2400 × 3400 px; AI output is usually smaller. Softer pictures are accepted with a gentle notice.
