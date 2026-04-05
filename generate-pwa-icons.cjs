/**
 * generate-pwa-icons.js
 * Gera ícones PNG válidos para PWA usando apenas módulos built-in do Node.js.
 * Cores baseadas no tema dark do RDSN NOVA.
 */
const zlib = require('zlib');
const fs = require('fs');

function writeUInt32BE(val) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(val, 0);
  return buf;
}

function crc32(data) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const combined = Buffer.concat([typeBuffer, data]);
  const crcVal = crc32(combined);
  return Buffer.concat([writeUInt32BE(data.length), typeBuffer, data, writeUInt32BE(crcVal)]);
}

/**
 * Cria um PNG com fundo sólido e a letra "R" centralizada.
 * bgColor: [r, g, b]
 * textColor: [r, g, b]
 */
function createPNG(width, height, bgColor, textColor) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth = 8
  ihdrData[9] = 2;  // color type = RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  // Pixel grid: cada row tem 1 byte de filtro + width*3 bytes RGB
  const rows = [];
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const scale = Math.floor(width / 10); // tamanho do "R" proporcional

  // Pixels que formam a letra "R" (bitmap simples 5x7 escalado)
  const letterR = [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
    [1,0,1,0,0],
    [1,0,0,1,0],
    [1,0,0,0,1],
  ];

  function isLetterPixel(px, py) {
    const startX = cx - (5 * scale) / 2;
    const startY = cy - (7 * scale) / 2;
    const lx = Math.floor((px - startX) / scale);
    const ly = Math.floor((py - startY) / scale);
    if (lx < 0 || lx >= 5 || ly < 0 || ly >= 7) return false;
    return letterR[ly][lx] === 1;
  }

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const color = isLetterPixel(x, y) ? textColor : bgColor;
      row[1 + x * 3]     = color[0];
      row[2 + x * 3]     = color[1];
      row[3 + x * 3]     = color[2];
    }
    rows.push(row);
  }

  const rawData = Buffer.concat(rows);
  const compressed = zlib.deflateSync(rawData);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Tema RDSN NOVA: fundo azul escuro, "R" branco
const bg = [15, 23, 42];       // #0f172a (slate-900)
const fg = [255, 255, 255];    // branco

const sizes = [192, 512];
for (const size of sizes) {
  const filePath = `public/pwa-${size}x${size}.png`;
  fs.writeFileSync(filePath, createPNG(size, size, bg, fg));
  console.log(`✓ Gerado: ${filePath}`);
}

// Também cria um logo SVG real (limpo, sem HTML)
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0f172a" rx="80"/>
  <text x="256" y="340" font-family="Arial, sans-serif" font-size="280" font-weight="bold"
        text-anchor="middle" fill="white">R</text>
</svg>`;
fs.writeFileSync('public/logo_v2.svg', svgContent);
console.log('✓ Gerado: public/logo_v2.svg (SVG real)');

console.log('\n✅ Todos os ícones PWA gerados com sucesso!');
