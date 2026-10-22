import connectToDatabase from '@/lib/db';
import { getGlobalContent } from '@/lib/site';
import { mergeKitsContent } from '@/lib/kits-registry';
import { DEFAULT_DEVTO_USERNAME, SYSTEM_DEFAULTS } from '@/lib/content-defaults';
import { SITE_HOST, SITE_URL } from '@/lib/site-config';

// ISR instead of force-dynamic: this file changes rarely and pulls from Dev.to
// (external), so cache and refresh every 30 min rather than rendering per hit.
export const revalidate = 1800;

function stripMarkdown(text: string): string {
  return (text || '')
    .replace(/[#*`_~>[\]!]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getHomepageDoc(type: string) {
  try {
    const db = await connectToDatabase();
    return await db.connection.client.db('portfolio_cms').collection('homepage').findOne({ type });
  } catch {
    return null;
  }
}

async function getDevToArticles(username: string) {
  // No username configured: skip (an empty query would list other people's posts).
  if (!username) return [];
  try {
    const res = await fetch(
      `https://dev.to/api/articles?username=${encodeURIComponent(username)}`,
      {
        next: { revalidate: 1800 },
      }
    );
    if (!res.ok) return [];
    return (await res.json()) as { title: string; slug: string }[];
  } catch {
    return [];
  }
}

async function getPublicNotes() {
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('notes');
    return await collection
      .find({ published: true }, { projection: { title: 1, slug: 1, updatedAt: 1 } })
      .sort({ updatedAt: -1 })
      .limit(20)
      .toArray();
  } catch {
    return [];
  }
}

export async function GET() {
  const [
    global,
    systemDoc,
    aboutDoc,
    experienceDoc,
    headingsDoc,
    skillsDoc,
    kitsDoc,
    projectsDoc,
    roadmapDoc,
  ] = await Promise.all([
    getGlobalContent(),
    getHomepageDoc('system_content'),
    getHomepageDoc('about_content'),
    getHomepageDoc('experience_content'),
    getHomepageDoc('headings_content'),
    getHomepageDoc('skills_content'),
    getHomepageDoc('kits_content'),
    getHomepageDoc('projects_content'),
    getHomepageDoc('roadmap_content'),
  ]);

  const devToUsername = ((headingsDoc?.devToUsername as string) || DEFAULT_DEVTO_USERNAME).trim();
  const canonicalTarget = headingsDoc?.articlesCanonicalTarget === 'self' ? 'self' : 'devto';

  const [articles, notes] = await Promise.all([getDevToArticles(devToUsername), getPublicNotes()]);

  const seoTitle = (systemDoc?.seoTitle as string) || SYSTEM_DEFAULTS.seoTitle;
  const seoDescription = (systemDoc?.seoDescription as string) || SYSTEM_DEFAULTS.seoDescription;
  const bio = aboutDoc?.bioText ? stripMarkdown(aboutDoc.bioText as string) : seoDescription;

  const experiences =
    (experienceDoc?.experiences as Array<{
      displayRole?: string;
      role?: string;
      company?: string;
      type?: string;
      period?: string;
    }>) || [];

  const experienceLines = experiences.length
    ? experiences
        .map(
          (e) =>
            `- **${e.displayRole || e.role}** at ${e.company} (${e.type === 'FULL_TIME' ? 'full-time' : 'part-time'}, ${e.period})`
        )
        .join('\n')
    : `- See ${SITE_URL}/#experience for current roles.`;

  const skillCategories =
    (skillsDoc?.categories as Array<{
      name?: string;
      skills?: Array<{ name?: string }>;
    }>) || [];

  const skillsLines = skillCategories.length
    ? skillCategories
        .map((cat) => {
          const label = (cat.name || '').replace(/_/g, ' ');
          const items = (cat.skills || []).map((s) => s.name).filter(Boolean);
          return `- **${label}:** ${items.join(', ')}`;
        })
        .join('\n')
    : `- See ${SITE_URL}/#skills for the current stack.`;

  const kitTools = mergeKitsContent(kitsDoc).tools;
  const kitsLines = kitTools
    .map((t) => `- [${t.name}](${SITE_URL}/kits/${t.key}): ${t.description}`)
    .join('\n');

  const projects =
    (projectsDoc?.projects as Array<{
      title?: string;
      description?: string;
      github?: string;
      demo?: string;
      tags?: string[];
      featured?: boolean;
    }>) || [];

  const projectsLines = projects.length
    ? projects
        .map((p) => {
          const url = p.demo || p.github || '';
          const tags = (p.tags || []).join(', ');
          const title = url ? `[${p.title}](${url})` : p.title;
          return `- ${title}${p.featured ? ' (Featured)' : ''}: ${p.description}${tags ? ` [${tags}]` : ''}`;
        })
        .join('\n')
    : `- See ${SITE_URL}/#projects for current work.`;

  const roadmapItems =
    (roadmapDoc?.roadmapItems as Array<{
      year?: string;
      title?: string;
      description?: string;
    }>) || [];

  const roadmapLines = roadmapItems.length
    ? roadmapItems.map((r) => `- **${r.year}:** ${r.title} - ${r.description}`).join('\n')
    : `- See ${SITE_URL}/#roadmap for the full journey.`;

  const articleLines = articles.length
    ? articles
        .slice(0, 15)
        .map((p) => `- [${p.title}](${SITE_URL}/articles/${p.slug})`)
        .join('\n')
    : '- No articles published yet.';

  const noteLines = notes.length
    ? notes.map((n: any) => `- [${n.title}](${SITE_URL}/notes/${n.slug})`).join('\n')
    : '- No public notes published yet.';

  const articlesSourceNote =
    canonicalTarget === 'self'
      ? `Articles are cross-published to Dev.to, but ${SITE_HOST} is the canonical source.`
      : 'Articles are authored on Dev.to first and mirrored here; Dev.to is the canonical source for search engines. Reactions, comments, and discussion happen on Dev.to.';

  const body = `# ${seoTitle}

> ${bio}

## Profile

- [Homepage](${SITE_URL}/): About, skills, experience, projects, and a visual timeline.
- [Contact](${SITE_URL}/#contact): Direct contact form.
- Location: ${global.locationLabel}
${global.socials.map((s) => `- ${s.label}: ${s.href}`).join('\n')}

## Current Roles

${experienceLines}

## Skills

${skillsLines}

## Projects

${projectsLines}

## Roadmap

${roadmapLines}

## Articles

${articlesSourceNote}

${articleLines}

## Free Tools (Kits)

${kitsLines}

## Notes

Selected public notes, published individually with their own SEO metadata. Anything not explicitly published stays private behind the Notes Vault's own authentication.

${noteLines}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  });
}
