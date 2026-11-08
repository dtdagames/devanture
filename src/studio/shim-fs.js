// Système de fichiers en mémoire pour l'atelier navigateur : même interface que node:fs/promises, limitée à ce que le compilateur utilise.
import { normalize, join, dirname } from './shim-path.js';

const files = new Map(); // chemin absolu → Uint8Array
const dirs = new Set(['/']);
const enc = new TextEncoder(), dec = new TextDecoder();

function enoent(p, op = 'open') { const e = new Error(`ENOENT: no such file or directory, ${op} '${p}'`); e.code = 'ENOENT'; return e; }
function ensureDir(p) { let d = normalize(p); while (d && d !== '/') { dirs.add(d); d = dirname(d); } dirs.add('/'); }
function isDir(p) { return dirs.has(normalize(p)); }
function children(p) {
  const base = normalize(p) === '/' ? '/' : normalize(p) + '/';
  const out = new Map();
  for (const f of files.keys()) if (f.startsWith(base)) { const rest = f.slice(base.length); const name = rest.split('/')[0]; out.set(name, rest.includes('/') ? 'dir' : 'file'); }
  for (const d of dirs) if (d !== base.slice(0, -1) && d.startsWith(base)) { const rest = d.slice(base.length); if (rest) out.set(rest.split('/')[0], 'dir'); }
  return out;
}

export async function readFile(p, opt) {
  const n = normalize(p); const buf = files.get(n);
  if (buf === undefined) throw enoent(n);
  const encoding = typeof opt === 'string' ? opt : opt?.encoding;
  return encoding ? dec.decode(buf) : buf;
}
export async function writeFile(p, data) {
  const n = normalize(p); ensureDir(dirname(n));
  files.set(n, typeof data === 'string' ? enc.encode(data) : data instanceof Uint8Array ? data : enc.encode(String(data)));
}
export async function readdir(p, opt = {}) {
  const n = normalize(p);
  if (!isDir(n) && !children(n).size) throw enoent(n, 'scandir');
  if (opt.recursive) {
    const base = n === '/' ? '/' : n + '/'; const out = [];
    for (const f of files.keys()) if (f.startsWith(base)) out.push(f.slice(base.length));
    for (const d of dirs) if (d.startsWith(base) && d !== n) out.push(d.slice(base.length));
    return out.sort();
  }
  const list = [...children(n).entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (opt.withFileTypes) return list.map(([name, kind]) => ({ name, isDirectory: () => kind === 'dir', isFile: () => kind === 'file' }));
  return list.map(([name]) => name);
}
export async function mkdir(p) { ensureDir(p); }
export async function rm(p, opt = {}) {
  const n = normalize(p); const base = n + '/';
  for (const f of [...files.keys()]) if (f === n || f.startsWith(base)) files.delete(f);
  for (const d of [...dirs]) if (d === n || d.startsWith(base)) dirs.delete(d);
  if (!opt.force && !opt.recursive) { /* rien d'autre à faire */ }
}
export async function access(p) { const n = normalize(p); if (!files.has(n) && !isDir(n) && !children(n).size) throw enoent(n, 'access'); }
export async function copyFile(a, b) { const buf = files.get(normalize(a)); if (buf === undefined) throw enoent(a); await writeFile(b, buf); }
export async function cp(a, b, opt = {}) {
  const na = normalize(a), nb = normalize(b);
  if (files.has(na)) return writeFile(nb, files.get(na));
  if (!isDir(na) && !children(na).size) throw enoent(na, 'cp');
  const base = na + '/';
  for (const [f, buf] of [...files.entries()]) if (f.startsWith(base)) await writeFile(join(nb, f.slice(base.length)), buf);
  for (const d of [...dirs]) if (d.startsWith(base)) ensureDir(join(nb, d.slice(base.length)));
}
export async function stat(p) { const n = normalize(p); if (files.has(n)) return { isDirectory: () => false, isFile: () => true, size: files.get(n).length }; if (isDir(n)) return { isDirectory: () => true, isFile: () => false, size: 0 }; throw enoent(n, 'stat'); }

/** Accès direct pour l'atelier. */
export const vfs = {
  reset(prefix = '/') { const base = prefix === '/' ? '/' : normalize(prefix) + '/'; for (const f of [...files.keys()]) if (prefix === '/' || f.startsWith(base)) files.delete(f); for (const d of [...dirs]) if (prefix === '/' ? d !== '/' : d.startsWith(base) || d === normalize(prefix)) dirs.delete(d); },
  write(p, data) { return writeFile(p, data); },
  read(p) { const b = files.get(normalize(p)); return b === undefined ? undefined : dec.decode(b); },
  bytes(p) { return files.get(normalize(p)); },
  has(p) { return files.has(normalize(p)); },
  remove(p) { files.delete(normalize(p)); },
  list(prefix) { const base = normalize(prefix) === '/' ? '/' : normalize(prefix) + '/'; return [...files.keys()].filter(f => f.startsWith(base)).map(f => f.slice(base.length)).sort(); },
  mkdir(p) { ensureDir(p); },
  isText(p) { return !/\.(png|jpe?g|gif|webp|avif|ico|woff2?|pdf|mp4|sqlite)$/i.test(p); },
};
export default { readFile, writeFile, readdir, mkdir, rm, access, copyFile, cp, stat };
