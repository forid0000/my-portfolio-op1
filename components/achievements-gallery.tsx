'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { GLOBAL_CONTENT_DEFAULTS } from '@/lib/content-defaults';

// Type matches our gallery item structure (sourced dynamically from Cloudinary via the CMS)
export type GalleryItem = {
  id: number;
  src: string;
  alt: string;
  date: string;
  width: number;
  height: number;
  category: 'blessings' | 'memories' | string;
  tags?: string[];
};

const ITEMS_PER_PAGE = 12;

// --- Optimized Component: Interactive Card (pure CSS reveal) ---
const InteractiveCard = ({
  item,
  index,
  onClick,
  ownerName,
}: {
  item: GalleryItem;
  index: number;
  onClick: () => void;
  ownerName: string;
}) => {
  const seoAlt = `${item.alt} - ${ownerName} Portfolio`;
  return (
    <div
      style={{ animationDelay: `${(index % 6) * 0.05}s` }}
      className="animate-fade-in-up relative group block overflow-hidden bg-muted/5 rounded-2xl md:rounded-[2rem] border border-white/5 cursor-pointer break-inside-avoid shadow-lg shadow-black/10 transition-all duration-500 hover:shadow-[0_0_40px_rgba(var(--primary),0.2)] hover:border-primary/50 hover:-translate-y-2 hover:scale-[1.02]"
      onClick={onClick}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: `${item.width} / ${item.height}`,
        }}
        className="overflow-hidden"
      >
        <Image
          src={item.src}
          alt={seoAlt}
          title={seoAlt}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Advanced Glassmorphism Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out z-20">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md -z-10" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <p className="text-white font-bold text-sm md:text-base leading-tight mb-1 drop-shadow-md transform transition-transform duration-500 delay-75 group-hover:translate-x-1">
          {item.alt}
        </p>
        <div className="flex items-center text-white/70 text-[10px] md:text-xs transform transition-transform duration-500 delay-100 group-hover:translate-x-1">
          <Calendar className="w-3 h-3 mr-1.5 opacity-70 text-primary" />
          {new Date(item.date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
          })}
        </div>
      </div>
    </div>
  );
};

