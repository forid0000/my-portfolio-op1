// Homepage is CMS-driven (MongoDB) with no external data, so it needs no timer.
// Fully static: it's generated once at build and never regenerates on a schedule
// (timer ISR previously burned the Vercel free-tier ISR-Write budget). Instead,
// the admin content-save routes call `revalidatePublicContent()` (lib/revalidate)
// on save, so it refreshes on-demand — one write per real edit, not per interval.
export const revalidate = false;

import { Fragment } from 'react';
import dynamicImport from 'next/dynamic';
import Header from '@/components/header';
// Below-the-fold sections: still server-rendered for SEO, but their client JS
// is code-split into separate chunks so the initial bundle stays small.
const Footer = dynamicImport(() => import('@/components/footer'));
const FloatingContact = dynamicImport(() => import('@/components/floating-contact'));

import connectToDatabase from '@/lib/db';
import { safeJsonLd } from '@/lib/json-ld';
import { getActiveAvatarUrl } from '@/lib/avatar-cache';
import { getTheme } from '@/lib/theme';
import { getPublicItems } from '@/lib/api/collection-crud';
import galleryFallback from '@/components/data/gallery-cloudinary.json';
import type { GalleryItem } from '@/components/achievements-gallery';
import {
  ABOUT_DEFAULTS,
  CONTACT_DEFAULTS,
  EXPERIENCE_DEFAULTS,
  HERO_DEFAULTS,
  PROJECTS_DEFAULTS,
  ROADMAP_DEFAULTS,
  SECTION_TEXT_DEFAULTS,
  SKILLS_DEFAULTS,
} from '@/lib/content-defaults';
import { getSiteIdentity } from '@/lib/identity';
import { resolveIconMap } from '@/lib/icons/resolve';
import { SITE_URL } from '@/lib/site-config';
import {
  GLOBAL_DEFAULTS,
  mergeGlobal,
  toHeaderBrand,
  toNavToggles,
  type GlobalContent,
} from '@/lib/site';
import { FLOATING_DEFAULTS, mergeFloating, type FloatingContent } from '@/lib/floating';
import {
  getLayoutSections,
  getRenderableSections,
  isSectionEnabled,
  SECTION_COMPONENT_MAP,
  type PortfolioSectionConfig,
} from '@/lib/sections-registry';

