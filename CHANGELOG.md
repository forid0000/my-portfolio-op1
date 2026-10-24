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
- **Write articles on your own site** (Admin → Articles). A Markdown editor with a formatting toolbar (bold, italic, headings, lists, checklists, quotes, links, tables, code, dividers, centered or right-aligned text, note/tip/warning boxes), live preview (write, side by side, preview), pictures and videos by upload, drag-and-drop or paste (Ctrl+V), a cover picture, tags, a summary, a closing note, draft or published with a publish date, and search title/description. Each article has its own **design**: font (sans, serif, rounded, monospace), text size, page width, alignment, header style (cover on top, title over the cover, centered, text only), an optional accent colour, a table of contents, and switches for date, reading time, tags, author and share button. Visitors can **react** (like, love, insightful, celebrate, curious; once per kind per visitor) and **comment** (approved by you first by default, with replies from you, spam defences and a moderation screen). Articles appear in `/articles` next to the optional Dev.to feed, in an RSS feed (`/articles/rss.xml`), the sitemap and `llms.txt`, with structured data. Deleting an article, or removing a picture from it, deletes the files from Cloudinary (unless another article still uses them).
- **One place for every colour.** All public colours come from theme tokens (background, text, cards, brand, secondary, quiet text, borders, inputs, focus ring, and error/success/warning/information) edited in Admin → Appearance; components no longer pick their own. The floating contact button, kits, notes, error pages, gallery and article pages all follow the palette. **44 ready-made colour schemes** (light, dark, mixed and bold), each checked for readable text by a test, a readability check and a live preview built from the real site tokens.
- **Navigation & Visibility** (Admin): choose, rename, reorder and hide the menu links (also used by the footer), add your own links, hide the floating contact button, the "Download CV" button (it now only appears when a resume is uploaded), the hero social links, and each part of the footer. Hiding a section also hides its link.
- **GitHub picture as the avatar fallback.** Keep a GitHub profile link in Global Settings (or among your social links) and, until you upload a picture, your public GitHub picture is used in the hero, the top-left icon, the browser tab and the share image. A broken picture falls back to the placeholder.
- **"Which field is wrong?" on every form.** A rejected save scrolls to the exact field, focuses it, outlines it in red and writes the reason under it (for example "Socials #3 > URL: Enter a full web address"). It works for every admin editor and for the contact form and comment form on the site.
- **Unsaved-changes counter** at the top-left of the admin (above every page): how many fields differ from the last save, a list of what changed, and a confirmation after saving.
- **Resizable, collapsible admin menu**: drag its edge (208 to 460 px), double-click the edge or use the arrow to fold it into an icon rail, arrow keys when focused. The size is remembered in the browser.
- **npm works as well as pnpm.** CI installs and checks the project with both (`pnpm` first), and `npm run verify` mirrors `pnpm verify`.
- **Public notes and a private vault.** `/notes` is now a public page that shows only the notes you published (search, tags, inside the normal header and footer) with a quiet button to your private notes; the vault itself moved to `/notes/vault` (the lock screen explains what the place is and links back; old `/notes?id=…` bookmarks still lead there). The wording of the public page and the button is set in Admin → Notes. The sitemap lists `/notes`, never the vault.
- **A sturdier note editor.** The writing and preview panes sit in a split you can drag: each side keeps at least a quarter of the space, dragging further and letting go gives one side the whole area, double-click restores half and half, arrow keys move it, the preview can sit beside or below the text, and the choice is remembered. Long words, links and code lines always wrap (in the text box, the preview and the saved page); the preview is the same renderer as the saved page, so formatting looks identical before and after saving. Narrow screens get Write / Preview tabs instead of a hidden preview. New formatting bar (headings menu, bold, italic, strikethrough, code, lists, checklists, quote, link, table, code block, divider, alignment and note/tip/warning boxes, undo/redo), Enter continues a list and Tab indents it, scroll sync, font and size choices, and a clear "Saved / Unsaved / Saving" state. Every colour follows the global palette.
- **Files from your computer in notes.** Pick, drop or paste pictures, PDFs, documents, audio, video, text files and whole folders. Pictures can go straight into the text; every file stays with the note, listed by folder, with a preview window for pictures, video, sound, PDF, text, JSON and Markdown files and a download button for everything else. Files are stored privately in your MongoDB database (no extra service), can be up to the size you set in Admin → Notes (default 10 MB, capped by the host), are served only to you until the note is published, and are deleted with the note or when you remove them.
- Admin → Notes: public page wording, the largest file size, and a plain-language walkthrough.
- Notes titled by their first line when you did not type a title, so nothing you wrote is ever lost on leaving.
- **Tests and one CI workflow**: Vitest unit tests, an end-to-end smoke test (production server, real MongoDB, fake Cloudinary), `pnpm verify`, `pnpm test`, `pnpm test:smoke`, `pnpm format:check`, `pnpm typecheck`.

