// node:path (POSIX) réduit à ce que le compilateur utilise.
export const sep = '/';
export function normalize(p) {
  p = String(p).replaceAll('\\', '/');
  const abs = p.startsWith('/');
  const out = [];
  for (const seg of p.split('/')) { if (!seg || seg === '.') continue; if (seg === '..') { out.pop(); continue; } out.push(seg); }
  return (abs ? '/' : '') + out.join('/') || (abs ? '/' : '.');
}
export function join(...parts) { return normalize(parts.filter(Boolean).join('/')); }
export function resolve(...parts) { let r = ''; for (const p of parts) { const s = String(p).replaceAll('\\', '/'); r = s.startsWith('/') ? s : (r ? r + '/' + s : s); } if (!r.startsWith('/')) r = '/' + r; return normalize(r); }
export function dirname(p) { const n = normalize(p); const i = n.lastIndexOf('/'); if (i < 0) return '.'; if (i === 0) return '/'; return n.slice(0, i); }
export function basename(p, ext) { const n = normalize(p); let b = n.slice(n.lastIndexOf('/') + 1); if (ext && b.endsWith(ext)) b = b.slice(0, -ext.length); return b; }
export function extname(p) { const b = basename(p); const i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; }
export function relative(from, to) {
  const a = normalize(from).split('/').filter(Boolean), b = normalize(to).split('/').filter(Boolean);
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return [...a.slice(i).map(() => '..'), ...b.slice(i)].join('/');
}
export function isAbsolute(p) { return String(p).startsWith('/'); }
export default { sep, normalize, join, resolve, dirname, basename, extname, relative, isAbsolute };
