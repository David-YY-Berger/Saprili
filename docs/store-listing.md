# Chrome Web Store listing draft

## Name

Saprili — Your storybook scribe

## Short description

Turn family photos and bilingual text into illustrated, print-ready storybooks.

## Single purpose

Saprili helps families create and export illustrated children's storybooks from their own text and photos.

## Long description

Bring a family's stories together in a book made for reading and printing. Import bilingual English and Hebrew text, add family photos, and arrange the story into pages and spreads. Saprili can use the Gemini API with your own key to create illustrations and colouring pages. Preview the layout, then print the interior and cover to PDF for review.

Your books and API key stay in local extension storage. AI generation is optional; when you request it, the relevant photos and English text are sent to Google's Gemini API using your key. You can download a complete backup ZIP and restore it later.

Saprili is designed for desktop Chromium. Print-shop compatibility details can vary; review the PDF and warnings with your printer before ordering. Saprili does not claim approval from a print shop.

## Permission justifications

- **Storage:** save the user's Gemini API key and extension preferences locally.
- **Unlimited storage:** preserve user-created books and their image files beyond the regular extension storage limit.
- **Optional host permission — `https://generativelanguage.googleapis.com/*`:** contact the Gemini API only when the user explicitly starts AI image generation. The permission is not required to edit, preview, back up, restore, or print a book.

The extension does not use accounts, remote code, analytics, or advertising.

## Privacy policy

Use the public URL for [`privacy-policy.md`](./privacy-policy.md) after hosting it. Do not submit this relative file path as the Web Store privacy-policy URL.

## Prepared store assets

`promo-tile.png`, `book-outline.png`, `page-editor.png`, and `print-preview.png` are generated from the synthetic fixture by `npm run e2e:accessibility`. They contain no family photos. `promo-tile.svg` is the editable source for the promotional tile.

## Listing decisions still needed

- Choose the visibility and distribution settings in the developer dashboard.
- Confirm the published contact method and public privacy-policy URL.
