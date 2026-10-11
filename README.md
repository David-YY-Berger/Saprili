# Saprili

Chrome extension for creating children's bedtime books.

## Run locally

1. Install [Node.js](https://nodejs.org/), then run `npm ci`.
2. Run `npm run dev` to build the extension into `dist/` and rebuild when files change.
3. In Chrome, open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose this project's `dist/` folder.
4. After changes rebuild, click **Reload** on the Saprili card.

For a one-time production build, run `npm run build`.

## Checks

- `npm test` runs unit and component tests.
- `npm run typecheck` and `npm run lint` check types and source rules.
- For the extension end-to-end test, run `npx playwright install chromium` once, then `npm run e2e`. It opens a temporary headed browser profile.
