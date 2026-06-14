import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { varnaJatiTree, type TreeNode, type CasteLevel } from '../../data/varna-jati-tree';
import Tooltip, { type TooltipState } from '../ui/Tooltip';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { useInView } from '../../hooks/useInView';
import { prefersReducedMotion } from '../../lib/chart-motion';
import { CHART } from '../../lib/chart-tokens';

// ---------- Palette ----------
const LEVEL_COLOR: Record<
  CasteLevel,
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

// Mobile vertical tree: comfortable per-level spacing so levels never crowd.
// Canvas height grows with tree depth (the card scrolls vertically + pinch-zooms),
// and breadth scrolls horizontally inside the card when leaves are dense.
const MOBILE_DEPTH_STEP = 104;
const MOBILE_PAD_T = 40;
const MOBILE_PAD_B = 40;
const MOBILE_PAD_X = 16;
const MOBILE_LEAF_BREADTH = 18; // min horizontal px budget per leaf node

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
    const longestLeafLabel = root.leaves().reduce((m, d) => Math.max(m, d.data.name.en.length), 0);
    return { maxDepth, leafCount, longestLeafLabel };
  }, [root]);

  // Derive the SVG canvas from the measured width + tree shape.
  //  • Mobile: vertical tree — height grows with depth; breadth scrolls inside
  //    the card so dense leaf levels never overlap.
  //  • Desktop: a square that the radial chart fills edge-to-edge (see `radius`).
  const size = useMemo(() => {
    if (isMobile) {
      const { maxDepth, leafCount } = treeMetrics;
      const height = MOBILE_PAD_T + MOBILE_PAD_B + maxDepth * MOBILE_DEPTH_STEP;
      const breadth = Math.max(width, leafCount * MOBILE_LEAF_BREADTH + MOBILE_PAD_X * 2);
      return { width: Math.max(breadth, 320), height };
    }
    const dim = Math.min(920, Math.max(560, width));
    return { width: dim, height: dim };
  }, [isMobile, width, treeMetrics]);

  // Compute layout whenever size / mode changes.
  const laidOut = useMemo(() => {
    const r = root.copy();
    if (isMobile) {
      // Top-down tree layout: d.x = horizontal breadth, d.y = vertical depth.
      const maxDepth = r.height || 4;
      const treeHeight = maxDepth * MOBILE_DEPTH_STEP;
      d3.tree<TreeNode>()
        .size([size.width - MOBILE_PAD_X * 2, treeHeight])
        .separation((a, b) => (a.parent === b.parent ? 1 : 2))(r);
      return r;
    }
    // Desktop: radial layout. Label-aware padding makes outer labels fit *inside*
    // the square, so the circular tree fills the canvas with no dead corners.
    const labelPx = Math.min(treeMetrics.longestLeafLabel, 18) * 6.2;
    const pad = Math.max(72, labelPx + 24);
    const radius = Math.min(size.width, size.height) / 2 - pad;
    d3.tree<TreeNode>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.8) / Math.max(a.depth, 1))(r);
    return r;
  }, [root, size, isMobile, treeMetrics]);

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

    if (isMobile) {
      renderVertical(svg, laidOut, size, activePathIds, { setSelected, setHoveredId, setTip, inView });
    } else {
      renderRadial(svg, laidOut, size, activePathIds, { setSelected, setHoveredId, setTip, inView });
    }

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
            viewBox={
              isMobile
                ? `0 0 ${size.width} ${size.height}`
                : `${-size.width / 2} ${-size.height / 2} ${size.width} ${size.height}`
            }
            className="block max-w-full"
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
};

