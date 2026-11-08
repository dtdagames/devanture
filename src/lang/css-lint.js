// CSS encadré des composants de projet et de paquet : la feuille d'un composant ne touche que ce composant et prend son design au thème.
//   erreurs : sélecteur global ou hors du composant (chaque sélecteur commence par une classe préfixée du nom du composant),
//             @import, @font-face, ressource externe (url http/https ou //), @keyframes non préfixé ;
//   avertissements : couleur ou police écrites en dur (au lieu de var(--color-…), var(--font-…)), !important.
// Sans dépendance : découpe par accolades, suffisante pour le CSS d'un composant.

const NAMED_COLORS = /\b(red|blue|green|yellow|orange|purple|pink|brown|gray|grey|white|black|navy|teal|maroon|olive|silver|lime|aqua|fuchsia|gold|crimson|coral|salmon|tomato|indigo|violet|beige|ivory|khaki|lavender|turquoise)\b/i;

/** Préfixes de classe acceptés pour un composant : nom court (encart), nom complet en tirets (vitrine-encart). */
export function cssPrefixes(name) {
  const short = name.includes('.') ? name.split('.').slice(1).join('-') : name;
  return [...new Set([short, name.replace(/\./g, '-')])];
}

export function lintComponentCss(css, name) {
  const errors = [], warnings = [];
  const prefixes = cssPrefixes(name);
  const src = css.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  const lineAt = i => src.slice(0, i).split('\n').length;
  const okClass = sel => {
    // Premier composé du sélecteur : il doit porter une classe préfixée du nom du composant.
    const first = sel.trim().split(/\s*[\s>+~]\s*/)[0] || '';
    const classes = [...first.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(m => m[1]);
    return classes.some(c => prefixes.some(p => c === p || c.startsWith(p + '-') || c.startsWith(p + '_')));
  };
  const checkDecls = (body, at) => {
    for (const m of body.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/gi)) {
      const [, prop, value] = m; const line = lineAt(at + m.index);
      if (prop.startsWith('--')) continue;
      const v = value.replace(/var\([^)]*\)/g, '');
      if (/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(v) || (/(color|background|border|outline|fill|stroke|shadow)/.test(prop) && NAMED_COLORS.test(v))) warnings.push({ line, message: `couleur écrite en dur (${prop}: ${value.trim()}) : utilisez un jeton du thème, var(--color-primary), var(--color-surface), var(--color-success)…` });
      if (/^font(-family)?$/.test(prop) && !/var\(--font-/.test(value) && /[a-z]/i.test(v.replace(/\b(inherit|initial|unset|bold|italic|normal|\d[\w.%]*|\/)\b/gi, '').trim()) && (prop === 'font-family' || /,|serif|sans|mono/.test(v))) warnings.push({ line, message: `police écrite en dur (${prop}: ${value.trim()}) : utilisez var(--font-body) ou var(--font-heading)` });
      if (/!important/.test(value)) warnings.push({ line, message: `!important (${prop}) : la feuille du composant ne devrait pas avoir à forcer le reste du site` });
      if (/url\(\s*['"]?\s*(https?:|\/\/)/i.test(value)) errors.push({ line, message: `ressource externe (${value.trim()}) : un composant ne charge rien hors du site ; mettez le fichier dans assets/` });
    }
  };
  // Parcours par blocs : prélude { corps }, @media/@supports récursifs.
  const walk = (start, end, inKeyframes = false) => {
    let i = start;
    while (i < end) {
      const open = src.indexOf('{', i);
      if (open < 0 || open >= end) { const rest = src.slice(i, end); const k = rest.search(/@import/i); if (k >= 0) errors.push({ line: lineAt(i + k), message: '@import interdit : un composant ne charge pas d\'autre feuille' }); break; }
      const prelude = src.slice(i, open).trim(); const at = i + src.slice(i, open).search(/\S|$/);
      let depth = 1, j = open + 1; while (j < end && depth) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; }
      const body = src.slice(open + 1, j - 1);
      for (const imp of prelude.matchAll(/@import[^;]*;/gi)) errors.push({ line: lineAt(at + imp.index), message: '@import interdit : un composant ne charge pas d\'autre feuille' });
      const p = prelude.replace(/@import[^;]*;/gi, '').trim();
      if (/^@(media|supports|container|layer)\b/i.test(p)) walk(open + 1, j - 1);
      else if (/^@(-webkit-)?keyframes\b/i.test(p)) { const kname = p.split(/\s+/)[1] || ''; if (!prefixes.some(x => kname === x || kname.startsWith(x + '-'))) errors.push({ line: lineAt(at), message: `@keyframes ${kname} : nom global, préfixez-le du nom du composant (${prefixes[0]}-${kname || 'anim'})` }); }
      else if (/^@font-face/i.test(p)) errors.push({ line: lineAt(at), message: '@font-face interdit : les polices viennent du thème (var(--font-body), var(--font-heading))' });
      else if (p.startsWith('@')) errors.push({ line: lineAt(at), message: `règle ${p.split(/\s/)[0]} non autorisée dans un composant` });
      else if (!inKeyframes) {
        for (const sel of p.split(',').map(s => s.trim()).filter(Boolean)) {
          if (/^(:root|html|body|\*)(\b|$|[\s:.[>])/.test(sel)) errors.push({ line: lineAt(at), message: `sélecteur global « ${sel} » : la feuille d'un composant ne touche que ce composant` });
          else if (!okClass(sel)) errors.push({ line: lineAt(at), message: `sélecteur « ${sel} » hors du composant : commencez par une classe ${prefixes.map(x => '.' + x + '…').join(' ou ')} posée dans le gabarit` });
        }
        checkDecls(body, open + 1);
      }
      i = j;
    }
  };
  walk(0, src.length);
  return { errors, warnings };
}
