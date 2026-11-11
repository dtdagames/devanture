// Mesure des douze essais d'agents « site en YAML ou en documents » (mesure-document/) : ce qui se revérifie sur les sites
// qu'ils ont laissés (check, build, bancs, taille de la source), joint à ce qu'ils ont dépensé (mesure-document/usage.json,
// relevé tour par tour dans leurs journaux, et mesure-document/agents.json, rapporté par l'outil à la fin de chaque agent).
//
//   création : même brief client (cabinet d'avocats), site à écrire de zéro ; banc scripts/verify-php-site.mjs sur le site compilé ;
//   éditions : les quatre modifications de maintenance/MODIFICATIONS-garnier.md sur le même site de départ, écrit dans chaque
//              format ; banc scripts/verify-maintenance.mjs (28 contrôles).
//
// Un site qui passait à la fin de son essai et que le lecteur d'aujourd'hui refuse garde ses mesures d'alors (mesures.json), avec la
// raison du refus dans « depuis » : c'est le cas de creation/document/run3, dont une ligne de réglage mal nommée était lue comme du texte.
//
// Usage : node scripts/measure-site-document-agents.mjs [--sans-banc]     (PHP : PHP_BIN, sinon php)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from 'gpt-tokenizer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.join(ROOT, 'mesure-document');
const noBench = process.argv.includes('--sans-banc');
const usage = JSON.parse(fs.readFileSync(path.join(BASE, 'usage.json'), 'utf8')), agents = JSON.parse(fs.readFileSync(path.join(BASE, 'agents.json'), 'utf8'));
const node = (...args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
const last = out => { const l = String(out || '').trim().split('\n').filter(Boolean).pop() || ''; try { return JSON.parse(l); } catch { return null; } };

const before = fs.existsSync(path.join(BASE, 'mesures.json')) ? JSON.parse(fs.readFileSync(path.join(BASE, 'mesures.json'), 'utf8')).essais : [];
let port = 9200; const rows = [];
for (const task of ['creation', 'edition']) for (const format of ['yaml', 'document']) for (const n of [1, 2, 3]) {
  const key = `${task}/${format}/run${n}`, dir = path.join(BASE, task, format, `run${n}`);
  const files = [format === 'yaml' ? 'site.yaml' : 'site.md', ...fs.readdirSync(path.join(dir, 'pages')).filter(f => (format === 'yaml' ? f.endsWith('.page.yaml') : f.endsWith('.md'))).map(f => 'pages/' + f)];
  const text = files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const check = node('bin/sitec.js', 'check', dir), summary = last(check.stdout) || {};
  const was = before.find(r => r.essai === key);
  if (check.status !== 0 && was?.check_ok) {
    const first = String(check.stdout || '').split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).find(e => e && e.code);
    rows.push({ ...was, depuis: `refusé par le lecteur actuel : ${first ? `${first.file} ${first.path} — ${first.message}` : 'check échoue'}` });
    continue;
  }
  const build = node('bin/sitec.js', 'build', dir, '--draft');
  const row = { essai: key, check_ok: check.status === 0, build_ok: build.status === 0, pages: summary.pages ?? null, sections: summary.sections ?? null, source_tokens: encode(text).length, source_lignes: text.split('\n').filter(l => l.trim()).length, blocs_yaml: format === 'document' ? (text.match(/^```yaml/gm) || []).length : null };
  if (!noBench && build.status === 0) {
    const b = task === 'creation' ? node('scripts/verify-php-site.mjs', path.join(dir, 'dist'), String(port++)) : node('scripts/verify-maintenance.mjs', path.join(dir, 'dist'), String(port++), 'garnier');
    const r = last(b.stdout);
    if (task === 'creation') row.banc = r ? `${r.passed}/${r.total}` : 'illisible';
    else { const p = r ? ['M1', 'M2', 'M3', 'M4'].reduce((s, m) => s + (r[m]?.passed || 0), 0) : 0, t = r ? ['M1', 'M2', 'M3', 'M4'].reduce((s, m) => s + (r[m]?.total || 0), 0) : 0; row.banc = r ? `${p}/${t}` : 'illisible'; }
    row.banc_ok = !!row.banc && row.banc.split('/')[0] === row.banc.split('/')[1];
  }
  const u = usage[key] || {}, a = agents[key] || {};
  Object.assign(row, { tours: u.tours, tokens_produits: u.produits, tokens_traites: u.traites, contexte_final: a.contexte_final, appels_outils: a.appels_outils, duree_s: a.duree_s });
  rows.push(row);
}
const mean = xs => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
const cells = {};
for (const task of ['creation', 'edition']) for (const format of ['yaml', 'document']) {
  const r = rows.filter(x => x.essai.startsWith(`${task}/${format}/`));
  cells[`${task}/${format}`] = Object.fromEntries(['source_tokens', 'sections', 'tours', 'tokens_produits', 'tokens_traites', 'contexte_final', 'appels_outils', 'duree_s'].map(k => [k, { moyenne: mean(r.map(x => x[k])), essais: r.map(x => x[k]) }]));
  cells[`${task}/${format}`].reussis = `${r.filter(x => x.check_ok && x.build_ok && (noBench || x.banc_ok)).length}/3`;
}
const gap = (task, k) => { const y = cells[`${task}/yaml`][k].moyenne, d = cells[`${task}/document`][k].moyenne; return `${d > y ? '+' : ''}${Math.round((d / y - 1) * 100)} %`; };
const ecarts = Object.fromEntries(['creation', 'edition'].map(t => [t, Object.fromEntries(['source_tokens', 'tours', 'tokens_produits', 'tokens_traites', 'contexte_final', 'appels_outils', 'duree_s'].map(k => [k, gap(t, k)]))]));
fs.writeFileSync(path.join(BASE, 'mesures.json'), JSON.stringify({ essais: rows, cases: cells, ecarts_documents_contre_yaml: ecarts }, null, 1) + '\n');
for (const r of rows.filter(x => x.depuis)) console.log(`${r.essai} : mesures de l'essai gardées ; ${r.depuis}`);
for (const r of rows) console.log(`${r.essai.padEnd(24)} check ${r.check_ok ? 'ok ' : 'NON'} build ${r.build_ok ? 'ok ' : 'NON'} banc ${String(r.banc ?? '—').padEnd(6)} ${String(r.sections).padStart(2)} sections  source ${String(r.source_tokens).padStart(5)} tokens  tours ${String(r.tours).padStart(2)}  produits ${String(r.tokens_produits).padStart(6)}  traités ${String(r.tokens_traites).padStart(7)}  ${String(r.duree_s).padStart(6)} s`);
console.log('\nÉcarts des documents par rapport au YAML (moyennes de trois essais) :');
for (const [t, e] of Object.entries(ecarts)) console.log(`  ${t.padEnd(9)} ${Object.entries(e).map(([k, v]) => `${k} ${v}`).join(' ; ')}`);
