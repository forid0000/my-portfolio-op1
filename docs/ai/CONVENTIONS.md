# Conventions and working rules

[AI docs index](README.md) · [Home](../../README.md)

How to work in this repository: what is never allowed, how code is written, how to verify a change, and which documents to update. [CONTRIBUTING.md](../../CONTRIBUTING.md) is the human-facing summary; this file is the detailed version for agents and new contributors.

## The non-negotiables

Break one of these and the change is rejected, whatever else it does.

1. **No identity in source.** No real name, email, phone, domain, handle, location, photo or company in code, defaults, comments, tests or docs, except `LICENSE` and the author footer in `README.md`. Placeholders only: "Your Name", `example.com`, `you@example.com`. Neutral defaults live in `lib/content-defaults.ts`; deployment values come from env through `lib/site-config.ts`; SEO identity comes from the CMS through `lib/identity.ts`.
2. **No secrets in source, ever, and no default value for one.** Not in code, `.env.example`, docs, tests, commit messages or screenshots. A missing credential switches a feature off; it never falls back to a built-in key and never reaches someone else's account. Only `MONGODB_URI` and `JWT_SECRET` are required in the environment; do not add new required secrets. Credentials are managed from the admin panel (`lib/credentials.ts`, `lib/integrations.ts`).
3. **TOTP is mandatory for the admin; passwords are optional.** Do not add a development bypass, a backup code, a "remember me", or an environment-variable password.
4. **The browser stays light.** Never import `lucide-react` (namespace), `react-icons`, `zod`, or the Sentry SDK into client code. Resolve icons on the server and pass `IconData` down. Validate in the browser with plain functions.
5. **Everything visible arrives in the server HTML.** No loader, splash, countdown or full-screen overlay between the visitor and the content. See [DESIGN.md](DESIGN.md#7-loading-and-feedback).
6. **Validate every write.** Mutating routes need: session check, rate limit, Zod parse. Unknown keys are stripped (default `z.object`), never `.passthrough()`.
7. **Public reads never throw.** Wrap database reads and fall back to defaults.
8. **Keep the docs true.** If behavior, configuration, data collection or a third-party call changes, update the matching documents in the same change (see [below](#keeping-these-docs-true)).

## Code style

- **TypeScript strict.** Type new code properly. Existing Mongo documents are often `any`; do not copy that into new modules, give them an interface.
- **Prettier** (`.prettierrc.json`): semicolons, single quotes, 2 spaces, `printWidth` 100, trailing commas `es5`, LF. Format only the files you change.
- **ESLint** is `eslint-config-next` with a handful of React hook rules relaxed (`eslint.config.mjs`). The bar is zero errors; two `<img>` warnings in the admin are known.
- **Imports** use the `@/` alias for anything outside the current folder.
- **Server components by default.** Add `'use client'` only for state, effects, browser APIs or event handlers, and keep the client file as small as possible (push data fetching and icon resolution to the server parent).
- **Server-only modules** that touch secrets or Node APIs import `'server-only'` (see `lib/icons/resolve.ts`). `lib/auth.ts` is imported by the Edge middleware, so it must stay Edge-safe: no `node:crypto`, no `next/headers` at top level.
- **Client-only helpers**: `lib/visit-tracker.ts`, `lib/crypto-utils.ts`. Do not import them on the server.
- **Naming**: files kebab-case (`kits-nav-client.tsx`); components PascalCase; functions camelCase; constants `UPPER_SNAKE`; client leaf components that pair with a server page are named `<thing>-client.tsx`.
- **Comments explain why**, not what. Start non-trivial modules with a short block comment on purpose and constraints (follow `lib/theme.ts`, `lib/sections-registry.ts`). Do not leave commented-out code or TODOs without an owner.
- **No new dependency without need.** Check that it is not a client-bundle regression (run a build and look at the First Load JS), that its license is compatible with MIT, and that it is maintained. Remove dependencies you stop using.
- **Match the surrounding code**: same error-handling shape, same response format (`{ error: string }` with a status), same comment density.

## Security habits in code

- Compare secrets and codes in constant time (`safeEqual`, `timingSafeEqual`).
- Authentication failures use one generic message ("Invalid code or password."). Validation failures for editors can be specific.
- Never log a secret, a TOTP code, a password, a token or a full connection string. Log what happened, not the value.
- Never return a stored secret to the browser. Return `set` / `not set`.
- Sensitive changes (credentials, keys) require a fresh authenticator code (step-up) on top of the session.
- Cookies: `HttpOnly`, `SameSite=Strict`, `Secure` in production. Admin API mutations are CSRF-checked in `middleware.ts`.
- Everything that goes into JSON-LD passes `safeJsonLd` (escapes `<`). Markdown links are allow-listed on render.
- Outbound requests only to the hosts listed in [PRIVACY.md](../../PRIVACY.md) and only for a reason a visitor or owner would expect; update that file when you add one.
- Rate-limit keys are `<scope>:<ip>` (`admin-write`, `contact`, `admin-setup`...). The limiter is per-process by design; do not pretend it is global.

## Data rules

- Database name is fixed: `portfolio_cms`. Use `db.connection.client.db('portfolio_cms').collection(name)`.
- `homepage` docs are keyed by `type` and written with an **upsert by type**. Never `insertOne` into `homepage`.
- Store media as `{ src, public_id }` (Cloudinary), never base64.
- Add an index to `INDEXES` in `lib/db-bootstrap.ts` when a query path needs it and bump `SCHEMA_VERSION`: every deployment creates it automatically on its next start. Code must still work if an index could not be built.
- Existing stored documents must keep working: add new fields with defaults, merge over defaults on read, never require a migration.

## Performance rules

Budget and rationale are in [ARCHITECTURE.md §13](ARCHITECTURE.md#13-performance-architecture-the-budget). In practice:

- Run `pnpm build` after any change that touches a client component or a shared import and compare First Load JS. The homepage should stay near 265 KB gzipped.
- Prefer `next/dynamic` for below-the-fold client sections.
- No `setInterval` / `requestAnimationFrame` that runs while nothing changes. Clean up every timer and listener.
- Do not add `blur-*` surfaces larger than a card, or more than one `backdrop-blur` in the page chrome.

## Verifying a change

Run, in this order, and report results honestly (including failures):

```bash
pnpm verify        # Prettier (whole repo), ESLint, tsc, unit tests, production build (npm: npm run verify)
pnpm test:smoke    # production server + throwaway MongoDB + fake Cloudinary (needs a prior build)
```

`pnpm verify` expects 0 lint errors (2 known `<img>` warnings). `pnpm test:smoke` covers content saving, revalidation, uploads and the public pages (extend `tests/smoke/e2e.mjs` when you add a write route). For auth flows, also test by hand against a real database on a production build. Recipe:

1. Start a throwaway MongoDB (for example `docker run -d --rm --name test-mongo -p 127.0.0.1:27018:27017 --tmpfs /data/db --memory 400m mongo:7`).
2. Build and start a **copy** or a separate dist dir so you never clobber a running dev server: `NEXT_DIST_DIR=.next-verify NEXT_BUILD_CPUS=2 MONGODB_URI=mongodb://127.0.0.1:27018/portfolio_cms JWT_SECRET=<32+ chars> pnpm build`, then `next start -p 3201` with the same variables.
3. Script the flow with `fetch` + `otplib` (`generateSync({ secret })`): first-run setup with the setup code, login, step-up changes, a save, then GET the public page and assert the new content appears within a request or two.
4. Stop the server and database and delete the dist dir when done.

On a low-memory machine run these steps **one at a time**, cap memory (`systemd-run --user --scope -p MemoryMax=2G -p MemorySwapMax=0 …`), and stop and report if anything hangs instead of retrying with more load. Never kill a dev server you did not start.

## Pitfalls already paid for

- **Never keep a cache in a module variable.** In a production build every route and page has its own copy of each module, so an admin save cleared only its own copy and the static page that regenerated read a stale one, freezing old content into the HTML (found by the smoke test). Use `sharedState()` from `lib/shared-state.ts`, and do not cache a failed read.
- **pnpm 12 stops on undecided install scripts** (`ERR_PNPM_IGNORED_BUILDS`). The decisions live in `pnpm-workspace.yaml` (`allowBuilds`); a new dependency with an install script needs an entry there, or CI fails.
- **Developer styling is opt-in.** The default look is the clean style. Use `terminal:` Tailwind classes (`terminal:font-mono`, `terminal:uppercase`) or `<ByStyle clean=… terminal=… />` for anything prompt-like; never hard-code monospace, `~/` paths or `SYS_` wording into the default look.
- **Keep both lockfiles in sync.** `pnpm install` updates `pnpm-lock.yaml`; then run `npm install --package-lock-only --ignore-scripts` so `package-lock.json` matches (CI runs `npm ci`). If npm reports an `ERESOLVE` peer conflict, a dependency bump is ahead of the tooling: pin it back (ESLint stays on 9 until `eslint-plugin-react` supports 10; TypeScript stays on 5.9 until `typescript-eslint` supports 7).
- **Every form shows which field is wrong.** Give inputs `data-field="path.to.field"` (matching the Zod path) when you write a new editor; the admin layout's `FieldErrorBridge` then outlines and scrolls to the field of any 400 answer that carries Zod issues. For a check done in the browser before saving, call `reportFieldIssues(issues, payload)` from `lib/field-errors.ts` and toast `summary`. In a route, return `problem(['slug'], 'message')` (`lib/api/respond.ts`) for a rule Zod cannot express.
- **Editors must use `useUnsavedWarning`** (it feeds the unsaved-changes counter) and call `markClean(savedState)` after a successful save.
- **Do not add a `packageManager` field** to `package.json`: pnpm then rewrites `pnpm-lock.yaml` with a large extra section. CI installs `pnpm@12.14.0` explicitly.
- **Do not put `lucide-react` in `serverExternalPackages`**; it conflicts with Next's default handling of that package. Only `react-icons` is external.
- **`otplib` v13** has no default export: `import { generateSecret, generateURI, verifySync } from 'otplib'`. `verifySync` takes `epochTolerance`; the result's `timeStep` may need a fallback.
- **TypeScript binary shim**: with pnpm, `node_modules/.bin/tsc` is a shell shim; run `node node_modules/typescript/lib/tsc.js` if you call it from Node.
- **Static pages and chrome**: header/footer/theme/avatar changes must call `revalidateSiteChrome()`, not just `revalidatePublicContent()`, or `/kits`, `/articles` and `/notes` stay stale. A change to a published note, its address or the public wording calls `revalidateNotes(slug)`.
- **Never trust a file's type or name from the browser.** `resolveFileType()` (`lib/notes-model.ts`) decides what an upload is: the extension first, then a short allow-list; pages, scripts and text are stored and served as `text/plain`. Serve with `nosniff` and a sandboxing CSP, and answer 404 (not 403) for a file the caller may not read.
- **Show pictures whole.** Never put a user's picture in a fixed `aspect-*` frame with `object-cover`: a phone screenshot or a banner is cut to a strip. Use `MediaPreview` (contain over a soft backdrop) for cards, thumbnails and the viewer; `object-cover` is for decoration only. A class passed to a component that already has `relative` must go through `cn()` (`MediaPreview` does), or `absolute inset-0` loses and the frame collapses to nothing.
- **A saved empty list means empty.** Placeholders stand in only until something is saved (`Array.isArray(doc.list)`, not `doc.list?.length`), and a section with nothing to show renders nothing and takes its menu link and hero button with it.
- **Contact values must open the visitor's app.** Email, phone and WhatsApp are links (`lib/contact-links.ts`), with a separate copy button; never make a whole card copy-only.
- **A global key handler must respect the page.** Single-letter and arrow shortcuts (`vault-app.tsx`) skip anything already handled (`e.defaultPrevented`), anything typed into a field, open dialogs and menus, and, while writing, everything that could move you away from the text. A control that owns arrow keys (the editor divider) must take focus when clicked.
- **Saves must never overlap.** The notes editor chains every save in one promise (`useNoteDraft`); a second request waits for the first, so a slow network cannot create a note twice, and the server's answer never overwrites what was typed meanwhile.
- **`/kits` has no page of its own**; it is a config redirect. Test the real tool URL (`/kits/system`) when checking kits chrome.
- **Production caches** for global/theme/layout/integrations last up to `CACHE_TTL_MS` per instance; in dev the TTL is 0.
- **Regenerate icons** (`node scripts/generate-icon-names.mjs`) after upgrading `react-icons` or `lucide-react`, then commit the two generated files.
- **Setup code label** `my-portfolio-op1/setup-code/v1` exists in both `lib/setup-code.ts` and `scripts/setup-code.mjs`; they must stay identical.

## Git and pull requests

- Do not commit, push, tag or open pull requests unless the human owner asks you to. Stage changes and describe them.
- Commit messages: imperative mood, optional prefix (`feat:`, `fix:`, `docs:`, `chore:`). One focused change per commit and per pull request.
- Never commit `.env*` (except `.env.example`), build output, or local databases.
- A pull request description says what changed, why, how it was tested, and includes screenshots for UI changes.

## Keeping these docs true

| If you change…                                          | Update                                                                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Setup steps, hosting steps, anything a beginner follows | `docs/GETTING-STARTED.md`, README Quick start / Deployment                                                 |
| An env var, a default, or an integration key            | `.env.example`, README Configuration table, `lib/site-config.ts` / `lib/integrations.ts`, ARCHITECTURE §14 |
| Data collected or a third-party call                    | `PRIVACY.md`                                                                                               |
| Auth, sessions, encryption, rate limits                 | `SECURITY.md`, ARCHITECTURE §10                                                                            |
| Structure, data model, caching, revalidation            | ARCHITECTURE                                                                                               |
| Visual language, motion, loading, admin look            | DESIGN                                                                                                     |
| A recipe step (new file you must now touch)             | PLAYBOOKS                                                                                                  |
| Anything user-visible                                   | `CHANGELOG.md` (Keep a Changelog format)                                                                   |

When a statement in these docs no longer matches the code, fix the doc in the same change; stale instructions are worse than none.

## Definition of done

- [ ] Meets every non-negotiable above.
- [ ] `pnpm verify` passes, and `pnpm test:smoke` for anything touching data, uploads or revalidation.
- [ ] Behavior verified against a real database where it matters; results reported honestly.
- [ ] First Load JS did not grow without a reason.
- [ ] Docs and `CHANGELOG.md` updated.
- [ ] No secrets, personal data or generated junk in the diff.
