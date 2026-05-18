# visual_system — KYC Tier Decisioning Demo

**For Claude Code.** Read after `PRIMARY_PROMPT.md`. This file specifies the visual system: design tokens, type system, layout grid, component constraints, and what "institutional, not generic AI-generated" means concretely.

The single most important framing: **the demo is read by Philippine bank compliance officers, not by consumer app users.** The aesthetic register is editorial financial publication — Financial Times, Economist, BSP annual report. Restraint is the design language. Slate-blue is the only accent and it's used sparingly.

---

## 1. Aesthetic positioning

### Reference register
- Financial Times article layout
- Economist data graphics
- BSP annual report typography
- Bloomberg Terminal information density (without the dark-mode dogma)

### What the demo is NOT
- Not a SaaS dashboard
- Not a consumer fintech app
- Not a generic AI chat interface
- Not a startup landing page

### Tone
- Institutional, not enthusiastic
- Confident, not promotional
- Restrained, not minimalist (this is not a Stripe-style product page — there is real information density)

If a design choice would feel at home on a Y Combinator startup landing page, it does not belong here.

---

## 2. Color tokens

Per Decision 1, the accent is muted slate-blue, on charcoal base, on off-white surface. Red is reserved exclusively for compliance violations — never decorative, never for emphasis, never for "alerts" that aren't actual rule violations.

```css
:root {
  /* Surface */
  --surface-base:        #FAF8F4;  /* off-white, subtle warmth — not pure white */
  --surface-elevated:    #FFFFFF;  /* card / panel surfaces */
  --surface-recessed:    #F1EEE7;  /* secondary panel backgrounds */

  /* Text */
  --text-primary:        #1F2933;  /* charcoal — body text, headings */
  --text-secondary:      #52606D;  /* metadata, captions */
  --text-tertiary:       #7B8794;  /* labels, low-emphasis */
  --text-inverse:        #FAF8F4;  /* on dark surfaces */

  /* Accent — slate-blue (Decision 1) */
  --accent-primary:      #4A6B8A;  /* primary slate-blue, used sparingly */
  --accent-secondary:    #5C7A9C;  /* slightly lighter for hover / secondary */
  --accent-deep:         #3B5673;  /* deeper variant for active / pressed */
  --accent-subtle-bg:    #E8EDF3;  /* very pale slate for badge backgrounds */

  /* Compliance violation — red, ONLY for rule violations */
  --violation-primary:   #B3261E;  /* deep editorial red, not bright */
  --violation-bg:        #FBEAE9;  /* pale red for violation chip backgrounds */
  --violation-warn:      #C84937;  /* slightly lighter red for warning banners (Decision 36 Pass 3 race) */

  /* Neutrals — borders, dividers */
  --border-default:      #D9D2C5;  /* warm grey, harmonizes with off-white */
  --border-strong:       #B8AE9C;  /* for emphasis dividers */
  --border-subtle:       #ECE7DC;  /* for subtle separation */

  /* Status — for non-violation states */
  --status-success:      #2C7A50;  /* deep green — PASS clean */
  --status-success-bg:   #E5EFE8;
  --status-warning:      #8C6A1F;  /* amber — quality flags only, NOT material */
  --status-warning-bg:   #F5EDD8;
  --status-info:         var(--accent-primary);
  --status-info-bg:      var(--accent-subtle-bg);

  /* Code / data — for JSON, threshold arithmetic blocks */
  --data-bg:             #2A2F36;  /* dark charcoal for mono blocks */
  --data-text:           #E8E5DC;  /* warm light text on data bg */
  --data-accent:         #8FA8C2;  /* lighter slate-blue, readable on dark */
}
```

### Color usage discipline

- **`--accent-primary` is used sparingly.** Tier badge, active recommendation card border, key data point emphasis, architecture-strip middle box. Everything else is charcoal/off-white/warm-grey.
- **`--violation-primary` is reserved.** It only appears when a Pass 2 check returns a violation. Never for "warnings," never for "alerts," never for emphasis.
- **`--violation-warn` is reserved for one specific case** — the Pass 3 race banner per PRIMARY_PROMPT.md §6.5 (when re-audit completes after the analyst has already taken an action). Distinguished from `--violation-primary` because it signals "audit findings revised, action surface reset," not "this is a compliance violation."
- **`--status-warning` is for quality flags only.** Pass 2's `PASS_WITH_QUALITY_FLAGS` status uses warning amber. Material findings are violations and use `--violation-primary`. Critical findings are also violations.
- **`--status-success` is for PASS clean states only.** Don't use it as a generic "success" indicator across the UI.

