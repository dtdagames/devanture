// Redimensionnement sous Node : sharp, dépendance optionnelle. Sans sharp, aucune variante n'est produite et les images sont copiées telles quelles.
let mod; let tried = false;
async function load() { if (!tried) { tried = true; try { mod = (await import('sharp')).default; } catch { mod = null; } } return mod; }

/** Nom du redimensionneur disponible ('sharp') ou null. */
export async function resizeAvailable() { return (await load()) ? 'sharp' : null; }

/** Dimensions après application de l'orientation EXIF (photos de téléphone), ou null. */
export async function probe(buf) {
  const sharp = await load(); if (!sharp) return null;
  try { const m = await sharp(buf).metadata(); const swap = (m.orientation || 1) >= 5; return { w: swap ? m.height : m.width, h: swap ? m.width : m.height }; } catch { return null; }
}

/** Variante WebP de la largeur demandée (jamais agrandie), orientation EXIF appliquée. */
export async function resizeImage(buf, width, quality = 80) {
  const sharp = await load(); if (!sharp) return null;
  try { return new Uint8Array(await sharp(buf).rotate().resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer()); } catch { return null; }
}
