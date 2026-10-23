/**
 * Ready-made colour schemes for Admin -> Appearance. Each one lists only the handful of colours
 * that define its character; `derivePalette` fills in everything else (text on buttons, quiet
 * text, borders, inputs, status colours) so every scheme is complete and readable. A unit test
 * checks the contrast of every scheme, so adding one here cannot ship an unreadable palette.
 */
import { balancedGray, isDarkColor, mixHex, readableOn, softenForContrast } from '@/lib/color';
import type { SiteTheme, ThemeColorKey } from '@/lib/theme-model';

export type ThemePalette = Pick<SiteTheme, ThemeColorKey>;
export type PresetGroup = 'light' | 'dark' | 'mixed';

interface PresetBase {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  secondary: string;
  accent?: string;
  /** Needed when the card is much lighter or darker than the page (mixed schemes). */
  cardForeground?: string;
  input?: string;
  border?: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  group: PresetGroup;
  base: PresetBase;
}

const STATUS_LIGHT = {
  destructive: '#b91c1c',
  success: '#15803d',
  warning: '#b45309',
  info: '#1d4ed8',
};
const STATUS_DARK = {
  destructive: '#f87171',
  success: '#4ade80',
  warning: '#fbbf24',
  info: '#60a5fa',
};

/** Turns the few defining colours of a scheme into a complete palette. */
export function derivePalette(b: PresetBase): ThemePalette {
  const cardForeground = b.cardForeground ?? b.foreground;
  const sameTone = isDarkColor(b.background) === isDarkColor(b.card);
  const status = isDarkColor(b.background) ? STATUS_DARK : STATUS_LIGHT;
  const accent = b.accent ?? b.primary;
  return {
    background: b.background,
    foreground: b.foreground,
    card: b.card,
    cardForeground,
    primary: b.primary,
    primaryForeground: readableOn(b.primary),
    secondary: b.secondary,
    secondaryForeground: readableOn(b.secondary),
    accent,
    muted: mixHex(b.background, b.foreground, 0.45),
    // Quiet text: as soft as possible while staying readable on the page and on cards.
    // When the cards are the opposite tone of the page, no tinted text reads on both, so a
    // balanced grey is used instead.
    mutedForeground: sameTone
      ? softenForContrast(b.foreground, b.background, [b.background, b.card], 4.6)
      : balancedGray(b.background, b.card),
    border: b.border ?? mixHex(b.background, b.foreground, 0.16),
    input:
      b.input ??
      (sameTone ? mixHex(b.background, b.card, 0.5) : mixHex(b.background, '#ffffff', 0.4)),
    ring: b.primary,
    ...status,
  };
}

const light = (id: string, name: string, base: PresetBase): ThemePreset => ({
  id,
  name,
  group: 'light',
  base,
});
const dark = (id: string, name: string, base: PresetBase): ThemePreset => ({
  id,
  name,
  group: 'dark',
  base,
});
const mixed = (id: string, name: string, base: PresetBase): ThemePreset => ({
  id,
  name,
  group: 'mixed',
  base,
});

