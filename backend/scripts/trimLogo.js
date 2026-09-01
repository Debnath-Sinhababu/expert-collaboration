/**
 * One-off helper: bakes the letterhead logo used by the engagement letter renderers.
 *
 *   node scripts/trimLogo.js [source.png] [dest.png]
 *
 * The source brand asset is a square canvas with a large transparent/white border. Embedding it
 * as-is would shrink the mark to a fraction of the header, so this trims to the visible bounding
 * box and writes an RGBA PNG that both offerLetterPdfService and offerLetterTemplate embed
 * directly. Re-run it whenever the brand logo changes.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const PNG = require('png-js');

const SOURCE = process.argv[2]
  || path.join(__dirname, '..', '..', 'frontend', 'public', 'images', 'calxmaplogo.png');
const DEST = process.argv[3] || path.join(__dirname, '..', 'assets', 'calxmap-logo.png');

// Anything lighter than this on all channels counts as background.
const WHITE_THRESHOLD = 245;
const ALPHA_THRESHOLD = 8;

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodeRgbaPng(pixels, width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: truecolour with alpha
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter type: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function isBackground(r, g, b, a) {
  if (a < ALPHA_THRESHOLD) return true;
  return r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
}

const png = PNG.load(SOURCE);
png.decode((decoded) => {
  const src = Buffer.from(decoded);
  const { width, height } = png;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (isBackground(src[i], src[i + 1], src[i + 2], src[i + 3])) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) throw new Error(`No visible pixels found in ${SOURCE}`);

  const outW = maxX - minX + 1;
  const outH = maxY - minY + 1;
  const out = Buffer.alloc(outW * outH * 4);
  for (let y = 0; y < outH; y += 1) {
    const from = ((minY + y) * width + minX) * 4;
    src.copy(out, y * outW * 4, from, from + outW * 4);
  }

  fs.mkdirSync(path.dirname(DEST), { recursive: true });
  fs.writeFileSync(DEST, encodeRgbaPng(out, outW, outH));
  console.log(`${width}x${height} -> ${outW}x${outH}  written to ${DEST}`);
});
