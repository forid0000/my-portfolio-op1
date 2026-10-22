import type React from 'react';
import { notFound } from 'next/navigation';
import Header from '@/components/header';
import Footer from '@/components/footer';
import connectToDatabase from '@/lib/db';
import { mergeKitsContent, type KitsContent } from '@/lib/kits-registry';
import { getLayoutSections, isSectionEnabled } from '@/lib/sections-registry';
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
  const sections = await getLayoutSections();
  if (!isSectionEnabled(sections, 'kits')) notFound();

  const content = await getKitsContent();

  return (
    <div className="min-h-screen text-foreground flex flex-col relative font-sans">
      <div className="scan-overlay" />
      <Header />
      <KitsNavClient content={content}>{children}</KitsNavClient>
      <Footer />
    </div>
  );
}
