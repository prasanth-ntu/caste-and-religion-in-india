import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import Tooltip, { type TooltipState } from '../ui/Tooltip';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------- Types ----------
// We accept a denormalised shape that the Astro page builds from the kootams collection.
export interface KootamNodeInput {
  slug: string;
  name: string;
  tamilName: string;
  totemType: string; // 'bird' | 'tree' | 'fish' | 'flower' | 'other' (free string per schema)
  totemSpecies: string;
  region?: string;
  deity?: string; // deity slug (or undefined)
  exogamyWith: string[]; // array of slugs
  isStub: boolean;
  isHighlight: boolean; // true for kadai
}

export interface KootamForceGraphProps {
  kootams: KootamNodeInput[];
  /** Optional id applied to the chart root. Used by `ChartSkeleton` to detect
   *  hydration via `data-hydrated="true"` and auto-hide its placeholder. */
  id?: string;
}

type TotemType = 'bird' | 'tree' | 'fish' | 'flower' | 'other';

const TOTEM_PALETTE: Record<TotemType, { fill: string; stroke: string; label: string; emoji: string }> = {
  bird:   { fill: '#f59e0b', stroke: '#b45309', label: 'Bird',   emoji: '🐦' }, // amber
  tree:   { fill: '#10b981', stroke: '#047857', label: 'Tree',   emoji: '🌳' }, // emerald
  fish:   { fill: '#0ea5e9', stroke: '#0369a1', label: 'Fish',   emoji: '🐟' }, // sky
  flower: { fill: '#f43f5e', stroke: '#be123c', label: 'Flower', emoji: '🌸' }, // rose
  other:  { fill: '#78716c', stroke: '#44403c', label: 'Other',  emoji: '✶' },  // stone
};

function normTotem(t: string): TotemType {
  const k = t.toLowerCase();
  if (k === 'bird' || k === 'tree' || k === 'fish' || k === 'flower') return k;
  return 'other';
}

// ---------- Simulation node type ----------
interface SimNode extends d3.SimulationNodeDatum {
  slug: string;
  name: string;
  tamilName: string;
  totemType: TotemType;
  totemSpecies: string;
  region?: string;
  deity?: string;
  isStub: boolean;
  isHighlight: boolean;
  exogamyWith: string[];
}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
}

