<!-- bisiyata dishmaya, leharbot ahava biyisral -->

# Saprili: Mission Brief
*Your storybook scribe*

Product/spec-level brief. Decisions are stated as settled unless listed under **Open items** (Section 11).

---

## 1. Summary

Saprili is a Chrome extension that turns family photos plus short bilingual (Hebrew/English) text into a print-shop-ready, hard-cover illustrated children's book, and a matching colouring book.

**Pipeline:** CSV text in → add photos per page → AI illustration per page → AI colouring page per illustration → themed layout → PDFs for the print shop (interior, colouring-book interior, cover).

**Users:** the owner plus friends and family on desktop Chromium. Each user brings their own paid-tier AI key.

**Non-goals (v1):** accounts, cloud sync, collaboration, mobile, in-app image editing, other languages, landscape books, other print shops' formats.

**Vocabulary:** *Cover* (flat printed cover: front, spine, back) · *Intro page* (first interior page, alone; introduces characters) · *Story page* · *Pair/spread* (two facing pages) · *Colophon page* (last interior page, alone) · *Original photos* (user-added) · *Illustration* (AI cartoon of a page) · *Colouring page* (black-and-white line art of an illustration) · *Trim* (final cut size) · *Bleed* (artwork past trim) · *Safe margin* (nothing important closer to the trim).

---

## 2. Platform and storage

- **Chrome extension; no Python or other stack.** The app is a single full browser tab. The toolbar icon opens it, or focuses it if already open. No side panel. Desktop Chromium only.
- **Distribution:** Chrome Web Store (owner has a developer account). Needs a privacy policy (photos and API keys are handled).
- **Permissions (minimal):** storage, unlimited storage, network access to the chosen AI provider, background script.
- **Storage:** extension local storage with the unlimited-storage permission. One record per book (text, order, settings), one record per image, small thumbnails stored separately, full images loaded only on demand. All storage sits behind one layer so it can be swapped. Records carry a data version so old data can be upgraded.
- **Backup/restore:** mandatory (uninstalling or clearing data erases everything). See Section 8.
- **Fonts:** font files packaged inside the extension; openly licensed, child-friendly, **Hebrew with nikud** support.
- **Image handling (reduce hard to save AI cost):** originals stored at about 2000 px long edge (never printed). At import, a second **AI copy** (about 768-1024 px long edge, moderate compression) is created and stored; AI calls never use full-size photos; intro photos use the smaller size because they are re-sent every call. Cap photos per call (about 3 from the intro, 3 from the page) and flag, not silently drop, any extras. Use a medium image-quality tier if the provider offers one; reuse prompt caching for the repeated intro if available. Generated images are stored as returned.

---

## 3. Book structure and content model

**Interior order is fixed:** Cover (outside the page sequence) → Intro page (alone) → story pairs → Colophon page (alone). Intro + an even number of story pages + colophon is always **even**; a blank white last page is a fallback only.

- **Book:** title; cover; intro page; ordered story pages; colophon; page format; theme; print settings; art-style text; created/modified dates; data version. Data supports many books from day one ("book1" is the first).
- **Intro page:** private title, English text, Hebrew text, original photos. No illustration or colouring page of its own. **Prints the original photos** (layout: first photo large, or a collage of up to 4). Its English text and photos are also the AI's character reference.
- **Story page:** private title (never printed); one English text and one Hebrew text (paragraphs allowed, no rich formatting); original photos; illustration; colouring page; remembered custom prompt; up to 3 older illustration versions; image metadata (uploaded vs generated, model, date).
- **Colophon page (generated, not typed):** Hebrew date from the browser's Hebrew calendar (month spelled like מרחשוון, day in Hebrew letters, year as numerals), place (default Jerusalem), "created by Saprili" (Hebrew wording), and a QR image (supplied by the owner, shown on a white square with clear space). Date defaults to book creation date and is editable. Also appears in the colouring book.
- **Cover:** see Section 5.6.

**Binding and direction:** book1 **opens to the right** (spine on the right, Hebrew style). The intro sits alone on the left of the first spread; story pairs read right-to-left; the colophon sits alone on the right of the last spread; the wider inner margin is on the spine side. The app's spread views mirror accordingly. Binding side stays editable; changing it flips margins, spreads, and which half of the flat cover is the front. It never invalidates illustrations.

**Page operations:** add/delete story pages only in pairs. Reorder one page at a time with live pair regrouping, plus move up/down buttons. Intro pinned first, colophon pinned last; neither deletable.

---

## 4. Book setup and settings

