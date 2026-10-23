# my-portfolio-op1: self-hosted developer portfolio with a built-in CMS

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4-06b6d4)

my-portfolio-op1 is an open-source **portfolio website and content management system** for developers. The public site is rendered from a MongoDB database, and everything on it (name, bio, projects, skills, theme, section order, SEO) is edited from a secured admin dashboard. There is no redeploy to change a sentence.

It also ships a private, password-protected **notes vault**, a set of client-side **utility kits** (QR codes, subnet calculator, password generator and more), a **Dev.to article feed**, and an `/llms.txt` endpoint, so one deployment covers the portfolio, a small blog, and a toolbox.

> **New to this? Never used a terminal?** Follow the step-by-step [Getting started guide](docs/GETTING-STARTED.md). It takes you from nothing to a live site with no coding. Developers and AI agents: see [docs/](docs/README.md).

> **Placeholder content.** A fresh install shows neutral placeholder content ("Your Name", `example.com` links). Replace it from `/administrator` after your first login. Nothing in the source code describes a real person.

## Why my-portfolio-op1

- **Edit from the browser, not the repo.** Every section has an admin editor with drag-and-drop ordering and unsaved-changes protection. Content lives in your own MongoDB, so a theme change or a new project is never a pull request.
- **Stays up when the database does not.** Every server component falls back to built-in defaults if MongoDB is unreachable, so the public site renders instead of crashing.
- **Secure by default.** Password + TOTP admin login, signed short-lived sessions, CSRF checks, rate limiting, strict CSP and security headers, and Zod validation on every write.
- **Owns its data.** No analytics or tracker is bundled, no content is stored as base64 in the database, and every third-party service is optional.

## Features

**Public site**

- Config-driven homepage: Hero, About, Education, Experience, Certifications, Skills, Industry Expertise, Tech Stacks, Services, Projects, Publications, Testimonials, Roadmap, Gallery, Contact. Visibility and order are controlled from the admin.
- SEO out of the box: metadata and `ProfilePage` / `Person` / `WebSite` JSON-LD built from your CMS content, canonical URLs, dynamic `sitemap.xml`, `robots.txt`, and `/llms.txt`.
- Masonry gallery backed by Cloudinary, contact form with email delivery, floating "connect" popup, dark glassmorphism theme with admin-editable accent colors.

**Admin dashboard (`/administrator`)**

- Editors for every section, a Cloudinary media explorer, avatar and résumé manager, theme engine, SEO and error-page texts, section order and visibility, and a guarded MongoDB inspector (system databases and critical collections are write-protected).

**Notes vault (`/notes`)**

- Private Markdown notes with their own login, split-pane editor, auto-save, image uploads to Cloudflare R2, tags, search, export (`.md` / `.txt` / PDF), and optional publishing of individual notes to `/notes/<slug>` with full SEO metadata.

**Utility kits (`/kits`)**

- Age calculator, currency converter, password generator, random picker, prayer times, QR code generator and scanner, subnet calculator, and a system/network diagnostics page. Names, descriptions, icons, and order are CMS-editable.

**Articles (`/articles`)**

- Syndicates your Dev.to posts with native routing. Choose in the admin whether canonical URLs point at Dev.to or at your own site.

## Quick start

> Not a developer? Use the [step-by-step guide](docs/GETTING-STARTED.md) instead; this section assumes you are comfortable with a terminal.

