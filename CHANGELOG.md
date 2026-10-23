# Changelog

[Home](README.md)

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Profile picture that works.** Upload from Admin → Hero Section or Media Manager: drag, click or paste (Ctrl+V); large photos are compressed in the browser; it goes live immediately (untick the box to only add it to the library); the same picture uploaded twice is detected. Two-way sync with Cloudinary: deleting or renaming a file in the Cloudinary explorer updates the library and every saved reference, missing files are flagged, and **Re-sync** repairs drift.
- **Pictures and videos for projects and certifications**: several per item, the first is the main cover, reorder, make cover, remove, drag-and-drop and paste. Videos stream from Cloudinary as web-safe MP4 with a poster frame and **never autoplay unless you turn it on** (per video: autoplay, loop, muted, controls). Visitors can click any picture or video to see it larger (arrow keys, swipe, Esc).
- **Direct uploads to Cloudinary** with smart, size-aware compression (95% quality for slightly oversized images, down to an 80% floor, then smaller dimensions; images that already fit are not touched), so there is no 4.5 MB / 10 MiB request limit and videos up to 100 MB work.
- **Links list on projects** (live site, case study, Behance, repository, anything) and an optional "see more" button. No GitHub link is required any more.
- **Appearance**: a Clean or Terminal **style**, one-click **color schemes**, and an **admin panel color** (default, match the site, or custom).
- **Any language in the brand and headings** (Bangla, Arabic, Hindi…): fonts load only when needed, text direction is automatic, joined scripts are never letter-spaced, and the typing and decoding effects no longer corrupt them.
- **Automatic database setup**: indexes and data repairs are applied on the first start of any deployment (versioned, background, never blocks a request).
- **Tests and one CI workflow**: Vitest unit tests, an end-to-end smoke test (production server, real MongoDB, fake Cloudinary), `pnpm verify`, `pnpm test`, `pnpm test:smoke`, `pnpm format:check`, `pnpm typecheck`.

### Changed

- **The default look is now the clean style.** Terminal prompts (`dev@portfolio:~/about$`), monospace text, uppercase nav labels, the system-status widget and decorative effects moved behind the opt-in Terminal style. Existing sites change look on upgrade; switch back in Admin → Appearance → Style → Terminal.
- Placeholder content is neutral instead of developer-specific. Saved content is unaffected.
- The favicon is a round PNG cut from the avatar by Cloudinary (set in the page metadata) and the share image is a JPEG variant; both follow the avatar automatically. The generated `/icon` route is gone.
- `/kits` and `/articles` show the real avatar in the header instead of a redirect that could not render.
- Prettier is enforced across the whole repository (previously unformatted files were formatted).

### Fixed

