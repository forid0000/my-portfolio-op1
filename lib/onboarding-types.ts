/**
 * Shared, dependency-free types and static metadata for the admin onboarding
 * (getting-started checklist + guided tour). Safe to import from client code;
 * the server-side status logic lives in lib/onboarding.ts.
 */

/** Stable ids; they are persisted (in `skipped`), so never rename one. */
export const ONBOARDING_ITEM_IDS = [
  'authenticator',
  'admin-password',
  'notes-vault',
  'profile',
  'hero',
  'about',
  'avatar',
  'sections',
  'appearance',
  'seo',
  'contact-email',
  'cloudinary',
] as const;

export type OnboardingItemId = (typeof ONBOARDING_ITEM_IDS)[number];

export type OnboardingGroupId = 'secure' | 'content' | 'services';

export const ONBOARDING_GROUPS: Record<OnboardingGroupId, { title: string; description: string }> =
  {
    secure: {
      title: 'Secure your account',
      description: 'Lock the admin panel and the private notes vault.',
    },
    content: {
      title: 'Make it yours',
      description: 'Replace the placeholder content visitors see.',
    },
    services: {
      title: 'Connect services',
      description: 'Optional extras that switch on when you add their keys.',
    },
  };

/** What the owner has done so far; persisted in the `settings` collection. */
export interface OnboardingState {
  /** The welcome prompt on the dashboard has been answered. */
  welcomeSeen: boolean;
  /** The guided tour was finished or skipped. */
  tourDone: boolean;
  /** The checklist card is hidden from the dashboard. */
  checklistDismissed: boolean;
  /** Optional items the owner chose to skip. */
  skipped: OnboardingItemId[];
}

export interface OnboardingItem {
  id: OnboardingItemId;
  group: OnboardingGroupId;
  title: string;
  description: string;
  /** Where to go to do it (may include a #section anchor). */
  href: string;
  optional: boolean;
  /** Detected from the real configuration, not from clicks. */
  done: boolean;
  skipped: boolean;
  /** Extra context shown under the description (for example a missing prerequisite). */
  hint?: string;
}

export interface OnboardingOverview {
  state: OnboardingState;
  items: OnboardingItem[];
  /** Items that are done or skipped. */
  completed: number;
  total: number;
  percent: number;
  /** The first item that still needs attention, if any. */
  nextId: OnboardingItemId | null;
}

export type OnboardingAction =
  | { action: 'welcome-seen' }
  | { action: 'tour-done' }
  | { action: 'skip'; id: OnboardingItemId }
  | { action: 'unskip'; id: OnboardingItemId }
  | { action: 'dismiss-checklist' }
  | { action: 'show-checklist' }
  | { action: 'reset' };
