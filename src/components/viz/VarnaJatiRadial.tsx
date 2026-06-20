import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { varnaJatiTree } from '../../data/varna-jati-tree';
import type { TreeNode, CasteLevel } from '../../lib/lineage-tree';
import Tooltip, { type TooltipState } from '../ui/Tooltip';
import { Drawer as UIDrawer } from '../ui/Drawer';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { useInView } from '../../hooks/useInView';
import { prefersReducedMotion } from '../../lib/chart-motion';
import { CHART, LEVEL_COLOR } from '../../lib/chart-tokens';

// ---------- Palette ----------
// Violet accent for the "second documented community" (secondary) treatment —
// distinct from the rose Kadai "you are here" highlight.
const SECONDARY_RING = '#8b5cf6';

const TIER_BADGE: Record<string, { emoji: string; label: string; bg: string; fg: string }> = {
  green: { emoji: '🟢', label: 'well-established', bg: 'bg-emerald-50', fg: 'text-emerald-800' },
  yellow: { emoji: '🟡', label: 'plausible / debated', bg: 'bg-amber-50', fg: 'text-amber-800' },
  red: { emoji: '🔴', label: 'myth / unverified', bg: 'bg-rose-50', fg: 'text-rose-800' },
  rational: { emoji: '⚖️', label: 'rational basis', bg: 'bg-sky-50', fg: 'text-sky-800' },
};

// Find ancestor chain to highlighted node.
function findPath(
  node: d3.HierarchyNode<TreeNode>,
  predicate: (n: TreeNode) => boolean,
): d3.HierarchyNode<TreeNode>[] {
  const target = node.descendants().find((d) => predicate(d.data));
  if (!target) return [];
  return target.ancestors().reverse();
}

// Top-down vertical tree at every width (one design language across the site —
// desktop and mobile both read as a structured dendrogram). Canvas height grows
// with tree depth (the card scrolls vertically; pinch-zoom + drag-pan on touch),
// and breadth scrolls horizontally inside the card when leaves are dense.
// Desktop gets airier tiers and wider leaf spacing for a roomier read.
const DEPTH_STEP = { mobile: 104, desktop: 134 };
const LEAF_BREADTH = { mobile: 18, desktop: 30 }; // min horizontal px per leaf
const PAD_T = 40;
const PAD_B = 44;
const PAD_X = 16;

interface VarnaJatiRadialProps {
  id?: string;
}

