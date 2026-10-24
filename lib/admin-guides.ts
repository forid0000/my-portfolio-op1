/**
 * Beginner guides shown in the admin next to every key and credential: what it is, why the site
 * needs it, the exact steps to get it, the official page to open, and how to check it works.
 *
 * Plain data and pure functions (no React, no server code): the Security & Keys page renders it, the
 * unit tests check it (every field has help, every link is https and on an official site), and the
 * written guide docs/GETTING-STARTED.md mirrors it. When a provider changes its screens, change it
 * here and bump GUIDES_CHECKED.
 */
export const GUIDES_CHECKED = 'October 2026';

export interface GuideStep {
  /** What to do, in one sentence. */
  title: string;
  /** Why, or what you will see, in plain words. */
  detail?: string;
  /** Text to copy (a command, a file, a value). */
  code?: string;
}

export interface GuideLink {
  label: string;
  /** Always https, always the provider's own site. */
  href: string;
}

/** One row of the "which provider" table (SMTP). */
export interface ProviderOption {
  name: string;
  host: string;
  port: string;
  username: string;
  password: string;
  note: string;
}

export interface Guide {
  id: GuideId;
  title: string;
  /** What it is and why the site needs it. */
  why: string;
  /** What it costs. */
  cost: string;
  /** About how long it takes. */
  time: string;
  /** What happens if you skip it. */
  ifSkipped: string;
  steps: GuideStep[];
  /** The providers' own pages, opened in a new tab. */
  links: GuideLink[];
  /** Things beginners get wrong, and safety advice. */
  tips: string[];
  /** How to check that it worked. */
  check: string[];
  providers?: ProviderOption[];
}

export type GuideId =
  'hosting' | 'authenticator' | 'admin-password' | 'notes-vault' | 'smtp' | 'cloudinary' | 'github';

const PROFILE_WORKFLOW = `name: Update profile README
on:
  repository_dispatch:
    types: [cms-updated]   # the event this site sends after every save
  workflow_dispatch:       # lets you also run it by hand from the Actions tab
jobs:
  update:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v7
      - name: Rebuild the README
        run: echo "Put the command that regenerates your README here"
`;

