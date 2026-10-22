'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, ArrowRight, ShieldCheck } from 'lucide-react';
import { renderKitIcon, getKitColor, type KitsContent } from '@/lib/kits-registry';
import type { IconMap } from '@/lib/icons/icon-data';

export function KitsNavClient({
  content,
  icons,
  children,
}: {
  content: KitsContent;
  /** Server-resolved SVG data for each tool's icon (see lib/icons). */
  icons: IconMap;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="flex-1 px-4 pt-24 pb-8 md:px-8 md:pt-28 max-w-7xl mx-auto w-full z-10">
      {/* Page Title */}
      <div className="mb-4">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-1">
          {content.pageHeading} <span className="text-primary">{content.pageHighlight}</span>
        </h1>
        <p className="text-muted-foreground max-w-lg text-sm">{content.pageSubtext}</p>
      </div>

      {/* Tools Navigation Bar */}
      <div className="flex flex-wrap gap-2 mb-4 border-b border-border/20 pb-3">
        {content.tools.map((tool) => {
          const isActive = pathname === `/kits/${tool.key}`;
          const color = getKitColor(tool.accentColor);
          return (
            <Link
              key={tool.key}
              href={`/kits/${tool.key}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                isActive
                  ? `${color.bg} ${color.text} ${color.border}`
                  : 'hover:bg-white/5 border-transparent hover:border-white/10 text-muted-foreground'
              }`}
            >
              {renderKitIcon(icons[tool.icon], <ShieldCheck />, 'w-4 h-4')}
              {tool.name}
            </Link>
          );
        })}
      </div>

      {/* The Selected Tool Renders Here */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[300px]">
        {children}
      </div>

      {/* BOTTOM SECTION: About & Navigation Grid */}
      <div className="mt-20 pt-10 border-t border-border/20">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" />
          {content.exploreHeading}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {content.tools.map((tool) => {
            const isActive = pathname === `/kits/${tool.key}`;
            const color = getKitColor(tool.accentColor);
            return (
              <Link
                key={tool.key}
                href={`/kits/${tool.key}`}
                className={`group relative p-4 rounded-xl border transition-all duration-300 overflow-hidden ${
                  isActive
                    ? `${color.bg} ${color.border}`
                    : 'bg-card/30 border-border/40 hover:bg-card/80 hover:border-primary/40'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      isActive
                        ? `${color.bg} ${color.text}`
                        : 'bg-primary/10 text-muted-foreground group-hover:text-primary group-hover:bg-primary/20'
                    }`}
                  >
                    {renderKitIcon(icons[tool.icon], <ShieldCheck />, 'w-4 h-4')}
                  </div>
                  {!isActive && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  )}
                </div>

                <h3
                  className={`font-medium mb-1 transition-colors ${
                    isActive ? color.text : 'text-foreground group-hover:text-primary'
                  }`}
                >
                  {tool.name}
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {tool.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
