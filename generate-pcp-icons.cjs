/**
 * generate-pcp-icons.cjs
 * Gera ícones PCP Matrix em múltiplos tamanhos usando apenas módulos built-in.
 * Design: fundo azul royal gradient com factory icon e texto "PCP MATRIX"
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

/* ─── helpers PNG ─────────────────────────────────────────────────── */
function u32be(val) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(val, 0);
  return b;
}
function crc32(data) {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = t[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const com = Buffer.concat([tb, data]);
  return Buffer.concat([u32be(data.length), tb, data, u32be(crc32(com))]);
}

/**
 * Cria PNG RGBA a partir de uma grid de pixels [r,g,b,a]
 */
function makePNG(pixels, width, height) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x++) {
      const p = pixels[y * width + x];
      row[1 + x * 4]     = p[0];
      row[2 + x * 4]     = p[1];
      row[3 + x * 4]     = p[2];
      row[4 + x * 4]     = p[3] ?? 255;
    }
    rows.push(row);
  }
  const raw = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', raw), chunk('IEND', Buffer.alloc(0))]);
}

/* ─── design ─────────────────────────────────────────────────────── */
/**
 * Gera o ícone PCP Matrix em 'size' x 'size' pixels.
 * Usa uma paleta azul royal com factory icon vetorizado.
 */
function generateIcon(size) {
  const pixels = new Array(size * size);
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2;
  const rr = r * 0.82; // raio do canto arredondado

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // ── 1) Fundo com cantos arredondados ────────────────────────
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const cornerX = Math.max(0, dx - (r - rr));
      const cornerY = Math.max(0, dy - (r - rr));
      const inBounds = Math.sqrt(cornerX * cornerX + cornerY * cornerY) <= rr;

      if (!inBounds) {
        pixels[y * size + x] = [255, 255, 255, 0]; // transparente fora
        continue;
      }

      // ── 2) Gradiente azul royal ──────────────────────────────────
      const nx = (x / size);         // 0..1
      const ny = (y / size);         // 0..1
      const dist = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2);

      // Cores do gradiente: azul escuro nas bordas, azul royal no centro
      const t = Math.min(1, dist * 2.2);
      const bgR = Math.round(10  + (35 - 10)  * (1 - t));
      const bgG = Math.round(30  + (90 - 30)  * (1 - t));
      const bgB = Math.round(120 + (220 - 120) * (1 - t));

      // ── 3) Brilho inferior (lens flare) ─────────────────────────
      const glowY = (y - size * 0.82) / (size * 0.2);
      const glowX = (x - cx) / (size * 0.25);
      const glow  = Math.max(0, 1 - (glowX * glowX + glowY * glowY));
      const glowR = Math.round(bgR + 80 * glow);
      const glowG = Math.round(bgG + 120 * glow);
      const glowB = Math.round(bgB + 255 * glow * 0.4);

      let pr = Math.min(255, glowR);
      let pg = Math.min(255, glowG);
      let pb = Math.min(255, glowB);

      // ── 4) Factory icon (vetorizado) ─────────────────────────────
      const s = size;
      const lw = Math.max(1, Math.round(s * 0.028)); // espessura de linha

      // Coordenadas da fábrica (normalizadas para size)
      // Corpo principal: retângulo
      const bL = s * 0.22; const bR = s * 0.82;
      const bT = s * 0.30; const bB = s * 0.65;
      // Chaminé
      const cL = s * 0.26; const cR = s * 0.36;
      const cTp= s * 0.10; const cBt= s * 0.30;
      // Telhado diagonal (borda do lado direito mais alto)
      const rfT = s * 0.18; // topo do telhado à direita
      // Pontos internos (5 cápsulas horizontais)
      const dotY1 = s * 0.535; const dotY2 = s * 0.585;
      const dotH  = dotY2 - dotY1;
      const dotSpacing = (bR - bL - lw * 2) / 5;

      function inRect(px, py, x1, y1, x2, y2, thickness) {
        // retorna true se (px,py) está sobre o contorno do retângulo
        const onLeft   = px >= x1 && px <= x1 + thickness && py >= y1 && py <= y2;
        const onRight  = px >= x2 - thickness && px <= x2 && py >= y1 && py <= y2;
        const onTop    = py >= y1 && py <= y1 + thickness && px >= x1 && px <= x2;
        const onBottom = py >= y2 - thickness && py <= y2 && px >= x1 && px <= x2;
        return onLeft || onRight || onTop || onBottom;
      }

      function inFilledRect(px, py, x1, y1, x2, y2) {
        return px >= x1 && px <= x2 && py >= y1 && py <= y2;
      }

      let isIcon = false;

      // Corpo da fábrica (outline)
      if (inRect(x, y, bL, bT, bR, bB, lw)) isIcon = true;

      // Chaminé (filled)
      if (inFilledRect(x, y, cL, cTp, cR, cBt)) isIcon = true;

      // Telhado diagonal (linha da esquerda para direita em diagonal)
      // Vai de (bL, bT) até (bR, rfT) — diagonal
      const slope = (rfT - bT) / (bR - bL);
      const lineY = bT + slope * (x - bL);
      if (x >= bL && x <= bR && Math.abs(y - lineY) <= lw * 0.8) isIcon = true;

      // 5 cápsulas internas
      for (let d = 0; d < 5; d++) {
        const dxL = bL + lw * 2 + d * dotSpacing + dotSpacing * 0.15;
        const dxR = dxL + dotSpacing * 0.7;
        if (inFilledRect(x, y, dxL, dotY1, dxR, dotY2)) {
          // cápsulas arredondadas (aproximadas)
          const dcx = (dxL + dxR) / 2;
          const dcy = (dotY1 + dotY2) / 2;
          const ddx = Math.max(0, Math.abs(x - dcx) - (dxR - dxL) / 2 + dotH / 2);
          const ddy = Math.abs(y - dcy);
          if (Math.sqrt(ddx * ddx + ddy * ddy) <= dotH / 2) isIcon = true;
        }
      }

      // ── 5) Texto "PCP MATRIX" (bitmap simples via lookup) ────────
      // Renderiza usando poly-rect simples para cada letra
      const textY1 = s * 0.70;
      const textY2 = s * 0.84;
      const textH  = textY2 - textY1;
      const chars = "PCPMATRIX";
      const charW = (bR - bL) / chars.length;

      // Bitmap de 5x7 para cada letra
      const bitmaps = {
        P: [0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
        C: [0b01111,0b10000,0b10000,0b10000,0b10000,0b10000,0b01111],
        M: [0b10001,0b11011,0b10101,0b10001,0b10001,0b10001,0b10001],
        A: [0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
        T: [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00100],
        R: [0b11110,0b10001,0b10001,0b11110,0b11000,0b10100,0b10011],
        I: [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b11111],
        X: [0b10001,0b10001,0b01010,0b00100,0b01010,0b10001,0b10001],
      };

      for (let ci = 0; ci < chars.length; ci++) {
        const ch = chars[ci];
        const bm = bitmaps[ch];
        if (!bm) continue;
        const cx0 = bL + ci * charW + charW * 0.1;
        const cx1 = cx0 + charW * 0.8;
        const colW = (cx1 - cx0) / 5;
        const rowH = textH / 7;
        const col = Math.floor((x - cx0) / colW);
        const row = Math.floor((y - textY1) / rowH);
        if (col >= 0 && col < 5 && row >= 0 && row < 7) {
          if ((bm[row] >> (4 - col)) & 1) isIcon = true;
        }
      }

      if (isIcon) {
        pr = 255; pg = 255; pb = 255;
      }

      pixels[y * size + x] = [pr, pg, pb, 255];
    }
  }
  return makePNG(pixels, size, size);
}

