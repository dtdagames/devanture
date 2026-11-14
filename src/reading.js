// Lecture figée des documents d'un site : pour chacun, ce qui est à jour, ce qui reste à accepter, ce qui est refusé.
// Sert à « sitec lire » et à l'atelier navigateur, qui acceptent une lecture de la même façon.
import fs from 'node:fs/promises';
import path from 'node:path';
import { readDocument, readingDiff } from './lang/document.js';

/** Lignes retirées (-) et ajoutées (+) entre deux lectures YAML, dans l'ordre du document. */
export function lineDiff(before, after) {
  const clean = s => String(s).replace(/\r\n/g, '\n').split('\n').map(l => l.trimEnd()).filter(l => l && !l.startsWith('#'));
  const a = clean(before), b = clean(after), n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { i++; j++; }
    else if (i < n && (j >= m || L[i + 1][j] >= L[i][j + 1])) out.push('- ' + a[i++].trim());
    else out.push('+ ' + b[j++].trim());
  }
  return out;
}

/**
 * État de la lecture de chaque document d'un projet chargé : site.md, pages/<id>.md, data/<nom>.md, segments.md (lecture figée
 * dans lecture/) et components/<nom>/document.md (lecture.yaml). Renvoie une liste de
 * { file, status: 'à jour' | 'à accepter' | 'erreurs', absent, changes, errors, frozenFile, yaml }.
 */
export function readings(project, root) {
  const rel = f => path.relative(root, f).replaceAll('\\', '/');
  const state = (errors, frozen, yaml) => {
    const diff = errors.length ? null : frozen === undefined ? { absent: true } : readingDiff(frozen, yaml);
    return { status: errors.length ? 'erreurs' : diff ? 'à accepter' : 'à jour', absent: !!diff?.absent, changes: diff && !diff.absent ? lineDiff(frozen, yaml) : [] };
  };
  const out = [];
  for (const doc of [project.documents?.site, ...(project.documents?.pages || []), ...(project.documents?.data || [])].filter(Boolean))
    out.push({ file: rel(doc.file), ...state(doc.errors, doc.frozen, doc.yaml), errors: doc.errors, frozenFile: doc.frozenFile, yaml: doc.yaml, where: doc.where || {} });
  for (const src of [...(project.componentSources || []), ...(project.packages || []).flatMap(p => p.componentSources || [])].filter(x => x.documentText !== undefined)) {
    const r = readDocument(src.documentText, { name: src.name });
    out.push({ file: rel(path.join(src.dir, 'document.md')), ...state(r.errors, src.lectureText, r.yaml), errors: r.errors, frozenFile: path.join(src.dir, 'lecture.yaml'), yaml: r.yaml });
  }
  return out;
}

/** Fige la lecture de chaque document « à accepter ». Renvoie les fichiers de lecture écrits, relatifs à la racine. */
export async function acceptReadings(project, root) {
  const done = [];
  for (const r of readings(project, root)) {
    if (r.status !== 'à accepter') continue;
    await fs.mkdir(path.dirname(r.frozenFile), { recursive: true });
    await fs.writeFile(r.frozenFile, r.yaml);
    done.push(path.relative(root, r.frozenFile).replaceAll('\\', '/'));
  }
  return done;
}
