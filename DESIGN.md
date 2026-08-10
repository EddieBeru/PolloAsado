---
name: PolloAsado
description: A warm, lamplit personal finance tracker where the amount is always the brightest thing on screen.
colors:
  low-light: "oklch(0.19 0.014 45)"
  lamp-surface: "oklch(0.245 0.016 45)"
  lit-edge: "oklch(0.3 0.018 45)"
  bone: "oklch(0.95 0.008 45)"
  bone-dim: "oklch(0.76 0.014 45)"
  bone-faint: "oklch(0.668 0.014 45)"
  hairline: "oklch(0.34 0.018 45)"
  hairline-strong: "oklch(0.525 0.022 45)"
  clear-green: "oklch(0.8 0.125 158)"
  clear-green-soft: "color-mix(in oklab, oklch(0.8 0.125 158) 14%, oklch(0.245 0.016 45))"
  clear-green-line: "color-mix(in oklab, oklch(0.8 0.125 158) 32%, oklch(0.245 0.016 45))"
  warm-alarm: "oklch(0.715 0.145 25)"
  warm-alarm-soft: "color-mix(in oklab, oklch(0.715 0.145 25) 14%, oklch(0.245 0.016 45))"
  warm-alarm-line: "color-mix(in oklab, oklch(0.715 0.145 25) 32%, oklch(0.245 0.016 45))"
  held-amber: "oklch(0.795 0.13 68)"
  held-amber-soft: "color-mix(in oklab, oklch(0.795 0.13 68) 14%, oklch(0.245 0.016 45))"
  held-amber-line: "color-mix(in oklab, oklch(0.795 0.13 68) 32%, oklch(0.245 0.016 45))"
  lamp-arena: "oklch(0.79 0.042 62)"
  lamp-emerald: "oklch(0.8 0.125 160)"
  lamp-sky: "oklch(0.79 0.098 232)"
  lamp-amber: "oklch(0.825 0.13 88)"
  lamp-rose: "oklch(0.755 0.14 356)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "normal"
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 380
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "normal"
  amount:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  full: "9999px"
spacing:
  2xs: "0.25rem"
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.25rem"
  xl: "1.5rem"
  2xl: "2rem"
components:
  card:
    backgroundColor: "{colors.lamp-surface}"
    textColor: "{colors.bone}"
    rounded: "{rounded.lg}"
    padding: "1.25rem"
  well:
    backgroundColor: "{colors.lit-edge}"
    textColor: "{colors.bone}"
    rounded: "{rounded.md}"
    padding: "1rem"
  button-primary:
    backgroundColor: "{colors.lamp-arena}"
    textColor: "{colors.low-light}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 1.5rem"
  button-secondary:
    backgroundColor: "{colors.lamp-surface}"
    textColor: "{colors.bone}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 1.5rem"
  button-danger:
    backgroundColor: "{colors.warm-alarm-soft}"
    textColor: "{colors.warm-alarm}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 1.5rem"
  button-danger-hover:
    backgroundColor: "{colors.warm-alarm}"
    textColor: "{colors.low-light}"
  button-icon:
    backgroundColor: "{colors.lamp-surface}"
    textColor: "{colors.bone-dim}"
    rounded: "{rounded.full}"
    padding: "0.625rem"
  input:
    backgroundColor: "{colors.low-light}"
    textColor: "{colors.bone}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
  notice-positive:
    backgroundColor: "{colors.clear-green-soft}"
    textColor: "{colors.clear-green}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "1rem"
  notice-negative:
    backgroundColor: "{colors.warm-alarm-soft}"
    textColor: "{colors.warm-alarm}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "1rem"
  notice-warning:
    backgroundColor: "{colors.held-amber-soft}"
    textColor: "{colors.held-amber}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "1rem"
  tag-warning:
    backgroundColor: "{colors.held-amber-soft}"
    textColor: "{colors.held-amber}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.625rem"
---

# Design System: PolloAsado

## 1. Overview

