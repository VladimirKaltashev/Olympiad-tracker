# Obsidian Tribunal Visual Experiment v1

## 1. Visual direction implemented

Explored a stronger Obsidian Blood direction inspired by Tribunal Red / Redacted Board. The UI has **six living layers** creating a black public verdict board / tribunal dossier system:

1. **Background dossier grid** — visible 48px ruling lines + ghost labels (PUBLIC VERDICT / CLAIM LEDGER / CASE BOARD)
2. **Cursor blood smear** — directional stretch along movement vector, visible only during movement, fades at rest
3. **Case surface treatment** — cards with prominent top blood rule, left rail, border highlight on hover
4. **Verdict bar judgment scale** — visible hash segment marks + dotted center divider
5. **Stamp-like status badges** — dashed borders, -1.5deg rotation, ink-stamp feel
6. **Existing base** — matte graphite surfaces, neutral borders, burnished verdict gold

## 2. Selector debug findings

Audited all key surfaces against obsidian.css selectors:

| Surface | DOM class | Selector used | Match? |
|---|---|---|---|
| Arena/claim cards | `.cork-card` | `[data-theme="obsidian"] .cork-card` | Yes |
| Sidebar panels | `.cork-panel` | `[data-theme="obsidian"] .cork-panel` | Yes |
| Challenge sidebar | `.sidebar-block` | **Missing** in v0 | Fixed — added `.sidebar-block` treatment |
| Verdict track | `.cork-verdict-track` | `[data-theme="obsidian"] .cork-verdict-track` | Yes |
| Tags/badges | `.cork-tag`, `.cork-tag--*` | `[data-theme="obsidian"] .cork-tag` | Yes |
| Header | `.cork-header`, `.cork-nav-link` | Matching selectors | Yes |
| Challenge entries | `.challenge-entry` | Matching selector | Yes |
| Leader rows | `.leader-row` | Matching selector | Yes |
| Spotlight | `.challenge-spotlight` | Matching selector | Yes |

**Root cause of invisibility**: Selectors matched correctly but every opacity value was too low (0.012–0.04 range) to be visible against near-black `#09090b`:

- **Grid**: `rgba(255,255,255,0.012)` — invisible on #09090b
- **Ghost labels**: `rgba(255,255,255,0.02–0.025)` — invisible
- **Cursor radial**: `rgba(184,56,56,0.04)` — invisible
- **Verdict hash lines**: `rgba(255,255,255,0.04)` — invisible
- **Card left rail**: `0.12` — barely visible only at the very top of the gradient
- **Cursor calc bug**: `--cursor-x` was set as `"45.2%"` (string with %) then used in `calc(var(...) * 1vw * ...)` which produced NaN — radial gradient never rendered

**Missing treatment**: `.sidebar-block` used in ChallengeDetailPage had no obsidian treatment at all.

## 3. Files changed

| File | Action | Summary |
|---|---|---|
| `src/entities/theme/CursorSmear.tsx` | **Created** | Directional smear: lerp-based current/target tracking, distance-gated visibility, RAF writes CSS vars for position/size/angle/opacity |
| `src/entities/theme/index.ts` | **Modified** | Exports `CursorSmear` |
| `src/app/App.tsx` | **Modified** | Renders `<CursorSmear />` |
| `src/styles/themes/obsidian.css` | **Modified** | Major rewrite — boosted all opacities, fixed cursor calc, added sidebar-block treatment |

## 4. Opacity / strength values — before vs after

| Element | v0 (invisible) | v1 (visible) | Delta |
|---|---|---|---|
| **Grid lines** | `rgba(255,255,255,0.012)` | `rgba(255,255,255,0.045)` | 3.75× |
| **PUBLIC VERDICT label** | (not present) | `rgba(255,255,255,0.065)` 28px | New |
| **CLAIM LEDGER label** | was `rgba(255,255,255,0.025)` 12px | `rgba(255,255,255,0.065)` 14px | 2.6× + larger |
| **CASE BOARD label** | was `rgba(255,255,255,0.025)` 12px | `rgba(255,255,255,0.06)` 14px | 2.4× |
| **Cursor radial peak** | `rgba(184,56,56,0.04)` → `rgba(184,56,56,0.15)` → `rgba(184,56,56,0.18)` | 4.5× vs v0 |
| **Cursor radius** | 40vw (~600px) → 440px → **260px** | Smaller, tighter |
| **Cursor mid-stop** | 35% at 0.04 → 35% at 0.04 → **25% at 0.08** | Falls off faster |
| **Cursor outer-stop** | 65% transparent → 65% transparent → **50% at 0.03, 65% transparent** | Two-stop edge |
| **Cursor motion** | Direct (instant) | **Lerp inertia, factor 0.12** | Delayed chase |
| **Cursor calc** | `calc(var(--cursor-x, 50%) * ...)` → NaN | `calc(var(--cursor-x, 50) * 1%)` | **Bug fixed** |
| **Card top rule** | `opacity: 0.35` | `opacity: 0.55` | 1.57× |
| **Card left rail** | `opacity: 0.12` | `opacity: 0.22` | 1.83× |
| **Card hover sheen** | `inset rgba(184,56,56,0.06)` | `inset rgba(184,56,56,0.09)` | 1.5× |
| **Panel top rule** | `opacity: 0.2` | `opacity: 0.3` | 1.5× |
| **Spotlight top rule** | (not present) | `opacity: 0.4` 2px | New |
| **Challenge entry rail** | `opacity: 0.15` | `opacity: 0.22` | 1.47× |
| **Leader row rail** | `opacity: 0.1` | `opacity: 0.18` | 1.8× |
| **Verdict hash marks** | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.1)` | 2.5× |
| **Verdict center line** | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.18)` dotted 3px | 3× + dotted |
| **Tag rotation** | `-0.5deg` | `-1.5deg` | 3× |
| **Tag border** | `1px dashed` | `1.5px dashed` | Thicker |
| **Sidebar-block** | (no treatment) | Top rule `opacity: 0.25` | New |

