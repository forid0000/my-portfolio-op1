'use client';

import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Save,
  RotateCcw,
  Palette,
  PaintBucket,
  LayoutTemplate,
  Info,
  Terminal,
  ShieldCheck,
  Check,
  AlertTriangle,
  CircleCheck,
  CircleAlert,
  MessageSquare,
  Lock,
  MonitorSmartphone,
  SunMoon,
} from 'lucide-react';
import { contrastRatio, isDarkColor, shadesFromHex } from '@/lib/color';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { extractApiErrorMessage } from '@/lib/utils';
import {
  THEME_COLOR_KEYS,
  THEME_DEFAULTS,
  themeCssVariables,
  type SiteTheme,
  type ThemeColorKey,
} from '@/lib/theme-model';
import {
  PRESET_GROUP_LABELS,
  THEME_PRESETS,
  presetPalette,
  type PresetGroup,
  type ThemePalette,
  type ThemePreset,
} from '@/lib/theme-presets';
import {
  VISITOR_THEME_OPTIONS,
  alternatePresets,
  alternateTheme,
  deriveAlternate,
} from '@/lib/theme-modes';

type ThemeState = SiteTheme;

const DEFAULTS: ThemeState = THEME_DEFAULTS;

const RADIUS_PRESETS = [
  { label: 'Sharp', value: '0' },
  { label: 'Subtle', value: '0.375rem' },
  { label: 'Default', value: '0.5rem' },
  { label: 'Rounded', value: '0.75rem' },
  { label: 'Pill', value: '1rem' },
];

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Colour pairs that must stay readable, shown as a hint under the palette. */
const CONTRAST_PAIRS: { label: string; text: ThemeColorKey; on: ThemeColorKey; min: number }[] = [
  { label: 'Page text', text: 'foreground', on: 'background', min: 4.5 },
  { label: 'Card text', text: 'cardForeground', on: 'card', min: 4.5 },
  { label: 'Button text', text: 'primaryForeground', on: 'primary', min: 4.5 },
  { label: 'Secondary button text', text: 'secondaryForeground', on: 'secondary', min: 4.5 },
  { label: 'Quiet text', text: 'mutedForeground', on: 'background', min: 3.5 },
  { label: 'Brand color on page', text: 'primary', on: 'background', min: 3 },
];

