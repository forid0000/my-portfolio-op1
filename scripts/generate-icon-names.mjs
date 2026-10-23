// Regenerates the generated icon catalogs from the installed icon libraries:
//
//   lib/icons/names.ts         every react-icons glyph name (admin icon-picker search)
//   lib/icons/lucide-data.json every lucide glyph as plain SVG data
//
//   node scripts/generate-icon-names.mjs
//
// Run it after upgrading react-icons or lucide-react. lucide's data is baked into
// a static JSON file so the server never has to bundle or load lucide's ~1,500
// icon modules just to look an icon up by name.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));

// ── react-icons names ────────────────────────────────────────────────────────
// Same packs, same order as lib/icons/resolve.ts.
const PACKS = [
  'ai',
  'bi',
  'bs',
  'cg',
  'ci',
  'di',
  'fa',
  'fa6',
  'fc',
  'fi',
  'gi',
  'go',
  'gr',
  'hi',
  'hi2',
  'im',
  'io',
  'io5',
  'lia',
  'lu',
  'md',
  'pi',
  'ri',
  'rx',
  'si',
  'sl',
  'tb',
  'tfi',
  'ti',
  'vsc',
  'wi',
];

const names = new Set();
for (const pack of PACKS) {
  for (const key of Object.keys(require(`react-icons/${pack}`))) {
    if (/^[A-Z]/.test(key) && key !== 'GenIcon' && key !== 'IconContext') names.add(key);
  }
}

const namesFile = path.join(ROOT, 'lib/icons/names.ts');
const current = fs.readFileSync(namesFile, 'utf8');
const marker = 'export const ALL_REACT_ICON_NAMES: readonly string[] = ';
const head = current.slice(0, current.indexOf(marker) + marker.length);
fs.writeFileSync(namesFile, `${head}${JSON.stringify([...names])};\n`);
console.log(`react-icons: wrote ${names.size} names to lib/icons/names.ts`);

// ── lucide data ──────────────────────────────────────────────────────────────
const lucide = require('lucide-react');
const NON_ICON = new Set(['createLucideIcon', 'Icon', 'icons', 'default', 'dynamicIconImports']);

const clean = (attrs) => {
  const out = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (k !== 'key' && (typeof v === 'string' || typeof v === 'number')) out[k] = v;
  }
  return out;
};

// Group every exported name by the icon definition it points at (lucide exports
// "Foo", "FooIcon", "LucideFoo" and legacy renames as the same icon).
const namesByNode = new Map(); // iconNode array identity -> names[]
// Non-icon exports (providers, hooks) throw when called outside a render and React logs it
// first; the try/catch below skips them, so keep the console quiet for this loop.
const logError = console.error;
console.error = () => {};
for (const name of Object.keys(lucide)) {
  const value = lucide[name];
  if (!/^[A-Z]/.test(name) || NON_ICON.has(name)) continue;
  let element;
  try {
    element = typeof value === 'function' ? value({}) : value?.render?.({}, null);
  } catch {
    continue;
  }
  // lucide <= 1.4x passes `iconNode`; newer releases pass `icon: { node }`.
  const node = element?.props?.iconNode ?? element?.props?.icon?.node;
  if (!Array.isArray(node)) continue;
  if (!namesByNode.has(node)) namesByNode.set(node, []);
  namesByNode.get(node).push(name);
}
console.error = logError;

// Canonical name = the plain one ("Mail", not "MailIcon" / "LucideMail").
const rank = (n) => (n.startsWith('Lucide') ? 2 : n.endsWith('Icon') ? 1 : 0);
const icons = {};
const aliases = {};
for (const [node, names] of namesByNode) {
  names.sort((a, b) => rank(a) - rank(b) || a.length - b.length || a.localeCompare(b));
  const [canonical, ...rest] = names;
  icons[canonical] = node.map(([tag, attrs]) => [tag, clean(attrs)]);
  for (const alias of rest) aliases[alias] = canonical;
}

fs.writeFileSync(
  path.join(ROOT, 'lib/icons/lucide-data.json'),
  JSON.stringify({ icons, aliases }) + '\n'
);
const kb = (fs.statSync(path.join(ROOT, 'lib/icons/lucide-data.json')).size / 1024).toFixed(0);
console.log(
  `lucide: wrote ${Object.keys(icons).length} icons + ${Object.keys(aliases).length} aliases (${kb} KB) to lib/icons/lucide-data.json`
);
