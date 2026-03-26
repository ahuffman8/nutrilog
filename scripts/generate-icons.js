#!/usr/bin/env node
// Generates public/icon-192.png and public/icon-512.png
// Pure Node.js, no external dependencies — uses zlib for PNG compression

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 lookup table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Draw a simple icon: indigo background, white rounded-square inset, bold "N" letter
function drawPixel(pixels, size, x, y, r, g, b) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const i = (y * size + x) * 3;
  pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b;
}

function generateIcon(size) {
  // Colors
  const BG  = [79, 70, 229];   // indigo-600
  const FG  = [255, 255, 255]; // white
  const ACC = [99, 102, 241];  // indigo-400 (slightly lighter for depth)

  const pixels = Buffer.alloc(size * size * 3);

  // Fill background
  for (let i = 0; i < size * size * 3; i += 3) {
    pixels[i] = BG[0]; pixels[i + 1] = BG[1]; pixels[i + 2] = BG[2];
  }

  // Draw a white rounded square inset (the "card")
  const pad = Math.round(size * 0.18);
  const r = Math.round(size * 0.12); // corner radius
  for (let y = pad; y < size - pad; y++) {
    for (let x = pad; x < size - pad; x++) {
      // Rounded corners using distance check
      const corners = [
        [pad + r, pad + r],
        [size - pad - r - 1, pad + r],
        [pad + r, size - pad - r - 1],
        [size - pad - r - 1, size - pad - r - 1],
      ];
      let inCorner = false;
      for (const [cx, cy] of corners) {
        if (Math.abs(x - cx) > r && Math.abs(y - cy) > r) {
          const dx = Math.abs(x - cx) - r;
          const dy = Math.abs(y - cy) - r;
          if (Math.abs(x - cx) > r && Math.abs(y - cy) > r) {
            if (dx * dx + dy * dy > 0) inCorner = (dx * dx + dy * dy > 0);
          }
        }
      }

      // Simpler: just clip corners
      const nearTL = x < pad + r && y < pad + r;
      const nearTR = x >= size - pad - r && y < pad + r;
      const nearBL = x < pad + r && y >= size - pad - r;
      const nearBR = x >= size - pad - r && y >= size - pad - r;

      let skip = false;
      if (nearTL) {
        const dx = x - (pad + r), dy = y - (pad + r);
        skip = dx * dx + dy * dy > r * r;
      } else if (nearTR) {
        const dx = x - (size - pad - r - 1), dy = y - (pad + r);
        skip = dx * dx + dy * dy > r * r;
      } else if (nearBL) {
        const dx = x - (pad + r), dy = y - (size - pad - r - 1);
        skip = dx * dx + dy * dy > r * r;
      } else if (nearBR) {
        const dx = x - (size - pad - r - 1), dy = y - (size - pad - r - 1);
        skip = dx * dx + dy * dy > r * r;
      }

      if (!skip) {
        drawPixel(pixels, size, x, y, FG[0], FG[1], FG[2]);
      }
    }
  }

  // Draw a bold "N" in indigo on the white card
  // Scale the letter to the inner area
  const inner = size - pad * 2;
  const lx = pad + Math.round(inner * 0.22);  // left edge of letter
  const rx = pad + Math.round(inner * 0.78);  // right edge
  const ty = pad + Math.round(inner * 0.20);  // top
  const by = pad + Math.round(inner * 0.80);  // bottom
  const stroke = Math.max(2, Math.round(size * 0.07));

  // Left vertical bar
  for (let y = ty; y <= by; y++) {
    for (let s = 0; s < stroke; s++) {
      drawPixel(pixels, size, lx + s, y, BG[0], BG[1], BG[2]);
    }
  }

  // Right vertical bar
  for (let y = ty; y <= by; y++) {
    for (let s = 0; s < stroke; s++) {
      drawPixel(pixels, size, rx - s, y, BG[0], BG[1], BG[2]);
    }
  }

  // Diagonal — from top-left to bottom-right
  const diagLen = by - ty;
  for (let i = 0; i <= diagLen; i++) {
    const x = Math.round(lx + stroke + (rx - lx - stroke * 2) * (i / diagLen));
    const y = ty + i;
    for (let s = 0; s < stroke; s++) {
      drawPixel(pixels, size, x + s, y, BG[0], BG[1], BG[2]);
    }
  }

  // Build PNG scanlines: filter byte (0) + RGB per row
  const scanlineLen = 1 + size * 3;
  const raw = Buffer.alloc(size * scanlineLen);
  for (let y = 0; y < size; y++) {
    raw[y * scanlineLen] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const si = (y * size + x) * 3;
      const di = y * scanlineLen + 1 + x * 3;
      raw[di] = pixels[si];
      raw[di + 1] = pixels[si + 1];
      raw[di + 2] = pixels[si + 2];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  // bytes 10-12 are 0 (compression, filter, interlace)

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'public');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const out = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(out, generateIcon(size));
  console.log(`Generated ${out} (${size}x${size})`);
}
