// bisiyata dishmaya, leharbot ahava biyisral
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createEmptyBook } from '@/domain/factories';
import { getBackCoverImageId, getCoverImageIds } from './pageImages';
import { CoverSheet } from './CoverSheet';
import { FakeTextMeasurer } from '../textFit';

const measurer = new FakeTextMeasurer();

function makeBook() {
  const book = createEmptyBook({ nowIso: '2026-01-01T00:00:00.000Z' });
  book.cover.ownImageId = 'own';
  return book;
}

const render = (props: Partial<Parameters<typeof CoverSheet>[0]> = {}) =>
  renderToStaticMarkup(
    <CoverSheet book={makeBook()} edition="colour" measurer={measurer} {...props} />,
  );

describe('CoverSheet', () => {
  it('renders the full bleed canvas with title, subtitle, spine and picture', () => {
    const html = render();
    expect(html).toContain('width:466mm');
    expect(html).toContain('height:327mm');
    for (const layer of ['background', 'border', 'picture', 'cover-text', 'spine']) {
      expect(html).toContain(`data-layer="${layer}"`);
    }
    expect(html).toContain('משפחת ברגר, גבעת מרדכי, 5787');
    expect(html).toContain('צילום מצב מהחיים שלנו');
    expect(html).toContain('משפחת ברגר 5787');
    expect(html).toContain('rotate(-90deg)');
  });

  it('adds the colouring marker only in the colouring edition', () => {
    expect(render({ edition: 'colour' })).not.toContain('data-layer="colouring-marker"');
    const html = render({ edition: 'colouring' });
    expect(html).toContain('data-layer="colouring-marker"');
    expect(html).toContain('ספר צביעה');
  });

  it('does not show a back-cover reminder in the preview or print', () => {
    expect(render()).not.toContain('TODO');
    expect(render()).not.toContain('data-editor-only="true"');
  });

  it('keeps the same cover colours in both editions', () => {
    const colour = render({ edition: 'colour' });
    const colouring = render({ edition: 'colouring' });
    expect(colour).toContain('#DCEFFB');
    expect(colouring).toContain('#DCEFFB');
  });

  it('puts the front panel on the other side when the binding changes', () => {
    const right = makeBook();
    const left = makeBook();
    left.bindingSide = 'left';
    const frontIndex = (html: string) => html.indexOf('data-panel="front"');
    const backIndex = (html: string) => html.indexOf('data-panel="back"');
    expect(frontIndex(render({ book: right }))).toBeGreaterThan(-1);
    expect(backIndex(render({ book: left }))).toBeGreaterThan(-1);
    expect(render({ book: right })).not.toBe(render({ book: left }));
  });
});

describe('getCoverImageIds', () => {
  it('prefers the own image, then the generated illustration, else nothing', () => {
    const book = createEmptyBook({ nowIso: '2026-01-01T00:00:00.000Z' });
    expect(getCoverImageIds(book)).toEqual([]);
    book.cover.illustration.currentImageId = 'gen';
    expect(getCoverImageIds(book)).toEqual(['gen']);
    book.cover.ownImageId = 'own';
    expect(getCoverImageIds(book)).toEqual(['own']);
  });

  it('uses the exact selected intro collage photos and portrait ids in character order', () => {
    const book = createEmptyBook({ nowIso: '2026-01-01T00:00:00.000Z' });
    book.intro.photoLayout = 'collage';
    book.intro.photos = [
      { originalImageId: 'original-1', aiCopyImageId: 'ai-1' },
      { originalImageId: 'original-2', aiCopyImageId: 'ai-2' },
      { originalImageId: 'original-3', aiCopyImageId: 'ai-3' },
      { originalImageId: 'original-4', aiCopyImageId: 'ai-4' },
      { originalImageId: 'ignored-original', aiCopyImageId: 'ignored-ai' },
    ];
    book.cover.artworkMode = 'introCollage';
    expect(getCoverImageIds(book)).toEqual([
      'original-1',
      'original-2',
      'original-3',
      'original-4',
    ]);
    book.intro.characters = [
      { id: 'first', name: 'First', description: '', photo: null },
      { id: 'second', name: 'Second', description: '', photo: null },
    ];
    book.cover.artworkMode = 'characterPortraits';
    book.cover.characterPortraits = [
      { characterId: 'second', imageId: 'portrait-2' },
      { characterId: 'first', imageId: 'portrait-1' },
    ];
    expect(getCoverImageIds(book)).toEqual(['portrait-1', 'portrait-2']);
  });

  it('renders the cover collage with its source images in the cover picture area', () => {
    const book = createEmptyBook({ nowIso: '2026-01-01T00:00:00.000Z' });
    book.cover.artworkMode = 'introCollage';
    book.intro.photoLayout = 'collage';
    book.intro.photos = [
      { originalImageId: 'original-1', aiCopyImageId: 'ai-1' },
      { originalImageId: 'original-2', aiCopyImageId: 'ai-2' },
    ];
    const html = render({
      book,
      images: new Map([
        ['original-1', 'blob:first'],
        ['original-2', 'blob:second'],
      ]),
    });
    expect(html).toContain('src="blob:first"');
    expect(html).toContain('src="blob:second"');
    expect((html.match(/data-layer="picture"/g) ?? []).length).toBe(2);
  });

  it('renders selected back-cover artwork and never the AI reference photo', () => {
    const book = createEmptyBook({ nowIso: '2026-01-01T00:00:00.000Z' });
    book.cover.back.referenceImageId = 'reference';
    book.cover.back.generatedImageId = 'generated-back';
    const ids = [getBackCoverImageId(book)!];
    const html = render({ book, images: new Map([['generated-back', 'blob:generated']]) });
    expect(ids).toEqual(['generated-back']);
    expect(html).toContain('src="blob:generated"');

    book.cover.back.artworkMode = 'upload';
    book.cover.back.ownImageId = 'uploaded-back';
    expect(getBackCoverImageId(book)).toBe('uploaded-back');
    expect(getBackCoverImageId(book)).not.toBe('reference');
    const directUploadHtml = render({
      book,
      images: new Map([['uploaded-back', 'blob:uploaded-back']]),
    });
    expect(directUploadHtml).toContain('src="blob:uploaded-back"');
  });
});