### What NOT to do with color

- No gradients (institutional aesthetic — gradients read as consumer-app)
- No semi-transparent overlays except for modal backdrop (single use — the Override modal per PRIMARY_PROMPT.md §6.5)
- No color emphasis on hover beyond the `--accent-secondary` shift on accent elements; non-accent elements get a subtle background shift via `--surface-recessed`
- No green for "good" or red for "bad" outside the specific compliance semantics above

---

## 3. Type system

The demo mixes four type roles. Each has a specific job. Don't substitute.

### Type families

```css
:root {
  --font-serif:    'Source Serif Pro', 'Charter', 'Georgia', serif;
  --font-sans:     'Inter', 'IBM Plex Sans', -apple-system, system-ui, sans-serif;
  --font-mono:     'JetBrains Mono', 'IBM Plex Mono', 'Menlo', monospace;
  --font-numeric:  'Inter', system-ui, sans-serif;  /* w/ font-variant-numeric: tabular-nums */
}
```

If those specific families aren't accessible during build, the fallbacks are usable. Don't introduce a fifth family; don't use display/decorative fonts.

### Type role assignments

| Role | Family | Usage |
|---|---|---|
| **Examiner Notes body** | `--font-serif` | The 4–6 paragraph compliance memo. Serif anchors the editorial register. |
| **Section headings** | `--font-sans`, semibold | Component titles, panel headers, pass-naming headlines per PRIMARY_PROMPT.md §6.2 |
| **UI chrome** | `--font-sans`, regular/medium | Labels, button text, form labels, navigation |
| **Tabular figures** | `--font-numeric` with `font-variant-numeric: tabular-nums` | All numeric values: risk scores, thresholds, PHP amounts, percentages, elapsed-time counters |
| **Data / code** | `--font-mono` | JSON blocks, rule IDs, threshold arithmetic, regulatory citations, audit reference IDs |

### Type scale

```css
:root {
  --text-xs:    11px;   /* captions, mode-disclosure labels */
  --text-sm:    13px;   /* metadata, secondary labels */
  --text-base:  15px;   /* body — UI chrome */
  --text-md:    17px;   /* serif body for Examiner Notes */
  --text-lg:    20px;   /* section headings, recommendation tier, pass-naming headlines */
  --text-xl:    26px;   /* panel titles */
  --text-2xl:   34px;   /* page-level title */

  --leading-tight:  1.25;
  --leading-normal: 1.5;
  --leading-loose:  1.7;  /* for serif Examiner Notes paragraphs */
}
```

### Type discipline

- **Examiner Notes paragraphs use `--leading-loose`** — readability matters, this is the prose that compliance officers actually read
- **Tabular figures everywhere numeric** — `font-variant-numeric: tabular-nums` is non-negotiable on risk scores, PHP amounts, threshold values, elapsed-time counters; columns of numbers must align
- **Mono for rule IDs** — `TE-05`, `ES-03`, `DC-07` always render in mono, even inside serif paragraphs. This signals "structured artifact" visually.
- **Mono for audit reference IDs** — the `audit-{persona_id}-{YYYYMMDDHHMMSS}` format from PRIMARY_PROMPT.md §6.5 renders in mono. Reads as institutional artifact identifier, not engineering convenience.
- **No font-weight extremes** — regular (400), medium (500), semibold (600). No light, no bold, no black weights. Editorial restraint.

---

## 4. Layout grid (Decision 39)

### Three-tier viewport hierarchy

The demo supports a three-tier viewport hierarchy per Decision 39. Compliance officers viewing on desktop are the dominant case; large-tablet holding target preserves design integrity for senior compliance leaders who might review on iPads; 768px functional floor catches the edge case without forcing phone-first design discipline.

| Tier | Breakpoint | Behavior |
|---|---|---|
| **Primary design target** | ≥ 1280px viewport | Full intended treatment; content max-width 1180px with 50px gutters each side |
| **Holding target** | ≥ 1024px | Design holds: audit panel density preserved, architecture strip horizontal, two-column form preserved. No reflow. |
| **Functional floor** | ≥ 768px | Content reflows: audit panel becomes scrollable list, architecture strip stacks vertically, custom-input form becomes single-column. No design breakage, no horizontal scrolling. |
| **Degraded** | < 768px | Readable, not impressive. No phone-native styling. |

