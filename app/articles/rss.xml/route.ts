import { getArticleTexts, getPublishedArticles } from '@/lib/articles';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_URL } from '@/lib/site-config';
import { withTransformation } from '@/lib/cloudinary-url';

// Regenerated whenever an article is saved (revalidateArticleIndex), never on a timer.
export const revalidate = false;

const esc = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** RSS 2.0 feed of the articles written on this site, newest first. */
export async function GET() {
  const [articles, identity, { texts }] = await Promise.all([
    getPublishedArticles(50),
    getSiteIdentity(),
    getArticleTexts(),
  ]);

  const items = articles
    .map((a) => {
      const link = `${SITE_URL}/articles/${a.slug}`;
      const image = a.cover
        ? `<enclosure url="${esc(withTransformation(a.cover.src, 'c_limit,w_1200,q_auto,f_jpg'))}" type="image/jpeg" length="0" />`
        : '';
      return `    <item>
      <title>${esc(a.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      ${a.publishedAt ? `<pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>` : ''}
      <description>${esc(a.excerpt)}</description>
      ${a.tags.map((tag) => `<category>${esc(tag)}</category>`).join('')}
      ${image}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(`${texts.articlesHeading} | ${identity.siteName}`)}</title>
    <link>${esc(`${SITE_URL}/articles`)}</link>
    <description>${esc(texts.articlesSubtext)}</description>
    <atom:link href="${esc(`${SITE_URL}/articles/rss.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
