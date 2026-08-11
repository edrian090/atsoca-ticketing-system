# Atsoca Design System

A single reference for keeping every Atsoca surface — customer site, employee site, ticket form, and anything built after this — visually and structurally consistent. Copy the tokens and component patterns below rather than re-deriving them per page.

---

## 1. Brand Personality

Atsoca's vibe is **calm competence** — a system you trust to route something important correctly, without being cold or bureaucratic about it. Think: enterprise SaaS confidence (Linear, Stripe) crossed with a helpful front-desk warmth.

- **Confident, not loud.** No gradients-on-everything, no excessive motion. One signature interaction per page (the routing visual) carries the "hype."
- **Precise, not clinical.** Monospace accents (`IBM Plex Mono`) signal "this is a system," not a form.
- **Warm navy, not corporate gray.** The palette leans into a deep navy/signal-blue range rather than neutral gray-on-white, which is what gives it personality.

---

## 2. Color Tokens

Use this **exact** `:root` block on every page. Do not redefine `--paper` or omit `--err`/`--ok` per file — that's the #1 drift risk (see Section 8).

```css
:root{
  --ink:#1A2F43;       /* body text */
  --navy:#002355;      /* headings, deep backgrounds */
  --signal:#0050AD;    /* primary actions, links, focus */
  --steel:#457DB3;     /* secondary text accents, icons */
  --sky:#8BB1D1;       /* borders on tinted surfaces, dots */
  --sky-tint:#EAF1F7;  /* tinted backgrounds, hint boxes */
  --paper:#FBFCFE;     /* page background */
  --line:#DCE6EE;      /* borders, dividers */
  --white:#FFFFFF;     /* cards */
  --ok:#2FA86A;         /* success states, live indicators */
  --err:#C0453E;        /* required-field marks, error states */
  --warn:#C98A2B;       /* reserved: warning states */
}
```

**Muted text grays** (not tokenized yet, used inline — should be promoted to variables):
- `#4A5B6E` — hero/page subheads
- `#5A6B7C` — body copy, descriptions
- `#6B7B8C` — labels, eyebrows, stat labels
- `#8CA0B3` / `#9AAABB` — placeholder text, fine print

Recommendation: fold these into the token block as `--text-secondary`, `--text-muted`, `--text-faint` so every page pulls from the same three tiers instead of picking a nearby hex from memory.

---

## 3. Typography

| Role | Font | Notes |
|---|---|---|
| Headings (h1–h3) | `Space Grotesk` (600–700) | Always `color:var(--navy)` unless on a dark band, then `#fff` |
| Body / UI text | `Inter` (400–600) | Default body font |
| System / mono accents | `IBM Plex Mono` (400–500) | Eyebrows, tags, ticket IDs, status strings, category tags |

Google Fonts import (identical across all pages):
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**Scale** (desktop):
- Hero H1: `38–46px` / weight 700 / letter-spacing `-0.01em`
- Section H2: `28–32px` / weight 700
- Card H3: `15.5–19px` / weight 600–700
- Body: `14–17px`
- Micro (labels, eyebrows, mono tags): `11–13px`, uppercase, letter-spacing `.04–.06em`

---

## 4. Spacing & Layout

- **Content container:** `.wrap { max-width:1180px; margin:0 auto; padding:0 32px; }`
  ⚠️ `submit-ticket.html` uses `max-width:1080px` for its wrap/nav — this should be unified to `1180px` unless the narrower form layout is an intentional exception (see Section 8).
- **Section rhythm:** `.section { padding: 88–96px 0; }` — keep vertical rhythm consistent; don't let one page compress to 64px and another stretch to 120px.
- **Cards:** `border-radius: 14–16px`, `border:1px solid var(--line)`, elevated with a soft navy-tinted shadow:
  `box-shadow: 0 20px 44px -24px rgba(0,35,85,0.18–0.22);`
- **Grid pattern:** hero sections use a `1.05fr / 0.95fr` (or `1.1fr/0.9fr`) two-column split, collapsing to one column under `900px`.

---

## 5. Core Components

### Buttons
```css
.btn{display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:14.5px;
  padding:10px 20px;border-radius:8–9px;border:1px solid transparent;cursor:pointer;
  transition:transform .12s ease, background .12s ease;}
.btn-primary{background:var(--signal);color:#fff;box-shadow:0 1px 2px rgba(0,35,85,0.15);}
.btn-primary:hover{background:var(--navy);transform:translateY(-1px);}
.btn-ghost / .btn-line{background:transparent;color:var(--navy);border-color:var(--line);}
.btn-ghost:hover{border-color:var(--steel);background:var(--sky-tint);}
```
Rule: primary CTA is always signal-blue → navy on hover, always lifts `-1px` on hover. Never introduce a third button treatment without adding it here first.

### Eyebrow tag
Small uppercase mono pill used at the top of every hero/header:
```css
.eyebrow{font-family:'IBM Plex Mono';font-size:12–12.5px;letter-spacing:.06em;
  color:var(--signal);background:var(--sky-tint);border:1px solid var(--sky);
  padding:6px 12px;border-radius:20px;text-transform:uppercase;}
```
Always paired with a small pulsing/static dot (`.eyebrow-dot`, 6px circle, `background:var(--signal)`).

### Cards (generic content card)
```css
background:var(--white);border:1px solid var(--line);border-radius:14–16px;
padding:22–36px;
```
Hover-lift on interactive cards only (dept cards, quick-list items): `translateY(-3px)` + shadow.

