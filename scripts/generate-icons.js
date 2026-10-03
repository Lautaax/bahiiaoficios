import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

// Maskable SVG with safe margin (15% padding)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#4f46e5"/>
  <g transform="translate(64, 64) scale(0.75)">
    <rect width="512" height="512" rx="100" fill="#4f46e5"/>
    <path d="M256 120l-140 120h40v152h200v-152h40z" fill="white"/>
    <path d="M276 280l-40 40 40 40m-40-40h80" stroke="white" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>`;

async function generate() {
  console.log('Generating Web PWA icons...');
  await sharp(svgBuffer).resize(192, 192).png().toFile('public/icon-192x192.png');
  await sharp(svgBuffer).resize(512, 512).png().toFile('public/icon-512x512.png');
  await sharp(svgBuffer).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  await sharp(svgBuffer).resize(32, 32).png().toFile('public/favicon-32x32.png');
  await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile('public/icon-maskable-512x512.png');

  console.log('Generating Android native mipmap icons...');
  const mipmaps = [
    { dir: 'android/app/src/main/res/mipmap-mdpi', size: 48 },
    { dir: 'android/app/src/main/res/mipmap-hdpi', size: 72 },
    { dir: 'android/app/src/main/res/mipmap-xhdpi', size: 96 },
    { dir: 'android/app/src/main/res/mipmap-xxhdpi', size: 144 },
    { dir: 'android/app/src/main/res/mipmap-xxxhdpi', size: 192 }
  ];

  for (const { dir, size } of mipmaps) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_round.png'));
  }

  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
