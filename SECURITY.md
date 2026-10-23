# Security Policy

[Home](README.md)

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Use GitHub's private reporting instead: open the repository's **Security** tab and choose **Report a vulnerability**. Include what you found, how to reproduce it, and the impact you expect. You will get an acknowledgement, and fixes are coordinated with you before anything is disclosed.

## Supported versions

Only the latest release on the default branch receives security fixes.

## Security model in one page

my-portfolio-op1 is a single-owner CMS. There is one admin and one optional notes-vault user, both of whom are the site owner. The public site is read-only.

| Area                   | What protects it                                                                                                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First-run setup        | Setup code derived from `JWT_SECRET` and printed only in the server log; 10 attempts / 15 min / IP; closes for good once the admin exists                                                                                                                      |
| Admin sign-in          | Authenticator (TOTP) **always required**, optional password (scrypt) enforced once set; generic failure message; each code usable once; 10 attempts / 15 min                                                                                                   |
| Admin session          | `HS512` JWT, 15 minutes, `HttpOnly` + `SameSite=Strict` + `Secure` (production) cookie                                                                                                                                                                         |
| Sensitive changes      | Passwords, authenticators and integration keys need a fresh authenticator code in addition to the session; 15 attempts / 15 min                                                                                                                                |
| Stored credentials     | Passwords scrypt-hashed; authenticator seeds and integration secrets AES-256-GCM encrypted with a key derived from `JWT_SECRET`; secrets never sent back                                                                                                       |
| Admin API              | Middleware verification plus per-route re-verification, CSRF check via `Sec-Fetch-Site` / `Origin`                                                                                                                                                             |
| Writes                 | Zod validation on every mutating route, 60 writes / 5 min / IP                                                                                                                                                                                                 |
| Media uploads          | Admin-only signature, locked to one folder and to image or video formats; the API key is returned, the secret never. Stored references must be Cloudinary URLs inside the area's folder; cleanup only deletes files that were in the previously saved document |
| Notes vault            | Separate session; optional scrypt-hashed password and/or authenticator quick unlock; locked for everyone until one is set; 30 attempts / 15 min / IP                                                                                                           |
| Markdown / JSON-LD     | Link allow-list on render; `<` escaped in all JSON-LD                                                                                                                                                                                                          |
| Headers                | Strict CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`                                                                                                                                                                  |
| Infrastructure secrets | `MONGODB_URI` and `JWT_SECRET` only, read from the environment. The app fails closed when `JWT_SECRET` is missing or too short                                                                                                                                 |

## Known limitations (read before deploying)

- **Rate limiting is in-memory and per process.** On serverless platforms every instance has its own counters, and counters reset on cold start. Add platform-level rate limiting or a WAF for hard guarantees.
- **Notes are not encrypted at rest.** They are plain text in MongoDB, protected by authentication only. Enable encryption at rest with your database provider.
- **Rotating `JWT_SECRET` makes stored secrets unreadable.** Authenticator seeds and integration keys are encrypted with a key derived from it. After a rotation, run the recovery script, set the admin up again and re-enter the keys. Keep the value stable and private.
- **Integration settings are cached for a few minutes per instance** in production, so a changed key can take up to about three minutes to reach every serverless instance.
- **First-run setup needs access to the server log** (or to `JWT_SECRET`) to read the setup code. Anyone who can read your logs or environment already controls the deployment.
- **Recovery needs database access.** `node scripts/reset-admin-auth.mjs --yes` removes the admin credentials so setup can run again; there are no backup codes, by design (they would be one more secret to protect).
- **The contact form collects visitor context** (see [PRIVACY.md](PRIVACY.md)) and relays it by email. Review that against the privacy law that applies to you.

## Deployment checklist

- [ ] `JWT_SECRET` is at least 32 random characters (`openssl rand -base64 32`) and stays stable
- [ ] The first-run setup was completed immediately after deploying (nobody else can claim it without the setup code, but do not leave it pending)
- [ ] The authenticator is enrolled on at least two devices, or its key is stored safely
- [ ] HTTPS is enforced at the edge
- [ ] `.env*` files are not committed (they are git-ignored except `.env.example`)
- [ ] MongoDB is not exposed publicly and uses a dedicated user with a strong password
- [ ] `NEXT_PUBLIC_SITE_URL` is set to your real origin
- [ ] Dependabot or equivalent keeps dependencies current
