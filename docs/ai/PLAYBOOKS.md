# Playbooks

[AI docs index](README.md) · [Home](../../README.md)

Step-by-step recipes for the changes people make most. Each lists **every file you must touch**; missing one is the usual cause of "it saves but nothing shows up". Rules behind them: [CONVENTIONS.md](CONVENTIONS.md). Structure: [ARCHITECTURE.md](ARCHITECTURE.md).

Contents: [new homepage section (one document)](#add-a-homepage-section-stored-as-one-document) · [new section (many items)](#add-a-section-stored-as-many-items) · [new field on an existing section](#add-a-field-to-an-existing-section) · [admin API route](#add-an-admin-api-route) · [admin page and menu entry](#add-an-admin-editor-page) · [integration key](#add-an-integration-key) · [kit tool](#add-a-kit-tool) · [show an icon](#show-an-icon-from-the-cms) · [environment variable](#add-an-environment-variable) · [theme token](#add-a-theme-token) · [upgrade dependencies](#upgrade-dependencies)

---

## Add a homepage section stored as one document

Example: a "Awards" section whose whole content is one `homepage` document of `type: 'awards_content'`.

1. **Defaults.** Add `AWARDS_DEFAULTS` to `lib/content-defaults.ts` (neutral placeholder content, no real names).
2. **Schema.** Add `awardsContentSchema` to `lib/validation/content-schemas.ts` (plain `z.object`, so unknown keys are stripped).
3. **Component.** Create `components/awards.tsx`: a server component using the prompt-heading pattern from `components/skills.tsx` and the tokens in [DESIGN.md](DESIGN.md). Props: `content`, `heading?`, `terminalPrefix?`. Default `content` to `AWARDS_DEFAULTS` so it renders without a database. If it needs client JS, put that in a small `awards-client.tsx`.
4. **Register it** in `lib/sections-registry.ts`:
   - add `{ id: 'awards', label: 'Awards', order: <n>, isSystemConfig: true }` to `SECTION_REGISTRY` (keep `order` unique; `kits` stays last),
   - add `awards: Awards` to `SECTION_COMPONENT_MAP` (use `dynamicImport(() => import(...))` if it is below the fold).
5. **Load it** in `app/page.tsx`: declare `let awardsContent = { ...AWARDS_DEFAULTS }`, find the doc with `allDocs.find((d) => d.type === 'awards_content')` inside the `try`, **map its fields explicitly** (see how `heroDoc` is mapped), and add `awards: { content: awardsContent, heading: sectionTexts.awardsHeading, terminalPrefix: sectionTexts.terminalPrefix }` to `sectionProps`. Every key in `SECTION_COMPONENT_MAP` needs a `sectionProps` entry.
6. **Admin API.** Create `app/api/admin/content/awards/route.ts` (see [Add an admin API route](#add-an-admin-api-route)), upserting `type: 'awards_content'` and calling `revalidatePublicContent()`.
7. **Admin page.** Create `app/administrator/(dashboard)/awards/page.tsx` and add it to `NAV_GROUPS` in `app/administrator/(dashboard)/layout.tsx` ([Add an admin editor page](#add-an-admin-editor-page)).
8. **Optional section texts.** If the heading should be editable, add `awardsHeading` to `SECTION_TEXT_DEFAULTS`, the headings schema in `content-schemas.ts` and the Section Texts page.
9. **Search.** If it should appear in the admin command palette search, extend `app/api/admin/search-index/route.ts`.
10. **Docs.** `CHANGELOG.md`; README feature list; ARCHITECTURE §6 (new `type`).

No database migration: `mergeLayoutSections` adds the new id as enabled at its registry order for owners who saved a layout earlier.

## Add a section stored as many items

Example: "Awards" as a list of items, like education or testimonials.

1. **Schema.** Add `awardItemSchema` to `lib/validation/section-schemas.ts`.
2. **Route.** `app/api/admin/content/awards/route.ts` is three lines:

   ```ts
   import { createCollectionHandlers } from '@/lib/api/collection-crud';
   import { awardItemSchema } from '@/lib/validation/section-schemas';

   export const { GET, POST, PATCH, DELETE } = createCollectionHandlers('awards', awardItemSchema);
   ```

   Pass `getPublicIds` if items hold Cloudinary media, so deletes clean up the files.

3. **Public read.** In `app/page.tsx` add `getPublicItems('awards')` to the `Promise.all`, guarded by `isSectionEnabled(sections, 'awards')`, and add the `sectionProps` entry.
4. **Component, registry, admin page.** As in the first playbook; the admin page is a `CollectionEditor` (copy `app/administrator/(dashboard)/education/page.tsx`: `endpoint`, `emptyItem`, `getItemLabel`, `validateItem`, `renderFields`).
5. **Index.** Add `awards` to `ORDERED_COLLECTIONS` in `lib/db-bootstrap.ts` and bump `SCHEMA_VERSION`; deployments create it automatically.

## Add a field to an existing section

Type-keyed content is mapped field by field, so a field added in only one place **saves but never shows**. Touch all of these:

1. `lib/content-defaults.ts`: default value.
2. `lib/validation/content-schemas.ts`: add to the Zod schema (otherwise it is stripped on save).
3. The route's explicit `updateFields` in `app/api/admin/content/<section>/route.ts`.
4. The explicit mapping in `app/page.tsx` (for example `heroContent = { greeting: heroDoc.greeting || ..., ... }`).
5. The component's props and rendering.
6. The admin page form (state, input, save payload).
7. Any `search-index` or JSON-LD use, if relevant.

## Add an admin API route

Copy the shape of `app/api/admin/content/homepage/route.ts`. Order matters:

```ts
import { NextResponse } from 'next/server';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { revalidatePublicContent } from '@/lib/revalidate';
import { awardsContentSchema } from '@/lib/validation/content-schemas';

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`admin-write:${clientIp(request)}`, 60, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const parsed = awardsContentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const db = await connectToDatabase();
    await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .updateOne(
        { type: 'awards_content' },
        { $set: { ...parsed.data, type: 'awards_content', updatedAt: new Date() } },
        { upsert: true }
      );

    revalidatePublicContent(); // or revalidateSiteChrome() if shared chrome shows it
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('awards save error:', error);
    return NextResponse.json({ error: 'Failed to save awards content' }, { status: 500 });
  }
}
```

Checklist: session check first; rate limit; Zod; upsert by `type`; invalidate the in-process cache of any loader whose data you changed (`invalidateGlobalCache`, `invalidateThemeCache`, `invalidateLayoutCache`, `invalidateIdentityCache`, `invalidateIntegrationsCache`); revalidate the right pages ([ARCHITECTURE §8](ARCHITECTURE.md#8-write-path-how-an-admin-save-works)); never echo secrets; return `{ error }` with a status. `middleware.ts` already requires a session and a same-site origin for everything under `/api/admin`, but each route still verifies for itself.

Anything that changes credentials or integration keys must additionally require a fresh TOTP code (copy `app/api/admin/security/route.ts`).

## Add an admin editor page

1. Create `app/administrator/(dashboard)/<name>/page.tsx` as a client component. For lists use `CollectionEditor`; for a single document fetch from the route, edit local state, `POST` on save, toast the result, and use `useUnsavedWarning`.
2. Add `{ href: '/administrator/<name>', label: '<Menu label>', icon: <LucideIcon> }` to the right group in `NAV_GROUPS` in `app/administrator/(dashboard)/layout.tsx`.
3. Follow the admin look in [DESIGN.md §8](DESIGN.md#8-interaction-patterns): gray-950/900 surfaces, emerald accent, `font-mono` for keys and code.
4. Admin pages import icons directly from `lucide-react` for the menu (the admin is not on the public budget), but **icons chosen by the owner** still go through `IconPicker` and the server resolver.

## Add pictures or videos to a section

1. **Scope.** If it is a new area, add it to `MEDIA_SCOPES` in `lib/media-types.ts` (folder, `allowVideo`, incoming image transformation) and to the `scope` enum in `app/api/admin/media/sign/route.ts`.
2. **Schema.** Add `media: mediaListSchema('<scope>').optional()` (a list; index 0 is the cover) or `singleMediaSchema('<scope>')` (one picture) to the section's Zod schema. Only Cloudinary URLs inside the scope's folder validate.
3. **Cleanup.** Collection sections: list the field in `mediaFields` in the route (`createCollectionHandlers`), which deletes files on remove, on delete, and really unsets a field the editor dropped. Single-document sections: diff old and new with `mediaRefs` / `removedRefs` and call `destroyMedia` inside `after()`, as `app/api/admin/content/projects/route.ts` does. Add the field to `lib/media-sync.ts` and `isMediaReferenced` so Cloudinary-explorer deletes and renames keep it in sync.
4. **Admin.** Use `<MediaUploader scope="…" />` (lists) or `<SectionImageUploader />` (one picture). Both compress in the browser and upload straight to Cloudinary through `lib/media-upload.ts`.
5. **Public.** Render a list with `<MediaGallery items title />` (cover, thumbnails, lazy lightbox) and a single picture with `next/image`.
6. **Test.** Add the new route and field to `tests/smoke/e2e.mjs`.

## Add an integration key

1. Add the field to `INTEGRATION_FIELDS` in `lib/integrations.ts`: `{ key, label, group, secret, placeholder?, hint?, legacyEnv? }`. `secret: true` encrypts it at rest and hides it from the API. For a new service add a value to `IntegrationGroup` and an entry in `INTEGRATION_GROUPS`.
2. Add validation for the value in `validateIntegrationValue` if it has a format.
3. Read it on the server with `await getIntegration('MY_KEY')` or `getIntegrations([...])`. Never read `process.env` directly for an integration; the helper applies "admin value first, environment fallback".
4. The Security & Keys page renders the field automatically from the catalog.
5. Document the fallback variable in `.env.example` (commented), the README configuration table, and `PRIVACY.md` if the service receives visitor or owner data.

## Add a kit tool

1. Copy `app/kits/age/` to `app/kits/<key>/`: `page.tsx` (metadata with `getToolContent('<key>')`, a fixed SEO title, canonical `${SITE_URL}/kits/<key>`), `layout.tsx` (metadata + `WebApplication` JSON-LD built from `getSiteIdentity()`), and `<key>-client.tsx` (the tool; client-side only, no new heavy dependency, persists preferences in `localStorage` with the `my-portfolio-op1-` prefix and a try/catch).
2. Add the tool to `KITS_DEFAULTS.tools` in `lib/kits-registry.tsx` (`key`, `name`, `description`, `icon`, `accentColor` from `KITS_COLOR_MAP`).
3. Add `/kits/<key>` to the static route list in `app/sitemap.ts`.
4. If the tool calls a third-party API, list it in `PRIVACY.md` and, if it is called from the browser, in the CSP in `next.config.mjs` (`connect-src`).
5. **Gotcha:** `mergeKitsContent` uses the owner's saved `tools` list as-is once one exists. A tool you add to the defaults will not appear for owners who already saved the Kits page until they add it in Admin → Kits (or you extend `mergeKitsContent` to append missing defaults). Say so in the CHANGELOG.

## Show an icon from the CMS

Icons are stored as names; render data, not names, in client code.

- **Server component:** `<DynamicLucideIcon name={item.icon} className="w-4 h-4" />` (`components/dynamic-lucide-icon.tsx`, async, falls back to a generic glyph).
- **Page that passes icons to client components:** collect the names, `const icons = await resolveIconMap([...names])` (`lib/icons/resolve.ts`), pass `icons` as a prop, and in the client use `renderIcon(icons[name], <Fallback />, 'w-4 h-4')` or `<SocialIcon name={…} icons={icons} />` for socials (bundled brand mark → resolved glyph → mail icon).
- **Admin picker:** `components/admin/icon-picker.tsx` (`scope="social"` limits to brand-capable sets). It searches through `/api/admin/icons`.
- Never import `react-icons/*` or the whole `lucide-react` namespace in a client file or in a way that pulls every icon into a bundle.

## Add an environment variable

1. Prefer the admin panel (credentials) or the CMS (content) over a new variable. Only deployment-level facts belong in the environment.
2. Read it in one place, `lib/site-config.ts` for site-wide values, with a safe fallback and no hardcoded personal default.
3. Document it in `.env.example` (commented unless required), the README configuration table, and ARCHITECTURE §14. Add it to `CHANGELOG.md`.
4. If it is public (`NEXT_PUBLIC_*`), remember it is baked into the client bundle at build time.

## Add a theme token

1. Add the field and a default to `SiteTheme` / `THEME_DEFAULTS` and `sanitizeTheme` in `lib/theme.ts`; make `themeToCssVars` emit it.
2. Define the variable in `:root` and `.dark` in `app/globals.css`, and expose it in `@theme inline`.
3. The theme route validates through `sanitizeTheme` (hex colors and a safe radius only; there is no Zod schema), so step 1 is the validation. Add the field to the Appearance page (`app/administrator/(dashboard)/appearance`).
4. Use it through its Tailwind utility; never hardcode its value.

## Upgrade dependencies

- Use pnpm. Do not add a `packageManager` field. Keep `pnpm-lock.yaml` consistent (`pnpm install`, then commit the lockfile).
- After `react-icons` or `lucide-react` changes: `node scripts/generate-icon-names.mjs`, then check `/api/admin/icons?names=Mail,FaAws,TbBrandDocker` still resolves.
- After a Next.js or React upgrade: run the full verification in [CONVENTIONS.md](CONVENTIONS.md#verifying-a-change) and compare First Load JS and dev-server memory.
- Re-check anything in [CONVENTIONS.md "Pitfalls"](CONVENTIONS.md#pitfalls-already-paid-for) that depends on the upgraded package.
