---
target: dashboard
total_score: 14
p0_count: 2
p1_count: 3
timestamp: 2026-08-09T04-32-21Z
slug: frontend-src-components-dashboard-jsx
---
Method: dual-agent (A: a78d1f84c4fd5eabc · B: a9299e8f9e915fb35)

Target: `frontend/src/components/Dashboard.jsx` + `frontend/src/components/Dashboard/CurrentBalance.jsx`
Register: product · Platform: web

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | `useBalance.js:34-35` sets `stale` on every cache hit including online loads, then labels it "sin conexión". The badge lies. No last-updated time, no loading/stale/offline/failed distinction. |
| 2 | Match System / Real World | 2 | "Cuenta" (singular) labels an aggregate net balance. Currency renders as bare ISO `CRC`, not `₡`. No thousands separator. "como" should be "cómo" (`Dashboard.jsx:38`). |
| 3 | User Control and Freedom | 1 | Zero interactive elements on the surface. `refresh` is exported by `useBalance:59` and never surfaced — the stale state is a dead end. |
| 4 | Consistency and Standards | 2 | Hand-rolled pill at `CurrentBalance.jsx:20` instead of `.tag-warning` (index.css:201), missing the mandated border, at off-ramp `text-[10px]`. `font-bold` (700) where the Title token is 600. Heading outline runs h2 → h1 → h3. |
| 5 | Error Prevention | 1 | `useBalance.js:44-46` swallows the RPC error; `balance` falls back to `?? 0`; that 0 renders as confident green. The design conceals failure. |
| 6 | Recognition Rather Than Recall | 2 | `fetchBalance` returns `totalIngresos` / `totalGastos`; `Dashboard.jsx:12` destructures only `balance` and discards them. User supplies all context from memory. |
| 7 | Flexibility and Efficiency | 0 | No shortcuts, no quick-add, no date range, no drill-in, no keyboard path. No `keydown` handler anywhere in the app. |
| 8 | Aesthetic and Minimalist Design | 2 | Minimal, but the wrong survivors: greeting > paragraph > card title > **balance**, descending visual weight. |
| 9 | Error Recovery | 0 | No error state exists anywhere in the chain. |
| 10 | Help and Documentation | 2 | The tagline is an orientation attempt — misdirected, but present. |
| **Total** | | **14/40** | **Poor — major UX overhaul required** |

## Anti-Patterns Verdict

**Does this look AI-generated? Yes — but not the way you'd expect.**

**LLM assessment:** This is not over-decorated slop. It's *unfinished-scaffold* slop. Someone would say "this was generated and never finished," not "an AI over-designed this."

The token layer clears every DON'T cleanly: zero gradients, zero glow, zero neon, no bank-fintech chrome, no eyebrows, no `01/02/03` numbering, no side-stripe borders, no card-inside-card (`Dashboard.jsx:42` wraps in a plain div), no shadow on `.card`, no second accent, no light theme. Money is monospaced. That discipline is real and it is why nearly every fix below is a class swap rather than a rebuild.

Three DON'Ts fail:
- **Semantic color reassigned** — `CurrentBalance.jsx:26` paints the balance green/red.
- **Cheerful filler / labels that explain the obvious** — `Dashboard.jsx:37-39`.
- **Component with only a default state** — no error state, no empty state, and the loading state is a placeholder.

The actual slop tells:
- `CurrentBalance.jsx:10` — `<h1>El contenido está cargando  :P</h1>`. Emoticon, double space, wrong heading level, shipped in a production path.
- `Dashboard.jsx:37-39` — an explanatory marketing paragraph inside an *authenticated* screen the user chose to open. It also promises deudas and ahorros, neither of which is on this surface.
- `Dashboard.jsx:41-45` — `lg:grid-cols-2` wrapped around exactly one child, itself inside a redundant `flex flex-col gap-8`. At `lg` the card is pinned to 50% width with a dead column beside it. The literal shape of a generated stub.
- `Dashboard.jsx:35` — the app greets you with your raw login email, in the accent heading, at the largest type on screen. `Layout.jsx:98` already has the `user_metadata?.nombre || user.email` fallback; Dashboard doesn't use it.