### Tailwind-aligned breakpoint mapping

```
sm: 640px   - degraded mobile (no design budget)
md: 768px   - functional floor (single-column reflow, must not break)
lg: 1024px  - holding target (design holds, audit panel density preserved)
xl: 1280px  - primary design target (full intended treatment)
```

Each component built is tested at `xl`, expected to hold at `lg`, required to not break at `md`.

### Container specification

- **Viewport design target: 1280px.** Components are designed for this width.
- **Content max-width: 1180px** with 50px gutters each side at design target.
- Below 1180px viewport, content fills available width with horizontal padding of 24px until 1024px holding target.
- Below 1024px, layout reflows per the functional floor specification.

The 1280px viewport / 1180px content / 50px gutter pattern is standard institutional treatment. Content lives inside a max-width container; viewport is wider than content; gutters provide breathing room.

### Vertical rhythm
- Section spacing: **64px** between major sections (recommendation card → audit panel → examiner notes → architecture strip)
- Within-section spacing: **32px** between component groups
- Within-component spacing: **16px** between atomic elements

### Whitespace discipline

Generous whitespace is part of the institutional register. Specifically:

- Cards have **24px internal padding** minimum
- Panel headers have **24px bottom margin** to body content
- Examiner Notes paragraphs have **20px paragraph spacing** (not single-line-break density)
- Form group cards (per PRIMARY_PROMPT.md §6.6) have **24px internal padding**
- Don't compress to fit more content per viewport — let the page scroll. Density without breathing room reads as cramped.

### Persona button row

Four buttons, **visually equal-weight per Decision 27**. The original brief's "visually deprioritized fourth persona" framing (Decision 22) is amended — Persona D ships at parity with A/B/C. Equal sizing, equal styling, equal prominence.

Layout: horizontal row of four cards at xl/lg, two-by-two grid at md, single-column at sm. Each carries:
- Persona name and one-line descriptor
- Small caption-style mode-disclosure label: **"Pre-generated example"** (Decision 41-aligned register)
- Hover state: subtle `--surface-recessed` background shift, `--accent-primary` border on the side

Below the four-card row, a clearly separated **"Or try your own profile"** section opens the live custom input panel.

### Architecture strip placement

Near the footer but not in it. After the analyst control panel, before the citation footer. Five-box diagram horizontally laid out at xl/lg, vertical stack with `↓` connectors at md and below. Middle box (Reasoning Layer) emphasized in `--accent-primary` with the production annotation **centered underneath** in `--text-secondary` per Decision 42.

---

## 5. Component constraints

### 5.1 Recommendation card

- Tier badge: large, slate-blue accent background (`--accent-subtle-bg`) with `--accent-deep` text, mono font for the tier label
  - Padding: `px-3 py-1.5` (between Chip's `px-2 py-0.5` and Card's `p-6`). Text size: `text-lg` (18px) — visibly larger than chip/button `text-sm` and field-label `text-base`. The `text-xl` size is reserved for the risk score numeric.
- Risk score: tabular-figure `--text-xl`, with category breakdown chips below
- "Why this tier" expandable: chevron disclosure, expanded content uses serif body type for the rationale prose
- Suggested EDD requirements: bulleted list using `--font-sans`, not serif (these are operational items, not memo prose)

### 5.2 Compliance audit panel

The hero UI moment. Build with deliberate care. Animation behavior per Decision 41 is symmetric between persona playback and live mode.

**Pass-naming headline (Decision 41 S3) — persistent section label:**

```
Pass 2 — Audit
3.4s elapsed                                    [live mode only]
```

Headline in `--text-lg` semibold `--font-sans`. Elapsed-time counter in `--text-tertiary` `--text-sm` with tabular figures, appearing after 500ms threshold per Decision 41 S1. Headline persists throughout the pass as section label — not a transient status message.

**Animation:** rule-by-rule check ticks through 25–30 substantive checks per persona, at **80–120ms per check**. The user should perceive the audit as work being done, not as a static list appearing. **Same pacing in persona playback and live mode** per Decision 41a. Checks render in canonical order per Decision 41 Path X — sorted at render time, not edited at source.

