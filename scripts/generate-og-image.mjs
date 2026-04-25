// Generates public/og-image.png (1200x630) using only Node.js built-ins
// Run: node scripts/generate-og-image.mjs

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/og-image.png");

// --- Minimal PNG encoder (no dependencies) ---
import { createHash } from "crypto";
import { deflateSync } from "zlib";

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(width, height, pixels) {
  // pixels: Uint8Array of RGBA, row by row
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(width * 3 + 1);
    row[0] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      row[1 + x * 3] = pixels[i];
      row[2 + x * 3] = pixels[i + 1];
      row[3 + x * 3] = pixels[i + 2];
    }
    rows.push(row);
  }
  const raw = deflateSync(Buffer.concat(rows), { level: 6 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // bit depth 8, RGB
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", raw),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Draw the OG image ---
const W = 1200, H = 630;
const pixels = new Uint8Array(W * H * 4);

function setPixel(x, y, r, g, b) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = 255;
}

function fillRect(x1, y1, x2, y2, r, g, b) {
  for (let y = y1; y < y2; y++)
    for (let x = x1; x < x2; x++)
      setPixel(x, y, r, g, b);
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

// Background gradient: dark #0f0f0f → #1a1a2e
for (let y = 0; y < H; y++) {
  const t = y / H;
  const r = lerp(15, 26, t), g = lerp(15, 15, t), b = lerp(15, 46, t);
  for (let x = 0; x < W; x++) setPixel(x, y, r, g, b);
}

// Green accent bar at top
fillRect(0, 0, W, 6, 29, 185, 84);

// Green accent bar at bottom
fillRect(0, H - 6, W, H, 29, 185, 84);

// --- Simple bitmap font (5x7 pixels per char, uppercase + digits + symbols) ---
const FONT = {
  'T':[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  'U':[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'N':[[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'E':[[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  'V':[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0]],
  'X':[[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]],
  'A':[[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  'S':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'P':[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  'O':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'I':[[0,1,1,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],
  'F':[[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  'Y':[[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  'G':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'L':[[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  'B':[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
  'C':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,1],[0,1,1,1,0]],
  'H':[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'R':[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  'D':[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
  'W':[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[0,1,0,1,0],[0,1,0,1,0]],
  'K':[[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  'M':[[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  '2':[[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],
  '0':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '6':[[0,0,1,1,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  ' ':[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  '-':[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  '|':[[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
};

function drawText(text, startX, startY, scale, r, g, b) {
  let cx = startX;
  for (const ch of text.toUpperCase()) {
    const glyph = FONT[ch] || FONT[' '];
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++)
        if (glyph[row][col])
          fillRect(cx + col*scale, startY + row*scale, cx + col*scale+scale, startY + row*scale+scale, r, g, b);
    cx += (5 + 1) * scale;
  }
}

// Title: TUNEVEXA
drawText("TUNEVEXA", 180, 160, 12, 255, 255, 255);

// Green underline under title
const titleW = "TUNEVEXA".length * 6 * 12;
fillRect(180, 260, 180 + titleW, 266, 29, 185, 84);

// Subtitle
drawText("SPOTIFY GLOBAL TOP 200 CHARTS", 180, 315, 4, 170, 170, 170);

// Bottom tagline
drawText("UPDATED DAILY", 180, 430, 5, 29, 185, 84);

// Green hexagon logo (right side)
const hx = 1060, hy = 315, hr = 110;
for (let y = hy - hr; y <= hy + hr; y++) {
  for (let x = hx - hr; x <= hx + hr; x++) {
    const dx = x - hx, dy = y - hy;
    const q = Math.abs(dx) / hr, r2 = (Math.abs(dy) + Math.abs(dx) / Math.sqrt(3)) / hr;
    if (q <= 1 && r2 <= 1) {
      const t = (dy + hr) / (2 * hr);
      setPixel(x, y, lerp(29, 23, t), lerp(185, 211, t), lerp(84, 96, t));
    }
  }
}
// V shape on hex
for (let i = 0; i < 60; i++) {
  const t = i / 59;
  const lx = Math.round(lerp(hx - 47, hx, t));
  const ly = Math.round(lerp(hy - 40, hy + 40, t));
  fillRect(lx-4, ly-4, lx+4, ly+4, 255, 255, 255);
}
for (let i = 0; i < 60; i++) {
  const t = i / 59;
  const lx = Math.round(lerp(hx, hx + 47, t));
  const ly = Math.round(lerp(hy + 40, hy - 40, t));
  fillRect(lx-4, ly-4, lx+4, ly+4, 255, 255, 255);
}

// Write PNG
const png = encodePNG(W, H, pixels);
writeFileSync(OUT, png);
console.log(`✅ OG image written to ${OUT} (${png.length} bytes)`);
