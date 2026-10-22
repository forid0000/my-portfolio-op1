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

/** Shared "terminal prompt" prefix shown in front of each section heading. */
export const DEFAULT_TERMINAL_PREFIX = 'dev@portfolio';

/** Local placeholder avatar (public/avatar-placeholder.png). */
export const AVATAR_PLACEHOLDER_URL = '/avatar-placeholder.png';

export const GLOBAL_CONTENT_DEFAULTS = {
  brandName: 'Your Name',
  footerText:
    'Building scalable architectures, ensuring robust security, and deploying modern full-stack web applications.',
  copyrightName: 'YOUR NAME',
  avatarUrl: '/api/avatar',
  headerName: '~/YOUR.NAME',
  headerTag: 'Full-Stack_Dev',
  githubProfileUrl: 'https://github.com/your-username',
  locationLabel: 'Your City, Country',
  timeZone: 'UTC',
  socials: [
    { href: 'https://github.com/your-username', label: 'GitHub', icon: 'Github' },
    { href: 'https://www.linkedin.com/in/your-username', label: 'LinkedIn', icon: 'Linkedin' },
    { href: 'https://dev.to/your-username', label: 'Dev.to', icon: 'DevToIcon' },
    { href: 'mailto:you@example.com', label: 'Email', icon: 'Mail' },
  ] as SocialLinkDefault[],
  footerSocials: [
    { href: 'https://www.linkedin.com/in/your-username', label: 'LinkedIn', icon: 'Linkedin' },
    { href: 'https://github.com/your-username', label: 'GitHub', icon: 'Github' },
    { href: 'https://dev.to/your-username', label: 'Dev.to', icon: 'DevToIcon' },
    { href: 'https://medium.com/@your-username', label: 'Medium', icon: 'MediumIcon' },
    { href: 'mailto:you@example.com', label: 'Email', icon: 'Mail' },
  ] as SocialLinkDefault[],
};

export const HERO_DEFAULTS = {
  greeting: 'WELCOME TO MY PORTFOLIO...',
  aiPhrases:
    'checking environment..., analyzing repository..., hunking data..., punking algorithms..., compiling assets...',
  firstName: 'YOUR',
  lastName: 'NAME',
  subtitle: 'Full-Stack Developer || Your Tagline Here --',
  description:
    'Building scalable, secure web applications with modern technologies. Edit this text from the admin dashboard.',
};

export const ABOUT_DEFAULTS = {
  bioText:
    '> Initializing user profile... \n\nI am **Your Name**, a software engineer who builds **secure, scalable systems**. Replace this bio from the admin dashboard (`/administrator/about`).',
  whatIDo: [
    {
      title: 'Web_Development',
      desc: 'Deploying responsive, production-grade interfaces using Next.js/React standard protocols.',
    },
    {
      title: 'Backend_Architecture',
      desc: 'Engineering robust REST/GraphQL pipelines with Node.js & PostgreSQL databases.',
    },
    {
      title: 'DevOps_Automation',
      desc: 'Configuring CI/CD flows, Docker containerization, and automated deployment scripts.',
    },
    {
      title: 'Security_Protocol',
      desc: 'Executing vulnerability assessments and implementing strict secure coding standards.',
    },
  ],
  quote: 'Code with purpose, learn with curiosity, build with ethics.',
  stats: [
    { value: '10+', label: 'PROJECTS_SHIPPED', icon: 'Code2' },
    { value: '05+', label: 'YEARS_UPTIME', icon: 'Globe' },
    { value: '100%', label: 'SYS_SECURITY', icon: 'ShieldCheck' },
  ],
  statusTitle: 'Open to Collaboration',
  statusLabel: 'AVAILABLE',
  kernelValue: 'Linux 6.x',
  uptimeValue: '99.9%',
};

export const EXPERIENCE_DEFAULTS = [
  {
    role: 'Software_Engineer',
    displayRole: 'Software Engineer',
    company: 'Example Company',
    type: 'FULL_TIME',
    period: '2024 - Present',
    location: 'Remote',
    description:
      'Describe what you build here. Shipping features, mentoring teammates, and keeping production healthy.',
    skills: ['TypeScript', 'DevOps', 'Leadership'],
  },
  {
    role: 'Open_Source_Contributor',
    displayRole: 'Open Source Contributor',
    company: 'Example Community',
    type: 'PART_TIME',
    period: '2022 - Present',
    location: 'Remote',
    description:
      'Describe community or volunteer work here. Add, reorder or remove entries from the admin dashboard.',
    skills: ['Open Source', 'Documentation', 'Review'],
  },
];

