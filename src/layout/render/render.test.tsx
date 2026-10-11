// bisiyata dishmaya, leharbot ahava biyisral
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createEmptyBook, createStoryPage } from '@/domain/factories';
import { computeIntroPhotoLayout, getIntroPhotoCount } from './introPhotos';
import { getPageImageIds } from './pageImages';
import { PageSheet } from './PageSheet';
import { ensureBookShape } from '../shape';
import { FakeTextMeasurer } from '../textFit';

const measurer = new FakeTextMeasurer();

function makeBook() {
  const book = createEmptyBook({ nowIso: '2026-01-01T00:00:00.000Z' });
  book.intro = {
    ...book.intro,
    id: 'intro',
    textEn: 'Hello family',
    textHe: 'שלום',
    photos: [
      { originalImageId: 'p1', aiCopyImageId: 'c1' },
      { originalImageId: 'p2', aiCopyImageId: 'c2' },
    ],
  };
  book.storyPages = [
    createStoryPage({ id: 's0', textEn: 'English line', textHe: 'שורה בעברית' }),
    createStoryPage({ id: 's1', textEn: 'Second' }),
  ];
  book.storyPages[0]!.illustration.currentImageId = 'ill-0';
  book.storyPages[0]!.colouring.imageId = 'col-0';
  return ensureBookShape(book, measurer);
}

const render = (
  props: Partial<Parameters<typeof PageSheet>[0]> & {
    pageRef: { kind: 'intro' | 'story' | 'colophon'; id: string };
  },
) =>
  renderToStaticMarkup(
    <PageSheet book={makeBook()} side="right" edition="colour" measurer={measurer} {...props} />,
  );

