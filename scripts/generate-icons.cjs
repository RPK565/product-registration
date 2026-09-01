const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const svg = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2c7a4b" />
      <stop offset="100%" style="stop-color:#1f5a36" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)" />
  <rect x="40" y="40" width="432" height="432" rx="72" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="8" />
  <text x="256" y="300" font-family="Arial, Helvetica, sans-serif" font-size="240" font-weight="bold" fill="#ffffff" text-anchor="middle">M</text>
  <text x="256" y="428" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="bold" fill="#ffffff" fill-opacity="0.9" text-anchor="middle" letter-spacing="8">MAC</text>
</svg>
`;

async function generate() {
  const base = sharp(Buffer.from(svg));

  await base.clone().resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
  await base.clone().resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  await base.clone().resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));

  console.log('Icons generated');
}

generate().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});