<!-- bisiyata dishmaya, leharbot ahava biyisral -->

# 07. Backup, restore and per-page download

Code: `src/features/backup/*`. ZIP via `fflate`; images are fetched and added one at a time to limit memory.

## Backup ("Download all files")
One ZIP restores the book and is also human-readable:
- `manifest.json`: `formatVersion` (`BACKUP_FORMAT_VERSION`), `appVersion`, `schemaVersion`, `createdAt`, `bookId`, file list with sizes.
- `book.json`: full `Book` record (source of truth). `images.json`: maps every `ImageRecord` id to its zip path, `kind`, `meta`.
- Readable files: `pages/00-intro/photo-1.jpg`, `pages/03/photo-1.jpg`, `pages/03/illustration.png`, `pages/03/colouring.png`, `pages/03/text-en.txt`, `pages/03/text-he.txt`, `cover/…`, `colophon/qr.png`; includes original and AI photos, current and historical illustrations, colouring pages, cover art.
- Export sets `lastBackupAt` with `save(book, 'system')` (does not change `modifiedAt`). Backups are local, unencrypted downloads. UI: progress + cancel, "Last backed up N days ago" badge (nudge colour after 14 days).

## Restore
- Button in the Library header (always visible). Validates paths, file sizes, book invariants, referenced images and schema version. Older schemas are migrated; a newer one raises `BACKUP_TOO_NEW`; bad files raise `BACKUP_INVALID`.
- If the same book id exists: ask whether to **restore as a new copy** or **replace**.
- **Atomic:** images are staged under a temporary id, validated, then book and images commit together; on any failure staged records are removed and existing data is untouched.

## Per-page download
`downloadPageFiles(bookId, pageId)`: a ZIP with that page's texts, original and AI photos, illustration versions and colouring page. Intro and colophon exports include their images; the colophon export includes its generated Hebrew date and text.

## Tests
Round trip with byte-hash comparison, old-schema migration, corrupt and future-schema files, both conflict choices, failed-commit atomicity, per-page file plans, and a 40-story-page × 3-photo export.
