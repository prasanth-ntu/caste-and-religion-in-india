import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

export type TimelineEvent = {
  slug: string;
  year_start: number;
  year_end?: number;
  era: string; // 'Sangam' | 'Classical' | 'Medieval' | 'Colonial' | 'Modern' (loosely)
  title: string;
  summary: string;
  tier: 'green' | 'yellow' | 'red' | 'rational';
  category: string; // 'political' | 'religious' | 'codification' | 'reform' | 'social' | 'genetic' | 'legal' | 'colonial' | 'other'
};

type Props = {
  events: TimelineEvent[];
};

type EraName = 'Sangam' | 'Classical' | 'Medieval' | 'Colonial' | 'Modern';

const ERA_ORDER: EraName[] = ['Sangam', 'Classical', 'Medieval', 'Colonial', 'Modern'];

const ERA_RANGES: Record<EraName, { start: number; end: number }> = {
  Sangam: { start: -500, end: 300 },
  Classical: { start: 300, end: 900 },
  Medieval: { start: 900, end: 1750 },
  Colonial: { start: 1750, end: 1947 },
  Modern: { start: 1947, end: 2030 },
};

// low-saturation, tailwind-inspired stone/slate/amber/rose/sky tones
const ERA_COLORS: Record<EraName, { band: string; text: string; ring: string }> = {
  Sangam: { band: '#fef3c7', text: '#92400e', ring: '#fde68a' }, // amber-100/800
  Classical: { band: '#e7e5e4', text: '#44403c', ring: '#d6d3d1' }, // stone-200/700
  Medieval: { band: '#e2e8f0', text: '#334155', ring: '#cbd5e1' }, // slate-200/700
  Colonial: { band: '#ffe4e6', text: '#9f1239', ring: '#fecdd3' }, // rose-100/800
  Modern: { band: '#e0f2fe', text: '#075985', ring: '#bae6fd' }, // sky-100/800
};

const CATEGORY_META: Record<string, { color: string; icon: string; label: string }> = {
  political: { color: '#0f766e', icon: '⚔', label: 'Political' },
  religious: { color: '#a16207', icon: '🛕', label: 'Religious' },
  codification: { color: '#9f1239', icon: '📜', label: 'Codification' },
  colonial: { color: '#9f1239', icon: '📜', label: 'Colonial codification' },
  reform: { color: '#0369a1', icon: '⚖', label: 'Reform' },
  legal: { color: '#0369a1', icon: '⚖', label: 'Legal' },
  social: { color: '#7c3aed', icon: '👥', label: 'Social' },
  genetic: { color: '#be185d', icon: '🧬', label: 'Genetic' },
  other: { color: '#52525b', icon: '•', label: 'Other' },
};

const TIER_META: Record<TimelineEvent['tier'], { emoji: string; label: string; classes: string }> =
  {
    green: {
      emoji: '🟢',
      label: 'Well-established',
      classes: 'bg-green-50 text-green-800 ring-green-200',
    },
    yellow: {
      emoji: '🟡',
      label: 'Plausible / debated',
      classes: 'bg-amber-50 text-amber-800 ring-amber-200',
    },
    red: {
      emoji: '🔴',
      label: 'Myth / unverified',
      classes: 'bg-red-50 text-red-800 ring-red-200',
    },
    rational: {
      emoji: '⚖️',
      label: 'Rational basis',
      classes: 'bg-sky-50 text-sky-800 ring-sky-200',
    },
  };

function categoryFor(cat: string) {
  return CATEGORY_META[cat] ?? CATEGORY_META.other;
}

function eraColorsFor(era: string) {
  return (ERA_COLORS as Record<string, (typeof ERA_COLORS)[EraName]>)[era] ?? ERA_COLORS.Classical;
}

function formatYear(y: number): string {
  if (y < 0) return `${Math.abs(y)} BCE`;
  return `${y} CE`;
}