function tipContent(d: d3.HierarchyNode<TreeNode>) {
  return (
    <>
      <strong>{d.data.name.en}</strong>
      <br />
      <span style={{ opacity: 0.8 }}>{LEVEL_COLOR[d.data.level].label}</span>
    </>
  );
}

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
  const padL = MOBILE_PAD_X, padT = MOBILE_PAD_T;

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
    .on('click', (_, d) => handlers.setSelected(d.data))
    .on('mouseenter', (event: MouseEvent, d) => {
      handlers.setHoveredId(d.data.id);
      handlers.setTip({ x: event.clientX, y: event.clientY, content: tipContent(d) });
    })
    .on('mouseleave', () => { handlers.setHoveredId(null); handlers.setTip({ x: null, y: null, content: null }); })
    .on('focus', function (_: FocusEvent, d) {
      handlers.setHoveredId(d.data.id);
      const r = (this as SVGGElement).getBoundingClientRect();
      handlers.setTip({ x: r.left + r.width / 2, y: r.top, content: tipContent(d) });
    })
    .on('blur', () => { handlers.setHoveredId(null); handlers.setTip({ x: null, y: null, content: null }); })
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
    .attr('r', (d) => d.data.highlight ? 8 : d.data.secondary ? 7 : d.children ? 5 : 4)
    .attr('fill', (d) => LEVEL_COLOR[d.data.level].fill)
    .attr('stroke', (d) => LEVEL_COLOR[d.data.level].stroke)
    .attr('stroke-width', (d) => activePathIds.has(d.data.id) ? 2 : 1)
    .style('pointer-events', 'none')
    .attr('filter', (d) => d.data.highlight ? 'url(#kadai-glow)' : d.data.secondary ? 'url(#secondary-glow)' : null)
    .attr('class', (d) => d.data.highlight ? 'animate-pulse' : null);

  // Highlight ring around Kadai.
  node.filter((d) => !!d.data.highlight)
    .append('circle')
    .attr('r', 13)
    .attr('fill', 'none')
    .attr('stroke', '#f43f5e')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.7)
    .attr('class', 'animate-pulse');

  // Secondary ring around the Nagarathar node (violet, no pulse).
  node.filter((d) => !!d.data.secondary)
    .append('circle')
    .attr('r', 12)
    .attr('fill', 'none')
    .attr('stroke', SECONDARY_RING)
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '3 2')
    .attr('stroke-opacity', 0.8);

  // Labels: root/varna = below (dy 18), active internal = above (dy -10), active leaf = below (dy 18).
  node.filter((d) => showLabel(d))
    .append('text')
    .attr('dy', (d) => {
      if (d.data.level === 'root' || d.data.level === 'varna') return 18;
      return d.children ? -10 : 18;
    })
    .attr('text-anchor', 'middle')
    .attr('font-size', (d) => {
      if (d.data.level === 'root') return 12;
      if (d.data.level === 'varna') return 9;
      if (d.data.highlight) return 11;
      return 9;
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
      if (d.data.level === 'root') return truncate(raw, 18);
      if (d.data.level === 'varna') return truncate(raw, 12);
      return truncate(raw, 20);
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

// ─────────────────────────── Radial (desktop) renderer ───────────────────────────

function renderRadial(
  svg: d3.Selection<SVGSVGElement | null, unknown, null, undefined>,
  root: d3.HierarchyNode<TreeNode>,
  size: { width: number; height: number },
  activePathIds: Set<string>,
  handlers: Handlers,
) {
  const reduced = prefersReducedMotion();

  // Rotate so the highlighted leaf sits at roughly upper-right.
  const highlightLeaf = root.descendants().find((d) => d.data.highlight);
  let rotation = 0;
  if (highlightLeaf) {
    const angle = (highlightLeaf as any).x as number;
    rotation = -30 - (angle * 180) / Math.PI + 90;
  }

  const g = svg.append('g').attr('transform', `rotate(${rotation})`);

  // Only show labels for: root, varna, the secondary node, and nodes on the
  // active/highlight path.
  const showLabel = (d: d3.HierarchyNode<TreeNode>) =>
    d.depth <= 1 || activePathIds.has(d.data.id) || d.data.highlight || d.data.secondary;

  // Links.
  const linkGen = d3
    .linkRadial<d3.HierarchyPointLink<TreeNode>, d3.HierarchyPointNode<TreeNode>>()
    .angle((d) => (d as any).x)
    .radius((d) => (d as any).y);

  g.append('g')
    .attr('fill', 'none')
    .selectAll('path')
    .data(root.links())
    .join('path')
    .attr('d', linkGen as any)
    .attr('stroke-linecap', 'round')
    .attr('stroke', (d) => {
      const onPath = activePathIds.has(d.source.data.id) && activePathIds.has(d.target.data.id);
      return onPath ? CHART.linkActive : CHART.link;
    })
    .attr('stroke-width', (d) => {
      const onPath = activePathIds.has(d.source.data.id) && activePathIds.has(d.target.data.id);
      // Depth-tapered: the varna trunk carries visual weight, leaf twigs recede.
      return onPath ? 2.6 : Math.max(1, 2.4 - d.target.depth * 0.35);
    })
    .attr('stroke-opacity', (d) => {
      const onPath = activePathIds.has(d.source.data.id) && activePathIds.has(d.target.data.id);
      return onPath ? 1 : 0.75;
    });

  // Nodes.
  const node = g
    .append('g')
    .selectAll('g')
    .data(root.descendants())
    .join('g')
    .attr('transform', (d) => {
      const x = (d as any).x as number;
      const y = (d as any).y as number;
      return `rotate(${(x * 180) / Math.PI - 90}) translate(${y},0)`;
    })
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `${d.data.name.en} — ${LEVEL_COLOR[d.data.level].label}`)
    .style('cursor', 'pointer')
    .style('outline', 'none')
    .on('mouseenter', (event: MouseEvent, d) => {
      handlers.setHoveredId(d.data.id);
      handlers.setTip({ x: event.clientX, y: event.clientY, content: tipContent(d) });
    })
    .on('mouseleave', () => { handlers.setHoveredId(null); handlers.setTip({ x: null, y: null, content: null }); })
    .on('focus', function (_: FocusEvent, d) {
      handlers.setHoveredId(d.data.id);
      const r = (this as SVGGElement).getBoundingClientRect();
      handlers.setTip({ x: r.left + r.width / 2, y: r.top, content: tipContent(d) });
    })
    .on('blur', () => { handlers.setHoveredId(null); handlers.setTip({ x: null, y: null, content: null }); })
    .on('click', (_, d) => handlers.setSelected(d.data))
    .on('keydown', function (event: KeyboardEvent, d) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handlers.setSelected(d.data); }
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
        const siblings = d.parent?.children;
        if (!siblings || siblings.length < 2) return;
        const allG = node.nodes() as SVGGElement[];
        const sibIdxs = siblings.map((s) =>
          allG.findIndex((el) => (d3.select(el).datum() as d3.HierarchyNode<TreeNode>).data.id === s.data.id)
        );
        const myIdx = siblings.indexOf(d as any);
        const fwd = event.key === 'ArrowRight' || event.key === 'ArrowDown';
        const nextIdx = sibIdxs[(myIdx + (fwd ? 1 : -1) + siblings.length) % siblings.length];
        if (nextIdx >= 0) { event.preventDefault(); (allG[nextIdx] as unknown as HTMLElement).focus?.(); }
      }
    });

  node
    .append('circle')
    .attr('r', (d) => d.data.highlight ? 9 : d.data.secondary ? 8 : d.children ? 5 : 4)
    .attr('fill', (d) => LEVEL_COLOR[d.data.level].fill)
    .attr('stroke', (d) => LEVEL_COLOR[d.data.level].stroke)
    .attr('stroke-width', (d) => activePathIds.has(d.data.id) ? 2 : 1)
    .attr('filter', (d) => d.data.highlight ? 'url(#kadai-glow)' : d.data.secondary ? 'url(#secondary-glow)' : null)
    .attr('class', (d) => d.data.highlight ? 'animate-pulse' : null);

  if (!reduced && handlers.inView) {
    node.each(function (d, i) {
      const sel = d3.select(this);
      const delay = Math.min(d.depth * 60 + i * 6, 600);
      sel.style('opacity', 0).style('transition', `opacity 360ms ease ${delay}ms`);
      requestAnimationFrame(() => sel.style('opacity', null));
    });
  } else if (!handlers.inView && !reduced) {
    node.style('opacity', 0);
  }

  node.filter((d) => !!d.data.highlight)
    .append('circle')
    .attr('r', 14)
    .attr('fill', 'none')
    .attr('stroke', '#f43f5e')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.7)
    .attr('class', 'animate-pulse');

  // Secondary ring around the Nagarathar node (violet, dashed, no pulse).
  node.filter((d) => !!d.data.secondary)
    .append('circle')
    .attr('r', 13)
    .attr('fill', 'none')
    .attr('stroke', SECONDARY_RING)
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '3 2')
    .attr('stroke-opacity', 0.85);

  // Labels: only for root, varna, secondary, and active path. All others rely on tooltip.
  node.filter((d) => showLabel(d))
    .append('text')
    .attr('dy', '0.32em')
    .attr('x', (d) => {
      const x = (d as any).x as number;
      const screenDeg = (x * 180) / Math.PI - 90 + rotation;
      const norm = ((screenDeg + 180) % 360 + 360) % 360 - 180;
      const onRight = norm > -90 && norm < 90;
      // Wider offset for root/varna to clear the larger dots.
      const offset = d.depth <= 1 ? 12 : 10;
      return onRight ? offset : -offset;
    })
    .attr('text-anchor', (d) => {
      const x = (d as any).x as number;
      const screenDeg = (x * 180) / Math.PI - 90 + rotation;
      const norm = ((screenDeg + 180) % 360 + 360) % 360 - 180;
      const onRight = norm > -90 && norm < 90;
      return onRight ? 'start' : 'end';
    })
    .attr('transform', (d) => {
      const x = (d as any).x as number;
      const screenDeg = (x * 180) / Math.PI - 90 + rotation;
      return `rotate(${-screenDeg})`;
    })
    .attr('font-size', (d) => d.data.level === 'root' ? 13 : d.data.highlight ? 12 : d.data.secondary ? 11 : d.depth <= 1 ? 11 : 10)
    .attr('font-weight', (d) => d.data.highlight || d.data.secondary || d.depth <= 1 ? 600 : 500)
    .attr('fill', (d) =>
      d.data.secondary ? LEVEL_COLOR['temple-clan'].text
      : activePathIds.has(d.data.id) ? '#0f172a' : '#44403c'
    )
    .attr('paint-order', 'stroke')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 3)
    .text((d) => {
      const raw = d.data.highlight ? `★ ${d.data.name.en}` : d.data.secondary ? `◆ ${d.data.name.en}` : d.data.name.en;
      // Truncate deep path labels to avoid overlap with outer nodes.
      if (d.depth >= 3) return truncate(raw, 18);
      return raw;
    });

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
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goSibling(-1);
      if (e.key === 'ArrowRight') goSibling(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, node, siblings]);

  const color = LEVEL_COLOR[node.level];
  const tier = node.tier ? TIER_BADGE[node.tier] : null;

  const idx = siblings.findIndex((s) => s.id === node.id);
  const hasSiblings = siblings.length > 1 && idx >= 0;
  const goSibling = (dir: -1 | 1) => {
    if (!hasSiblings) return;
    const next = siblings[(idx + dir + siblings.length) % siblings.length];
    if (next) onNavigate(next);
  };

  // Swipe-down-to-dismiss on the mobile handle.
  const onHandleTouchStart = (e: React.TouchEvent) => { dragStart.current = e.touches[0].clientY; };
  const onHandleTouchMove = (e: React.TouchEvent) => {
    if (dragStart.current == null) return;
    setDragY(Math.max(0, e.touches[0].clientY - dragStart.current));
  };
  const onHandleTouchEnd = () => {
    if (dragY > 90) onClose();
    setDragY(0);
    dragStart.current = null;
  };

  const panelClasses = isMobile
    ? 'fixed inset-x-0 bottom-0 max-h-[80vh] w-full overflow-y-auto rounded-t-2xl border-t border-stone-200 bg-white shadow-2xl'
    : 'fixed right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-stone-200 bg-white shadow-2xl';

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-stone-900/30 backdrop-blur-sm"
      />
      <aside
        className={panelClasses}
        role="dialog"
        aria-modal="true"
        aria-label={`${node.name.en} details`}
        style={
          isMobile
            ? { transform: `translateY(${dragY}px)`, transition: dragStart.current == null ? 'transform 200ms ease' : 'none', paddingBottom: 'env(safe-area-inset-bottom)' }
            : undefined
        }
      >
        {isMobile && (
          <div
            className="flex cursor-grab touch-none justify-center pt-2.5 pb-1 active:cursor-grabbing"
            onTouchStart={onHandleTouchStart}
            onTouchMove={onHandleTouchMove}
            onTouchEnd={onHandleTouchEnd}
            aria-hidden="true"
          >
            <span className="h-1.5 w-10 rounded-full bg-stone-300" />
          </div>
        )}
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5 pt-3">
          <div>
            <span
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white"
              style={{ background: color.fill }}
            >
              {color.label}
            </span>
            <h3 className="mt-2 text-2xl font-bold text-stone-900">{node.name.en}</h3>
            {node.name.ta && <p className="mt-1 font-tamil text-lg text-stone-600">{node.name.ta}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {hasSiblings && (
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
        )}
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
                This is your kootam. The Kadai (quail) totem marks one of the ~145 exogamous clans of the Kongu Vellala.
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
      </aside>
    </div>
  );
}
