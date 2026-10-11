<!-- bisiyata dishmaya, leharbot ahava biyisral -->

# 03. Book content, setup and CSV import

## Structure
- **Interior order is fixed:** Cover (outside the page sequence) → Intro (alone) → story pairs → Colophon (alone). Intro + even story pages + colophon is always even (a blank last page is a fallback only; see [04](./04-layout-and-print.md)).
- Data supports many books from day one ("book1" is the first). Minimum one story pair.
- **Intro:** private title, English text, Hebrew text, original photos, **main characters** (name, profile picture, short description; added in the intro editor); no illustration/colouring page. Prints the original photos (first large, or collage ≤4, also in colouring edition) with the free text below; characters are not printed. Its main characters (else its English text + photos) are the AI's character reference.
- **Story page:** private title (never printed), one English and one Hebrew text (paragraphs allowed, no rich formatting), original photos, illustration, colouring page, remembered custom prompt, ≤3 older illustration versions, image metadata. The page editor can permanently delete an illustration and its version history; dropping files into the illustration area is disabled.
- **Colophon:** generated, not typed (see [04](./04-layout-and-print.md)). **Cover:** see [04](./04-layout-and-print.md).

## Binding and direction
Book1 **opens to the right** (spine on the right, Hebrew style): intro alone on the left of the first spread, story pairs read right-to-left (first page on the right), colophon alone on the right of the last spread. The wider (gutter) margin is always on the inner edge. Binding side is editable (Book settings); changing it flips margins, spreads and the cover's front panel, and **never** touches illustrations.

## Page operations
- Add/delete story pages only in pairs (`addStoryPagePairs`, `deleteStoryPagePair`); delete uses an undo window and purges orphan images only after it expires.
- Reorder one page at a time with live pair regrouping (drag via `@dnd-kit`, plus move up/down buttons; keyboard accessible). Intro pinned first, colophon pinned last; neither deletable. Reordering never changes page content.
- Pure functions in `domain/ordering.ts`: `moveStoryPage`, `moveStoryPageUp/Down`, `previewPairsAfterMove`.

## Setup (first open, required before any edit)
- Choose trim (one preset: 20.6 × 29.1 cm), orientation (**portrait only**; landscape shown disabled), text position (below the picture).
- Locks the page format with the exact message: "This can't be changed later, because your illustrations are drawn to fit this exact shape."
- `confirmSetup` saves format + `lockedAt`, then computes the book shape once (`ensureBookShape` via `formatLockHook`). Any edit route redirects to Setup while `format.lockedAt` is null.
- Another format later = duplicate into a new book (deferred; see TODO backlog).

## Editable settings (Book settings page)
Binding side, theme preset, border style, margins and gutter (clamped live to the 10 mm floor with an explanation), fonts, 3 text size steps, alignment, Hebrew/English spacing, page numbers, art-style text, book title, colophon link, and an explicit "recompute shape" action (warns that existing illustrations will no longer fit exactly). Page format is read-only. Autosaves; has a live `PagePreview`.

## CSV import (one-time, "Import book1 from CSV")
- Only offered while no book exists (the route redirects to the Library otherwise). Chosen via file picker.
- Columns: title, English text, Hebrew text. Headers optional and case-insensitive; aliases include `Title`, `eng_descrip`, `heb_descr`. UTF-8 with or without BOM; legacy Hebrew codepage (e.g. Windows-1255) is detected and rejected as `CSV_BAD_ENCODING`.
- First data row = intro. The colophon is not in the CSV. Paragraph line breaks are preserved.
- Entirely blank records are ignored. A row whose title is only hyphens with empty text cells is an ignored **pair separator** (allowed after the intro or after a complete story pair). Remaining rows pair in source order; they must be one intro + an even number of story rows.
- Errors with row numbers and a next step: wrong columns, odd count or a separator that splits a pair, empty file, bad encoding. **Atomic:** nothing is created on any error.
- `buildBookFromCsv` creates the book with title "book1", `format.lockedAt = null`, `shape = null`, default colophon and cover, then navigates to Setup.
- The real `data.csv` (1 intro + 46 story pages, 24 separators, 1 blank record) imports correctly (owner-verified).

## Library
Books sorted by last modified (title, page count, date, thumbnail: cover illustration, else first intro photo, else placeholder). Card menu: **Duplicate book**, **Delete book** (confirm, then undo window before physical delete). Header: person icon (My settings), Restore from backup button (always visible). Friendly empty state.
