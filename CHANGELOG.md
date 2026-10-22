# Changelog

[Home](README.md)

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
- Placeholder avatar, `LICENSE` (MIT), `SECURITY.md`, `PRIVACY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue forms, a pull-request template and a CI workflow.

### Changed

- **Much lighter first load.** The homepage went from about 11.5 MB of gzipped JavaScript to well under 300 KB:
  - icons are resolved on the server instead of shipping all 33 `react-icons` packs and every lucide icon to the browser;
  - the contact form no longer bundles `zod` and `react-hook-form` (both removed from the dependencies), and the Sentry browser SDK is only bundled when a DSN is configured;
  - the header renders on the server instead of appearing after hydration, kit pages no longer fetch it client-side, and the scroll spy is passive and frame-throttled;
  - the background canvas animates only while the pointer moves (static CSS grid otherwise, off on touch devices, reduced motion and the admin), the typing and scramble effects run once, and always-on `border-radius`/colour animations were removed;
  - the tech marquee renders about a third as many chips, without per-chip filters.
- The admin login no longer shows a 5-second full-screen countdown, and an expired session redirects to sign-in instead of a 3-second overlay.
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
- The footer on `/articles` and `/kits` ignored CMS content and always showed the placeholder defaults.
- The prayer-times clock was hardcoded to a single time zone for every visitor.
- Default copy claimed "End-to-End Encrypted" contact; it now makes no such claim.

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
