# Global-ID: self-hosted developer portfolio with a built-in CMS

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4-06b6d4)

Global-ID is an open-source **portfolio website and content management system** for developers. The public site is rendered from a MongoDB database, and everything on it (name, bio, projects, skills, theme, section order, SEO) is edited from a secured admin dashboard. There is no redeploy to change a sentence.

It also ships a private, password-protected **notes vault**, a set of client-side **utility kits** (QR codes, subnet calculator, password generator and more), a **Dev.to article feed**, and an `/llms.txt` endpoint, so one deployment covers the portfolio, a small blog, and a toolbox.

> **Placeholder content.** A fresh install shows neutral placeholder content ("Your Name", `example.com` links). Replace it from `/administrator` after your first login. Nothing in the source code describes a real person.

## Why Global-ID

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

**Requirements:** Node.js 20.9 or newer, [pnpm](https://pnpm.io), and a MongoDB database ([Atlas free tier](https://www.mongodb.com/atlas) or local).

```bash
git clone <your-fork-url> global-id
cd global-id
pnpm install

cp .env.example .env.local
# edit .env.local and set at least:
#   MONGODB_URI, JWT_SECRET (openssl rand -base64 32), ADMIN_PASSWORD

node scripts/create-indexes.mjs   # one-time: creates the indexes the app relies on
pnpm dev                          # http://localhost:3000
```

Open <http://localhost:3000/administrator> and sign in with `ADMIN_PASSWORD`. In development (`next dev`) the TOTP step is skipped; in production it is always required (see [Authentication](#authentication-and-security)).

### Make it yours

| What                                                | Where                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| Name, tagline, intro                                | Admin → Homepage (hero)                                          |
| Brand, header, footer, socials, location, time zone | Admin → Global Settings                                          |
| Bio, stats, status                                  | Admin → About                                                    |
| Experience, projects, skills…                       | Admin → the matching section                                     |
| Section order and visibility                        | Admin → Sections                                                 |
| Colors and glass effect                             | Admin → Appearance                                               |
| Page title, description, keywords, error pages      | Admin → System                                                   |
| Avatar and résumé                                   | Admin → Media Manager                                            |
| Dev.to username                                     | Admin → Section Texts (leave empty to disable the articles feed) |
| Public URL, geo tags, short links, email delivery   | Environment variables (see below)                                |

## Configuration

Copy `.env.example` to `.env.local` for local work, or set the same variables in your hosting provider. Never commit real values: every `.env*` file except `.env.example` is git-ignored. Do **not** set `NODE_ENV` yourself.

| Variable                                                                                       | Required      | Purpose                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONGODB_URI`                                                                                  | yes           | MongoDB connection string (database `portfolio_cms`).                                                                                                                         |
| `JWT_SECRET`                                                                                   | yes           | Session signing key, at least 32 random characters. The app fails closed without it.                                                                                          |
| `ADMIN_PASSWORD`                                                                               | yes           | Admin password (constant-time comparison).                                                                                                                                    |
| `ADMIN_TOTP_SECRET`                                                                            | in production | Base32 TOTP secret. Generate with `node scripts/generate-totp.mjs`.                                                                                                           |
| `NEXT_PUBLIC_SITE_URL`                                                                         | recommended   | Public origin (`https://your-domain.com`). Drives canonical URLs, sitemap, robots, llms.txt, JSON-LD. Falls back to Vercel's production domain, then `http://localhost:3000`. |
| `NOTES_TOTP_SECRET`                                                                            | optional      | Enables a 6-digit authenticator code as a quick unlock for the Notes vault.                                                                                                   |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`                         | optional      | Media explorer, avatar and gallery uploads.                                                                                                                                   |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`                                             | optional      | Contact-form email via any SMTP provider (host defaults to Brevo's relay, port to 587). `BREVO_SMTP_USER` / `BREVO_SMTP_PASS` are still accepted.                             |
| `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`                                                       | optional      | Inbox that receives submissions, and the sender address (defaults to `SMTP_USER`). Without these the form reports "not configured".                                           |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | optional      | Cloudflare R2 for Notes vault image uploads.                                                                                                                                  |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`                  | optional      | Error tracking and source-map upload. Off unless a DSN is set; the CSP is extended automatically.                                                                             |
| `SEO_GEO_REGION`, `SEO_GEO_PLACENAME`, `SEO_GEO_LAT`, `SEO_GEO_LON`                            | optional      | Geo-targeting meta tags. Nothing is emitted unless set.                                                                                                                       |
| `SOCIAL_GITHUB_URL`, `SOCIAL_LINKEDIN_URL`, `SOCIAL_FACEBOOK_URL`, `WHATSAPP_NUMBER`           | optional      | Registers `/github`, `/linkedin`, `/facebook`, `/whatsapp` short links. Each exists only when its variable is set.                                                            |
| `NEXT_PUBLIC_STATUS_URL`                                                                       | optional      | Makes the header uptime badge link to your status page.                                                                                                                       |
| `NEXT_PUBLIC_PRAYER_DEFAULT_CITY`                                                              | optional      | Starting location of the prayer-times kit (default `Makkah`).                                                                                                                 |
| `GITHUB_PROFILE_REPO`, `GITHUB_DISPATCH_TOKEN`                                                 | optional      | Triggers a `repository_dispatch` (`cms-updated`) on your profile-README repo after CMS saves.                                                                                 |

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

### SEO and discoverability

- Metadata, JSON-LD, and `llms.txt` are derived from CMS content through `lib/identity.ts` and the canonical origin in `lib/site-config.ts`.
- All JSON-LD is serialized through `lib/json-ld.ts`, which escapes `<` so CMS-editable text can never break out of its `<script>` tag.
- `robots.txt` disallows `/administrator/` and `/api/`; `sitemap.xml` includes your Dev.to articles and published notes.

## Authentication and security

**Admin (`/administrator`)**

1. Password and TOTP are verified together at `/api/admin/login`; the password check is constant-time.
2. A successful login issues an `HS512` JWT valid for 15 minutes, stored in an `HttpOnly`, `SameSite=Strict`, `Secure` (in production) cookie.
3. `middleware.ts` verifies the JWT for `/administrator` and `/api/admin/*`, and every mutating endpoint re-verifies it (defense in depth).
4. Mutating admin requests are checked with `Sec-Fetch-Site` / `Origin` and cross-site requests are rejected before JWT verification.
5. Auth endpoints are limited to 10 attempts per 15 minutes per IP, and content writes to 60 per 5 minutes per IP.
6. Responses carry a strict Content-Security-Policy (`frame-ancestors 'none'`, `object-src 'none'`, explicit host allow-lists), HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.

**Notes vault (`/notes`)** is fully independent of the admin session:

1. **Vault password:** scrypt-hashed (`scrypt:salt:hash`) in the database, set from `/administrator/notes-config`; 7-day session.
2. **Optional quick unlock:** when `NOTES_TOTP_SECRET` is set, a 6-digit authenticator code grants a 45-minute session. There is deliberately no clock- or formula-based key: anything derivable from open-source code would be a public backdoor.
3. Separate `notes_session` cookie, 30 attempts per 15 minutes per IP, image-only upload allow-list, and a strict link allow-list (`https:`, `mailto:`, `/`, `#`) when rendering Markdown.

> **Notes are access-controlled, not encrypted at rest.** They are stored as plain text in your MongoDB database. Anyone with database access can read them, so enable encryption at rest on your MongoDB provider and keep credentials private. Do not store secrets you would not trust your database host with.

> **Rate limiting is in-memory and per instance.** On serverless platforms each instance counts separately, so treat it as a speed bump, not a hard guarantee. Use a platform-level WAF or an external store for strict limits. See [SECURITY.md](SECURITY.md).

## Deployment

**Vercel** (recommended; Speed Insights is already wired and is inert elsewhere):

1. Import the repository and set the environment variables above (at least `MONGODB_URI`, `JWT_SECRET`, `ADMIN_PASSWORD`, `ADMIN_TOTP_SECRET`, `NEXT_PUBLIC_SITE_URL`).
2. Run `node scripts/create-indexes.mjs` once against your production `MONGODB_URI`.
3. Deploy. HTTPS must be enforced at the edge so `Secure` cookies and HSTS work.

**Self-hosted:** `pnpm build && pnpm start` behind a reverse proxy that terminates TLS (Caddy, Nginx). Node 20.9+.

`scripts/create-indexes.mjs` is idempotent (unique `homepage.type`, unique `gallery.public_id` and `gallery.order`, partial-unique `isActive` on `avatars` and `resumes`, and an `order` index on each independent collection), so it is safe to re-run on any environment.

## Project structure

```
app/            Next.js routes: public pages, /administrator, /notes, /kits, /articles, API routes
components/     Section components, admin UI, shared primitives
lib/            Auth, DB, validation (Zod), CMS content defaults, identity/SEO helpers, caches
scripts/        create-indexes.mjs, generate-totp.mjs
public/         Static assets (tech icons, placeholder avatar)
```

Key files: `lib/content-defaults.ts` (placeholder content), `lib/site-config.ts` (deployment settings from env), `lib/identity.ts` (SEO identity from CMS), `lib/sections-registry.ts` (homepage sections).

## Privacy

The site itself bundles no analytics or tracking scripts. The contact form, the kits, and optional integrations do touch visitor data; [PRIVACY.md](PRIVACY.md) lists exactly what, so you can keep your own privacy notice truthful.

## Contributing

Issues and pull requests are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)

## Author

Created by **MD. Habibullah Sharif**, full-stack developer and DevOps engineer.
[GitHub](https://github.com/md8-habibullah) · [LinkedIn](https://www.linkedin.com/in/md-habibullahs) · [Dev.to](https://dev.to/md8_habibullah)
