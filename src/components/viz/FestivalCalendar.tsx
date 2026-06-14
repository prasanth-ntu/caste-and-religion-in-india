import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { useInView } from '../../hooks/useInView';
import { CHART, FG, BG } from '../../lib/chart-tokens';

/**
 * Radial Tamil-month festival calendar for Konur Kaliamman.
 *
 * NOTE: "current Tamil month" is approximated from the Gregorian month — the
 * Tamil solar months do not start on the 1st of each Gregorian month, and a
 * precise mapping would require a Panchangam library. The today-marker is
 * therefore flagged as approximate in the legend.
 */

type Tier = 'green' | 'yellow' | 'red' | 'rational';

interface Festival {
  id: string;
  monthIndex: number; // 0..11, index into TAMIL_MONTHS
  // Position within the month segment, 0..1 (where in the month it falls)
  // 0.5 is middle of the month; used for visual placement only.
  position: number;
  name: { en: string; ta: string };
  blurb: string;
  ritual: string;
  tier: Tier;
  note?: string;
}

// Tamil months — solar calendar. roughGregStart is the rough Gregorian month
// the Tamil month begins in (1=Jan, 12=Dec).
const TAMIL_MONTHS: { en: string; ta: string; roughGregStart: number }[] = [
  { en: 'Chithirai', ta: 'சித்திரை', roughGregStart: 4 },   // mid-Apr
  { en: 'Vaikasi',   ta: 'வைகாசி',   roughGregStart: 5 },   // mid-May
  { en: 'Aani',      ta: 'ஆனி',      roughGregStart: 6 },   // mid-Jun
  { en: 'Aadi',      ta: 'ஆடி',      roughGregStart: 7 },   // mid-Jul
  { en: 'Avani',     ta: 'ஆவணி',     roughGregStart: 8 },   // mid-Aug
  { en: 'Purattasi', ta: 'புரட்டாசி', roughGregStart: 9 },   // mid-Sep
  { en: 'Aippasi',   ta: 'ஐப்பசி',    roughGregStart: 10 },  // mid-Oct
  { en: 'Karthigai', ta: 'கார்த்திகை', roughGregStart: 11 },  // mid-Nov
  { en: 'Margazhi',  ta: 'மார்கழி',  roughGregStart: 12 },  // mid-Dec
  { en: 'Thai',      ta: 'தை',       roughGregStart: 1 },   // mid-Jan
  { en: 'Maasi',     ta: 'மாசி',      roughGregStart: 2 },   // mid-Feb
  { en: 'Panguni',   ta: 'பங்குனி',   roughGregStart: 3 },   // mid-Mar
];

const FESTIVALS: Festival[] = [
  {
    id: 'aadi-velli',
    monthIndex: 3, // Aadi
    position: 0.3,
    name: { en: 'Aadi Velli', ta: 'ஆடி வெள்ளி' },
    blurb: 'Fridays in the month of Aadi — a Tamil-wide Amman-worship observance.',
    ritual:
      'Families visit village Amman shrines on Fridays during Aadi. Lamps lit (விளக்கு), turmeric (மஞ்சள்), neem leaves, and pongal cooked at the shrine. For Kadai Kootam families, several Aadi Fridays are timed for travel to Konur.',
    tier: 'green',
  },
  {
    id: 'aadi-pooram',
    monthIndex: 3, // Aadi
    position: 0.7,
    name: { en: 'Aadi Pooram', ta: 'ஆடி பூரம்' },
    blurb: 'Festival of the goddess; widely observed for Amman / Andal traditions.',
    ritual:
      'Village goddess processions. For Konur and similar Kaliamman shrines, one of the larger annual gatherings; community kuladeivam visits often planned around this date.',
    tier: 'yellow',
    note: 'Specific Konur observance details are community knowledge, not centrally documented.',
  },
  {
    id: 'panguni-uthiram',
    monthIndex: 11, // Panguni
    position: 0.5,
    name: { en: 'Panguni Uthiram', ta: 'பங்குனி உத்திரம்' },
    blurb: 'Chariot / temple festival; one of the most important Konur Kaliamman gatherings.',
    ritual:
      'Annual temple festival — typically the largest Kuladeivam gathering of the year for Kadai families. Tonsure, ear-piercing, and marriage-permission rituals frequently scheduled to coincide.',
    tier: 'yellow',
    note: 'Panguni Uthiram is a well-documented Tamil festival; its specific scale at Konur is community ethnography.',
  },
  {
    id: 'thai-pongal',
    monthIndex: 9, // Thai
    position: 0.05,
    name: { en: 'Thai Pongal', ta: 'தைப் பொங்கல்' },
    blurb: 'Harvest festival; not a Konur-specific festival but observed everywhere.',
    ritual:
      'Pongal cooked at sunrise; sun (சூரியன்) worship. Many families also offer pongal at the village shrine on Thai Pongal day.',
    tier: 'green',
  },
  {
    id: 'amavasai',
    monthIndex: 4, // Avani (illustrative — Amavasai falls every month)
    position: 0.5,
    name: { en: 'Aadi Amavasai', ta: 'ஆடி அமாவாசை' },
    blurb: 'New-moon day in Aadi — ancestor-offering (தர்ப்பணம்) day.',
    ritual:
      'Offerings (தர்ப்பணம்) to deceased ancestors; tarpanam often done at the village shrine or a riverbank. The Aadi amavasai is the most heavily observed of the twelve monthly new-moons.',
    tier: 'green',
    note: 'Amavasai is monthly; this marker shows the most-observed Aadi one for compactness.',
  },
];

