// bisiyata dishmaya, leharbot ahava biyisral
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';

export async function inspectPdf(input, { pageCount, widthMm, heightMm, toleranceMm = 0.1 }) {
  const bytes = Buffer.isBuffer(input) ? input : await readFile(input);
  const document = await PDFDocument.load(bytes);
  const pages = document.getPages();
  assert.equal(pages.length, pageCount, 'PDF page count does not match the print document');

  const pointsPerMm = 72 / 25.4;
  const expectedWidth = widthMm * pointsPerMm;
  const expectedHeight = heightMm * pointsPerMm;
  const tolerancePt = toleranceMm * pointsPerMm;
  for (const [index, page] of pages.entries()) {
    const size = page.getSize();
    assert.ok(
      Math.abs(size.width - expectedWidth) <= tolerancePt,
      `PDF page ${index + 1} width is outside the ${toleranceMm} mm tolerance`,
    );
    assert.ok(
      Math.abs(size.height - expectedHeight) <= tolerancePt,
      `PDF page ${index + 1} height is outside the ${toleranceMm} mm tolerance`,
    );
    const cropBox = page.getCropBox();
    assert.ok(
      cropBox.x >= 0 && cropBox.y >= 0,
      `PDF page ${index + 1} crop box starts outside the sheet`,
    );
    assert.ok(
      cropBox.x + cropBox.width <= size.width + tolerancePt &&
        cropBox.y + cropBox.height <= size.height + tolerancePt,
      `PDF page ${index + 1} crop box extends outside the sheet`,
    );
  }

  const hasEmbeddedFont = document.context.enumerateIndirectObjects().some(([, object]) => {
    if (!(object instanceof PDFDict)) return false;
    return ['FontFile', 'FontFile2', 'FontFile3'].some((key) => object.has(PDFName.of(key)));
  });
  assert.ok(hasEmbeddedFont, 'PDF contains no embedded font program');
  return { pageCount: pages.length, widthMm, heightMm, hasEmbeddedFont };
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href
) {
  const [, , file, pages, width, height] = process.argv;
  if (!file || !pages || !width || !height) {
    throw new Error('Usage: node scripts/pdf-inspect.mjs <pdf> <pages> <width-mm> <height-mm>');
  }
  const result = await inspectPdf(file, {
    pageCount: Number(pages),
    widthMm: Number(width),
    heightMm: Number(height),
  });
  console.log(`PDF inspection passed: ${JSON.stringify(result)}`);
}
