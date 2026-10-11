# Interior PDF inspection checklist

Use this checklist on a real export from the Chrome extension before sending a file to the print shop. The current shop-dependent values are placeholders until the owner records the shop's answers in the plan.

## Automated checks

- [ ] Run `npm run e2e:print`; confirm Chrome exports the interior, colouring edition, and a selected page.
- [ ] Run `node scripts/pdf-inspect.mjs <pdf-path> <page-count> <sheet-width-mm> <sheet-height-mm>` on the saved interior PDF. With current defaults and the 206 × 291 mm trim, the exact sheet is 228 × 313 mm. For `centredA4`, use the actual computed sheet size; A4 is a minimum and the output may expand to preserve bleed and crop marks.
- [ ] Confirm the report gives the expected page count and embedded fonts, and every page size is within 0.1 mm of the expected sheet.

## Visual checks in Chrome

- [ ] In the print dialog choose **Save as PDF**, **Margins: None**, **Scale: 100% / no fit**, and **Background graphics: on**.
- [ ] Confirm the PDF has one sheet per interior page in reading order: intro, story pages, colophon. A blank fallback sheet is present only if needed to make the count even.
- [ ] Confirm each page's background reaches the edge of the bleed; the trim, safe area, text, and picture are positioned as in the app preview.
- [ ] Confirm all eight crop marks sit outside the bleed, are visible, and are not clipped by the sheet edge. Crop-mark dimensions remain placeholders pending S4.
- [ ] Check Hebrew direction, nikud, English text, line breaks, and page numbers. Confirm no text is clipped and no unexpected browser headers, footers, or margins appear.
- [ ] Check that missing illustrations leave blank picture areas and that pre-flight warnings did not silently prevent export.
- [ ] For the colouring edition, confirm white page backgrounds and outline borders, original intro photos unchanged, and the colophon still present.

## Print-shop confirmation

- [ ] Record which placeholder values were used and the PDF's measured page size.
- [ ] Ask the shop to confirm the sheet size, bleed, crop-mark placement, RGB/CMYK requirements, and whether interior pages should be individual pages or imposed spreads.
- [ ] Compare the response with the P0-B print test and update the relevant constants and `PLACEHOLDER_KEYS` only after receiving the shop's exact requirements.
- [ ] Re-run the automated PDF checks after any print-spec change.
