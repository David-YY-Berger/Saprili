# Font licences

All fonts are packaged inside the extension (`public/fonts/`) and loaded through `src/layout/fonts.css`. No remote font loading.

| Role | Family | Files | Licence | Source |
|---|---|---|---|---|
| Hebrew (with nikud) | Noto Sans Hebrew, 400 and 700 | `noto-sans-hebrew-400.woff2`, `noto-sans-hebrew-700.woff2` | SIL Open Font License 1.1 | https://github.com/notofonts/hebrew (via Fontsource `@fontsource/noto-sans-hebrew`) |
| English | Nunito, 400 and 700 (Latin subset) | `nunito-latin-400.woff2`, `nunito-latin-700.woff2` | SIL Open Font License 1.1 | https://github.com/googlefonts/nunito (via Fontsource `@fontsource/nunito`) |

Both are used under the SIL Open Font License 1.1 (https://openfontlicense.org): free to use, embed and redistribute, including in a commercial product, provided the fonts are not sold on their own.

Decision D-FONT is **assumed**, not settled: the owner has not yet picked fonts in Phase 0 (P0-B). These two were chosen because the Hebrew file contains the full nikud range (U+05B0 to U+05C7, checked with fontTools) with positioning rules, and Nunito is a rounded, child-friendly Latin face. To change a font, replace the file, the `@font-face` rule and the matching entry in `src/layout/fontRegistry.ts`. The registry ids `hebrew-default` and `english-default` are what stored books reference, so keep them.
