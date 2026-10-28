// Membuat ikon ekstensi 16/32/48/128 px (PNG) tanpa dependensi: kotak teal, perisai putih, centang teal.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const TEAL = [0x0f, 0x76, 0x6e];
const WHITE = [0xff, 0xff, 0xff];

function inRoundedSquare(x, y, r = 0.22) {
  const dx = Math.max(r - x, 0, x - (1 - r));
  const dy = Math.max(r - y, 0, y - (1 - r));
  return dx * dx + dy * dy <= r * r;
}

function inShield(x, y) {
  const cx = 0.5, half = 0.3, top = 0.2, mid = 0.52, bottom = 0.86;
  const t = Math.abs(x - cx) / half;
  if (t > 1 || y > bottom) return false;
  const yTop = top - 0.08 * Math.pow(1 - t, 1.5);
  if (y < yTop) return false;
  if (y <= mid) return true;
  const k = (y - mid) / (bottom - mid);
  return t <= Math.sqrt(1 - k * k);
}

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const vx = bx - ax, vy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

function inCheck(x, y) {
  const a = [0.38, 0.51], b = [0.47, 0.6], c = [0.63, 0.41];
  return Math.min(distToSegment(x, y, a, b), distToSegment(x, y, b, c)) <= 0.045;
}

function pixel(x, y, size) {
  if (!inRoundedSquare(x, y)) return null;
  if (size >= 32 && inCheck(x, y)) return TEAL;
  if (inShield(x, y)) return WHITE;
  return TEAL;
}

function render(size) {
  const ss = 4;
  const rgba = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = pixel((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size, size);
          if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
        }
      }
      const i = (py * size + px) * 4;
      if (a) { rgba[i] = r / a; rgba[i + 1] = g / a; rgba[i + 2] = b / a; }
      rgba[i + 3] = Math.round((a / (ss * ss)) * 255);
    }
  }
  return rgba;
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = new URL('../public/icons/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const size of [16, 32, 48, 128]) writeFileSync(new URL(`${size}.png`, out), png(size, render(size)));
console.log('Ikon dibuat di public/icons/');
