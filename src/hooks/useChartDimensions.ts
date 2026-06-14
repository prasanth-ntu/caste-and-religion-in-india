import { useEffect, useRef, useState } from 'react';

// =============================================================================
// useChartDimensions — the single shared sizing hook for every D3 viz island.
//
// Replaces the five divergent implementations that previously lived inside the
// charts (bare ResizeObserver, ResizeObserver + window.resize + window.innerWidth,
// two private `useContainerWidth` copies, an inline RO in FestivalCalendar, …).
//
// Guarantees one consistent contract:
//   • a single ResizeObserver on the container, rAF-coalesced + optional debounce
//   • SSR-safe: seeds a width, never touches `window` at module scope
//   • a robust 0-width fallback so charts never render into a blank 0px canvas
//   • one canonical mobile breakpoint (640 = Tailwind `sm`), overridable per chart
//   • `measured` flips true after the first real measurement — drives both the
//     `{measured && <svg/>}` render gate and the `data-hydrated` skeleton sentinel
// =============================================================================

export interface UseChartDimensionsOptions {
  /** SSR / pre-measure seed width in px. Default 800. */
  initialWidth?: number;
  /** Seed height in px. If omitted, height is derived from `aspect` or left undefined. */
  initialHeight?: number;
  /** Container width (px) at/under which `isMobile` is true. Default 640 (Tailwind `sm`). */
  breakpoint?: number;
  /** When set, height = round(width / aspect). e.g. 16/10. Ignored if the chart computes its own height. */
  aspect?: number;
  /** Lower clamp on width. Default 320. */
  minWidth?: number;
  /** Upper clamp on width. Optional. */
  maxWidth?: number;
  /** Trailing debounce (ms) on top of rAF coalescing. Default 120. Raise for heavy relayout (force sim, sankey). */
  debounceMs?: number;
}

export interface ChartDimensions {
  ref: React.RefObject<HTMLDivElement | null>;
  width: number;
  /** Defined only when `aspect` or `initialHeight` was provided; otherwise undefined. */
  height: number | undefined;
  isMobile: boolean;
  /** False until the first ResizeObserver callback resolves a real width. */
  measured: boolean;
}

function clampWidth(w: number, min: number, max?: number): number {
  let out = Math.max(min, w);
  if (max != null) out = Math.min(max, out);
  return out;
}

/**
 * Resolve a usable width from a ResizeObserver entry, falling back through the
 * DOM and finally the window when `contentRect.width` is 0 (which happens for
 * `display:contents`/late-laid-out islands right after hydration — the bug
 * KootamForceGraph previously worked around with a window.resize listener).
 */
function resolveWidth(entry: ResizeObserverEntry, el: HTMLElement): number {
  const fromEntry = entry.contentRect.width;
  if (fromEntry > 0) return fromEntry;
  const fromRect = el.getBoundingClientRect().width;
  if (fromRect > 0) return fromRect;
  if (el.clientWidth > 0) return el.clientWidth;
  if (typeof window !== 'undefined') return window.innerWidth;
  return 0;
}

export function useChartDimensions(opts: UseChartDimensionsOptions = {}): ChartDimensions {
  const {
    initialWidth = 800,
    initialHeight,
    breakpoint = 640,
    aspect,
    minWidth = 320,
    maxWidth,
    debounceMs = 120,
  } = opts;

  const ref = useRef<HTMLDivElement | null>(null);
  // Raw (unclamped) container width drives the mobile decision; `width` is the
  // clamped value charts draw with. Keeping them separate means a `maxWidth`
  // smaller than `breakpoint` can't wedge `isMobile` permanently true.
  const [rawWidth, setRawWidth] = useState(initialWidth);
  const [measured, setMeasured] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No ResizeObserver (very old/SSR-snapshot env): render once with the seed.
    if (typeof ResizeObserver === 'undefined') {
      setMeasured(true);
      return;
    }

    let rafId = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const apply = (raw: number) => {
      setRawWidth((prev) => (Math.abs(prev - raw) < 0.5 ? prev : raw));
      setMeasured(true);
    };

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const raw = resolveWidth(entry, el);
      if (raw <= 0) return;
      // rAF-coalesce, then trailing-debounce so heavy relayouts settle once.
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (debounceMs > 0) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => apply(raw), debounceMs);
        } else {
          apply(raw);
        }
      });
    });

    ro.observe(el);
    return () => {
      cancelAnimationFrame(rafId);
      if (timer) clearTimeout(timer);
      ro.disconnect();
    };
  }, [minWidth, maxWidth, debounceMs]);

  // Mobile decision uses the raw container width; drawing width is clamped.
  const isMobile = rawWidth <= breakpoint;
  const width = clampWidth(rawWidth, minWidth, maxWidth);
  let height: number | undefined = initialHeight;
  if (aspect != null && aspect > 0) height = Math.round(width / aspect);

  return { ref, width, height, isMobile, measured };
}
