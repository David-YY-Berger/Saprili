// bisiyata dishmaya, leharbot ahava biyisral
import type { Rect } from '../geometry';
import { mmToCss } from '@/shared/units';
import { formatHebrewDate } from '@/shared/hebrewDate';
import type { Colophon } from '@/domain/colophon';

export function ColophonLayer({
  colophon,
  rect,
  bleedMm,
  qrImageUrl,
}: {
  colophon: Colophon;
  rect: Rect;
  bleedMm: number;
  qrImageUrl: string | null;
}) {
  const hebrewDate = formatHebrewDate(new Date(`${colophon.dateIso.slice(0, 10)}T12:00:00Z`));
  return (
    <div
      data-layer="colophon"
      style={{
        position: 'absolute',
        left: mmToCss(rect.x - bleedMm),
        top: mmToCss(rect.y - bleedMm),
        width: mmToCss(rect.width),
        height: mmToCss(rect.height),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: mmToCss(5),
        padding: mmToCss(6),
        textAlign: 'center',
      }}
    >
      <div dir="rtl" lang="he" style={{ fontSize: '16pt', fontWeight: 700 }}>
        {hebrewDate}
      </div>
      <div>{colophon.place}</div>
      <div dir="rtl" lang="he">
        {colophon.createdByTextHe}
      </div>
      <div
        aria-label={qrImageUrl ? 'QR code' : 'QR code placeholder'}
        data-colophon-qr=""
        style={{
          display: 'grid',
          width: mmToCss(38),
          height: mmToCss(38),
          flex: '0 0 auto',
          placeItems: 'center',
          padding: mmToCss(4),
          background: '#FFFFFF',
        }}
      >
        {qrImageUrl && (
          <img alt="" src={qrImageUrl} style={{ display: 'block', width: '100%', height: '100%' }} />
        )}
      </div>
    </div>
  );
}
