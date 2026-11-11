// Atelier Devanture : le compilateur tourne ici, dans le navigateur, sur un système de fichiers en mémoire.
import * as S from './sitec-browser.js';

const $ = (id) => document.getElementById(id);
const ROOT = '/project', OUT = '/out';
const enc = new TextEncoder(), dec = new TextDecoder();
const state = { name: '', current: null, dirty: new Set(), dirHandle: null, handles: new Map(), built: false, lastCheck: null };

// ---------- interface ----------
function setStatus(text, kind = '') { const el = $('status'); el.textContent = text; el.className = 'status ' + kind; }
function showTab(name) { document.querySelectorAll('#panel nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === name)); document.querySelectorAll('#panel section').forEach(s => s.classList.toggle('on', s.id === 'tab-' + name)); }
document.querySelectorAll('#panel nav button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function renderFiles() {
  const ul = $('files'); ul.innerHTML = '';
  for (const f of S.vfs.list(ROOT)) {
    const li = document.createElement('li');
    const text = S.vfs.isText(f);
    li.className = (f === state.current ? 'on ' : '') + (state.dirty.has(f) ? 'dirty ' : '') + (text ? '' : 'bin');
    li.innerHTML = `<a href="#" data-f="${esc(f)}" title="${esc(f)}">${esc(f)}</a><button class="del" title="Supprimer" data-del="${esc(f)}">×</button>`;
    ul.appendChild(li);
  }
}
function openFile(f) {
  if (!S.vfs.isText(f)) { setStatus('fichier binaire : ' + f); return; }
  state.current = f; $('currentFile').textContent = f; $('text').value = S.vfs.read(ROOT + '/' + f) ?? '';
  $('editorInfo').textContent = ''; renderFiles();
}
$('files').addEventListener('click', (ev) => {
  const a = ev.target.closest('a[data-f]'); if (a) { ev.preventDefault(); openFile(a.dataset.f); return; }
  const d = ev.target.closest('button[data-del]'); if (d && confirm('Supprimer ' + d.dataset.del + ' ?')) { S.vfs.remove(ROOT + '/' + d.dataset.del); state.dirty.delete(d.dataset.del); if (state.current === d.dataset.del) { state.current = null; $('text').value = ''; $('currentFile').textContent = 'aucun fichier'; } renderFiles(); persist(); }
});
$('text').addEventListener('input', () => { if (!state.current) return; S.vfs.write(ROOT + '/' + state.current, $('text').value); state.dirty.add(state.current); state.built = false; $('download').disabled = true; $('writeDist').disabled = true; renderFiles(); persist(); });
$('text').addEventListener('keydown', (ev) => { if (ev.key === 'Tab') { ev.preventDefault(); const t = ev.target, s = t.selectionStart; t.setRangeText('  ', s, t.selectionEnd, 'end'); t.dispatchEvent(new Event('input')); } if ((ev.ctrlKey || ev.metaKey) && ev.key === 's') { ev.preventDefault(); if (state.dirHandle) saveToDir(); else runCheck(); } });
$('addFile').addEventListener('click', () => { const f = prompt(S.vfs.has(ROOT + '/site.md') ? 'Chemin du fichier (ex. pages/services.md)' : 'Chemin du fichier (ex. pages/services.page.yaml)'); if (!f) return; const p = f.replace(/^\/+/, ''); if (!S.vfs.has(ROOT + '/' + p)) S.vfs.write(ROOT + '/' + p, p.endsWith('.page.yaml') ? `page: ${p.replace(/^pages\//, '').replace(/\.page\.yaml$/, '')}\nroute: /${p.replace(/^pages\//, '').replace(/\.page\.yaml$/, '')}\nseo: { title: Titre, description: Description de la page }\nsections:\n  - richtext: { title: Titre, text: Texte à compléter. }\n` : /^pages\/[^/]+\.md$/.test(p) ? `# Titre\n\nDescription de la page\n\nAdresse : /${p.replace(/^pages\//, '').replace(/\.md$/, '')}\n\n## Texte : Titre\nTexte à compléter.\n` : ''); state.dirty.add(p); renderFiles(); openFile(p); persist(); });

// ---------- projets : exemples, dossier local, mémoire du navigateur ----------
for (const ex of S.examples()) { const o = document.createElement('option'); o.value = ex; o.textContent = ex; $('example').appendChild(o); }
$('example').addEventListener('change', async () => { const ex = $('example').value; if (!ex) return; if (state.dirty.size && !confirm('Remplacer le projet en cours par l\'exemple ' + ex + ' ?')) { $('example').value = ''; return; } await S.loadExample(ex, ROOT); setProject(ex, null); $('example').value = ''; });
function setProject(name, dirHandle) {
  state.name = name; state.dirHandle = dirHandle; state.dirty.clear(); state.current = null; state.built = false; state.handles.clear();
  $('projectName').textContent = name + (dirHandle ? ' (dossier local)' : ''); $('saveDir').hidden = !dirHandle; $('writeDist').hidden = !dirHandle; $('download').disabled = true; $('writeDist').disabled = true;
  renderFiles(); const first = S.vfs.has(ROOT + '/site.yaml') ? 'site.yaml' : S.vfs.has(ROOT + '/site.md') ? 'site.md' : S.vfs.list(ROOT).find(f => S.vfs.isText(f)); if (first) openFile(first);
  $('tab-issues').innerHTML = '<p class="muted">Projet chargé. Cliquez sur « Vérifier ».</p>'; $('nIssues').textContent = '0'; $('nIssues').className = 'n'; setStatus('prêt'); persist();
}
const SKIP = new Set(['dist', 'node_modules', '.git', '.env']);
async function readDir(handle, prefix = '') {
  for await (const [name, h] of handle.entries()) {
    if (SKIP.has(name)) continue;
    const p = prefix + name;
    if (h.kind === 'directory') await readDir(h, p + '/');
    else { const file = await h.getFile(); const buf = new Uint8Array(await file.arrayBuffer()); await S.vfs.write(ROOT + '/' + p, S.vfs.isText(p) ? dec.decode(buf) : buf); state.handles.set(p, h); }
  }
}
$('openDir').addEventListener('click', async () => {
  if (!window.showDirectoryPicker) { alert('Ce navigateur ne permet pas d\'ouvrir un dossier (API File System Access absente). Chargez un exemple ou utilisez Chrome / Edge.'); return; }
  try { const h = await window.showDirectoryPicker({ mode: 'readwrite' }); S.vfs.reset(ROOT); await readDir(h); setProject(h.name, h); } catch (e) { if (e.name !== 'AbortError') alert('Ouverture impossible : ' + e.message); }
});
async function getFileHandle(root, p, create = true) { const parts = p.split('/'); let dir = root; for (const d of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(d, { create }); return dir.getFileHandle(parts.at(-1), { create }); }
async function saveToDir() {
  if (!state.dirHandle) return; let n = 0;
  for (const f of [...state.dirty]) { const h = state.handles.get(f) || await getFileHandle(state.dirHandle, f); const w = await h.createWritable(); await w.write(S.vfs.read(ROOT + '/' + f)); await w.close(); state.handles.set(f, h); state.dirty.delete(f); n++; }
  renderFiles(); setStatus(n + ' fichier(s) enregistré(s)', 'ok');
}
$('saveDir').addEventListener('click', saveToDir);
$('writeDist').addEventListener('click', async () => {
  if (!state.dirHandle || !state.built) return;
  const dist = await state.dirHandle.getDirectoryHandle('dist', { create: true }); let n = 0;
  for (const f of S.vfs.list(OUT)) { const h = await getFileHandle(dist, f); const w = await h.createWritable(); await w.write(S.vfs.bytes(OUT + '/' + f)); await w.close(); n++; }
  setStatus('dist/ écrit : ' + n + ' fichiers', 'ok');
});
function persist() { try { if (state.dirHandle) return; const files = {}; for (const f of S.vfs.list(ROOT)) if (S.vfs.isText(f)) files[f] = S.vfs.read(ROOT + '/' + f); localStorage.setItem('sl-studio', JSON.stringify({ name: state.name, files, current: state.current })); } catch { /* quota ou navigation privée */ } }
async function restore() {
  try { const saved = JSON.parse(localStorage.getItem('sl-studio') || 'null'); if (saved?.files && Object.keys(saved.files).length) { S.vfs.reset(ROOT); for (const [f, t] of Object.entries(saved.files)) await S.vfs.write(ROOT + '/' + f, t); setProject(saved.name || 'projet', null); if (saved.current) openFile(saved.current); return true; } } catch { /* ignoré */ }
  return false;
}

// ---------- vérifier, compiler ----------
function issueHtml(e, cls = '') { return `<div class="issue ${cls}" data-file="${esc(e.file)}"><b>${esc(e.code)}</b> <span class="where">${esc(e.file)}${e.path ? ' · ' + esc(e.path) : ''}</span><div>${esc(e.message)}</div>${e.hint ? `<div class="hint">→ ${esc(e.hint)}</div>` : ''}${e.fix ? `<div class="hint mono">${esc(typeof e.fix === 'string' ? e.fix : JSON.stringify(e.fix))}</div>` : ''}</div>`; }
$('tab-issues').addEventListener('click', async (ev) => {
  // Accepter la lecture : même geste que « sitec lire --accepter » ; les fichiers de lecture écrits partent avec le projet.
  if (ev.target.closest('#acceptReading')) { const done = await S.acceptReading(ROOT); for (const f of done) state.dirty.add(f); state.built = false; renderFiles(); persist(); await runCheck(); if (done.length) setStatus('lecture acceptée : ' + done.length + ' document(s)', 'ok'); return; }
  const o = ev.target.closest('a[data-open]'); if (o) { ev.preventDefault(); openFile(o.dataset.open); return; }
  const d = ev.target.closest('.issue[data-file]'); if (d && d.dataset.file) openFile(d.dataset.file);
});
// Un document modifié doit être relu avant de compiler : on montre ce que le compilateur en comprend maintenant, et un bouton l'accepte.
async function readingHtml() {
  const docs = (await S.reading(ROOT)).filter(d => d.status === 'à accepter'); if (!docs.length) return '';
  const body = d => (d.absent ? d.yaml.split('\n').filter(l => l && !l.startsWith('#')) : d.changes).map(l => `<span class="${l.startsWith('- ') && !d.absent ? 'del' : l.startsWith('+ ') && !d.absent ? 'add' : ''}">${esc(l)}</span>`).join('\n');
  return `<div class="reading"><p><b>Lecture à accepter</b> : ${docs.length} document${docs.length > 1 ? 's ont' : ' a'} changé depuis la dernière lecture acceptée. Voici ce que le compilateur en comprend maintenant ; si c'est bien ce que vous voulez dire, acceptez.</p>${docs.map(d => `<details open><summary><a href="#" data-open="${esc(d.file)}">${esc(d.file)}</a> — ${d.absent ? 'nouveau document, ce qu\'il vaut' : 'ce qui change'}</summary><pre>${body(d)}</pre></details>`).join('')}<button id="acceptReading" class="primary">Accepter cette lecture</button></div>`;
}
async function runCheck() {
  setStatus('vérification…');
  const r = await S.check(ROOT); state.lastCheck = r;
  const toAccept = r.errors.some(e => e.code === 'E_READING') ? await readingHtml() : '';
  const shown = toAccept ? r.errors.filter(e => e.code !== 'E_READING') : r.errors;
  const all = [...shown.map(e => issueHtml(e)), ...r.placeholders.map(e => issueHtml({ ...e, code: 'W_PLACEHOLDER' }, 'warn')), ...r.warnings.map(e => issueHtml(e, 'warn'))];
  const n = r.errors.length + r.placeholders.length + r.warnings.length;
  $('nIssues').textContent = String(n); $('nIssues').className = 'n' + (r.errors.length ? ' err' : '');
  $('tab-issues').innerHTML = (r.ok ? `<p class="ok">Projet valide : ${r.pages} page(s), ${r.sections} section(s).${r.placeholders.length ? ' Des textes sont à compléter : la compilation se fera en brouillon.' : ''}</p>` : shown.length ? `<p>${shown.length} erreur(s) bloquante(s).</p>` : '') + toAccept + all.join('');
  setStatus(r.ok ? 'valide' : shown.length ? shown.length + ' erreur(s)' : 'lecture à accepter', r.ok ? 'ok' : 'err'); showTab('issues');
  return r;
}
$('check').addEventListener('click', runCheck);
async function runBuild() {
  const c = await runCheck(); if (!c.ok) return null;
  setStatus('compilation…');
  const b = await S.build(ROOT, OUT, { draft: true });
  if (!b.ok) { $('tab-issues').innerHTML = b.errors.map(e => issueHtml(e)).join(''); setStatus('compilation refusée', 'err'); return null; }
  state.built = true; $('download').disabled = false; $('writeDist').disabled = !state.dirHandle; $('nFiles').textContent = String(b.files.length);
  const total = b.files.reduce((n, f) => n + f.size, 0);
  const pages = c.project.pages.filter(p => !p.data.route.includes('[id]'));
  $('tab-output').innerHTML = `<div class="row"><span>${b.report.pages} page(s), ${b.report.components} composant(s), ${b.files.length} fichiers, ${(total / 1024).toFixed(0)} Ko${b.report.staticRoutes?.length ? `, ${b.report.staticRoutes.length} page(s) servie(s) en statique` : ''}.</span>${c.placeholders.length ? '<span class="muted">Compilé en brouillon : des textes restent à compléter.</span>' : ''}</div>
    <div class="row"><label for="previewPage">Aperçu (version texte)</label><select id="previewPage">${pages.map(p => `<option value="${esc(p.id)}">${esc(p.data.route)} · ${esc(p.data.seo?.title || p.id)}</option>`).join('')}</select><span class="muted">Le rendu PHP complet demande un serveur ; la version texte est la même que /lisible sur le site.</span></div>
    <iframe class="preview" id="preview" title="Aperçu"></iframe>
    <details style="margin-top:10px"><summary>Fichiers produits</summary><div class="files" style="margin-top:8px">${b.files.map(f => `<div>${esc(f.path)}<span>${f.size > 1024 ? (f.size / 1024).toFixed(1) + ' Ko' : f.size + ' o'}</span></div>`).join('')}</div></details>`;
  const preview = () => { const id = $('previewPage').value; let html = S.vfs.read(OUT + '/lisible/' + id + '.html') || ''; const css = S.vfs.read(OUT + '/assets/site.css') || ''; html = html.replace(/<link rel="stylesheet" href="\/assets\/site\.css[^>]*>/, '<style>' + css.replace(/<\/style/g, '') + '</style>').replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, ''); $('preview').srcdoc = html; };
  $('previewPage').addEventListener('change', preview); preview();
  setStatus('compilé', 'ok'); showTab('output');
  return b;
}
$('build').addEventListener('click', runBuild);

// ---------- zip (sans compression) ----------
const CRC = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zip(entries) {
  const parts = [], central = []; let offset = 0;
  const dt = new Date(); const time = (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1), date = ((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate();
  for (const [name, data] of entries) {
    const n = enc.encode(name), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true); h.setUint16(8, 0, true); h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, n.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), n, data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true); c.setUint16(10, 0, true); c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, n.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), n); offset += 30 + n.length + data.length;
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
$('download').addEventListener('click', () => { const entries = S.vfs.list(OUT).map(f => [f, S.vfs.bytes(OUT + '/' + f)]); const url = URL.createObjectURL(zip(entries)); const a = document.createElement('a'); a.href = url; a.download = (state.name || 'site') + '-dist.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); });

// ---------- déploiement signé (même protocole que « sitec deploy ») ----------
const hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
async function gzip(bytes) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()); }
async function deploy({ to, secret, log, batchBytes = 3 * 1024 * 1024 }) {
  const manifest = JSON.parse(S.vfs.read(OUT + '/manifest.sha256.json'));
  const release = 'r-' + new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14) + '-' + hex(crypto.getRandomValues(new Uint8Array(2)));
  const url = to.replace(/\/+$/, '').replace(/\/_deploy$/, '') + '/_deploy';
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const send = async (payload) => {
    const body = await gzip(enc.encode(JSON.stringify(payload)));
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = hex(await crypto.subtle.sign('HMAC', key, enc.encode(ts + '\n' + hex(await crypto.subtle.digest('SHA-256', body)))));
    const res = await fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/octet-stream', 'X-SL-Timestamp': ts, 'X-SL-Signature': sig } });
    const text = await res.text(); let json; try { json = JSON.parse(text); } catch { json = { error: text.slice(0, 200) }; }
    if (!res.ok || json.error) throw new Error(`${res.status} ${json.error || text.slice(0, 200)}`);
    return json;
  };
  const files = [...Object.keys(manifest), 'manifest.sha256.json'];
  let batch = {}, size = 0, batches = 0;
  for (const rel of files) { const bytes = S.vfs.bytes(OUT + '/' + rel); batch[rel] = b64(bytes); size += bytes.length; if (size >= batchBytes) { await send({ release, files: batch }); batches++; log(`lot ${batches} envoyé (${Object.keys(batch).length} fichiers)`); batch = {}; size = 0; } }
  if (Object.keys(batch).length) { await send({ release, files: batch }); batches++; log(`lot ${batches} envoyé (${Object.keys(batch).length} fichiers)`); }
  const r = await send({ release, commit: true, manifest });
  return { release, files: files.length, batches, removed: r.removed || [] };
}
try { $('deployUrl').value = localStorage.getItem('sl-studio-url') || ''; $('deploySecret').value = sessionStorage.getItem('sl-studio-secret') || ''; } catch { /* ignoré */ }
$('deploy').addEventListener('click', async () => {
  const to = $('deployUrl').value.trim(), secret = $('deploySecret').value;
  if (!to || !secret) { alert('Indiquez l\'adresse du site et le secret de déploiement.'); return; }
  try { localStorage.setItem('sl-studio-url', to); sessionStorage.setItem('sl-studio-secret', secret); } catch { /* ignoré */ }
  const logEl = $('deployLog'); logEl.hidden = false; logEl.textContent = ''; const log = (m) => { logEl.textContent += m + '\n'; };
  $('deploy').disabled = true;
  try {
    if (state.lastCheck?.placeholders?.length) throw new Error('des textes sont à compléter : on ne déploie pas un brouillon');
    const b = await runBuild(); if (!b) throw new Error('compilation refusée (voir Problèmes)');
    if (b.placeholders.length) throw new Error('des textes sont à compléter : on ne déploie pas un brouillon');
    log('compilé : ' + b.files.length + ' fichiers'); showTab('deploy');
    const r = await deploy({ to, secret, log });
    log(`OK  version ${r.release} : ${r.files} fichiers en ${r.batches} envoi(s)${r.removed.length ? ', supprimés : ' + r.removed.join(', ') : ''}`);
    setStatus('déployé', 'ok');
  } catch (e) { log('Échec : ' + e.message); setStatus('déploiement refusé', 'err'); }
  $('deploy').disabled = false;
});

// ---------- composants ----------
async function renderComponents() {
  const list = await S.catalogList(); const ul = $('compList'); ul.innerHTML = list.map(c => `<li><a href="#" data-c="${esc(c.name)}" title="${esc(c.description)}">${esc(c.name)}</a></li>`).join('');
  ul.addEventListener('click', async (ev) => { const a = ev.target.closest('a[data-c]'); if (!a) return; ev.preventDefault(); ul.querySelectorAll('li').forEach(li => li.classList.toggle('on', li.contains(a)));
    const d = await S.explain(a.dataset.c);
    $('compDetail').className = ''; $('compDetail').innerHTML = `<h3 style="margin:0 0 4px">${esc(d.name)}</h3><p class="muted" style="margin:0 0 8px">${esc(d.description)}</p><table><tr><th>Prop</th><th>Type</th><th>Description</th></tr>${d.props.map(p => `<tr><td><code>${esc(p.name)}${p.required ? '*' : ''}</code></td><td>${esc(p.type)}${p.enum ? ' : ' + p.enum.map(esc).join(', ') : ''}${p.items ? ' de : ' + p.items.map(esc).join(', ') : ''}</td><td>${esc(p.description)}</td></tr>`).join('')}</table>${d.example ? `<p style="margin:8px 0 4px"><b>Exemple</b></p><pre style="background:var(--code);padding:8px;border-radius:6px;overflow:auto">${esc(typeof d.example === 'string' ? d.example : JSON.stringify(d.example, null, 2))}</pre>` : ''}`; });
}

// ---------- démarrage ----------
// Les fichiers de l'atelier lui-même sont copiés dans le système de fichiers en mémoire : un site compilé ici avec site.studio.enabled les embarque.
async function selfSnapshot() {
  for (const f of ['index.html', 'app.js', 'sitec-browser.js']) { try { const r = await fetch('./' + f); if (r.ok) await S.vfs.write('/sitec/studio/' + f, await r.text()); } catch { /* hors ligne */ } }
}
// Mode site : servi depuis /_studio/ par le site compilé, qui embarque sa propre source (project.json). Le déploiement vise alors le site lui-même.
async function loadSiteProject() {
  try {
    const r = await fetch('./project.json', { cache: 'no-store' }); if (!r.ok) return false;
    const data = await r.json(); if (!data?.files) return false;
    let saved = null; try { saved = JSON.parse(localStorage.getItem('sl-studio') || 'null'); } catch { /* ignoré */ }
    const resume = saved?.files && saved.name === data.name && Object.keys(saved.files).some(f => saved.files[f] !== data.files[f]?.t) && confirm('Un brouillon non déployé existe dans ce navigateur. Le reprendre ? (Annuler = repartir de la version en ligne)');
    S.vfs.reset(ROOT);
    for (const [f, v] of Object.entries(data.files)) await S.vfs.write(ROOT + '/' + f, 't' in v ? v.t : Uint8Array.from(atob(v.b), c => c.charCodeAt(0)));
    if (resume) for (const [f, t] of Object.entries(saved.files)) await S.vfs.write(ROOT + '/' + f, t);
    setProject(data.name, null); $('projectName').textContent = data.name + ' (version en ligne)'; $('deployUrl').value = location.origin; $('deployUrl').readOnly = true;
    $('example').hidden = true; $('openDir').hidden = true;
    if (resume) for (const f of Object.keys(saved.files)) if (saved.files[f] !== data.files[f]?.t) state.dirty.add(f);
    renderFiles();
    return true;
  } catch { return false; }
}
(async () => {
  setStatus('chargement…');
  await S.init(); await renderComponents(); await selfSnapshot();
  if (await loadSiteProject()) return;
  if (!(await restore())) { await S.loadExample('plomberie-martin', ROOT); setProject('plomberie-martin', null); }
})();
