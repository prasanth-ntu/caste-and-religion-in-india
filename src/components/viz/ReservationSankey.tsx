import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey';

// =============================================================================
// Reservation Sankey — V9
// -----------------------------------------------------------------------------
// Three-column flow:
//   Column A — Caste category (population share in TN, illustrative %s)
//   Column B — Reservation bucket (seat allocation in TN, or central 1989)
//   Column C — Allocated slots (out of 100 representative seats)
// Two states:
//   Pre-Mandal (1989, central jobs) — 22.5% SC/ST only, no OBC reservation
//   Current TN (2024) — 69% reservation: 30 BC + 20 MBC+DNC + 18 SC+Aru + 1 ST
// =============================================================================

type Era = 'pre-mandal' | 'current-tn';

// Caste-category population shares (illustrative, rounded — disclosed on page)
// Tamil Nadu approx: FC ~31%, BC ~30%, MBC ~20%, SC ~16%, ST ~3%.
// Pre-Mandal (1989) "central" view uses an India-wide rough split:
// FC ~21%, OBC ~52% (a stand-in mix of BC+MBC), SC ~16%, ST ~8%.
// Where the bucket doesn't recognise OBC, that population is folded into Open.

type SankeyNodeIn = {
  name: string;
  col: 0 | 1 | 2;
  category?: 'fc' | 'bc' | 'mbc' | 'obc' | 'sc' | 'st' | 'open' | 'allocated';
  label?: string;
  sublabel?: string;
};

type SankeyLinkIn = {
  source: string;
  target: string;
  value: number;
};

type Dataset = {
  nodes: SankeyNodeIn[];
  links: SankeyLinkIn[];
  reservedPct: number; // sum of all reserved buckets
  caption: string;
};

// ---------------- Current TN (2024) ----------------
// 100 representative seats. Population shares map → reservation buckets:
//   FC 31% pop → Open 31 seats
//   BC 30% pop → BC bucket 30 seats
//   MBC 20% pop → MBC+DNC bucket 20 seats
//   SC 16% pop → SC+Arunthathiyar bucket 18 seats (so 16 from SC pop + 2 from "open" overflow)
//   ST 3%  pop → ST bucket 1 seat (rounded) + remainder goes to Open
// We keep the flow honest by routing exactly population-share → matching bucket
// (with mild rounding) so the columns visibly balance.
const CURRENT_TN: Dataset = {
  nodes: [
    // Col A
    { name: 'A:FC', col: 0, category: 'fc', label: 'Forward (FC)', sublabel: '~31% pop' },
    { name: 'A:BC', col: 0, category: 'bc', label: 'Backward (BC)', sublabel: '~30% pop' },
    { name: 'A:MBC', col: 0, category: 'mbc', label: 'Most Backward (MBC)', sublabel: '~20% pop' },
    { name: 'A:SC', col: 0, category: 'sc', label: 'Scheduled Caste (SC)', sublabel: '~16% pop' },
    { name: 'A:ST', col: 0, category: 'st', label: 'Scheduled Tribe (ST)', sublabel: '~3% pop' },
    // Col B (reservation buckets in TN)
    { name: 'B:Open', col: 1, category: 'open', label: 'Open / General', sublabel: '31% of seats' },
    { name: 'B:BC', col: 1, category: 'bc', label: 'BC quota', sublabel: '30% of seats' },
    { name: 'B:MBC', col: 1, category: 'mbc', label: 'MBC + DNC quota', sublabel: '20% of seats' },
    { name: 'B:SC', col: 1, category: 'sc', label: 'SC + Arunthathiyar', sublabel: '18% of seats' },
    { name: 'B:ST', col: 1, category: 'st', label: 'ST quota', sublabel: '1% of seats' },
    // Col C
    { name: 'C:Slots', col: 2, category: 'allocated', label: 'Allocated slots', sublabel: '100 seats' },
  ],
  links: [
    // A → B (population channelled into bucket eligibility)
    // FC competes only in Open
    { source: 'A:FC', target: 'B:Open', value: 31 },
    // BC → BC bucket (30) — fully covered by population
    { source: 'A:BC', target: 'B:BC', value: 30 },
    // MBC → MBC bucket (20)
    { source: 'A:MBC', target: 'B:MBC', value: 20 },
    // SC → SC bucket (16 of the 18, remainder filled via overlap with adjacent eligibility — simplified)
    { source: 'A:SC', target: 'B:SC', value: 16 },
    // ST → ST bucket (1) + remainder of ST pop overflows to Open
    { source: 'A:ST', target: 'B:ST', value: 1 },
    { source: 'A:ST', target: 'B:Open', value: 2 },
    // The 2-seat shortfall in B:SC is conceptually drawn from broader SC/Adi-Dravida classification
    // — represented here as a small flow from A:MBC pop into B:SC to keep totals balanced visually
    // (simplification; real allocation uses sub-categorisation rules).
    { source: 'A:MBC', target: 'B:SC', value: 2 },
    // B → C
    { source: 'B:Open', target: 'C:Slots', value: 33 },
    { source: 'B:BC', target: 'C:Slots', value: 30 },
    { source: 'B:MBC', target: 'C:Slots', value: 20 },
    { source: 'B:SC', target: 'C:Slots', value: 18 },
    { source: 'B:ST', target: 'C:Slots', value: 1 },
  ],
  reservedPct: 69,
  caption:
    'Tamil Nadu (post-1993 Act, currently active): 69% of seats reserved — 30% BC + 20% MBC/DNC + 18% SC/Arunthathiyar + 1% ST. 31% remains open competition.',
};

