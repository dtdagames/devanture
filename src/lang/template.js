// Gabarit neutre des composants : HTML augmenté d'un petit vocabulaire, compilé en PHP (et demain vers une autre cible).
//   {{ expr }}                 sortie échappée (sauf fonction d'affichage en tête : link, img, icon, paragraphs, markup, field)
//   {% if e %} {% elif e %} {% else %} {% endif %}
//   {% for x in e %} … {% endfor %}      loop.index, loop.index0, loop.first, loop.last, loop.count ; {% for k, v in e %}
//   {% set x = e %}
//   {% form %} … {% endform %}           formulaire déclaré par effects.form du manifeste (jeton, pot de miel, nom du formulaire)
//   {# commentaire #}
// Vocabulaire fermé : pas de PHP, pas de HTML injecté, échappement par défaut. La vérification statique refuse une variable ou une prop
// inconnue, une balise déséquilibrée, une expression invalide, avec le numéro de ligne.
import { parse, toPhp, roots, ExprError, SAFE_FUNCTIONS, FUNCTION_NAMES, FILTERS } from './expr.js';

const RUNTIME_VARS = { p: '$p', site: '$site', page: '$page', item: '$SL_ITEM', product: '$product', order: '$order', form: '$form', loop: '$loop', cart: '$cart', shop: '$SHOP' };
const META_PROPS = new Set(['id', 'keywords', 'variants', '_variant', '_fragment']);

export class TemplateError extends Error { constructor(message, line) { super(message); this.line = line; } }

/** Découpe le gabarit en jetons texte / sortie / balise / commentaire, avec leur ligne. */
export function lex(src) {
  const out = []; const re = /\{\{([\s\S]*?)\}\}|\{%([\s\S]*?)%\}|\{#[\s\S]*?#\}/g;
  let last = 0; let m;
  const lineAt = (i) => src.slice(0, i).split('\n').length;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ k: 'text', v: src.slice(last, m.index), line: lineAt(last) });
    if (m[1] !== undefined) out.push({ k: 'out', v: m[1].trim(), line: lineAt(m.index) });
    else if (m[2] !== undefined) out.push({ k: 'tag', v: m[2].trim(), line: lineAt(m.index) });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ k: 'text', v: src.slice(last), line: lineAt(last) });
  return out;
}

/**
 * Compile un gabarit en PHP.
 * opts : { name, props (schéma JSON des props du manifeste), effects, file }.
 * Renvoie { php, errors: [{ message, line }] } ; php est null si une erreur bloque.
 */
