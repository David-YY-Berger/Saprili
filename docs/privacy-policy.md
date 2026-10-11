# Saprili Privacy Policy

**Effective date: October 11, 2026**

Saprili is a Chrome extension for making illustrated family storybooks. This policy describes the information Saprili handles and the choices available to you.

## Information Saprili stores

Book text, photos, generated illustrations, colouring pages, book settings, and your Gemini API key are stored locally in the Saprili extension on your device. Saprili does not operate an account system or a Saprili server, and does not provide cloud sync. Your API key is saved in Chrome's local extension storage; book records and image files are saved in the extension's local IndexedDB database.

Backups and per-page downloads are ZIP files created on your device. They are not uploaded by Saprili. Backup ZIP files are not encrypted, so store them somewhere you consider safe.

## Information sent to Google's Gemini API

Image generation is optional and begins only after you request it. When you generate an illustration, Saprili sends your API key, the English text and photos for the intro page, and the English text and photos for the selected story page to Google's Gemini API. When you generate a colouring page, Saprili sends that page's illustration. The cover-illustration request uses the intro page's English text and photos. Hebrew text and unrelated pages are not included in these requests.

Google processes these requests under its own terms and privacy practices. Review Google's current terms and privacy information before adding a key or sending personal photos. Your use of Gemini may incur charges under your Google account.

## Sharing, analytics, and advertising

Saprili does not sell or share your local book data with the extension publisher. It does not include advertising, analytics, or a Saprili tracking service. The data described above is sent to Google only when you explicitly use the related Gemini generation feature.

## Retention and deletion

Your local data remains in the extension until you delete it or clear/remove the extension's data. Uninstalling the extension or clearing Chrome extension data can permanently remove your books and API key. Download a backup first if you want to keep a copy. You can remove your Gemini API key in My settings; also revoke it through your Google account if you no longer want it to work.

## Permissions

Saprili uses Chrome's `storage` permission to save the API key and extension settings, and `unlimitedStorage` to keep books and image files locally. It requests the optional `https://generativelanguage.googleapis.com/*` host permission only when you start image generation, so the extension can contact Google's Gemini API.

## Contact

For privacy questions, contact the publisher using the contact link on the Saprili Chrome Web Store listing.
