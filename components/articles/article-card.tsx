import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, FileText, Heart, MessageCircle } from 'lucide-react';
import { formatArticleDate, type ArticleCardItem } from '@/lib/articles-model';

/** One article in the list. Plain markup, so it renders on the server and inside the filter. */
export default function ArticleCard({ item }: { item: ArticleCardItem }) {
  return (
    <Link
      href={item.href}
      className="group flex flex-col h-full bg-card border border-border/60 rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary/50 hover:-translate-y-1 hover:shadow-glow-sm"
    >
      <div className="aspect-video relative w-full bg-primary/5 overflow-hidden">
        {item.cover ? (
          <Image
            src={item.cover}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-12 h-12 text-primary/25" />
          </div>
        )}
        {item.tags.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider bg-scrim/60 backdrop-blur-md border border-on-scrim/10 rounded text-on-scrim/90 shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 terminal:font-mono">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatArticleDate(item.publishedAt)}
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary/15 text-foreground/80">
            <Clock className="w-3 h-3" />
            {item.minutes} min
          </span>
        </div>

        <h2
          dir="auto"
          className="text-xl font-bold leading-snug mb-3 group-hover:text-primary transition-colors line-clamp-2"
        >
          {item.title}
        </h2>

        <p
          dir="auto"
          className="text-sm text-muted-foreground line-clamp-3 mb-6 flex-1 leading-relaxed"
        >
          {item.description}
        </p>

        <div className="pt-5 mt-auto border-t border-border/40 flex items-center justify-between">
          {item.author ? (
            <div className="flex items-center gap-2.5 min-w-0">
              {item.author.image && (
                <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border/50 shrink-0">
                  <Image
                    src={item.author.image}
                    alt=""
                    fill
                    sizes="24px"
                    className="object-cover"
                  />
                </div>
              )}
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate">
                {item.author.name}
              </span>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
            <span className="flex items-center gap-1.5" title="Reactions">
              <Heart className="w-3.5 h-3.5" />
              {item.reactions}
            </span>
            <span className="flex items-center gap-1.5" title="Comments">
              <MessageCircle className="w-3.5 h-3.5" />
              {item.comments}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
