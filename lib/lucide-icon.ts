import 'server-only';
import lucide from '@/lib/icons/lucide-data.json';

/**
 * Every lucide icon name (one canonical name per glyph; aliases such as "FooIcon"
 * and legacy renames still resolve, see lib/icons/resolve.ts). Read from the
 * generated data file rather than from `lucide-react`, so listing the catalog
 * never loads lucide's ~1,900 icon modules. Regenerate with
 * `node scripts/generate-icon-names.mjs` after upgrading lucide-react.
 */
export const ALL_LUCIDE_ICON_NAMES: readonly string[] = Object.keys(lucide.icons);
