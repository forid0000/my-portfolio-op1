# Contributing to Global-ID

[Home](README.md)

Thanks for helping improve Global-ID. Bug reports, fixes, documentation, and focused features are all welcome.

## Before you start

- Search existing issues and pull requests first.
- For anything larger than a small fix, **open an issue to discuss it** before writing code, so effort is not wasted on a direction the project will not take.
- Security problems go through the private process in [SECURITY.md](SECURITY.md), never a public issue.
- By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

Requirements: Node.js 20.9+, [pnpm](https://pnpm.io), and a MongoDB database.

```bash
pnpm install
cp .env.example .env.local     # set MONGODB_URI, JWT_SECRET, ADMIN_PASSWORD
node scripts/create-indexes.mjs
pnpm dev
```

The app runs at <http://localhost:3000>; the admin dashboard is at `/administrator` (password only in development).

## Checks to run before opening a pull request

```bash
pnpm lint                 # ESLint
npx tsc --noEmit          # type check
pnpm format               # Prettier (project config in .prettierrc.json)
pnpm build                # production build
```

CI runs the same checks on every pull request.

## Project conventions

- **Never hardcode identity.** Names, links, emails, domains, and locations must not appear in source code. Placeholder content lives in `lib/content-defaults.ts`, deployment settings come from environment variables via `lib/site-config.ts`, and SEO identity comes from the CMS via `lib/identity.ts`.
- **Never hardcode secrets or fallbacks for them.** Credentials are read from the environment only, with no default value.
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
