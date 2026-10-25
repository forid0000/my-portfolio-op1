# Instructions for AI coding agents

This repository documents itself for AI agents in [`docs/ai/`](docs/ai/README.md). **Read it before changing code**; it is short and exact.

1. [`docs/ai/ARCHITECTURE.md`](docs/ai/ARCHITECTURE.md): how the system works and where things live.
2. [`docs/ai/CONVENTIONS.md`](docs/ai/CONVENTIONS.md): the rules, how to verify a change, known pitfalls.
3. [`docs/ai/DESIGN.md`](docs/ai/DESIGN.md): visual language, motion and loading behavior, admin look.
4. [`docs/ai/PLAYBOOKS.md`](docs/ai/PLAYBOOKS.md): file-by-file recipes for common changes.

## The rules that matter most

- **No real person's data in the source.** Placeholders only (`Your Name`, `example.com`). Defaults live in `lib/content-defaults.ts`. The one exception is `lib/project-credit.ts`, which credits the creator of this open-source template (never a deployment's owner); a unit test fails if the name appears anywhere else.
- **No secrets, and no default value for one.** Only `MONGODB_URI` and `JWT_SECRET` are required in the environment; every other credential is set in the admin panel (Security & Keys) and stored encrypted.
- **TOTP is mandatory for the admin; passwords are optional.** No bypass, no backup codes.
- **Keep the browser light.** No `lucide-react` namespace, `react-icons`, `zod` or Sentry SDK in client code. Resolve icons on the server (`lib/icons/resolve.ts`).
- **Everything visible arrives in the server HTML.** Never add a blocking loader, splash or full-screen overlay (`app/loading.tsx` is a thin top bar by design).
- **Validate every write** (session, rate limit, Zod) and **fall back to defaults** on every public read.
- **After a save route changes shared chrome** (header, footer, theme, avatar, section toggles), call `revalidateSiteChrome()`, not just `revalidatePublicContent()`.
- **Default look is the clean style**; developer wording and monospace are opt-in (`terminal:` variant, `<ByStyle>`). Brand text may be in any language.
- **Never keep a cache in a module variable** (use `lib/shared-state.ts`); a production build has one copy of each module per route.
- **Do not commit, push or open pull requests** unless the human owner asks. Stage and describe the change.
- **Update the docs, `.env.example` and `CHANGELOG.md`** in the same change as the behavior.

## Commands

```bash
pnpm install
pnpm dev                      # compiles on demand; ~1.4 GB RAM after a few routes
pnpm preview                  # next build && next start: light, recommended on small machines
pnpm verify                   # Prettier, ESLint, tsc, unit tests, production build (what CI runs first)
pnpm test:smoke               # production server + throwaway MongoDB + fake Cloudinary, end to end
pnpm format                   # Prettier --write (CI only checks)
```

On a machine with little free memory run heavy steps one at a time, cap them (`systemd-run --user --scope -p MemoryMax=2G -p MemorySwapMax=0 …`), and never stop a dev server you did not start.

If anything here disagrees with the code, the code wins: fix the document in the same change.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