const TIER_BADGE: Record<Tier, { emoji: string; label: string; bg: string; fg: string; ring: string }> = {
  green: { emoji: '🟢', label: 'well-established', bg: 'bg-emerald-50', fg: 'text-emerald-800', ring: 'ring-emerald-200' },
  yellow: { emoji: '🟡', label: 'plausible / debated', bg: 'bg-amber-50', fg: 'text-amber-800', ring: 'ring-amber-200' },
  red: { emoji: '🔴', label: 'myth / unverified', bg: 'bg-rose-50', fg: 'text-rose-800', ring: 'ring-rose-200' },
  rational: { emoji: '⚖️', label: 'rational basis', bg: 'bg-sky-50', fg: 'text-sky-800', ring: 'ring-sky-200' },
};

// Rough current Tamil month from Gregorian month/day.
// Tamil month typically starts mid-Gregorian-month (~14th). If today is before the
// 14th of `roughGregStart`, we are still in the previous Tamil month.
function currentTamilMonthIndex(d = new Date()): number {
  const gMonth = d.getMonth() + 1; // 1..12
  const gDay = d.getDate();
  // Find Tamil month whose roughGregStart === gMonth. If day < 14, it's the prior.
  const idx = TAMIL_MONTHS.findIndex((m) => m.roughGregStart === gMonth);
  if (idx === -1) return 0;
  return gDay < 14 ? (idx + 11) % 12 : idx;
}