**Creative North Star: "The Evening Desk"**

One warm lamp in a dark room. Every surface in this interface sits somewhere in that light: the page is the unlit desk, a card is the paper under the lamp, a nested breakdown is the sheet on top of the stack. Surfaces get lighter as they get closer to the reader, and nothing is ever brighter than the light source itself. The accent color *is* the lamp — one hue, chosen once by the user, used sparingly and always for the same purpose.

The whole shell is tinted clay (hue 45) rather than neutral gray. That single decision is where the warmth lives. PRODUCT.md is explicit that *"warmth comes from space and words, not decoration"*, so there is no gradient, no glow, no illustration, and no texture anywhere in this system. What makes it feel like a notebook instead of a bank is the temperature of the neutrals, the roominess of the spacing, and the plainness of the Spanish copy.

This system rejects the bank. No navy-and-gold trust theater, no enterprise dashboard chrome, no hero-metric block with a gradient behind the balance. It equally rejects the spreadsheet: line-item breakdowns are the product's reason to exist, so depth has to stay readable rather than collapsing into an undifferentiated grid. The interface is quiet so that one thing can be loud — the amount.

**Key Characteristics:**
- Warm charcoal shell, hue 45, dark-only. There is no light theme.
- A three-step lightness ramp carries all depth; resting surfaces cast no shadow.
- Five user-selectable accents, all at the same lightness band, all interchangeable without breaking a single contrast ratio.
- Three fixed semantic colors for money in, money out, and pending. They never mean anything else.
- Every monetary amount is monospaced. This is the system's signature.
- Soft-edged and unhurried: 0.75–1rem radii, roomy padding, hairline borders, no visual pressure.

## 2. Colors: The Lamplight Palette

A clay-tinted charcoal room lit by one warm lamp, with three signal colors reserved exclusively for money.

### Primary

The accent is user-selected and stored per profile (`perfiles.preferencias.tema`). All five sit in the L 0.755–0.825 band, which is what lets them be swapped freely: each one clears 4.5:1 as text on all three surfaces *and* carries Low Light text at 4.5:1+ when used as a filled button.

- **Arena** (`oklch(0.79 0.042 62)`, default): a warm near-neutral. The quietest accent and the reason it is the default — it reads as part of the room rather than as a highlight.
- **Emerald** (`oklch(0.8 0.125 160)`): shifted to hue 160 so it stays distinguishable from Clear Green at 158 when both appear on the same screen.
- **Sky** (`oklch(0.79 0.098 232)`): the only cool accent; the one escape from the warm shell.
- **Amber** (`oklch(0.825 0.13 88)`): the literal lamp reading. Warmest and brightest of the five.
- **Rose** (`oklch(0.755 0.14 356)`): deliberately parked at hue 356, not 15, so a rose-themed heading is never mistaken for an expense amount.

Accent appears on: primary buttons, headings (`.heading`), focus rings, the active nav item, the highlighted card border, text selection, and the scrollbar thumb on hover. Nowhere else.

### Secondary

The money signals. Fixed meaning app-wide, never decorative, never reassigned.

- **Clear Green** (`oklch(0.8 0.125 158)`): money in. Income amounts, confirmed states, completed savings targets.
- **Warm Alarm** (`oklch(0.715 0.145 25)`): money out. Expense amounts, destructive actions, deletion confirmations.
- **Held Amber** (`oklch(0.795 0.13 68)`): pending or unresolved. Uncommitted entries, over-budget warnings, anything waiting on the user.

Each carries two derived variants, both mixed against Lamp Surface in oklab: a **-soft** fill at 14% and a **-line** border at 32%. The soft fill is dark enough that the pure color still reads on top of it at AA.

### Neutral

The room, from unlit to lamplit. Every step is hue 45, and chroma climbs with lightness so the warmth stays perceptible rather than washing out.

