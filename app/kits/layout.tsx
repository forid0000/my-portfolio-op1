import type React from 'react';
import { notFound } from 'next/navigation';
import Header from '@/components/header';
import Footer from '@/components/footer';
import connectToDatabase from '@/lib/db';
import { mergeKitsContent, type KitsContent } from '@/lib/kits-registry';
import { getLayoutSections, isSectionEnabled } from '@/lib/sections-registry';
import { getGlobalContent, toHeaderBrand } from '@/lib/site';
import { getChrome, navFor } from '@/lib/chrome';
import { getActiveAvatarUrl } from '@/lib/avatar-cache';
import { getTheme } from '@/lib/theme';
import { themeSwitchFor } from '@/lib/theme-modes';
import { resolveIconMap } from '@/lib/icons/resolve';
import { KitsNavClient } from './kits-nav-client';
import './style.css';

async function getKitsContent(): Promise<KitsContent> {
  try {
    const db = await connectToDatabase();
    const doc = await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .findOne({ type: 'kits_content' });
    return mergeKitsContent(doc);
  } catch {
    return mergeKitsContent(null);
  }
}

export default async function KitsLayout({ children }: { children: React.ReactNode }) {
  const [sections, global, content, avatarUrl, theme, chrome] = await Promise.all([
    getLayoutSections(),
    getGlobalContent(),
    getKitsContent(),
    getActiveAvatarUrl(),
    getTheme(),
    getChrome(),
  ]);
  if (!isSectionEnabled(sections, 'kits')) notFound();
  const nav = navFor(chrome, sections);

  // Everything the header, footer and tool nav show is resolved here, on the
  // server, so the page arrives complete: no client fetch, no icon library.
  const icons = await resolveIconMap([
    ...content.tools.map((t) => t.icon),
    ...global.footerSocials.map((s) => s.icon),
  ]);

  return (
    <div className="min-h-screen text-foreground flex flex-col relative font-sans">
      <Header
        brand={toHeaderBrand(global, avatarUrl)}
        nav={nav}
        uiStyle={theme.uiStyle}
        themeSwitch={themeSwitchFor(theme)}
      />
      <KitsNavClient content={content} icons={icons}>
        {children}
      </KitsNavClient>
      <Footer content={global} icons={icons} nav={nav} show={chrome.footer} />
    </div>
  );
}
