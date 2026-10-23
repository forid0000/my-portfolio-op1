/**
 * Kits tool registry - the CMS-editable "identity" layer (name, description,
 * icon, accent color, display order) for each /kits/* tool. Icon is any
 * lucide or react-icons name (picked via the admin IconPicker, which searches the
 * full icon set), resolved to SVG data on the server (lib/icons/resolve.ts) and
 * rendered with a caller-supplied fallback, so an unrecognized name degrades
 * gracefully instead of needing a schema change. Accent color stays a curated enum (KITS_COLOR_MAP) since
 * it's a fixed Tailwind class palette, not an open namespace like icons.
 *
 * KITS_DEFAULTS reproduces the exact tools/icons/copy that were hardcoded in
 * app/kits/layout.tsx before this registry existed, so a missing (or not yet
 * saved) `kits_content` doc renders identically to the pre-CMS version.
 */
import React from 'react';
import { renderIcon, type IconData } from '@/lib/icons/icon-data';

export interface KitsColorClasses {
  text: string;
  bg: string;
  border: string;
}

export const KITS_COLOR_MAP: Record<string, KitsColorClasses> = {
  primary: { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  emerald: { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  blue: { text: 'text-info', bg: 'bg-info/10', border: 'border-info/20' },
  amber: { text: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  red: { text: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
  purple: { text: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
  cyan: { text: 'text-chart-4', bg: 'bg-chart-4/10', border: 'border-chart-4/20' },
  pink: { text: 'text-chart-8', bg: 'bg-chart-8/10', border: 'border-chart-8/20' },
};

/** What each stored accent name means now that every accent is a theme token (Appearance). */
export const KITS_COLOR_LABELS: Record<string, string> = {
  primary: 'Brand color',
  emerald: 'Brand color (older "green")',
  blue: 'Info',
  amber: 'Warning',
  red: 'Alert',
  purple: 'Secondary color',
  cyan: 'Palette color 4',
  pink: 'Palette color 8',
};

export interface KitTool {
  key: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
}

export interface KitsContent {
  pageHeading: string;
  pageHighlight: string;
  pageSubtext: string;
  exploreHeading: string;
  tools: KitTool[];
}

export const KITS_DEFAULTS: KitsContent = {
  pageHeading: 'Tools &',
  pageHighlight: 'Kit',
  pageSubtext: 'A collection of utilities for diagnostics, calculation, and data.',
  exploreHeading: 'Explore All Utilities',
  tools: [
    {
      key: 'prayer',
      name: 'Prayer Times',
      description: 'Accurate daily prayer times and schedules based on your location.',
      icon: 'MoonStar',
      accentColor: 'primary',
    },
    {
      key: 'system',
      name: 'System Info.',
      description: 'View detailed information about your device, browser, and OS.',
      icon: 'Laptop',
      accentColor: 'primary',
    },
    {
      key: 'subnet',
      name: 'IP Subnet',
      description: 'Calculate IP ranges, subnet masks, and CIDR notation easily.',
      icon: 'Network',
      accentColor: 'primary',
    },
    {
      key: 'qrcode',
      name: 'QR Code',
      description: 'Generate downloadable QR codes for links, text, or Wi-Fi.',
      icon: 'QrCode',
      accentColor: 'primary',
    },
    {
      key: 'password',
      name: 'GenPass',
      description: 'Create strong, secure, and random passwords instantly.',
      icon: 'ShieldCheck',
      accentColor: 'primary',
    },
    {
      key: 'picker',
      name: 'Randomizer',
      description: 'Pick random numbers, roll dice, or make quick decisions.',
      icon: 'Dices',
      accentColor: 'primary',
    },
    {
      key: 'currency',
      name: 'Currency Conv.',
      description: 'Convert between global currencies with real-time exchange rates.',
      icon: 'Coins',
      accentColor: 'primary',
    },
    {
      key: 'age',
      name: 'Age Calc.',
      description: 'Calculate your exact age in years, months, days, and even seconds.',
      icon: 'CalendarClock',
      accentColor: 'primary',
    },
  ],
};

/** Merge a stored doc over the defaults (so new fields/tools always have a value). */
export function mergeKitsContent(doc: any): KitsContent {
  if (!doc) return KITS_DEFAULTS;
  const { _id, type, updatedAt, ...rest } = doc;

  const storedTools: Partial<KitTool>[] = Array.isArray(rest.tools) ? rest.tools : [];
  const tools: KitTool[] = storedTools.length
    ? storedTools.map((t) => {
        const fallback = KITS_DEFAULTS.tools.find((d) => d.key === t.key) || KITS_DEFAULTS.tools[0];
        return {
          key: t.key || fallback.key,
          name: t.name || fallback.name,
          description: t.description || fallback.description,
          // Any non-empty name; an unknown one renders the fallback glyph (see renderKitIcon).
          icon: t.icon || fallback.icon,
          accentColor:
            t.accentColor && KITS_COLOR_MAP[t.accentColor] ? t.accentColor : fallback.accentColor,
        };
      })
    : KITS_DEFAULTS.tools;

  return {
    ...KITS_DEFAULTS,
    ...rest,
    tools,
  };
}

export function getKitColor(name: string): KitsColorClasses {
  return KITS_COLOR_MAP[name] || KITS_COLOR_MAP.primary;
}

/** Resolve an icon name to an element with the given className, falling back if unknown/absent. */
export function renderKitIcon(
  data: IconData | null | undefined,
  fallback: React.ReactElement<{ className?: string }>,
  className: string
): React.ReactElement {
  return renderIcon(data, fallback, className);
}
