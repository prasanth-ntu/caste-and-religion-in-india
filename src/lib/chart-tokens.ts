// =============================================================================
// chart-tokens — JS mirror of the design tokens in src/styles/global.css, for
// the D3 viz layer where `.attr('stroke', …)` needs literal color strings and
// CSS `var(--…)` can't be used.
//
// SINGLE SOURCE OF TRUTH IS global.css. Keep these in sync with the matching
// `--token` there (line refs below). Static mirror is intentional: it's SSR-safe
// and FOUC-free, where a runtime getComputedStyle read would be client-only.
// =============================================================================

/** Foreground cascade — global.css :39-44 (--fg-1 … --fg-muted). */
export const FG = {
  1: '#1c1917', // headlines / ink
  2: '#44403c', // body prose
  3: '#57534e', // descriptions
  4: '#78716c', // meta / captions
  muted: '#a8a29e', // decorative / placeholder
} as const;

/** Background surfaces — global.css :47-49. */
export const BG = {
  paper: '#fafaf9',
  cream: '#fdfcf9',
  white: '#ffffff',
} as const;

/** Chart-specific neutrals — global.css :70-74 (--chart-*). */
export const CHART = {
  /** Default link/branch stroke. Darker than the old stone-300 for legibility. */
  link: '#a8a29e',
  /** Active / on-path link + emphasized stroke. */
  linkActive: '#1c1917',
  /** Gridlines. */
  grid: '#e7e5e4',
  /** Axis lines / ticks. */
  axis: '#78716c',
  /** Halo behind SVG text labels for contrast against busy backgrounds. */
  labelHalo: '#ffffff',
} as const;

/** Evidence tier hues — global.css :17-20 / :52-55. */
export const TIER = {
  green: '#047857',
  yellow: '#b45309',
  red: '#be123c',
  rational: '#6d28d9',
  green50: '#ecfdf5',
  yellow50: '#fffbeb',
  red50: '#fef2f2',
  rational50: '#f5f3ff',
} as const;

/** Pillar accents — global.css :58-61. */
export const PILLAR = {
  overview: '#4338ca',
  lineage: '#047857',
  rituals: '#be123c',
  sources: '#0369a1',
} as const;

/**
 * Lineage mini-map / tree palette. The locator + reactive client scripts + the
 * SSR renderer all read these so highlight colors never drift between paths.
 *   a   — primary highlight (indigo-700, "Lineage A" / "you are here")
 *   b   — compare secondary (amber-700, "Lineage B")
 *   lca — lowest common ancestor marker (violet-700)
 */
export const LINEAGE = {
  a: '#4338ca',
  b: '#b45309',
  lca: '#6d28d9',
  node: '#d6d3d1', // stone-300
  nodeStroke: '#a8a29e', // stone-400
  edge: '#e7e5e4', // stone-200
  label: '#44403c', // stone-700
} as const;

/** Per-level node colors for the interactive chart — mirrors LEVEL_COLOR. */
export const LEVEL_COLOR: Record<
  string,
  { fill: string; stroke: string; text: string; label: string }
> = {
  root: { fill: '#78716c', stroke: '#44403c', text: '#1c1917', label: 'Society' },
  varna: { fill: '#3b82f6', stroke: '#1d4ed8', text: '#1e3a8a', label: 'Varna' },
  'caste-cluster': { fill: '#f59e0b', stroke: '#b45309', text: '#78350f', label: 'Caste cluster' },
  jati: { fill: '#f59e0b', stroke: '#b45309', text: '#78350f', label: 'Jati' },
  'sub-jati': { fill: '#10b981', stroke: '#047857', text: '#064e3b', label: 'Sub-jati' },
  kootam: { fill: '#f43f5e', stroke: '#be123c', text: '#881337', label: 'Kootam' },
  'temple-clan': { fill: '#8b5cf6', stroke: '#6d28d9', text: '#4c1d95', label: 'Temple-clan (Koil)' },
};

/**
 * Categorical data ramp — global.css :76-81 (--cat-1 … --cat-6). Colorblind-aware,
 * tuned to sit on the paper/ink editorial palette. Use for nominal series; do NOT
 * use the tier/pillar hues for arbitrary categories (they carry fixed meaning).
 */
export const CATEGORICAL = [
  '#4338ca', // indigo
  '#0369a1', // sky
  '#047857', // emerald
  '#b45309', // amber
  '#be123c', // rose
  '#6d28d9', // violet
] as const;
