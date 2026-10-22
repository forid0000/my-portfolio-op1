import { Suspense } from 'react';
import NotesClient from './notes-client';

export const metadata = {
  title: 'Notes Vault',
  robots: { index: false, follow: false },
};

export default async function NotesPage() {
  return (
    <div className="h-screen overflow-hidden">
      <Suspense fallback={null}>
        <NotesClient />
      </Suspense>
    </div>
  );
}
