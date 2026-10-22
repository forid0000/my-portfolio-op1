/**
 * Floating "Let's Connect" popup content. Pure data (client-safe - no DB import)
 * so the public component, the homepage, and the API route can all share it.
 */

export interface FloatingItem {
  label: string;
  value: string;
  copyValue: string;
  href: string;
  icon: string;
}

export interface FloatingContent {
  heading: string;
  subtext: string;
  buttonLabel: string;
  buttonSubLabel: string;
  footerText: string;
  items: FloatingItem[];
}

export const FLOATING_DEFAULTS: FloatingContent = {
  heading: "Let's Connect",
  subtext: 'Reach out anywhere',
  buttonLabel: "Let's Connect",
  buttonSubLabel: "Let's talk",
  footerText: 'Available for new opportunities',
  items: [
    {
      label: 'Email',
      value: 'you@example.com',
      copyValue: 'you@example.com',
      href: 'mailto:you@example.com',
      icon: 'Mail',
    },
    {
      label: 'LinkedIn',
      value: 'linkedin.com/in/your-username',
      copyValue: 'https://www.linkedin.com/in/your-username',
      href: 'https://www.linkedin.com/in/your-username',
      icon: 'Linkedin',
    },
    {
      label: 'GitHub',
      value: 'github.com/your-username',
      copyValue: 'https://github.com/your-username',
      href: 'https://github.com/your-username',
      icon: 'Github',
    },
    {
      label: 'Dev.to',
      value: 'dev.to/your-username',
      copyValue: 'https://dev.to/your-username',
      href: 'https://dev.to/your-username',
      icon: 'DevToIcon',
    },
  ],
};

export function mergeFloating(doc: any): FloatingContent {
  if (!doc) return FLOATING_DEFAULTS;

  const { _id, type, updatedAt, ...rest } = doc;

  return {
    heading: rest.heading || FLOATING_DEFAULTS.heading,
    subtext: rest.subtext || FLOATING_DEFAULTS.subtext,
    buttonLabel: rest.buttonLabel || FLOATING_DEFAULTS.buttonLabel,
    buttonSubLabel: rest.buttonSubLabel || FLOATING_DEFAULTS.buttonSubLabel,
    footerText: rest.footerText || FLOATING_DEFAULTS.footerText,
    items: rest.items?.length ? rest.items : FLOATING_DEFAULTS.items,
  };
}