export const SKILLS_DEFAULTS = [
  {
    name: 'Frontend_Stack',
    icon: 'Layout',
    skills: [
      { name: 'React.js / Next.js', progress: 90 },
      { name: 'TypeScript', progress: 85 },
      { name: 'Tailwind CSS', progress: 90 },
      { name: 'Accessibility', progress: 80 },
    ],
  },
  {
    name: 'Backend_Core',
    icon: 'Server',
    skills: [
      { name: 'Node.js & Express', progress: 90 },
      { name: 'Python', progress: 80 },
      { name: 'Redis (Caching)', progress: 75 },
      { name: 'REST & GraphQL', progress: 85 },
    ],
  },
  {
    name: 'Database_&_ORM',
    icon: 'Database',
    skills: [
      { name: 'PostgreSQL', progress: 85 },
      { name: 'MongoDB', progress: 85 },
      { name: 'Prisma ORM', progress: 80 },
      { name: 'Supabase / Firebase', progress: 70 },
    ],
  },
  {
    name: 'DevOps_&_Cloud',
    icon: 'Cpu',
    skills: [
      { name: 'Docker & Compose', progress: 85 },
      { name: 'Cloud (AWS/Azure/GCP)', progress: 75 },
      { name: 'CI/CD Pipelines', progress: 85 },
      { name: 'Linux (Server)', progress: 90 },
    ],
  },
  {
    name: 'Infrastructure_&_Net',
    icon: 'Globe',
    skills: [
      { name: 'Self-Hosting', progress: 80 },
      { name: 'Nginx / Caddy', progress: 80 },
      { name: 'System Hardening', progress: 75 },
      { name: 'Reverse Proxies', progress: 80 },
    ],
  },
  {
    name: 'R&D_&_Workflow',
    icon: 'Users',
    skills: [
      { name: 'Open Source Scouting', progress: 90 },
      { name: 'Mentorship & Team Lead', progress: 80 },
      { name: 'Rapid Prototyping', progress: 85 },
      { name: 'Tech Exploration', progress: 90 },
    ],
  },
];

export const PROJECTS_DEFAULTS = [
  {
    title: 'Project_One',
    description:
      'A short description of your flagship project: the problem it solves, the stack behind it and the result it delivered. Replace this from the admin dashboard.',
    tags: ['Next.js', 'TypeScript', 'Production'],
    github: 'https://github.com/your-username/project-one',
    demo: 'https://example.com',
    featured: true,
  },
  {
    title: 'Project_Two',
    description:
      'Another project worth showing: an API, a CLI tool or an open source library. Add a demo link only if there is a live one.',
    tags: ['Node.js', 'PostgreSQL', 'Backend'],
    github: 'https://github.com/your-username/project-two',
  },
  {
    title: 'Project_Three',
    description:
      'Use this slot for something experimental or educational. Tags help visitors skim what each project is built with.',
    tags: ['Python', 'Automation', 'DevOps'],
    github: 'https://github.com/your-username/project-three',
  },
];

export const ROADMAP_DEFAULTS = [
  {
    year: 'Phase 1',
    title: 'Cloud_Infrastructure_Mastery',
    description:
      'Moving from console to code. Implementing infrastructure as code and immutable deployment patterns.',
    tech: ['Terraform', 'CloudFormation', 'VPC', 'Lambda'],
    icon: 'Server',
  },
  {
    year: 'Phase 2',
    title: 'Kubernetes_Orchestration',
    description:
      'Deep dive into cluster management. Building self-healing workloads, ingress and service mesh architecture.',
    tech: ['Docker', 'K8s', 'Helm', 'Istio'],
    icon: 'Cpu',
  },
  {
    year: 'Phase 3',
    title: 'Security_Certification',
    description:
      'Structured study towards a security certification: threat modelling, hardening and incident response.',
    tech: ['Recon', 'Hardening', 'Threat Modelling', 'Pentesting'],
    icon: 'ShieldAlert',
  },
  {
    year: 'Phase 4',
    title: 'AI_DevOps_Integration',
    description:
      'Building automated pipelines that self-correct. AI-assisted log analysis and anomaly detection.',
    tech: ['LLM Ops', 'Python', 'VectorDB', 'Data Visualization'],
    icon: 'Bot',
  },
  {
    year: 'Beyond',
    title: 'Future_Tech_Exploration',
    description: 'Exploring emerging technologies and next-generation frameworks as they mature.',
    tech: ['Edge Computing', 'WebAssembly', 'AI Frameworks', 'Rust'],
    icon: 'Zap',
  },
];

export const CONTACT_DEFAULTS = {
  heading: "Let's Build Something",
  highlight: 'Extraordinary.',
  subtext:
    "Whether you need a complex full-stack architecture, a security audit, or a scalable DevOps pipeline, I'm ready to bring your vision into reality.",
  email: 'you@example.com',
  // Left empty on purpose: the phone / WhatsApp card is hidden until you fill it in.
  phone: '',
  whatsappLink: '',
  phoneLabel: 'Global Reach',
};

export const SECTION_TEXT_DEFAULTS = {
  galleryHeading: 'Captured',
  galleryHighlight: 'Moments',
  gallerySubtext: 'A randomized visual timeline of technical growth and personal milestones.',
  roadmapHeading: 'System',
  roadmapHighlight: 'Evolution_Path',
  projectsHeading: 'My Projects',
  skillsHeading: 'My technical arsenal...',
  experienceHeading: 'Experience',
  aboutHeading: 'About Me',
  expertisesHeading: 'My Expertises',
  techStacksHeading: 'Tech Stacks',
  terminalPrefix: DEFAULT_TERMINAL_PREFIX,
};

export const SYSTEM_DEFAULTS = {
  seoTitle: 'Your Name - Full-Stack Developer',
  seoDescription:
    'Full-Stack Developer portfolio. React, Node.js, Docker and cloud infrastructure. Edit this description from the admin dashboard (System settings).',
  seoKeywords: 'Full-Stack Developer, Web Developer, Portfolio, React, Node.js, DevOps',

  notFoundTitle: '404',
  notFoundHeading: '>_ RESOURCE_NOT_FOUND _<',
  notFoundSubtext:
    "The entity you're tracking has vanished.\\nThe matrix has been altered, or the path is corrupted.",
  notFoundButton: 'RETURN TO BASE',

  errorHeading: 'System Fault Detected',
  errorTitle: 'Service Unavailable',
  errorSubtext:
    'We are experiencing temporary difficulties connecting to the core systems. Please try again later. If the issue persists, feel free to reach out directly.',
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