// ---------- Main component ----------
export default function KootamForceGraph({ kootams, id }: KootamForceGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Hydration sentinel — see ChartSkeleton.astro.
  useEffect(() => {
    containerRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  const [size, setSize] = useState({ width: 800, height: 600 });
  const [layoutMode, setLayoutMode] = useState<'force' | 'grid'>('force');
  const [filters, setFilters] = useState<Set<TotemType>>(
    new Set(['bird', 'tree', 'fish', 'flower', 'other']),
  );
  const [showStubs, setShowStubs] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SimNode | null>(null);
  const [tip, setTip] = useState<TooltipState>({ x: null, y: null, content: null });
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // -------- Responsive: pick layout mode + canvas size --------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      // Use viewport width as the source of truth — container clientWidth can be 0
      // immediately after hydration. The viewport breakpoint matches CSS reasoning.
      const vw = typeof window !== 'undefined' ? window.innerWidth : el.clientWidth;
      const w = el.clientWidth || vw;
      if (vw < 640) {
        setLayoutMode('grid');
        setSize({ width: Math.max(320, w), height: 500 });
      } else if (vw < 1024) {
        setLayoutMode('force');
        setSize({ width: Math.max(560, Math.min(w, 900)), height: 500 });
      } else {
        setLayoutMode('force');
        setSize({ width: Math.max(720, Math.min(w, 1000)), height: 600 });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // -------- Filtered dataset --------
  const filteredNodes: SimNode[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    return kootams
      .filter((k) => filters.has(normTotem(k.totemType)))
      .filter((k) => (showStubs ? true : !k.isStub))
      .filter((k) => {
        if (!q) return true;
        return (
          k.name.toLowerCase().includes(q) ||
          k.tamilName.toLowerCase().includes(q) ||
          k.slug.toLowerCase().includes(q)
        );
      })
      .map((k) => ({
        slug: k.slug,
        name: k.name,
        tamilName: k.tamilName,
        totemType: normTotem(k.totemType),
        totemSpecies: k.totemSpecies,
        region: k.region,
        deity: k.deity,
        isStub: k.isStub,
        isHighlight: k.isHighlight,
        exogamyWith: k.exogamyWith,
      }));
  }, [kootams, filters, showStubs, search]);

  const filteredLinks: SimLink[] = useMemo(() => {
    const slugSet = new Set(filteredNodes.map((n) => n.slug));
    const out: SimLink[] = [];
    const seen = new Set<string>();
    for (const n of filteredNodes) {
      for (const target of n.exogamyWith) {
        if (!slugSet.has(target)) continue;
        const key = [n.slug, target].sort().join('::');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ source: n.slug, target });
      }
    }
    return out;
  }, [filteredNodes]);

  // -------- D3 force simulation (desktop/tablet) --------
  useEffect(() => {
    if (layoutMode !== 'force') return;
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    // Defs: glow filter for Kadai
    const defs = svg.append('defs');
    const filter = defs
      .append('filter')
      .attr('id', 'kadai-quail-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', 4).attr('result', 'blur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const { width, height } = size;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Working copies so simulation can mutate without polluting React state
    const nodes: SimNode[] = filteredNodes.map((n) => ({ ...n }));
    const links: SimLink[] = filteredLinks.map((l) => ({ ...l }));

    const g = svg.append('g');

    // Cluster X targets by totem type (gentle horizontal banding)
    const typeOrder: TotemType[] = ['bird', 'tree', 'fish', 'flower', 'other'];
    const bandWidth = width / typeOrder.length;
    const xTarget = (t: TotemType) => bandWidth * typeOrder.indexOf(t) + bandWidth / 2;

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.slug)
          .distance(70)
          .strength(0.6),
      )
      .force('charge', d3.forceManyBody<SimNode>().strength(-90))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide<SimNode>().radius((d) => (d.isHighlight ? 16 : 11)))
      .force('x', d3.forceX<SimNode>((d) => xTarget(d.totemType)).strength(0.06))
      .force('y', d3.forceY<SimNode>(height / 2).strength(0.04))
      .alpha(0.9)
      .alphaDecay(0.05);

    // Cap iterations to avoid runaway CPU on slower machines.
    let ticks = 0;
    const MAX_TICKS = 320;

    const linkSel = g
      .append('g')
      .attr('stroke', '#a8a29e')
      .attr('stroke-opacity', 0.55)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 1.2);

    const reduced = prefersReducedMotion();

    const nodeG = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', (d) => `${d.name} — ${d.totemType} totem`)
      .style('cursor', 'pointer')
      .style('outline', 'none')
      .on('click', (_, d) => setSelected(d))
      .on('mouseenter', function (event: MouseEvent, d) {
        // Dim non-target nodes; highlight target.
        nodeG.each(function (this: SVGGElement) {
          const sel = d3.select(this);
          const isMe = this === (event.currentTarget as SVGGElement);
          sel.select<SVGCircleElement>('circle:last-of-type')
            .style('transition', reduced ? 'none' : 'opacity 160ms ease, filter 160ms ease, stroke-width 160ms ease');
          if (isMe) {
            sel.select<SVGCircleElement>('circle:last-of-type')
              .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,.15))')
              .attr('stroke-width', (dd: any) => (dd.isHighlight ? 3 : 2));
          } else {
            sel.style('opacity', 0.5);
          }
        });
        setTip({
          x: event.clientX,
          y: event.clientY,
          content: (
            <>
              <strong>{d.isHighlight ? '★ ' : ''}{d.name}</strong>
              <br />
              <span style={{ opacity: 0.85 }}>{d.tamilName}</span>
              <br />
              {TOTEM_PALETTE[d.totemType].label}: {d.totemSpecies}
              {d.isStub ? <><br /><em style={{ opacity: 0.75 }}>(stub — needs research)</em></> : null}
            </>
          ),
        });
      })
      .on('mousemove', (event: MouseEvent) => setTip((t) => (t.content ? { ...t, x: event.clientX, y: event.clientY } : t)))
      .on('mouseleave', function () {
        nodeG.each(function (this: SVGGElement) {
          const sel = d3.select(this);
          sel.style('opacity', null);
          sel.select<SVGCircleElement>('circle:last-of-type')
            .style('filter', null)
            .attr('stroke-width', (dd: any) => (dd.isHighlight ? 2.5 : 1.5));
        });
        setTip({ x: null, y: null, content: null });
      })
      .on('focus', function (_, d) {
        const r = (this as SVGGElement).getBoundingClientRect();
        setTip({
          x: r.left + r.width / 2,
          y: r.top,
          content: <><strong>{d.isHighlight ? '★ ' : ''}{d.name}</strong><br /><span style={{ opacity: 0.85 }}>{d.tamilName}</span></>,
        });
      })
      .on('blur', () => setTip({ x: null, y: null, content: null }))
      .on('keydown', function (event: KeyboardEvent, d) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setSelected(d);
          return;
        }
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          // Cycle through siblings in the same totem class.
          const allG = nodeG.nodes() as SVGGElement[];
          const sameClass = allG.filter((el) => (d3.select(el).datum() as SimNode).totemType === d.totemType);
          const idx = sameClass.indexOf(this as SVGGElement);
          if (idx < 0 || sameClass.length < 2) return;
          const fwd = event.key === 'ArrowRight' || event.key === 'ArrowDown';
          const nextEl = sameClass[(idx + (fwd ? 1 : -1) + sameClass.length) % sameClass.length] as unknown as HTMLElement;
          event.preventDefault();
          nextEl.focus?.();
        }
      })
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any,
      );

    // Entry animation — staggered fade + lift (capped 600ms total).
    if (!reduced && inView) {
      nodeG.each(function (_, i) {
        const sel = d3.select(this);
        const delay = Math.min(i * 12, 600);
        sel
          .style('opacity', 0)
          .style('transform-box', 'fill-box')
          .style('transition', `opacity 380ms ease ${delay}ms`);
        requestAnimationFrame(() => sel.style('opacity', null));
      });
    } else if (!inView && !reduced) {
      nodeG.style('opacity', 0);
    }

    // Highlight halo for Kadai
    nodeG
      .filter((d) => d.isHighlight)
      .append('circle')
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', '#f43f5e')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.7)
      .attr('class', 'animate-pulse');

    nodeG
      .append('circle')
      .attr('r', (d) => (d.isHighlight ? 10 : 7))
      .attr('fill', (d) => TOTEM_PALETTE[d.totemType].fill)
      .attr('stroke', (d) => TOTEM_PALETTE[d.totemType].stroke)
      .attr('stroke-width', (d) => (d.isHighlight ? 2.5 : 1.5))
      .attr('fill-opacity', (d) => (d.isStub ? 0.45 : 1))
      .attr('filter', (d) => (d.isHighlight ? 'url(#kadai-quail-glow)' : null));

    // Star marker for Kadai
    nodeG
      .filter((d) => d.isHighlight)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.32em')
      .attr('font-size', 11)
      .attr('font-weight', 700)
      .attr('fill', '#7f1d1d')
      .attr('pointer-events', 'none')
      .text('★');

    // Labels for named (non-stub) nodes only, to keep clutter down with 145 dots
    nodeG
      .filter((d) => !d.isStub)
      .append('text')
      .attr('x', 12)
      .attr('dy', '0.32em')
      .attr('font-size', (d) => (d.isHighlight ? 12 : 10))
      .attr('font-weight', (d) => (d.isHighlight ? 600 : 500))
      .attr('fill', '#1c1917')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 3)
      .attr('pointer-events', 'none')
      .text((d) => (d.isHighlight ? `★ ${d.name.replace(' Kootam', '')}` : d.name.replace(' Kootam', '')));

    simulation.on('tick', () => {
      ticks += 1;
      if (ticks > MAX_TICKS) simulation.stop();
      linkSel
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0);
      nodeG.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [filteredNodes, filteredLinks, size, layoutMode, inView]);

  // -------- Toggles --------
  const toggleFilter = (t: TotemType) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <div ref={containerRef} id={id} className="relative w-full">
      {/* Controls */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(['bird', 'tree', 'fish', 'flower', 'other'] as TotemType[]).map((t) => {
            const active = filters.has(t);
            const p = TOTEM_PALETTE[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleFilter(t)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? 'border-stone-300 bg-white text-stone-900 shadow-sm'
                    : 'border-stone-200 bg-stone-100 text-stone-400'
                }`}
                aria-pressed={active}
                data-testid={`filter-${t}`}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: p.fill, opacity: active ? 1 : 0.4 }}
                />
                <span>{p.emoji}</span>
                {p.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowStubs((s) => !s)}
            className={`ml-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
              showStubs
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-stone-200 bg-stone-100 text-stone-500'
            }`}
            aria-pressed={showStubs}
            data-testid="toggle-stubs"
          >
            <span aria-hidden="true">🚧</span>
            {showStubs ? 'Hide stubs' : 'Show stubs'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search kootam (en or தமிழ்)..."
            className="w-full max-w-sm rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-stone-500 focus:outline-none"
            data-testid="search-input"
          />
          <span className="text-xs text-stone-500" data-testid="result-count">
            {filteredNodes.length} of {kootams.length}
          </span>
        </div>
      </div>

      {/* Canvas */}
      {layoutMode === 'force' ? (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2 sm:p-4">
          <svg
            ref={svgRef}
            width={size.width}
            height={size.height}
            className="block w-full max-w-full"
            role="img"
            aria-label="Force-directed graph of all 145 Kongu Vellala kootams, colored by totem type"
          />
        </div>
      ) : (
        <GroupedGrid nodes={filteredNodes} onSelect={setSelected} />
      )}

      {/* Drawer */}
      {selected && <KootamDrawer node={selected} onClose={() => setSelected(null)} />}
      <Tooltip x={tip.x} y={tip.y}>{tip.content}</Tooltip>
    </div>
  );
}

// ---------- Mobile grouped grid ----------
function GroupedGrid({ nodes, onSelect }: { nodes: SimNode[]; onSelect: (n: SimNode) => void }) {
  const groups: TotemType[] = ['bird', 'tree', 'fish', 'flower', 'other'];
  return (
    <div className="space-y-5">
      {groups.map((g) => {
        const items = nodes.filter((n) => n.totemType === g);
        if (!items.length) return null;
        const p = TOTEM_PALETTE[g];
        return (
          <section key={g} className="rounded-2xl border border-stone-200 bg-white p-3" data-testid={`grid-${g}`}>
            <header className="mb-2 flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: p.fill }} />
              <h3 className="text-sm font-semibold text-stone-800">
                {p.emoji} {p.label} <span className="text-stone-500">({items.length})</span>
              </h3>
            </header>
            <ul className="grid grid-cols-2 gap-2">
              {items.map((n) => (
                <li key={n.slug}>
                  <button
                    type="button"
                    onClick={() => onSelect(n)}
                    className={`w-full rounded-lg border px-2 py-1.5 text-left text-xs transition ${
                      n.isHighlight
                        ? 'border-rose-300 bg-rose-50 text-rose-900 ring-1 ring-rose-200'
                        : n.isStub
                          ? 'border-stone-200 bg-stone-50 text-stone-600'
                          : 'border-stone-200 bg-white text-stone-800 hover:border-stone-400'
                    }`}
                    data-testid={`card-${n.slug}`}
                  >
                    <div className="font-medium">{n.isHighlight ? `★ ${n.name}` : n.name}</div>
                    <div className="font-tamil text-[11px] text-stone-500">{n.tamilName}</div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {nodes.length === 0 && (
        <p className="rounded-lg border border-stone-200 bg-white p-4 text-center text-sm text-stone-500">
          No kootams match the current filter / search.
        </p>
      )}
    </div>
  );
}

// ---------- Drawer ----------
function KootamDrawer({ node, onClose }: { node: SimNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const p = TOTEM_PALETTE[node.totemType];

  return (
    <div className="fixed inset-0 z-40" data-testid="kootam-drawer">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-stone-900/30 backdrop-blur-sm"
      />
      <aside
        className="fixed inset-x-0 bottom-0 max-h-[80vh] w-full overflow-y-auto rounded-t-2xl border-t border-stone-200 bg-white shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-auto sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0"
        role="dialog"
        aria-modal="true"
        aria-label={`${node.name} details`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5">
          <div>
            <span
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white"
              style={{ background: p.fill }}
            >
              {p.emoji} {p.label} totem
            </span>
            <h3 className="mt-2 text-2xl font-bold text-stone-900">
              {node.isHighlight ? '★ ' : ''}
              {node.name}
            </h3>
            <p className="mt-1 font-tamil text-lg text-stone-600">{node.tamilName}</p>
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
          {node.isHighlight && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
              <p className="text-xs font-semibold uppercase tracking-wide">★ This is your kootam</p>
              <p className="mt-1">
                The Kadai (quail) totem marks one of the ~145 exogamous clans of the Kongu Vellala Gounder community.
              </p>
            </div>
          )}

          {node.isStub && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="text-xs font-semibold uppercase tracking-wide">🚧 Stub entry</p>
              <p className="mt-1">
                Real research needed for this kootam. <a className="underline" href="https://github.com/prasanth-ntu/caste-and-religion-in-india" target="_blank" rel="noopener noreferrer">Open a pull request</a> if you can verify the name, totem species, or exogamy partners. 🟡
              </p>
            </div>
          )}

          <dl className="grid grid-cols-3 gap-2 text-xs">
            <dt className="text-stone-500">Totem species</dt>
            <dd className="col-span-2 text-stone-800">{node.totemSpecies}</dd>
            {node.region && (
              <>
                <dt className="text-stone-500">Region</dt>
                <dd className="col-span-2 text-stone-800">{node.region}</dd>
              </>
            )}
            {node.deity && (
              <>
                <dt className="text-stone-500">Kuladeivam</dt>
                <dd className="col-span-2 text-stone-800">{node.deity}</dd>
              </>
            )}
            <dt className="text-stone-500">Slug</dt>
            <dd className="col-span-2 font-mono text-stone-800">{node.slug}</dd>
          </dl>

          {node.exogamyWith.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Documented exogamy partners
              </h4>
              <ul className="flex flex-wrap gap-1.5">
                {node.exogamyWith.map((slug) => (
                  <li key={slug}>
                    <a
                      href={`/lineage/k/${slug}/`}
                      className="inline-block rounded-full border border-stone-300 bg-stone-50 px-2 py-0.5 text-xs text-stone-800 hover:border-stone-500"
                    >
                      {slug}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <a
            href={`/lineage/k/${node.slug}/`}
            className="mt-2 inline-block rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Open full profile →
          </a>
        </div>
      </aside>
    </div>
  );
}