export default function VarnaJatiRadial({ id }: VarnaJatiRadialProps = {}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef(d3.zoomIdentity);
  const [zoomed, setZoomed] = useState(false);

  const [selected, setSelected] = useState<TreeNode | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tip, setTip] = useState<TooltipState>({ x: null, y: null, content: null });

  // Shared sizing (768 breakpoint: radial desktop vs. vertical mobile) and
  // one-shot in-view trigger for the entry animation. Both observers attach to
  // the same container via a merged ref.
  const { ref: dimRef, width, isMobile, measured } = useChartDimensions({
    breakpoint: 768,
    initialWidth: 800,
  });
  const [inViewRef, inView] = useInView<HTMLDivElement>();
  const setContainerRef = (el: HTMLDivElement | null) => {
    dimRef.current = el;
    inViewRef.current = el;
  };

  // Hydration sentinel for ChartSkeleton — fires once we have a real measurement.
  useEffect(() => {
    if (measured) dimRef.current?.setAttribute('data-hydrated', 'true');
  }, [measured, dimRef]);

  // Build hierarchy (memoised).
  const root = useMemo(() => {
    const h = d3.hierarchy<TreeNode>(varnaJatiTree);
    h.sort((a, b) => {
      const ah = a.data.highlight ? -1 : 0;
      const bh = b.data.highlight ? -1 : 0;
      return ah - bh;
    });
    return h;
  }, []);

  // Path from root to highlighted node.
  const highlightPathIds = useMemo(() => {
    const path = findPath(root, (n) => !!n.highlight);
    return new Set(path.map((d) => d.data.id));
  }, [root]);

  // Tree shape metrics (depth + leaf count) drive the responsive canvas size.
  const treeMetrics = useMemo(() => {
    const maxDepth = root.height || 4;
    const leafCount = root.leaves().length;
    return { maxDepth, leafCount };
  }, [root]);

  // Derive the SVG canvas from the measured width + tree shape. Top-down at
  // every width: height grows with depth; breadth fills the card (and scrolls
  // inside it when leaf levels are dense). Desktop uses airier per-level spacing.
  const size = useMemo(() => {
    const depthStep = isMobile ? DEPTH_STEP.mobile : DEPTH_STEP.desktop;
    const leafBreadth = isMobile ? LEAF_BREADTH.mobile : LEAF_BREADTH.desktop;
    const { maxDepth, leafCount } = treeMetrics;
    const height = PAD_T + PAD_B + maxDepth * depthStep;
    const breadth = Math.max(width, leafCount * leafBreadth + PAD_X * 2);
    return { width: Math.max(breadth, 320), height };
  }, [isMobile, width, treeMetrics]);

  // Top-down tree layout: d.x = horizontal breadth, d.y = vertical depth. d3
  // spreads the leaves across the available breadth, so a sparse tree fills the
  // card and a dense one overflows into horizontal scroll.
  const laidOut = useMemo(() => {
    const r = root.copy();
    const depthStep = isMobile ? DEPTH_STEP.mobile : DEPTH_STEP.desktop;
    const treeHeight = (r.height || 4) * depthStep;
    d3.tree<TreeNode>()
      .size([size.width - PAD_X * 2, treeHeight])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2))(r);
    return r;
  }, [root, size, isMobile]);

  // Hover/selection augmented path.
  const activePathIds = useMemo(() => {
    if (hoveredId) {
      const target = laidOut.descendants().find((d) => d.data.id === hoveredId);
      if (target) return new Set(target.ancestors().map((d) => d.data.id));
    }
    return highlightPathIds;
  }, [hoveredId, laidOut, highlightPathIds]);

  // D3 imperative render pass.
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;
    svg.selectAll('*').remove();

    // Glow filter for Kadai highlight.
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'kadai-glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', 3.5).attr('result', 'blur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Glow filter for the secondary (Nagarathar) community node.
    const filter2 = defs.append('filter')
      .attr('id', 'secondary-glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    filter2.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'blur');
    const merge2 = filter2.append('feMerge');
    merge2.append('feMergeNode').attr('in', 'blur');
    merge2.append('feMergeNode').attr('in', 'SourceGraphic');

    renderVertical(svg, laidOut, size, activePathIds, {
      setSelected,
      setHoveredId,
      setTip,
      inView,
      isMobile,
    });

    // Pinch-to-zoom + drag-to-pan on mobile, where leaf clusters are dense.
    // `touch-action: pan-y` (set on the SVG) lets one-finger vertical scroll
    // pass through to the page, so zoom/pan only engages on a pinch or a
    // deliberate drag — the chart never traps the scroll.
    if (isMobile) {
      const layer = svg.select<SVGGElement>('.vjr-zoom-layer');
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 4])
        .on('zoom', (event) => {
          transformRef.current = event.transform;
          layer.attr('transform', event.transform.toString());
          setZoomed(event.transform.k !== 1 || event.transform.x !== 0 || event.transform.y !== 0);
        });
      zoomRef.current = zoom;
      svg.call(zoom);
      svg.on('dblclick.zoom', null);
      // Re-apply the prior transform so selecting a node (which re-renders the
      // SVG) doesn't snap the view back to the default zoom/pan.
      if (transformRef.current !== d3.zoomIdentity) {
        zoom.transform(svg as any, transformRef.current);
      }
    } else {
      zoomRef.current = null;
    }
  }, [laidOut, size, activePathIds, isMobile, inView]);

  const resetView = () => {
    const svg = d3.select(svgRef.current);
    if (svgRef.current && zoomRef.current) {
      transformRef.current = d3.zoomIdentity;
      zoomRef.current.transform(svg as any, d3.zoomIdentity);
      setZoomed(false);
    }
  };

  return (
    <div ref={setContainerRef} id={id} className="relative w-full">
      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-600">
        {(['root', 'varna', 'caste-cluster', 'sub-jati', 'kootam'] as CasteLevel[]).map((lv) => (
          <span key={lv} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: LEVEL_COLOR[lv].fill }} />
            {LEVEL_COLOR[lv].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 animate-pulse rounded-full bg-rose-500 ring-2 ring-rose-300" />
          You are here (Kadai)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full bg-violet-500 ring-2 ring-violet-300" />
          Also mapped: Nattukottai Chettiar
        </span>
      </div>

      {isMobile && measured && (
        <p className="mb-2 text-center text-xs text-stone-400">
          Tap any node to explore · pinch to zoom, drag to pan
        </p>
      )}

      <div className="relative overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2 sm:p-4">
        {isMobile && zoomed && (
          <button
            type="button"
            onClick={resetView}
            className="absolute right-3 top-3 z-10 rounded-full border border-stone-300 bg-white/95 px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm backdrop-blur transition hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            ↺ Reset view
          </button>
        )}
        {measured && (
          <svg
            ref={svgRef}
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
            className="mx-auto block max-w-full"
            style={isMobile ? { touchAction: 'pan-y' } : undefined}
            role="img"
            aria-label="Dendrogram from Indian society through varna and jati to the Kadai kootam"
          />
        )}
      </div>

      {selected && (
        <Drawer
          node={selected}
          siblings={siblingsOf(root, selected.id)}
          onNavigate={setSelected}
          onClose={() => setSelected(null)}
          isMobile={isMobile}
        />
      )}
      <Tooltip x={tip.x} y={tip.y}>{tip.content}</Tooltip>
    </div>
  );
}

// ─────────────────────────── Shared helpers ───────────────────────────

type Handlers = {
  setSelected: (n: TreeNode) => void;
  setHoveredId: (id: string | null) => void;
  setTip: (s: TooltipState) => void;
  inView: boolean;
  isMobile: boolean;
};

function truncate(s: string, max: number) {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

// ─────────────────────────── Vertical (mobile) renderer ───────────────────────────

function renderVertical(
  svg: d3.Selection<SVGSVGElement | null, unknown, null, undefined>,
  root: d3.HierarchyNode<TreeNode>,
  size: { width: number; height: number },
  activePathIds: Set<string>,
  handlers: Handlers,
) {
  const reduced = prefersReducedMotion();
  const padL = PAD_X, padT = PAD_T;
  const m = handlers.isMobile;
  // Desktop has room for larger dots, fonts, and longer labels.
  const R = { hi: m ? 8 : 9.5, sec: m ? 7 : 8.5, branch: m ? 5 : 6, leaf: m ? 4 : 5 };
  const F = { root: m ? 12 : 15, varna: m ? 9 : 12, hi: m ? 11 : 13, base: m ? 9 : 11 };
  const TR = { root: m ? 18 : 26, varna: m ? 12 : 18, base: m ? 20 : 30 };

  // d.x = horizontal, d.y = vertical (from d3.tree top-down layout).
  const nx = (d: d3.HierarchyNode<TreeNode>) => padL + (d as any).x as number;
  const ny = (d: d3.HierarchyNode<TreeNode>) => padT + (d as any).y as number;

  // Only label: root, varna level, the secondary node, and nodes on the active
  // highlight path.
  const showLabel = (d: d3.HierarchyNode<TreeNode>) =>
    d.data.level === 'root' || d.data.level === 'varna' || d.data.secondary || activePathIds.has(d.data.id);

  const g = svg.append('g').attr('class', 'vjr-zoom-layer');

  // When a node is focused (tap/hover), dim everything not on its ancestor
  // path so the lineage reads clearly on a small screen.
  const focusActive = activePathIds.size > 0;

  // Links: cubic Bezier, top-down.
  g.append('g')
    .attr('fill', 'none')
    .selectAll('path')
    .data(root.links())
    .join('path')
    .attr('d', (d: any) => {
      const sx = nx(d.source), sy = ny(d.source);
      const tx = nx(d.target), ty = ny(d.target);
      const my = (sy + ty) / 2;
      return `M${sx},${sy}C${sx},${my} ${tx},${my} ${tx},${ty}`;
    })
    .attr('stroke', (d: any) => {
      const onPath = activePathIds.has(d.source.data.id) && activePathIds.has(d.target.data.id);
      return onPath ? CHART.linkActive : CHART.link;
    })
    .attr('stroke-linecap', 'round')
    .attr('stroke-width', (d: any) => {
      const onPath = activePathIds.has(d.source.data.id) && activePathIds.has(d.target.data.id);
      // Depth-tapered: trunk reads heavier than leaf twigs.
      return onPath ? 3 : Math.max(1.2, 2.2 - d.target.depth * 0.3);
    })
    .attr('stroke-opacity', (d: any) => {
      const onPath = activePathIds.has(d.source.data.id) && activePathIds.has(d.target.data.id);
      return focusActive && !onPath ? 0.35 : 0.85;
    });

  // Nodes.
  const node = g
    .append('g')
    .selectAll('g')
    .data(root.descendants())
    .join('g')
    .attr('transform', (d) => `translate(${nx(d)},${ny(d)})`)
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `${d.data.name.en} — ${LEVEL_COLOR[d.data.level].label}`)
    .style('cursor', 'pointer')
    .style('outline', 'none')
    .style('opacity', (d) => (focusActive && !activePathIds.has(d.data.id) ? 0.4 : 1))
    // Click/tap opens the detail drawer (setSelected); hover/keyboard-focus
    // lights the ancestor path and reveals its labels (setHoveredId). No floating
    // tooltip — the in-tree labels and the drawer carry the naming.
    .on('click', (_, d) => handlers.setSelected(d.data))
    .on('mouseenter', (_event: MouseEvent, d) => { handlers.setHoveredId(d.data.id); })
    .on('mouseleave', () => { handlers.setHoveredId(null); })
    .on('focus', function (_: FocusEvent, d) { handlers.setHoveredId(d.data.id); })
    .on('blur', () => { handlers.setHoveredId(null); })
    .on('keydown', function (event: KeyboardEvent, d) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handlers.setSelected(d.data); }
    });

  // Invisible ≥44px touch target behind every node so taps land reliably on a
  // small screen (WCAG 2.5.5). The visible dot stays small for visual density.
  node
    .append('circle')
    .attr('r', 22)
    .attr('fill', 'transparent')
    .attr('stroke', 'none')
    .style('pointer-events', 'all');

  node
    .append('circle')
    .attr('r', (d) => d.data.highlight ? R.hi : d.data.secondary ? R.sec : d.children ? R.branch : R.leaf)
    .attr('fill', (d) => LEVEL_COLOR[d.data.level].fill)
    .attr('stroke', (d) => LEVEL_COLOR[d.data.level].stroke)
    .attr('stroke-width', (d) => activePathIds.has(d.data.id) ? 2 : 1)
    .style('pointer-events', 'none')
    .attr('filter', (d) => d.data.highlight ? 'url(#kadai-glow)' : d.data.secondary ? 'url(#secondary-glow)' : null)
    .attr('class', (d) => d.data.highlight ? 'animate-pulse' : null);

  // Highlight ring around Kadai.
  node.filter((d) => !!d.data.highlight)
    .append('circle')
    .attr('r', m ? 13 : 15)
    .attr('fill', 'none')
    .attr('stroke', '#f43f5e')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.7)
    .attr('class', 'animate-pulse');

  // Secondary ring around the Nagarathar node (violet, no pulse).
  node.filter((d) => !!d.data.secondary)
    .append('circle')
    .attr('r', m ? 12 : 14)
    .attr('fill', 'none')
    .attr('stroke', SECONDARY_RING)
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '3 2')
    .attr('stroke-opacity', 0.8);

  // Labels: root/varna = below (dy 18), active internal = above (dy -10), active leaf = below (dy 18).
  node.filter((d) => showLabel(d))
    .append('text')
    .attr('dy', (d) => {
      const below = m ? 18 : 22;
      const above = m ? -10 : -14;
      if (d.data.level === 'root' || d.data.level === 'varna') return below;
      return d.children ? above : below;
    })
    .attr('text-anchor', 'middle')
    .attr('font-size', (d) => {
      if (d.data.level === 'root') return F.root;
      if (d.data.level === 'varna') return F.varna;
      if (d.data.highlight) return F.hi;
      return F.base;
    })
    .attr('font-weight', (d) =>
      d.data.highlight || d.data.secondary || d.data.level === 'root' || d.data.level === 'varna' ? 600 : 500
    )
    .attr('fill', (d) =>
      d.data.secondary ? LEVEL_COLOR['temple-clan'].text
      : activePathIds.has(d.data.id) ? '#0f172a' : LEVEL_COLOR[d.data.level].text
    )
    .attr('paint-order', 'stroke')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 3)
    .text((d) => {
      const raw = d.data.highlight ? `★ ${d.data.name.en}` : d.data.secondary ? `◆ ${d.data.name.en}` : d.data.name.en;
      if (d.data.level === 'root') return truncate(raw, TR.root);
      if (d.data.level === 'varna') return truncate(raw, TR.varna);
      return truncate(raw, TR.base);
    });

  // Entry animation.
  if (!reduced && handlers.inView) {
    node.each(function (d, i) {
      const sel = d3.select(this);
      const delay = Math.min(d.depth * 60 + i * 5, 600);
      sel.style('opacity', 0).style('transition', `opacity 360ms ease ${delay}ms`);
      requestAnimationFrame(() => sel.style('opacity', null));
    });
  } else if (!handlers.inView && !reduced) {
    node.style('opacity', 0);
  }
}