export function compileTemplate(src, { name = 'composant', props = null, effects = null } = {}) {
  const errors = [];
  const fail = (message, line) => { errors.push({ message, line }); };
  if (/<\?(php|=)?/i.test(src)) fail('PHP interdit dans un gabarit : seul le vocabulaire {{ }} / {% %} est accepté.', (src.split(/<\?/)[0].match(/\n/g) || []).length + 1);
  const toks = lex(src);
  const propNames = props?.properties ? new Set([...Object.keys(props.properties), ...META_PROPS]) : null;
  // Portée statique : nom → { php, schema } ; schema sert à vérifier les clés connues (props et éléments de liste).
  const stack = []; // balises ouvertes : { kind: 'if'|'for'|'form', line, depth, saved }
  let scope = { ...Object.fromEntries(Object.entries(RUNTIME_VARS).map(([k, v]) => [k, { php: v, schema: k === 'p' ? props : null }])) };
  if (!effects?.form) delete scope.form;
  let loopDepth = 0; let hasForm = false;
  const php = [];
  const vars = () => Object.fromEntries(Object.entries(scope).map(([k, v]) => [k, v.php]));

  const checkPaths = (ast, line) => {
    // Chaque chemin racine.clé… : la racine doit exister ; sous p (et sous une variable de boucle au schéma connu), la clé doit être déclarée.
    for (const r of roots(ast)) if (!(r in scope)) { fail(`variable inconnue « ${r} » (disponibles : ${Object.keys(scope).join(', ')}).`, line); return false; }
    const walk = (n) => {
      if (!n || typeof n !== 'object') return;
      if (n.t === 'get') {
        const chain = []; let b = n; while (b && b.t === 'get') { chain.unshift(b.key); b = b.e; }
        if (b && b.t === 'var' && scope[b.name]?.schema) {
          let sch = scope[b.name].schema;
          for (const key of chain) {
            const propsOf = sch?.properties || null;
            if (propsOf) {
              if (!(key in propsOf) && !(b.name === 'p' && (META_PROPS.has(key) || key.startsWith('_')))) { fail(`« ${[b.name, ...chain].join('.')} » : ${b.name === 'p' ? 'prop' : 'clé'} inconnue « ${key} » (déclarées : ${Object.keys(propsOf).join(', ')}).`, line); return; }
              sch = propsOf[key] ?? null;
            } else sch = null;
            if (!sch) break;
          }
        }
        return;
      }
      for (const v of Object.values(n)) { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object' && 't' in v) walk(v); }
    };
    walk(ast);
    return true;
  };
  const schemaOfExpr = (ast) => { // schéma des éléments quand on itère sur p.<liste> (items.properties)
    const chain = []; let b = ast; while (b && b.t === 'get') { chain.unshift(b.key); b = b.e; }
    if (!(b && b.t === 'var' && scope[b.name]?.schema)) return null;
    let sch = scope[b.name].schema; for (const key of chain) { sch = sch?.properties?.[key] ?? null; if (!sch) return null; }
    return sch?.type === 'array' ? (sch.items || null) : null;
  };
  const compileExpr = (srcExpr, line) => {
    let ast; try { ast = parse(srcExpr); } catch (e) { fail(`expression invalide « ${srcExpr} » : ${e.message}.`, line); return null; }
    if (!checkPaths(ast, line)) return null;
    try { return { ast, ...toPhp(ast, vars()) }; } catch (e) { fail(`« ${srcExpr} » : ${e.message}.`, line); return null; }
  };

  for (const t of toks) {
    if (t.k === 'text') { php.push(t.v); continue; }
    if (t.k === 'out') {
      const c = compileExpr(t.v, t.line); if (!c) continue;
      php.push(c.safe ? `<?= ${c.php} ?>` : `<?= e(sl_str(${c.php})) ?>`);
      continue;
    }
    // balise
    const m = /^([a-z]+)\b\s*([\s\S]*)$/.exec(t.v);
    if (!m) { fail(`balise invalide « {% ${t.v} %} ».`, t.line); continue; }
    const [, kw, rest] = m;
    switch (kw) {
      case 'if': { const c = compileExpr(rest, t.line); if (!c) break; stack.push({ kind: 'if', line: t.line }); php.push(`<?php if (sl_truthy(${c.php})): ?>`); break; }
      case 'elif': case 'elseif': { if (stack.at(-1)?.kind !== 'if') { fail('elif sans if.', t.line); break; } const c = compileExpr(rest, t.line); if (!c) break; php.push(`<?php elseif (sl_truthy(${c.php})): ?>`); break; }
      case 'else': { if (stack.at(-1)?.kind !== 'if') { fail('else sans if.', t.line); break; } php.push('<?php else: ?>'); break; }
      case 'endif': { if (stack.at(-1)?.kind !== 'if') { fail('endif sans if.', t.line); break; } stack.pop(); php.push('<?php endif; ?>'); break; }
      case 'for': {
        const fm = /^([a-z_][a-z0-9_]*)\s*(?:,\s*([a-z_][a-z0-9_]*))?\s+in\s+([\s\S]+)$/i.exec(rest);
        if (!fm) { fail('for s\'écrit {% for x in liste %} ou {% for clé, x in liste %}.', t.line); break; }
        const [, a, b, listSrc] = fm; const keyVar = b ? a : null; const valVar = b || a;
        for (const v of [keyVar, valVar]) if (v && (v in RUNTIME_VARS)) fail(`« ${v} » est un nom réservé.`, t.line);
        const c = compileExpr(listSrc, t.line); if (!c) break;
        loopDepth++; const d = loopDepth;
        const saved = { ...scope };
        scope[valVar] = { php: `$v_${valVar}`, schema: schemaOfExpr(c.ast) };
        if (keyVar) scope[keyVar] = { php: `$v_${keyVar}`, schema: null };
        scope.loop = { php: '$loop', schema: null };
        stack.push({ kind: 'for', line: t.line, saved, depth: d });
        php.push(`<?php $__l${d} = sl_list(${c.php}); $__n${d} = count($__l${d}); $__i${d} = 0; foreach ($__l${d} as ${keyVar ? `$v_${keyVar}` : `$__k${d}`} => $v_${valVar}): $loop = ['index' => $__i${d} + 1, 'index0' => $__i${d}, 'first' => $__i${d} === 0, 'last' => $__i${d} === $__n${d} - 1, 'count' => $__n${d}]; ?>`);
        break;
      }
      case 'endfor': { const top = stack.at(-1); if (top?.kind !== 'for') { fail('endfor sans for.', t.line); break; } stack.pop(); scope = top.saved; php.push(`<?php $__i${top.depth}++; endforeach; ?>`); break; }
      case 'set': {
        const sm = /^([a-z_][a-z0-9_]*)\s*=\s*([\s\S]+)$/i.exec(rest);
        if (!sm) { fail('set s\'écrit {% set nom = expression %}.', t.line); break; }
        if (sm[1] in RUNTIME_VARS) { fail(`« ${sm[1]} » est un nom réservé.`, t.line); break; }
        const c = compileExpr(sm[2], t.line); if (!c) break;
        scope[sm[1]] = { php: `$v_${sm[1]}`, schema: null };
        php.push(`<?php $v_${sm[1]} = ${c.php}; ?>`);
        break;
      }
      case 'form': {
        if (!effects?.form) { fail('{% form %} exige effects.form dans manifest.yaml (store, fields…).', t.line); break; }
        if (hasForm) { fail('Un seul {% form %} par composant.', t.line); break; }
        hasForm = true; stack.push({ kind: 'form', line: t.line });
        php.push(`<form class="card sl-form" method="post" action="" novalidate data-sl-form="${esc(name)}"><input type="hidden" name="_form" value="${esc(name)}"><input type="hidden" name="_csrf" value="<?= e(csrf_token()) ?>"><div class="hp"><label>Site web <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>`);
        break;
      }
      case 'endform': { if (stack.at(-1)?.kind !== 'form') { fail('endform sans form.', t.line); break; } stack.pop(); php.push('</form>'); break; }
      default: fail(`balise inconnue « ${kw} » (connues : if, elif, else, endif, for, endfor, set, form, endform).`, t.line);
    }
  }
  for (const open of stack) fail(`balise « ${open.kind} » ouverte ligne ${open.line} jamais fermée.`, open.line);
  if (effects?.form && !hasForm) fail('effects.form est déclaré mais le gabarit n\'a pas de {% form %} … {% endform %}.', 1);
  if (errors.length) return { php: null, errors };
  const pre = `<?php /* ${name} — compilé depuis template.html par sitec */ global $site, $page, $SL_ITEM, $product, $order, $SHOP; $cart = null;${effects?.form ? ` $form = sl_form_state('${esc(name)}');` : ''} ?>\n`;
  return { php: pre + php.join(''), errors: [] };
}
function esc(s) { return String(s).replace(/[^a-zA-Z0-9_.-]/g, ''); }

/** Noms utilisables dans un gabarit, pour la documentation et les messages. */
export const TEMPLATE_VOCABULARY = { variables: Object.keys(RUNTIME_VARS), functions: FUNCTION_NAMES, safe: [...SAFE_FUNCTIONS], filters: Object.keys(FILTERS), tags: ['if', 'elif', 'else', 'endif', 'for', 'endfor', 'set', 'form', 'endform'] };
