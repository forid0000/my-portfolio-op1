'use client';

import { useEffect, useState, useRef } from 'react';
import { Sun, Moon, Menu, X, NotebookPen, Newspaper, Wrench, Terminal } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SiteFakeUptime from './SiteFakeUptime';
import { ByStyle } from '@/components/by-style';
import { hasComplexScript } from '@/lib/text-script';
import { AVATAR_PLACEHOLDER_URL, GLOBAL_CONTENT_DEFAULTS } from '@/lib/content-defaults';

interface HeaderBrand {
  avatarUrl?: string;
  headerName?: string;
  headerTag?: string;
  locationLabel?: string;
  timeZone?: string;
}

interface NavToggles {
  about: boolean;
  skills: boolean;
  projects: boolean;
  gallery: boolean;
  kits: boolean;
}

const BRAND_FALLBACK: Required<HeaderBrand> = {
  avatarUrl: AVATAR_PLACEHOLDER_URL,
  headerName: GLOBAL_CONTENT_DEFAULTS.headerName,
  headerTag: GLOBAL_CONTENT_DEFAULTS.headerTag,
  locationLabel: GLOBAL_CONTENT_DEFAULTS.locationLabel,
  timeZone: GLOBAL_CONTENT_DEFAULTS.timeZone,
};

const NAV_TOGGLE_FALLBACK: NavToggles = {
  about: true,
  skills: true,
  projects: true,
  gallery: true,
  kits: true,
};

