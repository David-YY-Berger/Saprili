<!-- bisiyata dishmaya, leharbot ahava biyisral -->

# 09. Decisions, placeholders and open questions

Status: **settled**, **assumed** (default in use, owner may change), **open**.

## Technical decisions
| ID | Decision | Status |
|---|---|---|
| D-01 | TypeScript strict, Vite multi-page build, Manifest V3 | assumed (never formally confirmed) |
| D-02 | React 18, CSS Modules + variables, HashRouter, zustand, dnd-kit, lucide-react | assumed |
| D-03 | IndexedDB (`idb`) for books/images/thumbs/jobs; `chrome.storage.local` for user settings only | assumed |
| D-04 | PDF via print-styled `print.html` + `window.print()` ("Save as PDF"); no `debugger` permission | assumed |
| D-05 | Own tiny i18n module, English catalogue, direction from locale | assumed |
| D-06 | Vitest + Testing Library + fake-indexeddb; Playwright; papaparse; fflate; pdf-lib (tests) | assumed |
| D-AI | Gemini; `gemini-3-pro-image` illustrations, `gemini-3.1-flash-lite-image` colouring, `gemini-3.1-flash-image` selectable | settled (not yet validated on real output) |
| D-AI-SHAPE | Centre-crop smallest excess edge; pre-flight warns above 3% | settled |
| D-FONT | Noto Sans Hebrew + Nunito | assumed (owner to confirm) |
| D-RGB | RGB PDF with a warning on every export; no CMYK conversion | open (shop answer S5 unavailable) |
| D-BG | Background service worker default, in-tab fallback switch | open (needs real long run) |

## Owner decisions and inputs
| ID | Item | Status |
|---|---|---|
| O-01 | The CSV | supplied (`data.csv`), verified |
| O-02 | QR image | **not supplied** (placeholder square) |
| O-03 | Portrait only in v1 | settled |
| O-04 | Cover wording (title, subtitle, spine text) | assumed, split to confirm |
| O-05 | Colophon "created by Saprili" Hebrew wording ("נוצר בספרילי") | assumed |
| O-06 | Colouring cover marker ("ספר צביעה") | assumed |
| O-07 | Hebrew date: letters for the day, numerals for the year | assumed; check vs a real calendar |
| O-08 | Library Duplicate/Delete with undo | assumed yes |
| O-09 | Minimum story pages = 2 (one pair) | settled |
| O-10 | Default title "book1", editable in Book settings | settled |
| O-11 | Minimum text size 14 pt | assumed |
| O-12 | Low-resolution notice below 150 effective dpi | assumed |
| O-13 | Web Store visibility | default unlisted |
| O-14 | Restore button in the Library header | assumed |
| — | Logo (placeholder SVG), palette values, text panel off by default | assumed |

## Print-shop questions (owner does not expect answers)
Provisional values are used meanwhile, are marked in `PLACEHOLDER_KEYS`, and exports never claim shop approval.

| ID | Question | Value used meanwhile |
|---|---|---|
| S1 | Interior bleed amount | 3 mm |
| S2 | Is 15 mm the total spine-side margin or 1 cm plus 15 mm? | 15 mm total |
| S3 | What does "you can send it as A4" mean (interior only? the flat cover cannot be A4)? | exact sheet, or "centred on A4" as a minimum canvas |
| S4 | Exact sheet size and crop-mark offset (interior and cover) | trim + bleed + crop zone (5 mm marks, 3 mm offset) |
| S5 | RGB PDF acceptable, or CMYK / PDF/X required? | RGB + warning |
| S6 | Spine width per page count | 8 mm for every count |
| S7 | Interior as single pages in reading order? | yes |
| S8 | Opens to the right: is the front cover the left half of the flat cover file? | yes |
| S9 | Need PDF TrimBox/BleedBox, or are crop marks enough? | crop marks only |

If any answer ever arrives: update the constant, remove it from `PLACEHOLDER_KEYS`, re-run `npm run e2e:print`, and record it here.