Earned-familiarity bar (Linear / Notion / Stripe): the **chrome passes, the content fails**. None of those products would open on an email address, a paragraph of explanation, and one uncontextualized number.

**Deterministic scan:** `detect.mjs` exit 2. **1 finding on the Dashboard target**, advisory: `design-system-font-size` at `CurrentBalance.jsx:20` — `text-[10px]` is below the 12px Label floor. `Dashboard.jsx` itself: **0 findings**.

Wider sweep of `frontend/src/components`: **8 findings, all the same antipattern**, all advisory. Dashboard's share is 1 of 8. Seven of the eight are the same `10px` value (IncomeForm:549, IncomeList:85/99, OutcomeList:85/99, Settings:112), which makes it a de-facto undocumented sub-label step used consistently — a DESIGN.md gap more than eight separate mistakes. `Layout.jsx:194` at 11px is the only unrepeated value. **Zero color, spacing, contrast, or slop-family findings fired on either run.**

Where the two assessments agree: the `text-[10px]` badge is the one thing both flagged independently. Where they diverge: the detector found essentially nothing, which is the point — this surface's problems are compositional and semantic, invisible to a rule engine. A clean scan here is not a clean bill of health.

No false positives. The detector reads the DESIGN.md ramp correctly (smallest documented step is 12px).

**Visual overlays:** none. No browser automation tool is exposed in this session, and no Playwright/Puppeteer exists in the project. Verified by tool-registry search and by checking `node_modules` on disk. The live server was never started, so nothing needed stopping. All evidence above is CLI + source only.

## Overall Impression

**The data layer is a month ahead of the UI.** `useBalance` + `lib/balance.js` implement a genuinely smart baseline-plus-pending-delta model that lets an offline phone entry hit the balance instantly without double-counting on sync. `lib/stats.js` already ships `fetchIncomeExpenseSeries`, `fetchTotalsByCategory`, and `fetchTopCategories` — all written, all called by nothing.

The UI consuming all that is one card, holding one number, at `text-xl`, under a heading containing your email address, in a two-column grid with one column empty.

PRODUCT.md's test for this surface is *"opening the app answers 'where does the money stand' without interpretation."* Today the answer is `1250000.00 CRC` in green — ungrouped, unsymbolized, with no time frame, no in/out split, and no way to tell a real zero from a failed fetch. That requires more interpretation than a bank statement.

**Biggest opportunity:** the desglose is the product's stated reason to exist and it appears nowhere on the review surface. The RPCs are already written.

## What's Working

1. **The baseline + pending-delta balance model** (`useBalance.js:54-57`, `lib/balance.js`). An expense logged with no signal appears in the balance instantly and does not double-count when sync lands, because `_deltaBase` tracks what the server already knows. `Dashboard.jsx:16-21` closes the loop by re-running the RPC on the syncing `true→false` edge. This is the correct architecture for PRODUCT.md's offline-capture premise, and it is already built.

2. **Making `stale` a visible UI state at all** (`CurrentBalance.jsx:19-23`). Most apps hide staleness to look fast. Surfacing it is exactly the "honest over reassuring" principle. The label and the trigger logic are wrong, but the instinct only needs correcting, not inventing.

3. **`index.css` is a real token layer, not a theme file.** Zero hardcoded palette colors, accent re-resolved at `body` level with the reason commented (lines 102-108), contrast floors documented inline (38-40, 46-47), accent-vs-`--negative` hue separation reasoned out (73-74). This is why the fixes below are cheap.

## Priority Issues

### [P0] A failed fetch is indistinguishable from a real ₡0.00
**Why it matters:** `useBalance.js:44-46` swallows the RPC error into a bare `catch { setStale(true) }`; `balance` resolves via `baseline?.balance ?? 0`; `CurrentBalance.jsx:26` renders that 0 in `text-positive` green. There is no error branch. A user who is overdrawn and offline is told they are at zero and fine. The app states a financial fact it does not possess, in the most reassuring color the system owns. This defeats PRODUCT.md's core promise outright.
**Fix:** Return `error` from `useBalance`. In `CurrentBalance`, when `baseline === null && error`, render `—` in `text-text-muted` plus a `.notice-warning` reading "No se pudo cargar el saldo". Never render a number the app didn't receive.
**Suggested command:** `/impeccable harden`

