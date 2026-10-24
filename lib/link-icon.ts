/**
 * Which icon goes in front of a link ("Live site", "Research paper", "Book now"...).
 *
 * Not everybody has a GitHub: a doctor links a research paper, a plumber a booking page, a
 * photographer a gallery. The owner can pick any icon for a link in the admin; when they do not
 * ("Automatic"), the icon is worked out from the address first (github.com, youtube.com, doi.org...)
 * and then from the words of the label. Pure and client-safe: the admin shows the same guess the
 * public page uses. The names are the ones every icon component resolves (lib/icons/resolve.ts).
 */
export interface LinkIconInput {
  label?: string;
  url?: string;
  /** The owner's own choice; empty or missing = automatic. */
  icon?: string;
}

/** What is shown when nothing fits. */
export const DEFAULT_LINK_ICON = 'ExternalLink';

/** Icon names are plain identifiers (lucide, react-icons, brand marks); nothing else is kept. */
export const ICON_NAME_RE = /^[A-Za-z][A-Za-z0-9]{0,47}$/;

export function cleanIconName(value: unknown): string {
  return typeof value === 'string' && ICON_NAME_RE.test(value.trim()) ? value.trim() : '';
}

const HOST_RULES: [RegExp, string][] = [
  [/(^|\.)github\.com$/, 'Github'],
  [/(^|\.)gitlab\.com$/, 'Gitlab'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'Youtube'],
  [/(^|\.)linkedin\.com$/, 'Linkedin'],
  [/(^|\.)behance\.net$/, 'SiBehance'],
  [/(^|\.)dribbble\.com$/, 'Dribbble'],
  [/(^|\.)figma\.com$/, 'Figma'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)facebook\.com$/, 'Facebook'],
  [/(^|\.)(twitter\.com|x\.com)$/, 'Twitter'],
  [/(^|\.)(vimeo\.com)$/, 'CirclePlay'],
  [
    /(^|\.)(doi\.org|arxiv\.org|ncbi\.nlm\.nih\.gov|researchgate\.net|scholar\.google\.com|sciencedirect\.com|springer\.com|nature\.com|ieee\.org|jstor\.org|semanticscholar\.org|orcid\.org|academia\.edu)$/,
    'FileText',
  ],
  [/(^|\.)(wa\.me|whatsapp\.com|t\.me|telegram\.me)$/, 'MessageCircle'],
  [/(^|\.)(calendly\.com|cal\.com)$/, 'CalendarDays'],
];

/** Words of the label, most specific first; the first rule that matches wins. */
const WORD_RULES: [RegExp, string][] = [
  [/\b(github|git hub)\b/i, 'Github'],
  [/\b(gitlab)\b/i, 'Gitlab'],
  [
    /\b(book now|booking|book online|book a|appointment|schedule|reserve|reservation|calendar)\b/i,
    'CalendarDays',
  ],
  [
    /\b(paper|research|journal|publication|thesis|study|abstract|doi|whitepaper|white paper|report|pdf|document|resume|cv|case study|article)\b/i,
    'FileText',
  ],
  [/\b(course|class|lesson|training|workshop|webinar|tutorial)\b/i, 'GraduationCap'],
  [/\b(book|ebook|e-book|read)\b/i, 'BookOpen'],
  [/\b(video|watch|demo|trailer|reel|talk|lecture|recording|youtube)\b/i, 'CirclePlay'],
  [/\b(podcast|episode|audio|listen)\b/i, 'Headphones'],
  [/\b(download|brochure|catalog|catalogue|price list|install|apk)\b/i, 'Download'],
  [/\b(shop|store|buy|order|purchase|menu)\b/i, 'ShoppingBag'],
  [/\b(map|directions|location|find us|address)\b/i, 'MapPin'],
  [/\b(call|phone|hotline)\b/i, 'Phone'],
  [/\b(email|e-mail|contact|write to us)\b/i, 'Mail'],
  [/\b(chat|whatsapp|telegram|message)\b/i, 'MessageCircle'],
  [/\b(gallery|photos|pictures|album|before and after|before\/after|portfolio)\b/i, 'Images'],
  [/\b(review|reviews|testimonial|testimonials|rating|feedback)\b/i, 'Star'],
  [
    /\b(licen[sc]e|certificate|certification|credential|verify|accreditation|badge)\b/i,
    'BadgeCheck',
  ],
  [/\b(press|news|media|interview|featured|magazine)\b/i, 'Newspaper'],
  [/\b(donate|support|sponsor|charity|fund)\b/i, 'Heart'],
  [/\b(source|source code|code|repo|repository)\b/i, 'Code'],
  [/\b(website|web site|site|live|homepage|home page|visit)\b/i, 'Globe'],
];