- **Low Light** (`oklch(0.19 0.014 45)`): the page itself, and the fill inside inputs — a field is a recess, not a raised object. Also the text color on any filled accent button.
- **Lamp Surface** (`oklch(0.245 0.016 45)`): cards, panels, the primary content plane.
- **Lit Edge** (`oklch(0.3 0.018 45)`): nested detail. Wells holding desglose line items sit here, which is how a breakdown reads as *inside* its card rather than as another card.
- **Bone** (`oklch(0.95 0.008 45)`): primary text. 15.9:1 on Low Light.
- **Bone Dim** (`oklch(0.76 0.014 45)`): secondary text, labels, supporting copy. 8.6:1 on Low Light.
- **Bone Faint** (`oklch(0.668 0.014 45)`): the quietest legible ink — timestamps, placeholders, disabled captions. Its 4.52:1 against Lit Edge is the tightest pair in the entire system, which is exactly why it sits at 0.668 and not lower.
- **Hairline** (`oklch(0.34 0.018 45)`): decorative separation. Card and well borders, usually at 50–60% opacity.
- **Hairline Strong** (`oklch(0.525 0.022 45)`): interactive edges. Input, select, and secondary-button borders. Tuned to land exactly on 3.00:1 against Lamp Surface.

### Named Rules

**The One Lamp Rule.** One accent is active at a time, chosen by the user, applied identically everywhere. Never introduce a second accent for variety, never tint one screen differently, never hardcode a Tailwind palette color (`text-emerald-400`, `bg-rose-950/20`) in a component. Every color passes through a token. There are currently zero hardcoded palette colors in the codebase; keep it that way.

**The Never-Alone Rule.** Semantic color is never the only signal. An expense is red *and* carries a minus sign *and* sits under a labeled section. A pending state is amber *and* says "Pendiente". Strip the color out and the screen must still be readable.

**The Cold Room Rule.** Neutrals are hue 45. Not gray, not zinc, not slate. A neutral that reads cold has broken the system, and it will be visible the moment it sits next to a correct one.

## 3. Typography

**Display Font:** none. There is one family.
**Body Font:** `ui-sans-serif, system-ui, sans-serif` (with the Apple/Segoe emoji fallbacks appended).
**Label/Mono Font:** the platform monospace stack, used exclusively for amounts and codes.

**Character:** The system UI sans, unmodified and unbranded, doing all the talking — headings, buttons, labels, body, data. It disappears, which is the point; a display face here would be the interface asking for attention it hasn't earned. Body weight is set to **380**, a deliberate step below regular: light-on-dark text renders optically heavier, and 400 reads as slightly bold in this palette.

The scale is a fixed rem ladder, never fluid. This is a product surface viewed at consistent DPI on two devices; a clamp-scaled heading that shrinks inside a narrow panel looks worse, not better.

### Hierarchy

- **Display** (700, 1.875rem / `text-3xl`, 1.15): reserved for the single headline balance figure. Rare — two occurrences in the entire app, and that scarcity is what makes it read as the answer to "where does the money stand".
- **Headline** (700, 1.25rem → 1.5rem at `md`, 1.25): the `.heading` class. Section titles, rendered in the active accent. The one place accent and type meet.
- **Title** (600, 1.125rem / `text-lg`, 1.4): card titles, list-group headers, form section labels.
- **Body** (380, 0.875rem / `text-sm`, 1.5): the dominant size by a wide margin — most UI text, list rows, and form copy live here. Prose blocks cap at 65–75ch; data rows may run denser.
- **Label** (500, 0.75rem / `text-xs`, 1.35): metadata, timestamps, category tags, helper text. Always in Bone Dim or Bone Faint.
- **Amount** (700, mono, size varies with context, 1.1): every monetary figure.

### Named Rules

**The Mono Money Rule.** Every amount is monospaced, without exception — a balance, a line item in a desglose, a savings target, a debt remainder. Tabular figures make columns of numbers scan vertically and stop digits from shifting as values update. A proportional amount anywhere in this app is a bug.