**First-open setup (required before any edit; locks the page format):** trim size (preset: shop's 20.6 × 29.1 cm), orientation (**portrait only in v1**, matching the shop template), text position (below the picture). Message: "This can't be changed later, because your illustrations are drawn to fit this exact shape." Trying another format later = duplicate book into a new format.

**Editable settings:** binding side; theme palette and border style; margins and gutter (never below the floor in 5.2); fonts; text size steps; alignment; Hebrew/English spacing; page numbers; art-style text; colophon date and place.

---

## 5. Print production

**One layout engine** drives previews, single-page print, book print, colouring-book print, colophon, and cover, so preview equals output.

### 5.1 Print job (from the shop quote and guide)
Hard cover. Interior 20.6 × 29.1 cm, double-sided, 4-colour CMYK, 170 g matte chromo paper, page count flexible (even). Cover printed as a matte-laminated sticker. Unprinted endpapers. Opens to the right. Printed at a print shop, so margins are strict. The trim is A4-proportioned (about 0.707) but not exactly A4 (about 4 mm narrower, 6 mm shorter).

### 5.2 Interior page geometry
- **Safe margin:** at least **1 cm from trim on every edge** (shop advice); extra spine-side margin is a placeholder of 15 mm until confirmed. Settings cannot go below this floor.
- **Bleed:** shop recommends bleed and crop marks for the whole book. Interior bleed amount is unconfirmed (placeholder 3 mm); the page background must flood into it.
- **Zones:** background (to bleed) → decorative border (inside the safe margin) → fixed-size picture zone → text zone.
- **Fixed picture:** same size and shape on every page, so illustrations are generated at exactly that shape (no crop, no stretch). Pictures sit framed inside the safe margins with rounded corners and a thin frame. Margin changes scale the zone evenly.
- **Text adapts:** the text zone is sized once from real CSV text lengths so the longest page fits at a comfortable minimum size for a small child. Font size uses 3 fixed steps chosen by text length. Hebrew above English, each in its own font, Hebrew right-to-left. Overflow: shrink to minimum, then warn; never cut text.

### 5.3 Theme
- **Not a white page.** Light sky-blue base with sunny yellow, coral, mint, lilac accents; alternative presets (mint, peach, lavender) per book. Soft colours so CMYK conversion stays safe.
- **Border:** bundled vector styles (scalloped, dotted, clouds, stars) in palette colours; sharp at any size, no AI cost.
- **Text:** dark text on the background, optional soft white rounded panel.
- **Colouring edition:** white background with a black-outline border the child can colour. Intro photos print as-is.

### 5.4 Outputs
| Output | Contents |
|---|---|
| Print book | Interior pages in reading order, one per PDF page: intro, story pages with illustrations, colophon |
| Print colouring book | Same, with colouring pages instead of illustrations, white themed pages, intro and colophon included |
| Print cover | One flat cover page |
| Print page | One page, per book settings |

Every export page = trim + bleed + space for **crop marks** (drawn by the layout engine outside the bleed; no marks or colour bars inside the bleed band). Sheet size is a setting: exact size, or centred on A4. The shop's "can send it as A4" remark is ambiguous (see Section 11).

**PDF method:** browser print-to-PDF from a print-styled page, because Hebrew right-to-left, mixed Hebrew/English, and nikud render correctly. Verify in testing: custom page size, bleed, crop marks, forced background colours/graphics (browsers may drop them), embedded fonts, no added margins. **Colour risk:** browser output is RGB while the shop may require CMYK/PDF/X. The owner does not expect shop specifications to become available; keep the export in RGB, warn on every export that compatibility is unverified, and do not describe the file as shop-approved. If CMYK/PDF/X is required, use a trusted prepress conversion workflow; do not silently convert without an agreed profile.

For the interior's **centred A4** sheet mode, A4 is a minimum canvas size, not a clipping boundary. If the trim, bleed, and crop-mark zone need more room, the output sheet expands symmetrically rather than clipping any bleed or marks. This is a safety behavior; the resulting sheet size is not shop-approved.

**Pre-flight check before export:** items outside the safe area, missing illustrations (print blank picture area), overflowing text, low-resolution images, page-count issues. Export is allowed with warnings. A preview toggle shows trim, bleed, and safe lines.

**Resolution:** sharp print at this size needs roughly 2400 × 3400 px; AI output is usually smaller. Softer pictures are accepted; pre-flight shows a gentle notice.

### 5.5 Colophon
See Section 3. Same theme and margins as every other page.

### 5.6 Cover (flat, outside view, cm)
- **Total with wrap-around bleed:** 46.6 × 32.7. **Cut size:** 43.6 × 29.7. Bleed band 1.5 on every side: artwork runs to the edge, no text or marks inside it.
- **Across:** panel 20.6 | hinge 0.8 | spine 0.8 | hinge 0.8 | panel 20.6; height 29.7. Spine width depends on page count (0.8 for 40 pages; shop's rule needed).
- **Opens to the right:** front cover is the **left** panel, back the right (to confirm).
- Keep text and key art away from hinges and edges (placeholder 1 cm inset). Spine text must fit in 0.8 cm.
- **Front:** Hebrew only. Title "משפחת ברגר, גבעת מרדכי, 5787", subtitle "צילום מצב מהחיים שלנו" (proposed split and wording, to confirm). Cover illustration generated from the **intro page's original photos**, framed in the theme, not running to the edge. Text is typeset by the app, never drawn by the AI.
- **Back: TODO.** Themed background and border until designed.
- **Spine:** short title (for example "משפחת ברגר 5787"), decided with a mock-up.
- Colouring book uses the same cover plus a small Hebrew "colouring" marker (wording TBD).
- Cover export has crop marks outside the bleed band, so the page is a bit larger than 46.6 × 32.7.

---

## 6. Screens

Icons first with tooltips; text labels on primary actions. **My settings = person icon; Book settings = sliders icon; no gear.**

- **Library:** books by last modified (title, page count, date, thumbnail); person icon opens My settings; one-time "Import book1 from CSV" button, shown only while no book exists; friendly empty state.
- **My settings:** model dropdown (image-capable models only; placeholder for now), masked API key with show toggle, autosave with "Saved" indicator, notice of what is sent to the AI provider.
- **Setup:** Section 4.
- **Book view:** fixed top-to-bottom: Cover row (shows whether a cover illustration exists), Intro page (separated), story pages in visible pairs, Colophon row (separated). Row indicators (not checkboxes): English text, Hebrew text, original-photo count, illustration, colouring page (with "outdated" mark). Click a row to open; drag handle plus move up/down (story pages only). Toolbar: Print book, Print colouring book, Print cover, Download all/backup, Generate, Add pages, Delete pages, Book settings.
- **Page view:** full-screen spread editor, mirrored for a right-opening book; intro and colophon shown alone. Per page: private title, Hebrew and English text, original photos, illustration, colouring page, and a print-accurate preview with margin guides. Click any picture for a full-size overlay (Escape closes). Add pictures by drag-and-drop, file picker, or paste. Actions: Generate/Retry (custom prompt), Make colouring page, Download page files, Print page.
- **Generate dialog:** page list (Cover first, illustration job only) with status and checkboxes; "select all", "select pages missing an illustration", page-range field; two job switches (illustrations, colouring pages), each with its own "overwrite existing" checkbox (default off). Colouring needs an illustration: rows lacking one are greyed with a reason; if both jobs are chosen, each page runs illustration then colouring. Shows a summary before starting ("12 illustrations, 12 colouring pages, 24 AI calls"), progress, cancel, "retry failed". Can be closed while jobs continue.
- **Cover editor:** front/spine/back preview over the flat layout with trim, hinge, safe, and crop-mark guides; fields for title, subtitle, cover illustration (generate / retry / use own image), later back cover.
- **Colophon editor:** date (Hebrew-calendar form), place, "created by" line, QR preview.

---

## 7. AI generation

- **Provider/model:** not chosen. Both AI steps output images, and many popular language models can only read images, so the dropdown lists image-capable models only. Provider isolated behind one interface; choice made in the first test phase.
- **Keys and privacy:** each user supplies a paid-tier key. My settings states what leaves the computer (photos and English text go to the provider). Provider refusals (real people, children) are shown as a normal, explained result with a retry suggestion.
- **Every call stands alone.** Image reduction per Section 2.
- **Illustration call:** sends intro English text + intro original photos + current page English text + current page original photos. Not sent: Hebrew, other pages, any illustration. Instructions: learn characters from the intro; use page text and photos to decide who appears and what happens; include intro characters mentioned on the page plus others present; match people in photos to the text; cute simple cartoon style (book art-style text); reuse real objects and places from the photos; **no written text in the picture**; generate at the fixed picture shape; leave calm space at the edges for the frame. Known risk: characters may drift between pages (a labelled "cast list" on the intro is the later fix).
- **Colouring call:** sends only that page's illustration. Asks for pure black-and-white line art for a 4-year-old: thick clean outlines, big shapes, no shading or grey, no text, same shape. Disabled without an illustration. Add a clean-up step forcing true black and white if models return grey.
- **Cover illustration call:** sends intro English text + intro original photos + art-style text. Asks for one cute cartoon family portrait at the cover picture's shape, no text, calm space around subjects. Hardest picture (many people in one photo).
- **Retry:** optional custom prompt appended to the instructions (never to page text), remembered per page; optional "edit current illustration" mode; last 3 versions kept. Replacing an illustration marks its colouring page "outdated".
- **Job queue lives in the background script**, the tab only displays progress. Because Chrome stops idle background scripts, the job keeps itself alive while work is queued and saves state after every step (page, job, status), resuming from saved state if stopped. If Chrome closes, jobs pause and offer to resume next open. Image reduction happens earlier, in the tab, at import. 2 calls at a time; retries for temporary errors; clear stop on key or quota problems; results saved one by one. **Fallback:** if background running proves unreliable, run jobs in the open tab with the same saved state.

---

## 8. Import and export

- **CSV (one-time, get-started):** columns title, English text, Hebrew text; headers are optional and case-insensitive (including `Title`, `eng_descrip`, and `heb_descr`); chosen via file picker. First data row = intro page; the colophon is not in the CSV. Entirely blank records are ignored. A row with only hyphens in the title cell and no English or Hebrew text is an ignored pair separator (not page content); separators may follow the intro or a complete story pair. Remaining story rows stay in source order and pair consecutively; the data rows must be one intro plus an even number of story pages. Clear errors for wrong columns, odd counts or separators that split a pair, an empty file, and bad Hebrew encoding; on error nothing is created.
- **Backup / "Download all files":** one zip with everything: original photos, illustrations, colouring pages, all text, page order, book settings, cover and colophon data. The same file restores the book. Show "last backed up N days ago".
- **Per-page download:** same structure for one page.

---

## 9. Cross-cutting rules

1. Autosave: subtle "Saved" indicator; loud banner on failure.
2. Modification date changes only on real changes and on successful generation.
3. Destructive actions get a short undo window.
4. **Header comment** "bisiyata dishmaya, leharbot ahava biyisral" at the top of source code files only (not CSV, JSON, exports), kept exactly as written.
5. Hebrew is right-to-left everywhere it appears; Hebrew above English in print.
6. Interface in English, built so a Hebrew right-to-left interface can be added.
7. Plain-language errors with a next step; every icon has an accessible name.
8. Thumbnails in lists; full images only on demand.
9. Branding: "Saprili" / "Your storybook scribe", playful palette from 5.3.

---

## 10. Build order

**Phase 0: de-risk**
1. AI test: 3-4 real pages plus the cover illustration from the intro group photo; judge quality, character drift, refusals, pixel size, cost per call.
2. Print test: one themed bilingual page and one cover at exact shop sizes with bleed and crop marks through print-to-PDF; ask the shop to check the PDF before ordering (a single test copy is also possible).
3. Background job test: long job, tab closed, completes.
4. Hebrew date test: correct calendar dates and month names.

**Phase 1:** scaffold, domain model, and storage layer.
**Phase 2:** UI kit, My settings, and Library.
**Phase 3:** CSV import, setup, and book view with pairs, reordering, and add/delete in pairs.
**Phase 4:** page view (spread), text, photos, overlay, and autosave.
**Phase 5:** layout engine core, theme, and borders.
**Phase 6:** previews with guides, book settings, pre-flight, and colophon.
**Phase 7:** print export (page, book, and colouring book).
**Phase 8:** cover editor and cover PDF.
**Phase 9:** AI generation, cover illustration, colouring, retry, and history.
**Phase 10:** background job queue and Generate dialog.
**Phase 11:** backup, restore, and per-page download.
**Phase 12:** hardening, user test, and Web Store release.

---

## 11. Open items

**Inputs still to supply:** the CSV; the QR image.

**Questions for the print shop (unanswered; owner does not expect answers):**
1. Interior bleed amount (assumed 3 mm).
2. Extra spine-side margin beyond 1 cm.
3. What "you can send it as A4" means: interior pages on A4 sheets, or something about the cover (the flat cover, 43.6 × 29.7 cm, can't be A4)?
4. Exact sheet size and crop-mark offset for interior and for cover.
5. RGB PDF acceptable, or CMYK / PDF/X required?
6. Spine width per page count.
7. Interior as single pages in reading order?
8. Confirm: opens to the right means the front cover is the left half of the flat cover file.

**Decisions to confirm:**
- Portrait only in v1 (recommended).
- Cover wording and title/subtitle split (Hebrew text in 5.6); short spine text.
- AI provider and model (decided by the Phase 0 test unless the owner has a preference).

**Defaults assumed unless changed:** intro photo layout (first photo large or collage of up to 4); colophon wording "created by Saprili" in Hebrew; colouring-book look and cover marker as in 5.3 and 5.6; interior pictures framed, not full-bleed; font shortlist chosen by owner; simple playful logo proposed.