### [P0] Placeholder copy shipped in the loading path
**Why it matters:** `CurrentBalance.jsx:7-13` renders `<h1>El contenido está cargando  :P</h1>`. Unfinished-artifact text in a production path, at the wrong heading level — it nests an h1 under the h2 at `Dashboard.jsx:34` and above the h3 at line 17, so the document outline is both invalid and *mutating between load states*. Note the branch is currently unreachable: `Dashboard.jsx:23` already gates on the same flags and returns early, then passes `loading` down anyway at line 43. That dead code is exactly how `:P` survived.
**Fix:** Replace with a skeleton block sized to the amount's final metrics (`h-9 w-48 rounded-md bg-surface-raised`), `aria-busy="true"` on the card, no copy. Product register rule: skeletons for loading, not spinners or text. Delete the now-redundant `loading` prop.
**Suggested command:** `/impeccable harden`

### [P1] The balance is the fourth-loudest thing on its own screen
**Why it matters:** `Dashboard.jsx:34` `.heading` (accent, `md:text-2xl`) holds an email address; `:37` holds filler prose; `CurrentBalance.jsx:17` card title at `text-lg font-bold`; `:26` the balance at `text-xl`. DESIGN.md reserves Display (1.875rem, 700) for "the single headline balance figure… two occurrences in the entire app." This *is* that figure, rendered two steps down the ladder. "The number is the interface" is inverted.
**Fix:** Delete the greeting and the paragraph. Render the balance at `text-3xl font-mono font-bold` in `text-text-primary`; demote "Cuenta" to the Label token (`text-xs text-text-secondary`) sitting *above* the amount. Nothing on this screen should be larger than the number.
**Suggested command:** `/impeccable typeset`

### [P1] Semantic color reassigned on the balance
**Why it matters:** `CurrentBalance.jsx:26` — `balance >= 0 ? 'text-positive' : 'text-negative'`. DESIGN.md's Never-Reassign rule: green is money *in*, red is money *out*. A balance is neither. Painting a positive balance the same green as an income row teaches green = "solvent"; painting a negative balance expense-red conflates "you spent" with "you're overdrawn". The positive case also breaks the Never-Alone Rule — green with no sign, no label, no second carrier.
**Fix:** Balance in `text-text-primary`. Let the `-` that `toFixed` already emits carry negativity. If more emphasis is needed, `text-negative` on the negative branch **only** — never `text-positive` on the positive one.
**Suggested command:** `/impeccable colorize`

### [P1] The number is unreadable and uncontextualized
**Why it matters:** `CurrentBalance.jsx:27` — `{balance.toFixed(2)} {baseCurrency}` yields `1250000.00 CRC`. No digit grouping, no `₡`, currency as a trailing ISO code. CRC amounts routinely run 6–7 digits; ungrouped, this demands exactly the digit-counting interpretation PRODUCT.md forbids. Meanwhile `fetchBalance` returns `totalIngresos` and `totalGastos` and `Dashboard.jsx:12` throws them away. A single net figure with no in/out split can't support "debt shrinking and savings advancing are visible enough to make decisions from." There is no formatting helper anywhere in the codebase — 20+ raw `toFixed` call sites across IncomeList, OutcomeList, both forms, and DebtAnalysis.
**Fix:** Add one shared `formatMoney(v, currency)` on `Intl.NumberFormat('es-CR', { style: 'currency', currency })` and route every amount through it. Then render `totalIngresos` / `totalGastos` as two mono rows inside a `.well` beneath the balance — the sanctioned component for nested detail, and it gives the number a cause.
**Suggested command:** `/impeccable clarify`

### [P2] Desktop layout is a half-empty grid
**Why it matters:** `Dashboard.jsx:41` applies `grid-cols-1 lg:grid-cols-2` around a single child, inside a redundant `flex flex-col gap-8` wrapper. At `lg` the card is pinned to 50% width with a dead column beside it. PRODUCT.md judges this surface on "how much of the picture fits on one screen without turning into a wall of numbers." One number fits and half the screen is empty. Failing in the sparse direction is still failing.
**Fix:** Drop the grid and the redundant wrapper until a second card exists. When it does, the first two fills are ingresos-vs-gastos for the month and the nearest debt/savings target — both RPCs already written and unused.
**Suggested command:** `/impeccable layout`

