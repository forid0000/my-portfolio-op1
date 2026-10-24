/**
 * The kinds of publication (Admin -> Publications) with the words and the default icon each one
 * gets. Pure and client-safe: the admin form, the public list and the schema all read it.
 * Anything saved before the list grew (`article`, `talk`, `video`, `opensource`, `press`,
 * `podcast`) stays valid.
 */
export const PUBLICATION_TYPE_OPTIONS = [
  'article',
  'paper',
  'book',
  'talk',
  'video',
  'podcast',
  'course',
  'press',
  'opensource',
  'other',
] as const;

export type PublicationType = (typeof PUBLICATION_TYPE_OPTIONS)[number];

export const PUBLICATION_TYPE_META: Record<PublicationType, { label: string; icon: string }> = {
  article: { label: 'Article or blog post', icon: 'Newspaper' },
  paper: { label: 'Research paper or study', icon: 'FileText' },
  book: { label: 'Book or chapter', icon: 'BookOpen' },
  talk: { label: 'Talk or presentation', icon: 'Mic' },
  video: { label: 'Video', icon: 'CirclePlay' },
  podcast: { label: 'Podcast or audio', icon: 'Headphones' },
  course: { label: 'Course or workshop', icon: 'GraduationCap' },
  press: { label: 'Press or interview', icon: 'FileText' },
  opensource: { label: 'Open-source project', icon: 'Github' },
  other: { label: 'Something else', icon: 'Link' },
};

export function publicationIconName(type: string | undefined, custom?: string): string {
  const meta = PUBLICATION_TYPE_META[(type || 'article') as PublicationType];
  return custom?.trim() || meta?.icon || 'Newspaper';
}
