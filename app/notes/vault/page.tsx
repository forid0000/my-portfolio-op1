import type { Metadata } from 'next';
import VaultApp from '@/components/notes/vault/vault-app';

// The private notes. Never listed by search engines; the public notes live at /notes.
export const metadata: Metadata = {
  title: 'Private notes',
  robots: { index: false, follow: false },
};

export default function VaultPage() {
  return (
    <div className="h-dvh overflow-hidden">
      <VaultApp />
    </div>
  );
}