export default async function Home() {
  let galleryItems = galleryFallback as GalleryItem[];

  let heroContent = { ...HERO_DEFAULTS };
  let aboutContent = { ...ABOUT_DEFAULTS };
  let experienceContent: any[] = EXPERIENCE_DEFAULTS;
  let skillsContent: any[] = SKILLS_DEFAULTS;
  let projectsContent: any[] = PROJECTS_DEFAULTS;
  let projectsCta = { label: '', url: '' };
  let roadmapContent: any[] = ROADMAP_DEFAULTS;
  let contactContent = { ...CONTACT_DEFAULTS };
  let sectionTexts = { ...SECTION_TEXT_DEFAULTS };

  let globalContent: GlobalContent = { ...GLOBAL_DEFAULTS };
  let floatingContent: FloatingContent = FLOATING_DEFAULTS;
  let techStacksContent = undefined;
  let expertisesContent = undefined;
  let educationItems: any[] = [];
  let certificationItems: any[] = [];
  let testimonialItems: any[] = [];
  let serviceItems: any[] = [];
  let publicationItems: any[] = [];

  // Self-contained (falls back to SECTION_DEFAULTS internally on any DB
  // failure), resolved independently of the try block below so a failure
  // fetching page content can never also blank out the layout itself.
  const sections: PortfolioSectionConfig[] = await getLayoutSections();

  try {
    const db = await connectToDatabase();

    const allDocs = await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .find({})
      .toArray();

    const globalDoc = allDocs.find((doc: any) => doc.type === 'global_content');
    if (globalDoc) {
      const { _id, type, ...restGlobal } = globalDoc;
      globalContent = mergeGlobal(restGlobal as any);
    }

    // Gallery is a separate collection round-trip - skipped entirely when
    // that section is toggled off.
    const galleryDocs = isSectionEnabled(sections, 'gallery')
      ? await db.connection.client
          .db('portfolio_cms')
          .collection('gallery')
          .find({})
          .sort({ order: 1 })
          .toArray()
      : [];

    // Independent collections - each is queried only if its section is
    // enabled, so a disabled section costs nothing beyond a boolean check.
    [educationItems, certificationItems, testimonialItems, serviceItems, publicationItems] =
      await Promise.all([
        isSectionEnabled(sections, 'education') ? getPublicItems('education') : [],
        isSectionEnabled(sections, 'certifications') ? getPublicItems('certifications') : [],
        isSectionEnabled(sections, 'testimonials') ? getPublicItems('testimonials') : [],
        isSectionEnabled(sections, 'services') ? getPublicItems('services') : [],
        isSectionEnabled(sections, 'publications') ? getPublicItems('publications') : [],
      ]);

    const heroDoc = allDocs.find((doc: any) => doc.type === 'hero_content');
    if (heroDoc) {
      heroContent = {
        greeting: heroDoc.greeting || heroContent.greeting,
        aiPhrases: heroDoc.aiPhrases || heroContent.aiPhrases,
        firstName: heroDoc.firstName || heroContent.firstName,
        lastName: heroDoc.lastName || heroContent.lastName,
        subtitle: heroDoc.subtitle || heroContent.subtitle,
        description: heroDoc.description || heroContent.description,
      };
    }

    const aboutDoc = allDocs.find((doc: any) => doc.type === 'about_content');
    if (aboutDoc) {
      aboutContent = {
        bioText: aboutDoc.bioText || aboutContent.bioText,
        whatIDo: aboutDoc.whatIDo?.length ? aboutDoc.whatIDo : aboutContent.whatIDo,
        quote: aboutDoc.quote || aboutContent.quote,
        stats: aboutDoc.stats?.length ? aboutDoc.stats : aboutContent.stats,
        statusTitle: aboutDoc.statusTitle || aboutContent.statusTitle,
        statusLabel: aboutDoc.statusLabel || aboutContent.statusLabel,
        kernelValue: aboutDoc.kernelValue || aboutContent.kernelValue,
        uptimeValue: aboutDoc.uptimeValue || aboutContent.uptimeValue,
      };
    }

    const experienceDoc = allDocs.find((doc: any) => doc.type === 'experience_content');
    if (experienceDoc && experienceDoc.experiences?.length) {
      experienceContent = experienceDoc.experiences;
    }

    const skillsDoc = allDocs.find((doc: any) => doc.type === 'skills_content');
    if (skillsDoc && skillsDoc.categories?.length) {
      skillsContent = skillsDoc.categories;
    }

    const projectsDoc = allDocs.find((doc: any) => doc.type === 'projects_content');
    if (projectsDoc && projectsDoc.projects?.length) {
      projectsContent = projectsDoc.projects;
    }
    if (projectsDoc) {
      projectsCta = { label: projectsDoc.ctaLabel ?? '', url: projectsDoc.ctaUrl ?? '' };
    }

    const roadmapDoc = allDocs.find((doc: any) => doc.type === 'roadmap_content');
    if (roadmapDoc && roadmapDoc.roadmapItems?.length) {
      roadmapContent = roadmapDoc.roadmapItems;
    }

    const contactDoc = allDocs.find((doc: any) => doc.type === 'contact_content');
    if (contactDoc) {
      const { _id, type, ...rest } = contactDoc;
      contactContent = { ...contactContent, ...rest };
    }

    const techStacksDoc = allDocs.find((doc: any) => doc.type === 'techstacks_content');
    if (techStacksDoc?.content) {
      techStacksContent = techStacksDoc.content;
    }

    const expertisesDoc = allDocs.find((doc: any) => doc.type === 'expertises_content');
    if (Array.isArray(expertisesDoc?.content)) {
      expertisesContent = expertisesDoc.content.map((item: any) => ({
        ...item,
        name: item.title || item.name,
      }));
    }

    const floatingDoc = allDocs.find((doc: any) => doc.type === 'floating_contact');
    if (floatingDoc) {
      const { _id, type, ...restFloating } = floatingDoc;
      floatingContent = mergeFloating(restFloating as any);
    }

    const headingsDoc = allDocs.find((doc: any) => doc.type === 'headings_content');
    if (headingsDoc) {
      const { _id, type, ...rest } = headingsDoc;
      sectionTexts = { ...sectionTexts, ...rest };
      if (rest.contactHeading) contactContent.heading = rest.contactHeading;
      if (rest.contactHighlight) contactContent.highlight = rest.contactHighlight;
      if (rest.contactSubtext) contactContent.subtext = rest.contactSubtext;
    }

    if (galleryDocs.length) {
      galleryItems = galleryDocs.map((d: any) => ({
        id: d.order,
        src: d.src,
        alt: d.alt,
        date: d.date,
        width: d.width,
        height: d.height,
        category: d.category,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch homepage content', error);
  }

  // Resolve the active avatar to its real (Cloudinary/GitHub) URL and bake it
  // into the static HTML. The hero LCP image then loads that URL directly via
  // the image optimizer, instead of hitting the `/api/avatar` 302 redirect (a
  // serverless-function + redirect round-trip that was sitting on the LCP path).
  // On-demand revalidation (the avatars save route) refreshes it when the
  // active avatar changes, so baking it in stays correct.
  const [resolvedAvatarUrl, theme] = await Promise.all([getActiveAvatarUrl(), getTheme()]);
  globalContent.avatarUrl = resolvedAvatarUrl;

  // schema.org ProfilePage, built from CMS content (nothing hardcoded): the
  // person's name/title from the hero, links from the global socials, and the
  // current roles from the experience entries marked "Present".
  const identity = await getSiteIdentity();
  const currentRoles = (experienceContent as any[]).filter((e) =>
    /present|current|now/i.test(String(e?.period ?? ''))
  );
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: identity.personName,
      jobTitle: identity.jobTitle,
      url: SITE_URL,
      sameAs: identity.sameAs,
      image: globalContent.avatarUrl.startsWith('/')
        ? `${SITE_URL}${globalContent.avatarUrl}`
        : globalContent.avatarUrl,
      description: heroContent.description,
      ...(currentRoles.length
        ? {
            worksFor: currentRoles.map((e) => ({
              '@type': 'Organization',
              name: e.company,
              roleName: e.displayRole || e.role,
            })),
          }
        : {}),
    },
  };

  // The dynamic rendering pipeline: sort ascending by `order`, filter out
  // isEnabled: false, and exclude the route-level `kits` entry - all handled
  // by getRenderableSections(). What's left is looked up in
  // SECTION_COMPONENT_MAP and rendered in that precise sequence. Adding a
  // brand new section to the product is "one SECTION_REGISTRY entry, one
  // SECTION_COMPONENT_MAP entry, one sectionProps entry" - never a rewrite of
  // this return statement.
  const renderableSections = getRenderableSections(sections);

  // Icons are stored by name in the CMS; resolve the ones this page uses to
  // plain SVG data on the server, so no icon library is sent to the browser.
  const icons = await resolveIconMap([
    ...globalContent.socials.map((s) => s.icon),
    ...globalContent.footerSocials.map((s) => s.icon),
    ...floatingContent.items.map((i) => i.icon),
  ]);

  // Per-id props, since these components take heterogeneous shapes (Hero
  // needs `global`, Projects needs `githubUrl`, the five collection-backed
  // sections just need `content`) that no single uniform prop object could
  // express. Every key here has a matching entry in SECTION_COMPONENT_MAP.
  const sectionProps: Record<string, Record<string, unknown>> = {
    hero: { content: heroContent, global: globalContent, icons, uiStyle: theme.uiStyle },
    about: {
      content: aboutContent,
      heading: sectionTexts.aboutHeading,
      terminalPrefix: sectionTexts.terminalPrefix,
    },
    education: { content: educationItems, terminalPrefix: sectionTexts.terminalPrefix },
    experience: {
      content: experienceContent,
      heading: sectionTexts.experienceHeading,
      terminalPrefix: sectionTexts.terminalPrefix,
    },
    certifications: { content: certificationItems, terminalPrefix: sectionTexts.terminalPrefix },
    skills: {
      content: skillsContent,
      heading: sectionTexts.skillsHeading,
      terminalPrefix: sectionTexts.terminalPrefix,
    },
    expertises: {
      content: expertisesContent,
      heading: sectionTexts.expertisesHeading,
      terminalPrefix: sectionTexts.terminalPrefix,
    },
    techStacks: {
      content: techStacksContent,
      heading: sectionTexts.techStacksHeading,
      terminalPrefix: sectionTexts.terminalPrefix,
    },
    services: { content: serviceItems, terminalPrefix: sectionTexts.terminalPrefix },
    projects: {
      content: projectsContent,
      githubUrl: globalContent.githubProfileUrl,
      ctaLabel: projectsCta.label,
      ctaUrl: projectsCta.url,
      heading: sectionTexts.projectsHeading,
      terminalPrefix: sectionTexts.terminalPrefix,
    },
    publications: { content: publicationItems, terminalPrefix: sectionTexts.terminalPrefix },
    testimonials: { content: testimonialItems, terminalPrefix: sectionTexts.terminalPrefix },
    roadmap: {
      content: roadmapContent,
      heading: sectionTexts.roadmapHeading,
      highlight: sectionTexts.roadmapHighlight,
    },
    gallery: {
      items: galleryItems,
      ownerName: globalContent.headerName?.replace('~/', '') || globalContent.brandName,
      heading: sectionTexts.galleryHeading,
      highlight: sectionTexts.galleryHighlight,
      subtext: sectionTexts.gallerySubtext,
    },
    contact: { content: contactContent },
  };

  return (
    // bg-background commented out to remove solid background color
    <main className="min-h-screen ">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Header
        brand={toHeaderBrand(globalContent)}
        toggles={toNavToggles(sections)}
        uiStyle={theme.uiStyle}
      />
      {renderableSections.map((section) => {
        const Component = SECTION_COMPONENT_MAP[section.id];
        if (!Component) return null;
        return (
          <Fragment key={section.id}>
            <Component {...sectionProps[section.id]} />
          </Fragment>
        );
      })}
      <Footer content={globalContent} icons={icons} />
      <FloatingContact content={floatingContent} icons={icons} />
    </main>
  );
}