// ─────────────────────────── Drawer ───────────────────────────

// Siblings of a node (same parent), as raw TreeNodes — used for the drawer's
// prev/next chevrons so a tapped cluster can be browsed without dismissing.
function siblingsOf(root: d3.HierarchyNode<TreeNode>, id: string): TreeNode[] {
  const hit = root.descendants().find((d) => d.data.id === id);
  if (!hit || !hit.parent || !hit.parent.children) return [];
  return hit.parent.children.map((c) => c.data);
}

function Drawer({
  node,
  siblings,
  onNavigate,
  onClose,
  isMobile,
}: {
  node: TreeNode;
  siblings: TreeNode[];
  onNavigate: (n: TreeNode) => void;
  onClose: () => void;
  isMobile: boolean;
}) {
  const color = LEVEL_COLOR[node.level];
  const tier = node.tier ? TIER_BADGE[node.tier] : null;

  const idx = siblings.findIndex((s) => s.id === node.id);
  const hasSiblings = siblings.length > 1 && idx >= 0;
  const goSibling = (dir: -1 | 1) => {
    if (!hasSiblings) return;
    const next = siblings[(idx + dir + siblings.length) % siblings.length];
    if (next) onNavigate(next);
  };

  const header = (
    <>
      <span
        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white"
        style={{ background: color.fill }}
      >
        {color.label}
      </span>
      <h3 className="mt-2 text-2xl font-bold text-stone-900">{node.name.en}</h3>
      {node.name.ta && <p className="mt-1 font-tamil text-lg text-stone-600">{node.name.ta}</p>}
    </>
  );

  const subheader = hasSiblings ? (
    <div className="flex items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-5 py-2.5">
      <button
        type="button"
        onClick={() => goSibling(-1)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <span aria-hidden="true">‹</span> Prev
      </button>
      <span className="text-[11px] text-stone-500">
        {idx + 1} of {siblings.length} siblings
      </span>
      <button
        type="button"
        onClick={() => goSibling(1)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Next <span aria-hidden="true">›</span>
      </button>
    </div>
  ) : undefined;

  return (
    <UIDrawer
      isMobile={isMobile}
      onClose={onClose}
      ariaLabel={`${node.name.en} details`}
      header={header}
      subheader={subheader}
      onArrow={goSibling}
    >
      <div className="space-y-4 p-5 text-sm leading-relaxed text-stone-700">
          {tier && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${tier.bg} ${tier.fg}`}>
              <span aria-hidden="true">{tier.emoji}</span>
              <span className="text-xs font-medium uppercase tracking-wide">{tier.label}</span>
            </div>
          )}
          {node.highlight && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
              <p className="text-xs font-semibold uppercase tracking-wide">You are here</p>
              <p className="mt-1 text-sm">
                The Kadai (quail) kootam — the worked example used across this site — is one of the ~145 exogamous clans of the Kongu Vellala.
              </p>
            </div>
          )}
          {node.secondary && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-violet-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Also mapped</p>
              <p className="mt-1 text-sm">
                A second documented community — the Nattukottai Chettiar (Nagarathar), shown here as a parallel worked example. Vairavanpatti is one of their nine exogamous temple-clans (Nava Kovil), with Kala Bhairava as its clan deity.
              </p>
              <a
                href="/lineage/nagarathar/"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-violet-800 underline hover:text-violet-950"
              >
                Read the Nagarathar deep-dive
                <span aria-hidden="true">→</span>
              </a>
            </div>
          )}
          {node.summary && <p>{node.summary}</p>}
          {node.note && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Framing note</p>
              <p className="mt-1 text-sm">{node.note}</p>
            </div>
          )}
          <dl className="grid grid-cols-3 gap-2 border-t border-stone-200 pt-4 text-xs">
            <dt className="text-stone-500">Level</dt>
            <dd className="col-span-2 text-stone-800">{color.label}</dd>
            <dt className="text-stone-500">ID</dt>
            <dd className="col-span-2 font-mono text-stone-800">{node.id}</dd>
            {node.children && (
              <>
                <dt className="text-stone-500">Children</dt>
                <dd className="col-span-2 text-stone-800">{node.children.length}</dd>
              </>
            )}
          </dl>
        </div>
    </UIDrawer>
  );
}