**Per-check rendering:**
- Rule ID in mono on the left
- Status chip: PASS (success green), FAIL (violation red), QUALITY (warning amber)
- Brief evidence note in `--font-sans` `--text-sm`
- Regulatory citation in `--text-tertiary` `--text-xs`

**Numeric threshold verification block** (per Decision 23):

```
┌───────────────────────────────────────────────────┐
│ TE-05 numeric_threshold_verification              │
│                                                   │
│   profile_value:      PHP 850,000                 │
│   rule_threshold:     PHP 500,000                 │
│   comparison_result:  850,000 ≥ 500,000     → PASS│
└───────────────────────────────────────────────────┘
```

Render as a small bordered block inside the audit panel. Mono font for the values, tabular figures for the PHP amounts, the `→ PASS|FAIL` indicator right-aligned. This is the "show the math" moment — make it legible, not decorative.

*(The ASCII rendering above is a structural specification, not the final visual. Implementation uses bordered cards with `--border-default`, proper mono typography, tabular figures, and right-aligned status indicator with the appropriate color token.)*

**DC-07 dual-satisfaction indicator** (per Decision 25 corollary):

```
DC-07 — NPC Advisory 2024-04 dual satisfaction
   ✓ structured-record   (rule appears in rules_fired)
   ✓ prose-level         (substantive audit_trail text)
```

Both halves visible, both checked. Don't collapse into a single status chip. The dual visibility is the credibility moment — examiners want to see both halves verified.

**Severity strip:** three counts, horizontal row, labels `critical / material / quality`. PASS clean shows `0 / 0 / 0`.

**Violation categories chip strip:** small chips per category that has any non-zero count.

**Failure rendering (live mode only, per PRIMARY_PROMPT.md §5.3):**

When `/api/decisioning` returns a `DecisioningError`, the audit panel renders the error in place of the pass output. **No animation.** The pass-naming headline stays visible as the section label; error renders below in `--violation-primary` typography with the typed error message from the `DecisioningError.message` field.

### 5.3 Examiner Notes section (HERO TREATMENT)

