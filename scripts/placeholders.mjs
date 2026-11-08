// Génère des images SVG de substitution dans <dossier>/assets : node scripts/placeholders.mjs <dossier> nom1.svg "Légende" nom2.svg "Légende" ...
import fs from 'node:fs/promises';
import path from 'node:path';

const [dir, ...pairs] = process.argv.slice(2);
if (!dir || pairs.length < 2) { console.error('usage: placeholders.mjs <dossier> nom.svg "Texte" ...'); process.exit(2); }
const palette = ['#1f3a5f', '#2d5f7a', '#5d7a4a', '#8a4b2a', '#4a4e8a', '#7a5d2d'];
await fs.mkdir(path.join(dir, 'assets'), { recursive: true });
for (let i = 0; i + 1 < pairs.length; i += 2) {
  const [name, label] = [pairs[i], pairs[i + 1]];
  const c = palette[(i / 2) % palette.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="#111"/></linearGradient></defs>
<rect width="1200" height="800" fill="url(#g)"/>
<circle cx="950" cy="200" r="160" fill="#fff" opacity=".08"/><circle cx="250" cy="650" r="220" fill="#fff" opacity=".06"/>
<text x="600" y="420" font-family="Georgia, serif" font-size="56" fill="#fff" text-anchor="middle" opacity=".9">${label.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>
</svg>`;
  await fs.writeFile(path.join(dir, 'assets', name), svg);
  console.log('assets/' + name);
}
