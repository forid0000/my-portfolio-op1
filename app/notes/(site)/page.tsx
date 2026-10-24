// A published note changes this page the moment it is saved (revalidateNotes); the hourly
// refresh only covers a database that was unreachable while the site was built.
export const revalidate = 1800;

import type { Metadata } from 'next';
import PublicNotesIndex from '@/components/notes/public-notes-index';
import { getPublishedNotes } from '@/lib/notes';
import { getNotesSettings } from '@/lib/notes-settings';
import { SITE_URL } from '@/lib/site-config';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getNotesSettings();
  return {
    title: settings.publicTitle,
    description: settings.publicIntro || undefined,
    alternates: { canonical: `${SITE_URL}/notes` },
  };
}

export default async function NotesPage() {
  const [notes, settings] = await Promise.all([getPublishedNotes(), getNotesSettings()]);
  return (
    <PublicNotesIndex
      notes={notes}
      title={settings.publicTitle}
      intro={settings.publicIntro}
      vaultLabel={settings.vaultButton}
    />
  );
}
