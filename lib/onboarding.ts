/**
 * Admin onboarding: which setup steps are finished, and what the owner chose to
 * skip or dismiss.
 *
 * "Done" is always detected from the real configuration (a saved CMS document, a
 * stored credential, an integration key), never from a click, so the checklist
 * cannot drift from reality. Only the owner's choices (skip, dismiss, tour seen)
 * are stored, as one small `onboarding` document in the settings collection, so
 * they follow the owner across browsers and devices.
 */
import 'server-only';
import connectToDatabase from '@/lib/db';
import { getAdminAuth, getNotesPasswordHash, getNotesTotpSecret } from '@/lib/credentials';
import { describeIntegrations } from '@/lib/integrations';
import { getSetting, setSetting } from '@/lib/settings-store';
import {
  ONBOARDING_ITEM_IDS,
  type OnboardingAction,
  type OnboardingGroupId,
  type OnboardingItem,
  type OnboardingItemId,
  type OnboardingOverview,
  type OnboardingState,
} from '@/lib/onboarding-types';

const STATE_KEY = 'onboarding';

const DEFAULT_STATE: OnboardingState = {
  welcomeSeen: false,
  tourDone: false,
  checklistDismissed: false,
  skipped: [],
};

/** Reads whatever is stored, tolerating missing or malformed fields. */
function normalizeState(raw: unknown): OnboardingState {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<OnboardingState>;
  const known = new Set<string>(ONBOARDING_ITEM_IDS);
  return {
    welcomeSeen: value.welcomeSeen === true,
    tourDone: value.tourDone === true,
    checklistDismissed: value.checklistDismissed === true,
    skipped: Array.isArray(value.skipped)
      ? (Array.from(new Set(value.skipped)).filter(
          (id) => typeof id === 'string' && known.has(id)
        ) as OnboardingItemId[])
      : [],
  };
}

export async function getOnboardingState(): Promise<OnboardingState> {
  return normalizeState(await getSetting(STATE_KEY));
}

/** Applies one owner choice and returns the new state. */
export async function applyOnboardingAction(action: OnboardingAction): Promise<OnboardingState> {
  const state = await getOnboardingState();

  switch (action.action) {
    case 'welcome-seen':
      state.welcomeSeen = true;
      break;
    case 'tour-done':
      state.welcomeSeen = true;
      state.tourDone = true;
      break;
    case 'skip':
      if (!state.skipped.includes(action.id)) state.skipped.push(action.id);
      break;
    case 'unskip':
      state.skipped = state.skipped.filter((id) => id !== action.id);
      break;
    case 'dismiss-checklist':
      state.checklistDismissed = true;
      break;
    case 'show-checklist':
      state.checklistDismissed = false;
      break;
    case 'reset':
      return save({ ...DEFAULT_STATE, skipped: [] });
  }
  return save(state);
}

async function save(state: OnboardingState): Promise<OnboardingState> {
  await setSetting(STATE_KEY, state);
  return state;
}

// ── Detection ────────────────────────────────────────────────────────────────

interface Facts {
  authenticator: boolean;
  adminPassword: boolean;
  notesVault: boolean;
  /** `homepage` document types that have been saved at least once. */
  savedTypes: Set<string>;
  activeAvatar: boolean;
  smtpReady: boolean;
  cloudinaryReady: boolean;
}

const CONTENT_TYPES = [
  'global_content',
  'hero_content',
  'about_content',
  'layout_content',
  'theme_content',
  'system_content',
];

async function gatherFacts(): Promise<Facts> {
  const [auth, notesPassword, notesTotp, integrations] = await Promise.all([
    getAdminAuth(),
    getNotesPasswordHash(),
    getNotesTotpSecret(),
    describeIntegrations(),
  ]);

  const db = await connectToDatabase();
  const cms = db.connection.client.db('portfolio_cms');
  const [docs, avatars] = await Promise.all([
    cms
      .collection('homepage')
      .find({ type: { $in: CONTENT_TYPES } }, { projection: { type: 1 } })
      .toArray(),
    cms.collection('avatars').countDocuments({ isActive: true }, { limit: 1 }),
  ]);

  const isSet = (keys: string[]) =>
    keys.every((key) => integrations.find((f) => f.key === key)?.state !== 'unset');

  return {
    authenticator: auth !== null,
    adminPassword: Boolean(auth?.passwordHash),
    notesVault: Boolean(notesPassword) || Boolean(notesTotp),
    savedTypes: new Set(docs.map((d: { type?: unknown }) => String(d.type))),
    activeAvatar: avatars > 0,
    smtpReady: isSet(['SMTP_USER', 'SMTP_PASS', 'CONTACT_TO_EMAIL']),
    cloudinaryReady: isSet([
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
    ]),
  };
}