**The No-Eyebrow Rule.** No tiny uppercase tracked kickers above sections. No `01 / 02 / 03` section numbering. Hierarchy comes from size, weight, and the accent on headings. Uppercase appears nowhere in this system except inside user data.

**The Quiet Weight Rule.** Body text is 380, not 400. If text on this palette looks slightly heavy, the weight is wrong before the color is.

## 4. Elevation

This system carries depth with tonal layering, not shadow. Three surface steps — Low Light (the page) → Lamp Surface (cards, panels) → Lit Edge (nested detail) — establish everything the reader needs about what sits on top of what. Each step is a real lightness jump in a dark, warm room, which is more convincing than a shadow at these values: dark-on-dark shadows either vanish or look like smudges. `.card` shipped with `shadow-md` and had it removed for exactly that reason; the border and the lightness step do the job cleanly.

Shadow survives in one narrow role: marking things that genuinely leave the page plane.

### Shadow Vocabulary

- **Floating** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.35), 0 4px 6px -4px rgb(0 0 0 / 0.35)` — Tailwind `shadow-lg` over the dark shell): the active navigation item, modals, toasts, dropdowns. Anything that overlays content it does not scroll with.
- Nothing else. There is no ambient shadow, no resting elevation, no hover-lift.

### Named Rules

**The Three-Step Rule.** Depth is lightness for everything that sits in the page: Low Light → Lamp Surface → Lit Edge. A fourth step does not exist. If a layout seems to need one, the layout is wrong — most often it's a card nested inside a card, which is always an error. Use a `.well` on Lit Edge instead.

**The Floating Exception.** Shadow marks only what leaves the page plane: active nav, modal, toast, dropdown. If it scrolls with the content, it gets no shadow. Cards, wells, inputs, notices, and tags are flat, permanently.

**The Audit Test.** Screenshot any screen and desaturate it. If you can still tell which surface is on top, the ramp is doing its job. If you can't, you reached for a shadow instead of a lightness step.

## 5. Components

Soft-edged and unhurried. Generous radii, roomy padding, quiet borders, no visual pressure — every component is a frame around an amount, and nothing in the frame competes with what's inside it. Radii come in exactly three sizes plus full-round; there are no sharp corners anywhere in this system.

### Buttons

- **Shape:** softly rounded (1rem / `rounded-2xl`) for all rectangular buttons; fully round (9999px) for icon buttons.
- **Primary:** filled with the active accent, text in Low Light, 0.75rem × 1.5rem padding, bold. Hover drops to 90% opacity — never a color change, since the accent is user-owned.
- **Secondary:** Lamp Surface fill, Bone text, Hairline Strong border. Hover shifts the border to the accent. The fill never changes.
- **Danger:** Warm Alarm at 14% fill with a 32% border and Warm Alarm text — destructive actions read as destructive *before* they're clicked. Hover inverts to a solid Warm Alarm fill with Low Light text.
- **Icon:** 0.625rem padding, fully round, translucent Lamp Surface fill, Hairline Strong border, Bone Dim glyph. Hover moves glyph and border to the accent and drops the fill to Low Light.
- **Press:** every button scales to 95% on `:active`. This is the only motion in the button vocabulary.
- **Focus:** a 2px accent outline at 2px offset, on every button, link, and tabbable element. Never removed.

### Cards / Containers

- **Corner Style:** 1rem (`rounded-2xl`).
- **Background:** Lamp Surface.
- **Shadow Strategy:** none. See the Three-Step Rule.
- **Border:** a single Hairline at 60% opacity, all four sides. Never a colored side stripe — a `border-left` accent bar is prohibited outright.
- **Internal Padding:** 1.25rem on mobile, 1.5rem at `md`, 2rem at `lg`. This growth is the desktop review surface doing its job — more air, not more content.
- **Highlight variant:** accent border at 70% plus a 12% accent fill. Used to mark one card as the current focus, at most one per screen.

### Wells (signature)

The `.well` exists because desglose is the product's reason to exist. Line-item breakdowns sit on Lit Edge with a 0.75rem radius, a 50%-opacity hairline, and 1rem padding — visibly nested inside their card without becoming a second card. **A card inside a card is always wrong; a well inside a card is the correct answer.** This is the component that keeps "detail without density collapse" honest.

### Inputs / Fields

- **Style:** Low Light fill (recessed, not raised), Hairline Strong border, 0.75rem radius, 0.75rem × 1rem padding, body-size text.
- **Focus:** border and a 1px ring both flip to the active accent; the default outline is suppressed in favor of that treatment.
- **Placeholder:** Bone Faint — legible, at 4.5:1, not the washed-out gray default.
- **Select:** native chrome removed, replaced with an inline chevron SVG stroked in Bone Faint at 1rem, right-aligned with 2.25rem of clearance. Focus holds the Hairline Strong border rather than the accent, since the open dropdown already signals state.

### Notices

Inline feedback in three flavors — positive, negative, warning — each a soft 14% tint with a full 32% border and matching text at 0.75rem radius, 1rem padding. **Full borders on all four sides, never a side stripe.**

### Tags

`.tag-warning` is a small pill: fully round, monospace label text, soft amber tint with its line border, 0.25rem × 0.625rem padding. Used for inline status on an amount ("Pendiente").

### Navigation

Tab-based. The active item takes the accent and the one legal shadow in the system; inactive items are Bone Dim with no fill. Mobile collapses to a bottom bar sized for one-handed reach — capture is judged on speed, and a target the thumb misses is a failed capture.

### Motion

Transitions run 150–250ms, easing out. Motion conveys state only: press feedback, hover, focus, disclosure. No page-load choreography, no scroll-triggered reveals, no decorative animation. `prefers-reduced-motion: reduce` collapses everything to 0.01ms globally.

## 6. Do's and Don'ts

### Do:
- **Do** route every color through a token. `bg-surface-app`, `text-negative`, `border-border-strong` — never `bg-zinc-800` or `text-rose-400`.
- **Do** monospace every monetary amount, everywhere, including inside breakdowns.
- **Do** use `.well` on Lit Edge for nested desglose detail instead of nesting a card.
- **Do** pair semantic color with a sign, label, or icon. Color is never the only carrier of meaning.
- **Do** keep body text at weight 380 and let size and color carry hierarchy.
- **Do** give every interactive element a visible focus state: 2px accent outline, 2px offset.
- **Do** keep all five accents interchangeable. If a screen only works in Arena, the screen is broken.
- **Do** write UI copy in Spanish, concise and utility-focused. Code, comments, and filenames stay English.
- **Do** hold the contrast floors: 4.5:1 for body text, 3:1 for interactive borders. Bone Faint on Lit Edge is already at 4.52:1 — there is no headroom left to spend.

### Don't:
- **Don't** use gradients, glowing highlights, or neon effects. Flat color is mandatory, carried over from the project skill file.
- **Don't** build **bank and fintech corporate**: no navy-and-gold trust theater, no stock photography, no enterprise dashboard chrome.
- **Don't** build a **spreadsheet dump**: walls of undifferentiated rows with no hierarchy. The breakdowns are the point, so they stay readable rather than becoming a grid.
- **Don't** build a **generic AI SaaS template**: identical card grids, uppercase tracked eyebrows above every section, hero-metric blocks.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards, list items, or notices. Full borders or none.
- **Don't** put a shadow on a resting surface. If it scrolls with the content, it is flat.
- **Don't** nest a card inside a card. Ever.
- **Don't** introduce a light theme, a fourth surface step, or a second accent color.
- **Don't** reassign a semantic color. Green is money in, red is money out, amber is pending — in every screen, forever.
- **Don't** use cheerful nagging, robotic filler, or labels that explain the obvious. PRODUCT.md is explicit: **honest over reassuring**.
- **Don't** reach for a modal first. Exhaust inline and progressive alternatives before overlaying the task.
- **Don't** ship a component with only a default state. Hover, focus, active, disabled, loading, and error are part of the component, not a follow-up.