### Changed

- **The default look is now the clean style.** Terminal prompts (`dev@portfolio:~/about$`), monospace text, uppercase nav labels, the system-status widget and decorative effects moved behind the opt-in Terminal style. Existing sites change look on upgrade; switch back in Admin → Appearance → Style → Terminal.
- Placeholder content is neutral instead of developer-specific. Saved content is unaffected.
- The favicon is a round PNG cut from the avatar by Cloudinary (set in the page metadata) and the share image is a JPEG variant; both follow the avatar automatically. The generated `/icon` route is gone.
- `/kits` and `/articles` show the real avatar in the header instead of a redirect that could not render.
- Dependency updates merged from Dependabot (Next.js 16.4, React 19.3, Sentry 11, Nodemailer 10, Zod 4.6, Radix). **ESLint stays on 9 and TypeScript on 5.9** on purpose: `eslint-plugin-react` (via `eslint-config-next`) does not support ESLint 10 yet, and `typescript-eslint` does not support TypeScript 7. `next.config.mjs` loads Sentry in a way that works with v10 and v11.
- Section Texts: the editor's starting values are the same neutral wording the site uses (they used to be developer-flavoured and were saved if you pressed Save on a new site). The contact form says "Send message" instead of "Launch Transmission" (the old wording remains in the Terminal style).
- The default text colour on secondary buttons is dark instead of white (white on light blue was hard to read).
- The private notes list now loads a summary of each note instead of its whole text, and a note is fetched when you open it. The vault options are read in one place for the login, the session check and the admin page.
- Note summaries on cards and in lists no longer show checklist marks or table lines.
- Prettier is enforced across the whole repository (previously unformatted files were formatted).

### Fixed

- **CI failed at "Install dependencies"** (`ERR_PNPM_IGNORED_BUILDS`): `pnpm-workspace.yaml` held unfilled placeholders. The install scripts are now decided explicitly.
- **Remove did nothing** in the Services banner, Testimonial photo and Certification badge editors: the emptied field was left out of the save and the old file stayed. It is now removed from the database and from Cloudinary.
- **Static pages kept stale content after an admin save in production** (module-level caches are per bundle). Caches now live on `globalThis`, and a failed database read is no longer cached as defaults.
- Avatar uploads over about 7.5 MB failed (base64 in JSON, cut off by Next's middleware buffer) and could not work at all on Vercel's 4.5 MB limit.
- The Media Manager crashed on any error response; "Set active" on an unknown id switched every avatar off.
- The hero greeting and subtitle were empty in the server HTML.
- `--destructive`, `--popover`, `--primary-rgb` and `hsl(var(--x))` colours were used but never defined, so error text, article/markdown styles and glows had no colour. They are defined now.
- Several kits, the floating contact panel and the notes tags kept dark colours on a light theme; they follow the palette now.
- **Editing a published note did not update its public page.** It does now (and so do unpublishing, renaming and deleting, the sitemap and `llms.txt`).
- Notes search treated what you typed as a pattern (a typo such as `(` failed, `.*` matched everything); it is plain text now.
- The notes list could save the same new note twice on a slow connection; saves now wait for each other. Leaving a note without a title no longer dropped what was written.
- The notes API answered with raw database errors; it returns a short message, validates every write, accepts same-site requests only and is rate limited.
- A page for a missing or unpublished article answered 200 with a "not found" page; it is a real 404.

### Removed

- The Cloudflare R2 upload path of the notes (`/api/notes/upload`, R2 keys in Security & Keys, the two AWS SDK packages): nothing in the notes used it, and files now live in the database. `R2_PUBLIC_URL` stays as an optional extra picture host for the Content-Security-Policy.
- `scripts/create-indexes.mjs` (automatic now) and the server-side `section-media` upload route (replaced by direct uploads).

### Migration

- Nothing to run. Indexes are created on the next start. Make sure Cloudinary keys are saved in Admin → Security & Keys: uploads now go from the browser to `api.cloudinary.com`, which the Content-Security-Policy allows.
- Your notes keep working. Open them at `/notes/vault` (the public `/notes` page now lists only published notes). Stored R2 keys are ignored and can be deleted; pictures already hosted elsewhere still display. Indexes for notes are created on the next start.
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
