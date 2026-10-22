# Security Policy

[Home](README.md)

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Use GitHub's private reporting instead: open the repository's **Security** tab and choose **Report a vulnerability**. Include what you found, how to reproduce it, and the impact you expect. You will get an acknowledgement, and fixes are coordinated with you before anything is disclosed.

## Supported versions

Only the latest release on the default branch receives security fixes.

## Security model in one page

Global-ID is a single-owner CMS. There is one admin and one optional notes-vault user, both of whom are the site owner. The public site is read-only.

| Area               | What protects it                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Admin login        | Password (constant-time compare) and TOTP, 10 attempts / 15 min / IP                                 |
| Admin session      | `HS512` JWT, 15 minutes, `HttpOnly` + `SameSite=Strict` + `Secure` (production) cookie               |
| Admin API          | Middleware verification plus per-route re-verification, CSRF check via `Sec-Fetch-Site` / `Origin`   |
| Writes             | Zod validation on every mutating route, 60 writes / 5 min / IP                                       |
| Notes vault        | Separate session, scrypt-hashed password, optional TOTP quick unlock, 30 attempts / 15 min / IP      |
| Markdown / JSON-LD | Link allow-list on render; `<` escaped in all JSON-LD                                                |
| Headers            | Strict CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`        |
| Secrets            | Read only from environment variables. The app fails closed when `JWT_SECRET` is missing or too short |

## Known limitations (read before deploying)

- **Rate limiting is in-memory and per process.** On serverless platforms every instance has its own counters, and counters reset on cold start. Add platform-level rate limiting or a WAF for hard guarantees.
- **Notes are not encrypted at rest.** They are plain text in MongoDB, protected by authentication only. Enable encryption at rest with your database provider.
- **The TOTP step is skipped in `next dev`** by design. It is always enforced in production builds, so never run `next dev` on a public host.
- **The contact form collects visitor context** (see [PRIVACY.md](PRIVACY.md)) and relays it by email. Review that against the privacy law that applies to you.

## Deployment checklist

- [ ] `JWT_SECRET` is at least 32 random characters (`openssl rand -base64 32`)
- [ ] `ADMIN_PASSWORD` is long and unique; `ADMIN_TOTP_SECRET` is set
- [ ] HTTPS is enforced at the edge
- [ ] `.env*` files are not committed (they are git-ignored except `.env.example`)
- [ ] MongoDB is not exposed publicly and uses a dedicated user with a strong password
- [ ] `NEXT_PUBLIC_SITE_URL` is set to your real origin
- [ ] Dependabot or equivalent keeps dependencies current
