// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import {
  COLOPHON_PAGE_ID,
  MAX_AI_CROP_PERCENT,
  SAFE_MARGIN_FLOOR_MM,
} from '@/domain/constants';
import type { ImageRecord } from '@/domain/image';
import { getPageRefsInReadingOrder } from '@/domain/ordering';
import { buildSpreads } from '@/domain/spreads';
import { getMainImageId, type PageRef } from '@/domain/page';
import { computePageGeometry, type Rect } from './geometry';
import { computeCoverGeometry, computeCoverTextFits, fitSpineText } from './coverGeometry';
import { getBackCoverImageId, getCoverImageIds } from './render/pageImages';
import { computePageTextLayout } from './pageText';
import { getDefaultMeasurer } from './textFit';
import type { Edition } from './theme';
import { computeCharacterPortraitLayout, computeIntroPhotoLayout } from './render/introPhotos';
import { CONTENT_INSET_MM } from './specs';

export type PreflightIssueCode =
  | 'ITEM_OUTSIDE_SAFE_AREA'
  | 'MISSING_ILLUSTRATION'
  | 'MISSING_COLOURING'
  | 'OUTDATED_COLOURING'
  | 'TEXT_OVERFLOW'
  | 'LOW_RESOLUTION'
  | 'AI_ASPECT_CROP'
  | 'PAGE_COUNT'
  | 'MISSING_QR'
  | 'COVER_TEXT_IN_UNSAFE_AREA'
  | 'COVER_SPINE_TEXT_TOO_WIDE'
  | 'MISSING_COVER_ILLUSTRATION';

/** Stands in for a page when an issue belongs to the cover. */
export interface CoverRef {
  kind: 'cover';
  id: 'cover';
}
export const COVER_REF: CoverRef = { kind: 'cover', id: 'cover' };

/** `interior` checks the pages; `cover` checks only the flat cover. */
export type PreflightScope = 'interior' | 'cover';

export interface PreflightIssue {
  code: PreflightIssueCode;
  severity: 'warning' | 'info';
  pageRef: PageRef | CoverRef;
  message: string;
  nextStep: string;
}

export interface PreflightReport {
  issues: PreflightIssue[];
  /** Preflight never blocks export; warnings are shown before the user continues. */
  exportAllowed: true;
}

const LOW_RESOLUTION_DPI = 150;

export function computeEffectiveDpi(imageWidthPx: number, pictureWidthMm: number): number {
  if (!Number.isFinite(imageWidthPx) || imageWidthPx <= 0) {
    throw new RangeError('Image width must be a positive number of pixels.');
  }
  if (!Number.isFinite(pictureWidthMm) || pictureWidthMm <= 0) {
    throw new RangeError('Picture width must be a positive number of millimetres.');
  }
  return (imageWidthPx * 25.4) / pictureWidthMm;
}

function contains(
  outer: { x: number; y: number; width: number; height: number },
  inner: typeof outer,
) {
  const epsilon = 0.001;
  return (
    inner.x >= outer.x - epsilon &&
    inner.y >= outer.y - epsilon &&
    inner.x + inner.width <= outer.x + outer.width + epsilon &&
    inner.y + inner.height <= outer.y + outer.height + epsilon
  );
}