### [P2] The "sin conexión" pill is mislabeled, off-system, and dead
**Why it matters:** `useBalance.js:34-35` sets `stale = true` on *every* cache hit, including a perfectly online load, so the pill flashes when there is a connection. `CurrentBalance.jsx:20` hand-builds it at `text-[10px]` (below the 12px Label floor — the one detector hit on this surface) and omits the `border-warning-line` the system mandates, instead of using `.tag-warning` (index.css:201).
**Fix:** Use `.tag-warning`. Split `stale` from `offline` in the hook. Label by meaning, not cause: "Sin actualizar · hace 3 h". Make it a `<button>` wired to the already-exported `refresh`.
**Suggested command:** `/impeccable clarify`

## Cognitive Load: 5 of 8 failed — CRITICAL

| Check | Result |
|---|---|
| Single focus | **FAIL** — the designed focus (the number) and the visual focus (the accent greeting) disagree. |
| Chunking ≤4 | PASS |
| Grouping | **FAIL** — `gap-8` at `Dashboard.jsx:32`, `:41`, and `:42`. Three identical 32px gaps; proximity carries zero information. |
| Visual hierarchy | **FAIL** — balance at 1.25rem sits *beneath* the greeting at 1.5rem. Your email is bigger than your money. |
| One thing at a time | PASS |
| Minimal choices ≤4 | **FAIL** — see below. |
| Working memory | **FAIL** — no month, no prior period, no in/out split, despite all three being available. |
| Progressive disclosure | **FAIL by absence** — desglose, the product's stated reason to exist, is entirely missing from the review surface. |

**Decision points over the working-memory limit:** mobile bottom nav (`Layout.jsx:188-203`) shows **7** targets, **icon-only under 640px** (`hidden sm:inline`, line 200). Desktop sidebar (`:104-118`) shows **7** tabs. Theme swatches show **5**, rendered on *every* screen in both the mobile header (`:74-83`) and the sidebar (`:124-133`). Thirteen visible options surround a screen containing one piece of content.

## Emotional Journey

**There is no peak.** The load resolves into a bare figure with no frame, so the arc is flat-then-slightly-negative.

- **Valley 1 — first paint.** `CurrentBalance.jsx:10` renders "El contenido está cargando :P". A finance app cracking a joke at the exact moment it is hiding your money reads as unserious precisely when trust is being established.
- **Valley 2 — the green zero.** Offline with no cache, or after a failed RPC, the user sees ₡0.00 in money-in green. Broke, brand-new, and server-failed all render identically, in the most reassuring color the system owns. PRODUCT.md says *honest over reassuring*; this is reassuring exactly where the app knows nothing.
- **Valley 3 — the greeting.** The brand target is "your own notebook rather than a bank." A notebook never addresses you by your login identifier.

**Peak-end:** the session ends by navigating away. The Dashboard is a waypoint, not a destination.

## Persona Red Flags

**Alex (impatient power user)**
- Zero interactive elements exist in `Dashboard.jsx` or `CurrentBalance.jsx`. No refresh, no date range, no drill-in, no primary button.
- The keyboard path off this screen: tab through 7 sidebar buttons, then 5 theme swatches, then Cerrar Sesión.
- Core task fails the 60s bar structurally — logging an income from home requires nav → Ingresos → locate form → fill. The Dashboard offers no capture entry point.
- No shortcuts anywhere in the app. No `keydown` handler, no ⌘K, no accesskey.
- `refresh` exists at `useBalance.js:59` and is unreachable by the user. The one power affordance the data layer offers is hidden.

**Sam (accessibility-dependent)**
- Heading outline is invalid and *mutates*: `Dashboard.jsx:34` h2 → `CurrentBalance.jsx:10` **h1** (loading only) → `:17` h3. The h1 exists only while loading, so the outline changes shape mid-session.
- Load→loaded transition is silent. The card swaps "cargando" for a number with no `aria-busy`, no `aria-live`, no `role="status"`.
- The stale state is never announced — `CurrentBalance.jsx:19` renders the pill with no `role="status"`.
- Theme swatches carry state in color + scale only (`Layout.jsx:78`, `:128`). `aria-label` is present but there is no `aria-pressed`, no `role="radiogroup"`, no group name. The *selected* accent is unannounceable.
- `title={t.name}` is the only visible label on a 20×20 target (`Layout.jsx:81`) — mouse-hover-only, invisible to keyboard and touch.
- **`.card` has `overflow-hidden`** (index.css:149), which will clip the mandated 2px focus outline at 2px offset (index.css:229-233) for any focusable element placed inside a card. The Dashboard has none yet — this is a system-wide focus bug armed and waiting for the first button added to `CurrentBalance`.

