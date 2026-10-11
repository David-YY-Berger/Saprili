// bisiyata dishmaya, leharbot ahava biyisral
// Draws the placeholder icons (same design as public/icons/logo.svg) with no dependencies.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIZES = [16, 32, 48, 128];
const SS = 4; // supersampling

const inRoundRect = (x, y, rx, ry, w, h, r) => {
  if (x < rx || y < ry || x > rx + w || y > ry + h) return false;
  const cx = Math.min(Math.max(x, rx + r), rx + w - r);
  const cy = Math.min(Math.max(y, ry + r), ry + h - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

// Shapes in a 128 unit space, painted back to front.
const shapes = [
  { color: [124, 196, 245], hit: (x, y) => inRoundRect(x, y, 0, 0, 128, 128, 28) },
  { color: [255, 213, 74], hit: (x, y) => (x - 92) ** 2 + (y - 38) ** 2 <= 14 ** 2 },
  { color: [255, 255, 255], hit: (x, y) => inRoundRect(x, y, 22, 58, 40, 46, 8) },
  { color: [255, 255, 255], hit: (x, y) => inRoundRect(x, y, 66, 58, 40, 46, 8) },
  { color: [255, 138, 122], hit: (x, y) => x >= 60 && x <= 68 && y >= 58 && y <= 104 },
];

function pixel(px, py, size) {
  let r = 0,
    g = 0,
    b = 0,
    a = 0;
  for (let sy = 0; sy < SS; sy++) {
    for (let sx = 0; sx < SS; sx++) {
      const x = ((px + (sx + 0.5) / SS) / size) * 128;
      const y = ((py + (sy + 0.5) / SS) / size) * 128;
      const shape = [...shapes].reverse().find((s) => s.hit(x, y));
      if (shape) {
        r += shape.color[0];
        g += shape.color[1];
        b += shape.color[2];
        a += 255;
      }
    }
  }
  const n = SS * SS;
  const covered = a / 255 || 1;
  return [r / covered, g / covered, b / covered, a / n].map(Math.round);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      Buffer.from(pixel(x, y, size)).copy(raw, y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
for (const size of SIZES) writeFileSync(`public/icons/icon-${size}.png`, png(size));
console.log(`Wrote icons: ${SIZES.join(', ')}`);