- **CI failed at "Install dependencies"** (`ERR_PNPM_IGNORED_BUILDS`): `pnpm-workspace.yaml` held unfilled placeholders. The install scripts are now decided explicitly.
- **Remove did nothing** in the Services banner, Testimonial photo and Certification badge editors: the emptied field was left out of the save and the old file stayed. It is now removed from the database and from Cloudinary.
- **Static pages kept stale content after an admin save in production** (module-level caches are per bundle). Caches now live on `globalThis`, and a failed database read is no longer cached as defaults.
- Avatar uploads over about 7.5 MB failed (base64 in JSON, cut off by Next's middleware buffer) and could not work at all on Vercel's 4.5 MB limit.
- The Media Manager crashed on any error response; "Set active" on an unknown id switched every avatar off.
- The hero greeting and subtitle were empty in the server HTML.

### Removed

- `scripts/create-indexes.mjs` (automatic now) and the server-side `section-media` upload route (replaced by direct uploads).

### Migration

- Nothing to run. Indexes are created on the next start. Make sure Cloudinary keys are saved in Admin → Security & Keys: uploads now go from the browser to `api.cloudinary.com`, which the Content-Security-Policy allows.
- Old project links (`github`, `demo`) still show and become ordinary links when you open the Projects editor.

## [0.1.0] - Initial public release

The project started as one developer's personal portfolio and was generalized for public use. If you are upgrading from a private fork of that earlier version, read **Migration** below.

### Added

- **Credentials managed from the admin panel** (Admin → Security & Keys), stored in MongoDB instead of environment variables:
  - a **first-run setup wizard** gated by a setup code printed in the server log (`node scripts/setup-code.mjs` prints it too);
  - a **mandatory authenticator (TOTP)** and an **optional password** for the admin;
  - an optional **notes-vault password** and **authenticator quick unlock**;
  - **integration keys** for contact email (SMTP), Cloudinary, Cloudflare R2 and GitHub profile sync.
  - Passwords are scrypt-hashed; authenticator seeds and keys are AES-256-GCM encrypted (`lib/secret-box.ts`) and never sent back to the browser. Every sensitive change needs a fresh authenticator code, and each login code works once.
- `node scripts/reset-admin-auth.mjs --yes`: recovery if the authenticator is lost.
- Server-side icon resolution (`lib/icons/`) and a server-backed admin icon picker (`/api/admin/icons`).
- `lib/site-config.ts` (deployment settings from the environment), `lib/content-defaults.ts` (one source of neutral placeholder content) and `lib/identity.ts` (SEO identity from CMS content).
- Prayer-times kit: "My location" (browser geolocation, rounded to about 1 km), Makkah and Madinah, and a per-location time zone and calculation method.
- **Documentation for beginners and for AI agents**: `docs/GETTING-STARTED.md` (a step-by-step guide from zero to a live site: GitHub, MongoDB Atlas, Vercel, first-run setup, authenticator, troubleshooting and recovery) and `docs/ai/` (architecture, conventions, design and behavior rules, playbooks), with `AGENTS.md` / `CLAUDE.md` pointing agents to them.
- `pnpm preview` (build and start the production server), plus optional `NEXT_BUILD_CPUS` and `NEXT_DIST_DIR` settings for small machines (see the README's "Running on a small machine").
- `lib/icons/lucide-data.json`, generated by `node scripts/generate-icon-names.mjs`: lucide's glyph data as one static file.
- Placeholder avatar, `LICENSE` (MIT), `SECURITY.md`, `PRIVACY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue forms, a pull-request template and a CI workflow.

### Changed

- **Much lighter first load.** The homepage went from about 11.5 MB of gzipped JavaScript to well under 300 KB:
  - icons are resolved on the server instead of shipping all 33 `react-icons` packs and every lucide icon to the browser;
  - the contact form no longer bundles `zod` and `react-hook-form` (both removed from the dependencies), and the Sentry browser SDK is only bundled when a DSN is configured;
  - the header renders on the server instead of appearing after hydration, kit pages no longer fetch it client-side, and the scroll spy is passive and frame-throttled;
  - the background canvas animates only while the pointer moves (static CSS grid otherwise, off on touch devices, reduced motion and the admin), the typing and scramble effects run once, and always-on `border-radius`/colour animations were removed;
  - the tech marquee renders about a third as many chips, without per-chip filters.
- The admin login no longer shows a 5-second full-screen countdown, and an expired session redirects to sign-in instead of a 3-second overlay.
- The route loading screen is no longer a full-screen "SYS_INITIALIZING" overlay with a fake percentage counter, a 60 ms timer and large blurred layers that covered the header and navigation. It is now a thin, CSS-only bar along the top edge (`app/loading.tsx`).
- `/kits` is an HTTP redirect to `/kits/system` configured in `next.config.mjs`, so it no longer renders the kits layout and queries the database just to redirect.
- **Much lighter `next dev`.** The dev bundler no longer compiles ~60 MB of icon packs, lucide's module barrel or the Sentry SDK (`react-icons` is loaded by Node via `serverExternalPackages`, lucide data comes from the generated JSON, and Sentry is a no-op stub unless a DSN is set), and parallel workers are capped (`NEXT_BUILD_CPUS`, default 3). On the reference machine the first compile of a route went from 15 to 30 seconds to about 4, and memory after a handful of routes from over 2.2 GB to about 1.4 GB.
- All personal names, links, emails, phone numbers, domains, locations and the Sentry DSN were removed from the source and replaced by placeholders or configuration.
- Sentry, short links (`/github`, `/linkedin`, `/facebook`, `/whatsapp`), geo meta tags and the GitHub profile dispatch are opt-in.
- Contact form delivery reports "not configured" instead of sending to a fixed address, and timestamps use the site's configured time zone.
- Metadata, JSON-LD, `sitemap.xml`, `robots.txt` and `llms.txt` use the configured site URL and CMS content.
- The Dev.to feed is disabled until a username is set (an empty query would otherwise list other people's posts).
- Browser storage keys use the `my-portfolio-op1` prefix.
- Git LFS was removed from `.gitattributes`; tech icons are plain SVG files again. `.gitignore` now ignores `.env*` (except `.env.example`).

### Removed

- `ADMIN_PASSWORD`, `ADMIN_TOTP_SECRET` and `NOTES_TOTP_SECRET` environment variables, the development-only TOTP bypass (`/api/admin/verify-password`), and `scripts/generate-totp.mjs` (the setup wizard replaces it).
- Hardcoded Cloudinary account name and API key fallback in `lib/cloudinary.ts`.
- A third-party script that was loaded from a personal GitHub repository on every page.
- Personal photo-processing scripts, bulk gallery import tooling, sample gallery data and a résumé PDF.

### Fixed

- Default LinkedIn, Facebook and Instagram links showed a mail icon: lucide 1.x dropped brand logos. Brand names (including ones already saved in the CMS) now resolve to Font Awesome brand icons.
- The footer on `/articles` and `/kits` ignored CMS content and always showed the placeholder defaults. The header and footer on those pages now refresh when the admin saves global, layout, theme or avatar settings (`revalidateSiteChrome()` in `lib/revalidate.ts`).
- The prayer-times clock was hardcoded to a single time zone for every visitor.
- Default copy claimed "End-to-End Encrypted" contact; it now makes no such claim.
- `sitemap.xml` listed `/kits`, which only redirects; it now lists the real tool pages.
- The first-run setup code was printed to the server log once per process, which is easy to miss on a serverless host. It is now printed each time the setup page is opened (at most every 30 seconds).

### Security

- **Notes vault quick unlock replaced.** The previous "smart key" was a 6-digit code derived from the date and clock using a fixed formula. In an open-source project the formula is public, so anyone could compute the key and open the vault. It is replaced by an optional authenticator (TOTP) code managed in Admin → Security & Keys.
- The admin authenticator is mandatory in every environment (there is no longer a development bypass).

### Migration

- Only `MONGODB_URI` and `JWT_SECRET` are required in the environment. Existing `ADMIN_PASSWORD` / `ADMIN_TOTP_SECRET` values are **no longer used**: open `/administrator`, complete the one-time setup (setup code from the server log or `node scripts/setup-code.mjs`) and enrol your authenticator.
- Contact email, Cloudinary, R2 and GitHub sync settings now live in Admin → Security & Keys. The matching environment variables keep working as a fallback, so nothing breaks while you move them over.
- Set `NEXT_PUBLIC_SITE_URL`; keep `R2_PUBLIC_URL` and `NEXT_PUBLIC_SENTRY_DSN` (plus `SENTRY_ORG` / `SENTRY_PROJECT` for source maps) in the environment if you use them.
- Re-add short links with `SOCIAL_*_URL` / `WHATSAPP_NUMBER`, and geo tags with `SEO_GEO_*`, if you used them.
- To keep a quick unlock for the notes vault, enable it in Admin → Security & Keys. Set the Dev.to username in Admin → Section Texts if you use `/articles`.
- Run `node scripts/create-indexes.mjs` again (it now also adds a unique index on `settings.key`).
- Existing saved CMS content is unaffected: stored documents always win over defaults.
- **Rotate any credential that was ever committed to a previous copy of this project** (for example a Cloudinary API key that used to appear in source).
