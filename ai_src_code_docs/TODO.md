<!-- bisiyata dishmaya, leharbot ahava biyisral -->

# TODO: everything not done

Source of truth for remaining work. Tick items here (not in other docs). Tags: **[YOU]** needs the owner (real keys, photos, printing, decisions); **[CODE]** an agent can do it.

## 1. Verify against the real world (highest risk first)

- [ ] **[YOU] Real Gemini run.** One user-triggered request at a time on 3-4 real pages plus the cover: judge likeness, character drift, no text in pictures, calm edges, delivered pixel size and aspect (how often the centre-crop triggers), refusals on photos of children, colouring quality for a 4-year-old. Record cost per call. Then tune `ai/promptTemplates.ts` and the default art-style text. *(No live API call has ever been made.)*
- [ ] **[YOU] Long background run.** 20-page book with a real key: close the tab mid-run, quit Chrome and reopen (resume prompt), let a long call run with the tab closed. Confirm the keep-alive (`getPlatformInfo` every 20 s) holds; compare cost with the first test. **Decide shipped host mode** (`background` default or `tab`). Sleep/wake of the laptop is untested.
- [ ] **[YOU] Real PDF inspection.** Print the interior, colouring book, a single page and the cover (both editions) via Chrome "Save as PDF"; run `docs/pdf-inspection-checklist.md` (sizes, backgrounds, embedded fonts, no added margins, marks outside bleed, Hebrew/nikud direction, two PDF viewers). Record that RGB compatibility is unverified.
- [ ] **[YOU] Cover check.** Compare hinges/spine against the shop's template; confirm front/back orientation (S8); decide the spine text direction; confirm cover wording (title/subtitle split, spine text, colouring marker); review the intro-photo collage, per-character AI portraits, and both back-cover artwork options with a real original photo.
- [ ] **[YOU] Real photos.** Very large, rotated, PNG and one HEIC: confirm import speed, stored sizes, HEIC error message; confirm the intro photo layout default and that the mirrored spread feels right for a right-opening book.
- [ ] **[YOU] Layout/colophon review.** Rendered sample pages (`npm run dev`, load `dist/`, open `app.html#/dev/layout`): colours, four border styles, text sizes for a small child, nikud, panel on/off, minimum font 14 pt. Confirm fonts, palette and panel default. Supply the **QR image**, confirm colophon wording, check Hebrew dates against a real calendar (`docs/hebrew-date-fixtures.json`, 15 dates), read pre-flight messages for tone, review Book settings ergonomics.
- [ ] **[YOU] Real backup round trip.** Back up a real book, clear extension data (or reinstall), restore, compare visually; confirm the Restore button placement (O-14).
- [ ] **[YOU] Extension smoke check.** Load unpacked `dist/`, click the icon twice (one tab only), confirm permissions (storage, unlimitedStorage, optional Gemini host only), confirm the `saprili` database exists. Click through Library and My settings (palette/header look, key masked and persisted); answer O-08. Confirm D-01 to D-06 and the logo.

## 2. Release

- [ ] **[YOU] Usability test** with a non-technical relative using `docs/usability-test-script.md`; write `docs/usability-findings.md`; triage must-fix vs later. *(No test has been run.)*
- [ ] **[CODE] Fix pass** for must-fix findings plus the remaining audits:
  - [ ] Performance: 40-page book with 3 photos per page (list scrolling, thumbnails only, lazy full images).
  - [ ] Data safety: autosave failure paths, quota exceeded, undo windows, backup nudges.
  - [ ] Security: key never logged, no remote code, CSP intact, no analytics; `check-manifest-permissions` passes.
  - [ ] Hebrew RTL spot-check on every screen.
  - [ ] Review `docs/error-messages.md` (every error has a plain-language next step).
  - [ ] Full keyboard path through Book view and Page view (axe route check exists; end-to-end keyboard path is only partly covered).
- [ ] **[YOU] Publish:** host the privacy policy at a public URL, submit the Web Store listing (`docs/store-listing.md`, `npm run package`), choose visibility (default unlisted), answer review questions.
- [ ] **[YOU] Final acceptance:** produce and print one real book end to end (interior, colouring book, cover); compare with the printed result or a shop proof if one is ever available.

## 3. Known code gaps and cleanups

- [ ] **[CODE] Visual baselines.** Playwright screenshot baselines for `PageSheet` (intro, story, long-text story, colouring edition) and the flat cover are not committed. Playwright is now installed, so these can be added.
- [ ] **[CODE] Worker wake-up.** Nothing wakes a service worker that Chrome kills while the browser stays open with the tab closed (no `alarms` permission); recovery happens on next app open. Decide after the long real run whether to add `alarms` (requires owner approval for the permission) or ship tab mode.
- [ ] **[CODE] Finer resume.** `postprocessing` and `saving` job steps are not separately resumable (an interrupted call restarts at `pending`). Acceptable unless the real run shows wasted calls.
- [ ] **[CODE] Prompt caching** of the repeated intro photos is not implemented (optional cost saver; add only if Gemini offers it for these models and the real-run cost warrants it).
- [ ] **[CODE] Spine width rule.** `SPINE_WIDTH_TABLE` has one row; every page count gets 8 mm. Add rows when the shop's rule is known.
- [ ] **[CODE] Shop-side confirmations** (when/if answers arrive): update placeholder constants for S1-S9 (see [09](./09-decisions-and-open-questions.md)) and re-run `npm run e2e:print`.
- [ ] **[CODE] Optional:** write `docs/shop-questions.md` (S1-S9 in plain English plus Hebrew, with the assumed fallback for each) in case the owner decides to ask the shop after all.
- [ ] **[CODE] Optional:** cover/colophon PDF sheet sizes and `centredA4` mode have only been validated by automated checks, not by a printer.

## 4. Backlog (not in v1; do not build)
Cast-list paragraph on the intro to reduce character drift (superseded by intro main characters; verify against real Gemini) · advanced back-cover layout and text · Hebrew interface · duplicate a book into a new page format (`duplicateBookWithNewFormat`) · other languages, landscape, other print shops · in-app image editing · accounts and sync · mobile.

## 5. Dropped from the old plan
The Phase 0 "spike" labs (`spikes/ai-lab`, `print-lab`, `bg-lab`, `hebdate-lab`) and `docs/spike-findings.md` were never built; the app itself was built directly. Their intent lives on in section 1 (real AI run, real PDF, real background run, Hebrew date check). Do not build the spikes unless a real-world check surprises you.
