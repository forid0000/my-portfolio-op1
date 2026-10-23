'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  LogOut,
  Database,
  Image as ImageIcon,
  Clock,
  Menu,
  X,
  Home,
  User,
  Briefcase,
  Cpu,
  Code,
  Map,
  Mail,
  Settings,
  Palette,
  ExternalLink,
  MessageSquare,
  Type,
  Cloud,
  FileText,
  NotebookPen,
  ShieldCheck,
  Wrench,
  Layers,
  GraduationCap,
  Award,
  Quote,
  Rocket,
  Newspaper,
  ListOrdered,
  PanelTop,
  PenLine,
} from 'lucide-react';
import { CommandPalette } from '@/components/admin/command-palette';
import FieldErrorBridge from '@/components/admin/field-error-bridge';
import { OnboardingProvider, TourLauncher } from '@/components/admin/onboarding/provider';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** `data-tour` name the guided tour can point at (see components/admin/onboarding). */
  tour?: string;
};
type NavGroup = { label: string | null; tour?: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: '/administrator', label: 'Dashboard', icon: LayoutDashboard, tour: 'nav-dashboard' },
    ],
  },
  {
    label: 'Content',
    tour: 'nav-content',
    items: [
      { href: '/administrator/homepage', label: 'Hero Section', icon: Home },
      { href: '/administrator/about', label: 'About', icon: User },
      { href: '/administrator/education', label: 'Education', icon: GraduationCap },
      { href: '/administrator/experience', label: 'Experience', icon: Briefcase },
      { href: '/administrator/certifications', label: 'Certifications', icon: Award },
      { href: '/administrator/skills', label: 'Skills', icon: Cpu },
      { href: '/administrator/expertises', label: 'Expertises', icon: Cpu },
      { href: '/administrator/tech-stacks', label: 'Tech Stacks', icon: Layers },
      { href: '/administrator/services', label: 'Services', icon: Rocket },
      { href: '/administrator/projects', label: 'Projects', icon: Code },
      { href: '/administrator/articles', label: 'Articles', icon: PenLine },
      { href: '/administrator/publications', label: 'Publications', icon: Newspaper },
      { href: '/administrator/testimonials', label: 'Testimonials', icon: Quote },
      { href: '/administrator/roadmap', label: 'Roadmap', icon: Map },
      { href: '/administrator/kits', label: 'Kits', icon: Wrench },
      { href: '/administrator/contact', label: 'Contact', icon: Mail },
    ],
  },
  {
    label: 'Customize',
    tour: 'nav-customize',
    items: [
      { href: '/administrator/sections', label: 'Sections & Layout', icon: ListOrdered },
      { href: '/administrator/navigation', label: 'Navigation & Visibility', icon: PanelTop },
      { href: '/administrator/appearance', label: 'Appearance', icon: Palette },
      { href: '/administrator/global', label: 'Global Settings', icon: Settings },
      { href: '/administrator/headings', label: 'Section Texts', icon: Type },
      { href: '/administrator/floating-contact', label: 'Floating Contact', icon: MessageSquare },
    ],
  },
  {
    label: 'Media',
    tour: 'nav-media',
    items: [
      { href: '/administrator/gallery', label: 'Gallery', icon: ImageIcon },
      { href: '/administrator/media-manager', label: 'Media Manager', icon: FileText },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/administrator/cloudinary', label: 'Cloudinary Data', icon: Cloud },
      { href: '/administrator/data', label: 'MongoDB Data', icon: Database },
      { href: '/administrator/system', label: 'System & SEO', icon: Settings },
      {
        href: '/administrator/security',
        label: 'Security & Keys',
        icon: ShieldCheck,
        tour: 'nav-security',
      },
      {
        href: '/administrator/notes-config',
        label: 'Notes Config',
        icon: NotebookPen,
        tour: 'nav-notes',
      },
    ],
  },
];

