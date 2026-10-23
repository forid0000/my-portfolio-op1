'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Save,
  RotateCcw,
  Palette,
  PaintBucket,
  LayoutTemplate,
  AlertCircle,
  Terminal,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { shadesFromHex } from '@/lib/color';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { extractApiErrorMessage } from '@/lib/utils';

type ColorKey =
  | 'background'
  | 'foreground'
  | 'card'
  | 'cardForeground'
  | 'primary'
  | 'primaryForeground'
  | 'secondary'
  | 'secondaryForeground'
  | 'accent'
  | 'muted'
  | 'mutedForeground'
  | 'border'
  | 'input'
  | 'ring';

interface ThemeState extends Record<ColorKey, string> {
  radius: string;
  uiStyle: 'clean' | 'terminal';
  adminAccentMode: 'default' | 'site' | 'custom';
  adminAccent: string;
}

const COLOR_KEYS: ColorKey[] = [
  'background',
  'foreground',
  'card',
  'cardForeground',
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'accent',
  'muted',
  'mutedForeground',
  'border',
  'input',
  'ring',
];

// Kept in sync with THEME_DEFAULTS in lib/theme.ts
const DEFAULTS: ThemeState = {
  background: '#1d232a',
  foreground: '#e5e7eb',
  card: '#2a3142',
  cardForeground: '#e5e7eb',
  primary: '#34d399',
  primaryForeground: '#1d232a',
  secondary: '#60a5fa',
  secondaryForeground: '#ffffff',
  accent: '#34d399',
  muted: '#6b7280',
  mutedForeground: '#9ca3af',
  border: '#3f4655',
  input: '#252d38',
  ring: '#34d399',
  radius: '0.5rem',
  uiStyle: 'clean',
  adminAccentMode: 'default',
  adminAccent: '#34d399',
};

const RADIUS_PRESETS = [
  { label: 'Sharp', value: '0' },
  { label: 'Subtle', value: '0.375rem' },
  { label: 'Default', value: '0.5rem' },
  { label: 'Rounded', value: '0.75rem' },
  { label: 'Pill', value: '1rem' },
];

// One-click colour schemes. They change colours only, never the corner radius or the style.
const PRESETS: { name: string; colors: Partial<Record<ColorKey, string>> }[] = [
  { name: 'Emerald', colors: {} },
  {
    name: 'Ocean',
    colors: {
      background: '#0f1b2b',
      card: '#18283d',
      border: '#2d4260',
      input: '#142235',
      primary: '#38bdf8',
      primaryForeground: '#0b1220',
      accent: '#38bdf8',
      ring: '#38bdf8',
      secondary: '#818cf8',
    },
  },
  {
    name: 'Violet',
    colors: {
      background: '#17142a',
      card: '#221d3d',
      border: '#3b3466',
      input: '#1c1834',
      primary: '#a78bfa',
      primaryForeground: '#120f24',
      accent: '#a78bfa',
      ring: '#a78bfa',
      secondary: '#f472b6',
    },
  },
  {
    name: 'Rose',
    colors: {
      background: '#221619',
      card: '#31202a',
      border: '#5a3341',
      input: '#2a1a21',
      primary: '#fb7185',
      primaryForeground: '#1f1014',
      accent: '#fb7185',
      ring: '#fb7185',
      secondary: '#fbbf24',
    },
  },
  {
    name: 'Sunset',
    colors: {
      background: '#1f1a14',
      card: '#2e261c',
      border: '#54442f',
      input: '#261f17',
      primary: '#fbbf24',
      primaryForeground: '#1a1409',
      accent: '#fbbf24',
      ring: '#fbbf24',
      secondary: '#fb923c',
    },
  },
  {
    name: 'Mono',
    colors: {
      background: '#121212',
      card: '#1c1c1c',
      border: '#3a3a3a',
      input: '#181818',
      primary: '#e5e5e5',
      primaryForeground: '#111111',
      accent: '#e5e5e5',
      ring: '#e5e5e5',
      secondary: '#a3a3a3',
    },
  },
];

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = HEX_RE.test(value);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={valid ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-gray-700 bg-gray-900 p-0.5"
          aria-label={`${label} color picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 px-2 py-1 bg-gray-950 border rounded text-gray-100 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
            valid ? 'border-gray-800' : 'border-red-700'
          }`}
          placeholder="#ffffff"
        />
      </div>
    </div>
  );
}

