# Architecture

[AI docs index](README.md) · [Home](../../README.md)

How the system is built and why. Read this before changing anything structural. When this file and a generic habit disagree, this file wins; when this file and the code disagree, the code wins and this file needs fixing (see [CONVENTIONS.md](CONVENTIONS.md#keeping-these-docs-true)).

## 1. What the product is

A self-hosted **portfolio website with a built-in CMS**, for one owner. Visitors see a fast, mostly static, read-only site. The owner signs in to `/administrator` and edits every word, color, section and key from the browser; no redeploy is needed. A private **notes vault** (`/notes`), a set of client-side **utility kits** (`/kits`) and **articles** (`/articles`: written in the admin, plus an optional Dev.to feed) live in the same app.

It is generic and public: no name, link, email, domain or secret of any real person may exist in the source (see [CONVENTIONS.md](CONVENTIONS.md#the-non-negotiables)).

## 2. Stack

| Layer      | Choice                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict. Path alias `@/` = repo root.                       |
| Styling    | Tailwind CSS v4 (config lives in `app/globals.css`, no `tailwind.config`), `tw-animate-css`, CSS variables          |
| Database   | MongoDB, single database **`portfolio_cms`**, accessed through the Mongoose connection's native client              |
| Validation | Zod, **server only** (route handlers). Browser code uses plain functions.                                           |
| Auth       | `jose` JWT (HS512) in an HttpOnly cookie, `otplib` v13 TOTP, scrypt passwords, AES-256-GCM for stored secrets       |
| Packages   | pnpm preferred (lockfile v9); npm works too (`package-lock.json`). Node 20.9+. CI runs both, Node 22, pnpm 12.14.0. |
| Tests      | Vitest unit tests (`tests/unit`); end-to-end smoke test with a fake Cloudinary (`tests/smoke`); one CI job          |
| Hosting    | Vercel-first (serverless), also `next start` behind a TLS proxy. Vercel Speed Insights is inert elsewhere.          |
| Optional   | Cloudinary (media), SMTP via nodemailer (contact form), Cloudflare R2 (notes images), GitHub dispatch, Sentry       |

## 3. Runtime picture

```
                 ┌────────────────────────── Next.js app ───────────────────────────┐
 Visitor ──────► │ static HTML (/, /kits/*, /articles, ...)  ◄── revalidatePath()   │
                 │        │ server components read via lib/*  (fail-safe defaults)  │
                 │        ▼                                                         │
 Owner ────────► │ middleware.ts (Edge)  ──►  /administrator/*  and  /api/admin/*   │ ──► MongoDB
 (browser)       │   session + CSRF            route handlers: verify → rate-limit  │     portfolio_cms
                 │                              → Zod → write → invalidate caches  │
                 │                              → revalidate public pages          │
                 └───────────────┬───────────────────────────────────────┬─────────┘
                                 ▼ optional integrations                 ▼ third parties
                 Cloudinary · SMTP · R2 · GitHub dispatch · Sentry       Dev.to · ip lookup · currency/prayer APIs
```

Two rules shape everything:

1. **Public pages are static and refreshed on demand.** They export `revalidate = false`; admin saves call `revalidatePath` so a page regenerates once per real edit, never on a timer (timer ISR burned the Vercel free tier).
2. **Every database read on a public path is fail-safe.** If MongoDB is down or empty, the page renders the built-in placeholder content instead of crashing.

## 4. Directory map

```
app/
  layout.tsx            root: theme CSS variables, SEO metadata, JSON-LD, <DotWeave/>, toaster
  page.tsx              homepage assembly (reads CMS, builds per-section props, renders the section list)
  loading.tsx           thin CSS-only top progress bar (never a blocking overlay)
  globals.css           design tokens + custom utility classes + all keyframes
  administrator/        admin UI: login/, setup/, (dashboard)/<one folder per editor page>
  api/admin/            admin route handlers (content/*, security, setup, login, icons, ...)
  api/{contact,notes,avatar,resume,site,card,system-texts}/   public + notes-vault routes
  kits/                 utility tools; layout.tsx + kits-nav-client.tsx + one folder per tool
  articles/ notes/      articles (own + optional Dev.to feed, rss.xml); notes vault (+ published notes at /notes/<slug>)
  llms.txt/ sitemap.ts robots.ts icon.tsx    generated from CMS content
  error.tsx global-error.tsx not-found.tsx    error and 404 pages (texts editable in System & SEO)
components/             public section components, header/footer, ui/ primitives, admin/ shared admin UI
hooks/                  use-unsaved-warning, use-safe-dnd-sensors
lib/                    all server logic (see §5)
scripts/                setup-code, reset-admin-auth, generate-icon-names
tests/                  unit/ (Vitest) and smoke/ (fake Cloudinary + end-to-end run)
middleware.ts           Edge: admin session gate + CSRF check
instrumentation*.ts     Sentry, only when a DSN is configured
docs/                   human guide (GETTING-STARTED.md) and these AI docs
```

## 5. `lib/` module map

| Area            | Modules                                                                                                                                                                                                                                                                                                                                                      | Role                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Config          | `site-config.ts`, `cache-ttl.ts`                                                                                                                                                                                                                                                                                                                             | Deployment settings from env (`SITE_URL`, geo); shared cache TTL (0 in dev, 180 s in prod) |
| Default content | `content-defaults.ts`                                                                                                                                                                                                                                                                                                                                        | **Single source** of neutral placeholder content for every section                         |
| Content loaders | `shared-state.ts` (process-wide cache store), `site.ts` (global), `theme.ts` (+ pure `theme-model.ts`, `theme-presets.ts`), `chrome.ts` (+ pure `chrome-model.ts`: menu and visibility), `sections-registry.ts`, `identity.ts`, `floating.ts`, `avatar-cache.ts` (upload, GitHub picture, placeholder), `github-avatar.ts`, `kits-registry.tsx`, `resume.ts` | Read a CMS document, merge over defaults, cache in-process, expose `invalidate*Cache()`    |
| DB              | `db.ts`, `db-bootstrap.ts` (automatic indexes), `settings-store.ts`                                                                                                                                                                                                                                                                                          | Cached Mongoose connection (serverless-tuned pool); key/value `settings` collection        |
| Credentials     | `credentials.ts`, `integrations.ts`, `secret-box.ts`, `setup-code.ts`, `admin-session.ts`, `auth.ts`                                                                                                                                                                                                                                                         | Admin/notes passwords + TOTP, integration keys, encryption, session cookies, setup code    |
| Writes          | `api/collection-crud.ts`, `validation/*`, `rate-limit.ts`, `revalidate.ts`, `github-dispatch.ts`                                                                                                                                                                                                                                                             | Shared CRUD factory, Zod schemas, in-memory limiter, on-demand revalidation                |
| Icons           | `icons/resolve.ts`, `icons/icon-data.ts`, `icons/names.ts`, `icons/lucide-data.json`, `lucide-icon.ts`, `social-icon.tsx`                                                                                                                                                                                                                                    | Names → SVG data on the server (see §9)                                                    |
| Media/mail      | `cloudinary.ts`, `cloudinary-url.ts`, `media-types.ts`, `media-server.ts`, `media-sync.ts`, `avatar-store.ts`, `validation/media-schemas.ts`, `r2.ts`                                                                                                                                                                                                        | Lazily configured from integration keys                                                    |
| Contact, SEO    | `device-info.ts`, `ip-lookup.ts`, `user-agent.ts`, `json-ld.ts`                                                                                                                                                                                                                                                                                              | Contact-form context (server), safe JSON-LD                                                |
| Articles        | `articles-model.ts` (types, design, slugify, reading time), `article-markdown.ts` (`:::` blocks, headings), `markdown-edit.ts` (editor operations), `article-write.ts` (stored document, media pruning), `articles.ts` (server reads, counters, visitor hash), `validation/article-schemas.ts`                                                               | Pure helpers are shared by the editor, the public page and the tests                       |
| Forms           | `field-errors.ts` (find the field at fault, scroll, outline), `change-tracker.ts`, `sidebar-layout.ts`, `api/respond.ts` (`problem()` for field-level 400s)                                                                                                                                                                                                  | Browser helpers for admin UX                                                               |
| Client-only     | `image-resize.ts` (adaptive compression), `media-upload.ts` (direct upload), `text-script.ts`, `visit-tracker.ts` (localStorage visit counter), `crypto-utils.ts` (secure random for the picker kit), `utils.ts`                                                                                                                                             | Never import these from server paths                                                       |

## 6. Data model

Database `portfolio_cms` (the name is fixed in code; a database name in `MONGODB_URI` is ignored).

| Collection                                                                | Shape                                                                                                                                                         | Written by                                                   |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `homepage`                                                                | One doc per `type`, **unique index on `type`**                                                                                                                | `/api/admin/content/*` (type-keyed routes)                   |
| `education`, `certifications`, `testimonials`, `services`, `publications` | Many small docs with an `order` field                                                                                                                         | `createCollectionHandlers()` in `lib/api/collection-crud.ts` |
| `gallery`                                                                 | Cloudinary images, unique `public_id`, ordered                                                                                                                | gallery routes                                               |
| `avatars`, `resumes`                                                      | Profile pictures (Cloudinary `secure_url`, `public_id`, size, `etag` for duplicate detection) and résumés; **partial-unique `isActive`** (exactly one active) | media-manager routes                                         |
| `notes`                                                                   | Vault notes (plain text at rest; auth only)                                                                                                                   | `/api/notes/*`                                               |
| `settings`                                                                | `{ key, value, updatedAt }`, **unique `key`**: `admin_auth`, `integrations`, `notes_password`, `notes_totp`                                                   | `lib/settings-store.ts`                                      |

`homepage` document types: `hero_content`, `about_content`, `experience_content` (`experiences[]`), `skills_content` (`categories[]`), `projects_content` (`projects[]`), `roadmap_content` (`roadmapItems[]`), `techstacks_content`, `expertises_content`, `contact_content`, `headings_content` (section texts + terminal prefix), `global_content` (brand, header, footer, socials, timezone), `layout_content` (section order/visibility), `theme_content`, `system_content` (SEO + error-page texts), `kits_content`, `floating_contact`.

`lib/db-bootstrap.ts` creates the indexes and repairs known data problems automatically on the first connection of every server process (idempotent, versioned by `schema_version` in `settings`, background, never fails a request). `settingsCollection()` still ensures the `settings.key` unique index itself, because first-run setup depends on it for an atomic claim.

## 7. Read path: how a public page renders

1. A server component calls a loader (`getGlobalContent()`, `getLayoutSections()`, `getTheme()`...). Each loader: checks an in-process cache (`CACHE_TTL_MS`), reads one `homepage` doc, **merges it over the defaults** from `lib/content-defaults.ts`, and falls back to the defaults on any error.
2. `app/page.tsx` loads all `homepage` docs in one query, plus each independent collection only when its section is enabled, then builds a `sectionProps` map and renders `getRenderableSections(sections)` in order via `SECTION_COMPONENT_MAP`.
3. Icons referenced by that page are resolved to SVG data on the server (`resolveIconMap`) and passed down; no icon library reaches the browser.
4. The result is static HTML. It is only rebuilt when a write route calls `revalidatePath`.

Stored documents always win over defaults; a new default field appears automatically because loaders merge, they do not replace.

## 8. Write path: how an admin save works

Every mutating admin route follows the same order (copy an existing one; see [PLAYBOOKS.md](PLAYBOOKS.md#add-an-admin-api-route)):

```
verifyAdminSession()  →  rateLimit('admin-write:<ip>', 60 / 5 min)  →  Zod safeParse
   →  write to MongoDB (upsert by type / collection handlers)
   →  invalidate the in-process cache of that loader (invalidateGlobalCache, ...)
   →  revalidate the pages that show it
   →  optional: notifyProfileReadme() (GitHub dispatch, runs inside after())
```

Revalidation helpers (`lib/revalidate.ts`) and when to use each:

| Helper                      | Refreshes                     | Use when the data appears on…                                             |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| `revalidatePublicContent()` | `/`                           | the homepage only (most sections)                                         |
| `revalidateKitsContent()`   | `/kits` layout tree           | kit identity/content                                                      |
| `revalidateSiteChrome()`    | `/`, `/kits/*`, `/articles/*` | header, footer, theme, avatar, section toggles: anything in shared chrome |

Do not call `revalidatePath('/', 'layout')`: it regenerates every page on every save.

## 9. Icons

Icons are stored **by name** in the CMS (any lucide or react-icons glyph, ~50,000 names; the picker uses `/api/admin/icons`). They are resolved on the server to `IconData` (`{ attrs, nodes }`) and rendered as inline SVG by `renderIcon` (`lib/icons/icon-data.ts`).

- Name prefix selects the react-icons pack (`Fa`→`fa`/`fa6`, `Tb`→`tb`, ...). Only that pack is imported, lazily, **by Node, not the bundler** (`serverExternalPackages: ['react-icons']`).
- Unprefixed names are lucide, read from the generated `lib/icons/lucide-data.json` (never `import` the `lucide-react` barrel in server paths: ~1,900 modules).
- `BRAND_ALIASES` maps old lucide brand names (`Github`, `Linkedin`...) to Font Awesome, because lucide 1.x removed brand logos.
- Unknown names resolve to `null` and the caller renders a fallback glyph.
- After upgrading `react-icons` or `lucide-react`, run `node scripts/generate-icon-names.mjs` (rewrites `names.ts` and `lucide-data.json`).
- Client components receive `IconData`, never a name to look up.

## 10. Credentials, sessions and secrets

| Concern          | Design                                                                                                                                                                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment      | Only `MONGODB_URI` and `JWT_SECRET` (≥ 32 chars) are required. Missing/short `JWT_SECRET` fails closed.                                                                                                                                                                          |
| First run        | No admin exists → `/administrator/setup`. Needs the **setup code** = HMAC of `JWT_SECRET` (same on every serverless instance, never stored), printed to the log when the page is opened and by `node scripts/setup-code.mjs`. Setup closes permanently once `admin_auth` exists. |
| Admin sign-in    | TOTP **always required**; password optional (scrypt) and enforced once set. Each TOTP step is single-use (`lastTotpStep`). Generic failure text. 10 tries / 15 min / IP.                                                                                                         |
| Session          | `admin_session` HS512 JWT, 15 min, HttpOnly + SameSite=Strict (+ Secure in prod). Verified in `middleware.ts` (Edge) **and** again in every route (`verifyAdminSession`).                                                                                                        |
| CSRF             | `middleware.ts` rejects cross-site mutating `/api/admin` requests via `Sec-Fetch-Site` / `Origin`.                                                                                                                                                                               |
| Step-up          | Changing passwords, authenticators or integration keys needs a fresh TOTP code in addition to the session.                                                                                                                                                                       |
| Stored secrets   | `lib/secret-box.ts`: AES-256-GCM, key = HKDF(`JWT_SECRET`), values prefixed `enc:v1:`. Secrets are never returned to the browser. Rotating `JWT_SECRET` makes them unreadable (recovery: `scripts/reset-admin-auth.mjs --yes`).                                                  |
| Integration keys | `lib/integrations.ts`: SMTP, Cloudinary, R2, GitHub. **Admin-panel value wins, env var is the fallback.** Cached per instance for `CACHE_TTL_MS`; `invalidateIntegrationsCache()` on save.                                                                                       |
| Notes vault      | Separate `notes_session` cookie. Locked until a password and/or TOTP quick-unlock is set in Security & Keys. 30 tries / 15 min.                                                                                                                                                  |
| Rate limiting    | `lib/rate-limit.ts`, in-memory fixed window, **per process** (resets on cold start; add a platform limiter for hard guarantees).                                                                                                                                                 |

Full threat model and known limits: [SECURITY.md](../../SECURITY.md).

## 11. Feature modules

- **Sections registry** (`lib/sections-registry.ts`): `SECTION_REGISTRY` (ids, default order, labels), `SECTION_COMPONENT_MAP` (id → component), and `sectionProps` in `app/page.tsx`. `layout_content` stores only `isEnabled` and `order` per id; labels always come from code. `kits` is a route-level toggle, not a stacked section.
- **Kits** (`app/kits/*`, `lib/kits-registry.tsx`): each tool is a client component for its logic; its name/description/icon/accent come from `kits_content` and fall back to `KITS_DEFAULTS`. Accent colors are a closed palette (`KITS_COLOR_MAP`) because they map to fixed Tailwind classes. `/kits` itself is an HTTP redirect to `/kits/system` (`next.config.mjs`).
- **Contact** (`app/api/contact/route.ts`): validates, rate-limits (per IP), collects device context, looks up the IP (`api.ipapi.is`, fallback `ipwho.is`), and sends mail with nodemailer using integration keys. Returns 503 "not configured" when SMTP is not set; nothing is stored in the database. Disclosed in [PRIVACY.md](../../PRIVACY.md).
- **Notes vault** (`app/notes`, `app/api/notes/*`): Markdown notes, auto-save, R2 image upload, optional publishing to `/notes/<slug>`.
- **Articles** (`app/articles`, admin at `/administrator/articles`): each article is a Markdown document in `articles` plus its own `design` (font, size, width, alignment, header style, accent, extras). `NativeArticle` renders it on the server (`ArticleBody` = react-markdown + remark-gfm; raw HTML is never rendered; `:::` blocks for centered/right/note/tip/warning). `/articles/[slug]` looks the slug up here first and falls back to Dev.to; `generateStaticParams` returns `[]` so pages are cached, and a missing or unpublished slug is a real 404. Saves call `revalidateArticleIndex(slug)`. Uploaded files are scoped `articles` (Cloudinary folder `sections/articles`); saving prunes files no longer used and deleting an article deletes them, through `destroyUnreferenced` (a file another article still uses is kept). **Reactions** (`article_reactions`, one per kind per visitor) and **comments** (`article_comments`, moderated by default, one level of replies from the owner) are public POST routes under `app/api/articles/[slug]`: same-origin only, rate limited, honeypot, link cap, duplicate check; visitors are an HMAC of a random `pv` cookie, never an IP or user agent. Counters live on the article (`reactionTotals`, `commentCount`, `refreshCounters`). The Dev.to feed is optional and only used when a username is set in Section Texts (an empty query would list other people's posts).
- **Menu and visibility** (`chrome_content`, `lib/chrome-model.ts`): built-in links (matched by id; only label and on/off are stored), custom links with safe addresses, floating contact on/off, hero CV/social, footer parts. `resolveNav` removes links to hidden sections, so the header, the footer's Explore list and the scroll-spy all use the same list (`navFor(chrome, sections)`). `articles` and `kits` are route-level sections.
- **Avatar** (`lib/avatar-cache.ts`): the first match wins: the active upload, the public GitHub picture of the profile link in Global Settings (or a GitHub social link), the placeholder. `SafeAvatar` swaps in the placeholder if an address fails to load.
- **SEO**: `generateMetadata` in the root layout and per-page metadata use `lib/identity.ts` (CMS-derived name, title, socials); JSON-LD via `safeJsonLd` (escapes `<`); `sitemap`, `robots`, `llms.txt` use `SITE_URL`.

- **Media pipeline** (`lib/media-*.ts`, `components/admin/media-uploader.tsx`): the browser compresses an image (95% quality for slightly oversized files down to an 80% floor, then smaller dimensions; files that already fit are untouched), asks `/api/admin/media/sign` for a folder-locked signature and uploads **straight to Cloudinary** (images and videos up to 100 MB; no platform body limit). The server only stores `{ kind, src, public_id, … }`, validates that every reference is a Cloudinary URL inside the scope's folder, and deletes removed files (image or video resource type) after a successful save. Profile pictures are registered with `registerAvatar()`, which reads the real details back from Cloudinary. Deletes and renames in the Cloudinary explorer propagate (`lib/media-sync.ts`); `Re-sync` repairs drift. Videos are delivered as H.264 MP4 with a poster frame (`lib/cloudinary-url.ts`) and never autoplay unless the owner enables it per video. The CSP allows `api.cloudinary.com` (connect) and `res.cloudinary.com` (img, media).
- **UI style**: `theme_content.uiStyle` (`clean` default, or `terminal`) sets `data-ui` on `<html>`; Tailwind's `terminal:` variant and `<ByStyle>` show the developer look only there. `adminAccentMode` re-tints the admin's emerald palette through `.admin-accent` CSS variables.
- **Any language**: brand text accepts any script. `next/font/google` provides Noto fonts for Bangla, Arabic and Devanagari (downloaded only when such letters appear), `dir="auto"` on brand text, no letter-spacing on joined scripts, and effects split text by grapheme.

## 12. Caching layers (from outermost to innermost)

| Layer                        | Lifetime                                  | Cleared by                                  |
| ---------------------------- | ----------------------------------------- | ------------------------------------------- |
| Next full-route cache (HTML) | until revalidated                         | `revalidatePath` from admin save routes     |
| In-process loader caches     | `CACHE_TTL_MS` (180 s prod, **0 in dev**) | `invalidate*Cache()` in the same save route |
| `React.cache()`              | one request                               | n/a (dedupes `generateMetadata` + page)     |
| Icon resolver map            | process lifetime                          | restart                                     |

In-process caches live on `globalThis` (`lib/shared-state.ts`), not in module variables: in a production build each route and page has its own copy of every module, so a module-level cache could be invalidated in one copy while the page that regenerates reads another, freezing stale content into the static HTML. Separate serverless instances still keep separate caches, so another instance may serve a changed value for up to the TTL. That is accepted.

## 13. Performance architecture (the budget)

Measured on the reference machine, production build: homepage ~265 KB gzipped JS in 17 scripts (largest ~72 KB), server process ~120 MB, responses 5–15 ms, no long tasks. Hold the line:

- **No icon library, schema library or Sentry SDK in client bundles.** (`zod` and `react-hook-form` were removed from the browser path; Sentry is aliased to `lib/sentry-disabled.ts` unless a DSN is set.)
- **Everything visible arrives in the server HTML**: header, footer, socials, icons. Nothing waits for hydration or a follow-up fetch.
- **Animations are cheap and stop**: transform/opacity only, no infinite loops on layout/colour properties, canvas only while the pointer moves, `prefers-reduced-motion` honoured globally.
- **Below-the-fold sections are `next/dynamic`** (still server-rendered, JS split out).
- **Dev server memory**: `react-icons` external to the bundler, lucide as JSON, Sentry stubbed, `experimental.cpus` capped by `NEXT_BUILD_CPUS` (default 3). `next dev` still holds every compiled module in RAM (~1.4 GB after a few routes); prefer `pnpm preview` on small machines. `NEXT_DIST_DIR` lets a second build sit beside a running dev server.

## 14. Environment surface

Required: `MONGODB_URI`, `JWT_SECRET`. Everything else is optional and degrades to "feature off": `NEXT_PUBLIC_SITE_URL`, `R2_PUBLIC_URL`, `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_*`), `SEO_GEO_*`, `SOCIAL_*_URL` / `WHATSAPP_NUMBER` (short links `/github` etc.), `NEXT_PUBLIC_STATUS_URL`, `NEXT_PUBLIC_PRAYER_DEFAULT_CITY`, `NEXT_BUILD_CPUS`, `NEXT_DIST_DIR`, and the legacy fallbacks for integration keys (`SMTP_*`, `CLOUDINARY_*`, `R2_*`, `GITHUB_*`). The authoritative table is in [README.md](../../README.md#configuration) and `.env.example`.

## 15. Sharp edges

- `middleware.ts` uses the pre-16 filename; Next prints a deprecation warning. Renaming to `proxy.ts` is optional and not yet done.
- `node_modules` may hold a different `lucide-react` than `pnpm-lock.yaml`; the icon generator handles both data shapes (`iconNode` vs `icon.node`).
- Admin UI uses `<img>` in two places (lint warnings, accepted).
- `next/font/google` (Noto fonts for Bangla, Arabic, Hindi) downloads the fonts at **build** time, so a build needs network access.
- pnpm 12 refuses to install while a dependency's install script is undecided; the decisions are in `pnpm-workspace.yaml` (`allowBuilds`).
- The 404 page redirects home after a 9-second countdown by design.