**Casey (distracted one-handed mobile)**
- 7 icon-only nav targets under 640px (`Layout.jsx:200`). PiggyBank (Ahorros) vs Target (Presupuestos) vs CreditCard (Deudas) are not distinguishable at a glance.
- Contradictory nav sizing: `flex-1` on each button (`:194`) inside an `overflow-x-auto` container (`:188`) fight each other. At 360px each target lands ~46px wide; tap height is `py-3` + 20px icon ≈ 44px — exactly at the floor with zero margin.
- Theme swatches at `w-5 h-5` = 20×20px (`:78`) — under a quarter of the 44×44 minimum, placed in the *top* header outside the thumb zone, occupying permanent real estate on the capture surface for a preference set once.
- **State does not survive interruption.** `activeTab` (`Layout.jsx:33`) and `debtPreview` (`:34`) live in plain `useState` with no URL, no sessionStorage, no history entry. A call, a low-memory reload, or a back gesture dumps the user on the Dashboard with in-progress form data gone. PRODUCT.md calls the phone a first-class capture surface; this is the most capture-hostile detail in the shell.
- No quick-add affordance on the home screen. The seconds-long capture session PRODUCT.md is built around starts with a nav decision among 7 unlabeled icons.

## Minor Observations

- `Dashboard.jsx:38` — "Mira **como**" should be "cómo". The app's longest prose block ships a typo.
- `Dashboard.jsx:23` already gates on `loadingIn || loadingOut`, yet `loading` is also passed to the child at line 43. The child's loading branch is dead code.
- `useIncomes.js:27-30` creates a fresh `localforage` instance on every render (same in `useOutcomes`). Churn on a hook feeding the home screen.
- `useSettings.js:16-31` reads only localforage and never `perfiles.preferencias`, while the accent theme comes from elsewhere — two preference stores. `divisa_principal` will not follow the user to a second device, and DESIGN.md states the accent lives in `perfiles.preferencias.tema`.
- Three shadow values for one documented role: `shadow-md` (`Layout.jsx:110`), `shadow-sm` (`:195`), against DESIGN.md's `shadow-lg` for the active nav item.
- `CurrentBalance.jsx:17` uses `font-bold` (700) where the Title token is 600.
- `Layout.jsx:46` — `alert("Simulación: Formulario Cerrado")` is live in the Deudas tab.
- "Cuenta" is singular for what is an aggregate across everything. The label is already inaccurate.
- `Layout.jsx:188` mobile nav uses `backdrop-blur-md` — not prohibited, but an un-tokened effect in a system that routes everything through tokens.
- The `text-[10px]` step appears 7 times across the component tree. Either document it as a Micro label token in DESIGN.md or replace all 7 with the 12px Label token. Right now it is an undocumented ramp step, not a mistake.

## Questions to Consider

1. **If the Dashboard were deleted and "Inicio" opened straight onto Ingresos, what would the user actually lose?** Today: one number they cannot act on. That gap is the measure of the distance to PRODUCT.md's stated success criterion.
2. **DESIGN.md reserves Display for "the single headline balance figure… two occurrences in the entire app."** Where is the second occurrence — and why is the first rendered at `text-xl`?
3. **`fetchIncomeExpenseSeries`, `fetchTotalsByCategory`, and `fetchTopCategories` are written and called by nothing.** Is the Dashboard blocked on engineering, or has nobody decided what "the picture" is?
4. **Is a balance with no time frame honest?** ₡0.00 currently means "you're broke", "you're new", and "the server didn't answer" — all three rendered identically, in green.
5. **Whose notebook is this?** The greeting reads your email address back at you. The one thing a personal notebook never does is tell you who you are.
