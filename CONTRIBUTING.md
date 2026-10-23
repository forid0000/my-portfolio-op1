# Contributing to my-portfolio-op1

[Home](README.md)

Thanks for helping improve my-portfolio-op1. Bug reports, fixes, documentation, and focused features are all welcome.

## Before you start

- Search existing issues and pull requests first.
- For anything larger than a small fix, **open an issue to discuss it** before writing code, so effort is not wasted on a direction the project will not take.
- Security problems go through the private process in [SECURITY.md](SECURITY.md), never a public issue.
- By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

Requirements: Node.js 20.9+, [pnpm](https://pnpm.io), and a MongoDB database.

```bash
pnpm install
cp .env.example .env.local     # set MONGODB_URI and JWT_SECRET
pnpm dev                       # the database sets itself up on first start
```

The app runs at <http://localhost:3000>. On first visit to `/administrator` a setup wizard asks for the setup code printed in your terminal (or `node scripts/setup-code.mjs`) and enrols your authenticator; there is no development bypass. Credentials and integration keys are managed in Admin → Security & Keys.

## Understand the codebase first

[`docs/ai/`](docs/ai/README.md) is the contributor handbook, written for humans and AI coding agents alike: [architecture](docs/ai/ARCHITECTURE.md), [conventions and pitfalls](docs/ai/CONVENTIONS.md), [design and behavior rules](docs/ai/DESIGN.md), and file-by-file [playbooks](docs/ai/PLAYBOOKS.md) for common changes. Read the conventions before your first pull request.

## Checks to run before opening a pull request

```bash
pnpm verify        # Prettier, ESLint, TypeScript, unit tests (Vitest) and the production build
pnpm test:smoke    # end-to-end: production server + a throwaway MongoDB + a fake Cloudinary
```

`pnpm format` rewrites files with Prettier (project config in `.prettierrc.json`); CI only checks. The smoke test is needed when you change data, uploads or revalidation.

CI (one workflow, one job) runs all of the above on every pull request.

## Project conventions

- **Never hardcode identity.** Names, links, emails, domains, and locations must not appear in source code. Placeholder content lives in `lib/content-defaults.ts`, deployment settings come from environment variables via `lib/site-config.ts`, and SEO identity comes from the CMS via `lib/identity.ts`.
- **Never hardcode secrets or fallbacks for them.** Credentials come from the admin panel's store (`lib/credentials.ts`, `lib/integrations.ts`) or, for integrations, the environment, and never have a default value. Only `MONGODB_URI` and `JWT_SECRET` are required in the environment; do not add new required environment secrets.
- **Keep the browser light.** Never import an icon library (`lucide-react` namespace, `react-icons`) or a schema library like `zod` into client code. Resolve icons on the server (`lib/icons/resolve.ts`) and pass SVG data down, validate in the browser with plain functions, and render visible UI on the server so it arrives with the HTML. Animations must stop when idle, avoid layout-expensive properties, and respect `prefers-reduced-motion`. Never cover the page with a loading overlay or gate navigation behind an intro animation; loading feedback is a thin non-blocking indicator (`app/loading.tsx`).
- **One source of default content.** Do not copy default text into components or routes; import it from `lib/content-defaults.ts`.
- **Validate every write.** New mutating admin routes need a Zod schema, session verification, and rate limiting, like the existing ones (see `lib/api/collection-crud.ts`).
- **Database failures must degrade gracefully.** Public pages wrap reads and fall back to defaults.
- **Optional integrations stay optional.** A missing environment variable switches the feature off; it must never crash the app or reach another account.
- **Keep PRIVACY.md truthful.** If you change what data the site collects or which third parties it calls, update [PRIVACY.md](PRIVACY.md).
- TypeScript strict mode, Prettier formatting, and the existing file layout. Match the style of the code around your change.

## Pull requests

- Keep each pull request focused on one change.
- Describe what changed and why, and how you tested it. Include screenshots for UI changes.
- Update the README, `.env.example`, and [CHANGELOG.md](CHANGELOG.md) when behavior or configuration changes.
- Commit messages in the imperative mood ("Add rate limit to X"); a conventional prefix (`feat:`, `fix:`, `docs:`, `chore:`) is welcome.

## Reporting bugs

Use the bug report form and include your Node.js version, how you run the app (Vercel, self-hosted, local), the exact steps, and what you expected versus what happened. Remove secrets from any logs you paste.