function TierBadge({ tier }: { tier: TimelineEvent['tier'] }) {
  const meta = TIER_META[tier];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset align-middle ${meta.classes}`}
      role="status"
      aria-label={`Evidence tier: ${meta.label}`}
    >
      <span aria-hidden="true">{meta.emoji}</span>
      <span>{meta.label}</span>
    </span>
  );
}

export default function ScrollyTimeline({ events }: Props) {
  // sort ascending by year_start
  const sorted = useMemo(() => [...events].sort((a, b) => a.year_start - b.year_start), [events]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const desktopCardRefs = useRef<Array<HTMLElement | null>>([]);
  const mobileCardRefs = useRef<Array<HTMLElement | null>>([]);
  const desktopSvgRef = useRef<SVGSVGElement | null>(null);
  const mobileSvgRef = useRef<SVGSVGElement | null>(null);
  const desktopContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileContainerRef = useRef<HTMLDivElement | null>(null);

  // mobile detection (also handles tablet narrow strip via CSS; JS only flips to bottom strip <640)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Scroll-driven active card detection: whichever card's vertical centre is
  // closest to the viewport's vertical centre is the active one. This is more
  // reliable than IntersectionObserver thresholds when cards are tall and the
  // user scrolls quickly through the middle band.
  useEffect(() => {
    if (sorted.length === 0) return;
    let rafId: number | null = null;

    const compute = () => {
      rafId = null;
      const vh = window.innerHeight;
      // Anchor a little above geometric centre so the active card aligns with
      // the user's natural reading focus (roughly the top third).
      const focusY = vh * 0.4;
      const refs = isMobile ? mobileCardRefs.current : desktopCardRefs.current;
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < refs.length; i++) {
        const el = refs[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        // Skip cards that have zero size (the hidden mobile/desktop duplicate
        // via Tailwind's `hidden`/`sm:hidden` classes).
        if (r.height === 0) continue;
        const mid = (r.top + r.bottom) / 2;
        const d = Math.abs(mid - focusY);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        setActiveIndex((prev) => (prev === bestIdx ? prev : bestIdx));
      }
    };

    const onScroll = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(compute);
    };

    // Run once on mount so the initial active card matches scroll position
    // (e.g., after a deep link or a refresh mid-page).
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [sorted, isMobile]);

  // shared min/max for the timeline scale (linear)
  const [minYear, maxYear] = useMemo(() => {
    if (sorted.length === 0) return [-500, 2030] as const;
    const ys: number[] = [];
    sorted.forEach((e) => {
      ys.push(e.year_start);
      if (e.year_end != null) ys.push(e.year_end);
    });
    // include era band extents so the bands always fully render
    ERA_ORDER.forEach((era) => {
      ys.push(ERA_RANGES[era].start, ERA_RANGES[era].end);
    });
    return [Math.min(...ys), Math.max(...ys)] as const;
  }, [sorted]);

  const scrollToEvent = useCallback(
    (idx: number) => {
      const refs = isMobile ? mobileCardRefs.current : desktopCardRefs.current;
      const el = refs[idx];
      if (el) {
        el.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }
    },
    [reducedMotion, isMobile],
  );

  // ---------- Desktop sticky vertical timeline (D3) ----------
  useEffect(() => {
    if (isMobile) return;
    const svg = desktopSvgRef.current;
    const container = desktopContainerRef.current;
    if (!svg || !container) return;

    const draw = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;

      const margin = { top: 24, right: 16, bottom: 24, left: 16 };
      const innerH = height - margin.top - margin.bottom;
      const axisX = width - 56; // axis on the right side of the inner panel

      const y = d3.scaleLinear().domain([minYear, maxYear]).range([margin.top, margin.top + innerH]);

      const sel = d3.select(svg);
      sel.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);
      sel.selectAll('*').remove();

      // era bands
      const bands = sel.append('g').attr('class', 'era-bands');
      ERA_ORDER.forEach((era) => {
        const r = ERA_RANGES[era];
        const y0 = y(Math.max(r.start, minYear));
        const y1 = y(Math.min(r.end, maxYear));
        bands
          .append('rect')
          .attr('x', 16)
          .attr('y', y0)
          .attr('width', width - 32)
          .attr('height', Math.max(0, y1 - y0))
          .attr('fill', ERA_COLORS[era].band)
          .attr('opacity', 0.55)
          .attr('rx', 6);
        bands
          .append('text')
          .attr('x', 24)
          .attr('y', y0 + 14)
          .attr('font-size', 10)
          .attr('font-weight', 600)
          .attr('letter-spacing', 0.6)
          .attr('fill', ERA_COLORS[era].text)
          .text(era.toUpperCase());
      });

      // axis line
      sel
        .append('line')
        .attr('x1', axisX)
        .attr('x2', axisX)
        .attr('y1', margin.top)
        .attr('y2', margin.top + innerH)
        .attr('stroke', '#a8a29e')
        .attr('stroke-width', 1);

      // axis ticks
      const ticks = y.ticks(6);
      const axisG = sel.append('g').attr('class', 'axis');
      ticks.forEach((t) => {
        axisG
          .append('line')
          .attr('x1', axisX - 4)
          .attr('x2', axisX + 4)
          .attr('y1', y(t))
          .attr('y2', y(t))
          .attr('stroke', '#78716c');
        axisG
          .append('text')
          .attr('x', axisX + 8)
          .attr('y', y(t) + 3)
          .attr('font-size', 10)
          .attr('fill', '#57534e')
          .text(formatYear(t));
      });

      // event markers
      const eventsG = sel.append('g').attr('class', 'events');
      sorted.forEach((ev, i) => {
        const cMeta = categoryFor(ev.category);
        const isActive = i === activeIndex;
        const yStart = y(ev.year_start);
        if (ev.year_end != null) {
          const yEnd = y(ev.year_end);
          eventsG
            .append('rect')
            .attr('x', axisX - 6)
            .attr('y', Math.min(yStart, yEnd))
            .attr('width', 12)
            .attr('height', Math.max(2, Math.abs(yEnd - yStart)))
            .attr('rx', 3)
            .attr('fill', cMeta.color)
            .attr('opacity', isActive ? 1 : 0.7);
        }
        // dot
        eventsG
          .append('circle')
          .attr('cx', axisX)
          .attr('cy', yStart)
          .attr('r', isActive ? 8 : 5)
          .attr('fill', cMeta.color)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2)
          .style('transition', reducedMotion ? 'none' : 'r 240ms ease, opacity 240ms ease')
          .attr('opacity', isActive ? 1 : 0.85);
        if (isActive) {
          // halo
          const halo = eventsG
            .append('circle')
            .attr('cx', axisX)
            .attr('cy', yStart)
            .attr('r', 8)
            .attr('fill', 'none')
            .attr('stroke', cMeta.color)
            .attr('stroke-width', 2)
            .attr('opacity', 0.6);
          if (!reducedMotion) {
            halo
              .transition()
              .duration(1400)
              .ease(d3.easeCubicOut)
              .attr('r', 22)
              .attr('opacity', 0)
              .on('end', function repeat() {
                d3.select(this)
                  .attr('r', 8)
                  .attr('opacity', 0.6)
                  .transition()
                  .duration(1400)
                  .ease(d3.easeCubicOut)
                  .attr('r', 22)
                  .attr('opacity', 0)
                  .on('end', repeat);
              });
          }
        }
      });

      // connector line from active dot to left edge (toward the prose card)
      if (sorted[activeIndex]) {
        const ev = sorted[activeIndex];
        const yStart = y(ev.year_start);
        sel
          .append('line')
          .attr('x1', 0)
          .attr('x2', axisX - 10)
          .attr('y1', yStart)
          .attr('y2', yStart)
          .attr('stroke', categoryFor(ev.category).color)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '3 3')
          .attr('opacity', 0.7);
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(container);
    return () => ro.disconnect();
  }, [sorted, activeIndex, isMobile, minYear, maxYear, reducedMotion]);

  // ---------- Mobile bottom strip (D3, horizontal) ----------
  useEffect(() => {
    if (!isMobile) return;
    const svg = mobileSvgRef.current;
    const container = mobileContainerRef.current;
    if (!svg || !container) return;

    const draw = () => {
      const width = Math.max(container.scrollWidth, container.clientWidth);
      const height = container.clientHeight;
      if (height === 0) return;

      // expanded virtual width so dots have breathing room when there are many events
      const virtualWidth = Math.max(container.clientWidth, sorted.length * 72 + 48);

      const margin = { top: 8, right: 24, bottom: 18, left: 24 };
      const innerW = virtualWidth - margin.left - margin.right;
      const axisY = height - margin.bottom;

      const x = d3.scaleLinear().domain([minYear, maxYear]).range([margin.left, margin.left + innerW]);

      const sel = d3.select(svg);
      sel
        .attr('width', virtualWidth)
        .attr('height', height)
        .attr('viewBox', `0 0 ${virtualWidth} ${height}`);
      sel.selectAll('*').remove();

      // era bands as a horizontal strip
      const bands = sel.append('g');
      ERA_ORDER.forEach((era) => {
        const r = ERA_RANGES[era];
        const x0 = x(Math.max(r.start, minYear));
        const x1 = x(Math.min(r.end, maxYear));
        bands
          .append('rect')
          .attr('y', 4)
          .attr('x', x0)
          .attr('height', height - 22)
          .attr('width', Math.max(0, x1 - x0))
          .attr('fill', ERA_COLORS[era].band)
          .attr('opacity', 0.5);
      });

      // axis
      sel
        .append('line')
        .attr('y1', axisY)
        .attr('y2', axisY)
        .attr('x1', margin.left)
        .attr('x2', margin.left + innerW)
        .attr('stroke', '#a8a29e');

      // tick labels (sparse)
      x.ticks(5).forEach((t) => {
        sel
          .append('text')
          .attr('x', x(t))
          .attr('y', axisY + 12)
          .attr('text-anchor', 'middle')
          .attr('font-size', 9)
          .attr('fill', '#57534e')
          .text(formatYear(t));
      });

      // event markers
      sorted.forEach((ev, i) => {
        const cMeta = categoryFor(ev.category);
        const isActive = i === activeIndex;
        const xStart = x(ev.year_start);
        if (ev.year_end != null) {
          const xEnd = x(ev.year_end);
          sel
            .append('rect')
            .attr('x', Math.min(xStart, xEnd))
            .attr('y', axisY - 8)
            .attr('width', Math.max(2, Math.abs(xEnd - xStart)))
            .attr('height', 4)
            .attr('rx', 2)
            .attr('fill', cMeta.color)
            .attr('opacity', isActive ? 1 : 0.65);
        }
        sel
          .append('circle')
          .attr('cx', xStart)
          .attr('cy', axisY - 6)
          .attr('r', isActive ? 7 : 4)
          .attr('fill', cMeta.color)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5);
      });
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(container);
    return () => ro.disconnect();
  }, [sorted, activeIndex, isMobile, minYear, maxYear]);

  // auto-scroll mobile strip to keep the active event in view
  useEffect(() => {
    if (!isMobile) return;
    const container = mobileContainerRef.current;
    if (!container) return;
    const targetBtn = container.querySelector<HTMLButtonElement>(
      `button[data-strip-idx="${activeIndex}"]`,
    );
    if (targetBtn) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = targetBtn.getBoundingClientRect();
      const offset =
        btnRect.left - containerRect.left - containerRect.width / 2 + btnRect.width / 2;
      container.scrollBy({ left: offset, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [activeIndex, isMobile, reducedMotion]);

  // keyboard nav across strip buttons
  const handleStripKey = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(sorted.length - 1, idx + 1);
      const btn = document.querySelector<HTMLButtonElement>(
        `button[data-strip-idx="${next}"]`,
      );
      btn?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(0, idx - 1);
      const btn = document.querySelector<HTMLButtonElement>(
        `button[data-strip-idx="${prev}"]`,
      );
      btn?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scrollToEvent(idx);
    }
  };

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
        No timeline events yet. Seed `src/content/timeline-events/` to populate.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Desktop / tablet layout */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_320px] sm:gap-8 lg:grid-cols-[1fr_420px] lg:gap-12">
        {/* Left: scrolling prose column */}
        <div>
          <ol className="space-y-12 sm:space-y-16">
            {sorted.map((ev, i) => {
              const eraStyle = eraColorsFor(ev.era);
              const cMeta = categoryFor(ev.category);
              const isActive = i === activeIndex;
              const headingId = `tl-${ev.slug}-heading`;
              return (
                <li key={ev.slug} className="list-none">
                  <article
                    ref={(el) => {
                      desktopCardRefs.current[i] = el;
                    }}
                    data-idx={i}
                    aria-labelledby={headingId}
                    className={`min-h-[40vh] scroll-mt-24 rounded-xl border bg-white p-6 shadow-sm transition-all duration-300 ${
                      isActive
                        ? 'border-stone-400 shadow-md ring-2 ring-stone-200'
                        : 'border-stone-200'
                    }`}
                    style={{
                      borderLeftWidth: 6,
                      borderLeftColor: isActive ? cMeta.color : eraStyle.ring,
                    }}
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset"
                        style={{
                          backgroundColor: eraStyle.band,
                          color: eraStyle.text,
                          // @ts-expect-error CSS custom prop
                          '--tw-ring-color': eraStyle.ring,
                        }}
                      >
                        {ev.era}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700"
                        title={cMeta.label}
                      >
                        <span aria-hidden="true">{cMeta.icon}</span>
                        <span>{cMeta.label}</span>
                      </span>
                      <span className="text-xs font-medium text-stone-500">
                        {formatYear(ev.year_start)}
                        {ev.year_end != null ? ` – ${formatYear(ev.year_end)}` : ''}
                      </span>
                    </div>
                    <h3
                      id={headingId}
                      className="text-xl font-bold text-stone-900 sm:text-2xl"
                    >
                      {ev.title}
                    </h3>
                    <p className="mt-3 text-stone-700">{ev.summary}</p>
                    <div className="mt-4">
                      <TierBadge tier={ev.tier} />
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Right: sticky D3 timeline */}
        <div className="relative">
          <div
            ref={desktopContainerRef}
            className="sticky top-20 h-[calc(100vh-6rem)] rounded-xl border border-stone-200 bg-white p-2"
            aria-hidden="true"
          >
            <svg ref={desktopSvgRef} className="block h-full w-full" />
          </div>
        </div>
      </div>

      {/* Mobile layout — single column with bottom-pinned strip */}
      <div className="sm:hidden">
        <ol className="space-y-8 pb-28">
          {sorted.map((ev, i) => {
            const eraStyle = eraColorsFor(ev.era);
            const cMeta = categoryFor(ev.category);
            const isActive = i === activeIndex;
            const headingId = `tl-m-${ev.slug}-heading`;
            return (
              <li key={ev.slug} className="list-none">
                <article
                  ref={(el) => {
                    mobileCardRefs.current[i] = el;
                  }}
                  data-idx={i}
                  aria-labelledby={headingId}
                  className={`min-h-[60vh] scroll-mt-20 rounded-xl border bg-white p-5 shadow-sm transition-all duration-300 ${
                    isActive ? 'border-stone-400 shadow-md ring-2 ring-stone-200' : 'border-stone-200'
                  }`}
                  style={{
                    borderLeftWidth: 6,
                    borderLeftColor: isActive ? cMeta.color : eraStyle.ring,
                  }}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ backgroundColor: eraStyle.band, color: eraStyle.text }}
                    >
                      {ev.era}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {formatYear(ev.year_start)}
                      {ev.year_end != null ? ` – ${formatYear(ev.year_end)}` : ''}
                    </span>
                  </div>
                  <h3 id={headingId} className="text-lg font-bold text-stone-900">
                    {ev.title}
                  </h3>
                  <p className="mt-2 text-sm text-stone-700">{ev.summary}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <TierBadge tier={ev.tier} />
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-700"
                      title={cMeta.label}
                    >
                      <span aria-hidden="true">{cMeta.icon}</span>
                      <span>{cMeta.label}</span>
                    </span>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>

        {/* Bottom-pinned swipeable strip */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] backdrop-blur">
          <div
            ref={mobileContainerRef}
            className="relative h-16 w-full overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            {/* d3 background (era bands + axis) */}
            <svg
              ref={mobileSvgRef}
              className="pointer-events-none absolute inset-0 h-full"
              aria-hidden="true"
            />
            {/* overlay role=list buttons positioned by year */}
            <ul
              role="list"
              className="relative h-full"
              style={{
                width: Math.max(sorted.length * 72 + 48, 320),
              }}
            >
              {sorted.map((ev, i) => {
                const range = maxYear - minYear;
                const pct = ((ev.year_start - minYear) / range) * 100;
                const isActive = i === activeIndex;
                const cMeta = categoryFor(ev.category);
                return (
                  <li
                    key={ev.slug}
                    className="absolute inset-y-0"
                    style={{ left: `calc(${pct}% - 18px)` }}
                  >
                    <button
                      type="button"
                      data-strip-idx={i}
                      onClick={() => scrollToEvent(i)}
                      onKeyDown={(e) => handleStripKey(e, i)}
                      aria-label={`${ev.title}, ${formatYear(ev.year_start)}`}
                      aria-current={isActive ? 'true' : 'false'}
                      className={`flex h-full w-9 flex-col items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 ${
                        isActive ? 'bg-stone-100' : ''
                      }`}
                    >
                      <span
                        className="block rounded-full ring-2 ring-white"
                        style={{
                          backgroundColor: cMeta.color,
                          width: isActive ? 14 : 8,
                          height: isActive ? 14 : 8,
                          transition: reducedMotion ? 'none' : 'all 200ms ease',
                        }}
                      />
                      <span className="mt-1 text-[9px] font-medium text-stone-600">
                        {ev.year_start < 0
                          ? `${Math.abs(ev.year_start)}B`
                          : ev.year_start}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
