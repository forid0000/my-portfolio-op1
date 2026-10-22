// Regenerates lib/icons/names.ts (the react-icons name catalog used by the admin
// icon picker) from the installed react-icons packages.
//
//   node scripts/generate-icon-names.mjs

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));

// Same packs, same order as lib/icons/resolve.ts.
const PACKS = [
  'ai', 'bi', 'bs', 'cg', 'ci', 'di', 'fa', 'fa6', 'fc', 'fi', 'gi', 'go', 'gr', 'hi', 'hi2',
  'im', 'io', 'io5', 'lia', 'lu', 'md', 'pi', 'ri', 'rx', 'si', 'sl', 'tb', 'tfi', 'ti', 'vsc', 'wi',
];

const names = new Set();
for (const pack of PACKS) {
  for (const key of Object.keys(require(`react-icons/${pack}`))) {
    if (/^[A-Z]/.test(key) && key !== 'GenIcon' && key !== 'IconContext') names.add(key);
  }
}

const file = path.join(ROOT, 'lib/icons/names.ts');
const current = fs.readFileSync(file, 'utf8');
const marker = 'export const ALL_REACT_ICON_NAMES: readonly string[] = ';
const head = current.slice(0, current.indexOf(marker) + marker.length);
fs.writeFileSync(file, `${head}${JSON.stringify([...names])};\n`);
console.log(`Wrote ${names.size} icon names to lib/icons/names.ts`);