export default function Header({
  brand,
  toggles,
  uiStyle = 'clean',
}: {
  brand?: HeaderBrand;
  toggles?: NavToggles;
  /** 'terminal' brings back the developer-prompt look and the system-status widget. */
  uiStyle?: 'clean' | 'terminal';
}) {
  // SSR pages pass `brand`/`toggles` (no flash). Client-only pages (kits,
  // calendar) omit them, so we self-fetch from the public /api/site endpoint.
  const [fetchedBrand, setFetchedBrand] = useState<HeaderBrand | null>(null);
  const [fetchedToggles, setFetchedToggles] = useState<NavToggles | null>(null);
  useEffect(() => {
    if (brand && toggles) return;
    let active = true;
    fetch('/api/site')
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (!brand) setFetchedBrand(d);
        if (!toggles) {
          setFetchedToggles({ ...NAV_TOGGLE_FALLBACK, ...(d.navToggles || {}) });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [brand, toggles]);
  const b = { ...BRAND_FALLBACK, ...(brand || fetchedBrand || {}) };
  const nameComplex = hasComplexScript(b.headerName);
  const tagComplex = hasComplexScript(b.headerTag);
  const t = { ...NAV_TOGGLE_FALLBACK, ...(toggles || fetchedToggles || {}) };
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle Click Outside & Scroll to close menu
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        (menuRef.current &&
          event.target instanceof Node &&
          menuRef.current.contains(event.target)) ||
        (buttonRef.current &&
          event.target instanceof Node &&
          buttonRef.current.contains(event.target))
      )
        return;
      setIsMenuOpen(false);
    };
    const handleScroll = () => setIsMenuOpen(false);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isMenuOpen]);

  // Scroll Spy Logic
  useEffect(() => {
    if (pathname !== '/') {
      setActiveSection('');
      return;
    }

    const handleScrollSpy = () => {
      if (window.innerWidth < 768) return;
      const sections = (['about', 'skills', 'projects', 'gallery'] as const).filter((s) => t[s]);
      let current = '';

      if (window.scrollY < 100) {
        setActiveSection('');
        return;
      }

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            current = section;
          }
        }
      }
      setActiveSection(current);
    };

    // Passive + at most once per frame: reading section positions on every raw
    // scroll event forces layout and makes scrolling janky.
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        handleScrollSpy();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScrollSpy();
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname, t.about, t.skills, t.projects, t.gallery]);

  // Notes vault is a full-screen app - no site nav needed there
  if (pathname === '/notes') return null;

  const blog = '/articles';
  const isDark = true;
  const isKitsPage = pathname?.startsWith('/kits');

  // Helper for Link Classes
  const getNavLinkClass = (id: string) =>
    `nav-link whitespace-nowrap relative px-3 py-1.5 text-sm terminal:font-mono font-medium transition-colors rounded-md hover:bg-primary/10 hover:text-primary ${
      pathname === '/' && activeSection === id
        ? 'active text-primary bg-primary/5'
        : 'text-muted-foreground'
    }`;

  return (
    <header className="fixed top-0 left-0 w-full z-50 border-b border-primary/5 bg-background/95">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* === LEFT: SYSTEM IDENTITY === */}
        <Link href="/#" className="group block focus:outline-none">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 overflow-hidden rounded-full terminal:rounded-xl border border-primary/20 group-hover:border-primary/50 transition-colors shadow-sm shrink-0">
              <Image
                src={b.avatarUrl}
                alt={b.headerName}
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                fill
                sizes="40px"
              />
              {/* Scanline overlay */}
              <div className="absolute inset-0 hidden terminal:block bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col justify-center">
              <span
                dir="auto"
                className={`block max-w-[11rem] truncate text-sm md:text-base font-bold ${
                  nameComplex ? 'tracking-normal' : 'tracking-tight'
                } terminal:font-mono terminal:text-[13px] terminal:md:text-sm group-hover:text-primary transition-colors leading-snug`}
              >
                {b.headerName}
              </span>
              {b.headerTag && (
                <div className="flex items-center text-[11px] md:text-xs terminal:text-[10px] terminal:font-mono opacity-80 group-hover:opacity-100 transition-opacity leading-none">
                  <span className="hidden terminal:inline text-primary mr-1 font-bold">#</span>
                  <span
                    dir="auto"
                    className={`block max-w-[11rem] truncate text-muted-foreground ${
                      tagComplex ? '' : 'terminal:tracking-[0.2em] terminal:uppercase'
                    }`}
                  >
                    {b.headerTag}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* === CENTER: COMMAND DOCK (Desktop) === */}
        <nav className="hidden md:flex items-center gap-1 bg-card/95 px-2 py-1.5 rounded-full border border-border/40 shadow-sm">
          <Link href="/#" className={getNavLinkClass('')}>
            <ByStyle clean="Home" terminal="_home" />
          </Link>
          {t.about && (
            <Link href="/#about" className={getNavLinkClass('about')}>
              <ByStyle clean="About" terminal="_about" />
            </Link>
          )}
          {t.projects && (
            <Link href="/#projects" className={getNavLinkClass('projects')}>
              <ByStyle clean="Projects" terminal="_projects" />
            </Link>
          )}
          {t.gallery && (
            <Link href="/#gallery" className={getNavLinkClass('gallery')}>
              <ByStyle clean="Gallery" terminal="_gallery" />
            </Link>
          )}

          <div className="w-px h-4 bg-border/50 mx-2" />

          <Link
            href={blog}
            className="px-3 py-1.5 text-sm terminal:font-mono font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Newspaper className="w-3.5 h-3.5" />
            Articles
          </Link>

          {t.kits && (
            <Link
              href="/kits"
              className={`px-4 py-2 text-sm terminal:font-mono font-medium rounded-lg transition-all duration-500 flex items-center gap-2 group relative border-2 whitespace-nowrap ${
                isKitsPage
                  ? 'bg-gradient-to-r from-primary/20 to-green-400/20 text-primary border-primary/50 shadow-lg shadow-primary/25'
                  : 'text-muted-foreground hover:text-primary hover:bg-gradient-to-r hover:from-primary/10 hover:to-green-400/10 border-transparent hover:border-primary/30 hover:shadow-md hover:shadow-primary/20'
              }`}
            >
              <div className="relative flex items-center">
                {/* Pulsing background glow */}
                <div className="absolute -inset-2 hidden terminal:block bg-gradient-to-r from-primary/40 to-green-400/40 rounded-full blur-md opacity-60 animate-pulse" />

                <Wrench
                  className={`w-4 h-4 relative z-10 transition-all duration-300 ${
                    isKitsPage
                      ? 'text-primary drop-shadow-[0_0_8px_rgba(16,185,129,1)] animate-pulse'
                      : 'group-hover:text-primary group-hover:drop-shadow-[0_0_6px_rgba(16,185,129,0.8)] group-hover:scale-110'
                  }`}
                />
              </div>

              <span className="relative z-10 font-semibold">
                <ByStyle clean="Tools" terminal="/kits" />
              </span>
            </Link>
          )}
        </nav>

        {/* === RIGHT: UTILITIES === */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* === 1. NOTES BUTTON === */}
          <Link
            href="/notes"
            title="Personal Notes"
            className="hidden sm:flex relative p-2 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all group"
          >
            <NotebookPen className="w-5 h-5 transition-transform group-hover:scale-110" />
          </Link>

          <div className="h-6 w-px bg-border/40 hidden sm:block" />

          {uiStyle === 'terminal' && (
            <div className="">
              <SiteFakeUptime compact timeZone={b.timeZone} locationLabel={b.locationLabel} />
            </div>
          )}
          {/* Mobile Menu Button */}
          <button
            ref={buttonRef}
            className="md:hidden p-2 rounded-lg border border-border/40 hover:bg-primary/5 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* === MOBILE MENU === */}
      <div
        ref={menuRef}
        className={`
          absolute top-[65px] right-0 left-0 bg-background/95 border-b border-border/40 shadow-2xl
          transition-all duration-300 ease-in-out origin-top
          md:hidden
          ${
            isMenuOpen
              ? 'opacity-100 scale-y-100 translate-y-0'
              : 'opacity-0 scale-y-0 -translate-y-4 pointer-events-none'
          }
        `}
      >
        <div className="p-4 space-y-4">
          {/* Mobile Header Stat */}
          <div className="hidden terminal:flex items-center justify-center px-4 pb-4 border-b border-border/30 text-xs terminal:font-mono text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> SYSTEM: ONLINE
            </span>
          </div>

          <nav className="flex flex-col gap-2">
            {[
              {
                name: 'Home',
                terminalName: '_home',
                href: '/#',
                active: pathname === '/' && activeSection === '',
              },
              ...(t.about
                ? [
                    {
                      name: 'About',
                      terminalName: '_about',
                      href: '/#about',
                      active: pathname === '/' && activeSection === 'about',
                    },
                  ]
                : []),
              ...(t.projects
                ? [
                    {
                      name: 'Projects',
                      terminalName: '_projects',
                      href: '/#projects',
                      active: pathname === '/' && activeSection === 'projects',
                    },
                  ]
                : []),
              ...(t.gallery
                ? [
                    {
                      name: 'Gallery',
                      terminalName: '_gallery',
                      href: '/#gallery',
                      active: pathname === '/' && activeSection === 'gallery',
                    },
                  ]
                : []),
            ].map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`
                    group flex items-center gap-3 px-4 py-3 rounded-lg border terminal:font-mono transition-all
                    ${
                      link.active
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-card/50 border-transparent hover:border-primary/30 hover:bg-primary/5'
                    }
                  `}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    link.active ? 'bg-primary' : 'bg-muted-foreground/30 group-hover:bg-primary/50'
                  }`}
                />
                <ByStyle clean={link.name} terminal={link.terminalName} />
                {link.active && (
                  <span className="ml-auto hidden text-[10px] opacity-70 terminal:inline">
                    &lt;CURRENT&gt;
                  </span>
                )}
              </Link>
            ))}

            {/* Mobile Utils Grid - Updated to include Notes */}
            <div className={`grid ${t.kits ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mt-2`}>
              <Link
                href="/notes"
                onClick={() => setIsMenuOpen(false)}
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border border-border/40 bg-card/50 hover:border-primary/30 hover:text-primary terminal:font-mono text-xs transition-all"
              >
                <NotebookPen className="w-4 h-4" />
                <span>
                  <ByStyle clean="Notes" terminal="/notes" />
                </span>
              </Link>
              <Link
                href={blog}
                onClick={() => setIsMenuOpen(false)}
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border border-border/40 bg-card/50 hover:border-primary/30 hover:text-primary terminal:font-mono text-xs"
              >
                <Newspaper className="w-4 h-4" />
                <span>Articles</span>
              </Link>
              {t.kits && (
                <Link
                  href="/kits"
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border terminal:font-mono text-xs transition-all ${
                    isKitsPage
                      ? 'border-primary/30 bg-primary/5 text-primary'
                      : 'border-border/40 bg-card/50 hover:border-primary/30 hover:text-primary'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  <span>
                    <ByStyle clean="Tools" terminal="/kits" />
                  </span>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