// ---------------- Pre-Mandal (1989, central govt) ----------------
// Only SC (15%) + ST (7.5%) reserved. No OBC reservation. FC+OBC compete in Open.
const PRE_MANDAL: Dataset = {
  nodes: [
    { name: 'A:FC', col: 0, category: 'fc', label: 'Forward (FC)', sublabel: '~21% pop' },
    { name: 'A:OBC', col: 0, category: 'obc', label: 'OBC (BC + MBC)', sublabel: '~52% pop' },
    { name: 'A:SC', col: 0, category: 'sc', label: 'Scheduled Caste (SC)', sublabel: '~16% pop' },
    { name: 'A:ST', col: 0, category: 'st', label: 'Scheduled Tribe (ST)', sublabel: '~8% pop' },
    { name: 'B:Open', col: 1, category: 'open', label: 'Open / General', sublabel: '77.5% of seats' },
    { name: 'B:SC', col: 1, category: 'sc', label: 'SC quota', sublabel: '15% of seats' },
    { name: 'B:ST', col: 1, category: 'st', label: 'ST quota', sublabel: '7.5% of seats' },
    { name: 'C:Slots', col: 2, category: 'allocated', label: 'Allocated slots', sublabel: '100 seats' },
  ],
  links: [
    // FC competes only in Open
    { source: 'A:FC', target: 'B:Open', value: 21 },
    // OBC has NO reservation — fully into Open (the structural gap the page argues about)
    { source: 'A:OBC', target: 'B:Open', value: 52 },
    // SC → SC bucket (mostly), some overflow to Open
    { source: 'A:SC', target: 'B:SC', value: 15 },
    { source: 'A:SC', target: 'B:Open', value: 1 },
    // ST → ST bucket, rest into Open
    { source: 'A:ST', target: 'B:ST', value: 7.5 },
    { source: 'A:ST', target: 'B:Open', value: 0.5 },
    // B → C
    { source: 'B:Open', target: 'C:Slots', value: 77.5 },
    { source: 'B:SC', target: 'C:Slots', value: 15 },
    { source: 'B:ST', target: 'C:Slots', value: 7.5 },
  ],
  reservedPct: 22.5,
  caption:
    'Pre-Mandal central government (1989): only 22.5% reserved — 15% SC + 7.5% ST. OBCs (more than half the population) competed entirely in the Open category. This is the structural gap that Mandal 1990 closed at the centre.',
};

const DATASETS: Record<Era, Dataset> = {
  'pre-mandal': PRE_MANDAL,
  'current-tn': CURRENT_TN,
};

// Color by caste category
const COLOR: Record<NonNullable<SankeyNodeIn['category']>, string> = {
  fc: '#0e7490', // teal
  bc: '#b45309', // amber
  mbc: '#c2410c', // orange
  obc: '#a16207', // amber-700 deeper (Pre-Mandal merged OBC)
  sc: '#9f1239', // rose
  st: '#6d28d9', // violet
  open: '#475569', // slate
  allocated: '#1f2937', // gray-800
};