export const THEME_PRESETS: ThemePreset[] = [
  // ---- Light --------------------------------------------------------------------------------
  light('clean-white', 'Clean White', {
    background: '#ffffff',
    foreground: '#111827',
    card: '#f8fafc',
    primary: '#2563eb',
    secondary: '#7c3aed',
    accent: '#0ea5e9',
  }),
  light('soft-gray', 'Soft Gray', {
    background: '#f5f5f5',
    foreground: '#1a1a1a',
    card: '#ffffff',
    primary: '#047857',
    secondary: '#2563eb',
  }),
  light('warm-paper', 'Warm Paper', {
    background: '#faf7f2',
    foreground: '#292524',
    card: '#fffdf8',
    primary: '#b45309',
    secondary: '#0f766e',
  }),
  light('sky', 'Sky', {
    background: '#f0f9ff',
    foreground: '#0c4a6e',
    card: '#ffffff',
    primary: '#0369a1',
    secondary: '#7c3aed',
  }),
  light('mint', 'Mint', {
    background: '#f0fdf4',
    foreground: '#14532d',
    card: '#ffffff',
    primary: '#15803d',
    secondary: '#0d9488',
  }),
  light('rose-petal', 'Rose Petal', {
    background: '#fff1f2',
    foreground: '#4c0519',
    card: '#ffffff',
    primary: '#be123c',
    secondary: '#a21caf',
  }),
  light('lavender', 'Lavender', {
    background: '#f5f3ff',
    foreground: '#2e1065',
    card: '#ffffff',
    primary: '#6d28d9',
    secondary: '#be185d',
  }),
  light('peach', 'Peach', {
    background: '#fff7ed',
    foreground: '#431407',
    card: '#fffbf5',
    primary: '#c2410c',
    secondary: '#0369a1',
  }),
  light('lemon', 'Lemon', {
    background: '#fefce8',
    foreground: '#422006',
    card: '#fffef5',
    primary: '#a16207',
    secondary: '#15803d',
  }),
  light('slate-light', 'Slate Light', {
    background: '#f1f5f9',
    foreground: '#0f172a',
    card: '#ffffff',
    primary: '#334155',
    secondary: '#0369a1',
    accent: '#0284c7',
  }),
  light('cream-coffee', 'Cream & Coffee', {
    background: '#f5ebe0',
    foreground: '#3b2a20',
    card: '#fdf8f3',
    primary: '#8b5a2b',
    secondary: '#4d6b4c',
  }),
  light('ocean-breeze', 'Ocean Breeze', {
    background: '#ecfeff',
    foreground: '#083344',
    card: '#ffffff',
    primary: '#0e7490',
    secondary: '#4338ca',
  }),
  light('sage', 'Sage', {
    background: '#f4f7f2',
    foreground: '#1f2d1f',
    card: '#ffffff',
    primary: '#4d7c0f',
    secondary: '#0f766e',
  }),
  light('sunset-light', 'Sunset Light', {
    background: '#fff8f1',
    foreground: '#3a1d0f',
    card: '#ffffff',
    primary: '#e11d48',
    secondary: '#c2410c',
    accent: '#d97706',
  }),
  light('monochrome-light', 'Monochrome Light', {
    background: '#ffffff',
    foreground: '#000000',
    card: '#f4f4f5',
    primary: '#18181b',
    secondary: '#52525b',
  }),

  // ---- Dark ---------------------------------------------------------------------------------
  dark('midnight', 'Midnight (default)', {
    background: '#1d232a',
    foreground: '#e5e7eb',
    card: '#2a3142',
    primary: '#34d399',
    secondary: '#60a5fa',
    border: '#3f4655',
    input: '#252d38',
  }),
  dark('pure-black', 'Pure Black', {
    background: '#000000',
    foreground: '#f4f4f5',
    card: '#111111',
    primary: '#22d3ee',
    secondary: '#a78bfa',
  }),
  dark('graphite', 'Graphite', {
    background: '#18181b',
    foreground: '#f4f4f5',
    card: '#27272a',
    primary: '#a78bfa',
    secondary: '#f472b6',
  }),
  dark('deep-ocean', 'Deep Ocean', {
    background: '#0b1727',
    foreground: '#e0f2fe',
    card: '#12263f',
    primary: '#38bdf8',
    secondary: '#818cf8',
  }),
  dark('forest-night', 'Forest Night', {
    background: '#0f1a14',
    foreground: '#dcfce7',
    card: '#17261d',
    primary: '#4ade80',
    secondary: '#2dd4bf',
  }),
  dark('royal-purple', 'Royal Purple', {
    background: '#1a1226',
    foreground: '#f3e8ff',
    card: '#251a38',
    primary: '#c084fc',
    secondary: '#f472b6',
  }),
  dark('crimson-night', 'Crimson Night', {
    background: '#1c1014',
    foreground: '#ffe4e6',
    card: '#2a171d',
    primary: '#fb7185',
    secondary: '#fbbf24',
  }),
  dark('amber-dusk', 'Amber Dusk', {
    background: '#1c1710',
    foreground: '#fef3c7',
    card: '#2a2216',
    primary: '#fbbf24',
    secondary: '#fb923c',
  }),
  dark('nord', 'Nord', {
    background: '#2e3440',
    foreground: '#eceff4',
    card: '#3b4252',
    primary: '#88c0d0',
    secondary: '#81a1c1',
    accent: '#a3be8c',
  }),
  dark('dracula', 'Dracula', {
    background: '#282a36',
    foreground: '#f8f8f2',
    card: '#343746',
    primary: '#bd93f9',
    secondary: '#ff79c6',
    accent: '#50fa7b',
  }),
  dark('solarized-dark', 'Solarized Dark', {
    background: '#002b36',
    foreground: '#eee8d5',
    card: '#073642',
    primary: '#2aa198',
    secondary: '#6c9ef8',
    accent: '#b58900',
  }),
  dark('tokyo-night', 'Tokyo Night', {
    background: '#1a1b26',
    foreground: '#c0caf5',
    card: '#24283b',
    primary: '#7aa2f7',
    secondary: '#bb9af7',
    accent: '#9ece6a',
  }),
  dark('rose-pine', 'Rosé Pine', {
    background: '#191724',
    foreground: '#e0def4',
    card: '#1f1d2e',
    primary: '#ebbcba',
    secondary: '#c4a7e7',
    accent: '#9ccfd8',
  }),
  dark('gruvbox-dark', 'Gruvbox Dark', {
    background: '#282828',
    foreground: '#ebdbb2',
    card: '#3c3836',
    primary: '#fabd2f',
    secondary: '#83a598',
    accent: '#b8bb26',
  }),
  dark('slate-night', 'Slate Night', {
    background: '#0f172a',
    foreground: '#e2e8f0',
    card: '#1e293b',
    primary: '#38bdf8',
    secondary: '#a78bfa',
  }),
  dark('coffee-dark', 'Coffee Dark', {
    background: '#1b1512',
    foreground: '#f1e4d6',
    card: '#271d18',
    primary: '#d6a26b',
    secondary: '#8fb996',
  }),
  dark('monochrome-dark', 'Monochrome Dark', {
    background: '#0a0a0a',
    foreground: '#fafafa',
    card: '#171717',
    primary: '#fafafa',
    secondary: '#a3a3a3',
  }),

  // ---- Mixed: light page with dark cards, dark page with light cards, or a bold tinted page --
  mixed('ink-paper', 'Ink & Paper', {
    background: '#f7f4ee',
    foreground: '#1c1917',
    card: '#1f2937',
    cardForeground: '#f3f4f6',
    primary: '#0d9488',
    secondary: '#9a3412',
    input: '#ffffff',
  }),
  mixed('moonlit-paper', 'Moonlit Paper', {
    background: '#111827',
    foreground: '#e5e7eb',
    card: '#f3f4f6',
    cardForeground: '#111827',
    primary: '#6366f1',
    secondary: '#f472b6',
    input: '#1f2937',
  }),
  mixed('lavender-dusk', 'Lavender Dusk', {
    background: '#2b2340',
    foreground: '#f1eafe',
    card: '#3a2f57',
    primary: '#f0abfc',
    secondary: '#67e8f9',
  }),
  mixed('terracotta-sand', 'Terracotta & Sand', {
    background: '#f3e6d8',
    foreground: '#3b2a20',
    card: '#431407',
    cardForeground: '#ffedd5',
    primary: '#b45309',
    secondary: '#115e59',
    input: '#fbf3ea',
  }),
  mixed('blue-hour', 'Blue Hour', {
    background: '#eff6ff',
    foreground: '#172554',
    card: '#172554',
    cardForeground: '#eff6ff',
    primary: '#3b82f6',
    secondary: '#be185d',
    input: '#eff6ff',
  }),
  mixed('mint-chocolate', 'Mint Chocolate', {
    background: '#ecfdf5',
    foreground: '#1c1917',
    card: '#2b1d1d',
    cardForeground: '#ecfdf5',
    primary: '#059669',
    secondary: '#9a3412',
    input: '#ffffff',
  }),
  mixed('neon-night', 'Neon Night', {
    background: '#0d0221',
    foreground: '#f5f0ff',
    card: '#1a0b3b',
    primary: '#ff4fa3',
    secondary: '#2ee6c8',
    accent: '#fee440',
  }),
  mixed('retro-arcade', 'Retro Arcade', {
    background: '#1b1b3a',
    foreground: '#f4f1de',
    card: '#2a2a55',
    primary: '#ff6b6b',
    secondary: '#4ecdc4',
    accent: '#ffe66d',
  }),
  mixed('teal-coral', 'Teal & Coral', {
    background: '#0f3d3e',
    foreground: '#e6fffa',
    card: '#145a5b',
    primary: '#ff9e80',
    secondary: '#ffd54f',
  }),
  mixed('black-gold', 'Black & Gold', {
    background: '#0c0c0c',
    foreground: '#f5e6c8',
    card: '#1a1a1a',
    primary: '#d4af37',
    secondary: '#e8c872',
  }),
  mixed('sand-navy', 'Sand & Navy', {
    background: '#efe6d5',
    foreground: '#0b1f3a',
    card: '#0b1f3a',
    cardForeground: '#efe6d5',
    primary: '#e11d48',
    secondary: '#0f766e',
    input: '#faf5ea',
  }),
  mixed('peach-plum', 'Peach & Plum', {
    background: '#ffe8d9',
    foreground: '#3b0764',
    card: '#2e0231',
    cardForeground: '#fdf4ff',
    primary: '#c026d3',
    secondary: '#c2410c',
    input: '#fff6ef',
  }),
];

export const PRESET_GROUP_LABELS: Record<PresetGroup, string> = {
  light: 'Light',
  dark: 'Dark',
  mixed: 'Mixed & bold',
};

/** The complete palette of a preset. */
export function presetPalette(preset: ThemePreset): ThemePalette {
  return derivePalette(preset.base);
}