describe('PageSheet', () => {
  it('renders a story page: background, border, picture, text, page number', () => {
    const html = render({ pageRef: { kind: 'story', id: 's0' } });
    for (const layer of ['background', 'border', 'picture', 'text', 'page-number']) {
      expect(html).toContain(`data-layer="${layer}"`);
    }
    expect(html).toContain('<svg');
    expect(html).toContain('width:206mm');
    expect(html).toContain('height:291mm');
    expect(html).toContain('data-empty="true"');
  });

  it('puts Hebrew first, right-to-left, above the English block', () => {
    const html = render({ pageRef: { kind: 'story', id: 's0' } });
    const he = html.indexOf('lang="he"');
    const en = html.indexOf('lang="en"');
    expect(he).toBeGreaterThan(-1);
    expect(en).toBeGreaterThan(he);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('Noto Sans Hebrew');
    expect(html).toContain('Nunito');
  });

  it('grows by the bleed on every side when showBleed is set', () => {
    const html = render({ pageRef: { kind: 'story', id: 's0' }, showBleed: true });
    expect(html).toContain('width:212mm');
    expect(html).toContain('height:297mm');
  });

  it('uses the illustration in colour and the colouring page in the colouring edition', () => {
    const images = new Map([
      ['ill-0', 'blob:illustration'],
      ['col-0', 'blob:colouring'],
    ]);
    const colour = render({ pageRef: { kind: 'story', id: 's0' }, images });
    const colouring = render({
      pageRef: { kind: 'story', id: 's0' },
      images,
      edition: 'colouring',
    });
    expect(colour).toContain('blob:illustration');
    expect(colour).not.toContain('blob:colouring');
    expect(colouring).toContain('blob:colouring');
    expect(colouring).not.toContain('blob:illustration');
  });

  it('colouring edition has a white background and no palette colours', () => {
    const html = render({ pageRef: { kind: 'story', id: 's1' }, edition: 'colouring' });
    expect(html).toContain('background:#FFFFFF');
    expect(html).not.toMatch(/#(DCEFFB|FFD966|FF9E8A|A8E6CF|C9B6F2)/);
  });

  it('prints the original intro photos in both editions', () => {
    const images = new Map([
      ['p1', 'blob:photo1'],
      ['p2', 'blob:photo2'],
    ]);
    for (const edition of ['colour', 'colouring'] as const) {
      const html = render({ pageRef: { kind: 'intro', id: 'intro' }, images, edition });
      expect(html).toContain('blob:photo1');
      expect(html).not.toContain('blob:photo2'); // default layout: first photo large
    }
  });

  it('renders the colophon without picture or text yet', () => {
    const html = render({ pageRef: { kind: 'colophon', id: 'colophon' } });
    expect(html).toContain('data-layer="border"');
    expect(html).not.toContain('data-layer="picture"');
    expect(html).not.toContain('data-layer="text"');
  });

  it('hides page numbers when switched off and on non-story pages', () => {
    const book = makeBook();
    book.showPageNumbers = false;
    const off = renderToStaticMarkup(
      <PageSheet
        book={book}
        pageRef={{ kind: 'story', id: 's0' }}
        side="left"
        edition="colour"
        measurer={measurer}
      />,
    );
    expect(off).not.toContain('data-layer="page-number"');
    expect(render({ pageRef: { kind: 'intro', id: 'intro' } })).not.toContain(
      'data-layer="page-number"',
    );
  });

  it('numbers story pages by position in the printed interior', () => {
    expect(render({ pageRef: { kind: 'story', id: 's0' } })).toMatch(
      /data-layer="page-number"[^>]*>2</,
    );
    expect(render({ pageRef: { kind: 'story', id: 's1' } })).toMatch(
      /data-layer="page-number"[^>]*>3</,
    );
  });

  it('shows the text panel only in the colour edition', () => {
    const book = makeBook();
    book.theme.textPanel = true;
    const colour = renderToStaticMarkup(
      <PageSheet
        book={book}
        pageRef={{ kind: 'story', id: 's0' }}
        side="left"
        edition="colour"
        measurer={measurer}
      />,
    );
    const colouring = renderToStaticMarkup(
      <PageSheet
        book={book}
        pageRef={{ kind: 'story', id: 's0' }}
        side="left"
        edition="colouring"
        measurer={measurer}
      />,
    );
    expect(colour).toMatch(/data-layer="text"[^>]*background:#FFFFFF/);
    expect(colouring).toMatch(/data-layer="text"[^>]*background:transparent/);
  });

  it('flags overflow without cutting text', () => {
    const book = makeBook();
    book.storyPages[0]!.textEn = 'word '.repeat(2000);
    const html = renderToStaticMarkup(
      <PageSheet
        book={book}
        pageRef={{ kind: 'story', id: 's0' }}
        side="left"
        edition="colour"
        measurer={measurer}
      />,
    );
    expect(html).toContain('data-overflow="true"');
    expect(html).toContain('overflow:visible');
  });
});

describe('getPageImageIds', () => {
  it('follows the edition for story pages and always uses originals for the intro', () => {
    const book = makeBook();
    expect(getPageImageIds(book, { kind: 'story', id: 's0' }, 'colour')).toEqual(['ill-0']);
    expect(getPageImageIds(book, { kind: 'story', id: 's0' }, 'colouring')).toEqual(['col-0']);
    expect(getPageImageIds(book, { kind: 'story', id: 's1' }, 'colour')).toEqual([]);
    expect(getPageImageIds(book, { kind: 'intro', id: 'intro' }, 'colouring')).toEqual(['p1']);
    book.intro.photoLayout = 'collage';
    expect(getPageImageIds(book, { kind: 'intro', id: 'intro' }, 'colour')).toEqual(['p1', 'p2']);
    expect(getPageImageIds(book, { kind: 'colophon', id: 'colophon' }, 'colour')).toEqual([]);
  });
});

describe('computeIntroPhotoLayout', () => {
  const area = { x: 20, y: 20, width: 160, height: 180 };
  const inside = (r: { x: number; y: number; width: number; height: number }) =>
    r.x >= area.x - 1e-9 &&
    r.y >= area.y - 1e-9 &&
    r.x + r.width <= area.x + area.width + 1e-9 &&
    r.y + r.height <= area.y + area.height + 1e-9;
  const overlap = (a: typeof area, b: typeof area) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

  it('first-large mode uses the whole zone for one photo', () => {
    expect(computeIntroPhotoLayout(4, 'firstLarge', area)).toEqual([area]);
  });

  it('collage places 1 to 4 photos without overlap, inside the zone', () => {
    for (const count of [1, 2, 3, 4]) {
      const cells = computeIntroPhotoLayout(count, 'collage', area);
      expect(cells).toHaveLength(count);
      cells.forEach((c) => expect(inside(c)).toBe(true));
      for (let i = 0; i < cells.length; i++)
        for (let j = i + 1; j < cells.length; j++)
          expect(overlap(cells[i]!, cells[j]!)).toBe(false);
    }
  });

  it('caps the collage at four and handles no photos', () => {
    expect(computeIntroPhotoLayout(9, 'collage', area)).toHaveLength(4);
    expect(getIntroPhotoCount(9, 'collage')).toBe(4);
    expect(computeIntroPhotoLayout(0, 'collage', area)).toEqual([]);
  });
});
