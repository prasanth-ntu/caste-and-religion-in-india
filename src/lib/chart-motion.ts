import * as d3 from 'd3';

// =============================================================================
// chart-motion — shared motion primitives for the D3 viz layer.
//
// Replaces the `prefersReducedMotion()` copy pasted into every chart and the
// near-identical "fade + lift, capped delay" entry loop in Genetics / Kootam /
// VarnaJati. Durations/easing mirror the CSS motion tokens in global.css so
// SVG animation stays coherent with the rest of the site.
// =============================================================================

/** Motion tokens — mirror of `--dur-*` / `--ease-editorial` in src/styles/global.css. */
export const MOTION = {
  fast: 160,
  base: 260,
  slow: 420,
  /** Matches `--ease-editorial: cubic-bezier(0.22, 1, 0.36, 1)`. */
  easeEditorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface StaggerOptions {
  /** Whether the chart has entered the viewport yet (from useInView). */
  inView: boolean;
  /** Per-item delay multiplier in ms. Default 6. */
  delayPer?: number;
  /** Extra delay weighted by hierarchy depth. Default 60. */
  depthWeight?: number;
  /** Max total delay so late items don't lag. Default 600. */
  cap?: number;
  /** Fade duration in ms. Default MOTION.base + a touch (360). */
  duration?: number;
}

/**
 * Apply the canonical staggered fade-in entry to a D3 selection of `<g>` nodes.
 * No-op (everything visible) when reduced motion is requested. Holds nodes
 * hidden until `inView` is true so the animation plays on scroll-in, not on mount.
 *
 * `depthAccessor` lets hierarchy charts weight the delay by tree depth; pass
 * `() => 0` for flat selections.
 */
export function staggerEntry<Datum>(
  selection: d3.Selection<d3.BaseType | SVGGElement, Datum, d3.BaseType, unknown>,
  depthAccessor: (d: Datum) => number,
  opts: StaggerOptions,
): void {
  const { inView, delayPer = 6, depthWeight = 60, cap = 600, duration = 360 } = opts;
  const reduced = prefersReducedMotion();

  if (reduced) return; // respect reduced motion: leave nodes at full opacity

  if (!inView) {
    selection.style('opacity', 0);
    return;
  }

  selection.each(function (d, i) {
    const sel = d3.select(this);
    const delay = Math.min(depthAccessor(d) * depthWeight + i * delayPer, cap);
    sel
      .style('opacity', 0)
      .style('transition', `opacity ${duration}ms ${MOTION.easeEditorial} ${delay}ms`);
    requestAnimationFrame(() => sel.style('opacity', null));
  });
}
