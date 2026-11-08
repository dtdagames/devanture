// Empaquette le compilateur pour le navigateur (studio/sitec-browser.js) : composants et exemples embarqués, node:* remplacés par des shims.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEXT = /\.(yaml|yml|php|js|css|md|txt|json|svg|html)$/i;

async function snapshotDir(dir, { skip = [] } = {}) {
  const out = {};
  const walk = async (d, rel = '') => {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (skip.includes(e.name)) continue;
      if (e.isDirectory()) await walk(path.join(d, e.name), r);
      else { const buf = await fs.readFile(path.join(d, e.name)); out[r] = TEXT.test(e.name) ? { t: buf.toString('utf8') } : { b: buf.toString('base64') }; }
    }
  };
  await walk(dir);
  return out;
}

const components = await snapshotDir(path.join(ROOT, 'components'));
const examples = {};
for (const name of ['plomberie-martin', 'savonnerie']) examples[name] = await snapshotDir(path.join(ROOT, 'examples', name), { skip: ['dist', 'node_modules', '.env', 'keywords-proposals.json'] });
const snapshot = JSON.stringify({ components, examples });

const shims = { 'node:fs/promises': 'shim-fs.js', 'node:path': 'shim-path.js', 'node:crypto': 'shim-crypto.js', 'node:url': 'shim-url.js' };
const plugin = {
  name: 'devanture-browser',
  setup(b) {
    b.onResolve({ filter: /^virtual:snapshot$/ }, () => ({ path: 'snapshot', namespace: 'virtual' }));
    b.onLoad({ filter: /.*/, namespace: 'virtual' }, () => ({ contents: 'export default ' + snapshot + ';', loader: 'js' }));
    b.onResolve({ filter: /^#resize$/ }, () => ({ path: path.join(ROOT, 'src', 'studio', 'shim-images.js') }));
    b.onResolve({ filter: /^node:/ }, args => { const s = shims[args.path]; if (!s) throw new Error('module Node non pris en charge dans le navigateur : ' + args.path); return { path: path.join(ROOT, 'src', 'studio', s) }; });
  },
};
const result = await esbuild.build({
  entryPoints: [path.join(ROOT, 'src', 'studio', 'entry.js')],
  bundle: true, format: 'esm', platform: 'browser', target: 'es2020', minify: true, sourcemap: false,
  outfile: path.join(ROOT, 'studio', 'sitec-browser.js'),
  plugins: [plugin], logLevel: 'warning', metafile: true,
});
const size = (await fs.stat(path.join(ROOT, 'studio', 'sitec-browser.js'))).size;
console.log(`OK  studio/sitec-browser.js : ${(size / 1024).toFixed(0)} Ko (composants ${Object.keys(components).length} fichiers, exemples ${Object.keys(examples).join(', ')})`);
