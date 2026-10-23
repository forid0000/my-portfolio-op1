# Privacy

[Home](README.md)

my-portfolio-op1 is software you host yourself, so **you** are the operator of your site and responsible for its privacy notice. This page states exactly what the code does, so that your own notice can be truthful.

## What the site does not do

- It bundles **no analytics, advertising, or tracking scripts.** (Vercel Speed Insights is included in the layout and only runs when the site is hosted on Vercel; remove `<SpeedInsights />` from `app/layout.tsx` if you do not want it.)
- It sets **no cookies for visitors who only read.** The cookies are `admin_session` and `notes_session` (`HttpOnly` authentication cookies created when the owner signs in) and, only if a visitor reacts to or comments on an article, `pv` (see Article reactions and comments below).

## Data a visitor can send

### Article reactions and comments

If you publish articles (Admin → Articles) visitors can react and comment. What the code stores:

- **Reactions:** which reaction (like, love, ...) was given to which article, and a keyed hash (HMAC-SHA256 with your `JWT_SECRET`) of a random id kept in the first-party cookie `pv` (`HttpOnly`, `SameSite=Lax`, one year). The cookie is created only when a visitor first reacts or comments, holds no personal data, and lets the same browser take its reaction back. Without the hash nobody can link a stored reaction to a browser.
- **Comments:** the name the visitor typed, the optional email (never shown publicly, visible only to you in the admin), the text, the date, the moderation status, the same keyed visitor hash, and a keyed hash of the network address (to spot spam waves). The raw IP address and the browser string are **not** stored. Comments wait for your approval by default.
- The comment form remembers the visitor's name and email **in their own browser** (`localStorage`, key `comment-author`) so they need not retype them. Nothing is sent anywhere until they post.
- Deleting an article deletes its reactions and comments.

### Contact form

When someone submits the contact form, the server emails you (via the SMTP provider you configure):

- what the visitor typed: name, email, phone, location (optional), purpose, message;
- **context collected automatically**, to help you judge the inquiry: user agent, platform, languages, CPU core count, device memory, GPU renderer name, screen and viewport size, connection type and speed, battery level and charging state (where the browser exposes it), time zone, referrer, landing URL, cookie / Do-Not-Track / storage flags, color-scheme and reduced-motion preferences, time on page, scroll depth, and a visit counter;
- the visitor's **IP address**, taken from request headers, plus a **geolocation lookup** of that IP (city, region, country, ISP, VPN / proxy / Tor flags).

The IP lookup sends the visitor's IP address to third-party services (`api.ipapi.is`, falling back to `ipwho.is`). Nothing from the form is stored in your database: it is delivered by email only, and what happens next depends on your mail provider and inbox.

If you serve visitors in regions with strict privacy laws, consider disclosing this collection, or removing the fingerprinting fields in `lib/device-info.ts` and `app/api/contact/route.ts`.

### Browser storage (stays on the visitor's device)

| Key                                                                                                 | Purpose                                                           |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `my-portfolio-op1-visit-meta`                                                                       | Visit counter and first-visit date, attached to contact messages  |
| `my-portfolio-op1:pageVisits`, `my-portfolio-op1:totalUptime`                                       | Counters shown in the header uptime badge                         |
| `comment-author`                                                                                    | Name and email in the comment form, so it is pre-filled next time |
| `admin.sidebar` (owner only)                                                                        | Width and folded state of the admin menu                          |
| `my-portfolio-op1-*-pref`, `my-portfolio-op1-qr-*`, `my-portfolio-op1-picker-*`, `genpass-prefs-v2` | Remembered settings of the utility kits                           |

Nothing in browser storage is sent anywhere except the visit counter that accompanies a contact-form submission and the name and email of a comment the visitor chooses to post.

## Third-party requests made by the site

| Service                                  | When                                                                         | What is sent                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Dev.to API                               | Articles page, sitemap, `llms.txt` (only if a Dev.to username is configured) | The configured username, from your server                                                               |
| Cloudinary (`res.cloudinary.com`)        | Gallery, avatar, project and certificate pictures and videos (if you upload) | Image and video requests, fetched by your server's image optimizer or directly by the visitor's browser |
| GitHub (`avatars.githubusercontent.com`) | Only if you keep a GitHub profile link and have not uploaded a picture       | The visitor's browser (or your server's image optimizer) requests your public GitHub picture            |
| Cloudinary (`api.cloudinary.com`)        | Only in the admin, when you upload a picture or video                        | The file itself, sent from the owner's browser with a signature your server issued                      |
| `api.ipapi.is`, `ipwho.is`               | System-info kit (visitor's browser); contact form (your server)              | Visitor IP (looks up "my IP" in the kit)                                                                |
| `open.er-api.com`                        | Currency kit                                                                 | Requested currency code                                                                                 |
| `api.aladhan.com`, `api.open-meteo.com`  | Prayer-times kit                                                             | Latitude / longitude of the chosen city, or of "My location" rounded to about 1 km                      |
| Sentry (`*.ingest.*.sentry.io`)          | Only if `NEXT_PUBLIC_SENTRY_DSN` is set                                      | Error reports and 10% performance samples                                                               |
| Vercel Speed Insights                    | Only when hosted on Vercel                                                   | Anonymous performance metrics                                                                           |

The QR scanner kit uses the camera entirely in the browser; images are not uploaded.

## Credentials and keys

Passwords are stored as scrypt hashes, and authenticator seeds and integration keys (email, Cloudinary, R2, GitHub) are stored encrypted in your MongoDB database. They are only used by your own server and are never sent to visitors or to this project's authors.

## Notes vault

Notes are stored as plain text in your MongoDB database and are visible to anyone with database access. See [SECURITY.md](SECURITY.md).
