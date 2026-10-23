/**
 * The guided tour, as data. Each `target` names a `data-tour="…"` attribute in the
 * admin layout (or on the dashboard); the tour highlights the first *visible*
 * element carrying it. A step without a target (or whose target is not on screen)
 * is shown centred, so a missing element never breaks the tour.
 *
 * On phones the sidebar is an off-canvas menu: the tour opens it for targets inside
 * `[data-tour-sidebar]` and closes it for the rest, so steps need no extra flags.
 * `{mod}` in a text is replaced by the platform's shortcut key (Ctrl or ⌘).
 */
export type TourPlacement = 'right' | 'left' | 'top' | 'bottom';

export interface TourStep {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
  target?: string;
  /** Tried when `target` is not on the page (for example the checklist on another page). */
  fallbackTarget?: string;
  placement?: TourPlacement;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Your admin panel in one minute',
    body: 'Everything about your site is controlled from here: your words, your look, your passwords and your keys. No code files and no .env editing.',
  },
  {
    id: 'session',
    title: 'Your session',
    body: 'For safety you stay signed in for 15 minutes at a time. This timer turns red near the end, and a button appears to add more time. If it runs out, just sign in again with your authenticator.',
    target: 'session',
    placement: 'right',
  },
  {
    id: 'content',
    title: 'Content',
    body: 'One editor for every part of your public site.',
    bullets: [
      'Hero Section and About: the first things visitors read',
      'Experience, Projects, Services, Skills and more: add, reorder and delete entries',
      'Press Save and the live site updates',
    ],
    target: 'nav-content',
    placement: 'right',
  },
  {
    id: 'customize',
    title: 'Customize',
    body: 'Shape how the whole site looks and behaves.',
    bullets: [
      'Sections & Layout: switch sections on or off and drag them into order',
      'Appearance: colors and corner roundness',
      'Global Settings: your name, header, footer and social links',
      'Section Texts: the headings above each section',
    ],
    target: 'nav-customize',
    placement: 'right',
  },
  {
    id: 'media',
    title: 'Media',
    body: 'Upload your photo and résumé in Media Manager, and curate the photo wall in Gallery. Uploads need image storage, which you connect under Security & Keys.',
    target: 'nav-media',
    placement: 'right',
  },
  {
    id: 'security',
    title: 'Security & Keys',
    body: 'All passwords and keys live here, encrypted, and are never shown again after saving.',
    bullets: [
      'Admin sign-in: authenticator and optional password',
      'Notes vault: its password and quick-unlock',
      'Contact email and image storage keys',
      'Every change asks for a fresh authenticator code',
    ],
    target: 'nav-security',
    placement: 'right',
  },
  {
    id: 'notes',
    title: 'Private notes and publishing',
    body: 'Notes Config holds the vault settings. The vault itself is at /notes: write Markdown notes there, and use the Publish button on a note to give it a public page at /notes/your-note. The vault stays locked until you set a password or quick-unlock in Security & Keys.',
    target: 'nav-notes',
    placement: 'right',
  },
  {
    id: 'search',
    title: 'Search everything',
    body: 'Jump to any page or find an entry by typing. Press {mod} + K from anywhere.',
    target: 'search',
    placement: 'bottom',
  },
  {
    id: 'live-site',
    title: 'See it live',
    body: 'Opens your public site in a new tab. After you save a change, reload that tab to see it.',
    target: 'live-site',
    placement: 'right',
  },
  {
    id: 'checklist',
    title: 'Your getting-started list',
    body: 'The Dashboard keeps a checklist of what is done and what is left, with a button for each task. Work through it at your own pace; it ticks itself off as you configure things. You can restart this tour any time from the sidebar.',
    target: 'checklist',
    fallbackTarget: 'nav-dashboard',
    placement: 'bottom',
  },
];