- Header: **"Examiner Notes"** in `--text-xl` semibold, with persona name and customer reference below in `--text-secondary`
- Body: serif (`--font-serif`), `--text-md`, `--leading-loose`, paragraph spacing 20px
- Memo structure: Decision Summary / Profile Analysis / Rule Application / Considered Alternatives / Recommended EDD Procedures / Audit Trail (per the brief — not all sections appear in every persona's notes)
- Two-layer progressive disclosure (Decision 11): summary finding visible by default (~3–4 sentences), "Read full memo" expand control reveals the 4–6 paragraph full version
- Rule IDs inline in mono (e.g., "...both ES-03 and TE-05 fire as concurrent hard rules...")
- PHP amounts inline with tabular figures
- Regulatory citations in mono with `--text-secondary`

This is the differentiator made visible. Treat the type and spacing here as load-bearing.

### 5.4 Architecture strip — static positioning artifact (Decision 42)

Five-box horizontal diagram with **no interactivity** — no click-to-expand, no hover state, no popover. Static positioning per Decision 42.

```
┌────────────┐  ›  ┌────────────┐  ›  ┌─────────────┐  ›  ┌────────────┐  ›  ┌────────────┐
│  Identity  │     │    AML     │     │  Reasoning  │     │    Case    │     │    Core    │
│Verification│     │ Screening  │     │    Layer    │     │ Management │     │  Banking   │
└────────────┘     └────────────┘     └─────────────┘     └────────────┘     └────────────┘
                                       (slate accent)

                          v1 demo: single-model with independent re-derivation.
                          Production: multi-model audit on Bedrock with redacted input.
                          [centered under the strip — applies to full pipeline, not just middle box]
```

- Middle box: `--accent-primary` background, `--text-inverse` text
- Other four boxes: `--surface-recessed` background, `--text-primary` text, `--border-default` border
- **Chevrons** (`›`) in `--text-tertiary` between boxes — light, sequence-suggestive without imposing strict topology. Not heavy arrows.
- **No hover state on any box.** The slate-accent treatment plus the production annotation already signal "this is the relevant box." Adding any hover state would suggest interactivity that doesn't exist.

**Production annotation — centered under the strip, two parallel lines:**

```
v1 demo:    single-model with independent re-derivation.
Production: multi-model audit on Bedrock with redacted input.
```

`v1 demo:` and `Production:` labels in `--text-tertiary`; body in `--text-secondary`. `--font-sans` `--text-sm`. The annotation's scope is the entire pipeline as a v1/production split, not just the Reasoning Layer — centered placement reads as "this is the annotation for the diagram," not "this is the annotation for one component."

**Mobile treatment (< 768px):** five-box horizontal stack becomes vertical column. Chevrons become `↓` connectors. Annotation moves below the vertical stack. Layout change only; no interactivity added.

### 5.5 Analyst control panel — production-preview framing (Decision 36)

Primary action surface, not a footer afterthought. Lives directly below the Examiner Notes section.

- Three buttons: **Approve** / **Escalate** / **Override**
- Approve: `--accent-primary` background — slate-blue is the affirmative action color
- Escalate: outlined, `--accent-primary` border and text
- Override: outlined, `--text-secondary` border and text — visually less prominent than the other two but still an equal-weight control

**Concordance signaling on Escalate** (when `senior_approval_required: true` was set by Pass 1):
- Escalate button **pre-click** reads **"Confirm Escalation"** instead of "Escalate"
- Approve button is visually de-emphasized (reduced opacity, `--text-secondary` border)
- Post-click confirmation block reads "Escalated" without parenthetical

**Confirmation block on action** (renders below the panel):

```
Case approved
Analyst: Demo Analyst
Timestamp: 2026-05-12T14:32:47Z
Tier: Standard
Decisive rules: TE-02, TE-05
Audit reference: audit-maria-20260512143247

Production: this record persists to your case management workflow.
Demo: this record is not retained.
```

Field structure rendered as a `--surface-elevated` card with 24px internal padding. Label values in `--text-secondary`; data values in `--text-primary`. `Audit reference` value in `--font-mono`. Microcopy underneath in `--text-tertiary` `--text-xs`.

**Override modal** (the one allowed semi-transparent overlay):
- Required textarea: *"Document the basis for overriding the AI recommendation."*
- Submit disabled until non-whitespace content entered
- On submit: original AI recommendation renders in its **full original visual form** (same typography, field layout, risk-score treatment) with a **"Superseded by analyst override"** header strip in `--text-tertiary`, alongside the analyst's documented basis. Treatment mirrors the Pass 3 change-log's before/after disclosure
- Escape key, click on backdrop, and explicit Cancel button all dismiss
- When open, the modal locks body scroll via `document.body.style.overflow = 'hidden'`; restored on close. This prevents background content from scrolling behind the open modal.

**Post-action state:**
- After any of the three actions, all three buttons disable (`opacity: 0.5`, `cursor: not-allowed`)
- A "Reset case" link appears underneath in `--text-tertiary` `--text-sm`
- Persona switching mid-action resets all action state

**Pass 3 race banner** (live mode only, when re-audit completes after analyst has already acted):
- Banner renders above the analyst panel in `--violation-warn` background, `--text-primary` text
- Message: *"Audit findings revised after your previous action. Action surface reset; please review the corrected recommendation."*
- If Pass 3 fires while Override modal is open, banner appears inside the modal; modal does not auto-close

### 5.6 Custom input form (Decision 37)

The 13-field profile form. Four-group regulatory-function layout per Decision 37.

**Group layout** — each group is a `--surface-elevated` card with 24px internal padding, section labels in `--text-tertiary`:

```
[ Customer identity ]
  customer_reference, identity_document_type, residency_status, customer_type

[ Account & behavior ]
  occupation_type, source_of_funds, account_purpose, expected_monthly_volume_php

[ Risk indicators ]
  pep_status, sanctions_screening, high_risk_jurisdiction_connection, adverse_media

[ Relationship ]
  years_with_bank
```

**Field-type rendering:**

- **Clean enum fields** (most): single-select dropdown in `--font-sans` `--text-base`
- **Composite-prone fields** (3 fields): primary single-select + "+ Add another" or sub-control affordance. Sub-controls reveal inline below primary. UI joins to canonical wire string on submit per Decision 37a.
- **`occupation_type`**: enum dropdown with "Other..." option that reveals free-text input. Schema accepts either branch per Decision 37b with three guard refinements.
- **Numeric field** (`expected_monthly_volume_php`): "PHP" prefix in `--text-tertiary`, tabular figures, format-on-blur with thousand separators ("PHP 850,000")

**Regulatory citation tooltips** (Decision 37d) — always on, restrained:

`?` glyph in `--text-tertiary` next to field labels on four non-obvious fields: `pep_status`, `high_risk_jurisdiction_connection`, `source_of_funds`, `customer_type`. Hover or focus triggers the tooltip; no click required.

Tooltip rendering:
- Small bordered box in `--surface-elevated`
- `--text-sm`, `--text-secondary`
- Citation-only content, no explanation
- Mobile: tap `?` → tooltip appears, tap elsewhere or glyph again → dismisses

Example tooltip content:
> *Person currently or formerly in a prominent public function, or their family / close associates — FATF R.12, MORB §923.*

**Inline error messages:**
- `--violation-primary` `--text-sm` below each field
- Appear on blur after first interaction (no eager error spam)

**Submit button:** "Run three-pass analysis" in `--accent-primary`, full-width on mobile, right-aligned on desktop. `--font-sans` medium weight.

**Mode-disclosure label above the form:** "Live audit" in `--text-tertiary` `--text-xs`.

**Footer microcopy below the form** (per PRIMARY_PROMPT.md §4.8):
> *Live generation is rate-limited per session. Pre-generated examples are not affected.*

In `--text-tertiary` `--text-xs`.

### 5.7 Footer

- Regulatory citation block: list of citations in `--font-mono` `--text-sm`, two-column on desktop
- Architecture statements (three lines): `--font-sans` `--text-sm`, `--text-secondary`
- Shift Atlas attribution: `--text-tertiary` `--text-xs`, right-aligned

### 5.8 Loading states

**Persona playback:**
- Simulated loading with `--accent-primary` thin progress bar at the top of the panel that's currently loading
- Skeleton placeholders in `--surface-recessed` for the panel content
- No elapsed-time counter (the playback is deterministic and fast)

**Live generation (per Decision 41):**
- Same visual pattern as persona playback for the loading bar and skeletons
- Elapsed-time counter in `--text-tertiary` appears after 500ms threshold (Decision 41 S1)
- Counter format: "Pass 1 — 2.3s elapsed" with tabular figures
- Counter updates at ~200ms cadence
- Counter sits below the pass-naming headline as the dynamic element

**Failure states (live mode only):**
- No animation per Decision 41 S2
- Typed error renders directly in `--violation-primary`
- Pass-naming headline stays visible as section label

**No spinner emojis, no animated dots, no whimsical loading copy.**

---

## 6. What "institutional, not generic AI-generated" means concretely

Negative space — the things explicitly excluded.

### 6.1 Anti-patterns to avoid

- **No decorative icons.** Informational icons only when they add semantic value (e.g., the chevron on expandable sections, the checkmark on dual-satisfaction halves, the `?` glyph on regulatory tooltips). No "lightbulb" icon next to insights, no "sparkle" icon next to AI-generated content, no decorative chevrons or arrows for visual interest alone.
- **No generic dashboard tropes.** No sparkline strip across the top of the page, no KPI cards with up/down arrows, no donut charts for risk score breakdowns, no decorative gradient on the hero section.
- **No buzzword density.** Microcopy reads as institutional. Not "AI-powered insights," not "next-generation compliance," not "intelligent decisioning" — the architecture is a "three-pass reasoning pipeline" and the differentiator is "audit you can trust." Pass-naming headlines name what the pass IS ("Pass 2 — Audit"), not what it's doing ("Auditing recommendation...").
- **No emoji in UI.** Anywhere. Including loading states, success messages, button labels.
- **No marketing voice.** No exclamation marks. No "Get started!" CTAs. No "Welcome back!" greetings. No "Oops! Something went wrong" error messages.
- **No animation for animation's sake.** The audit panel ticker animates because it communicates "work is being done." Hover states have subtle transitions. The Pass 3 correction banner animates in because it signals a state change. Nothing else animates.
- **No green/red dichotomy outside compliance semantics.** Buttons are slate, not green. Borders are warm grey, not red. Status uses the specific compliance colors only when the semantics actually map.
- **No interactive disclosure on the architecture strip.** No click-to-expand, no hover popover. Static positioning per Decision 42. Promising affordance without delivering it is the worst register failure mode.
- **No light-mode/dark-mode toggle.** The demo is light-mode only — that's the editorial register. Don't add a theme toggle.
- **No toggle for the regulatory tooltips.** Per Decision 37d, tooltips are always on with restrained chrome. Toggling them off is consumer-app deferral pattern.

### 6.2 Positive signals — what to lean into

- **Tabular figures everywhere numeric.** Columns of numbers align. Elapsed-time counters use tabular figures so digits don't jitter as they update. This signals "financial publication."
- **Generous paragraph spacing on serif body.** Examiner Notes look like a memo, not a content card.
- **Mono for rule IDs and regulatory citations.** Even inline in serif paragraphs. Signals structured artifact.
- **Mono for audit reference IDs** (`audit-maria-20260512143247`). Same principle.
- **Pass-naming headlines as persistent labels.** Section labels, not status messages. "Pass 2 — Audit" persists; verb-status patterns like "Auditing..." don't.
- **Restraint on the accent.** When slate-blue appears, it carries weight. Sprinkling it everywhere dilutes it.
- **Information density without crowding.** The audit panel shows 25–30 checks. They breathe. They don't get reduced to icons or condensed.
- **Production-grounded annotations.** The architecture strip's v1/production annotation (centered, parallel lines), the footer's "deployed via Amazon Bedrock" line, the analyst panel's "Production: this record persists..." microcopy. These signal "this person knows how this gets deployed."
- **Restrained chrome on tooltips.** `?` glyph in `--text-tertiary`, citation-only content, no explanation. Restraint defeats AI-app smell, not absence.

### 6.3 The compliance officer test

The visual treatment is correct when a Philippine bank compliance officer who opens the URL has the reaction: "this looks like the kind of internal tool we'd actually use."

Not "this looks impressive." Not "this looks polished." Not "this looks modern."

**"This looks like ours."** Editorial register. Institutional restraint. Information density that respects the reader's expertise.

---

## 7. Implementation notes for Claude Code

### 7.1 CSS approach

- CSS custom properties as defined in §2 and §3 are the source of truth
- Tailwind is acceptable if useful for rapid layout work — configure the theme to map to the custom properties, don't introduce parallel token sets
- Tailwind breakpoints align to the Decision 39 mapping (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`) — these are Tailwind defaults; no customization needed
- Component styles can live alongside components (CSS modules, styled-components, or Tailwind utilities — pick one and stay consistent)
- Don't introduce a UI component library (shadcn/ui, Radix, MUI) without a clear justification — they'll fight the institutional register and pull toward generic SaaS aesthetic

### 7.2 If you need a token I haven't specified

If a design need arises that the tokens above don't cover (a specific shade, a specific spacing value), derive it from the existing scale rather than introducing a parallel value. Document the derivation in a comment.

### 7.3 If something feels generic during build

Stop and ask: would this be at home on a Y Combinator startup landing page? If yes, redesign. The institutional register is the differentiator from generic AI tooling — let it govern.

### 7.4 Cross-references to PRIMARY_PROMPT.md

The visual specifications here align with the architectural decisions synthesized in PRIMARY_PROMPT.md. When a visual question arises that this file doesn't answer, check:

- **§4.7 (Schema architecture)** — error state typing for failure rendering
- **§4.8 (Cost protection)** — rate-limit and kill-switch error messages
- **§4.11 (Canonical sort)** — audit panel check ordering
- **§5.3 (Failure path)** — error rendering pattern
- **§6.2 (Audit panel animation)** — Decision 41 ticking pace, headlines, elapsed-time counter
- **§6.4 (Architecture strip)** — Decision 42 static treatment
- **§6.5 (Analyst control panel)** — Decision 36 production-preview framing
- **§6.6 (Custom input form)** — Decision 37 composite controls and tooltips
- **§7.6 (Mobile floor)** — Decision 39 three-tier hierarchy

When PRIMARY_PROMPT.md and this file appear to conflict, PRIMARY_PROMPT.md wins on architectural questions; this file wins on visual treatment questions. If the conflict is genuine (not just a difference in framing), surface it to JP before resolving.

## 8. Accessibility

### Focus treatment (canonical)

All focusable interactive primitives use:

```
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary
```

- Keyboard-only via `focus-visible` (not `focus`)
- 2px outline width
- 2px outline offset
- Color: `--accent-primary`

Applies to: Button, Modal close button, all future form controls and interactive elements.