export default function AchievementsGallery({
  items = [],
  ownerName = GLOBAL_CONTENT_DEFAULTS.brandName,
  heading = 'Gallery',
  highlight = 'Moments',
  subtext = 'A collection of moments from my work and life.',
}: {
  items?: GalleryItem[];
  ownerName?: string;
  heading?: string;
  highlight?: string;
  subtext?: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const touchStartX = useRef<number | null>(null);

  // Distinct categories, in order of first appearance - fully dynamic / CMS-driven
  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const it of items) {
      if (it.category && !seen.includes(it.category)) seen.push(it.category);
    }
    return seen;
  }, [items]);

  const [activeTab, setActiveTab] = useState<string>('');

  // Keep the active tab valid as categories load/change
  useEffect(() => {
    if (categories.length && !categories.includes(activeTab)) {
      setActiveTab(categories[0]);
    }
  }, [categories, activeTab]);

  const currentGallery = useMemo(
    () => items.filter((item) => item.category === activeTab),
    [items, activeTab]
  );
  const visibleCount = visibleCounts[activeTab] ?? ITEMS_PER_PAGE;
  const visibleData = currentGallery.slice(0, visibleCount);
  const hasMore = visibleCount < currentGallery.length;

  const handleLoadMore = () => {
    setVisibleCounts((prev) => ({
      ...prev,
      [activeTab]: (prev[activeTab] ?? ITEMS_PER_PAGE) + ITEMS_PER_PAGE,
    }));
  };

  const handleTabSwitch = (tab: string) => {
    setActiveTab(tab);
  };

  // --- Expert Modal Logic: Navigation ---
  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (selectedIndex === null) return;
      setSelectedIndex((prev) =>
        prev !== null && prev > 0 ? prev - 1 : currentGallery.length - 1
      );
    },
    [selectedIndex, currentGallery]
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (selectedIndex === null) return;
      setSelectedIndex((prev) =>
        prev !== null && prev < currentGallery.length - 1 ? prev + 1 : 0
      );
    },
    [selectedIndex, currentGallery]
  );

  // Keyboard support for expert feel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, handlePrev, handleNext]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const delta = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(delta) < 50) return;
      if (delta < 0) handleNext();
      else handlePrev();
    },
    [handleNext, handlePrev]
  );

  const selectedImage = selectedIndex !== null ? currentGallery[selectedIndex] : null;

  return (
    <section
      id="gallery"
      className="section-spacing relative overflow-hidden bg-transparent selection:bg-primary selection:text-primary-foreground"
    >
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-10 md:mb-14 animate-fade-in-up">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight uppercase">
            {heading} <span className="text-primary italic">{highlight}</span>
          </h2>

          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto mb-8">
            {subtext}
          </p>

          {categories.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8 p-1.5 bg-muted/10 rounded-full border border-white/5 backdrop-blur-sm shadow-inner max-w-fit mx-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleTabSwitch(cat)}
                  className={`relative px-5 py-2 md:px-6 md:py-2.5 text-xs md:text-sm font-bold rounded-full uppercase tracking-widest transition-all duration-500 overflow-hidden ${
                    activeTab === cat
                      ? 'text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)]'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {activeTab === cat && (
                    <div
                      className="absolute inset-0 bg-primary/90 backdrop-blur-md rounded-full -z-10"
                      style={{ animation: 'fade-in 0.3s ease-out forwards' }}
                    />
                  )}
                  <span className="relative z-10">{cat}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          key={activeTab}
          className="animate-fade-in-up columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3 md:gap-4 space-y-3 md:space-y-4"
        >
          {visibleData.map((item, index) => (
            <InteractiveCard
              key={`${activeTab}-${item.id}`}
              item={item}
              index={index}
              ownerName={ownerName}
              onClick={() => setSelectedIndex(index)}
            />
          ))}
        </div>

        {/* --- Unified Tech-Styled Load More Button --- */}
        {hasMore && (
          <div className="flex flex-col items-center justify-center mt-20 space-y-6">
            <div className="relative group">
              {/* Decorative Tech logic: outer brackets */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-primary/40 group-hover:border-primary transition-colors duration-500" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-primary/40 group-hover:border-primary transition-colors duration-500" />

              <button
                onClick={handleLoadMore}
                className="fire-button relative px-10 py-4 flex items-center gap-3 group"
              >
                <span className="text-xs font-black tracking-[0.3em] uppercase">
                  Expand Visual Archive
                </span>
                <div className="w-8 h-px bg-primary-foreground/30 group-hover:w-12 transition-all duration-500" />
                <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform duration-500" />
              </button>
            </div>

            {/* Sub-label: System Status / Counter */}
            <div className="flex items-center gap-4 text-[10px] sm:text-xs terminal:font-mono tracking-widest text-muted-foreground/60">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                LOAD_STATE: STABLE
              </span>
              <span className="w-px h-3 bg-white/10" />
              <span>
                SYNCED: {visibleData.length} // {currentGallery.length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* --- Lightbox (solid translucency, no backdrop-blur for Android perf) --- */}
      <Dialog
        open={selectedIndex !== null}
        onOpenChange={(open) => !open && setSelectedIndex(null)}
      >
        <DialogContent
          className="max-w-full w-full max-h-screen h-screen flex flex-col justify-center items-center p-0 border-none bg-black/95 z-[999] outline-none overflow-hidden backdrop-blur-xl"
          showCloseButton={false} // Custom exit button for expert feel
          overlayClassName="bg-black/90 backdrop-blur-xl transition-all duration-500"
        >
          <DialogTitle className="sr-only">Image Immersive View</DialogTitle>

          <div
            className="relative w-full h-full flex items-center justify-center p-4 md:p-12 overflow-hidden animate-fade-in-up"
            style={{ animationDuration: '0.4s' }}
            onClick={() => setSelectedIndex(null)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Top Bar Navigation HUD */}
            <div className="absolute top-0 inset-x-0 h-24 flex items-center justify-between px-6 z-50 pointer-events-none">
              <div className="bg-white/10 border border-white/10 px-4 py-2 rounded-full pointer-events-auto">
                <span className="text-[10px] terminal:font-mono text-white/50 tracking-widest uppercase">
                  {selectedIndex !== null ? `${selectedIndex + 1} / ${currentGallery.length}` : ''}
                </span>
              </div>
              <button
                onClick={() => setSelectedIndex(null)}
                className="group w-12 h-12 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-white hover:bg-white hover:text-black transition-all duration-500 pointer-events-auto shadow-2xl"
              >
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>

            {/* Side Navigation HUD */}
            <div className="absolute inset-y-0 left-6 flex items-center z-40 pointer-events-none">
              <button
                onClick={handlePrev}
                className="flex w-12 h-12 md:w-16 md:h-16 items-center justify-center rounded-full bg-white/10 border border-white/10 text-white hover:bg-primary hover:text-primary-foreground hover:scale-110 active:scale-95 transition-all duration-500 pointer-events-auto shadow-2xl"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
              </button>
            </div>
            <div className="absolute inset-y-0 right-6 flex items-center z-40 pointer-events-none">
              <button
                onClick={handleNext}
                className="flex w-12 h-12 md:w-16 md:h-16 items-center justify-center rounded-full bg-white/10 border border-white/10 text-white hover:bg-primary hover:text-primary-foreground hover:scale-110 active:scale-95 transition-all duration-500 pointer-events-auto shadow-2xl"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
              </button>
            </div>

            {selectedImage && (
              <div
                key={selectedImage.id}
                className="animate-fade-in-up relative w-full h-full flex flex-col items-center justify-center pointer-events-auto cursor-default"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
              >
                <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
                  <div className="w-[50vw] h-[50vh] bg-primary/20 rounded-full blur-[100px] opacity-50 mix-blend-screen" />
                </div>

                <div
                  className="relative max-w-[95vw] max-h-[75vh] flex flex-col justify-center rounded-2xl md:rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 group/img ring-1 ring-white/5 transition-transform duration-500 hover:scale-[1.01]"
                  style={{ aspectRatio: `${selectedImage.width} / ${selectedImage.height}` }}
                >
                  <Image
                    src={selectedImage.src}
                    alt={`${selectedImage.alt} - ${ownerName} Portfolio`}
                    title={`${selectedImage.alt} - ${ownerName} Portfolio`}
                    width={selectedImage.width}
                    height={selectedImage.height}
                    className="object-contain w-full h-full shadow-2xl"
                    priority
                  />
                </div>

                {/* Metadata Info HUD - Advanced Glassmorphism */}
                <div className="mt-8 md:mt-10 text-center relative z-20">
                  <div className="bg-black/40 backdrop-blur-md border border-white/10 px-10 py-5 rounded-[2.5rem] flex flex-col items-center shadow-[0_0_30px_rgba(0,0,0,0.5)] transform transition-transform duration-500 hover:scale-105 hover:bg-black/50 hover:border-primary/30">
                    <h3 className="text-white font-black text-xl md:text-3xl tracking-tighter italic uppercase mb-2 drop-shadow-md">
                      {selectedImage.alt}
                    </h3>
                    <div className="flex items-center gap-4 text-[10px] md:text-xs font-black tracking-[0.4em] uppercase text-primary drop-shadow-md">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(selectedImage.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    {selectedImage.tags && selectedImage.tags.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mt-4">
                        {selectedImage.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] uppercase tracking-widest text-white/80 backdrop-blur-md shadow-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mobile swipe hint */}
            <div className="absolute bottom-6 md:hidden text-white/30 text-[10px] font-bold tracking-widest uppercase animate-pulse">
              Swipe or tap arrows · ESC to close
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
