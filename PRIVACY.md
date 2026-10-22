# Privacy

[Home](README.md)

Global-ID is software you host yourself, so **you** are the operator of your site and responsible for its privacy notice. This page states exactly what the code does, so that your own notice can be truthful.

## What the site does not do

- It bundles **no analytics, advertising, or tracking scripts.** (Vercel Speed Insights is included in the layout and only runs when the site is hosted on Vercel; remove `<SpeedInsights />` from `app/layout.tsx` if you do not want it.)
- It sets **no cookies for visitors.** The only cookies are `admin_session` and `notes_session`, which are `HttpOnly` authentication cookies created when the owner signs in.

## Data a visitor can send

### Contact form

When someone submits the contact form, the server emails you (via the SMTP provider you configure):

- what the visitor typed: name, email, phone, location (optional), purpose, message;
- **context collected automatically**, to help you judge the inquiry: user agent, platform, languages, CPU core count, device memory, GPU renderer name, screen and viewport size, connection type and speed, battery level and charging state (where the browser exposes it), time zone, referrer, landing URL, cookie / Do-Not-Track / storage flags, color-scheme and reduced-motion preferences, time on page, scroll depth, and a visit counter;
- the visitor's **IP address**, taken from request headers, plus a **geolocation lookup** of that IP (city, region, country, ISP, VPN / proxy / Tor flags).

The IP lookup sends the visitor's IP address to third-party services (`api.ipapi.is`, falling back to `ipwho.is`). Nothing from the form is stored in your database: it is delivered by email only, and what happens next depends on your mail provider and inbox.

If you serve visitors in regions with strict privacy laws, consider disclosing this collection, or removing the fingerprinting fields in `lib/device-info.ts` and `app/api/contact/route.ts`.

### Browser storage (stays on the visitor's device)

| Key                                                                            | Purpose                                                          |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `global-id-visit-meta`                                                         | Visit counter and first-visit date, attached to contact messages |
| `global-id:pageVisits`, `global-id:totalUptime`                                | Counters shown in the header uptime badge                        |
| `global-id-*-pref`, `global-id-qr-*`, `global-id-picker-*`, `genpass-prefs-v2` | Remembered settings of the utility kits                          |

Nothing in browser storage is sent anywhere except the visit counter that accompanies a contact-form submission.

## Third-party requests made by the site

| Service                                 | When                                                                         | What is sent                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Dev.to API                              | Articles page, sitemap, `llms.txt` (only if a Dev.to username is configured) | The configured username, from your server                                                     |
| Cloudinary (`res.cloudinary.com`)       | Gallery, avatar (if you upload images)                                       | Image requests, fetched by your server's image optimizer or directly by the visitor's browser |
| `api.ipapi.is`, `ipwho.is`              | System-info kit (visitor's browser); contact form (your server)              | Visitor IP (looks up "my IP" in the kit)                                                      |
| `open.er-api.com`                       | Currency kit                                                                 | Requested currency code                                                                       |
| `api.aladhan.com`, `api.open-meteo.com` | Prayer-times kit                                                             | Latitude / longitude of the chosen city, or of "My location" rounded to about 1 km            |
| Sentry (`*.ingest.*.sentry.io`)         | Only if `NEXT_PUBLIC_SENTRY_DSN` is set                                      | Error reports and 10% performance samples                                                     |
| Vercel Speed Insights                   | Only when hosted on Vercel                                                   | Anonymous performance metrics                                                                 |

The QR scanner kit uses the camera entirely in the browser; images are not uploaded.

## Notes vault

Notes are stored as plain text in your MongoDB database and are visible to anyone with database access. See [SECURITY.md](SECURITY.md).
