'use client';

import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { Search, LayoutDashboard, Database } from 'lucide-react';

const STATIC_ROUTES = [
  { href: '/administrator', label: 'Dashboard', section: 'General' },
  { href: '/administrator/homepage', label: 'Hero Section', section: 'Content' },
  { href: '/administrator/about', label: 'About', section: 'Content' },
  { href: '/administrator/education', label: 'Education', section: 'Content' },
  { href: '/administrator/experience', label: 'Experience', section: 'Content' },
  { href: '/administrator/certifications', label: 'Certifications', section: 'Content' },
  { href: '/administrator/skills', label: 'Skills', section: 'Content' },
  { href: '/administrator/expertises', label: 'Expertises', section: 'Content' },
  { href: '/administrator/tech-stacks', label: 'Tech Stacks', section: 'Content' },
  { href: '/administrator/services', label: 'Services', section: 'Content' },
  { href: '/administrator/projects', label: 'Projects', section: 'Content' },
  { href: '/administrator/articles', label: 'Articles', section: 'Content' },
  { href: '/administrator/articles/new', label: 'Write a new article', section: 'Content' },
  { href: '/administrator/publications', label: 'Publications', section: 'Content' },
  { href: '/administrator/testimonials', label: 'Testimonials', section: 'Content' },
  { href: '/administrator/roadmap', label: 'Roadmap', section: 'Content' },
  { href: '/administrator/kits', label: 'Kits', section: 'Content' },
  { href: '/administrator/contact', label: 'Contact', section: 'Content' },
  { href: '/administrator/sections', label: 'Sections & Layout', section: 'Customize' },
  { href: '/administrator/navigation', label: 'Navigation & Visibility', section: 'Customize' },
  { href: '/administrator/appearance', label: 'Appearance', section: 'Customize' },
  { href: '/administrator/global', label: 'Global Settings', section: 'Customize' },
  { href: '/administrator/headings', label: 'Section Texts', section: 'Customize' },
  { href: '/administrator/floating-contact', label: 'Floating Contact', section: 'Customize' },
  { href: '/administrator/gallery', label: 'Gallery', section: 'Media' },
  { href: '/administrator/media-manager', label: 'Media Manager', section: 'Media' },
  { href: '/administrator/cloudinary', label: 'Cloudinary Data', section: 'System' },
  { href: '/administrator/data', label: 'MongoDB Data', section: 'System' },
  { href: '/administrator/system', label: 'System & SEO', section: 'System' },
  { href: '/administrator/security', label: 'Security & Keys', section: 'System' },
  { href: '/administrator/notes-config', label: 'Notes', section: 'System' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [dbItems, setDbItems] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open && dbItems.length === 0) {
      fetch('/api/admin/search-index')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setDbItems(data);
        })
        .catch(console.error);
    }
  }, [open, dbItems.length]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-900/80 border border-gray-700/50 rounded-xl hover:text-white hover:border-emerald-500/50 hover:bg-gray-900 transition-all w-full shadow-sm"
      >
        <Search className="w-5 h-5 text-gray-500" />
        <span className="flex-1 text-left text-gray-500">Search anything...</span>
        <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-800 border border-gray-700 rounded-md shadow-sm">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <Command className="w-full">
              <Command.Input
                autoFocus
                placeholder="Type a command or search..."
                className="w-full px-4 py-4 text-sm text-white bg-transparent border-b border-gray-800 outline-none placeholder:text-gray-500"
              />
              <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-800">
                <Command.Empty className="py-6 text-center text-sm text-gray-500">
                  No results found.
                </Command.Empty>

                <Command.Group
                  heading="Admin Sections"
                  className="px-2 text-xs font-semibold text-gray-500 mb-2 mt-2"
                >
                  {STATIC_ROUTES.map((route) => (
                    <Command.Item
                      key={route.href}
                      onSelect={() => runCommand(() => router.push(route.href))}
                      className="flex items-center gap-2 px-2 py-2 text-sm text-gray-300 rounded-md cursor-pointer hover:bg-gray-800 hover:text-white aria-selected:bg-gray-800 aria-selected:text-white"
                    >
                      <LayoutDashboard className="w-4 h-4 text-gray-500" />
                      {route.label}
                      <span className="ml-auto text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">
                        {route.section}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>

                {dbItems.length > 0 && (
                  <Command.Group
                    heading="Database Content"
                    className="px-2 text-xs font-semibold text-gray-500 mt-4 mb-2"
                  >
                    {dbItems.map((item) => (
                      <Command.Item
                        key={item.id}
                        onSelect={() => runCommand(() => router.push(item.href))}
                        className="flex items-center gap-2 px-2 py-2 text-sm text-gray-300 rounded-md cursor-pointer hover:bg-gray-800 hover:text-white aria-selected:bg-gray-800 aria-selected:text-white"
                      >
                        <Database className="w-4 h-4 text-emerald-500" />
                        {item.title}
                        <span className="ml-auto text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">
                          {item.type}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </div>
          <div className="absolute inset-0 -z-10" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
