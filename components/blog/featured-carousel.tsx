// components/blog/featured-carousel.tsx
'use client';

import React, { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { format } from 'date-fns';
import { ArrowRight, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

// Matches your API structure
interface BlogPost {
  id: number;
  title: string;
  description: string;
  slug: string;
  published_at: string;
  tag_list: string[];
  reading_time_minutes: number;
  cover_image: string | null;
  user: {
    name: string;
    profile_image_90: string;
  };
}

export default function FeaturedCarousel({ posts }: { posts: BlogPost[] }) {
  // 1. Setup Embla Carousel with Loop
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 30 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 2. Autoplay Logic (Custom implementation to avoid extra dependencies)
  const AUTOPLAY_INTERVAL = 5000; // 5 seconds

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);

    // Auto-scroll timer
    const intervalId = setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      }
    }, AUTOPLAY_INTERVAL);

    // Stop autoplay on interaction
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
      {/* Decorative Border/Glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-purple-600/30 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>

      <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm shadow-2xl">
        {/* Embla Viewport */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {posts.map((post) => (
              <div className="flex-[0_0_100%] min-w-0 relative" key={post.id}>
                <Link
                  href={`/articles/${post.slug}`}
                  className="block relative h-[400px] md:h-[500px] w-full"
                >
                  {/* Background Image with Overlay */}
                  {post.cover_image ? (
                    <>
                      <Image
                        src={post.cover_image}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-1000 group-hover:scale-105"
                        priority
                      />
                      {/* Cyber Grid Overlay on Image */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_2px,transparent_2px),linear-gradient(90deg,rgba(0,0,0,0.1)_2px,transparent_2px)] bg-[size:30px_30px] opacity-20" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-secondary/20 flex items-center justify-center">
                      <span className="font-mono text-muted-foreground">No Image Signal</span>
                    </div>
                  )}

                  {/* Gradient to make text readable */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent pt-20" />

                  {/* Content Container */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-20">
                    <div className="max-w-3xl space-y-4">
                      {/* Tags */}
                      <div className="flex gap-2 mb-2">
                        {post.tag_list.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-[10px] md:text-xs font-mono bg-primary/20 border border-primary/30 text-primary rounded-md uppercase tracking-wider backdrop-blur-md"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Title */}
                      <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight font-sans drop-shadow-lg">
                        {post.title}
                      </h2>

                      {/* Description - Desktop only */}
                      <p className="hidden md:block text-muted-foreground/90 text-lg line-clamp-2 max-w-2xl">
                        {post.description}
                      </p>

                      {/* Meta Data */}
                      <div className="flex items-center gap-4 text-sm text-gray-300 font-mono pt-2">
                        <div className="flex items-center gap-2">
                          <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/20">
                            <Image src={post.user.profile_image_90} alt={post.user.name} fill />
                          </div>
                          <span className="text-primary/80">@{post.user.name}</span>
                        </div>
                        <span className="h-4 w-px bg-white/20" />
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : ''}
                        </div>
                        <span className="h-4 w-px bg-white/20" />
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {post.reading_time_minutes} min read
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons (Arrows) */}
        <button
          onClick={scrollPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 border border-white/10 text-white hover:bg-primary/80 hover:text-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm z-30"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={scrollNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 border border-white/10 text-white hover:bg-primary/80 hover:text-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm z-30"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Dots Navigation */}
        <div className="absolute bottom-4 right-6 md:bottom-10 md:right-10 flex gap-2 z-30">
          {posts.map((_, idx) => (
            <button
              key={idx}
              onClick={() => emblaApi?.scrollTo(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === selectedIndex ? 'w-8 bg-primary' : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