### Routing / status hint
The signature "this will be routed to X" pattern — used in the hero routing visual (customer) and inline under the category dropdown (submit-ticket). Same visual language both places:
```css
background:var(--sky-tint);border:1px solid var(--sky);border-radius:8–10px;
padding:10–14px;font-size:13–14.5px;color:var(--navy);
```
with a small `.dot`/`.dept-ico` (6–8px, `var(--signal)` when active).

### Form fields
```css
input,select,textarea{
  font-family:'Inter';font-size:14–14.5px;color:var(--ink);
  background:var(--paper);border:1px solid var(--line);border-radius:9px;
  padding:11–12px 13–14px;
}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--signal);background:var(--white);}
```
Required marker: `label .req{color:var(--err);}`. Optional marker: `label .opt{color:#8CA0B3;font-weight:400;font-size:12px;}`

### Dropzone (file upload)
Dashed sky border, tint background, solid signal on hover/dragover — established in `submit-ticket.html`, reuse verbatim if any other page needs file upload.

### Nav / Topbar
- **Customer:** light sticky nav, blurred, `rgba(251,252,254,0.92)` + `backdrop-filter:blur(8px)`.
- **Employee:** solid navy topbar (`.topbar`), not sticky, with an "Employee" mono badge next to the logo.
This dark-vs-light nav split is an **intentional differentiator** between the two domains — keep it, don't merge them. It's the fastest visual cue for "which site am I on."

### Footer
- Customer: 4-column footer grid (brand blurb + 3 link columns) on dark ink background.
- Employee: single-row footer, no columns.
This asymmetry is fine (employee site is leaner/internal) but both must keep `background:var(--ink); color:#9FB3C6;` as the shared footer base.

### Logo mark
`30x30` (customer) / `28x28` (employee) rounded-square gradient `135deg, var(--signal), var(--steel)` (or inverted `var(--sky),var(--steel)` on dark topbar), bold white "A", `border-radius:7–8px`. Keep the gradient direction and letter consistent — only the size may flex slightly by density of the surrounding nav.

---

## 6. Motion

Keep motion minimal and purposeful — this is a trust product, not a playground:
- Button hover: `translateY(-1px)`, 120ms
- Card hover: `translateY(-3px)` + shadow, 150ms
- Live/pulse indicator: `opacity 1↔0.35`, 1.8s loop — reserved for **actual "live" states only** (routing preview, live-queue dot), never decorative
- Route-hint reveal: `opacity` + `max-height` transition, 200ms — this is the only "reveal" animation pattern; reuse it for any future progressive-disclosure UI rather than inventing a new one

---

## 7. Tone of Voice (UX copy)

- Eyebrows/labels: short, mono, uppercase, declarative ("Internal ticketing", "New ticket")
- H1s: plain-spoken, second person, confidence without hype-speak ("Tell us what's wrong. We'll get it to the right team.")
- Microcopy near forms: reassuring and specific, not legalese ("Only needed if you manage tickets for a department. Everyone else can submit above without an account.")
- Numbers everywhere: always concrete, never vague ("4 min", "96%", "~4 hours") — this is part of the "confidence" the project asked for. Every page should carry at least one hard stat.

---

## 8. Known Inconsistencies To Reconcile

These crept in across the three files and should be fixed to keep the system actually consistent:

1. **`--paper` mismatch:** `customer.html` / `submit-ticket.html` use `#FBFCFE`; `employee.html` uses `#F5F8FB`. Pick one (recommend `#FBFCFE`) and apply everywhere.
2. **Missing tokens in `employee.html`:** no `--err` variable defined (customer/submit-ticket both have it). Add it even if unused yet, so the token set stays identical across files.
3. **`.wrap` max-width mismatch:** `1180px` (customer, employee) vs `1080px` (submit-ticket). Decide if the form's narrower measure is intentional (tighter reading width for a form) — if so, document it as an approved exception rather than an accident; otherwise unify to `1180px`.
4. **Department taxonomy mismatch — this is the biggest one:**
   - **Employee site** (canonical, per your instruction): Operations, Sales, Marketing, Business Development, Tech, Finance, HR (7 total).
   - **Customer homepage** `depts-grid` still shows the old 5: IT Support, Billing, Accounts, Facilities, General.
   - **`submit-ticket.html`** category dropdown/side panel uses a *third*, different set: Billing/Payment, Logistics/Delivery, Promotions/Inquiries, Employment/HR, Technical/App Issues, Sales/Product Inquiry, Partnership/Business Inquiry — routed to yet another label set (Billing, Logistics, Marketing, HR, IT Support, Sales, Business Development).

   These three don't line up. Worth deciding: is `submit-ticket.html` customer-facing concern *types* that map onto internal departments (reasonable to differ in labeling), or should the customer-facing department language match the homepage's 5, and should the homepage's 5 be retired in favor of the real 7? This needs a decision before the next visual pass, otherwise the "routing" promise looks inconsistent to anyone who clicks between customer homepage → ticket form → (eventually) employee side.
5. **No internal ticket form yet** — when built, it should inherit the `submit-ticket.html` form-card/dropzone/route-hint patterns exactly, just re-skinned with the 7 real departments and employee-appropriate copy.

---

## 9. Open Design Decisions (for next session)

- Should the customer-facing "5 departments" grid be replaced with the real 7, or kept deliberately simpler for external users (with the 7 being an internal-only breakdown)?
- Do we want a shared `styles.css` / `tokens.css` file included via `<link>` across all pages instead of duplicating the `:root` block per file? Strongly recommended once a 4th page (internal ticket form) is added — prevents drift like the ones in Section 8.
- Signed-in department queue view: not yet designed. Should reuse card/table patterns from the employee department directory table.
