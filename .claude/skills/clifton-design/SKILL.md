---
name: clifton-design
description: Clifton Guitars brand and UI design system: colours, type, logo use, components, layout, copy rules. Use whenever designing, building or editing any page, section, component, email, social graphic or slide for Clifton Guitars, or when asked to make something "on brand" for them.
---

# Clifton Guitars design system

The look: **guitars lit in the dark.** Near-black stages, a single warm pool of light, and
Clifton gold used sparingly for type and actions. Matches the gold-on-charcoal of
cliftonguitars.com, pushed darker for the 3D showcase.

All tokens live at the top of `css/styles.css`. Use the variables, never raw hex in components.

## Colour

| Token | Hex | Use |
|---|---|---|
| `--black` | `#030303` | 3D stages, hero, footer |
| `--bg` | `#0a0a0b` | Page background |
| `--bg-2` | `#111113` | Panels, cards, strips |
| `--surface` / `--surface-2` | `#1a1a1d` / `#242428` | Raised controls, active tabs |
| `--charcoal` | `#2b2c31` | Email band only (matches the Shopify site) |
| `--gold` | `#fdb83f` | Headlines, primary buttons, active states, focus ring |
| `--gold-2` | `#f2a923` | Gold hover |
| `--ink` | `#1d1d20` | Text on gold |
| `--text` | `#f3efe6` | Body text on dark |
| `--muted` | `#9b978e` | Labels, secondary text |
| `--line` | `rgba(255,255,255,.08)` | Hairlines, card borders |

Rules:
- **Black dominates, gold accents.** Gold should cover well under 10% of any screen: headings,
  one primary button, small indicators. Never a gold background section.
- Text on gold is always `--ink`, never white.
- Warm light only: highlights and glows use `rgba(255, 214, 160, …)` / gold. No blue or purple glows.
- `--stage-bg` is the standard "pool of light fading to black" background for anything showing a guitar.

## Type

- **Archivo** (400–800) for everything. Headlines: weight 800, UPPERCASE, `letter-spacing: -0.01em to -0.02em`,
  `line-height` ≈ 1, gold. Body: 15–18px, `line-height: 1.55–1.6`, `--text` or `#c9c5bc`.
- Eyebrows: 12–13px, 700, uppercase, `letter-spacing: .14em`, gold.
- **Pinyon Script** only for ornament: step numbers, the big "A" mark, fallback wordmark. Never for
  sentences or UI labels.

## Logo

- The wordmark is `assets/logo-wordmark.png`, injected into any element with `data-wordmark`
  by `js/site.js` (it's recoloured to exact `--gold` by `js/logo.js`). Don't retype the logo in a font.
- Gold on dark only. Minimum height 32px on screen. Clear space ≥ the height of the "C" around it.
- `assets/logo-badge.png` (round badge) is for favicons/avatars only.

## Components (reuse these classes)

- `.btn-gold`: the one primary action per view. 14px radius, `--ink` text.
- `.btn-ghost`: secondary action next to a gold button (white outline → gold on hover).
- `.btn-outline`: card-level actions ("View in 3D").
- Pills (`.model-tabs`, `.views`, `.intro-ui`): `rgba(18,18,20,.7)` + `backdrop-filter: blur(10px)` + `--line` border, radius 999px.
- `.card`: `--bg-2`, 18px radius, `--line` border; hover lifts 4px with a gold-tinted border.
- `.swatch`: 44px circles (34px in compact rows); selected = gold ring.
- `.email-form`: gold pill, matching the existing Shopify signup.

## Header

Fixed `.site-header` > `.header-bar` (markup must keep that wrapper). `js/site.js` adds `.compact`
after 60px of scroll: the bar tidies into a 440px floating pill (logo 30px, nav hidden, icons kept).
It expands while the mouse is within ~110px of the top, while focus is inside it, or on scroll-up.
`body` has `padding-top: var(--header-h)`, so never add a second offset for the header.
No divider line under the bar. On the home page at scroll 0 (`.at-top`) the bar is a black→transparent
gradient so it melts into the full-screen stage; anywhere else it's near-solid black.

## Layout

- Gutters: 40px desktop, 16px under 720px. Sections: 88px vertical padding desktop, 56px mobile.
- Breakpoints: 1000px (stack panels), 720px (phone).
- Every layout must work at 375px wide with no horizontal scroll.
- Keep the guitar the hero: UI overlays sit at the edges (top pills, bottom toolbar) and leave the centre clear.

## Copy

- Voice: short, confident, builder-to-player.
- **Main line: "No Frills, Just Tone"** (their casing in running text; uppercase via CSS in headlines).
  It's the hero headline and the footer tagline. Secondary line: "Built by us, designed by you."
  Never reword either.
- Don't invent facts about Clifton (materials, process, shipping, warranties, prices). New claims
  are placeholders and must be flagged to the user for confirmation.
- Spec values in `js/models.js` are demo placeholders until real A Series specs are supplied.

## Accessibility

- Visible focus: `outline: 2px solid var(--gold)`.
- Respect `prefers-reduced-motion` (already handled globally in `styles.css`; JS checks `reduceMotion`).
- Icon-only buttons need `aria-label` / `title`.

For 3D staging and animation rules, see the `clifton-3d-motion` skill.