function isHex(value: string) {
  return HEX_RE.test(value);
}

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = isHex(value);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={valid && value.length === 7 ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-gray-700 bg-gray-900 p-0.5"
          aria-label={`${label} color picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!valid}
          className={`flex-1 px-2 py-1 bg-gray-950 border rounded text-gray-100 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
            valid ? 'border-gray-800' : 'border-red-700'
          }`}
          placeholder="#ffffff"
        />
      </div>
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

/** A tiny page mock-up in a scheme's own colours, for the scheme picker. */
function PresetSwatch({ preset, active }: { preset: ThemePreset; active: boolean }) {
  return <PaletteSwatch palette={presetPalette(preset)} active={active} />;
}

function PaletteSwatch({ palette: c, active }: { palette: ThemePalette; active: boolean }) {
  return (
    <span
      className="flex h-[74px] flex-col justify-between rounded-md p-2 ring-1 ring-black/20"
      style={{ backgroundColor: c.background }}
    >
      <span className="flex items-center justify-between">
        <span
          className="h-1.5 w-10 rounded-full"
          style={{ backgroundColor: c.foreground, opacity: 0.85 }}
        />
        {active && (
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full"
            style={{ backgroundColor: c.primary, color: c.primaryForeground }}
          >
            <Check className="h-3 w-3" />
          </span>
        )}
      </span>
      <span className="flex items-end gap-1.5">
        <span
          className="flex-1 rounded px-1.5 py-1"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
        >
          <span
            className="block h-1 w-8 rounded-full"
            style={{ backgroundColor: c.cardForeground, opacity: 0.8 }}
          />
          <span
            className="mt-1 block h-1 w-5 rounded-full"
            style={{ backgroundColor: c.mutedForeground }}
          />
        </span>
        <span className="h-5 w-5 rounded-full" style={{ backgroundColor: c.primary }} />
        <span className="h-5 w-5 rounded-full" style={{ backgroundColor: c.secondary }} />
      </span>
    </span>
  );
}

const VISITOR_ICONS = { fixed: Lock, switch: SunMoon, device: MonitorSmartphone } as const;

/** Whether visitors get a light / dark button, and which look they get when they press it. */
function VisitorThemeCard({
  theme,
  onChange,
}: {
  theme: ThemeState;
  onChange: <K extends keyof ThemeState>(key: K, val: ThemeState[K]) => void;
}) {
  const mainDark = isDarkColor(theme.background);
  const choices = useMemo(() => alternatePresets(theme), [theme]);
  // A scheme saved earlier that no longer suits (the main look changed tone) counts as "automatic".
  const picked = choices.some((p) => p.id === theme.altPreset) ? theme.altPreset : '';
  const auto = useMemo(() => deriveAlternate(theme), [theme]);
  const on = theme.visitorTheme !== 'fixed';

  return (
    <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
      <h3 className="text-lg font-semibold text-gray-200 mb-1 flex items-center gap-2 border-b border-gray-800 pb-2">
        <SunMoon className="w-5 h-5 text-emerald-400" /> Light &amp; dark for visitors
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        The colors above are your site&apos;s <strong className="text-gray-300">main look</strong> (
        {mainDark ? 'a dark one' : 'a light one'}). You decide whether a visitor may flip to the
        other tone with a sun/moon button in the header, right next to the Notes icon. Some people
        read much better on a light page, others on a dark one.
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        {VISITOR_THEME_OPTIONS.map((option) => {
          const Icon = VISITOR_ICONS[option.value];
          const active = theme.visitorTheme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange('visitorTheme', option.value)}
              aria-pressed={active}
              className={`text-left p-4 rounded-lg border transition-all ${
                active
                  ? 'bg-emerald-600/15 border-emerald-500/60'
                  : 'bg-gray-950 border-gray-800 hover:bg-gray-800/60'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                <Icon className="w-4 h-4 text-emerald-400" /> {option.title}
              </span>
              <span className="mt-1 block text-xs text-gray-400">{option.text}</span>
            </button>
          );
        })}
      </div>

      {on && (
        <div className="mt-5 space-y-3">
          <div>
            <h4 className="text-sm font-bold text-gray-300">
              The {mainDark ? 'light' : 'dark'} look a visitor gets
            </h4>
            <p className="text-xs text-gray-500">
              Automatic keeps your brand colors and only changes the page tone, so it always matches
              you. Or pick a ready-made {mainDark ? 'light' : 'dark'} scheme.
            </p>
          </div>
          <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => onChange('altPreset', '')}
              aria-pressed={picked === ''}
              className={`p-2 rounded-lg border bg-gray-950 text-left transition-colors ${
                picked === '' ? 'border-emerald-500' : 'border-gray-800 hover:border-emerald-500/60'
              }`}
            >
              <PaletteSwatch palette={auto} active={picked === ''} />
              <span className="mt-2 block truncate text-xs font-medium text-gray-300">
                Automatic
              </span>
            </button>
            {choices.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange('altPreset', preset.id)}
                aria-pressed={picked === preset.id}
                className={`p-2 rounded-lg border bg-gray-950 text-left transition-colors ${
                  picked === preset.id
                    ? 'border-emerald-500'
                    : 'border-gray-800 hover:border-emerald-500/60'
                }`}
              >
                <PresetSwatch preset={preset} active={picked === preset.id} />
                <span className="mt-2 block truncate text-xs font-medium text-gray-300">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-gray-500">
            What a visitor picks is saved only in their own browser (no account, nothing sent to
            your server) and applied before the page is drawn, so there is no flash. The admin panel
            is never affected. Use{' '}
            <strong className="text-gray-400">Look at the switched version</strong> in the live
            preview to see it before you save.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * The real site's building blocks (the same token classes the public pages use) inside a box
 * that carries the draft palette as inline CSS variables, so what you see here is what the
 * site will look like once saved.
 */
function ThemePreview({ theme }: { theme: ThemeState }) {
  const style = useMemo(() => {
    const vars = themeCssVariables(theme);
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(vars)) {
      out[name === 'color-scheme' ? 'colorScheme' : name] = value;
    }
    return out as React.CSSProperties;
  }, [theme]);

  return (
    <div
      style={style}
      className="overflow-hidden rounded-lg border border-border bg-background text-foreground transition-colors duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full border border-primary/30 bg-primary/20" />
          <span className="text-sm font-bold">Your Name</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-primary">Home</span>
          <span className="text-muted-foreground">About</span>
          <span className="text-muted-foreground">Work</span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Hero */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-primary">Hello, I&apos;m</p>
          <h4 className="text-xl font-bold leading-tight">Your Name</h4>
          <p className="text-sm text-muted-foreground">
            A short line about what you do, in your quiet text color.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow-sm">
              Primary
            </span>
            <span className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">
              Secondary
            </span>
            <span className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
              Outline
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-3 text-card-foreground">
          <p className="text-sm font-semibold">Project card</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cards, borders and quiet text use the card colors.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
              Design
            </span>
            <span className="rounded-full border border-secondary/20 bg-secondary/10 px-2 py-0.5 text-[10px] text-secondary">
              Research
            </span>
          </div>
        </div>

        {/* Form field + messages */}
        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-input px-3 py-2 text-xs text-muted-foreground ring-2 ring-ring/40">
            Input field (focused)
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
            <CircleCheck className="h-3.5 w-3.5" /> Message sent
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            <AlertTriangle className="h-3.5 w-3.5" /> Check this field
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <CircleAlert className="h-3.5 w-3.5" /> Something went wrong
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-xs text-info">
            <Info className="h-3.5 w-3.5" /> Good to know
          </div>
        </div>

        {/* Chart palette */}
        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Palette
          </p>
          <div className="flex h-3 overflow-hidden rounded-full">
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className="flex-1"
                style={{ backgroundColor: `var(--chart-${i + 1})` }}
              />
            ))}
          </div>
        </div>

        {/* Floating contact button */}
        <div className="flex justify-end">
          <span className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-primary shadow-lg">
            <MessageSquare className="h-4 w-4" /> Let&apos;s Connect
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AppearancePage() {
  const [theme, setTheme] = useState<ThemeState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState<PresetGroup | 'all'>('all');
  const [previewAlt, setPreviewAlt] = useState(false);

  const { isDirty, markClean } = useUnsavedWarning(theme, loading);

  useEffect(() => {
    fetch('/api/admin/content/theme')
      .then((r) => r.json())
      .then((d) => {
        if (d && Object.keys(d).length > 0) {
          setTheme({ ...DEFAULTS, ...d });
        }
      })
      .catch(() => toast.error('Failed to load current theme'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = <K extends keyof ThemeState>(key: K, val: ThemeState[K]) => {
    setTheme((prev) => ({ ...prev, [key]: val }));
  };

  const applyPreset = (preset: ThemePreset) => {
    const palette = presetPalette(preset);
    setTheme((prev) => ({ ...prev, ...palette }));
    toast.message(`${preset.name} applied (not saved yet).`);
  };

  const activePresetId = useMemo(() => {
    return (
      THEME_PRESETS.find((p) => {
        const palette = presetPalette(p);
        return THEME_COLOR_KEYS.every(
          (k) => palette[k].toLowerCase() === (theme[k] || '').toLowerCase()
        );
      })?.id ?? null
    );
  }, [theme]);

  const contrast = useMemo(
    () =>
      CONTRAST_PAIRS.map((pair) => {
        const a = theme[pair.text];
        const b = theme[pair.on];
        const ratio = isHex(a) && isHex(b) ? contrastRatio(a, b) : 0;
        return { ...pair, ratio, ok: ratio >= pair.min };
      }),
    [theme]
  );

  // The accent the admin panel will use, for the preview strip below.
  const adminAccentSource =
    theme.adminAccentMode === 'site'
      ? theme.primary
      : theme.adminAccentMode === 'custom'
        ? theme.adminAccent
        : DEFAULTS.adminAccent;
  const adminShades = isHex(adminAccentSource) ? shadesFromHex(adminAccentSource) : null;

  const handleSave = async () => {
    // Quick validation
    const invalid =
      THEME_COLOR_KEYS.some((k) => !isHex(theme[k])) ||
      (theme.adminAccentMode === 'custom' && !isHex(theme.adminAccent));
    if (invalid) {
      toast.error('Please ensure all colors are valid hex codes (e.g. #34d399).');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/content/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(theme),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }
      markClean(theme);
      toast.success('Theme saved.', {
        description:
          'Public pages refresh on their own. Reload the admin to see a new panel colour.',
      });
    } catch (err) {
      toast.error('Failed to save', {
        description:
          err instanceof Error ? err.message : 'Please check your connection and try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTheme(DEFAULTS);
    toast.message('Reset to System Defaults (not saved yet).');
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-emerald-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const visiblePresets =
    group === 'all' ? THEME_PRESETS : THEME_PRESETS.filter((p) => p.group === group);

  const field = (key: ThemeColorKey, label: string, hint?: string) => (
    <ColorField
      label={label}
      hint={hint}
      value={theme[key]}
      onChange={(v) => handleUpdate(key, v)}
    />
  );

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="p-6 border-b border-gray-800 bg-gray-900 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <Palette className="w-6 h-6 text-emerald-400" /> Appearance & Theming
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Every color on your site comes from this one page. Changes apply everywhere at once.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs font-medium text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2.5 py-1 rounded-full">
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition-colors border border-gray-700"
          >
            <RotateCcw className="w-4 h-4" /> Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-emerald-900/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Theme
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Controls - Left Column (takes up 2/3 space) */}
          <div className="xl:col-span-2 space-y-6">
            {/* Color schemes */}
            <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
              <h3 className="text-lg font-semibold text-gray-200 mb-1 flex items-center gap-2 border-b border-gray-800 pb-2">
                <Palette className="w-5 h-5 text-emerald-400" /> Color schemes
                <span className="ml-auto text-xs font-normal text-gray-500">
                  {THEME_PRESETS.length} ready-made
                </span>
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Start from a scheme, then fine-tune any color below. Every scheme keeps text
                readable. Nothing changes on your site until you save.
              </p>
              <div className="mb-4 flex flex-wrap gap-2">
                {(['all', 'light', 'dark', 'mixed'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroup(g)}
                    aria-pressed={group === g}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                      group === g
                        ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-300'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    {g === 'all' ? 'All' : PRESET_GROUP_LABELS[g]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {visiblePresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    aria-pressed={activePresetId === preset.id}
                    className={`p-2 rounded-lg border bg-gray-950 text-left transition-colors ${
                      activePresetId === preset.id
                        ? 'border-emerald-500'
                        : 'border-gray-800 hover:border-emerald-500/60'
                    }`}
                  >
                    <PresetSwatch preset={preset} active={activePresetId === preset.id} />
                    <span className="mt-2 block truncate text-xs font-medium text-gray-300">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <VisitorThemeCard theme={theme} onChange={handleUpdate} />

            {/* Look & feel */}
            <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
              <h3 className="text-lg font-semibold text-gray-200 mb-1 flex items-center gap-2 border-b border-gray-800 pb-2">
                <Palette className="w-5 h-5 text-emerald-400" /> Style
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                How section titles, the header and the footer are worded and drawn.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    [
                      'clean',
                      'Clean',
                      'Plain headings and everyday words. Works for any profession.',
                      LayoutTemplate,
                    ],
                    [
                      'terminal',
                      'Terminal',
                      'Developer look: command prompts, monospace text, typing effects.',
                      Terminal,
                    ],
                  ] as const
                ).map(([value, title, text, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleUpdate('uiStyle', value)}
                    aria-pressed={theme.uiStyle === value}
                    className={`text-left p-4 rounded-lg border transition-all ${
                      theme.uiStyle === value
                        ? 'bg-emerald-600/15 border-emerald-500/60'
                        : 'bg-gray-950 border-gray-800 hover:bg-gray-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                      <Icon className="w-4 h-4 text-emerald-400" /> {title}
                    </span>
                    <span className="mt-1 block text-xs text-gray-400">{text}</span>
                    <span
                      className={`mt-3 block rounded border border-gray-800 bg-gray-900 px-3 py-2 text-gray-200 ${
                        value === 'terminal' ? 'font-mono text-xs' : 'text-sm font-semibold'
                      }`}
                    >
                      {value === 'terminal' ? (
                        <>
                          <span className="text-emerald-400">hello@portfolio</span>:~/projects$
                        </>
                      ) : (
                        <>
                          <span className="mr-2 inline-block h-3 w-1 rounded-full bg-emerald-400 align-middle" />
                          Projects
                        </>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colors Grid */}
            <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2 border-b border-gray-800 pb-2">
                <PaintBucket className="w-5 h-5 text-emerald-500" /> Color palette
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-3 p-4 bg-gray-950 rounded-lg border border-gray-800/50">
                  <h4 className="text-sm font-bold text-gray-300">Page</h4>
                  {field('background', 'Background')}
                  {field('foreground', 'Text')}
                </div>

                <div className="space-y-3 p-4 bg-gray-950 rounded-lg border border-gray-800/50">
                  <h4 className="text-sm font-bold text-gray-300">Brand</h4>
                  {field('primary', 'Primary color', 'Links, buttons, highlights.')}
                  {field('primaryForeground', 'Text on primary')}
                  {field('accent', 'Accent', 'Glows and small highlights.')}
                </div>

                <div className="space-y-3 p-4 bg-gray-950 rounded-lg border border-gray-800/50">
                  <h4 className="text-sm font-bold text-gray-300">Secondary</h4>
                  {field('secondary', 'Secondary color')}
                  {field('secondaryForeground', 'Text on secondary')}
                </div>

                <div className="space-y-3 p-4 bg-gray-950 rounded-lg border border-gray-800/50">
                  <h4 className="text-sm font-bold text-gray-300">Cards & panels</h4>
                  {field('card', 'Card background')}
                  {field('cardForeground', 'Card text')}
                </div>

                <div className="space-y-3 p-4 bg-gray-950 rounded-lg border border-gray-800/50">
                  <h4 className="text-sm font-bold text-gray-300">Quiet</h4>
                  {field('muted', 'Subtle fill', 'Soft backgrounds and dividers.')}
                  {field('mutedForeground', 'Quiet text', 'Captions and secondary text.')}
                </div>

                <div className="space-y-3 p-4 bg-gray-950 rounded-lg border border-gray-800/50">
                  <h4 className="text-sm font-bold text-gray-300">Lines & inputs</h4>
                  {field('border', 'Borders')}
                  {field('input', 'Input background')}
                  {field('ring', 'Focus ring')}
                </div>

                <div className="space-y-3 p-4 bg-gray-950 rounded-lg border border-gray-800/50 md:col-span-2 lg:col-span-3">
                  <h4 className="text-sm font-bold text-gray-300">Messages</h4>
                  <p className="text-xs text-gray-500">
                    Used for errors, confirmations, cautions and notes everywhere on the site.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {field('destructive', 'Error')}
                    {field('success', 'Success')}
                    {field('warning', 'Warning')}
                    {field('info', 'Information')}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-gray-800 bg-gray-950 p-4">
                <h4 className="mb-2 text-sm font-bold text-gray-300">Readability check</h4>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {contrast.map((c) => (
                    <li key={c.label} className="flex items-center gap-2 text-xs">
                      {c.ok ? (
                        <CircleCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                      )}
                      <span className="text-gray-300">{c.label}</span>
                      <span
                        className={`ml-auto font-mono ${c.ok ? 'text-gray-500' : 'text-amber-400'}`}
                      >
                        {c.ratio ? `${c.ratio.toFixed(1)}:1` : '-'}
                        {!c.ok && ` (aim for ${c.min}+)`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Radius */}
            <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2 border-b border-gray-800 pb-2">
                <LayoutTemplate className="w-5 h-5 text-gray-400" /> Layout & spacing
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Corner radius (buttons & cards)
                </label>
                <div className="flex flex-wrap gap-2">
                  {RADIUS_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleUpdate('radius', p.value)}
                      className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                        theme.radius === p.value
                          ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-300'
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Admin panel color */}
            <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
              <h3 className="text-lg font-semibold text-gray-200 mb-1 flex items-center gap-2 border-b border-gray-800 pb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> Admin panel color
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                The accent color of this control panel (buttons, highlights). The panel itself
                always stays dark so it is readable whatever you pick for the site.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {(
                  [
                    ['default', 'Default green'],
                    ['site', 'Match my site'],
                    ['custom', 'Pick a color'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleUpdate('adminAccentMode', value)}
                    aria-pressed={theme.adminAccentMode === value}
                    className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                      theme.adminAccentMode === value
                        ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-300'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {theme.adminAccentMode === 'custom' && (
                <div className="max-w-xs mb-4">
                  <ColorField
                    label="Admin accent"
                    value={theme.adminAccent}
                    onChange={(v) => handleUpdate('adminAccent', v)}
                  />
                </div>
              )}
              {adminShades && (
                <div className="flex items-center gap-3">
                  <div className="flex overflow-hidden rounded-md border border-gray-800">
                    {['300', '400', '500', '600', '700', '800'].map((step) => (
                      <span
                        key={step}
                        className="h-7 w-9"
                        style={{ backgroundColor: adminShades[step] }}
                        title={step}
                      />
                    ))}
                  </div>
                  <span
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                    style={{ backgroundColor: adminShades['600'] }}
                  >
                    Save Changes
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview - Right Column */}
          <div className="xl:col-span-1">
            <div className="sticky top-28 p-5 bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4 border-b border-gray-800 pb-2">
                Live preview
              </h3>
              {theme.visitorTheme !== 'fixed' && (
                <div
                  role="group"
                  aria-label="Which look to preview"
                  className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-gray-800 bg-gray-950 p-1 text-xs"
                >
                  {(
                    [
                      [false, 'Your main look'],
                      [true, 'Look at the switched version'],
                    ] as const
                  ).map(([alt, label]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setPreviewAlt(alt)}
                      aria-pressed={previewAlt === alt}
                      className={`rounded-md px-2 py-1.5 transition-colors ${
                        previewAlt === alt
                          ? 'bg-emerald-600/20 text-emerald-300'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <ThemePreview
                theme={previewAlt && theme.visitorTheme !== 'fixed' ? alternateTheme(theme) : theme}
              />
              <p className="mt-3 text-[11px] text-gray-500">
                Built from the same color tokens as your real pages.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
