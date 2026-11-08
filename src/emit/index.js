// Point d'entrée des émetteurs. Le langage ne dépend d'aucune cible ; chaque cible fournit emit(project, catalog, out)
// et doit satisfaire le contrat de docs/CIBLES.md (routes, formulaires, personnalisation, boutique, exploitation),
// que les bancs scripts/verify-*.mjs vérifient par HTTP, quelle que soit la cible.
export const TARGETS = {
  php: { description: 'PHP 8.1+ sans framework ni extension optionnelle, JS et CSS vanille : hébergement mutualisé', load: () => import('./php/index.js') },
};

export async function emit(project, catalog, out, { target = 'php' } = {}) {
  const t = TARGETS[target];
  if (!t) throw new Error(`Cible inconnue : ${target}. Cibles disponibles : ${Object.keys(TARGETS).join(', ')}`);
  const mod = await t.load();
  return mod.emit(project, catalog, out);
}
