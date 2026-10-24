# Getting started (step by step, no experience needed)

[Home](../README.md) · [Docs index](README.md)

This guide takes you from nothing to your own live website that you can edit from your browser. You do not need to know how to code. If you can create an account on a website and copy and paste, you can do this.

**Time:** about 40 minutes the first time. **Cost:** nothing for the free plans described here (see [What it costs](#what-it-costs)).

## What you are building

- A website with your name, your story, your work and a contact form.
- A private control panel (`/administrator`) where you change everything by typing into forms. You never edit code or redeploy to change a sentence.
- Sign-in protected by an **authenticator app** on your phone. This is required, so a stolen password alone cannot open your site.

The pieces you will set up, in plain words:

| Piece                 | What it is                                                   | Why you need it                              |
| --------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| **GitHub**            | A website that stores a copy of the project's files.         | Your host reads your copy from here.         |
| **MongoDB Atlas**     | An online database (a safe filing cabinet).                  | Your text, settings and passwords live here. |
| **Vercel**            | A company that runs your website on the internet.            | It makes your site reachable by anyone.      |
| **Authenticator app** | An app on your phone that shows a 6-digit code that changes. | Your second lock when you sign in.           |

## What it costs

- GitHub, MongoDB Atlas (the free "M0" database) and Vercel (the free "Hobby" plan) all have free plans that are enough for a personal site.
- **Important:** Vercel's free Hobby plan is meant for personal, non-commercial use. If the website is for a business (a shop, a restaurant, a paid service), read Vercel's current terms and use a paid plan or another host. Everything in this guide except the Vercel steps works the same on any host that runs Node.js.
- A custom address like `www.yourname.com` costs a yearly fee at a domain seller. It is optional; you get a free `something.vercel.app` address.

## Before you begin

Have these ready:

1. An email address you can read.
2. A phone with an authenticator app (see the list in [Step 6](#step-6-create-your-admin-account)). Install one now if you do not have one.
3. A place to keep secrets safely: a password manager is best (Bitwarden, 1Password, and similar). You will create two secrets today. **Do not keep them only in your head or in a chat.**

---

## Step 1: Get your own copy of the project

1. Create a free account at <https://github.com> (skip if you have one).
2. Open the project's page on GitHub (the page where you found this guide).
3. Click **Fork** at the top right, then **Create fork**.

✅ **Checkpoint:** you now see the project under your own account, at an address like `github.com/<your-username>/my-portfolio-op1`.

## Step 2: Create the database

1. Create a free account at <https://www.mongodb.com/atlas> and sign in.
2. Create a new deployment and choose the **Free (M0)** option. Pick the region closest to your visitors, then create it.
3. Atlas asks you to create a **database user**. This is the username and password the website uses to open the database.
   - Choose a username (for example `portfolio`).
   - Choose a password made of **letters and numbers only**. (Symbols like `@` or `/` break the connection address in the next step.)
   - **Save both in your password manager.**
4. Open **Network Access** (in the left menu) → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`) → confirm.
   - Why: Vercel does not have one fixed address, so the database must accept connections from anywhere. It is still protected by the username and password. This setting can be tightened later by someone technical.
5. Go back to **Database** (or **Clusters**) → **Connect** → **Drivers**. Copy the **connection string**. It looks like this:

   ```
   mongodb+srv://portfolio:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```

6. Replace `<password>` (including the `<` and `>`) with your database password. This is your **`MONGODB_URI`**. Save it in your password manager.

You do **not** need to create any tables or a database name. The site creates what it needs the first time you save something.

✅ **Checkpoint:** you have a `MONGODB_URI` that starts with `mongodb+srv://`, contains your real password, and has no `<` or `>` in it.

## Step 3: Make your secret key

The site needs one long secret to sign you in securely. It is called **`JWT_SECRET`**.

- It must be **at least 32 characters** of random letters and numbers. Use your password manager's **generate password** feature and set the length to 48 or more.
- Save it in your password manager next to the database details.

> ⚠️ **Never share it and do not change it later.** Your authenticator and saved keys are locked with it. If you change it, you must set up your admin account again.

## Step 4: Put the site online (Vercel)

1. Create a free account at <https://vercel.com>. Choosing **Continue with GitHub** is the easiest.
2. Click **Add New…** → **Project**, find your fork in the list, and click **Import**.
3. Open **Environment Variables** and add these two (name on the left, value on the right), pressing **Add** after each:

   | Name          | Value                             |
   | ------------- | --------------------------------- |
   | `MONGODB_URI` | the connection string from Step 2 |
   | `JWT_SECRET`  | the long secret from Step 3       |

4. Click **Deploy** and wait a few minutes.

✅ **Checkpoint:** Vercel shows a success screen with a picture of your site. Click it. You should see a page with placeholder content ("Your Name"). That is correct: it is ready for you to fill in.

> If the page shows placeholder content even after you have saved your own, the website cannot reach the database. See [Troubleshooting](#troubleshooting).

## Step 5: Find your setup code

The first time, nobody has an account yet. To make sure only **you** can create it, the site asks for a **setup code** that only the owner of the hosting account can see.

1. In your browser, go to your site's address plus `/administrator`, for example `https://your-project.vercel.app/administrator`. It forwards you to a **setup** page and asks for a code. Leave that page open.
2. In another tab, open your project in Vercel and click **Logs** (runtime logs).
3. Look for a box of `====` lines that says **"first-run setup is pending"**. The code is right there, in the form `K7QWM-3XNPD`. The code is printed again each time the setup page is opened, so if you do not see it, reload the setup page, wait a few seconds, refresh the logs and look again.
4. Type the code into the setup page.

**If you cannot find it in the logs:** the code is calculated from your `JWT_SECRET`, so anyone with Node.js installed on a computer can print it with:

```
JWT_SECRET="paste-your-secret-here" node scripts/setup-code.mjs
```

(Ask a technical friend, or use the [run it on your own computer](#run-it-on-your-own-computer-optional) section below.)

## Step 6: Create your admin account

Next the page shows a square **QR code**.

1. Open your authenticator app on your phone (Google Authenticator, Microsoft Authenticator, Authy, 2FAS, Aegis, 1Password, Bitwarden… any of them works).
2. Add a new account and **scan the QR code**. A 6-digit code appears in the app and changes every 30 seconds.
3. **Save the written key** shown under the QR code (the "enter this key manually" text) in your password manager. It is your only backup.
4. Type the current 6-digit code into the page.
5. The page also has an optional box for a password as an extra lock (at least 12 characters). The authenticator is always required; the password is a bonus.

✅ **Checkpoint:** you are taken inside the admin dashboard.

> ⚠️ **There are no backup codes by design.** If you lose your phone and did not save the written key, getting back in needs someone technical who has access to your database (see [Troubleshooting](#i-lost-my-authenticator)). Save the key now, or add the same account on a second device right away.

From now on you sign in at `/administrator` with a code from your phone (and your password, if you set one). For safety a session lasts 45 minutes. The dashboard shows a countdown, turns it red in the last 3 minutes, and has a **+15 Min** button: each click adds 15 minutes, up to 3 hours in total from when you signed in (then the button says "Max 3 h" and you sign in again).

## Step 7: Make it yours

Use the left menu in the dashboard. A good order:

1. **Global Settings**: your name in the header and footer, tagline, location, time zone and social links.
2. **Hero Section** and **About**: the first things visitors read.
3. **Sections & Layout**: switch off what does not apply to you (for example Roadmap or Tech Stacks), and drag the rest into the order you want.
4. **Experience**, **Projects**, **Services**, **Education**, **Skills**, **Testimonials** and the other content pages: add your real entries and delete the examples.
5. **Appearance**: choose the **Clean** style (plain headings, works for any profession) or **Terminal** (developer look), pick one of 44 color schemes (light, dark or mixed) and fine-tune any color, with a live preview. Every color on the site comes from this one page. You can also choose the admin panel color.
   **Navigation & Visibility**: rename, reorder or hide the menu links, add your own, and hide the corner contact button, the CV button or parts of the footer.
6. **System & SEO**: the title and description that appear in Google and when your link is shared.
7. **Hero Section** (or **Media Manager**): upload your profile picture (or just keep your GitHub profile link in Global Settings and your public GitHub picture is used until you upload one). It goes live straight away and is shown in the hero, the top-left of every page and the browser tab. Upload a résumé in **Media Manager**. **Projects**, **Services**, **Certifications** and **Education** accept several pictures and videos each (the first is the cover). On your site a visitor clicks the card and sees all of them, whole and large, next to the full details. In **Contact**, type your WhatsApp number with the country code (for example +1 555 123 4567): clicking the phone card opens WhatsApp, and clicking the email card opens the visitor's mail app. Every section title can be reworded in **Section Texts**.

**Articles**: write your own articles right in the dashboard (text, pictures, videos, tags, and a design you choose), publish them when ready, and approve the comments readers leave.

Press **Save** on each page. The public site updates right after you save; refresh the page if you do not see it. If a save is rejected, the page scrolls to the field to fix and outlines it in red. The counter at the top-left of the dashboard shows how many changes are waiting to be saved, and you can drag the edge of the left menu to make it wider or narrower, or double-click it to fold it.

## Step 8: Turn on the contact form, image uploads and the rest (optional)

Open **Security & Keys** in the dashboard. At the top is a **setup checklist** that shows what is done and what is missing, and every section has a green **How to get this** box with the same steps as below. Everything you save here is stored encrypted and is never shown again. You are asked for a fresh authenticator code each time you change something (type the 6 digits at the top of the page, then press the save button of the section; each code works for one change).

_Steps below were checked against the providers' official documentation in October 2026. Their screens change now and then; the official pages linked here always win._

### Contact form email (SMTP)

**What it is:** when a visitor sends a message, your site emails it to you. For that it needs the login details of an email-sending service (SMTP). **Cost:** Brevo, Gmail and Resend all have free allowances (check their pricing pages for the current limits). **Time:** about 10 minutes. **If you skip it:** the form politely says it is not set up; the email, phone and WhatsApp buttons still work.

Pick one provider:

| Provider | Host                   | Port             | Username                                                                                         | Password                                                                                          |
| -------- | ---------------------- | ---------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Brevo    | `smtp-relay.brevo.com` | `587`            | The SMTP login shown on Brevo's **SMTP & API → SMTP** page (can look like `code@smtp-brevo.com`) | An **SMTP key** you generate on that page (not your account password, not an API key)             |
| Gmail    | `smtp.gmail.com`       | `587` (or `465`) | Your full Gmail address                                                                          | A 16-character **App password** (needs 2-Step Verification; your normal password no longer works) |
| Resend   | `smtp.resend.com`      | `465` (or `587`) | `resend`                                                                                         | Your Resend **API key** (starts with `re_`)                                                       |

1. Sign in to the provider. **Brevo:** open <https://app.brevo.com/settings/keys/smtp>, stay on the **SMTP** tab, copy the login and press **Generate SMTP key**. **Gmail:** turn on 2-Step Verification, then open <https://myaccount.google.com/apppasswords>, create an app password and copy the 16 characters (work or school accounts may not offer this). **Resend:** create an API key in your Resend dashboard.
2. Paste **host**, **port**, **username** and **password** into the boxes. Port 587 is the usual choice; with port 465 the site switches the secure connection on by itself.
3. **Deliver messages to** = the inbox where you want to read the messages.
4. **Send messages from** = an address your provider has **verified** for you (in Brevo add and verify the sender or domain; in Resend verify your domain; with Gmail use the same Gmail address). Providers refuse mail from addresses they do not know. If you leave it empty, the username is used.
5. Type your authenticator code at the top, press **Save Contact form email (SMTP)**, then send yourself a test message from the contact form.

Official pages: [Brevo SMTP help](https://help.brevo.com/hc/en-us/articles/7924908994450) · [Google app passwords](https://support.google.com/accounts/answer/185833) · [Resend SMTP](https://resend.com/docs/send-with-smtp).

If messages do not arrive: look in the spam folder, then check that the "send from" address is verified at the provider.

### Cloudinary (pictures and videos)

**What it is:** it stores and resizes everything you upload (profile picture, projects, services, certificates, articles, gallery) and serves it fast. Your browser uploads straight to it, so large files work. **Cost:** it has a free plan. **Time:** about 5 minutes. **If you skip it:** uploads do not work.

1. Create a free account at <https://cloudinary.com> and confirm your email.
2. Open the **Console → Dashboard** (<https://console.cloudinary.com/>) and copy the **Cloud name** (shown at the top, in the Product Environment section).
3. Open **Settings** (the gear in the left sidebar) → **API Keys**. Copy the **API key**. Click to reveal the **API secret** (you may be asked for your password) and copy it. Only the roles Master admin, Admin and Technical admin can see these.
4. Paste the three values into **Security & Keys → Cloudinary**, enter your authenticator code, press **Save Cloudinary**.
5. Test: upload a small picture in **Media Manager**.

The API secret is like a password: never post it in a chat or a screenshot. If it ever leaks, create a new key on the same API Keys page, paste the new pair here, then delete the old one. Official page: [Finding your Cloudinary credentials](https://cloudinary.com/documentation/finding_your_credentials_tutorial).

### Authenticator and passwords

- **Authenticator (required):** any app that supports 6-digit "TOTP" codes works (Google Authenticator, Microsoft Authenticator, 2FAS, Aegis, Ente Auth, 1Password, Bitwarden, Authy). Add a new account, scan the QR code (or choose "enter a setup key" and type the written key), and **save the written key in your password manager**: there are no backup codes. If every code is refused, set your phone's clock to automatic.
- **Admin password (optional):** an extra lock. Let your password manager generate 16 or more characters (the minimum is 12).
- **Private notes unlock:** your private notes at `/notes/vault` stay locked for everyone until you set a **vault password** (8+ characters, a 7-day sign-in) and/or turn on **authenticator quick unlock** (a 6-digit code, 45 minutes at a time). Use a separate authenticator entry for it (label it "Notes"). With quick unlock, the **+15** button next to the countdown adds 15 minutes each time, up to 3 hours in total from unlocking. Visitors only see the notes you publish at `/notes`.

### GitHub profile sync (optional, for developers)

**What it is:** if your GitHub profile README is generated from this site, GitHub normally notices a change only once a day. With this, every save tells GitHub straight away. **Skip it** unless you have such a README.

1. You need your profile repository: a public repository named exactly like your username (for example `your-username/your-username`) with a `README.md` ([GitHub: managing your profile README](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme)).
2. Add `.github/workflows/update-profile.yml` to it. The event type is `cms-updated`, and the file must be on the repository's **default branch** or GitHub ignores the event:

   ```yaml
   name: Update profile README
   on:
     repository_dispatch:
       types: [cms-updated]
     workflow_dispatch:
   jobs:
     update:
       runs-on: ubuntu-latest
       permissions:
         contents: write
       steps:
         - uses: actions/checkout@v7
         - name: Rebuild the README
           run: echo "Put the command that regenerates your README here"
   ```

3. Create the token: GitHub → your profile picture → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**. Give it a name and an expiry. **Resource owner:** your account. **Repository access:** _Only select repositories_ → your profile repository. **Permissions → Repository permissions → Contents: Read and write.** Press **Generate token** and copy it at once: GitHub shows it only one time ([official steps](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)).
4. In **Security & Keys → GitHub profile sync** paste `your-username/your-username` and the token, enter your authenticator code, press **Save**.
5. Test: save any page in the admin, then open the **Actions** tab of the profile repository. A run triggered by `repository_dispatch` appears within a minute.

Tokens expire. When yours does, syncing stops quietly (your site keeps working); create a new one and paste it. A classic token with the `repo` scope also works.

### The two values that are not on this page

`MONGODB_URI` and `JWT_SECRET` live in your hosting account (Steps 2-4) because the site needs them before anyone can sign in. In Vercel: your project → **Settings** → **Environment Variables**. Changes apply only to **new** deployments, so press **Redeploy** afterwards ([Vercel: environment variables](https://vercel.com/docs/environment-variables)). Never change `JWT_SECRET` later.

- **Private notes:** visitors see only the notes you publish at `/notes`. Your own notes (`/notes/vault`) stay locked until you set a password or turn on authenticator quick-unlock in Security & Keys. You can attach pictures, documents and whole folders from your computer to a note; they are kept privately in your database. **Admin → Notes** has its own checklist, an explanation of how long you stay unlocked, and answers to common problems.

## Step 9: Your own web address (optional)

1. Buy a domain from any domain seller.
2. In Vercel: your project → **Settings** → **Domains** → add it, and follow the instructions Vercel shows (you copy a couple of records into your domain seller's DNS page).
3. In Vercel: **Settings** → **Environment Variables** → add `NEXT_PUBLIC_SITE_URL` with your address, for example `https://www.yourname.com` (no slash at the end).
4. Open **Deployments**, click the three dots next to the latest one, and choose **Redeploy** so the change takes effect.

This variable controls the web address used in Google results, the sitemap and link previews, so set it once your final address is known.

---

## Run it on your own computer (optional)

Not needed to get online. Useful to try things privately or to work on the code.

1. Install **Node.js** (the "LTS" version, 20.9 or newer) from <https://nodejs.org>, and **Git** from <https://git-scm.com>.
2. Open a terminal (Terminal on Mac, PowerShell on Windows) and run these one at a time:

   ```bash
   npm install --global pnpm
   # (Prefer to use npm only? Skip this step and use `npm install` and `npm run preview` below instead.)
   git clone <the address of your fork>
   cd my-portfolio-op1
   pnpm install
   ```

3. Create your settings file by copying the example:
   - Mac / Linux: `cp .env.example .env.local`
   - Windows PowerShell: `Copy-Item .env.example .env.local`
4. Open `.env.local` in any text editor and fill in `MONGODB_URI` and `JWT_SECRET` (the same two values as above).
5. Start the site:

   ```bash
   pnpm preview     # builds once, then starts a light, fast server
   ```

   Then open <http://localhost:3000/administrator>. The **setup code** is printed in the terminal window. (On a powerful computer you can use `pnpm dev` instead, which updates as you edit code but uses far more memory.)

6. Nothing else to run: the first time the server starts, it prepares the database (indexes and safety checks) by itself.

## Troubleshooting

**The site shows "Your Name" placeholders even though I saved my content.**
The website cannot reach the database. Check that `MONGODB_URI` in Vercel has your real password (no `<` `>`), the password has only letters and numbers, and **Network Access** in Atlas allows `0.0.0.0/0`. After fixing, redeploy.

**The setup page says "Could not read the setup state" or "Setup failed".**
Same cause: the database is not reachable. Fix `MONGODB_URI` and redeploy.

**"That setup code is not correct."**
Copy it again from the logs. Capitals and the dash do not matter, but you must use the code from your **own** deployment. After 10 wrong tries you must wait 15 minutes.

**"That authenticator code is not correct."**
Codes last 30 seconds: type the newest one. Make sure your phone's clock is set to **automatic** (a wrong clock is the most common cause).

**"Too many attempts."**
Wait 15 minutes and try again. This protects your login from guessing.

**I changed something in the dashboard but the site looks the same.**
Reload the page. Content pages refresh straight after saving. Email and image keys can take about 3 minutes to reach every server.

**The contact form says it is not configured.**
Add your SMTP details in **Security & Keys** (Step 8).

**I changed `JWT_SECRET` and now I cannot sign in.**
Put the old value back and redeploy. If it is lost, you must reset the admin account (below) and re-enter your keys.

### I lost my authenticator

There is no "forgot code" email, on purpose: it would be a back door into your site. If you saved the written key, add it to a new authenticator app and you are back in. If not, someone with access to your database must run the reset script on a computer that has the project and your `MONGODB_URI` in `.env.local`:

```bash
node scripts/reset-admin-auth.mjs --yes
```

It only removes the admin login. Your content and notes stay untouched. Then go through Steps 5 and 6 again.

## Keeping your site up to date

On your fork's page on GitHub, use **Sync fork** whenever the original project publishes an update. Vercel redeploys on its own. Read [CHANGELOG.md](../CHANGELOG.md) first: if an entry says "Migration", follow it.

## Words you may have heard

- **Deploy**: put your site on the internet.
- **Fork**: your own copy of someone else's project on GitHub.
- **Environment variable**: a setting you give to the host instead of writing it in the files, used for secrets.
- **Authenticator (TOTP)**: the phone app that shows a rotating 6-digit code.
- **Domain**: your web address, such as `yourname.com`.
- **SMTP**: the way a website sends email through an email provider.

## Need more?

- All settings and what they do: [README](../README.md#configuration)
- Security details and limits: [SECURITY.md](../SECURITY.md)
- What data the site collects (for your own privacy notice): [PRIVACY.md](../PRIVACY.md)
- Found a bug or stuck? Open an issue on the project's GitHub page and **remove any secrets** from what you paste.
