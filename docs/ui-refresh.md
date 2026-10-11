# Customer-ops UI refresh

The console retains the existing Base UI / shadcn primitives, Lucide icons,
synthetic fixtures, routes and safety boundaries. TasteSkill informs the separate
portfolio, not the dashboard. No marketing hero, decorative 3D scene or fictional
metrics were added to the workspace.

## Changes

- Neutral gray/white surfaces, emerald commands and semantic status colours.
- Unframed, clickable queue metrics instead of decorative metric cards.
- Queue distribution replaces the static principles card and links to status filters.
- Status and normalized search compose; priority sorting does not mutate fixtures.
- Explicit empty state, clear-search and clear-filter actions.
- Stable, named icon navigation on narrow screens.
- Seven inspectable graph nodes and a boundary/trace inspector.
- Completion comes from the returned trace. Pending runs do not pretend to stream
  individual node progress. Skipped drafting follows the received model status.
- Scoped GSAP section and result transitions, reverted on teardown and skipped
  for reduced motion. GSAP 3.15.0 and @gsap/react 2.1.2 are pinned.

## Verification

TypeScript check and production build pass. All 41 foundation tests pass, including
three new queue tests. The 650-case deterministic benchmark passes; it is not a
measurement of live Ollama quality.

Playwright verified metric filtering, combined search, sorting, clearing, empty
states, the evidence-only investigation and graph selection before/after a run.
The graph UI test intercepts the HTTP response with a locally calculated graph
result. It does not call Ollama, persist to Supabase or write to external tools.
Desktop WCAG automated checks report no violations. At 320, 390, 768 and 1440px,
the graph has no document overflow or clipped controls. The queue table retains
its own horizontal scroll on narrow screens.

Vinext dev startup can take several seconds before hydration. An intermittent
Base UI input-style hydration warning was observed during hot reload; navigation
and controls were verified after hydration. Production build succeeds, but no
deployment or live-connector validation was performed in this UI task.

No secrets or environment files were changed, staged, committed or pushed.
