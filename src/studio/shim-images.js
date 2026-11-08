// Redimensionnement dans l'atelier navigateur : canvas hors écran et encodeur WebP natif. Sous Node (scripts/ci-studio.mjs) ou dans un
// navigateur sans encodeur WebP, aucune variante n'est produite : les images sont copiées telles quelles, dimensions connues.
const has = () => typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined';
let webpOk = null;
async function canEncodeWebp() {
  if (webpOk !== null) return webpOk;
  try { const c = new OffscreenCanvas(2, 2); c.getContext('2d'); const b = await c.convertToBlob({ type: 'image/webp' }); webpOk = b.type === 'image/webp'; } catch { webpOk = false; }
  return webpOk;
}
export async function resizeAvailable() { return has() && await canEncodeWebp() ? 'canvas' : null; }
export async function probe(buf) {
  if (!has()) return null;
  try { const bm = await createImageBitmap(new Blob([buf])); const r = { w: bm.width, h: bm.height }; bm.close(); return r; } catch { return null; }
}
export async function resizeImage(buf, width, quality = 80) {
  if (!has()) return null;
  let bm; try { bm = await createImageBitmap(new Blob([buf])); } catch { return null; }
  const w = Math.min(width, bm.width), h = Math.max(1, Math.round(bm.height * w / bm.width));
  const c = new OffscreenCanvas(w, h); c.getContext('2d').drawImage(bm, 0, 0, w, h); bm.close();
  const blob = await c.convertToBlob({ type: 'image/webp', quality: quality / 100 });
  if (blob.type !== 'image/webp') return null;
  return new Uint8Array(await blob.arrayBuffer());
}