export const GUIDES: Record<GuideId, Guide> = {
  hosting: {
    id: 'hosting',
    title: 'The two values that live in your hosting account',
    why: 'MONGODB_URI (where your content is stored) and JWT_SECRET (the secret that signs you in) are the only settings that are not on this page. The site needs them before anyone can sign in, so they are set once in your hosting account (Vercel) and nowhere else.',
    cost: 'Free (MongoDB Atlas free cluster and Vercel hobby plan are enough to start).',
    time: 'About 15 minutes, once.',
    ifSkipped: 'The site cannot start: you only see placeholder content and cannot sign in.',
    steps: [
      {
        title: 'Create the database and copy its connection string (MONGODB_URI).',
        detail:
          'In MongoDB Atlas: create a free cluster, create a database user (letters and numbers only in the password), open Network Access and allow access from anywhere (0.0.0.0/0, because Vercel has no fixed address), then Database → Connect → Drivers and copy the string that starts with mongodb+srv://. Replace <password> (with the < and >) by your database password.',
      },
      {
        title: 'Make the secret (JWT_SECRET): 32 or more random characters.',
        detail:
          'Use your password manager’s generate button (length 48), or run this on any computer with Node.js. Save it next to the database details.',
        code: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
      },
      {
        title: 'Add both in Vercel: your project → Settings → Environment Variables.',
        detail:
          'Name on the left, value on the right, then Add. Changes apply only to new deployments, so open Deployments and Redeploy after adding them.',
      },
      {
        title: 'Open /administrator and find the setup code in Vercel → Logs.',
        detail:
          'Look for the box that says "first-run setup is pending". Type its code on the setup page, then scan the QR code with your authenticator app.',
      },
    ],
    links: [
      {
        label: 'MongoDB Atlas: get started',
        href: 'https://www.mongodb.com/docs/atlas/getting-started/',
      },
      {
        label: 'Atlas: get the driver connection string',
        href: 'https://www.mongodb.com/docs/atlas/driver-connection/',
      },
      {
        label: 'Vercel: environment variables',
        href: 'https://vercel.com/docs/environment-variables',
      },
    ],
    tips: [
      'Never change JWT_SECRET later: your authenticator and every saved key are locked with it. Changing it means setting up the admin account and keys again.',
      'A database password with symbols such as @ or / breaks the connection address. Use letters and numbers, or URL-encode the symbols.',
      'Keep both values in a password manager, not in a chat or an email.',
    ],
    check: [
      'Your site opens and /administrator shows the setup page (first time) or the sign-in page.',
      'After you save something in the admin and reload the site, your content (not the placeholder) is shown.',
    ],
  },

  authenticator: {
    id: 'authenticator',
    title: 'Authenticator app (the 6-digit code)',
    why: 'Signing in to the admin always needs a 6-digit code from an authenticator app on your phone. It changes every 30 seconds and proves it is really you, even if someone learns your password.',
    cost: 'Free.',
    time: 'About 3 minutes.',
    ifSkipped: 'You cannot sign in: the authenticator cannot be turned off.',
    steps: [
      {
        title: 'Install an authenticator app on your phone.',
        detail:
          'Any app that supports "TOTP" works: Google Authenticator, Microsoft Authenticator, 2FAS, Aegis (Android), Ente Auth, 1Password, Bitwarden, Authy.',
      },
      {
        title: 'In the app, add a new account and scan the QR code shown on this site.',
        detail:
          'If you cannot scan, choose "enter a setup key" in the app and type the written key shown under the QR code.',
      },
      {
        title: 'Save the written key in your password manager.',
        detail:
          'It is your only backup. There are no backup codes on purpose: they would be a back door into your site.',
      },
      {
        title: 'Type the 6-digit code the app shows into the page and confirm.',
        detail:
          'A code is valid for 30 seconds. If it is rejected, wait for the next one and type it again.',
      },
    ],
    links: [
      {
        label: 'Google Authenticator help',
        href: 'https://support.google.com/accounts/answer/1066447',
      },
      { label: 'Aegis Authenticator (Android, open source)', href: 'https://getaegis.app/' },
      { label: 'Ente Auth (all platforms, encrypted backup)', href: 'https://ente.io/auth/' },
      { label: '2FAS (iPhone and Android)', href: 'https://2fas.com/' },
    ],
    tips: [
      'Add the same key on a second device (or keep the written key safe) before you need it. If you lose both, someone with access to your database has to reset the account.',
      'If every code is rejected, check that your phone’s clock is set to automatic: codes depend on the exact time.',
      'Changing phones: add the account to the new phone first, check it shows valid codes, and only then remove it from the old one. Use "Replace authenticator" below only for a new key.',
    ],
    check: [
      'The next time you open /administrator you are asked for a 6-digit code and it is accepted.',
    ],
  },

  'admin-password': {
    id: 'admin-password',
    title: 'Admin password (optional extra lock)',
    why: 'The authenticator is always required. A password is an optional second lock: once you set one, signing in needs both.',
    cost: 'Free.',
    time: '1 minute.',
    ifSkipped: 'Nothing breaks: you sign in with the authenticator code alone.',
    steps: [
      {
        title: 'Let your password manager generate a password of 16 or more characters.',
        detail:
          'The minimum is 12. Longer is better than complicated: a few random words work well.',
      },
      {
        title:
          'Type it twice below, enter a current authenticator code at the top, and press Set password.',
      },
      { title: 'Save it in the password manager right away.' },
    ],
    links: [],
    tips: [
      'Do not reuse a password from another site.',
      'You can remove the password later (it asks for an authenticator code); the authenticator keeps protecting the admin.',
    ],
    check: ['The status above shows "Password: set", and the next sign-in asks for it.'],
  },

  'notes-vault': {
    id: 'notes-vault',
    title: 'Unlocking your private notes',
    why: 'Your private notes at /notes/vault stay locked for everyone, including you, until you set at least one way to open them. Visitors never see them; they only see the notes you publish.',
    cost: 'Free.',
    time: '2 minutes.',
    ifSkipped: 'The private notes stay locked for everyone.',
    steps: [
      {
        title: 'Choose how you want to open the notes (you can set both).',
        detail:
          'A vault password keeps you signed in for 7 days. Authenticator quick unlock lets you open them with a 6-digit code for 45 minutes at a time.',
      },
      {
        title: 'For a password: type it twice (8 or more characters) and press Set password.',
      },
      {
        title:
          'For quick unlock: press Enable quick unlock, scan the QR code with your authenticator app, type the code, and confirm.',
        detail:
          'Use a separate entry from the one for the admin sign-in, so you can tell them apart (label it "Notes").',
      },
      {
        title: 'Open /notes/vault and unlock it.',
        detail:
          'With quick unlock, the +15 button next to the countdown adds 15 minutes each time you press it, up to 3 hours in total from unlocking. After that, unlock again.',
      },
    ],
    links: [],
    tips: [
      'The vault password and the authenticator code are different from your admin sign-in; changing them needs a fresh admin authenticator code.',
      'Pictures and files attached to a note are private until you publish that note.',
    ],
    check: [
      'The status below shows "Password: set" and/or "Authenticator quick unlock: on".',
      '/notes/vault shows the lock screen and opens with your password or code.',
    ],
  },

  smtp: {
    id: 'smtp',
    title: 'Contact form email (SMTP)',
    why: 'When a visitor sends you a message through the contact form, the site emails it to you. For that it needs the login details of an email-sending service (SMTP). It sends the message from your server; visitors never see these details.',
    cost: 'Free on Brevo, Gmail and Resend (each has a free allowance: check their pricing page for the current limit).',
    time: 'About 10 minutes.',
    ifSkipped:
      'The contact form politely says it is not set up. Visitors can still use the email, phone and WhatsApp buttons.',
    steps: [
      {
        title: 'Pick a provider from the table (Brevo is the easiest to start with) and sign in.',
        detail: 'Any SMTP provider works. Use a dedicated email address for sending if you can.',
      },
      {
        title: 'Find its SMTP details: host, port, username and password.',
        detail:
          'Brevo: open SMTP & API in your dashboard (app.brevo.com/settings/keys/smtp) → SMTP tab → copy the login, then press Generate SMTP key and copy the key (that is the password). Gmail: turn on 2-Step Verification, open the App passwords page, create one and copy the 16 characters. Resend: the username is the word resend and the password is an API key that starts with re_.',
      },
      {
        title: 'Paste host, port, username and password into the boxes below.',
        detail:
          'Port 587 is the usual choice. Port 465 is also fine: the site switches on the secure connection by itself when the port is 465.',
      },
      {
        title: '"Deliver messages to" = the inbox where you want to read the messages.',
      },
      {
        title: '"Send messages from" = an address your provider has verified for you.',
        detail:
          'Providers refuse mail from an address they do not know. In Brevo add and verify the sender (or the whole domain); in Resend verify your domain; with Gmail use the same Gmail address. If you leave it empty, the username is used, which only works when the username is itself a valid address.',
      },
      {
        title:
          'Enter your authenticator code at the top of the page and press "Save Contact form email (SMTP)".',
      },
      { title: 'Send yourself a test message from the contact form on your site.' },
    ],
    providers: [
      {
        name: 'Brevo',
        host: 'smtp-relay.brevo.com',
        port: '587',
        username:
          'The SMTP login shown on Brevo’s SMTP & API → SMTP page (it can look like a code@smtp-brevo.com address)',
        password:
          'An SMTP key you generate on that page (not your account password, not an API key)',
        note: 'Has a free plan. The "send from" address must be a verified sender.',
      },
      {
        name: 'Gmail',
        host: 'smtp.gmail.com',
        port: '587 (or 465)',
        username: 'Your full Gmail address',
        password:
          'A 16-character App password (needs 2-Step Verification). Your normal password no longer works.',
        note: 'About 500 messages a day for a personal account. Work or school accounts may not offer app passwords.',
      },
      {
        name: 'Resend',
        host: 'smtp.resend.com',
        port: '465 (or 587)',
        username: 'resend',
        password: 'Your Resend API key (starts with re_)',
        note: 'Verify your own domain to send to other people (check Resend’s docs for what an unverified account may do).',
      },
    ],
    links: [
      { label: 'Brevo: your SMTP & API page', href: 'https://app.brevo.com/settings/keys/smtp' },
      {
        label: 'Brevo: send with SMTP (help article)',
        href: 'https://help.brevo.com/hc/en-us/articles/7924908994450',
      },
      {
        label: 'Google: create an App password',
        href: 'https://myaccount.google.com/apppasswords',
      },
      {
        label: 'Google: about app passwords',
        href: 'https://support.google.com/accounts/answer/185833',
      },
      { label: 'Resend: send with SMTP', href: 'https://resend.com/docs/send-with-smtp' },
    ],
    tips: [
      'The password is not your account password: it is a special key the provider makes for apps.',
      'If messages do not arrive, check the spam folder first, then that the "send from" address is verified at the provider.',
      'Secrets are stored encrypted and are never shown again after you save. Leave a secret box empty to keep what is saved.',
    ],
    check: [
      'Each box shows "set here" after saving.',
      'A test message sent from your contact form arrives in the "Deliver messages to" inbox.',
    ],
  },

  cloudinary: {
    id: 'cloudinary',
    title: 'Cloudinary (pictures and videos)',
    why: 'Cloudinary stores and resizes the pictures and videos you upload (profile picture, projects, services, certificates, articles, gallery) and serves them fast to visitors. The browser uploads straight to Cloudinary, so large files work.',
    cost: 'Has a free plan (check Cloudinary’s pricing page for the current allowance).',
    time: 'About 5 minutes.',
    ifSkipped:
      'You can still write everything, but uploading pictures and videos does not work, and the gallery and Media Manager stay empty.',
    steps: [
      {
        title: 'Create a free account at Cloudinary and confirm your email.',
      },
      {
        title: 'Open the Console Dashboard and copy the Cloud name.',
        detail:
          'It is shown at the top, in the Product Environment section. It is a short lowercase name, not your account name.',
      },
      {
        title: 'Open Settings (the gear in the left sidebar) → API Keys.',
        detail:
          'Copy the API key. The API secret is hidden: click to reveal it (you may be asked to confirm your password) and copy it. Only account roles Master admin, Admin or Technical admin can see these.',
      },
      {
        title: 'Paste cloud name, API key and API secret into the three boxes below.',
      },
      {
        title: 'Enter your authenticator code at the top and press "Save Cloudinary".',
      },
      {
        title:
          'Test: open Media Manager or any page with a picture box and upload a small picture.',
      },
    ],
    links: [
      {
        label: 'Cloudinary: find your credentials',
        href: 'https://cloudinary.com/documentation/finding_your_credentials_tutorial',
      },
      { label: 'Cloudinary Console', href: 'https://console.cloudinary.com/' },
    ],
    tips: [
      'The API secret works like a password: never post it in a chat, a screenshot or a public repository.',
      'If it ever leaks, create a new key on the same API Keys page, paste the new pair here, then delete the old one.',
      'Removing a picture in the admin also deletes it from Cloudinary, so your free space is not wasted.',
    ],
    check: [
      'All three boxes show "set here".',
      'Uploading a picture works, and it appears on your site after you save the page.',
    ],
  },

  github: {
    id: 'github',
    title: 'GitHub profile sync (optional, for developers)',
    why: 'If your GitHub profile README is generated from this site’s content, GitHub normally notices a change only once a day. With this, every save here tells GitHub straight away, so your profile updates within about a minute.',
    cost: 'Free.',
    time: 'About 10 minutes.',
    ifSkipped:
      'Nothing breaks. Skip it unless you have a profile README that is generated from this site.',
    steps: [
      {
        title: 'Create your profile repository if you do not have one.',
        detail:
          'It is a public repository with exactly your username as its name (for example github.com/your-username/your-username) and a README.md. GitHub shows that README on your profile.',
      },
      {
        title: 'Add a workflow that listens for the event this site sends.',
        detail:
          'Create the file .github/workflows/update-profile.yml in that repository. The event type is cms-updated. The workflow file must be on the default branch, or GitHub ignores the event.',
        code: PROFILE_WORKFLOW,
      },
      {
        title:
          'Create the access token: GitHub → your profile picture → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.',
        detail:
          'Give it a name and an expiry date you will remember. Resource owner: your account. Repository access: "Only select repositories" and pick the profile repository. Permissions → Repository permissions → Contents: Read and write. Then Generate token and copy it at once: GitHub shows it only one time.',
      },
      {
        title: 'Paste the repository as your-username/your-username and the token below.',
      },
      {
        title: 'Enter your authenticator code at the top and press "Save GitHub profile sync".',
      },
      {
        title:
          'Test: save any page in this admin, then open the Actions tab of the profile repository.',
        detail: 'A run triggered by "repository_dispatch" appears within a minute.',
      },
    ],
    links: [
      {
        label: 'GitHub: create a fine-grained token',
        href: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
      },
      {
        label: 'GitHub: new fine-grained token',
        href: 'https://github.com/settings/personal-access-tokens/new',
      },
      {
        label: 'GitHub: the repository_dispatch event',
        href: 'https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#repository_dispatch',
      },
      {
        label: 'GitHub: create a profile README',
        href: 'https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme',
      },
    ],
    tips: [
      'Give the token access to the profile repository only, never to all your repositories.',
      'Tokens expire: when yours does, syncing stops quietly (your site keeps working). Create a new one and paste it here.',
      'If nothing happens, check the token has Contents: Read and write on that repository and the workflow file is on the default branch. A classic token with the repo scope also works.',
    ],
    check: [
      'Both boxes show "set here".',
      'After a save in this admin, the profile repository’s Actions tab shows a new run within a minute.',
    ],
  },
};

