// Generates the PWA icons in public/ without external dependencies.
// Run with: npm run icons
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const TOP = [20, 148, 136]; // #149488
const BOTTOM = [15, 110, 104]; // #0f6e68

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function roundedRectDist(px, py, half, radius) {
  const qx = Math.abs(px - half) - (half - radius);
  const qy = Math.abs(py - half) - (half - radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

/**
 * @param {number} size      output size in pixels
 * @param {number} radius    corner radius as a fraction of size (0 = full bleed)
 * @param {number} markScale size of the check mark relative to the canvas
 */
function drawIcon(size, radius, markScale) {
  const rgba = Buffer.alloc(size * size * 4);
  // Check mark in unit coordinates, centred on (0.5, 0.5).
  const pts = [
    [0.27, 0.52],
    [0.44, 0.68],
    [0.74, 0.35],
  ].map(([x, y]) => [(0.5 + (x - 0.5) * markScale) * size, (0.5 + (y - 0.5) * markScale) * size]);
  const stroke = 0.05 * markScale * size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const bgAlpha =
        radius > 0 ? clamp01(0.5 - roundedRectDist(px, py, size / 2, radius * size)) : 1;
      const d = Math.min(
        distToSegment(px, py, ...pts[0], ...pts[1]),
        distToSegment(px, py, ...pts[1], ...pts[2]),
      );
      const mark = clamp01(stroke - d + 0.5);
      const t = y / (size - 1);
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        const bg = TOP[c] + (BOTTOM[c] - TOP[c]) * t;
        rgba[i + c] = Math.round(bg + (255 - bg) * mark);
      }
      rgba[i + 3] = Math.round(bgAlpha * 255);
    }
  }
  return encodePng(size, rgba);
}

const icons = [
  ['icon-192.png', 192, 0.22, 1],
  ['icon-512.png', 512, 0.22, 1],
  // Maskable: full bleed, mark inside the 80% safe zone.
  ['icon-maskable-512.png', 512, 0, 0.72],
  // iOS adds its own rounding and renders transparency as black, so keep it opaque.
  ['apple-touch-icon.png', 180, 0, 0.9],
];

for (const [name, size, radius, markScale] of icons) {
  writeFileSync(join(outDir, name), drawIcon(size, radius, markScale));
  console.log(`public/icons/${name}`);
}

writeFileSync(
  join(root, 'public', 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#149488"/>
      <stop offset="1" stop-color="#0f6e68"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <path d="M17.3 33.3 28.2 43.5 47.4 22.4" fill="none" stroke="#fff" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
);
console.log('public/favicon.svg');