export default function AppearancePage() {
  const [theme, setTheme] = useState<ThemeState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const applyPreset = (colors: Partial<Record<ColorKey, string>>) => {
    setTheme((prev) => ({
      ...prev,
      ...Object.fromEntries(COLOR_KEYS.map((k) => [k, colors[k] ?? DEFAULTS[k]])),
    }));
  };

  // The accent the admin panel will use, for the preview strip below.
  const adminAccentSource =
    theme.adminAccentMode === 'site'
      ? theme.primary
      : theme.adminAccentMode === 'custom'
        ? theme.adminAccent
        : DEFAULTS.adminAccent;
  const adminShades = HEX_RE.test(adminAccentSource) ? shadesFromHex(adminAccentSource) : null;

  const handleSave = async () => {
    // Quick validation
    const invalid =
      COLOR_KEYS.some((k) => !HEX_RE.test(theme[k])) ||
      (theme.adminAccentMode === 'custom' && !HEX_RE.test(theme.adminAccent));
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

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="p-6 border-b border-gray-800 bg-gray-900 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <Palette className="w-6 h-6 text-emerald-400" /> Appearance & Theming
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Fully customize your site&apos;s colors and styles. Changes apply globally.
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
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200/80 leading-relaxed">
                <strong className="text-blue-300">Admin Hint:</strong> The{' '}
                <strong>Primary Color</strong> and <strong>Accent Glow</strong> are critical to the
                glassmorphism effects across the site. Ensure there is enough contrast between your
                foreground text and your background color. Use the <em>Live Preview</em> on the
                right to test your changes before saving.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Controls - Left Column (takes up 2/3 space) */}
          <div className="xl:col-span-2 space-y-6">
            {/* Look & feel */}
            <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
              <h3 className="text-lg font-semibold text-gray-200 mb-1 flex items-center gap-2 border-b border-gray-800 pb-2">
                <Sparkles className="w-5 h-5 text-emerald-400" /> Style
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
                      Sparkles,
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
                          <span className="text-emerald-400">dev@portfolio</span>:~/projects$
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

            <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
              <h3 className="text-lg font-semibold text-gray-200 mb-1 flex items-center gap-2 border-b border-gray-800 pb-2">
                <Palette className="w-5 h-5 text-emerald-400" /> Color schemes
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Start from a scheme, then fine-tune any color below. Nothing changes until you save.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PRESETS.map((preset) => {
                  const c = (k: ColorKey) => preset.colors[k] ?? DEFAULTS[k];
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset.colors)}
                      className="p-3 rounded-lg border border-gray-800 bg-gray-950 hover:border-emerald-500/60 text-left transition-colors"
                    >
                      <span
                        className="flex h-10 items-center gap-1.5 rounded-md px-2"
                        style={{ backgroundColor: c('background') }}
                      >
                        <span
                          className="h-5 w-5 rounded-full"
                          style={{ backgroundColor: c('primary') }}
                        />
                        <span
                          className="h-5 w-5 rounded-full"
                          style={{ backgroundColor: c('secondary') }}
                        />
                        <span
                          className="h-5 flex-1 rounded"
                          style={{ backgroundColor: c('card') }}
                        />
                      </span>
                      <span className="mt-2 block text-xs font-medium text-gray-300">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

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

            {/* Global Settings */}
            <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2 border-b border-gray-800 pb-2">
                <LayoutTemplate className="w-5 h-5 text-gray-400" /> Layout & Spacing
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Corner Radius (Buttons & Cards)
                </label>
                <div className="flex flex-wrap gap-2">
                  {RADIUS_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleUpdate('radius', p.value)}
                      className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                        theme.radius === p.value
                          ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Colors Grid */}
            <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2 border-b border-gray-800 pb-2">
                <PaintBucket className="w-5 h-5 text-emerald-500" /> Color Palette
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Background & Text */}
                <div className="space-y-3 p-4 bg-gray-950 rounded-lg border border-gray-800/50">
                  <h4 className="text-sm font-bold text-gray-300">Base</h4>
                  <ColorField
                    label="Background"
                    value={theme.background}
                    onChange={(v) => handleUpdate('background', v)}
                  />
                  <ColorField
                    label="Text (Foreground)"
                    value={theme.foreground}
                    onChange={(v) => handleUpdate('foreground', v)}
                  />
                </div>

                {/* Brand Colors */}
                <div className="space-y-3 p-4 bg-gray-950 rounded-lg border border-gray-800/50">
                  <h4 className="text-sm font-bold text-gray-300">Brand (Primary)</h4>
                  <ColorField
                    label="Primary Color"
                    value={theme.primary}
                    onChange={(v) => handleUpdate('primary', v)}
                  />
                  <ColorField
                    label="Primary Text"
                    value={theme.primaryForeground}
                    onChange={(v) => handleUpdate('primaryForeground', v)}
                  />
                  <ColorField
                    label="Accent Glow"
                    value={theme.accent}
                    onChange={(v) => handleUpdate('accent', v)}
                  />
                </div>

                {/* Secondary */}
                <div className="space-y-3 p-4 bg-gray-950 rounded-lg border border-gray-800/50">
                  <h4 className="text-sm font-bold text-gray-300">Secondary</h4>
                  <ColorField
                    label="Secondary Color"
                    value={theme.secondary}
                    onChange={(v) => handleUpdate('secondary', v)}
                  />
                  <ColorField
                    label="Secondary Text"
                    value={theme.secondaryForeground}
                    onChange={(v) => handleUpdate('secondaryForeground', v)}
                  />
                </div>

                {/* Cards */}
                <div className="space-y-3 p-4 bg-gray-950 rounded-lg border border-gray-800/50">
                  <h4 className="text-sm font-bold text-gray-300">Cards</h4>
                  <ColorField
                    label="Card Background"
                    value={theme.card}
                    onChange={(v) => handleUpdate('card', v)}
                  />
                  <ColorField
                    label="Card Text"
                    value={theme.cardForeground}
                    onChange={(v) => handleUpdate('cardForeground', v)}
                  />
                </div>

                {/* Muted */}
                <div className="space-y-3 p-4 bg-gray-950 rounded-lg border border-gray-800/50">
                  <h4 className="text-sm font-bold text-gray-300">Muted (Subtle)</h4>
                  <ColorField
                    label="Muted Background"
                    value={theme.muted}
                    onChange={(v) => handleUpdate('muted', v)}
                  />
                  <ColorField
                    label="Muted Text"
                    value={theme.mutedForeground}
                    onChange={(v) => handleUpdate('mutedForeground', v)}
                  />
                </div>

                {/* UI Elements */}
                <div className="space-y-3 p-4 bg-gray-950 rounded-lg border border-gray-800/50">
                  <h4 className="text-sm font-bold text-gray-300">UI Elements</h4>
                  <ColorField
                    label="Borders"
                    value={theme.border}
                    onChange={(v) => handleUpdate('border', v)}
                  />
                  <ColorField
                    label="Inputs"
                    value={theme.input}
                    onChange={(v) => handleUpdate('input', v)}
                  />
                  <ColorField
                    label="Focus Ring"
                    value={theme.ring}
                    onChange={(v) => handleUpdate('ring', v)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview - Right Column */}
          <div className="xl:col-span-1">
            <div className="sticky top-6 p-5 bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4 border-b border-gray-800 pb-2">
                Live Interactive Preview
              </h3>

              <div
                className="p-5 rounded-lg border shadow-inner transition-colors duration-300 space-y-5"
                style={{
                  backgroundColor: theme.background,
                  color: theme.foreground,
                  borderColor: theme.border,
                }}
              >
                {/* Sample Card */}
                <div
                  className="p-4 border transition-colors duration-300 shadow-sm"
                  style={{
                    backgroundColor: theme.card,
                    color: theme.cardForeground,
                    borderColor: theme.border,
                    borderRadius: theme.radius,
                  }}
                >
                  <h4 className="font-bold text-lg mb-1">Example Card</h4>
                  <p style={{ color: theme.mutedForeground }} className="text-sm mb-3">
                    This previews your background, card, and muted text colors dynamically.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="px-4 py-2 text-sm font-semibold transition-transform hover:scale-105"
                      style={{
                        backgroundColor: theme.primary,
                        color: theme.primaryForeground,
                        borderRadius: theme.radius,
                        boxShadow: `0 0 10px ${theme.accent}40`,
                      }}
                    >
                      Primary Action
                    </button>
                    <button
                      className="px-4 py-2 text-sm font-semibold transition-colors border"
                      style={{
                        backgroundColor: theme.secondary,
                        color: theme.secondaryForeground,
                        borderColor: theme.border,
                        borderRadius: theme.radius,
                      }}
                    >
                      Secondary
                    </button>
                  </div>
                </div>

                {/* Sample Input/Muted block */}
                <div
                  className="p-3 border flex items-center justify-between"
                  style={{
                    backgroundColor: theme.muted,
                    borderColor: theme.border,
                    borderRadius: theme.radius,
                  }}
                >
                  <span style={{ color: theme.mutedForeground }} className="text-xs font-mono">
                    Muted block
                  </span>
                  <input
                    type="text"
                    placeholder="Input field..."
                    disabled
                    className="px-2 py-1 text-xs border"
                    style={{
                      backgroundColor: theme.input,
                      borderColor: theme.border,
                      borderRadius: theme.radius,
                      color: theme.foreground,
                    }}
                  />
                </div>

                <div className="flex justify-center">
                  <a
                    href="#"
                    style={{ color: theme.primary }}
                    className="text-sm font-medium hover:underline decoration-dashed"
                  >
                    Hover Link Example
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