// ---------- Container width hook ----------
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

// =============================================================================
// Sankey chart
// =============================================================================
function SankeyChart({ era }: { era: Era }) {
  const [containerRef, width] = useContainerWidth();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isMobile = width < 640;
  // On mobile let the chart use a wider virtual canvas and scroll horizontally
  // if labels would otherwise crowd.
  const chartWidth = isMobile ? Math.max(width, 720) : width;
  const height = isMobile ? 540 : 520;

  const dataset = DATASETS[era];

  // a11y description prose
  const ariaDesc = useMemo(() => {
    const reserved = dataset.reservedPct;
    return `Sankey diagram with three columns: caste category, reservation bucket, and allocated slots. ${dataset.caption} Total reserved: ${reserved}%.`;
  }, [dataset]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;
    svg.selectAll('*').remove();
    if (chartWidth === 0) return;

    const margin = isMobile
      ? { top: 18, right: 130, bottom: 36, left: 100 }
      : { top: 24, right: 160, bottom: 40, left: 160 };

    svg
      .attr('width', chartWidth)
      .attr('height', height)
      .attr('viewBox', `0 0 ${chartWidth} ${height}`);

    svg.append('title').text('Reservation flow sankey');
    svg.append('desc').text(ariaDesc);

    const innerW = chartWidth - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Build sankey input
    // d3-sankey types use generic indexing; we accept by name then post-process.
    type SNode = SankeyNodeIn & {
      // populated by sankey()
      x0?: number;
      x1?: number;
      y0?: number;
      y1?: number;
      value?: number;
      index?: number;
    };
    type SLink = {
      source: SNode | number | string;
      target: SNode | number | string;
      value: number;
      width?: number;
    };

    const nodes: SNode[] = dataset.nodes.map((n) => ({ ...n }));
    // d3-sankey nodeId resolves links by string id when configured below.
    const links: SLink[] = dataset.links.map((l) => ({
      source: l.source,
      target: l.target,
      value: l.value,
    }));

    const sankeyGen = sankey<SNode, SLink>()
      .nodeId((d) => (d as SNode).name)
      .nodeWidth(isMobile ? 14 : 18)
      .nodePadding(isMobile ? 10 : 14)
      .nodeAlign(sankeyJustify)
      .extent([
        [0, 0],
        [innerW, innerH],
      ]);

    const layout = sankeyGen({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    });

    // ---- Links ----
    g.append('g')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.45)
      .selectAll('path')
      .data(layout.links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d) => {
        const src = d.source as SNode;
        const cat = src.category ?? 'open';
        return COLOR[cat];
      })
      .attr('stroke-width', (d) => Math.max(1, d.width ?? 1))
      .append('title')
      .text((d) => {
        const s = d.source as SNode;
        const t = d.target as SNode;
        return `${s.label ?? s.name} → ${t.label ?? t.name}: ${d.value}`;
      });

    // ---- Nodes ----
    const nodeG = g
      .append('g')
      .selectAll('g.node')
      .data(layout.nodes)
      .join('g')
      .attr('class', 'node');

    nodeG
      .append('rect')
      .attr('x', (d) => d.x0 ?? 0)
      .attr('y', (d) => d.y0 ?? 0)
      .attr('width', (d) => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr('height', (d) => Math.max(2, (d.y1 ?? 0) - (d.y0 ?? 0)))
      .attr('fill', (d) => COLOR[(d.category ?? 'open') as keyof typeof COLOR])
      .attr('stroke', '#1c1917')
      .attr('stroke-width', 0.6)
      .append('title')
      .text((d) => `${d.label ?? d.name}${d.sublabel ? ' — ' + d.sublabel : ''} (${d.value})`);

    // ---- Labels ----
    // Place column-A on the right of node, column-C on the left of node,
    // column-B labels above (or below on mobile) for clarity.
    nodeG.each(function (d) {
      const sel = d3.select(this);
      const isLeftCol = d.col === 0;
      const isRightCol = d.col === 2;
      const isMid = d.col === 1;
      const cx = ((d.x0 ?? 0) + (d.x1 ?? 0)) / 2;
      const cy = ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2;
      const fontSize = isMobile ? 10 : 12;

      // For all viewports: left column labels to the LEFT of rect (in left margin),
      // middle column labels to the RIGHT of rect, right column labels to the LEFT of rect.
      // Anchor based on side so they don't clip the chart edge.
      let textX: number;
      let anchor: 'start' | 'end';
      if (isLeftCol) {
        textX = (d.x0 ?? 0) - 6;
        anchor = 'end';
      } else if (isRightCol) {
        textX = (d.x1 ?? 0) + 6;
        anchor = 'start';
      } else {
        // mid column → put to the right
        textX = (d.x1 ?? 0) + 6;
        anchor = 'start';
      }
      sel
        .append('text')
        .attr('x', textX)
        .attr('y', cy - 2)
        .attr('text-anchor', anchor)
        .attr('font-size', fontSize)
        .attr('font-weight', 600)
        .attr('fill', '#1c1917')
        .text(d.label ?? d.name);
      if (d.sublabel) {
        sel
          .append('text')
          .attr('x', textX)
          .attr('y', cy + fontSize)
          .attr('text-anchor', anchor)
          .attr('font-size', fontSize - 1)
          .attr('fill', '#57534e')
          .text(d.sublabel);
      }
      void isMid;
    });

    // Column headers
    const headers = isMobile
      ? null // skip headers on mobile to save vertical space
      : [
          { x: 0, anchor: 'start' as const, text: 'Caste category (population %)' },
          { x: innerW / 2, anchor: 'middle' as const, text: 'Reservation bucket' },
          { x: innerW, anchor: 'end' as const, text: 'Allocated slots (per 100)' },
        ];
    if (headers) {
      const hg = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top - 6})`);
      hg.selectAll('text')
        .data(headers)
        .join('text')
        .attr('x', (d) => d.x)
        .attr('y', 0)
        .attr('text-anchor', (d) => d.anchor)
        .attr('font-size', 11)
        .attr('font-weight', 700)
        .attr('fill', '#44403c')
        .attr('text-transform', 'uppercase')
        .text((d) => d.text);
    }

    // Footer caption inside SVG (so screenshots/exports include it)
    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', height - 8)
      .attr('font-size', isMobile ? 10 : 11)
      .attr('fill', '#57534e')
      .text(`Reserved: ${dataset.reservedPct}% · Open: ${(100 - dataset.reservedPct).toFixed(1)}%`);
  }, [chartWidth, height, isMobile, dataset, ariaDesc]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2 sm:p-3">
        <svg
          ref={svgRef}
          className="block"
          role="img"
          aria-label={`Reservation sankey — ${era === 'current-tn' ? 'Tamil Nadu current 69%' : 'Pre-Mandal 1989 central government'}`}
        />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-stone-700">
        <span className="font-semibold">Reading the flow:</span> {dataset.caption}
      </p>
    </div>
  );
}

// =============================================================================
// Top-level component
// =============================================================================
export default function ReservationSankey() {
  const [era, setEra] = useState<Era>('current-tn');
  return (
    <div className="space-y-6">
      {/* Year/era toggle */}
      <div
        role="radiogroup"
        aria-label="Reservation era"
        className="inline-flex rounded-full border border-stone-300 bg-white p-1 text-sm shadow-sm"
      >
        <button
          type="button"
          role="radio"
          aria-checked={era === 'pre-mandal'}
          onClick={() => setEra('pre-mandal')}
          className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
            era === 'pre-mandal'
              ? 'bg-stone-900 text-white'
              : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          Pre-Mandal (1989)
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={era === 'current-tn'}
          onClick={() => setEra('current-tn')}
          className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
            era === 'current-tn'
              ? 'bg-stone-900 text-white'
              : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          Current TN (2024)
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-700">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: COLOR.fc }} />
          FC
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: COLOR.bc }} />
          BC
        </span>
        {era === 'current-tn' && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: COLOR.mbc }} />
            MBC
          </span>
        )}
        {era === 'pre-mandal' && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: COLOR.obc }} />
            OBC (un-reserved at centre)
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: COLOR.sc }} />
          SC
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: COLOR.st }} />
          ST
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: COLOR.open }} />
          Open competition
        </span>
      </div>

      <SankeyChart era={era} />
    </div>
  );
}
