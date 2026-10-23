/**
 * Placeholder content shown until you replace it from the admin dashboard
 * (/administrator). This is the single source of default truth: the public
 * homepage, the section components, the admin editors and the admin GET routes
 * all import from here instead of keeping their own copies.
 *
 * Pure data (no DB, no env), so it is safe to import from client components.
 *
 * Every value is a neutral placeholder - nothing here describes a real person.
 * Once a section is saved in the CMS, the stored document wins and these
 * defaults are only used as a fallback (for example if the database is down).
 */

export interface SocialLinkDefault {
  href: string;
  label: string;
  icon: string;
}

/** Prompt prefix shown in front of each section heading in the Terminal style (Admin -> Appearance). */
export const DEFAULT_TERMINAL_PREFIX = 'hello@portfolio';

/** Local placeholder avatar (public/avatar-placeholder.png). */
export const AVATAR_PLACEHOLDER_URL = '/avatar-placeholder.png';

export const GLOBAL_CONTENT_DEFAULTS = {
  brandName: 'Your Name',
  footerText:
    'A short line about what you do and who you do it for. Edit it in the admin dashboard.',
  copyrightName: 'Your Name',
  avatarUrl: '/api/avatar',
  headerName: 'Your Name',
  headerTag: 'Your Profession',
  // Optional: where the "view all work" button under Projects points when no address is set there.
  githubProfileUrl: '',
  locationLabel: 'Your City, Country',
  timeZone: 'UTC',
  socials: [
    { href: 'https://www.linkedin.com/in/your-username', label: 'LinkedIn', icon: 'Linkedin' },
    { href: 'mailto:you@example.com', label: 'Email', icon: 'Mail' },
  ] as SocialLinkDefault[],
  footerSocials: [
    { href: 'https://www.linkedin.com/in/your-username', label: 'LinkedIn', icon: 'Linkedin' },
    { href: 'mailto:you@example.com', label: 'Email', icon: 'Mail' },
  ] as SocialLinkDefault[],
};

export const HERO_DEFAULTS = {
  greeting: 'Welcome to my portfolio',
  // Only used by the Terminal style's typing effect.
  aiPhrases: 'warming up..., loading my story..., polishing the details...',
  firstName: 'Your',
  lastName: 'Name',
  subtitle: 'Your profession or tagline goes here',
  description:
    'A short introduction about you and the work you do. Edit this text from the admin dashboard.',
};

export const ABOUT_DEFAULTS = {
  bioText:
    'Hello, I am **Your Name**. Tell visitors who you are, what you care about and what it is like to work with you. Replace this bio from the admin dashboard (`/administrator/about`).',
  whatIDo: [
    {
      title: 'Your Specialty',
      desc: 'Describe what you do best and who it helps.',
    },
    {
      title: 'Your Process',
      desc: 'Explain how you work with clients or teams, from the first idea to the final delivery.',
    },
    {
      title: 'Your Strengths',
      desc: 'Highlight the skills or qualities that set your work apart.',
    },
  ],
  quote: 'Do work you are proud of, and be kind along the way.',
  stats: [
    { value: '10+', label: 'Projects completed', icon: 'Briefcase' },
    { value: '05+', label: 'Years of experience', icon: 'CalendarDays' },
    { value: '100%', label: 'Commitment', icon: 'Heart' },
  ],
  statusTitle: 'Open to Collaboration',
  statusLabel: 'Available',
  // Terminal style only.
  kernelValue: 'Linux 6.x',
  uptimeValue: '99.9%',
};

export const EXPERIENCE_DEFAULTS = [
  {
    role: 'Your_Role',
    displayRole: 'Your Role',
    company: 'Example Company',
    type: 'FULL_TIME',
    period: '2024 - Present',
    location: 'Remote',
    description:
      'Describe what you do here: the work you deliver, the people you work with and what you are proud of.',
    skills: ['Skill one', 'Skill two', 'Skill three'],
  },
  {
    role: 'Previous_Role',
    displayRole: 'Previous Role',
    company: 'Example Studio',
    type: 'PART_TIME',
    period: '2022 - 2024',
    location: 'Remote',
    description:
      'Add, reorder or remove entries from the admin dashboard. Freelance, volunteer and personal projects all count.',
    skills: ['Skill one', 'Skill two'],
  },
];

