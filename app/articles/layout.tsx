import Header from '@/components/header';
import Footer from '@/components/footer';
import { getGlobalContent, toHeaderBrand, toNavToggles } from '@/lib/site';
import { getLayoutSections } from '@/lib/sections-registry';
import { getActiveAvatarUrl } from '@/lib/avatar-cache';
import { getTheme } from '@/lib/theme';
import { resolveIconMap } from '@/lib/icons/resolve';

export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  const [global, sections, avatarUrl, theme] = await Promise.all([
    getGlobalContent(),
    getLayoutSections(),
    getActiveAvatarUrl(),
    getTheme(),
  ]);
  const icons = await resolveIconMap(global.footerSocials.map((s) => s.icon));
  return (
    // bg-background commented out to remove solid background color
    <div className="min-h-screen  flex flex-col font-sans selection:bg-primary/20">
      <Header
        brand={toHeaderBrand(global, avatarUrl)}
        toggles={toNavToggles(sections)}
        uiStyle={theme.uiStyle}
      />
      <main className="flex-1 pt-20 pb-16 relative">
        {/* Cyber Grid Background for the Blog Section */}
        <div
          className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {children}
      </main>
      <Footer content={global} icons={icons} />
    </div>
  );
}
