import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

// =============================================================================
// Synthesized data (clearly disclosed in the UI alongside this component).
// Values are consistent with published findings from Reich 2009 / Moorjani 2013
// / Nakatsuka 2017 but are illustrative interpolations rather than verbatim
// figures from the papers. See the "synthesised data" caveat block on the page.
// =============================================================================

// -------- A. ANI/ASI admixture timeline ----------
// Representative South Indian middle-caste population. Years are calendar BCE/CE.
// % ANI = Ancestral North Indian fraction. ASI = 1 - ANI.
// Story: ~4000 BCE essentially pure ASI; ANI inflow ramps 2200 BCE – ~100 CE
// (i.e. ~4200–1900 BP, the Moorjani window); afterwards endogamy freezes the
// ratio.
type AdmixturePoint = {
  year: number; // negative = BCE, positive = CE
  ani: number; // 0..1
  aniLow: number; // uncertainty band lower bound
  aniHigh: number; // uncertainty band upper bound
};

const ADMIXTURE_SERIES: AdmixturePoint[] = [
  { year: -4000, ani: 0.02, aniLow: 0.0, aniHigh: 0.06 },
  { year: -3500, ani: 0.03, aniLow: 0.0, aniHigh: 0.08 },
  { year: -3000, ani: 0.05, aniLow: 0.01, aniHigh: 0.1 },
  { year: -2500, ani: 0.08, aniLow: 0.03, aniHigh: 0.14 },
  { year: -2200, ani: 0.14, aniLow: 0.08, aniHigh: 0.21 }, // ~4200 BP, admixture begins in earnest
  { year: -1800, ani: 0.22, aniLow: 0.15, aniHigh: 0.3 },
  { year: -1400, ani: 0.3, aniLow: 0.22, aniHigh: 0.38 },
  { year: -1000, ani: 0.37, aniLow: 0.29, aniHigh: 0.44 },
  { year: -600, ani: 0.42, aniLow: 0.35, aniHigh: 0.48 },
  { year: -200, ani: 0.45, aniLow: 0.39, aniHigh: 0.51 },
  { year: 100, ani: 0.47, aniLow: 0.41, aniHigh: 0.52 }, // ~1900 BP — endogamy locks in
  { year: 500, ani: 0.47, aniLow: 0.42, aniHigh: 0.52 },
  { year: 1000, ani: 0.47, aniLow: 0.42, aniHigh: 0.52 },
  { year: 1500, ani: 0.47, aniLow: 0.42, aniHigh: 0.52 },
  { year: 2000, ani: 0.47, aniLow: 0.42, aniHigh: 0.52 },
];

const ADMIXTURE_WINDOW = { start: -2200, end: 100 }; // ~4200 BP – ~1900 BP

// -------- B. Founder event severity ----------
// "IBD severity" — composite, approximated from Nakatsuka 2017 Fig 2 / SI.
// Higher = tighter bottleneck. Ashkenazi Jews & Finns shown for reference.
// Kongu Vellala flagged with a yellow caveat (likely not in the precise sample).
type FounderRow = {
  group: string;
  severity: number;
  kind: 'indian-jati' | 'reference' | 'highlight';
  note?: string;
};

const FOUNDER_DATA: FounderRow[] = [
  { group: 'Vysya (Andhra)', severity: 9.6, kind: 'indian-jati' },
  { group: 'Pattapu Kapu', severity: 8.4, kind: 'indian-jati' },
  { group: 'Kumhar (UP)', severity: 7.1, kind: 'indian-jati' },
  { group: 'Yadav (Bihar)', severity: 6.3, kind: 'indian-jati' },
  { group: 'Reddy', severity: 5.8, kind: 'indian-jati' },
  { group: 'Kongu Vellala (proxy)', severity: 5.5, kind: 'highlight', note: 'approximated — Kongu-specific data not in published sample' },
  { group: 'Mala', severity: 5.2, kind: 'indian-jati' },
  { group: 'Ashkenazi Jews', severity: 4.8, kind: 'reference' },
  { group: 'Patel (Gujarat)', severity: 4.4, kind: 'indian-jati' },
  { group: 'Dhangar (Maharashtra)', severity: 4.1, kind: 'indian-jati' },
  { group: 'Finns', severity: 3.7, kind: 'reference' },
  { group: 'Iyer (Tamil Brahmin)', severity: 3.2, kind: 'indian-jati' },
];

// =============================================================================
// Hook: container size with ResizeObserver (mirrors VarnaJatiRadial pattern).
// =============================================================================
function useContainerWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function formatYear(y: number): string {
  if (y < 0) return `${Math.abs(y)} BCE`;
  if (y === 0) return '0';
  return `${y} CE`;
}