export const SKILLS_DEFAULTS = [
  {
    name: 'Core Skills',
    icon: 'Star',
    skills: [
      { name: 'Your main skill', progress: 90 },
      { name: 'Another strong skill', progress: 85 },
      { name: 'A supporting skill', progress: 80 },
    ],
  },
  {
    name: 'Tools',
    icon: 'Wrench',
    skills: [
      { name: 'Tool or software', progress: 90 },
      { name: 'Another tool', progress: 80 },
      { name: 'A third tool', progress: 75 },
    ],
  },
  {
    name: 'Ways of Working',
    icon: 'Users',
    skills: [
      { name: 'Communication', progress: 90 },
      { name: 'Collaboration', progress: 85 },
      { name: 'Attention to detail', progress: 85 },
    ],
  },
];

export const PROJECTS_DEFAULTS = [
  {
    title: 'Project One',
    description:
      'A short description of your flagship project: the problem it solves, how you approached it and the result it delivered. Replace this from the admin dashboard, and add pictures or videos to show it off.',
    tags: ['Category', 'Tool', 'Result'],
    links: [{ label: 'Live site', url: 'https://example.com' }],
    featured: true,
  },
  {
    title: 'Project Two',
    description:
      'Another project worth showing. Links are optional: add a case study, a live site, a gallery or nothing at all.',
    tags: ['Category', 'Tool'],
    links: [] as { label: string; url: string }[],
  },
  {
    title: 'Project Three',
    description:
      'Use this slot for something experimental or personal. Tags help visitors skim what each project is about.',
    tags: ['Experiment', 'Personal'],
    links: [] as { label: string; url: string }[],
  },
];

export const ROADMAP_DEFAULTS = [
  {
    year: 'Phase 1',
    title: 'Learn Something New',
    description: 'Describe a skill, course or milestone you are working towards right now.',
    tech: ['Topic one', 'Topic two'],
    icon: 'Target',
  },
  {
    year: 'Phase 2',
    title: 'Build Something Bigger',
    description: 'What would you like to create or achieve next, and why does it matter to you?',
    tech: ['Goal', 'Skill'],
    icon: 'Rocket',
  },
  {
    year: 'Beyond',
    title: 'Where This Leads',
    description: 'A longer-term vision for your work and the people it will reach.',
    tech: ['Vision'],
    icon: 'Sparkles',
  },
];

export const CONTACT_DEFAULTS = {
  heading: "Let's Work",
  highlight: 'Together.',
  subtext:
    "Have a project in mind or just want to say hello? Send a message and I'll get back to you as soon as I can.",
  email: 'you@example.com',
  // Left empty on purpose: the phone / WhatsApp card is hidden until you fill it in.
  phone: '',
  whatsappLink: '',
  phoneLabel: 'Call or message',
};

export const SECTION_TEXT_DEFAULTS = {
  galleryHeading: 'Gallery',
  galleryHighlight: 'Moments',
  gallerySubtext: 'A collection of moments from my work and life.',
  roadmapHeading: 'Roadmap',
  roadmapHighlight: 'Ahead',
  projectsHeading: 'Projects',
  skillsHeading: 'Skills',
  experienceHeading: 'Experience',
  aboutHeading: 'About Me',
  expertisesHeading: 'Expertise',
  techStacksHeading: 'Tools & Technologies',
  terminalPrefix: DEFAULT_TERMINAL_PREFIX,
};

export const SYSTEM_DEFAULTS = {
  seoTitle: 'Your Name - Your Profession',
  seoDescription:
    'Portfolio of Your Name: selected work, experience and ways to get in touch. Edit this description from the admin dashboard (System settings).',
  seoKeywords: 'Portfolio, Your Profession, Your City',

  notFoundTitle: '404',
  notFoundHeading: 'Page not found',
  notFoundSubtext: 'The page you are looking for does not exist or has moved.',
  notFoundButton: 'Back to home',

  errorHeading: 'Something went wrong',
  errorTitle: 'Service unavailable',
  errorSubtext:
    'We are having a temporary problem. Please try again in a moment. If it keeps happening, feel free to reach out directly.',
  errorButton: 'Try Again',
  // Empty = the "Contact Me" button on the error page is hidden.
  errorEmail: '',
};

/**
 * Dev.to account whose articles are listed under /articles. Empty by default:
 * with no username the articles page shows an empty state instead of querying
 * Dev.to (an empty `username` query would return other people's posts).
 */
export const DEFAULT_DEVTO_USERNAME = '';
