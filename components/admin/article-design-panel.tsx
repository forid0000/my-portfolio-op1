'use client';

import { Switch } from '@/components/ui/switch';
import {
  ARTICLE_ALIGNS,
  ARTICLE_FONTS,
  ARTICLE_HEADERS,
  ARTICLE_SIZES,
  ARTICLE_WIDTHS,
  type ArticleDesign,
} from '@/lib/articles-model';

const optionClass = (active: boolean) =>
  `rounded-lg border px-3 py-2 text-left text-sm transition-all ${
    active
      ? 'border-emerald-500/70 bg-emerald-600/15 text-emerald-200'
      : 'border-gray-800 bg-gray-950 text-gray-300 hover:border-gray-600'
  }`;

const FONT_SAMPLE: Record<string, string> = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
  rounded: "ui-rounded, 'SF Pro Rounded', Nunito, system-ui, sans-serif",
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-gray-300">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

/** How the article looks to readers: font, size, width, header style and which extras to show. */
export default function ArticleDesignPanel({
  design,
  onChange,
}: {
  design: ArticleDesign;
  onChange: (next: ArticleDesign) => void;
}) {
  const set = <K extends keyof ArticleDesign>(key: K, value: ArticleDesign[K]) =>
    onChange({ ...design, [key]: value });

  return (
    <div className="space-y-6">
      <Group title="Header">
        <div className="grid gap-2">
          {(Object.keys(ARTICLE_HEADERS) as (keyof typeof ARTICLE_HEADERS)[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => set('header', key)}
              aria-pressed={design.header === key}
              className={optionClass(design.header === key)}
            >
              <span className="block font-medium">{ARTICLE_HEADERS[key].label}</span>
              <span className="block text-xs text-gray-500">{ARTICLE_HEADERS[key].hint}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Font">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ARTICLE_FONTS) as (keyof typeof ARTICLE_FONTS)[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => set('font', key)}
              aria-pressed={design.font === key}
              className={optionClass(design.font === key)}
            >
              <span className="block text-base" style={{ fontFamily: FONT_SAMPLE[key] }}>
                Aa আ ع
              </span>
              <span className="block text-xs text-gray-500">{ARTICLE_FONTS[key].label}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Text size">
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(ARTICLE_SIZES) as (keyof typeof ARTICLE_SIZES)[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => set('size', key)}
              aria-pressed={design.size === key}
              className={`${optionClass(design.size === key)} text-center`}
            >
              {ARTICLE_SIZES[key].label}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Page width">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(ARTICLE_WIDTHS) as (keyof typeof ARTICLE_WIDTHS)[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => set('width', key)}
              aria-pressed={design.width === key}
              className={`${optionClass(design.width === key)} text-center`}
            >
              {ARTICLE_WIDTHS[key].label}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Text alignment">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(ARTICLE_ALIGNS) as (keyof typeof ARTICLE_ALIGNS)[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => set('align', key)}
              aria-pressed={design.align === key}
              className={`${optionClass(design.align === key)} text-center`}
            >
              {ARTICLE_ALIGNS[key]}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Accent color for this article">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={!!design.accent}
              onChange={(e) => set('accent', e.target.checked ? '#0d9488' : '')}
              className="accent-emerald-500"
            />
            Use my own color
          </label>
          {design.accent && (
            <input
              type="color"
              value={design.accent}
              onChange={(e) => set('accent', e.target.value)}
              aria-label="Accent color"
              className="h-8 w-10 cursor-pointer rounded border border-gray-700 bg-gray-900 p-0.5"
            />
          )}
        </div>
        <p className="text-xs text-gray-500">
          Colors links, quotes and bullets. Leave it off to follow the site&apos;s theme.
        </p>
      </Group>

      <Group title="Show on the page">
        <Toggle
          label="Table of contents"
          checked={design.showToc}
          onChange={(v) => set('showToc', v)}
        />
        <Toggle label="Date" checked={design.showDate} onChange={(v) => set('showDate', v)} />
        <Toggle
          label="Reading time"
          checked={design.showReadingTime}
          onChange={(v) => set('showReadingTime', v)}
        />
        <Toggle label="Tags" checked={design.showTags} onChange={(v) => set('showTags', v)} />
        <Toggle label="Author" checked={design.showAuthor} onChange={(v) => set('showAuthor', v)} />
        <Toggle
          label="Share button"
          checked={design.showShare}
          onChange={(v) => set('showShare', v)}
        />
      </Group>
    </div>
  );
}
