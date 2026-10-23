# Design and behavior

[AI docs index](README.md) · [Home](../../README.md)

The visual language, UI behavior and interaction rules of the product. Follow these when you add or change anything a person sees. Architecture lives in [ARCHITECTURE.md](ARCHITECTURE.md); coding rules in [CONVENTIONS.md](CONVENTIONS.md).

## 1. Principles

1. **Instant.** The page is usable the moment the HTML arrives. Nothing blocks navigation, nothing hides the header behind a loader, nothing waits for hydration to show content.
2. **Calm.** Motion decorates; it never demands attention or loops forever on something expensive. It stops when idle and respects `prefers-reduced-motion`.
3. **Owner-editable.** If a visitor can read it, the owner can change it from the admin. Hard-coded copy is a bug (placeholders live in `lib/content-defaults.ts`).
4. **Neutral by default.** A fresh install says "Your Name" and links to `example.com`. It never describes a real person and never makes a claim the product cannot back (for example, no "end-to-end encrypted" copy).
5. **Degrade, don't crash.** Missing data, a missing icon, an unconfigured integration or an unreachable database all produce a sensible fallback, not an error page.

## 2. Visual identity

A dark, **developer-terminal** look: monospace labels, prompt-style headings, soft glass cards and one vivid accent.

- **Section headings are shell prompts**: `<terminalPrefix>:~/<section>$`, in `font-mono`. The prefix is `terminalPrefix` from Section Texts (default `DEFAULT_TERMINAL_PREFIX` = `dev@portfolio`). A `Terminal` icon in `text-primary` leads the line. Reuse `components/skills.tsx` as the pattern.
- **Cards are quiet glass**: `bg-card/20 border border-border/30 rounded-xl`, lifting on hover with `hover:border-primary/40 hover:bg-card/30`. A category/label strip uses `bg-primary/5 border-b border-border/30`.
- **Accent is `primary`** (emerald by default). Blue is the supporting accent for the `~/section` path inside prompts (`text-blue-500` in existing sections; prefer `text-secondary` in new code so it follows the theme).
- The page background is the theme background with a subtle dot-grid (`components/dot-weave.tsx`), never a solid decorative image.

## 3. Color: tokens only

