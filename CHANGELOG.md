# Changelog

[Home](README.md)

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - Initial public release

The project started as one developer's personal portfolio and was generalized for public use. If you are upgrading from a private fork of that earlier version, read **Migration** below.

### Added

- `lib/site-config.ts`: deployment settings from the environment (`NEXT_PUBLIC_SITE_URL`, optional `SEO_GEO_*`).
- `lib/content-defaults.ts`: one source of neutral placeholder content for the homepage, components, admin editors, and admin API fallbacks.
- `lib/identity.ts`: SEO identity (site name, person name, job title, `sameAs`) derived from CMS content.
- Optional environment variables: `SMTP_*`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `NOTES_TOTP_SECRET`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SOCIAL_*_URL`, `WHATSAPP_NUMBER`, `NEXT_PUBLIC_STATUS_URL`, `NEXT_PUBLIC_PRAYER_DEFAULT_CITY`, `GITHUB_PROFILE_REPO`.
- Prayer-times kit: "My location" (browser geolocation, rounded to about 1 km), Makkah and Madinah, and a per-location time zone and calculation method.
- Placeholder avatar (`public/avatar-placeholder.png`).
- `LICENSE` (MIT), `SECURITY.md`, `PRIVACY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue forms, a pull-request template, and a CI workflow.

### Changed

- All personal names, links, emails, phone numbers, domains, locations, and the Sentry DSN were removed from source and replaced by placeholders or environment variables.
- Sentry, short links (`/github`, `/linkedin`, `/facebook`, `/whatsapp`), geo meta tags, and the GitHub profile dispatch are opt-in.
- Contact form delivery is configured by environment variables (any SMTP provider) and reports "not configured" instead of sending to a fixed address. Timestamps use the site's configured time zone instead of a fixed offset.
- Metadata, JSON-LD, `sitemap.xml`, `robots.txt`, and `llms.txt` use the configured site URL and CMS content.
- The Dev.to feed is disabled until a username is set (an empty query would otherwise list other people's posts).
- Browser storage keys use the `global-id` prefix.
- `scripts/generate-totp.mjs` no longer sends the TOTP secret to a QR-code web service; it renders the QR code locally when `qrencode` is installed.
- Git LFS was removed from `.gitattributes`; tech icons are plain SVG files again.
- `.gitignore` now ignores `.env*` (except `.env.example`).

### Removed

- Hardcoded Cloudinary account name and API key fallback in `lib/cloudinary.ts`.
- A third-party script that was loaded from a personal GitHub repository on every page.
- Personal photo-processing scripts, bulk gallery import tooling, sample gallery data, and a résumé PDF.

### Fixed

- `scripts/generate-totp.mjs` failed on `otplib` v13 (no default export).
- The prayer-times clock was hardcoded to a single time zone for every visitor.
- Default copy claimed "End-to-End Encrypted" contact; it now makes no such claim.

### Security

- **Notes vault quick unlock replaced.** The previous "smart key" was a 6-digit code derived from the date and clock using a fixed formula. In an open-source project the formula is public, so anyone could compute the key and open the vault. It is replaced by an optional authenticator (TOTP) code enabled with `NOTES_TOTP_SECRET`. Without it, only the vault password unlocks the vault.

### Migration

- Set `NEXT_PUBLIC_SITE_URL`, `CONTACT_TO_EMAIL`, and `CONTACT_FROM_EMAIL` (the contact form no longer has built-in recipients).
- Set `NEXT_PUBLIC_SENTRY_DSN` to keep error reporting; also `SENTRY_ORG` / `SENTRY_PROJECT` for source maps.
- Re-add short links with `SOCIAL_*_URL` / `WHATSAPP_NUMBER`, and geo tags with `SEO_GEO_*`, if you used them.
- To keep a quick unlock for the notes vault, generate a secret with `node scripts/generate-totp.mjs notes NOTES_TOTP_SECRET` and set `NOTES_TOTP_SECRET`.
- Set the Dev.to username in Admin → Section Texts if you use `/articles`.
- Set `GITHUB_PROFILE_REPO` to keep the profile-README dispatch.
- Existing saved CMS content is unaffected: stored documents always win over defaults.
- **Rotate any credential that was ever committed to a previous copy of this project** (for example a Cloudinary API key that used to appear in source).
