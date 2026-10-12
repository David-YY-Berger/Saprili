<!-- bisiyata dishmaya, leharbot ahava biyisral -->

# 05. Screens and routes

Icons first with tooltips; text labels on primary actions. HashRouter (`src/app/routes.tsx`).

| Route | Screen |
|---|---|
| `#/` | Library |
| `#/settings` | My settings |
| `#/import` | CSV import |
| `#/book/:bookId/setup` | Setup |
| `#/book/:bookId` | Book view |
| `#/book/:bookId/settings` | Book settings |
| `#/book/:bookId/page/:pageId` | Page view |
| `#/book/:bookId/cover` | Cover editor |
| `#/book/:bookId/colophon` | Colophon editor |
| `#/dev/layout` | Layout dev page (non-production builds only) |

- **Library / Setup / Import:** see [03](./03-book-content-and-import.md).
- **My settings:** separate model dropdowns for illustrations and colouring pages (image-capable models only), masked Gemini API key with show toggle (autosave, "Saved" indicator; stored only via `SettingsRepository`, never logged or placed in URLs), notice of what is sent to Google (photos and English text), estimated local storage usage, Advanced: "Run generation inside this tab" (job host mode, applies next app open).
- **Book view:** fixed top-to-bottom: Cover row (shows whether cover artwork exists), Intro (separated), story pages in visible pairs, Colophon row (separated). Row indicators (not checkboxes): English text, Hebrew text, photo count, illustration, colouring page (with "outdated" mark). Click a row to open it; drag handle plus move up/down (story pages only). Toolbar: Print book, Print colouring book, Print cover, Download all/backup (with "last backed up N days ago", nudge colour after 14 days), Generate (plus status chip), Add pages, Delete pages, Book settings.
- **Page view:** full-screen spread editor, mirrored for a right-opening book (intro and colophon alone); spread navigator with mirrored arrow keys. Per page: private title, Hebrew (RTL) and English text, photos (drop zone, file picker, paste anywhere; remove with undo; drag reorder; "Not sent to AI (limit 3)" badge), intro photo layout picker, **main characters section (intro only: add/remove character, name, description, profile picture add/replace; removal undoable)**, illustration and colouring sections, print-accurate preview with guide toggles and a colour/colouring toggle. The open spread follows the selected page, not the route's page id, so reloading the book after a generation (the editor briefly remounts) keeps you on the current spread instead of jumping to the intro. Click any picture for a full-size overlay (Escape closes, focus returns). Actions: Generate/Retry (custom prompt, "edit current illustration", up to 3 restorable versions), Make colouring page, Download page files, Print page. The colophon page links to its editor.
- **Generate dialog:** page list (Cover first, illustration job only) with status pills and checkboxes; "select all", "select pages missing an illustration", page-range field (1-based story page numbers, e.g. "3-6, 9"); two job switches (illustrations, colouring) each with "overwrite existing" (default off; existing outputs skipped and not counted). Colouring needs an illustration: rows lacking one are greyed with a reason; with both switches on, each page runs illustration then colouring. Summary before starting ("12 illustrations, 12 colouring pages, 24 AI calls"), nothing starts without "Start generating". Progress, cancel, "retry failed"; can be closed while jobs continue; `ResumePrompt` on next open after an interruption.
- **Cover editor:** flat preview (scale 0.4, on the full crop-mark sheet) with colour/colouring toggle and guides toggle (cut, bleed, hinges, safe areas, crop marks); fields for title, multiline subtitle (Enter adds a line break), and spine text. Cover artwork can be one AI illustration, the same original photos in the intro page's exact collage/layout, or separate AI portraits for each main character in matching collage cells (up to 6); users can also upload their own image. Portrait mode makes one AI call per character. Back-cover artwork can be generated from an uploaded original reference photo (sent to AI but not printed) or set directly from an uploaded picture (not sent to AI).
- **Colophon editor:** date (Gregorian input, live Hebrew form), place, "created by" line, QR upload and preview.
- **Print pre-flight dialog:** issue list, cover edition switch for the cover, then opens the print tab.
