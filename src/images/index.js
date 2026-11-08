// Pipeline d'images : dimensions lues dans les en-têtes (JS pur, sans dépendance), variantes WebP redimensionnées à la compilation
// et manifeste consommé par l'aide PHP img() (attributs width/height, srcset, chargement différé).
// Le redimensionnement est délégué à « #resize » : sharp sous Node (dépendance optionnelle), canvas dans l'atelier navigateur.
import fs from 'node:fs/promises';
import path from 'node:path';
import { resizeImage, resizeAvailable, probe } from '#resize';

export const RASTER = /\.(jpe?g|png|webp)$/i;
export const DEFAULTS = { widths: [480, 960, 1600], quality: 80 };

/** Largeur et hauteur d'une image PNG, GIF, WebP ou JPEG à partir de ses premiers octets ; null si inconnu. */
export function dimensions(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { w: dv.getUint32(16), h: dv.getUint32(20), type: 'png' };
  if (b.length > 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return { w: dv.getUint16(6, true), h: dv.getUint16(8, true), type: 'gif' };
  if (b.length > 30 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (chunk === 'VP8 ') return { w: dv.getUint16(26, true) & 0x3fff, h: dv.getUint16(28, true) & 0x3fff, type: 'webp' };
    if (chunk === 'VP8L') { const bits = dv.getUint32(21, true); return { w: (bits & 0x3fff) + 1, h: ((bits >>> 14) & 0x3fff) + 1, type: 'webp' }; }
    if (chunk === 'VP8X') return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)), type: 'webp' };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: dv.getUint16(i + 7), h: dv.getUint16(i + 5), type: 'jpeg' };
      i += 2 + dv.getUint16(i + 2);
    }
  }
  return null;
}

/** Largeurs à produire pour une source de largeur srcW : les largeurs demandées inférieures à la source, plus la plus grande utile (jamais d'agrandissement). */
export function planWidths(srcW, widths = DEFAULTS.widths) {
  const ws = [...new Set(widths.filter(w => w < srcW))].sort((a, b) => a - b);
  const max = Math.min(srcW, Math.max(...widths));
  if (!ws.includes(max)) ws.push(max);
  return ws;
}

/**
 * Copie assets/ dans la sortie et produit, pour chaque image matricielle (JPEG, PNG, WebP), des variantes WebP aux largeurs demandées.
 * Les SVG, GIF et autres fichiers sont copiés tels quels. Sans redimensionneur disponible, les dimensions sont tout de même connues
 * (attributs width/height), seules les variantes manquent.
 * Retourne { manifest: { 'chemin.jpg': { w, h, v: [[480, 'chemin.480.webp'], …] } }, report: { images, variants, resizer, skipped } }.
 */
export async function processAssets(srcDir, outDir, cfg = {}) {
  const widths = Array.isArray(cfg.widths) && cfg.widths.length ? cfg.widths : DEFAULTS.widths;
  const quality = cfg.quality ?? DEFAULTS.quality;
  const manifest = {}; const report = { images: 0, variants: 0, resizer: null, disabled: cfg.enabled === false, skipped: [] };
  let entries;
  try { entries = await fs.readdir(srcDir, { recursive: true }); } catch { return { manifest, report }; }
  const resizer = cfg.enabled === false ? null : await resizeAvailable();
  report.resizer = resizer;
  for (const raw of entries.map(String).sort()) {
    const rel = raw.replaceAll('\\', '/');
    const src = path.join(srcDir, rel);
    if ((await fs.stat(src)).isDirectory()) continue;
    const buf = await fs.readFile(src);
    await fs.mkdir(path.dirname(path.join(outDir, rel)), { recursive: true });
    await fs.writeFile(path.join(outDir, rel), buf);
    if (!RASTER.test(rel)) continue;
    // Dimensions après orientation EXIF quand le redimensionneur sait la lire ; sinon l'en-tête du fichier.
    const dim = (resizer ? await probe(buf) : null) || dimensions(buf);
    if (!dim) { report.skipped.push({ file: rel, reason: 'en-tête illisible' }); continue; }
    const entry = { w: dim.w, h: dim.h, v: [] };
    manifest[rel] = entry; report.images++;
    if (!resizer) continue;
    for (const w of planWidths(dim.w, widths)) {
      const name = rel.replace(/\.[^.]+$/, '') + '.' + w + '.webp';
      const data = await resizeImage(buf, w, quality);
      if (!data) break;
      await fs.writeFile(path.join(outDir, name), data);
      entry.v.push([w, name]); report.variants++;
    }
  }
  return { manifest, report };
}
