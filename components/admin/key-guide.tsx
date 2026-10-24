'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Copy,
  ExternalLink,
  Lightbulb,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { GUIDES_CHECKED, type FieldHelp, type Guide, type SetupItem } from '@/lib/admin-guides';

/** A command or file the reader has to paste somewhere: shown in a box with a copy button. */
function CodeBox({ text }: { text: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy: select the text and copy it by hand.');
    }
  };
  return (
    <div className="relative mt-2">
      <pre className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-950 p-3 pr-12 font-mono text-xs leading-relaxed text-emerald-200">
        {text}
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy to the clipboard"
        title="Copy"
        className="absolute right-2 top-2 rounded-md border border-gray-700 bg-gray-900 p-1.5 text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-100"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * "How do I get this?": a guide for beginners, open or closed. It says what the key is, what it costs,
 * what happens without it, the exact steps, the provider's own pages, the usual mistakes, and how
 * to check that it worked. Content comes from lib/admin-guides.ts.
 */
export function KeyGuide({ guide, defaultOpen = false }: { guide: Guide; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="group rounded-xl border border-emerald-900/50 bg-emerald-950/10"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 text-sm text-emerald-300 transition-colors hover:bg-emerald-950/30 [&::-webkit-details-marker]:hidden">
        <BookOpen className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">How to get this</span>
          <span className="block truncate text-xs font-normal text-emerald-200/70">
            {guide.title} · {guide.time}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-5 border-t border-emerald-900/40 px-4 py-4 text-sm text-gray-300">
        <p className="leading-relaxed">{guide.why}</p>

        <div className="grid gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
            <p className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wider text-gray-500">
              <Wallet className="h-3.5 w-3.5" /> Cost
            </p>
            <p className="text-gray-300">{guide.cost}</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
            <p className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wider text-gray-500">
              <Clock className="h-3.5 w-3.5" /> Time
            </p>
            <p className="text-gray-300">{guide.time}</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
            <p className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wider text-gray-500">
              <AlertTriangle className="h-3.5 w-3.5" /> If you skip it
            </p>
            <p className="text-gray-300">{guide.ifSkipped}</p>
          </div>
        </div>

        <ol className="space-y-4">
          {guide.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600/20 text-xs font-bold text-emerald-300"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-100">{step.title}</p>
                {step.detail && (
                  <p className="mt-1 text-[13px] leading-relaxed text-gray-400">{step.detail}</p>
                )}
                {step.code && <CodeBox text={step.code} />}
              </div>
            </li>
          ))}
        </ol>

        {guide.providers && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              Settings for popular providers
            </p>
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-left text-xs">
                <thead>
                  <tr className="text-gray-500">
                    {['Provider', 'Host', 'Port', 'Username', 'Password'].map((h) => (
                      <th key={h} className="border-b border-gray-800 px-2 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guide.providers.map((p) => (
                    <tr key={p.name} className="align-top">
                      <td className="border-b border-gray-800/70 px-2 py-2 font-semibold text-gray-100">
                        {p.name}
                        <span className="mt-1 block text-[11px] font-normal text-gray-500">
                          {p.note}
                        </span>
                      </td>
                      <td className="border-b border-gray-800/70 px-2 py-2 font-mono text-emerald-300">
                        {p.host}
                      </td>
                      <td className="border-b border-gray-800/70 px-2 py-2 font-mono text-emerald-300">
                        {p.port}
                      </td>
                      <td className="border-b border-gray-800/70 px-2 py-2 text-gray-300">
                        {p.username}
                      </td>
                      <td className="border-b border-gray-800/70 px-2 py-2 text-gray-300">
                        {p.password}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {guide.links.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              Official pages (open in a new tab)
            </p>
            <ul className="flex flex-wrap gap-2">
              {guide.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-200 transition-colors hover:border-emerald-600 hover:text-emerald-300"
                  >
                    {link.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-yellow-900/40 bg-yellow-950/20 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-yellow-500">
            <Lightbulb className="h-3.5 w-3.5" /> Good to know
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-yellow-100/80 marker:text-yellow-600">
            {guide.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> How to check it worked
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-emerald-100/80 marker:text-emerald-600">
            {guide.check.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-gray-600">
          Steps checked against the providers’ official documentation in {GUIDES_CHECKED}. Their
          screens change now and then; the official pages above always win.
        </p>
      </div>
    </details>
  );
}

/** The small "where do I find this value?" note under a box. */
export function FieldHelpText({ help }: { help?: FieldHelp }) {
  if (!help) return null;
  return (
    <div className="space-y-0.5 text-[11px] leading-relaxed">
      <p className="text-gray-400">
        <span className="font-semibold text-emerald-400">Where to find it:</span> {help.where}
      </p>
      {help.example && (
        <p className="text-gray-500">
          Example: <span className="font-mono text-gray-400">{help.example}</span>
        </p>
      )}
      {help.mistake && <p className="text-yellow-500/80">Watch out: {help.mistake}</p>}
    </div>
  );
}

/** What is set up and what is still missing, with a jump to each section. */
export function SetupChecklist({ items }: { items: SetupItem[] }) {
  const required = items.filter((i) => !i.optional);
  const done = required.filter((i) => i.done).length;
  return (
    <section
      aria-label="Setup checklist"
      className="space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
          Your setup checklist
        </h2>
        <span className="rounded-full border border-emerald-800/50 bg-emerald-950/50 px-2.5 py-0.5 font-mono text-[11px] text-emerald-400">
          {done} of {required.length} essentials done
        </span>
      </div>
      <p className="max-w-2xl text-xs leading-relaxed text-gray-500">
        New here? Go from top to bottom. Each section below has a green{' '}
        <strong>How to get this</strong> box with the exact steps, the official page to open, and
        how to check it worked. The things marked optional can wait.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.href}
              className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-950/50 p-3 transition-colors hover:border-emerald-800"
            >
              {item.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />
              )}
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-200">
                  {item.label}
                  {item.optional && (
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-gray-400">
                      optional
                    </span>
                  )}
                </span>
                <span className="block text-xs text-gray-500">{item.detail}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