interface ItemDefinition {
  id: OnboardingItemId;
  group: OnboardingGroupId;
  title: string;
  description: string;
  href: string;
  optional: boolean;
  done: (facts: Facts) => boolean;
  hint?: (facts: Facts) => string | undefined;
}

/** In display order. Descriptions are written for someone who has never seen the panel. */
const DEFINITIONS: ItemDefinition[] = [
  {
    id: 'authenticator',
    group: 'secure',
    title: 'Authenticator app connected',
    description:
      'Signing in always needs a 6-digit code from your phone, so a stolen password alone cannot open your site.',
    href: '/administrator/security#admin-signin',
    optional: false,
    done: (f) => f.authenticator,
  },
  {
    id: 'admin-password',
    group: 'secure',
    title: 'Add a password (optional extra lock)',
    description:
      'Once set, signing in asks for the password and the authenticator code. Skip it if the code alone is enough for you.',
    href: '/administrator/security#admin-signin',
    optional: true,
    done: (f) => f.adminPassword,
  },
  {
    id: 'notes-vault',
    group: 'secure',
    title: 'Set up your private notes vault',
    description:
      'Choose a vault password and/or turn on authenticator quick-unlock, otherwise /notes stays locked. Inside the vault you can write notes, add images and publish any note to its own public page.',
    href: '/administrator/security#notes-vault',
    optional: true,
    done: (f) => f.notesVault,
  },
  {
    id: 'profile',
    group: 'content',
    title: 'Set your name, links and location',
    description:
      'Your brand name, header, footer, social links and time zone appear on every page.',
    href: '/administrator/global',
    optional: false,
    done: (f) => f.savedTypes.has('global_content'),
  },
  {
    id: 'hero',
    group: 'content',
    title: 'Write your introduction',
    description: 'The first thing visitors read: your name, role and a short description.',
    href: '/administrator/homepage',
    optional: false,
    done: (f) => f.savedTypes.has('hero_content'),
  },
  {
    id: 'about',
    group: 'content',
    title: 'Tell your story',
    description: 'Your bio, what you do and a few numbers or highlights.',
    href: '/administrator/about',
    optional: false,
    done: (f) => f.savedTypes.has('about_content'),
  },
  {
    id: 'avatar',
    group: 'content',
    title: 'Upload your photo',
    description: 'Used on the homepage, in the header and when your link is shared.',
    href: '/administrator/media-manager',
    optional: true,
    done: (f) => f.activeAvatar,
    hint: (f) => (f.cloudinaryReady ? undefined : 'Needs image storage (Cloudinary) first.'),
  },
  {
    id: 'sections',
    group: 'content',
    title: 'Choose which sections to show',
    description:
      'Switch off sections that do not apply to you and drag the rest into the order you want.',
    href: '/administrator/sections',
    optional: true,
    done: (f) => f.savedTypes.has('layout_content'),
  },
  {
    id: 'appearance',
    group: 'content',
    title: 'Pick your colors',
    description: 'Change the accent colors and corner roundness of the whole site.',
    href: '/administrator/appearance',
    optional: true,
    done: (f) => f.savedTypes.has('theme_content'),
  },
  {
    id: 'seo',
    group: 'content',
    title: 'Set your search and sharing text',
    description: 'The title and description shown on Google and when your link is shared.',
    href: '/administrator/system',
    optional: true,
    done: (f) => f.savedTypes.has('system_content'),
  },
  {
    id: 'contact-email',
    group: 'services',
    title: 'Turn on the contact form',
    description:
      'Add the details of an email provider (SMTP) so messages from visitors reach your inbox. Until then the form says it is not set up.',
    href: '/administrator/security#email',
    optional: true,
    done: (f) => f.smtpReady,
  },
  {
    id: 'cloudinary',
    group: 'services',
    title: 'Connect image storage',
    description:
      'Cloudinary (free plan) stores your photo, gallery and uploaded images. Paste its cloud name, API key and secret.',
    href: '/administrator/security#cloudinary',
    optional: true,
    done: (f) => f.cloudinaryReady,
  },
];

export async function getOnboardingOverview(): Promise<OnboardingOverview> {
  const [state, facts] = await Promise.all([getOnboardingState(), gatherFacts()]);

  const items: OnboardingItem[] = DEFINITIONS.map((def) => ({
    id: def.id,
    group: def.group,
    title: def.title,
    description: def.description,
    href: def.href,
    optional: def.optional,
    done: def.done(facts),
    skipped: def.optional && state.skipped.includes(def.id),
    hint: def.hint?.(facts),
  }));

  const completed = items.filter((i) => i.done || i.skipped).length;
  const total = items.length;
  // Suggest required steps before optional ones, so the highlighted "Next" is what matters most.
  const pending = items.filter((i) => !i.done && !i.skipped);
  const next = pending.find((i) => !i.optional) ?? pending[0];

  return {
    state,
    items,
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    nextId: next?.id ?? null,
  };
}
