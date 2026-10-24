import Header from '@/components/header';
import Footer from '@/components/footer';
import { getGlobalContent, toHeaderBrand } from '@/lib/site';
import { getChrome, navFor } from '@/lib/chrome';
import { getLayoutSections } from '@/lib/sections-registry';
import { getActiveAvatarUrl } from '@/lib/avatar-cache';
import { getTheme } from '@/lib/theme';
import { resolveIconMap } from '@/lib/icons/resolve';

/** The public notes (the list and each published note), inside the site's own header and footer. */
export default async function PublicNotesLayout({ children }: { children: React.ReactNode }) {
  const [global, sections, avatarUrl, theme, chrome] = await Promise.all([
    getGlobalContent(),
    getLayoutSections(),
    getActiveAvatarUrl(),
    getTheme(),
    getChrome(),
  ]);
  const nav = navFor(chrome, sections);
  const icons = await resolveIconMap(global.footerSocials.map((s) => s.icon));
  return (
    <div className="flex min-h-screen flex-col font-sans selection:bg-primary/20">
      <Header brand={toHeaderBrand(global, avatarUrl)} nav={nav} uiStyle={theme.uiStyle} />
      <main className="relative flex-1 pt-20 pb-16">{children}</main>
      <Footer content={global} icons={icons} nav={nav} show={chrome.footer} />
    </div>
  );
}