export function runPreflight(
  book: Book,
  edition: Edition,
  resolvedImages: ReadonlyMap<string, ImageRecord> = new Map(),
  scope: PreflightScope = 'interior',
): PreflightReport {
  if (scope === 'cover') return runCoverPreflight(book, resolvedImages);
  const issues: PreflightIssue[] = [];
  const add = (issue: PreflightIssue) => issues.push(issue);
  const pages = getPageRefsInReadingOrder(book);
  const firstRef = pages[0] ?? { kind: 'intro', id: book.intro.id };
  const pageSides = new Map<string, 'left' | 'right'>();
  for (const spread of buildSpreads(book)) {
    if (spread.left) pageSides.set(`${spread.left.kind}:${spread.left.id}`, 'left');
    if (spread.right) pageSides.set(`${spread.right.kind}:${spread.right.id}`, 'right');
  }

  for (const pageRef of pages) {
    const side = pageSides.get(`${pageRef.kind}:${pageRef.id}`) ?? 'right';
    const geometry = computePageGeometry(book, pageRef, side);
    if (
      !contains(geometry.safeRect, geometry.pictureRect) ||
      !contains(geometry.safeRect, geometry.textRect) ||
      (book.showPageNumbers && !contains(geometry.safeRect, geometry.pageNumberRect))
    ) {
      add({
        code: 'ITEM_OUTSIDE_SAFE_AREA',
        severity: 'warning',
        pageRef,
        message: 'Some page content extends beyond the safe print area.',
        nextStep: 'Increase the page margins in Book settings and review this page.',
      });
    }

    if (pageRef.kind === 'story') {
      const page = book.storyPages.find((item) => item.id === pageRef.id);
      if (!page) continue;
      if (edition === 'colour' && !getMainImageId(page)) {
        add({
          code: 'MISSING_ILLUSTRATION',
          severity: 'warning',
          pageRef,
          message: 'This page has no illustration; it will print with a blank picture area.',
          nextStep: 'Add an illustration before printing if you want artwork on this page.',
        });
      }
      if (edition === 'colouring' && !page.colouring.imageId) {
        add({
          code: 'MISSING_COLOURING',
          severity: 'warning',
          pageRef,
          message:
            'This page has no colouring illustration; it will print with a blank picture area.',
          nextStep: 'Create or add a colouring illustration for this page.',
        });
      } else if (
        edition === 'colouring' &&
        (page.colouring.outdated ||
          page.colouring.sourceIllustrationImageId !== getMainImageId(page))
      ) {
        add({
          code: 'OUTDATED_COLOURING',
          severity: 'warning',
          pageRef,
          message: 'The colouring illustration was made from an older illustration.',
          nextStep: 'Refresh the colouring illustration after updating the artwork.',
        });
      }

      const textLayout = computePageTextLayout(book, pageRef, geometry, getDefaultMeasurer());
      if (textLayout?.fit.overflow) {
        add({
          code: 'TEXT_OVERFLOW',
          severity: 'warning',
          pageRef,
          message: 'Some text may not fit in the available text area.',
          nextStep: 'Shorten the text or adjust the layout and text size in Book settings.',
        });
      }
    } else if (pageRef.kind === 'intro') {
      const textLayout = computePageTextLayout(book, pageRef, geometry, getDefaultMeasurer());
      if (textLayout?.fit.overflow) {
        add({
          code: 'TEXT_OVERFLOW',
          severity: 'warning',
          pageRef,
          message: 'Some text may not fit in the available text area.',
          nextStep: 'Shorten the text or adjust the layout and text size in Book settings.',
        });
      }
    }

    const imageTargets: { id: string; widthMm: number }[] = [];
    if (pageRef.kind === 'intro') {
      const cells = computeIntroPhotoLayout(
        book.intro.photos.length,
        book.intro.photoLayout,
        geometry.pictureRect,
      );
      book.intro.photos.slice(0, cells.length).forEach((photo, index) => {
        const cell = cells[index];
        if (cell) imageTargets.push({ id: photo.originalImageId, widthMm: cell.width });
      });
    } else if (pageRef.kind === 'story') {
      const page = book.storyPages.find((item) => item.id === pageRef.id);
      const id = edition === 'colour' ? (page ? getMainImageId(page) : null) : page?.colouring.imageId;
      if (id) imageTargets.push({ id, widthMm: geometry.pictureRect.width });
    }
    for (const { id, widthMm } of imageTargets) {
      const image = resolvedImages.get(id);
      if (!image) continue;
      if (
        image.meta.croppedEdgePercent !== undefined &&
        image.meta.croppedEdgePercent > MAX_AI_CROP_PERCENT
      ) {
        add({
          code: 'AI_ASPECT_CROP',
          severity: 'warning',
          pageRef,
          message: `${image.meta.croppedEdgePercent.toFixed(1)}% of an image edge was cropped to fit the picture shape.`,
          nextStep: 'Review the artwork edges. If important content is missing, try a different model or regenerate.',
        });
      }
      const dpi = computeEffectiveDpi(image.widthPx, widthMm);
      if (dpi < LOW_RESOLUTION_DPI) {
        add({
          code: 'LOW_RESOLUTION',
          severity: 'info',
          pageRef,
          message: `The image may look soft at print size (${Math.round(dpi)} effective DPI).`,
          nextStep: 'You can continue, or replace it with a higher-resolution image.',
        });
      }
    }
  }

  if (book.storyPages.length % 2 !== 0) {
    add({
      code: 'PAGE_COUNT',
      severity: 'warning',
      pageRef: firstRef,
      message: 'The interior has an odd number of pages.',
      nextStep: 'Review page order; printing will add a blank final page if needed.',
    });
  }
  if (!book.colophon.qrImageId || !resolvedImages.has(book.colophon.qrImageId)) {
    add({
      code: 'MISSING_QR',
      severity: 'warning',
      pageRef: { kind: 'colophon', id: COLOPHON_PAGE_ID },
      message: 'The colophon has no QR image ready to print.',
      nextStep: 'Add the QR image in the Colophon editor before printing.',
    });
  }
  for (const value of [
    book.layout.marginTopMm,
    book.layout.marginBottomMm,
    book.layout.marginOuterMm,
    book.layout.gutterMm,
  ]) {
    if (!Number.isFinite(value) || value < SAFE_MARGIN_FLOOR_MM) {
      add({
        code: 'ITEM_OUTSIDE_SAFE_AREA',
        severity: 'warning',
        pageRef: firstRef,
        message: 'One or more margins are below the 10 mm safe-area minimum.',
        nextStep: 'Correct the margins in Book settings before printing.',
      });
      break;
    }
  }
  return { issues, exportAllowed: true };
}