In new public-site code, never write a raw hex or a fixed Tailwind palette color (`text-emerald-400`) for brand-level color. Use the semantic tokens; the owner can change them in Admin → Appearance. (Existing components still contain a few fixed colors, and the kits' closed accent palette is the one deliberate exception; do not copy the old habit.)

| Token (utility)                      | Meaning                           | Dark default                    |
| ------------------------------------ | --------------------------------- | ------------------------------- |
| `background` / `foreground`          | page and body text                | `#1d232a` / `#e5e7eb`           |
| `card` / `card-foreground`           | surfaces                          | `#2a3142` / `#e5e7eb`           |
| `primary` / `primary-foreground`     | accent, buttons, highlights       | `#34d399` / `#1d232a`           |
| `secondary` / `secondary-foreground` | support accent                    | `#60a5fa` / `#ffffff`           |
| `accent`                             | alias accent                      | `#34d399`                       |
| `muted` / `muted-foreground`         | secondary text                    | `#6b7280` / `#9ca3af`           |
| `border`, `input`, `ring`            | lines, fields, focus              | `#3f4655`, `#252d38`, `#34d399` |
| `--radius`                           | corner radius (`rounded-lg` = it) | `0.5rem`                        |

How it works: `:root` and `.dark` in `app/globals.css` define the variables, `@theme inline` exposes them to Tailwind, and `app/layout.tsx` injects the owner's `theme_content` overrides (`themeToCssVars`, validated by `sanitizeTheme`: hex colors and a safe radius only). The `<html>` element is always `class="dark"`; the light tokens exist but dark is the product's face.

Use opacity modifiers for depth (`border-border/30`, `bg-primary/10`) instead of new colors. The kits use a closed accent palette (`KITS_COLOR_MAP` in `lib/kits-registry.tsx`: primary, emerald, blue, amber, red, purple, cyan, pink) because each maps to fixed classes.

## 4. Typography

- **No web fonts are loaded.** Text uses Tailwind's system stacks (`font-sans` for body, `font-mono` for terminal-style labels, headings in prompts, numbers and code). Do not add a font download for decoration.
- Page-level headings use `.section-title` (`text-4xl → 6xl`, bold, tight, balanced); supporting copy uses `.section-subtitle` (`text-muted-foreground`, relaxed leading, `max-w-3xl`). Terminal headings are `text-xl md:text-2xl font-mono font-bold tracking-tight`.
- Long-form Markdown (notes, articles) renders inside `.prose`, with a link allow-list on render.

## 5. Layout and spacing

- Mobile first. Breakpoints used: `sm`, `md`, `lg`. Layouts that work at 360 px wide first, then widen.
- Sections: `<section id="…" className="section-spacing relative overflow-hidden">` containing `max-w-6xl mx-auto relative z-10 space-y-12`. `section-spacing` = `py-8 sm:py-12 lg:py-16 px-4 sm:px-8 lg:px-12`.
- Grids: `grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8`.
- The header is `.header-bar` (sticky, `bg-background/80 backdrop-blur-md`, `border-border/50`). Keep a single `backdrop-blur` surface in the page chrome; blur is expensive.
- Anchors: each section has a stable `id` so the header's scroll spy and deep links work.

Shared classes defined in `app/globals.css` (reuse before inventing): `.section-spacing`, `.section-title`, `.section-subtitle`, `.divider`, `.header-bar`, `.nav-link`, `.social-link-pill`, `.fire-button`, `.liquid-button`, `.tech-chip`, `.prose`, and the animation helpers `.animate-fade-in-up`, `.animate-slide-down`, `.animate-glow-pulse`, `.animate-float-up`, `.animate-scan-y`, `.animate-bar-fill`, `.route-progress-bar`.

## 6. Motion rules

| Do                                                                                           | Don't                                                                                  |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Animate `transform` and `opacity`                                                            | Animate `width`, `height`, `top/left`, `box-shadow`, `border-radius` or colors on loop |
| Entrance: `.animate-fade-in-up`, staggered with `style={{ animationDelay: `${i * 100}ms` }}` | Chain long delays that make content wait to appear                                     |
| Run effects once (typing, text scramble) and then stop                                       | Run `requestAnimationFrame` or `setInterval` while nothing changes                     |
| Start interactive effects only on interaction (canvas draws only while the pointer moves)    | Draw a background canvas continuously                                                  |
| Disable decoration on touch devices, in the admin and under reduced motion                   | Add a loop without checking `prefers-reduced-motion`                                   |
| Clocks tick only while visible and on the minute boundary where seconds do not matter        | Tick every second in a hidden popover                                                  |

`app/globals.css` ends with a **global** `prefers-reduced-motion: reduce` rule that collapses all animation and transition durations; do not undo it. Prefer a small, one-shot entrance over an ambient loop. If you must loop something, justify it in a comment and keep it to `transform`/`opacity`.

## 7. Loading and feedback

- **Route loading** is `app/loading.tsx`: a 2 px bar along the top edge (`.route-progress-bar`, a server component, CSS only, `pointer-events-none`). **Never** add a full-screen overlay, a fake percentage, an intro splash, a countdown, or any element that covers the header or navigation while content loads.
- Prefer rendering the real content on the server so there is nothing to load. Where something truly async remains (a client fetch in a kit), show a small inline spinner or skeleton in place, not a page-wide blocker.
- Saving in the admin gives immediate toast feedback (`sonner`, top-center, 3 s), a disabled button while pending, and an unsaved-changes warning (`hooks/use-unsaved-warning.ts`) when leaving a dirty form.
- Errors are specific for editors ("The password must be at least 12 characters") and deliberately **generic** for authentication ("Invalid code or password.") so they do not leak which factor failed.

## 8. Interaction patterns

**Public site**

- Header: brand/avatar, nav links hidden for sections that are off (`toNavToggles`), scroll-spy highlight (passive scroll listener, `requestAnimationFrame`-throttled), a small uptime/clock badge whose popover only ticks while open.
- Hero: typed phrases run once; the avatar is the LCP image, so it is given its real URL in the HTML (not the `/api/avatar` redirect).
- Floating contact: a launcher with a quick-links popup; items come from the CMS (`floating_contact`), icons resolved on the server.
- Contact form: plain hand-written validation (no schema library in the browser), time-on-page and scroll depth sent along as context for the email (disclosed in PRIVACY.md), and a graceful "not configured" state.
- Tech stacks: a duplicated-row CSS marquee that pauses under reduced motion.

**Admin**

- Shell: fixed sidebar (collapses to a top bar on mobile) with groups Content / Customize / Media / System, a command palette, a live session countdown that turns red in the last 3 minutes, and a button to extend the session. Expiry redirects to sign-in with the router, not a full reload overlay.
- Editors: one page per content type. List-like content uses `CollectionEditor` (add, edit, delete, drag to reorder via dnd-kit, validate per item). Single-document content uses a form + one save.
- Admin look: **dark gray surfaces with an emerald accent**. Page `bg-gray-950 text-gray-100`; sidebar and panels `bg-gray-900 border-gray-800`; inputs `w-full px-4 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500`; primary buttons `bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg`; destructive actions in red; labels `text-sm font-medium text-gray-300/400`; code and keys in `font-mono`. The admin does **not** use the owner's theme tokens, so a bad color choice can never make the control panel unreadable.
- Secrets are write-only: the Security & Keys page shows "set / not set", never the value, and requires a fresh authenticator code to change anything.

## 9. Icons

Icons are `currentColor` SVGs sized with Tailwind (`w-4 h-4`, `w-5 h-5`). Social and tool icons come from `IconData` resolved on the server; always pass a fallback so an unknown name still shows a sensible glyph (the mail glyph for socials, the kit's own default for tools). Decorative icons get `aria-hidden`; icon-only links and buttons get an `aria-label` (the social links use their label).

## 10. Accessibility

- Semantic landmarks: one `<header>`, `<main>`, `<footer>`, sections with `id` and a heading.
- Every icon-only control has an accessible name. Images have meaningful `alt` (or empty for decoration).
- Focus is always visible (`focus-visible` rings use the `ring` token); never remove outlines without replacing them.
- Contrast: `text-muted-foreground` on `background` is the minimum for body copy; do not use `muted` (the darker gray) for text that must be read.
- Respect `prefers-reduced-motion` (global rule) and do not rely on color alone for state.
- Forms: visible labels tied to inputs, errors announced next to the field.

## 11. Voice and copy

- Plain, friendly, specific. Short sentences. No jargon in owner-facing admin copy ("Deliver messages to", not "RCPT TO").
- Placeholder copy is neutral and obviously replaceable ("Your Name", "Full-Stack Developer", `example.com`).
- Never invent claims, statistics, testimonials or certifications in defaults beyond clearly fake examples.
- Product name in UI text is `my-portfolio-op1` (or the owner's brand from Global Settings); never a real person's name.

## 12. Checklist before you ship a visible change

- [ ] Uses theme tokens, not hex or fixed palette colors (public site).
- [ ] Works at 360 px wide, and has no horizontal scroll.
- [ ] Content arrives in the server HTML; no loader blocks the page.
- [ ] Any animation is transform/opacity, stops when idle, and is covered by reduced-motion.
- [ ] No new client dependency for icons, schemas, fonts or analytics.
- [ ] Every new text is editable from the admin (or has a default in `lib/content-defaults.ts`).
- [ ] Icon-only controls have labels; focus is visible.
- [ ] Failure of data/integration shows a fallback, not an error.