function hostOf(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(
      /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`
    ).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** The icon chosen automatically for this label and address. */
export function autoLinkIcon(label: string | undefined, url: string | undefined): string {
  const host = hostOf(url);
  if (host) {
    for (const [pattern, icon] of HOST_RULES) if (pattern.test(host)) return icon;
  }
  const text = (label ?? '').trim();
  if (text) {
    for (const [pattern, icon] of WORD_RULES) if (pattern.test(text)) return icon;
  }
  return DEFAULT_LINK_ICON;
}

/** The icon to draw: the owner's choice, otherwise the automatic one. */
export function linkIconName(link: LinkIconInput): string {
  return cleanIconName(link.icon) || autoLinkIcon(link.label, link.url);
}

/** Every icon name a list of links needs (for the server to turn into drawings). */
export function linkIconNames(links: LinkIconInput[]): string[] {
  return [...new Set(links.map(linkIconName))];
}

/**
 * Icons offered up front in the admin, for every kind of work. "Search every icon" in the picker
 * reaches the other 50,000.
 */
export const LINK_ICON_CHOICES: { name: string; label: string }[] = [
  { name: 'ExternalLink', label: 'Link' },
  { name: 'Globe', label: 'Website' },
  { name: 'FileText', label: 'Document or paper' },
  { name: 'BookOpen', label: 'Book or article' },
  { name: 'GraduationCap', label: 'Course' },
  { name: 'CirclePlay', label: 'Video' },
  { name: 'Headphones', label: 'Audio or podcast' },
  { name: 'Download', label: 'Download' },
  { name: 'Images', label: 'Gallery' },
  { name: 'CalendarDays', label: 'Booking' },
  { name: 'MapPin', label: 'Location' },
  { name: 'ShoppingBag', label: 'Shop' },
  { name: 'Phone', label: 'Phone' },
  { name: 'Mail', label: 'Email' },
  { name: 'MessageCircle', label: 'Chat' },
  { name: 'Star', label: 'Reviews' },
  { name: 'BadgeCheck', label: 'Certificate or licence' },
  { name: 'Newspaper', label: 'Press' },
  { name: 'Heart', label: 'Support' },
  { name: 'Briefcase', label: 'Work' },
  { name: 'Stethoscope', label: 'Health' },
  { name: 'Microscope', label: 'Science' },
  { name: 'Wrench', label: 'Repairs' },
  { name: 'Palette', label: 'Design' },
  { name: 'Camera', label: 'Photos' },
  { name: 'Code', label: 'Code' },
  { name: 'Github', label: 'GitHub' },
  { name: 'Gitlab', label: 'GitLab' },
  { name: 'Linkedin', label: 'LinkedIn' },
  { name: 'Youtube', label: 'YouTube' },
  { name: 'Instagram', label: 'Instagram' },
  { name: 'Facebook', label: 'Facebook' },
  { name: 'Twitter', label: 'X / Twitter' },
  { name: 'Figma', label: 'Figma' },
  { name: 'Dribbble', label: 'Dribbble' },
  { name: 'SiBehance', label: 'Behance' },
];