function runCoverPreflight(
  book: Book,
  resolvedImages: ReadonlyMap<string, ImageRecord>,
): PreflightReport {
  const issues: PreflightIssue[] = [];
  const geometry = computeCoverGeometry(book);
  const measurer = getDefaultMeasurer();
  const fits = computeCoverTextFits(book, geometry, measurer);
  const items: Rect[] = [geometry.titleRect, geometry.subtitleRect, geometry.frontPictureRect];
  if (
    !items.every((rect) => contains(geometry.safeRects.front, rect)) ||
    fits.title.overflow ||
    fits.subtitle.overflow
  ) {
    issues.push({
      code: 'COVER_TEXT_IN_UNSAFE_AREA',
      severity: 'warning',
      pageRef: COVER_REF,
      message: 'The cover title or subtitle does not fit inside the safe area of the front cover.',
      nextStep: 'Shorten the title or subtitle in the Cover editor.',
    });
  }
  const spineFit = fitSpineText(
    book.cover.spineTextHe,
    geometry.spineWidthMm,
    book.typography.hebrewFontId,
    {
      measurer,
    },
  );
  if (!spineFit.fits) {
    issues.push({
      code: 'COVER_SPINE_TEXT_TOO_WIDE',
      severity: 'warning',
      pageRef: COVER_REF,
      message: `The spine text does not fit the ${geometry.spineWidthMm} mm spine, even at the smallest size.`,
      nextStep: 'Shorten the spine text in the Cover editor.',
    });
  }
  const coverImageIds = getCoverImageIds(book);
  if (coverImageIds.length === 0) {
    issues.push({
      code: 'MISSING_COVER_ILLUSTRATION',
      severity: 'warning',
      pageRef: COVER_REF,
      message: 'The cover has no artwork; it will print with a blank picture area.',
      nextStep:
        'Use an intro collage, add character portraits, or choose an image in the Cover editor.',
    });
  } else {
    let coverCells: Rect[];
    if (book.cover.ownImageId || book.cover.artworkMode === 'single') {
      coverCells = [geometry.frontPictureRect];
    } else if (book.cover.artworkMode === 'introCollage') {
      coverCells = computeIntroPhotoLayout(
        coverImageIds.length,
        book.intro.photoLayout,
        geometry.frontPictureRect,
      );
    } else {
      coverCells = computeCharacterPortraitLayout(coverImageIds.length, geometry.frontPictureRect);
    }
    for (const [index, coverImageId] of coverImageIds.entries()) {
      const image = resolvedImages.get(coverImageId);
      if (!image) continue;
      const pictureWidthMm = coverCells[index]?.width ?? geometry.frontPictureRect.width;
      if (
        image.meta.croppedEdgePercent !== undefined &&
        image.meta.croppedEdgePercent > MAX_AI_CROP_PERCENT
      ) {
        issues.push({
          code: 'AI_ASPECT_CROP',
          severity: 'warning',
          pageRef: COVER_REF,
          message: `${image.meta.croppedEdgePercent.toFixed(1)}% of a cover-image edge was cropped to fit the picture shape.`,
          nextStep: 'Review the artwork edges. If important content is missing, try a different model or regenerate.',
        });
      }
      const dpi = computeEffectiveDpi(image.widthPx, pictureWidthMm);
      if (dpi < LOW_RESOLUTION_DPI) {
        issues.push({
          code: 'LOW_RESOLUTION',
          severity: 'info',
          pageRef: COVER_REF,
          message: `The cover picture may look soft at print size (${Math.round(dpi)} effective DPI).`,
          nextStep: 'You can continue, or replace it with a higher-resolution image.',
        });
      }
    }
  }
  const backCoverImageId = getBackCoverImageId(book);
  if (backCoverImageId) {
    const image = resolvedImages.get(backCoverImageId);
    if (image) {
      if (
        image.meta.croppedEdgePercent !== undefined &&
        image.meta.croppedEdgePercent > MAX_AI_CROP_PERCENT
      ) {
        issues.push({
          code: 'AI_ASPECT_CROP',
          severity: 'warning',
          pageRef: COVER_REF,
          message: `${image.meta.croppedEdgePercent.toFixed(1)}% of a back-cover image edge was cropped to fit the picture shape.`,
          nextStep: 'Review the artwork edges. If important content is missing, try another photo or regenerate.',
        });
      }
      const pictureWidthMm = geometry.safeRects.back.width - 2 * CONTENT_INSET_MM;
      const dpi = computeEffectiveDpi(image.widthPx, pictureWidthMm);
      if (dpi < LOW_RESOLUTION_DPI) {
        issues.push({
          code: 'LOW_RESOLUTION',
          severity: 'info',
          pageRef: COVER_REF,
          message: `The back-cover picture may look soft at print size (${Math.round(dpi)} effective DPI).`,
          nextStep: 'You can continue, or replace it with a higher-resolution picture.',
        });
      }
    }
  }
  return { issues, exportAllowed: true };
}