const ADM_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ADM_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
function buildAdmClock(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${ADM_DAYS[d.getDay()]} · ${dd} ${ADM_MONTHS[d.getMonth()]} ${d.getFullYear()} · ${hh}:${mm}:${ss}`;
}

/** Ticking clock. Own component so its per-second updates never re-render the whole shell. */
function AdminClock({ className }: { className?: string }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const tick = () => setText(buildAdmClock(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <p className={className}>{text}</p>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'active' | 'expired'>('loading');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/admin/session');
        if (res.ok) {
          const data = await res.json();
          if (data.active && data.remainingSeconds > 0) {
            setTimeLeft(data.remainingSeconds);
            setSessionStatus('active');
          } else {
            setSessionStatus('expired');
          }
        } else {
          setSessionStatus('expired');
        }
      } catch (err) {
        console.error('Failed to fetch session', err);
        setSessionStatus('expired');
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      if (timeLeft === 0 && sessionStatus === 'active') setSessionStatus('expired');
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // On expiry: sign out and go to the sign-in page.
  useEffect(() => {
    if (sessionStatus !== 'expired') return;
    fetch('/api/admin/logout', { method: 'POST' }).finally(() => {
      router.replace('/administrator/login');
      router.refresh();
    });
  }, [sessionStatus, router]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isWarning = timeLeft !== null && timeLeft <= 180;

  const handleSignOut = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {}
    router.replace('/');
    router.refresh();
  };

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefreshSession = async () => {
    if (timeLeft === null || timeLeft > 300 || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/session/refresh', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTimeLeft(data.remainingSeconds);
        }
      } else if (res.status === 401) {
        // Absolute limit reached or session actually expired
        setSessionStatus('expired');
      }
    } catch (err) {
      console.error('Failed to refresh session', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getLinkClasses = (path: string) => {
    const isActive = pathname === path;
    return `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? 'bg-gray-800 text-emerald-400'
        : 'text-gray-400 hover:bg-gray-800/50 hover:text-emerald-400'
    }`;
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (sessionStatus === 'expired') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-gray-950">
        <LogOut className="w-8 h-8 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-200">Session expired</h2>
        <p className="text-sm font-mono text-gray-500">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <OnboardingProvider setMenuOpen={setIsMobileMenuOpen}>
      <FieldErrorBridge />
      <div className="admin-accent flex flex-col md:flex-row h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 z-40">
          <h2 className="text-lg font-bold tracking-tight text-emerald-500">Admin Portal</h2>
          <div className="flex items-center gap-2">
            <span data-tour="search" className="inline-flex">
              <CommandPalette />
            </span>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Sidebar Overlay (Mobile) */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          data-tour-sidebar
          className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 h-full bg-gray-900 border-r border-gray-800 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
        >
          <div className="p-4 border-b border-gray-800">
            <AdminClock className="text-[10px] font-mono text-gray-600 tracking-[0.1em] mb-3 tabular-nums" />
            <div className="flex flex-col">
              <h2 className="text-lg font-bold tracking-tight text-emerald-500 font-mono">
                Admin Portal
              </h2>
              <span className="text-[10px] text-gray-500 tracking-widest font-mono mt-0.5">
                dashboard
              </span>
            </div>

            {/* Enhanced Session Timer */}
            <div
              data-tour="session"
              className={`mt-4 flex flex-col items-center justify-center p-3 rounded-xl border backdrop-blur-md shadow-lg transition-all duration-500 ${
                isWarning
                  ? 'bg-gradient-to-br from-red-950/80 to-gray-900 border-red-900/50 shadow-red-900/20'
                  : 'bg-gradient-to-br from-gray-900 to-gray-800/80 border-gray-700/50 shadow-emerald-900/10'
              } ${isWarning ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest font-bold mb-1 text-gray-400">
                <Clock className={`w-3 h-3 ${isWarning ? 'text-red-500' : 'text-emerald-500'}`} />
                Active Session
              </div>
              <div
                className={`text-2xl font-black font-mono tracking-widest ${
                  isWarning
                    ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]'
                    : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                }`}
              >
                {sessionStatus === 'loading' ? '--:--' : formatTime(timeLeft!)}
              </div>

              {/* Refresh Session Button */}
              {sessionStatus === 'active' && timeLeft !== null && timeLeft <= 300 && (
                <button
                  onClick={handleRefreshSession}
                  disabled={isRefreshing}
                  className="mt-3 px-3 py-1.5 w-full rounded-md bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-400 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                >
                  {isRefreshing ? (
                    <span className="animate-spin w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  +5 Min
                </button>
              )}
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} data-tour={group.tour} className={group.label ? 'mt-4 first:mt-0' : ''}>
                {group.label && (
                  <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-tour={item.tour}
                      className={getLinkClasses(item.href)}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-800 space-y-1">
            <a
              href="/"
              data-tour="live-site"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-emerald-400 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              View Live Site
            </a>
            <TourLauncher className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-emerald-400 disabled:opacity-50 transition-colors" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg text-red-500 hover:bg-red-950/50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full bg-gray-950 overflow-hidden">
          {/* Global Search Top Bar (Desktop) */}
          <div className="hidden md:flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
            <div data-tour="search" className="flex-1 max-w-2xl mx-auto">
              <CommandPalette />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">{children}</div>
        </main>
      </div>
    </OnboardingProvider>
  );
}
