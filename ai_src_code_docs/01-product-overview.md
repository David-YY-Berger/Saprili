<!-- bisiyata dishmaya, leharbot ahava biyisral -->

# 01. Product overview

**Saprili** ("Your storybook scribe") is a Chrome extension that turns family photos plus short bilingual (Hebrew/English) text into a print-shop-ready, hard-cover illustrated children's book and a matching colouring book.

**Pipeline:** CSV text in → add photos per page → AI illustration per page → AI colouring page per illustration → themed layout → PDFs for the print shop (interior, colouring-book interior, cover).

**Users:** the owner plus friends and family on desktop Chromium. Each user brings their own paid-tier Gemini API key.

**Non-goals (v1):** accounts, cloud sync, collaboration, mobile, in-app image editing, other languages, landscape books, other print shops' formats, advanced back-cover design, Hebrew UI.

## Vocabulary
- **Cover**: flat printed cover (front, spine, back). **Intro page**: first interior page, alone; introduces characters; prints the original photos. **Story page**, **pair/spread**, **Colophon page** (last interior page, alone).
- **Original photos** (user-added), **Illustration** (AI cartoon of a page), **Colouring page** (black-and-white line art of an illustration).
- **Trim** (final cut size), **Bleed** (artwork past trim), **Safe margin** (nothing important closer to trim).

## Cross-cutting rules
1. Autosave with a subtle "Saved" indicator; loud banner with retry on failure.
2. `modifiedAt` changes only on real user edits and successful generation (never on backup).
3. Destructive actions get a short undo window (8 s).
4. Source code files (`.ts`, `.tsx`, `.css`, `.html`, `.mjs`) start with the header comment `bisiyata dishmaya, leharbot ahava biyisral`, exactly. Not on CSV/JSON/exports. Enforced by `npm run lint:headers`.
5. Hebrew is right-to-left everywhere; Hebrew above English in print.
6. Interface in English, built so a Hebrew RTL interface can be added (CSS logical properties only, `t()` catalogue).
7. Plain-language errors with a next step; every icon button has an accessible name; no gear icon (My settings = person icon, Book settings = sliders icon).
8. Thumbnails in lists; full images only on demand.
9. Branding: "Saprili" / "Your storybook scribe", playful palette (sky blue, sunny yellow, coral, mint, lilac).

## Build status
Implemented = code and automated tests exist. "Unverified" = needs the human/real-world checks listed in [TODO.md](./TODO.md).

| Area | State |
|---|---|
| Scaffold, domain model, storage, migrations | Implemented |
| UI kit, My settings, Library (duplicate/delete with undo) | Implemented |
| CSV import, Setup (format lock), Book view (reorder, add/delete pairs) | Implemented, owner-verified on the real CSV |
| Page view (spread editor, photos, text, overlay, autosave) | Implemented; real-phone-photo check pending |
| Layout engine, theme, borders, fonts | Implemented; visual review and screenshot baselines pending |
| Previews, Book settings, pre-flight, Hebrew date, colophon | Implemented; owner review pending |
| Print export (page, book, colouring book) | Implemented with provisional shop values; real PDF inspection pending |
| Cover editor and cover PDF | Implemented with provisional shop values; real print check pending |
| AI generation (Gemini), retry, history | Implemented; **never run against the real API** |
| Background job queue + Generate dialog | Implemented and mock-tested; **real long run and keep-alive unverified** |
| Backup, restore, per-page download | Implemented; real round trip pending |
| Hardening, store assets, packaging | Drafts and tooling done; usability test, audits, publication pending |
