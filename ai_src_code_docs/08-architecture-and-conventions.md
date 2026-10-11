<!-- bisiyata dishmaya, leharbot ahava biyisral -->

# 08. Architecture and conventions

## Runtime pieces
1. **App tab** (`app.html`): the single full-tab UI.
2. **Service worker** (`src/background/service-worker.ts`): toolbar click (open or focus the app tab, `background/appTab.ts`) and the job-queue host.
3. **Print page** (`print.html`): print-styled rendering of a saved print job, opened in a new tab.
4. **Layout engine** (`src/layout`): shared by previews, print, colophon and cover.

## Source layout (`src/`)
`app/` shell, routes, error boundary · `background/` service worker, `jobs/` queue · `print/` print app, crop marks, pre-flight dialog · `domain/` entities, constants, factories, validators, spreads, ordering (no React/UI) · `storage/` IndexedDB provider, repositories, settings store, migrations, thumbnails · `images/` photo import/resize/AI copy · `layout/` geometry, shape, text fit, theme, borders, pre-flight, cover geometry, `render/` React renderers, fonts · `ai/` provider, prompts, post-processing, generation service · `features/` library, settings, importcsv, setup, bookview, pageview, booksettings, colophon, cover, generate, backup, devlayout · `shared/` ids, units, errors, clock, async, timing, messaging, hebrewDate · `i18n/` `t()` + `en.ts` · `ui/` UI kit and tokens.
Other: `public/` (manifest, icons, fonts) · `scripts/` (header and manifest checks, pdf-inspect, packaging, error-message generation, e2e runners) · `tests/e2e/` (Playwright specs, synthetic fixtures) · `docs/` (privacy policy, store listing, checklists, store assets) · `dist/` (build output).

## Stack and dependencies
TypeScript (strict), Vite multi-page build (`app.html`, `print.html`, service worker), Manifest V3, React 18, HashRouter, `zustand`, `idb`, `papaparse`, `fflate`, `@dnd-kit/*`, `lucide-react`. Dev: Vitest, Testing Library, `fake-indexeddb`, Playwright, ESLint, Prettier, `pdf-lib` and `axe-core` (tests only). New runtime dependencies need owner approval. Path alias `@/` = `src/`.

## Rules for contributors and agents
- Pure logic (geometry, validation, ordering, parsing, prompt building) lives in plain TS modules with unit tests; components stay thin; tests sit beside the source (`*.test.ts(x)`).
- ESLint layer rules: `domain` and `storage` are free of React/UI; only `src/storage` touches IndexedDB/`chrome.storage`; `generationService` imports nothing from React or the DOM; image/AI/job code stays worker-safe.
- Contracts in [02](./02-data-and-storage.md) are stable: do not rename or reshape them without owner sign-off and a migration.
- CSS logical properties only (no hard-coded left/right); every icon-only control uses `IconButton` (requires `label`).
- `modifiedAt` bumps only via `BookRepository.save(book, 'userEdit' | 'generation')`.
- Errors are always `AppError`; never show raw error text; never log or URL-embed the API key.
- Do not add permissions beyond [02](./02-data-and-storage.md) without owner approval (`check-manifest-permissions` enforces it).
- Do not remove `PLACEHOLDER_KEYS` entries until the shop confirms the value.
- Test data: synthetic only; never commit real family photos or keys.

## Definition of done for a change
`npm run typecheck`, `npm run lint`, `npm run lint:headers`, `npm test` pass; `npm run build` succeeds and the unpacked `dist/` loads in Chrome without console errors.

## Commands
See the repo README for run/build/package. Checks: `npm test` (unit/component, ~250 tests), `npm run typecheck`, `npm run lint`, `npm run lint:headers`, `npm run e2e` (extension flows; needs `npx playwright install chromium`), `npm run e2e:print` (PDF size/fonts checks), `npm run e2e:accessibility` (axe on every route + store screenshots), `npm run e2e:jobs` (mock-provider batch survives closing the tab), `npm run package` (Web Store ZIP, publishes nothing).