**Requirements:** Node.js 20.9 or newer, [pnpm](https://pnpm.io), and a MongoDB database ([Atlas free tier](https://www.mongodb.com/atlas) or local).

```bash
git clone <your-fork-url> my-portfolio-op1
cd my-portfolio-op1
pnpm install

cp .env.example .env.local
# edit .env.local and set the two required values:
#   MONGODB_URI   (your MongoDB connection string)
#   JWT_SECRET    (openssl rand -base64 32)

pnpm dev   # http://localhost:3000 (the database sets itself up on first start)
```

Then open <http://localhost:3000/administrator>. A fresh install has no admin yet, so you land on a **first-run setup wizard**:

1. Enter the **setup code** printed in the terminal (or run `node scripts/setup-code.mjs`). It proves you control the server, so nobody else can claim a new deployment.
2. Scan the QR code with an authenticator app. The authenticator is **required** for every sign-in.
3. Optionally add a password as an extra factor.

Everything else (the notes-vault password, email, Cloudinary, R2 keys) is configured later in **Admin → Security & Keys**, not in `.env`. Lost your authenticator? See [Recovery](#authentication-and-security).

### Running on a small machine

`pnpm dev` compiles each route the first time you open it and keeps every compiled module in memory, so it is by far the heaviest way to run the project: expect roughly 1.4 GB after visiting a handful of routes (the first visit to a route takes a few seconds). The production server is tiny by comparison (around 120 MB, with page responses in single-digit milliseconds). If you only want to use the site and the admin panel, or your machine is short on RAM:

```bash
pnpm preview                      # next build && next start (build takes ~20 s)
```

Admin edits appear immediately in the production build too: saving revalidates the affected pages on demand. If you do run `pnpm dev` on a tight machine, cap it so it can never take the whole system down, and optionally lower the worker count:

```bash
systemd-run --user --scope -p MemoryMax=2G -p MemorySwapMax=0 pnpm dev   # Linux
NEXT_BUILD_CPUS=2 pnpm dev                                               # fewer parallel workers
```

`NEXT_DIST_DIR` sets a different build directory (default `.next`) so a second build can sit next to a running dev server.

### Make it yours

| What                                                    | Where                                                            |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| Name, tagline, intro                                    | Admin → Homepage (hero)                                          |
| Brand, header, footer, socials, location, time zone     | Admin → Global Settings                                          |
| Bio, stats, status                                      | Admin → About                                                    |
| Experience, projects, skills…                           | Admin → the matching section                                     |
| Section order and visibility                            | Admin → Sections                                                 |
| Style (clean or terminal), color schemes, admin color   | Admin → Appearance                                               |
| Page title, description, keywords, error pages          | Admin → System                                                   |
| Profile picture (live at once) and résumé               | Admin → Hero Section, or Media Manager                           |
| Project and certificate pictures and videos             | Admin → Projects / Certifications                                |
| Passwords, authenticators, email / Cloudinary / R2 keys | Admin → Security & Keys                                          |
| Dev.to username                                         | Admin → Section Texts (leave empty to disable the articles feed) |
| Public URL, geo tags, short links                       | Environment variables (see below)                                |

## Configuration

Only **two** values must be in the environment, because they have to exist before any dashboard can load:

| Variable      | Purpose                                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONGODB_URI` | MongoDB connection string (database `portfolio_cms`).                                                                                                                           |
| `JWT_SECRET`  | At least 32 random characters. Signs sessions, derives the first-run setup code, and keys the encryption of secrets stored by the admin panel. The app fails closed without it. |

Copy `.env.example` to `.env.local` for local work, or set the variables in your hosting provider. Never commit real values: every `.env*` file except `.env.example` is git-ignored. Do **not** set `NODE_ENV` yourself.

**Managed in the admin panel (Admin → Security & Keys)**, so there is no `.env` juggling:

- the admin authenticator (mandatory) and password (optional);
- the notes-vault password and authenticator quick unlock (both optional);
- contact-form email (SMTP host, port, user, password, recipient, sender);
- Cloudinary, Cloudflare R2 (keys, account, bucket) and GitHub profile sync credentials.

Secrets are encrypted before they reach the database and are never shown again. For the integrations, the matching environment variables (`SMTP_*`, `CONTACT_*`, `CLOUDINARY_*`, `R2_*`, `GITHUB_*`) still work as a **fallback** when a value is not set in the panel, which is convenient for platforms with their own secret manager.

**Optional environment variables** (build-time or public values that cannot live in the database):

| Variable                                                                             | Purpose                                                                                                                                                                       |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                                               | Public origin (`https://your-domain.com`). Drives canonical URLs, sitemap, robots, llms.txt, JSON-LD. Falls back to Vercel's production domain, then `http://localhost:3000`. |
| `R2_PUBLIC_URL`                                                                      | Public base URL of your R2 bucket. Needed at build time by the Content-Security-Policy, so it stays an environment variable.                                                  |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`        | Error tracking and source-map upload. Off unless a DSN is set; when off, no Sentry code is shipped to browsers. The CSP is extended automatically.                            |
| `SEO_GEO_REGION`, `SEO_GEO_PLACENAME`, `SEO_GEO_LAT`, `SEO_GEO_LON`                  | Geo-targeting meta tags. Nothing is emitted unless set.                                                                                                                       |
| `SOCIAL_GITHUB_URL`, `SOCIAL_LINKEDIN_URL`, `SOCIAL_FACEBOOK_URL`, `WHATSAPP_NUMBER` | Registers `/github`, `/linkedin`, `/facebook`, `/whatsapp` short links. Each exists only when its variable is set.                                                            |
| `NEXT_PUBLIC_STATUS_URL`                                                             | Makes the header uptime badge link to your status page.                                                                                                                       |
| `NEXT_PUBLIC_PRAYER_DEFAULT_CITY`                                                    | Starting location of the prayer-times kit (default `Makkah`).                                                                                                                 |

## Architecture

- **Framework:** Next.js 16 (App Router, React 19), TypeScript in strict mode.
- **Styling:** Tailwind CSS v4, Radix UI primitives, shadcn-style components, `@dnd-kit` for drag-and-drop.
- **Data:** MongoDB through Mongoose. The connection is cached on `global` so hot reloads and serverless invocations reuse it, with a tuned pool (`maxPoolSize: 10`) and a 5 s server-selection timeout so fallbacks kick in promptly.
- **Media:** Cloudinary for site images (only `{ src, public_id }` is stored in MongoDB, never binary data), Cloudflare R2 for Notes vault images via pre-signed URLs.
- **Email:** Nodemailer over any SMTP provider.
- **Validation:** Zod schemas on every mutating admin route (`lib/validation/`).

### Resilience

All public pages read from MongoDB at request or revalidation time, but every read is wrapped so that a database outage serves the built-in defaults from `lib/content-defaults.ts` instead of an error page. The same module is the single source of default content for the homepage, the section components, the admin editors, and the admin API fallbacks.

### Config-driven homepage

The homepage stack is described by `SECTION_REGISTRY` and `SECTION_COMPONENT_MAP` in `lib/sections-registry.ts`. Section visibility and order (`{ id, isEnabled, order }`) are stored in their own `layout_content` document, edited through a Zod-validated, rate-limited endpoint, so reordering never races a Global Settings save. Adding a new section is one registry entry, one component-map entry, and one props entry, with no database migration.

Education, Certifications, Testimonials, Services and Publications each live in their own collection and share one CRUD route factory (`lib/api/collection-crud.ts`).

### Static plus on-demand rendering

Public pages are generated statically and refreshed on demand: admin saves call `revalidatePublicContent()` so a page regenerates once per real edit, not on a timer. In-process caches for global content, theme, and avatar share one TTL (`lib/cache-ttl.ts`) which is disabled in development so edits appear immediately.

### Built to load fast

The public pages are kept deliberately light, and a few rules keep them that way (see [CONTRIBUTING.md](CONTRIBUTING.md)):

- **No icon library in the browser.** Icons are stored by name and may be any of ~50,000 lucide / react-icons glyphs. They are resolved **on the server** (`lib/icons/resolve.ts`), which loads only the one pack a name needs and sends just the SVG data of the icons a page actually uses. The admin icon picker searches through `/api/admin/icons`, so it never loads a catalog either.
- **Everything visible arrives with the HTML.** The header, footer, social links and icons are rendered on the server; nothing waits for hydration or a follow-up fetch.
- **Animations are cheap and stop.** The dot-grid background is static CSS and only upgrades to an interactive canvas on a desktop with a mouse, drawing only while the pointer moves. Text effects run once. Nothing animates layout-expensive properties forever, and `prefers-reduced-motion` turns decoration off.
- **Navigation is never blocked.** Route loading shows a thin progress bar along the top edge (`app/loading.tsx`, a server component with a CSS-only animation), never a full-screen overlay, so the page and header stay usable while a route loads.
- **The dev server stays lean too.** `react-icons` is loaded by Node instead of the bundler (`serverExternalPackages`), lucide's glyph data is a generated JSON file (`lib/icons/lucide-data.json`) rather than ~1,900 modules, and the Sentry SDK is replaced by a no-op stub unless a DSN is set. After upgrading `react-icons` or `lucide-react`, run `node scripts/generate-icon-names.mjs` to refresh the icon catalog.
- **Optional integrations cost nothing when off:** the Sentry SDK is not bundled unless configured, and forms use plain validation instead of a schema library.

### SEO and discoverability

- Metadata, JSON-LD, and `llms.txt` are derived from CMS content through `lib/identity.ts` and the canonical origin in `lib/site-config.ts`.
- All JSON-LD is serialized through `lib/json-ld.ts`, which escapes `<` so CMS-editable text can never break out of its `<script>` tag.
- `robots.txt` disallows `/administrator/` and `/api/`; `sitemap.xml` includes your Dev.to articles and published notes.

## Authentication and security

Credentials are managed in the admin panel (**Admin → Security & Keys**) and stored in MongoDB: passwords are scrypt-hashed, authenticator seeds and integration secrets are encrypted with AES-256-GCM using a key derived from `JWT_SECRET`.

**Admin (`/administrator`)**

1. **First-run setup** (`/administrator/setup`) exists only until the admin is created. It needs the setup code printed in the server log, is rate limited, and closes permanently once it succeeds.
2. **Sign-in:** the authenticator code is **always required**. A password is optional and is enforced once you set one. Both factors are checked together and a failure gives one generic message. Each authenticator code works once (replay protection).
3. **Sessions:** an `HS512` JWT valid for 15 minutes in an `HttpOnly`, `SameSite=Strict`, `Secure` (production) cookie. `middleware.ts` verifies it for `/administrator` and `/api/admin/*`, and every mutating endpoint re-verifies it.
4. **Sensitive changes need a fresh authenticator code** on top of the session (passwords, authenticator, integration keys), so a stolen session cookie cannot become a permanent takeover.
5. Mutating admin requests are checked with `Sec-Fetch-Site` / `Origin`; auth endpoints allow 10 attempts per 15 minutes per IP and content writes 60 per 5 minutes.
6. Responses carry a strict Content-Security-Policy, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.

**Recovery.** If you lose your authenticator, run `node scripts/reset-admin-auth.mjs --yes` with the same `MONGODB_URI` the app uses. It removes only the admin credentials (not your content, notes or keys); then open `/administrator/setup` again. This requires access to the database, which is exactly the point: only the owner of the deployment can do it.

**Notes vault (`/notes`)** is fully independent of the admin session:

1. **Vault password** (optional, 7-day session) and **authenticator quick unlock** (optional, 45-minute session). The vault stays locked for everyone until at least one is set. There is deliberately no clock- or formula-based key: anything derivable from open-source code would be a public backdoor.
2. Separate `notes_session` cookie, 30 attempts per 15 minutes per IP, image-only upload allow-list, and a strict link allow-list (`https:`, `mailto:`, `/`, `#`) when rendering Markdown.

> **Notes are access-controlled, not encrypted at rest.** They are stored as plain text in your MongoDB database. Anyone with database access can read them, so enable encryption at rest on your MongoDB provider and keep credentials private. Do not store secrets you would not trust your database host with.

> **Rotating `JWT_SECRET` invalidates stored secrets.** Authenticator seeds and integration keys are encrypted with a key derived from it, so after a rotation you must set up the admin again (see Recovery) and re-enter the integration keys.

> **Rate limiting is in-memory and per instance.** On serverless platforms each instance counts separately, so treat it as a speed bump, not a hard guarantee. Use a platform-level WAF or an external store for strict limits. See [SECURITY.md](SECURITY.md).

## Deployment

**Vercel** (recommended; Speed Insights is already wired and is inert elsewhere):

1. Import the repository and set `MONGODB_URI`, `JWT_SECRET` and `NEXT_PUBLIC_SITE_URL`.
2. Deploy. HTTPS must be enforced at the edge so `Secure` cookies and HSTS work.
3. Open `/administrator`, read the **setup code** from the deployment's runtime logs (or run `node scripts/setup-code.mjs` with the production `JWT_SECRET`), and complete the setup wizard.

**Self-hosted:** `pnpm build && pnpm start` behind a reverse proxy that terminates TLS (Caddy, Nginx). Node 20.9+.

**The database sets itself up.** The first time a server starts against a database (a fresh one, a restore, or a new deployment), it creates the indexes the app relies on (unique `homepage.type`, one live avatar and résumé, `gallery`, `settings.key`, the `order` indexes) and repairs known data problems. It is idempotent, versioned (`schema_version` in the `settings` collection), runs in the background and never blocks or fails a request. Nothing needs to be run by hand.

## Checks and tests

```bash
pnpm verify        # Prettier, ESLint, TypeScript, unit tests, production build (CI runs these first)
pnpm test:smoke    # starts the production server, a fake Cloudinary and runs the end-to-end test
```

`pnpm test:smoke` needs a throwaway MongoDB (`MONGODB_URI=mongodb://127.0.0.1:27017/portfolio_cms pnpm test:smoke`) and a prior `pnpm build`. It checks the first-start database setup, uploads and removal of pictures and videos, the avatar library and its Cloudinary sync, page refresh after saves, and that every public route answers. CI runs everything in one workflow (`.github/workflows/ci.yml`).

## Project structure

```
app/            Next.js routes: public pages, /administrator, /notes, /kits, /articles, API routes
components/     Section components, admin UI, shared primitives
lib/            Auth and credentials, DB, validation (Zod), CMS defaults, identity/SEO, server-side icons, caches
scripts/        setup-code.mjs, reset-admin-auth.mjs, generate-icon-names.mjs
tests/          unit/ (Vitest) and smoke/ (fake Cloudinary + an end-to-end run against a real MongoDB)
public/         Static assets (tech icons, placeholder avatar)
docs/           GETTING-STARTED.md (beginner guide) and ai/ (architecture, conventions, design, playbooks for AI agents and contributors)
AGENTS.md       Entry point for AI coding agents (CLAUDE.md imports it)
```

Key files: `lib/content-defaults.ts` (placeholder content), `lib/site-config.ts` (deployment settings from env), `lib/identity.ts` (SEO identity from CMS), `lib/credentials.ts` and `lib/integrations.ts` (admin-panel credentials and keys), `lib/icons/` (server-side icon resolution), `lib/sections-registry.ts` (homepage sections).

## Privacy

The site itself bundles no analytics or tracking scripts. The contact form, the kits, and optional integrations do touch visitor data; [PRIVACY.md](PRIVACY.md) lists exactly what, so you can keep your own privacy notice truthful.

## Contributing

Issues and pull requests are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)

## Author

Created by **MD. Habibullah Sharif**, full-stack developer and DevOps engineer.
[GitHub](https://github.com/md8-habibullah) · [LinkedIn](https://www.linkedin.com/in/md-habibullahs) · [Dev.to](https://dev.to/md8_habibullah)
