'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { ArticleCardItem } from '@/lib/articles-model';
import ArticleCard from '@/components/articles/article-card';

/**
 * The article grid with a search box and tag filters. Every card is in the server HTML; this only
 * hides the ones that do not match, so the page works (and is indexed) without JavaScript.
 */
export default function ArticlesIndex({
  items,
  emptyText,
}: {
  items: ArticleCardItem[];
  emptyText: string;
}) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) for (const t of item.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([t]) => t);
  }, [items]);

  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          (!tag || item.tags.includes(tag)) &&
          (!needle ||
            item.title.toLowerCase().includes(needle) ||
            item.description.toLowerCase().includes(needle) ||
            item.tags.some((t) => t.toLowerCase().includes(needle)))
      ),
    [items, tag, needle]
  );

  const filtering = !!tag || !!needle;

  return (
    <div>
      {items.length > 3 && (
        <div className="mb-8 space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles"
              aria-label="Search articles"
              dir="auto"
              className="w-full rounded-xl border border-border bg-input py-2.5 ps-10 pe-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(tag === t ? null : t)}
                  aria-pressed={tag === t}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    tag === t
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
              {filtering && (
                <button
                  type="button"
                  onClick={() => {
                    setTag(null);
                    setQuery('');
                  }}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 py-20 text-center">
          <p className="text-muted-foreground">
            {filtering ? 'No articles match your search.' : emptyText}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <ArticleCard key={item.key} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