/* ─── generate all sizes ──────────────────────────────────────────── */
const publicDir  = path.join(__dirname, 'public');
const buildDir   = path.join(__dirname, 'build');
const iconsDir   = path.join(buildDir, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

const jobs = [
  { out: path.join(publicDir, 'pwa-192x192.png'),       size: 192 },
  { out: path.join(publicDir, 'pwa-512x512.png'),       size: 512 },
  { out: path.join(publicDir, 'pcp-matrix-icon.png'),   size: 512 },
  { out: path.join(buildDir, 'icon.png'),               size: 512 },
  { out: path.join(iconsDir, '16x16.png'),              size: 16  },
  { out: path.join(iconsDir, '32x32.png'),              size: 32  },
  { out: path.join(iconsDir, '64x64.png'),              size: 64  },
  { out: path.join(iconsDir, '128x128.png'),            size: 128 },
  { out: path.join(iconsDir, '256x256.png'),            size: 256 },
  { out: path.join(iconsDir, '512x512.png'),            size: 512 },
];

for (const job of jobs) {
  process.stdout.write(`Gerando ${job.size}x${job.size}...`);
  const png = generateIcon(job.size);
  fs.writeFileSync(job.out, png);
  console.log(` ✓  (${(png.length / 1024).toFixed(1)} KB)`);
}

console.log('\n✅ Todos os ícones PCP Matrix gerados com sucesso!');