/** What each integration box is, where to find it, and the usual mistake. Keyed by field key. */
export interface FieldHelp {
  where: string;
  example?: string;
  mistake?: string;
}

export const FIELD_HELP: Record<string, FieldHelp> = {
  SMTP_HOST: {
    where: 'The server address on your email provider’s SMTP page.',
    example: 'smtp-relay.brevo.com · smtp.gmail.com · smtp.resend.com',
    mistake: 'Do not add https:// or a port here: the port has its own box.',
  },
  SMTP_PORT: {
    where: 'The port number on the same SMTP page.',
    example: '587 (recommended) or 465',
    mistake: 'Leave 25 alone: most hosting providers block it.',
  },
  SMTP_USER: {
    where:
      'The SMTP login. For Brevo it is shown on the SMTP page, for Gmail it is your full address, for Resend it is the word resend.',
    mistake: 'With Brevo, use the SMTP login shown there, not necessarily your account email.',
  },
  SMTP_PASS: {
    where:
      'The SMTP key or app password the provider generates for you (Brevo: SMTP key, Gmail: 16-character App password, Resend: API key).',
    mistake: 'Your normal account password does not work, and a Brevo API key is not an SMTP key.',
  },
  CONTACT_TO_EMAIL: {
    where: 'Your own inbox: where contact-form messages should arrive.',
    example: 'you@example.com',
  },
  CONTACT_FROM_EMAIL: {
    where:
      'The address the messages appear to come from. It must be one your provider has verified.',
    example: 'noreply@your-domain.com',
    mistake:
      'An unverified address makes the provider reject the message. Empty = the SMTP username.',
  },
  CLOUDINARY_CLOUD_NAME: {
    where: 'Cloudinary Console → Dashboard, at the top (Product Environment).',
    example: 'demo-cloud',
    mistake: 'It is the cloud name, not your email, your account name or the API key.',
  },
  CLOUDINARY_API_KEY: {
    where: 'Cloudinary Console → Settings → API Keys.',
    example: 'a long number',
  },
  CLOUDINARY_API_SECRET: {
    where: 'The same API Keys page: click to reveal it (you may be asked for your password).',
    mistake: 'Paste the secret, not the key. Treat it like a password.',
  },
  GITHUB_PROFILE_REPO: {
    where: 'Your profile repository on GitHub: username/username.',
    example: 'your-username/your-username',
    mistake: 'No https://github.com/ in front, just the two names with one slash.',
  },
  GITHUB_DISPATCH_TOKEN: {
    where:
      'GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens, with Contents: Read and write on that one repository.',
    mistake: 'GitHub shows the token only once. If you lost it, generate a new one.',
  },
};

