import { describe, expect, it } from 'vitest';
import { isSparkleIcon, plainIconName, SPARKLE_REPLACEMENT } from '@/lib/icons/no-sparkle';
import { ALL_LUCIDE_ICON_NAMES } from '@/lib/lucide-icon';
import * as defaults from '@/lib/content-defaults';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

describe('no sparkle icons', () => {
  it('recognises the sparkle family in every icon pack', () => {
    for (const name of [
      'Sparkles',
      'Sparkle',
      'Stars',
      'WandSparkles',
      'Wand2',
      'LuSparkles',
      'HiSparkles',
      'BsStars',
      'FaMagic',
      'FaWandMagicSparkles',
      'PiMagicWand',
      'MdAutoAwesome',
      'MdOutlineAutoAwesomeMosaic',
      'BroomSparkles',
    ]) {
      expect(isSparkleIcon(name), name).toBe(true);
    }
  });

  it('leaves ordinary icons alone', () => {
    for (const name of [
      'Star',
      'Compass',
      'Rocket',
      'Github',
      'FaGithub',
      'AiFillStar',
      'Palette',
    ]) {
      expect(isSparkleIcon(name), name).toBe(false);
      expect(plainIconName(name)).toBe(name);
    }
    expect(isSparkleIcon('')).toBe(false);
    expect(isSparkleIcon(undefined)).toBe(false);
  });

  it('draws a saved sparkle icon as a plain star', () => {
    expect(plainIconName('Sparkles')).toBe(SPARKLE_REPLACEMENT);
    expect(SPARKLE_REPLACEMENT).toBe('Star');
    expect(ALL_LUCIDE_ICON_NAMES).toContain(SPARKLE_REPLACEMENT);
  });

  it('no default content asks for one', () => {
    const icons: string[] = [];
    const walk = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') {
        for (const [key, v] of Object.entries(value)) {
          if (key === 'icon' && typeof v === 'string') icons.push(v);
          else walk(v);
        }
      }
    };
    walk(defaults);
    expect(icons.length).toBeGreaterThan(3);
    for (const icon of icons) expect(isSparkleIcon(icon), icon).toBe(false);
  });

  it('no page or component draws one', () => {
    const files: string[] = [];
    const visit = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) visit(full);
        else if (/\.(tsx|css)$/.test(entry)) files.push(full);
      }
    };
    visit(path.join(process.cwd(), 'app'));
    visit(path.join(process.cwd(), 'components'));
    const offenders = files.filter((f) =>
      /\b(Sparkles?|WandSparkles|Wand2|Stars)\b|✨/.test(readFileSync(f, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });
});