// =============================================================================
// Chart A: ANI/ASI stacked area
// =============================================================================
function AdmixtureChart() {
  const [containerRef, width] = useContainerWidth();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isMobile = width < 640;
  const height = isMobile ? 320 : 420;
  // On mobile, force a wider virtual chart and let the wrapper scroll horizontally.
  const chartWidth = isMobile ? Math.max(width, 560) : width;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;
    svg.selectAll('*').remove();
    if (chartWidth === 0) return;

    const margin = { top: 32, right: 24, bottom: 48, left: isMobile ? 44 : 56 };
    const innerW = chartWidth - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg
      .attr('width', chartWidth)
      .attr('height', height)
      .attr('viewBox', `0 0 ${chartWidth} ${height}`);

    // Title / desc for a11y
    svg.append('title').text('ANI and ASI ancestry over time for a representative South Indian population');
    svg
      .append('desc')
      .text(
        'Stacked area chart showing ASI (Ancestral South Indian) declining and ANI (Ancestral North Indian) rising between roughly 2200 BCE and 100 CE, then frozen by endogamy. Uncertainty band shown around the ANI/ASI boundary.',
      );

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleLinear()
      .domain([-4000, 2000])
      .range([0, innerW]);
    const y = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);

    // -------- Stacked areas: ASI (bottom) and ANI (top) --------
    // Actually we'll draw two filled areas: ASI from 0..(1-ANI), ANI from (1-ANI)..1.
    const asiArea = d3
      .area<AdmixturePoint>()
      .x((d) => x(d.year))
      .y0(y(0))
      .y1((d) => y(1 - d.ani))
      .curve(d3.curveMonotoneX);

    const aniArea = d3
      .area<AdmixturePoint>()
      .x((d) => x(d.year))
      .y0((d) => y(1 - d.ani))
      .y1(y(1))
      .curve(d3.curveMonotoneX);

    // Admixture window background highlight
    g.append('rect')
      .attr('x', x(ADMIXTURE_WINDOW.start))
      .attr('y', 0)
      .attr('width', x(ADMIXTURE_WINDOW.end) - x(ADMIXTURE_WINDOW.start))
      .attr('height', innerH)
      .attr('fill', '#fef3c7')
      .attr('opacity', 0.55);

    // ASI area
    g.append('path')
      .datum(ADMIXTURE_SERIES)
      .attr('fill', '#0e7490') // teal-700 — ASI
      .attr('fill-opacity', 0.85)
      .attr('d', asiArea);

    // ANI area
    g.append('path')
      .datum(ADMIXTURE_SERIES)
      .attr('fill', '#b45309') // amber-700 — ANI
      .attr('fill-opacity', 0.85)
      .attr('d', aniArea);

    // Uncertainty band around the ANI/ASI boundary
    const bandArea = d3
      .area<AdmixturePoint>()
      .x((d) => x(d.year))
      .y0((d) => y(1 - d.aniLow))
      .y1((d) => y(1 - d.aniHigh))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(ADMIXTURE_SERIES)
      .attr('fill', '#ffffff')
      .attr('fill-opacity', 0.35)
      .attr('stroke', '#1c1917')
      .attr('stroke-width', 0.8)
      .attr('stroke-dasharray', '2 3')
      .attr('d', bandArea);

    // Boundary line itself
    const boundaryLine = d3
      .line<AdmixturePoint>()
      .x((d) => x(d.year))
      .y((d) => y(1 - d.ani))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(ADMIXTURE_SERIES)
      .attr('fill', 'none')
      .attr('stroke', '#1c1917')
      .attr('stroke-width', 1.6)
      .attr('d', boundaryLine);

    // -------- Axes --------
    // X axis
    const xAxisG = g
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues([-4000, -3000, -2000, -1000, 0, 1000, 2000])
          .tickFormat((d) => formatYear(d as number)),
      );
    xAxisG.selectAll('text').attr('fill', '#44403c').attr('font-size', 11);
    xAxisG.selectAll('line').attr('stroke', '#78716c');
    xAxisG.select('.domain').attr('stroke', '#78716c');

    // X axis label
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + 38)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('fill', '#44403c')
      .text('Time');

    // Y axis
    const yAxisG = g.append('g').call(
      d3
        .axisLeft(y)
        .ticks(5)
        .tickFormat((d) => `${Math.round((d as number) * 100)}%`),
    );
    yAxisG.selectAll('text').attr('fill', '#44403c').attr('font-size', 11);
    yAxisG.selectAll('line').attr('stroke', '#78716c');
    yAxisG.select('.domain').attr('stroke', '#78716c');

    // Y axis label (rotated)
    g.append('text')
      .attr('transform', `translate(${-margin.left + 14},${innerH / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('fill', '#44403c')
      .text('Ancestry share');

    // -------- Annotations --------
    // Vertical marker at ~100 CE — "endogamy begins"
    const endogamyX = x(100);
    g.append('line')
      .attr('x1', endogamyX)
      .attr('x2', endogamyX)
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#9f1239')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 4');

    // Annotation pill ("~1900 BP — admixture ends, endogamy begins")
    const annoText = isMobile ? 'endogamy begins (~1900 BP)' : '~1900 BP — admixture ends, endogamy locks in';
    const annoPad = 6;
    const annoFontSize = isMobile ? 10 : 11;
    const tempText = g
      .append('text')
      .attr('font-size', annoFontSize)
      .attr('font-weight', 600)
      .attr('fill', '#9f1239')
      .text(annoText);
    const bbox = (tempText.node() as SVGTextElement).getBBox();
    tempText.remove();
    const annoW = bbox.width + annoPad * 2;
    const annoH = bbox.height + annoPad;
    // Position label above marker (or to the left if it would overflow)
    let annoX = endogamyX - annoW - 6;
    if (annoX < 4) annoX = endogamyX + 6;
    const annoY = 14;
    g.append('rect')
      .attr('x', annoX)
      .attr('y', annoY - annoH + 2)
      .attr('width', annoW)
      .attr('height', annoH)
      .attr('rx', 4)
      .attr('fill', '#ffe4e6')
      .attr('stroke', '#fb7185')
      .attr('stroke-width', 1);
    g.append('text')
      .attr('x', annoX + annoPad)
      .attr('y', annoY - 2)
      .attr('font-size', annoFontSize)
      .attr('font-weight', 600)
      .attr('fill', '#9f1239')
      .text(annoText);

    // Bracket spanning the admixture window
    const bracketY = innerH - 14;
    g.append('line')
      .attr('x1', x(ADMIXTURE_WINDOW.start))
      .attr('x2', x(ADMIXTURE_WINDOW.end))
      .attr('y1', bracketY)
      .attr('y2', bracketY)
      .attr('stroke', '#92400e')
      .attr('stroke-width', 2);
    g.append('text')
      .attr('x', (x(ADMIXTURE_WINDOW.start) + x(ADMIXTURE_WINDOW.end)) / 2)
      .attr('y', bracketY - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', isMobile ? 9 : 11)
      .attr('font-weight', 600)
      .attr('fill', '#92400e')
      .text('Admixture window (Moorjani 2013)');

    // -------- In-chart labels for the two areas --------
    g.append('text')
      .attr('x', x(-3500))
      .attr('y', y(0.5))
      .attr('font-size', isMobile ? 12 : 14)
      .attr('font-weight', 700)
      .attr('fill', '#ffffff')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#0e7490')
      .attr('stroke-width', 3)
      .text('ASI');

    g.append('text')
      .attr('x', x(1200))
      .attr('y', y(0.78))
      .attr('font-size', isMobile ? 12 : 14)
      .attr('font-weight', 700)
      .attr('fill', '#ffffff')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#b45309')
      .attr('stroke-width', 3)
      .text('ANI');
  }, [chartWidth, height, isMobile]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-700">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: '#b45309' }} />
          ANI (Ancestral North Indian)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: '#0e7490' }} />
          ASI (Ancestral South Indian)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: '#fef3c7' }} />
          Admixture window
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3"
            style={{ background: '#9f1239', clipPath: 'polygon(40% 0, 60% 0, 60% 100%, 40% 100%)' }}
          />
          Endogamy onset
        </span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2 sm:p-3">
        <svg ref={svgRef} className="block" role="img" aria-label="ANI / ASI admixture timeline" />
      </div>
    </div>
  );
}

// =============================================================================
// Chart B: Founder-event severity bar chart
// =============================================================================
function FounderChart() {
  const [containerRef, width] = useContainerWidth();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isMobile = width < 640;

  const sorted = useMemo(
    () => [...FOUNDER_DATA].sort((a, b) => b.severity - a.severity),
    [],
  );

  // Mobile uses a slightly taller chart since we keep the bars horizontal but
  // give labels more vertical real estate (longer label column).
  const rowHeight = isMobile ? 26 : 30;
  const margin = isMobile
    ? { top: 28, right: 24, bottom: 36, left: 150 }
    : { top: 32, right: 32, bottom: 40, left: 200 };
  const innerH = sorted.length * rowHeight;
  const height = innerH + margin.top + margin.bottom;
  const chartWidth = width === 0 ? 800 : width;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;
    svg.selectAll('*').remove();
    if (chartWidth === 0) return;

    svg.attr('width', chartWidth).attr('height', height).attr('viewBox', `0 0 ${chartWidth} ${height}`);

    svg.append('title').text('Founder-event severity across selected populations');
    svg
      .append('desc')
      .text(
        'Horizontal bar chart of IBD-based founder-event severity for selected Indian jatis and reference populations (Ashkenazi Jews, Finns). Higher values indicate tighter genetic bottlenecks. Kongu Vellala (proxy estimate) highlighted.',
      );

    const innerW = chartWidth - margin.left - margin.right;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const maxSev = d3.max(sorted, (d) => d.severity) ?? 10;
    const x = d3.scaleLinear().domain([0, Math.ceil(maxSev + 1)]).range([0, innerW]);
    const y = d3
      .scaleBand<string>()
      .domain(sorted.map((d) => d.group))
      .range([0, innerH])
      .padding(0.25);

    // Vertical gridlines
    const tickVals = x.ticks(5);
    g.append('g')
      .selectAll('line')
      .data(tickVals)
      .join('line')
      .attr('x1', (d) => x(d))
      .attr('x2', (d) => x(d))
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#e7e5e4')
      .attr('stroke-width', 1);

    // Bars
    const bars = g
      .append('g')
      .selectAll('g.row')
      .data(sorted)
      .join('g')
      .attr('class', 'row')
      .attr('transform', (d) => `translate(0,${y(d.group) ?? 0})`);

    bars
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', (d) => x(d.severity))
      .attr('height', y.bandwidth())
      .attr('rx', 3)
      .attr('fill', (d) => {
        if (d.kind === 'highlight') return '#f43f5e'; // rose-500 — Kongu Vellala
        if (d.kind === 'reference') return '#64748b'; // slate-500 — reference pops
        return '#0d9488'; // teal-600 — Indian jatis
      })
      .attr('fill-opacity', (d) => (d.kind === 'reference' ? 0.7 : 0.92))
      .attr('stroke', (d) => (d.kind === 'highlight' ? '#9f1239' : 'none'))
      .attr('stroke-width', (d) => (d.kind === 'highlight' ? 2 : 0));

    // Value labels (at end of each bar)
    bars
      .append('text')
      .attr('x', (d) => x(d.severity) + 6)
      .attr('y', y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('font-size', isMobile ? 10 : 11)
      .attr('font-weight', 600)
      .attr('fill', '#44403c')
      .text((d) => d.severity.toFixed(1));

    // Y axis category labels
    g.append('g')
      .selectAll('text')
      .data(sorted)
      .join('text')
      .attr('x', -8)
      .attr('y', (d) => (y(d.group) ?? 0) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-size', isMobile ? 10 : 12)
      .attr('font-weight', (d) => (d.kind === 'highlight' ? 700 : 500))
      .attr('fill', (d) => {
        if (d.kind === 'highlight') return '#9f1239';
        if (d.kind === 'reference') return '#475569';
        return '#1c1917';
      })
      .text((d) => (d.kind === 'highlight' ? `★ ${d.group}` : d.group));

    // X axis at bottom
    const xAxisG = g
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(5));
    xAxisG.selectAll('text').attr('fill', '#44403c').attr('font-size', 11);
    xAxisG.selectAll('line').attr('stroke', '#78716c');
    xAxisG.select('.domain').attr('stroke', '#78716c');

    // X axis label
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + 32)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('fill', '#44403c')
      .text('Founder-event severity (IBD-based, higher = tighter bottleneck)');
  }, [chartWidth, height, sorted, isMobile, innerH, margin.bottom, margin.left, margin.right, margin.top]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-700">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: '#0d9488' }} />
          Indian jati
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: '#64748b' }} />
          Reference population
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm ring-1 ring-rose-900" style={{ background: '#f43f5e' }} />
          Kongu Vellala (proxy)
        </span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2 sm:p-3">
        <svg ref={svgRef} className="block" role="img" aria-label="Founder-event severity by population" />
      </div>
    </div>
  );
}

// =============================================================================
// Top-level component
// =============================================================================
export default function GeneticsChart() {
  return (
    <div className="space-y-12">
      <section>
        <header className="mb-4">
          <h2 className="text-2xl font-bold text-stone-900">
            ANI / ASI ancestry over four millennia
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            How a representative South Indian middle-caste population's ancestry shifted from
            near-pure ASI to the modern ~50/50 mix — and then froze.
          </p>
        </header>
        <AdmixtureChart />
      </section>

      <section>
        <header className="mb-4">
          <h2 className="text-2xl font-bold text-stone-900">
            Founder-event severity across populations
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Many Indian jatis show tighter genetic bottlenecks than the famously
            founder-event-heavy Ashkenazi Jews and Finns. Bars sorted by severity (descending).
          </p>
        </header>
        <FounderChart />
      </section>
    </div>
  );
}