export default function FestivalCalendar({ id }: { id?: string } = {}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selected, setSelected] = useState<Festival | null>(null);

  // Shared sizing — match the prior 768 mobile breakpoint and 320..720 clamp.
  const { ref: dimRef, width, isMobile, measured } = useChartDimensions({
    breakpoint: 768,
    initialWidth: 720,
    minWidth: 320,
    maxWidth: 720,
  });
  const [inViewRef] = useInView<HTMLDivElement>();
  // Merge the dimensions ref + in-view ref onto the SAME measured container.
  const setRef = (el: HTMLDivElement | null) => {
    dimRef.current = el;
    inViewRef.current = el;
  };

  // Hydration sentinel — set data-hydrated on the chart root once measured so
  // ChartSkeleton's MutationObserver can hide the placeholder. (Previously this
  // component never set it, leaving up to a 15s dead skeleton.)
  useEffect(() => {
    if (measured) dimRef.current?.setAttribute('data-hydrated', 'true');
  }, [measured, dimRef]);

  const currentMonth = useMemo(() => currentTamilMonthIndex(), []);

  // Festivals indexed by month
  const festivalsByMonth = useMemo(() => {
    const map = new Map<number, Festival[]>();
    for (const f of FESTIVALS) {
      const arr = map.get(f.monthIndex) ?? [];
      arr.push(f);
      map.set(f.monthIndex, arr);
    }
    return map;
  }, []);

  // Render radial
  useEffect(() => {
    if (isMobile) return; // mobile uses HTML list
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;
    svg.selectAll('*').remove();

    const size = width;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 20;
    const innerR = outerR - 70; // ring thickness
    const labelR = outerR + 4;  // outside the ring (we'll shrink ring + use space inside)
    // Actually rework: ring is between innerR and outerR, labels go between ring and an outer margin.
    // Let's put labels INSIDE ring (toward centre) since we have a fixed canvas.

    svg.attr('viewBox', `0 0 ${size} ${size}`).attr('width', size).attr('height', size);

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    // Background subtle radial bg
    g.append('circle')
      .attr('r', outerR)
      .attr('fill', BG.paper)
      .attr('stroke', CHART.grid)
      .attr('stroke-width', 1);

    // Angle scale — 12 segments, start at top (-π/2) and go clockwise.
    const anglePerMonth = (2 * Math.PI) / 12;
    const angleFor = (monthIdx: number, pos = 0) =>
      -Math.PI / 2 + (monthIdx + pos) * anglePerMonth;

    // Month segments — arcs
    const arc = d3
      .arc<{ start: number; end: number; idx: number }>()
      .innerRadius(innerR)
      .outerRadius(outerR)
      .startAngle((d) => d.start)
      .endAngle((d) => d.end)
      .padAngle(0.005);

    const segments = TAMIL_MONTHS.map((_, idx) => ({
      idx,
      // SVG arc angles: 0 is "up" (since we rotate via the angle formula).
      // d3.arc treats 0 as up; so convert by adding π/2.
      start: idx * anglePerMonth,
      end: (idx + 1) * anglePerMonth,
    }));

    g.append('g')
      .selectAll('path')
      .data(segments)
      .join('path')
      .attr('d', (d) => arc(d as any) as string)
      .attr('fill', (d) => (d.idx === currentMonth ? '#fef3c7' : BG.white))
      .attr('stroke', CHART.grid)
      .attr('stroke-width', 1);

    // Highlight current month segment with darker stroke
    g.append('g')
      .selectAll('path')
      .data(segments.filter((s) => s.idx === currentMonth))
      .join('path')
      .attr('d', (d) => arc(d as any) as string)
      .attr('fill', 'none')
      .attr('stroke', '#d97706')
      .attr('stroke-width', 2);

    // Month labels — placed on the centreline of each segment, in the ring
    const labelMidR = (innerR + outerR) / 2;
    g.append('g')
      .selectAll('g')
      .data(TAMIL_MONTHS)
      .join('g')
      .attr('transform', (_, idx) => {
        // Place at centre-angle of the segment.
        // d3.arc uses 0 = up (12 o'clock) and increases clockwise.
        const a = idx * anglePerMonth + anglePerMonth / 2 - Math.PI / 2;
        const x = Math.cos(a) * labelMidR;
        const y = Math.sin(a) * labelMidR;
        // Rotate label to be tangent? Keep horizontal for legibility.
        return `translate(${x},${y})`;
      })
      .each(function (m, idx) {
        const sel = d3.select(this);
        sel
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '-0.1em')
          .attr('font-size', 11)
          .attr('font-weight', idx === currentMonth ? 700 : 600)
          .attr('fill', idx === currentMonth ? '#92400e' : FG[2])
          .text(m.en);
        sel
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '1em')
          .attr('font-size', 10)
          .attr('font-family', '"Noto Sans Tamil", sans-serif')
          .attr('fill', idx === currentMonth ? '#92400e' : FG[4])
          .text(m.ta);
      });

    // Today indicator — a thin arrow from centre toward the middle of the current month
    const todayAngle = currentMonth * anglePerMonth + anglePerMonth / 2 - Math.PI / 2;
    const arrowEnd = innerR - 4;
    g.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', Math.cos(todayAngle) * arrowEnd)
      .attr('y2', Math.sin(todayAngle) * arrowEnd)
      .attr('stroke', '#d97706')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('marker-end', 'url(#fc-arrow)');

    // arrow marker
    const defs = svg.append('defs');
    defs
      .append('marker')
      .attr('id', 'fc-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 6)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4Z')
      .attr('fill', '#d97706');

    // Centre label
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.4em')
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('fill', FG[2])
      .text('Tamil month wheel');
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.9em')
      .attr('font-size', 10)
      .attr('fill', FG[4])
      .text(`now: ${TAMIL_MONTHS[currentMonth].en}`);
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '2.2em')
      .attr('font-size', 9)
      .attr('fill', FG.muted)
      .text('(approx.)');

    // Festival markers — on the OUTER rim
    const markerR = outerR - 8;
    const markerGroup = g.append('g');

    for (const f of FESTIVALS) {
      const a = angleFor(f.monthIndex, f.position);
      const x = Math.cos(a) * markerR;
      const y = Math.sin(a) * markerR;

      const tier = TIER_BADGE[f.tier];
      const color =
        f.tier === 'green' ? '#059669' :
        f.tier === 'yellow' ? '#d97706' :
        f.tier === 'red' ? '#e11d48' : '#0284c7';

      const node = markerGroup
        .append('g')
        .attr('transform', `translate(${x},${y})`)
        .style('cursor', 'pointer')
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr('aria-label', `${f.name.en} — ${tier.label}`)
        .on('click', () => setSelected(f))
        .on('keydown', (event: KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setSelected(f);
          }
        });

      node
        .append('circle')
        .attr('r', 7)
        .attr('fill', BG.white)
        .attr('stroke', color)
        .attr('stroke-width', 2);

      node
        .append('circle')
        .attr('r', 3.5)
        .attr('fill', color);

      node.append('title').text(`${f.name.en} (${tier.label}) — click for details`);
    }
  }, [width, isMobile, currentMonth]);

  return (
    <div ref={setRef} id={id} className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-600">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
          well-established
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-amber-600 ring-2 ring-amber-200" />
          community / debated
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-amber-100 ring-2 ring-amber-400" />
          current Tamil month (approx.)
        </span>
      </div>

      {isMobile ? (
        // ----- Mobile: vertical list -----
        <div className="rounded-2xl border border-stone-200 bg-white p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-stone-500">
            Tamil months — tap a festival
          </p>
          <ul className="divide-y divide-stone-200">
            {TAMIL_MONTHS.map((m, idx) => {
              const fests = festivalsByMonth.get(idx) ?? [];
              const isNow = idx === currentMonth;
              return (
                <li key={m.en} className={`py-2 ${isNow ? 'bg-amber-50' : ''}`}>
                  <div className="flex items-baseline justify-between gap-3 px-2">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className={`font-medium ${isNow ? 'text-amber-900' : 'text-stone-800'}`}>
                          {m.en}
                        </span>
                        <span
                          className={`font-tamil text-sm ${isNow ? 'text-amber-800' : 'text-stone-600'}`}
                        >
                          {m.ta}
                        </span>
                        {isNow && (
                          <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                            now (approx.)
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-stone-500">
                      {fests.length === 0 ? '—' : `${fests.length} fest.`}
                    </span>
                  </div>
                  {fests.length > 0 && (
                    <ul className="mt-1 space-y-1 pl-2">
                      {fests.map((f) => {
                        const t = TIER_BADGE[f.tier];
                        return (
                          <li key={f.id}>
                            <button
                              type="button"
                              onClick={() => setSelected(f)}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-stone-100"
                            >
                              <span aria-hidden="true">{t.emoji}</span>
                              <span className="flex-1">
                                <span className="block text-sm font-medium text-stone-900">
                                  {f.name.en}
                                </span>
                                <span className="block font-tamil text-xs text-stone-600">
                                  {f.name.ta}
                                </span>
                              </span>
                              <span className="text-xs text-stone-400">›</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        // ----- Desktop: radial -----
        <div className="flex justify-center rounded-2xl border border-stone-200 bg-white p-4">
          <svg ref={svgRef} role="img" aria-label="Radial Tamil-month festival calendar" />
        </div>
      )}

      {selected && (
        <FestivalDrawer festival={selected} onClose={() => setSelected(null)} isMobile={isMobile} />
      )}
    </div>
  );
}

function FestivalDrawer({
  festival,
  onClose,
  isMobile,
}: {
  festival: Festival;
  onClose: () => void;
  isMobile: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const t = TIER_BADGE[festival.tier];
  const month = TAMIL_MONTHS[festival.monthIndex];

  const panel = isMobile
    ? 'fixed inset-x-0 bottom-0 max-h-[80vh] w-full overflow-y-auto rounded-t-2xl border-t border-stone-200 bg-white shadow-2xl'
    : 'fixed right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-stone-200 bg-white shadow-2xl';

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close festival details"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-stone-900/30 backdrop-blur-sm"
      />
      <aside
        className={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`${festival.name.en} details`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">
              {month.en} <span className="font-tamil">{month.ta}</span>
            </p>
            <h3 className="mt-1 text-2xl font-bold text-stone-900">{festival.name.en}</h3>
            <p className="font-tamil text-lg text-stone-600">{festival.name.ta}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-5 text-sm leading-relaxed text-stone-700">
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-inset ${t.bg} ${t.fg} ${t.ring}`}
          >
            <span aria-hidden="true">{t.emoji}</span>
            <span className="text-xs font-medium uppercase tracking-wide">{t.label}</span>
          </div>

          <p className="text-base text-stone-800">{festival.blurb}</p>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Ritual context
            </h4>
            <p className="mt-1">{festival.ritual}</p>
          </div>

          {festival.note && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Note</p>
              <p className="mt-1 text-sm">{festival.note}</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
