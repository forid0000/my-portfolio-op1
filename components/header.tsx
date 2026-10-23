'use client';

import { useEffect, useState, useRef } from 'react';
import { Menu, X, NotebookPen, Newspaper, Wrench } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SafeAvatar from '@/components/safe-avatar';
import SiteFakeUptime from './SiteFakeUptime';
import { ByStyle } from '@/components/by-style';
import { hasComplexScript } from '@/lib/text-script';
import { AVATAR_PLACEHOLDER_URL, GLOBAL_CONTENT_DEFAULTS } from '@/lib/content-defaults';
import { DEFAULT_NAV, type ResolvedNavItem } from '@/lib/chrome-model';

interface HeaderBrand {
  avatarUrl?: string;
  headerName?: string;
  headerTag?: string;
  locationLabel?: string;
  timeZone?: string;
}

const BRAND_FALLBACK: Required<HeaderBrand> = {
  avatarUrl: AVATAR_PLACEHOLDER_URL,
  headerName: GLOBAL_CONTENT_DEFAULTS.headerName,
  headerTag: GLOBAL_CONTENT_DEFAULTS.headerTag,
  locationLabel: GLOBAL_CONTENT_DEFAULTS.locationLabel,
  timeZone: GLOBAL_CONTENT_DEFAULTS.timeZone,
};

const ICONS = { newspaper: Newspaper, wrench: Wrench, notebook: NotebookPen } as const;

export default function Header({
  brand,
  nav,
  uiStyle = 'clean',
}: {
  brand?: HeaderBrand;
  /** The links to show (Admin -> Navigation). Resolved on the server so they arrive in the HTML. */
  nav?: ResolvedNavItem[];
  /** 'terminal' brings back the developer-prompt look and the system-status widget. */
  uiStyle?: 'clean' | 'terminal';
}) {
  // SSR pages pass `brand`/`nav` (no flash). Client-only pages omit them, so we
  // self-fetch from the public /api/site endpoint.
  const [fetchedBrand, setFetchedBrand] = useState<HeaderBrand | null>(null);
  const [fetchedNav, setFetchedNav] = useState<ResolvedNavItem[] | null>(null);
  useEffect(() => {
    if (brand && nav) return;
    let active = true;
    fetch('/api/site')
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (!brand) setFetchedBrand(d);
        if (!nav && Array.isArray(d.nav)) setFetchedNav(d.nav);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [brand, nav]);
  const b = { ...BRAND_FALLBACK, ...(brand || fetchedBrand || {}) };
  const nameComplex = hasComplexScript(b.headerName);
  const tagComplex = hasComplexScript(b.headerTag);
  const items = nav || fetchedNav || DEFAULT_NAV;
  const mainItems = items.filter((i) => i.placement === 'main');
  const utilityItems = items.filter((i) => i.placement === 'utility');
  const anchorsKey = mainItems.flatMap((i) => (i.anchor ? [i.anchor] : [])).join('|');
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

  // Scroll Spy Logic: highlights the link of the section in view
  useEffect(() => {
    if (pathname !== '/') {
      setActiveSection('');
      return;
    }
    const spied = anchorsKey ? anchorsKey.split('|') : [];

    const handleScrollSpy = () => {
      if (window.innerWidth < 768) return;
      let current = '';

      if (window.scrollY < 100) {
        setActiveSection('');
        return;
      }

      for (const section of spied) {
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
  }, [pathname, anchorsKey]);

  // Notes vault is a full-screen app - no site nav needed there
  if (pathname === '/notes') return null;

  const isActive = (item: ResolvedNavItem) => {
    if (item.anchor) return pathname === '/' && activeSection === item.anchor;
    if (item.href === '/#') return pathname === '/' && activeSection === '';
    if (item.href.startsWith('/') && !item.href.includes('#')) {
      return pathname === item.href || !!pathname?.startsWith(`${item.href}/`);
    }
    return false;
  };

  const linkProps = (item: ResolvedNavItem) =>
    item.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  const label = (item: ResolvedNavItem) => (
    <ByStyle clean={item.label} terminal={`_${item.label.toLowerCase()}`} />
  );

  return (
    <header className="fixed top-0 left-0 w-full z-50 border-b border-primary/5 bg-background/95">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* === LEFT: IDENTITY === */}
        <Link href="/#" className="group block focus:outline-none">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 overflow-hidden rounded-full terminal:rounded-xl border border-primary/20 group-hover:border-primary/50 transition-colors shadow-sm shrink-0">
              <SafeAvatar
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

        {/* === CENTER: LINKS (desktop) === */}
        {mainItems.length > 0 && (
          <nav
            aria-label="Main"
            className="hidden md:flex items-center gap-1 bg-card/95 px-2 py-1.5 rounded-full border border-border/40 shadow-sm"
          >
            {mainItems.map((item) => {
              const Icon = item.icon ? ICONS[item.icon] : null;
              const active = isActive(item);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  {...linkProps(item)}
                  className={`nav-link whitespace-nowrap relative px-3 py-1.5 text-sm terminal:font-mono font-medium transition-colors rounded-md hover:bg-primary/10 hover:text-primary flex items-center gap-2 ${
                    active ? 'active text-primary bg-primary/5' : 'text-muted-foreground'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {label(item)}
                </Link>
              );
            })}
          </nav>
        )}

        {/* === RIGHT: UTILITIES === */}
        <div className="flex items-center gap-3 sm:gap-4">
          {utilityItems.map((item) => {
            const Icon = item.icon ? ICONS[item.icon] : null;
            return (
              <Link
                key={item.id}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                {...linkProps(item)}
                className="hidden sm:flex relative p-2 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all group"
              >
                {Icon ? (
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                ) : (
                  <span className="px-1 text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}

          {utilityItems.length > 0 && <div className="h-6 w-px bg-border/40 hidden sm:block" />}

          {uiStyle === 'terminal' && (
            <div className="">
              <SiteFakeUptime compact timeZone={b.timeZone} locationLabel={b.locationLabel} />
            </div>
          )}
          {/* Mobile Menu Button */}
          {items.length > 0 && (
            <button
              ref={buttonRef}
              className="md:hidden p-2 rounded-lg border border-border/40 hover:bg-primary/5 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
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

          <nav aria-label="Mobile" className="flex flex-col gap-2">
            {[...mainItems, ...utilityItems].map((item) => {
              const Icon = item.icon ? ICONS[item.icon] : null;
              const active = isActive(item);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  {...linkProps(item)}
                  className={`
                    group flex items-center gap-3 px-4 py-3 rounded-lg border terminal:font-mono transition-all
                    ${
                      active
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-card/50 border-transparent hover:border-primary/30 hover:bg-primary/5'
                    }
                  `}
                >
                  {Icon ? (
                    <Icon className="w-4 h-4" />
                  ) : (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        active ? 'bg-primary' : 'bg-muted-foreground/30 group-hover:bg-primary/50'
                      }`}
                    />
                  )}
                  {label(item)}
                  {active && (
                    <span className="ml-auto hidden text-[10px] opacity-70 terminal:inline">
                      &lt;CURRENT&gt;
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