## 5. Cursor effect — v3: directional smear (replaces circular spotlight)

### Why circular focus was replaced

v1 (440px circle) felt like a large static flashlight. v2 (260px circle + lerp) felt like a random delayed red blob behind the cursor — the lerp created a disconnect between cursor position and the effect, and the circular shape didn't relate to movement direction. The directional smear model replaces the static shape with one that responds to cursor velocity and direction.

### Smear implementation

**Component** (`CursorSmear.tsx`):
- Renders a single `<div className="cork-cursor-smear" aria-hidden="true" />` in DOM
- `targetRef` captures `e.clientX/Y` on mousemove only while motion and fine-pointer conditions allow it
- `currentRef` lerps toward target via RAF while the smear is settling (factor 0.2), then stops
- Computes `dx/dy/distance/angle` from target−current difference
- Only shows smear when `distance > 18px`
- Smear renders between current and target at 45% offset
- Writes 6 CSS vars directly to `documentElement.style` while active (no React state)

**Formulas:**
| Var | Formula | Range |
|---|---|---|
| `--cork-cursor-smear-x` | `currentX + dx * 0.45` px | — |
| `--cork-cursor-smear-y` | `currentY + dy * 0.45` px | — |
| `--cork-cursor-smear-w` | `clamp(120, distance * 1.8, 340)` px | 120–340px |
| `--cork-cursor-smear-h` | `clamp(42, distance * 0.35, 92)` px | 42–92px |
| `--cork-cursor-smear-angle` | `Math.atan2(dy, dx)` rad | −π to π |
| `--cork-cursor-smear-opacity` | `clamp(0, distance / 220, 0.75)` | 0–0.75 |

**CSS** (`.cork-cursor-smear`):
- Positioned via `translate3d()` with centered offset
- Rotated by `--cork-cursor-smear-angle`
- `border-radius: 999px` → pill shape stretched by width/height
- `filter: blur(14px)` for soft organic edges
- `radial-gradient(ellipse)` using dark blood red (`rgb(125,18,22)`) — not neon, not pink
- `will-change: transform, opacity` for GPU compositing
- `pointer-events: none`, `z-index: 2`
- Opacity defaults to 0 when no vars set and CSS vars are cleared outside obsidian
- `@media (prefers-reduced-motion: reduce)` forces opacity 0; JS also stops and restarts listeners when the preference changes

**Smoothing factor**: 0.2 (raised from 0.12 in v2). At 0.2, current reaches 50% of target in ~3 frames (~50ms). This is fast enough to feel connected to the cursor but slow enough to create a visible smear trail.

**Movement threshold**: 18px. Below this distance, smear fades to 0 opacity. This prevents the effect from showing during tiny micro-movements or when the cursor is nearly still.

### Expected behavior

| Cursor action | Smear response |
|---|---|
| Still / micro-move (<18px) | Invisible (opacity 0) |
| Slow drag | Small faint mark (~120×42px, low opacity) |
| Medium flick | Visible stretched pill (~200×65px) |
| Fast sweep | Full-width streak (~340×92px, up to 0.75 opacity) along movement vector |
| Sudden stop | Shrinks rapidly as distance drops below threshold |

## 6. Where the difference is now visible

After the boosted values, every treated surface is now visibly different from the base dark theme:

- **Background**: Grid ruling visible as a faint notebook-like overlay. PUBLIC VERDICT centered in large ghost text, CLAIM LEDGER top-left, CASE BOARD bottom-right — all subtle but now readable.
- **Cursor**: Desktop-only directional blood smear appears during meaningful cursor movement (threshold >18px). Stretches along the movement vector — small and faint during slow drags, full elongated streak during fast sweeps. Fades immediately when cursor slows or stops. Elliptical radial gradient in dark blood red (`rgb(125,18,22)`), blurred 16px. Not a circle, not a flashlight, not neon.
- **Cards**: 2px red top rule clearly visible as a dossier header. 3px left rail gradients from red to transparent at the card edge. Hover highlights the border with a brass/copper shine inside.
- **Panels**: Subtle 1px red top rule marking secondary sections.
- **Sidebar blocks**: Same 1px rule treatment (newly added).
- **Verdict bar**: 8 thin vertical white hash lines at 12.5% intervals clearly visible across the bar. Center has a dotted divider line. The bar reads as a measurement scale, not just progress fill.
- **Tags**: Slightly rotated (-1.5deg), 1.5px dashed borders — clearly stamp-like. Hover alignment reflects an ink stamp being applied.

## 7. Surfaces still unchanged

These components use cork-* but no tribunal-specific treatment was applied:
- **Header** — only backdrop blur + border. No dossier rules.
- **Nav links** — only sharper border-radius.
- **Stats (cork-stat)** — uses cork tokens only.
- **Buttons** — only hover ring treatment (no dossier rules).
- **Empty states** — cork token usage only.
- **Filters / dropdowns / modals** — cork token usage only.

This is intentional — not every element needs the dossier treatment. The treatment is focused on content-carrying surfaces (cards, panels, entries, verdict bar, tags).

## 8. Manual review notes

### Surfaces inspected (code-level, verified DOM class matches)

**Arena feed** — Cards: `.cork-card`. Top blood rule (0.55 opacity 2px) + left rail (0.22 opacity gradient). Hover: frame-light border + inset brass sheen.

**Claim cards (profile, feed)** — All use `.cork-card`. Same treatment applies universally.

**Verdict bar** — `.cork-verdict-track`, `.cork-verdict-king`, `.cork-verdict-clown`. Hash lines at 0.1 alpha + dotted center at 0.18 alpha. Visible at normal zoom.

**/me** — `.cork-stat` blocks + `.cork-tag` stamps.

**Challenge detail** — `.challenge-entry`, `.leader-row`, `.challenge-spotlight`, `.sidebar-block`. All now have dossier treatments.

**Settings / CORK Worlds** — `.cork-panel` has top rule. Theme selector cards are inside a panel.

**Admin** — Uses `.cork-card` so gets same treatment.

## 9. Checks results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Pass |
| `npm run test` | 58 files, 402 tests, all pass |
| `npm run lint` | Pass, 0 errors |
| `npm run build` | Pass |

## 10. Risks / follow-ups

- **Smear RAF loop**: Starts on meaningful pointer movement and stops after the current point settles near the target. It also stops on unmount, non-obsidian theme, reduced-motion, or non-fine pointer.
- **Smear smoothing factor 0.2**: Produces a tight chase — current reaches 50% of target in ~3 frames (~50ms). Fast enough to feel connected, slow enough to create a visible directional trail. Values above 0.25 eliminate the smear effect entirely (current == target), below 0.15 feel too detached.
- **Smear threshold 18px**: Prevents the effect from appearing during micro-movements. The smear fades to 0 opacity below this threshold rather than abruptly disappearing — the opacity formula `distance / 220` produces a smooth ramp from 0 to ~0.08 at the threshold.
- **Increased opacities**: All boosted values still below 0.15 for reds and 0.065 for whites. The look is visible but not overwhelming. Further tuning may be wanted after human review.
- **PUBLIC VERDICT label**: Large 28px text at 0.065 opacity in page center. On very long content pages it may peek through if the scroll viewport changes — this is by design (ambient background layer) and non-interactive.
- **Tag rotation at -1.5deg**: May cause layout shift concerns. Already gated behind reduced-motion. If tags are used in tight horizontal lists, the rotation could cause misalignment.
- **Not committed**: Per task specification — changes are uncommitted and ready for review.
## 11. Review repair pass

Fixed after review:

- Cursor smear no longer runs a permanent RAF loop on the default obsidian theme. It starts on mouse movement and stops when settled.
- Cursor smear is gated by `(hover: hover) and (pointer: fine)` and `prefers-reduced-motion`.
- Runtime media-query changes are handled for both reduced-motion and pointer capability.
- Cursor z-index was lowered from the global overlay layer to the normal decorative layer.
- Verdict label z-index was raised above the obsidian dotted center divider.
- Report entries were corrected from stale `CursorFocus` wording to `CursorSmear`, and documented values now match the implementation.

Validation after repair:

- `npx tsc --noEmit` — passed.
- `npm run test` — passed (`58` files, `402` tests).
- `npm run lint` — passed.
- `npm run build` — passed. Existing Primer `@position-try` and large chunk warnings remain.
