# AI and contributor documentation

[Home](../../README.md) · [Docs index](../README.md)

Everything an AI coding agent (or a new human contributor) needs to understand this project and change it safely. Written to be read top to bottom once, then used as a reference.

## Read in this order

| #   | Document                           | Read it to learn…                                                                                    |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | [ARCHITECTURE.md](ARCHITECTURE.md) | What the system is, how data flows (read path, write path, caching), auth, icons, performance budget |
| 2   | [CONVENTIONS.md](CONVENTIONS.md)   | The non-negotiable rules, code style, security habits, how to verify, pitfalls, doc upkeep           |
| 3   | [DESIGN.md](DESIGN.md)             | Visual language, color tokens, motion rules, loading behavior, admin look, accessibility, copy voice |
| 4   | [PLAYBOOKS.md](PLAYBOOKS.md)       | Exact file-by-file recipes: add a section, field, route, admin page, key, kit, icon, env var         |

For human users who only want to install and run the site, point them to [../GETTING-STARTED.md](../GETTING-STARTED.md) instead.

## The project in ten lines

1. Next.js 16 App Router + React 19 + TypeScript strict + Tailwind v4; MongoDB database `portfolio_cms`.
2. A single owner edits everything from `/administrator`; visitors get static, server-rendered pages.
3. Public pages are static and refreshed on demand by admin saves (`revalidatePath`), never on a timer.
4. Every public read falls back to built-in placeholder content if the database is down or empty.
5. Only `MONGODB_URI` and `JWT_SECRET` are required in the environment; all other credentials are set in the admin panel and stored encrypted.
6. Admin sign-in requires an authenticator (TOTP) always; a password is optional.
7. Icons are stored by name and resolved to SVG on the server; no icon library reaches the browser.
8. The site must stay light: ~265 KB gzipped JS on the homepage, no blocking loaders, cheap animations.
9. No real person's data may appear in the source (only `LICENSE` and the README author footer).
10. Docs, `.env.example` and `CHANGELOG.md` are updated in the same change as the behavior.

## Quick reference

| I need to…                          | Go to                                                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Find where something lives          | [ARCHITECTURE §4–5](ARCHITECTURE.md#4-directory-map)                                                      |
| Know which collection/doc type      | [ARCHITECTURE §6](ARCHITECTURE.md#6-data-model)                                                           |
| Make an admin save show on the site | [ARCHITECTURE §8](ARCHITECTURE.md#8-write-path-how-an-admin-save-works)                                   |
| Check what I may and may not do     | [CONVENTIONS: non-negotiables](CONVENTIONS.md#the-non-negotiables)                                        |
| Run checks / test against a real DB | [CONVENTIONS: verifying](CONVENTIONS.md#verifying-a-change)                                               |
| Pick colors, motion, loading UI     | [DESIGN §3, §6, §7](DESIGN.md#3-color-tokens-only)                                                        |
| Add a feature end to end            | [PLAYBOOKS](PLAYBOOKS.md)                                                                                 |
| Understand the security model       | [ARCHITECTURE §10](ARCHITECTURE.md#10-credentials-sessions-and-secrets), [SECURITY.md](../../SECURITY.md) |
| Know what data the site collects    | [PRIVACY.md](../../PRIVACY.md)                                                                            |

## Before you finish any task

1. Did you break a [non-negotiable](CONVENTIONS.md#the-non-negotiables)?
2. Did lint, type-check, Prettier (touched files) and build pass, and did you test real behavior where it matters?
3. Did you update the documents listed in [Keeping these docs true](CONVENTIONS.md#keeping-these-docs-true)?
4. Did you report results honestly, including anything you skipped or could not verify?