/** One line of the "what is set up" list on the Security page. */
export interface SetupItem {
  id: string;
  label: string;
  done: boolean;
  /** What "done" means, or what is missing, in plain words. */
  detail: string;
  /** Anchor on the Security page. */
  href: string;
  optional: boolean;
}

type FieldState = 'admin' | 'env' | 'unset';

/** The setup checklist, from what the Security page already knows. */
export function setupProgress(input: {
  adminHasPassword: boolean;
  notesHasPassword: boolean;
  notesQuickUnlock: boolean;
  fieldStates: Record<string, FieldState>;
}): SetupItem[] {
  const set = (key: string) => (input.fieldStates[key] ?? 'unset') !== 'unset';
  const all = (...keys: string[]) => keys.every(set);
  const emailDone = all('SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'CONTACT_TO_EMAIL');
  const cloudDone = all('CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET');
  const githubDone = all('GITHUB_PROFILE_REPO', 'GITHUB_DISPATCH_TOKEN');
  const notesDone = input.notesHasPassword || input.notesQuickUnlock;
  return [
    {
      id: 'admin-signin',
      label: 'Admin sign-in',
      done: true,
      detail: 'Authenticator is on (always required).',
      href: '#admin-signin',
      optional: false,
    },
    {
      id: 'admin-password',
      label: 'Admin password',
      done: input.adminHasPassword,
      detail: input.adminHasPassword ? 'Set.' : 'Optional extra lock, not set.',
      href: '#admin-signin',
      optional: true,
    },
    {
      id: 'email',
      label: 'Contact form email',
      done: emailDone,
      detail: emailDone
        ? 'Ready: messages are emailed to you.'
        : 'Not set: the contact form says it is not set up.',
      href: '#email',
      optional: false,
    },
    {
      id: 'cloudinary',
      label: 'Cloudinary pictures and videos',
      done: cloudDone,
      detail: cloudDone ? 'Connected.' : 'Not set: uploads do not work yet.',
      href: '#cloudinary',
      optional: false,
    },
    {
      id: 'notes-vault',
      label: 'Private notes unlock',
      done: notesDone,
      detail: notesDone
        ? 'You can open /notes/vault.'
        : 'Not set: the private notes are locked for everyone.',
      href: '#notes-vault',
      optional: true,
    },
    {
      id: 'github',
      label: 'GitHub profile sync',
      done: githubDone,
      detail: githubDone ? 'On.' : 'Off (optional, for developers).',
      href: '#github',
      optional: true,
    },
  ];
}

/** The guide that belongs to each integration group of the Security page. */
export const GROUP_GUIDE: Record<string, GuideId> = {
  email: 'smtp',
  cloudinary: 'cloudinary',
  github: 'github',
};

/** Sites a guide link may point to: the providers’ own pages only. */
export const OFFICIAL_LINK_HOSTS = [
  'www.mongodb.com',
  'vercel.com',
  'support.google.com',
  'myaccount.google.com',
  'getaegis.app',
  'ente.io',
  '2fas.com',
  'app.brevo.com',
  'help.brevo.com',
  'resend.com',
  'cloudinary.com',
  'console.cloudinary.com',
  'docs.github.com',
  'github.com',
] as const;
