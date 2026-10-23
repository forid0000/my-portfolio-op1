'use client';

import React, { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { Calendar, Clock, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { formatArticleDate, type ArticleCardItem } from '@/lib/articles-model';

/** The newest few articles as a banner slider on the articles page. */
export default function FeaturedCarousel({ posts }: { posts: ArticleCardItem[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 30 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const AUTOPLAY_INTERVAL = 5000; // 5 seconds

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);

    // Auto-scroll until the visitor takes over (and never for reduced motion).
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const intervalId = reduced
      ? undefined
      : setInterval(() => {
          if (emblaApi.canScrollNext()) emblaApi.scrollNext();
        }, AUTOPLAY_INTERVAL);
    emblaApi.on('pointerDown', () => clearInterval(intervalId));

    return () => {
      clearInterval(intervalId);
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  if (!posts || posts.length === 0) return null;

  return (
    <div className="relative w-full max-w-7xl mx-auto mb-16 group cursor-default">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>

      <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-card shadow-2xl">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {posts.map((post, index) => (
              <div className="flex-[0_0_100%] min-w-0 relative" key={post.key}>
                <Link
                  href={post.href}
                  className="block relative h-[400px] md:h-[500px] w-full bg-secondary/20"
                >
                  {post.cover ? (
                    <Image
                      src={post.cover}
                      alt={post.title}
                      fill
                      sizes="(max-width: 1280px) 100vw, 1280px"
                      className="object-cover transition-transform duration-1000 group-hover:scale-105"
                      priority={index === 0}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="h-16 w-16 text-muted-foreground/40" />
                    </div>
                  )}

                  {/* Dark film so the light text stays readable on any picture and any palette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-scrim via-scrim/60 to-transparent pt-20" />

                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-20">
                    <div className="max-w-3xl space-y-4">
                      {post.tags.length > 0 && (
                        <div className="flex gap-2 mb-2">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-[10px] md:text-xs bg-on-scrim/15 border border-on-scrim/25 text-on-scrim rounded-md uppercase tracking-wider backdrop-blur-md"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <h2
                        dir="auto"
                        className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight text-on-scrim leading-tight drop-shadow-lg"
                      >
                        {post.title}
                      </h2>

                      {post.description && (
                        <p
                          dir="auto"
                          className="hidden md:block text-on-scrim/85 text-lg line-clamp-2 max-w-2xl"
                        >
                          {post.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-on-scrim/80 pt-2">
                        {post.author && (
                          <span className="flex items-center gap-2">
                            {post.author.image && (
                              <span className="relative w-6 h-6 rounded-full overflow-hidden border border-on-scrim/20">
                                <Image src={post.author.image} alt="" fill sizes="24px" />
                              </span>
                            )}
                            {post.author.name}
                          </span>
                        )}
                        {post.publishedAt && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {formatArticleDate(post.publishedAt)}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {post.minutes} min read
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {posts.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-scrim/40 border border-on-scrim/10 text-on-scrim hover:bg-primary/80 hover:text-primary-foreground transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 backdrop-blur-sm z-30"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-scrim/40 border border-on-scrim/10 text-on-scrim hover:bg-primary/80 hover:text-primary-foreground transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 backdrop-blur-sm z-30"
              aria-label="Next slide"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="absolute bottom-4 right-6 md:bottom-10 md:right-10 flex gap-2 z-30">
              {posts.map((post, idx) => (
                <button
                  key={post.key}
                  onClick={() => emblaApi?.scrollTo(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === selectedIndex
                      ? 'w-8 bg-primary'
                      : 'w-2 bg-on-scrim/30 hover:bg-on-scrim/50'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
