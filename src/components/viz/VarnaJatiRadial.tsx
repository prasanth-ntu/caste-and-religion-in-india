import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { varnaJatiTree, type TreeNode, type CasteLevel } from '../../data/varna-jati-tree';
import Tooltip, { type TooltipState } from '../ui/Tooltip';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------- Palette ----------
// Tailwind-aligned stops. Each level gets a fill / stroke / text trio.
const LEVEL_COLOR: Record<
  CasteLevel,
  { fill: string; stroke: string; text: string; label: string }
> = {
  root: { fill: '#78716c', stroke: '#44403c', text: '#1c1917', label: 'Society' }, // stone
  varna: { fill: '#3b82f6', stroke: '#1d4ed8', text: '#1e3a8a', label: 'Varna' }, // blue
  'caste-cluster': { fill: '#f59e0b', stroke: '#b45309', text: '#78350f', label: 'Caste cluster' }, // amber
  jati: { fill: '#f59e0b', stroke: '#b45309', text: '#78350f', label: 'Jati' }, // amber
  'sub-jati': { fill: '#10b981', stroke: '#047857', text: '#064e3b', label: 'Sub-jati' }, // emerald
  kootam: { fill: '#f43f5e', stroke: '#be123c', text: '#881337', label: 'Kootam' }, // rose
};

const TIER_BADGE: Record<string, { emoji: string; label: string; bg: string; fg: string }> = {
  green: { emoji: '🟢', label: 'well-established', bg: 'bg-emerald-50', fg: 'text-emerald-800' },
  yellow: { emoji: '🟡', label: 'plausible / debated', bg: 'bg-amber-50', fg: 'text-amber-800' },
  red: { emoji: '🔴', label: 'myth / unverified', bg: 'bg-rose-50', fg: 'text-rose-800' },
  rational: { emoji: '⚖️', label: 'rational basis', bg: 'bg-sky-50', fg: 'text-sky-800' },
};

// Counts every node in subtree.
function countNodes(node: TreeNode): number {
  if (!node.children?.length) return 1;
  return 1 + node.children.reduce((acc, c) => acc + countNodes(c), 0);
}

// Find ancestor chain to highlighted node.
function findPath(node: d3.HierarchyNode<TreeNode>, predicate: (n: TreeNode) => boolean): d3.HierarchyNode<TreeNode>[] {
  const target = node.descendants().find((d) => predicate(d.data));
  if (!target) return [];
  return target.ancestors().reverse();
}

interface VarnaJatiRadialProps {
  /** Optional id applied to the chart root. Used by `ChartSkeleton` to detect
   *  hydration via `data-hydrated="true"` and auto-hide its placeholder. */
  id?: string;
}

export default function VarnaJatiRadial({ id }: VarnaJatiRadialProps = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Defer SVG rendering until ResizeObserver has fired with a real container
  // width. This prevents the 800×800 flash on the first paint.
  const [measured, setMeasured] = useState(false);

  const [size, setSize] = useState({ width: 800, height: 800 });
  const [isMobile, setIsMobile] = useState(false);
  const [selected, setSelected] = useState<TreeNode | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tip, setTip] = useState<TooltipState>({ x: null, y: null, content: null });
  const [inView, setInView] = useState(false);

  // IntersectionObserver: trigger one-shot entry animation when the chart appears.
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

  // -------- Responsive observer --------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const mobile = w < 768;
        setIsMobile(mobile);
        // For mobile vertical, height grows with leaves; for desktop, square.
        if (mobile) {
          const leaves = countNodes(varnaJatiTree);
          setSize({ width: Math.max(360, w), height: Math.max(720, leaves * 22) });
        } else {
          const dim = Math.min(1000, Math.max(560, w));
          setSize({ width: dim, height: dim });
        }
        // Mark as measured on the first real ResizeObserver callback so the SVG
        // enters the DOM at actual container width rather than the 800px fallback.
        setMeasured(true);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Hydration sentinel — fires once the chart has been measured and painted at
  // real size, so ChartSkeleton hides at the right moment. Mirrors ZoomMap.tsx.
  useEffect(() => {
    if (!measured) return;
    containerRef.current?.setAttribute('data-hydrated', 'true');
  }, [measured]);

  // -------- Build hierarchy (memoised) --------
  const root = useMemo(() => {
    const h = d3.hierarchy<TreeNode>(varnaJatiTree);
    // Stable sort: highlighted first within siblings so Kadai branch is visible.
    h.sort((a, b) => {
      const ah = a.data.highlight ? -1 : 0;
      const bh = b.data.highlight ? -1 : 0;
      return ah - bh;
    });
    return h;
  }, []);

  // Path from root to highlighted node — used for default focus + idle glow.
  const highlightPathIds = useMemo(() => {
    const path = findPath(root, (n) => !!n.highlight);
    return new Set(path.map((d) => d.data.id));
  }, [root]);

  // Compute layout whenever size changes.
  const laidOut = useMemo(() => {
    const r = root.copy();
    if (isMobile) {
      // Vertical tidy tree (horizontal layout flipped to vertical-flowing): x = depth*step, y = node order.
      // d3.tree() gives x (along the breadth) and y (depth). We swap to make tree flow top-to-bottom.
      const layout = d3.tree<TreeNode>().nodeSize([22, 160]);
      layout(r);
      return r;
    }
    const radius = Math.min(size.width, size.height) / 2 - 130;
    const layout = d3.tree<TreeNode>().size([2 * Math.PI, radius]).separation((a, b) => (a.parent === b.parent ? 1 : 1.8) / Math.max(a.depth, 1));
    layout(r);
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

  // -------- Render via D3 imperative pass --------
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;
    svg.selectAll('*').remove();

    // Re-inject the glow filter after clearing.
    const defs = svg.append('defs');
    const filter = defs
      .append('filter')
      .attr('id', 'kadai-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', 3.5).attr('result', 'blur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    if (isMobile) {
      renderVertical(svg, laidOut, size, activePathIds, {
        setSelected,
        setHoveredId,
        setTip,
        inView,
      });
    } else {
      renderRadial(svg, laidOut, size, activePathIds, {
        setSelected,
        setHoveredId,
        setTip,
        inView,
      });
    }
  }, [laidOut, size, activePathIds, isMobile, inView]);

  return (
    <div ref={containerRef} id={id} className="relative w-full">
      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-600">
        {(['root', 'varna', 'caste-cluster', 'sub-jati', 'kootam'] as CasteLevel[]).map((lv) => (
          <span key={lv} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: LEVEL_COLOR[lv].fill }}
            />
            {LEVEL_COLOR[lv].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 animate-pulse rounded-full bg-rose-500 ring-2 ring-rose-300" />
          You are here (Kadai)
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2 sm:p-4">
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
            role="img"
            aria-label="Radial dendrogram from Indian society to varna to jati to the Kadai kootam"
          />
        )}
      </div>

      {/* Drawer */}
      {selected && <Drawer node={selected} onClose={() => setSelected(null)} isMobile={isMobile} />}
      <Tooltip x={tip.x} y={tip.y}>{tip.content}</Tooltip>
    </div>
  );
}

// ---------------- Radial renderer ----------------
function renderRadial(
  svg: d3.Selection<SVGSVGElement | null, unknown, null, undefined>,
  root: d3.HierarchyNode<TreeNode>,
  size: { width: number; height: number },
  activePathIds: Set<string>,
  handlers: {
    setSelected: (n: TreeNode) => void;
    setHoveredId: (id: string | null) => void;
    setTip: (s: TooltipState) => void;
    inView: boolean;
  },
) {
  const reduced = prefersReducedMotion();
  // Initial transform: gently rotate so the highlighted leaf sits roughly at the top-right.
  const highlightLeaf = root.descendants().find((d) => d.data.highlight);
  let rotation = 0;
  if (highlightLeaf) {
    // d3.tree polar: x is the angle in radians. Rotate so highlight x maps to -45deg (upper right).
    const angle = (highlightLeaf as any).x as number; // radians
    const targetDeg = -30; // pleasant upper-right
    rotation = targetDeg - (angle * 180) / Math.PI + 90;
  }

  const g = svg.append('g').attr('transform', `rotate(${rotation})`);

  // Links
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
    .attr('stroke', (d) => {
      const onPath = activePathIds.has(d.source.data.id) && activePathIds.has(d.target.data.id);
      return onPath ? '#0f172a' : '#d6d3d1';
    })
    .attr('stroke-width', (d) => {
      const onPath = activePathIds.has(d.source.data.id) && activePathIds.has(d.target.data.id);
      return onPath ? 2.2 : 1;
    })
    .attr('stroke-opacity', 0.9);

  // Nodes
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
    .attr('aria-label', (d) => `${d.data.name.en} (${d.data.level})`)
    .style('cursor', 'pointer')
    .style('outline', 'none')
    .on('mouseenter', (event: MouseEvent, d) => {
      handlers.setHoveredId(d.data.id);
      handlers.setTip({
        x: event.clientX,
        y: event.clientY,
        content: <><strong>{d.data.name.en}</strong><br /><span style={{ opacity: 0.85 }}>{d.data.level}</span></>,
      });
    })
    .on('mouseleave', () => { handlers.setHoveredId(null); handlers.setTip({ x: null, y: null, content: null }); })
    .on('focus', function (event: FocusEvent, d) {
      handlers.setHoveredId(d.data.id);
      const r = (this as SVGGElement).getBoundingClientRect();
      handlers.setTip({
        x: r.left + r.width / 2,
        y: r.top,
        content: <><strong>{d.data.name.en}</strong><br /><span style={{ opacity: 0.85 }}>{d.data.level}</span></>,
      });
      void event;
    })
    .on('blur', () => { handlers.setHoveredId(null); handlers.setTip({ x: null, y: null, content: null }); })
    .on('click', (_, d) => handlers.setSelected(d.data))
    .on('keydown', function (event: KeyboardEvent, d) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handlers.setSelected(d.data);
        return;
      }
      // Arrow-key sibling navigation: cycle siblings (same parent).
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        const siblings = d.parent?.children;
        if (!siblings || siblings.length < 2) return;
        const allG = node.nodes() as SVGGElement[];
        const sibIdxs = siblings.map((s) => allG.findIndex((el) => (d3.select(el).datum() as d3.HierarchyNode<TreeNode>).data.id === s.data.id));
        const myIdx = siblings.indexOf(d as any);
        const fwd = event.key === 'ArrowRight' || event.key === 'ArrowDown';
        const nextIdx = sibIdxs[(myIdx + (fwd ? 1 : -1) + siblings.length) % siblings.length];
        if (nextIdx >= 0) {
          event.preventDefault();
          (allG[nextIdx] as unknown as HTMLElement).focus?.();
        }
      }
    });

  node
    .append('circle')
    .attr('r', (d) => (d.data.highlight ? 9 : d.children ? 5 : 4))
    .attr('fill', (d) => LEVEL_COLOR[d.data.level].fill)
    .attr('stroke', (d) => LEVEL_COLOR[d.data.level].stroke)
    .attr('stroke-width', (d) => (activePathIds.has(d.data.id) ? 2 : 1))
    .attr('filter', (d) => (d.data.highlight ? 'url(#kadai-glow)' : null))
    .attr('class', (d) => (d.data.highlight ? 'animate-pulse' : null));

  // Entry animation — stagger node opacity by depth + index (capped 600ms).
  if (!reduced && handlers.inView) {
    node.each(function (d, i) {
      const sel = d3.select(this);
      const delay = Math.min((d.depth * 60) + (i * 6), 600);
      sel
        .style('opacity', 0)
        .style('transition', `opacity 360ms ease ${delay}ms`);
      requestAnimationFrame(() => sel.style('opacity', null));
    });
  } else if (!handlers.inView && !reduced) {
    node.style('opacity', 0);
  }

  // Highlight ring around Kadai
  node
    .filter((d) => !!d.data.highlight)
    .append('circle')
    .attr('r', 14)
    .attr('fill', 'none')
    .attr('stroke', '#f43f5e')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.7)
    .attr('class', 'animate-pulse');

  // Labels — counter-rotate so every label reads horizontally on screen,
  // regardless of its position around the circle. Anchor on the side of the
  // node that faces "outward" relative to the global rotation.
  node
    .append('text')
    .attr('dy', '0.32em')
    .attr('x', (d) => {
      // Effective on-screen angle of this node, in degrees from the +x axis.
      // The group transform is rotate((x*180/π) - 90), then a global rotate(rotation)
      // is applied to the parent <g>. Together the node sits at screen angle
      // = (x*180/π) - 90 + rotation.
      const x = (d as any).x as number;
      const screenDeg = (x * 180) / Math.PI - 90 + rotation;
      // Normalise to (-180, 180]
      const norm = ((screenDeg + 180) % 360 + 360) % 360 - 180;
      // If node is on the right half of the screen (-90..90), label goes right.
      const onRight = norm > -90 && norm < 90;
      return onRight ? 10 : -10;
    })
    .attr('text-anchor', (d) => {
      const x = (d as any).x as number;
      const screenDeg = (x * 180) / Math.PI - 90 + rotation;
      const norm = ((screenDeg + 180) % 360 + 360) % 360 - 180;
      const onRight = norm > -90 && norm < 90;
      return onRight ? 'start' : 'end';
    })
    .attr('transform', (d) => {
      // Counter-rotate by the parent group's rotation so the text is horizontal
      // in screen space. The parent group rotates by (x*180/π) - 90, and the
      // outer <g> rotates by `rotation`, so the net rotation we must undo (in
      // this node's local frame, which already includes the global rotate) is
      // (x*180/π) - 90 + rotation.
      const x = (d as any).x as number;
      const screenDeg = (x * 180) / Math.PI - 90 + rotation;
      return `rotate(${-screenDeg})`;
    })
    .attr('font-size', (d) => (d.data.level === 'root' ? 13 : d.data.highlight ? 12 : 10))
    .attr('font-weight', (d) => (d.data.highlight || d.data.level === 'root' || d.data.level === 'varna' ? 600 : 400))
    .attr('fill', (d) => (activePathIds.has(d.data.id) ? '#0f172a' : '#44403c'))
    .attr('paint-order', 'stroke')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 3)
    .text((d) => (d.data.highlight ? `★ ${d.data.name.en}` : d.data.name.en));
}

// ---------------- Vertical (mobile) renderer ----------------
function renderVertical(
  svg: d3.Selection<SVGSVGElement | null, unknown, null, undefined>,
  root: d3.HierarchyNode<TreeNode>,
  size: { width: number; height: number },
  activePathIds: Set<string>,
  handlers: {
    setSelected: (n: TreeNode) => void;
    setHoveredId: (id: string | null) => void;
    setTip: (s: TooltipState) => void;
    inView: boolean;
  },
) {
  const reduced = prefersReducedMotion();
  // Normalise layout to fit width/height. d3.tree() with nodeSize([22, 160]) sets x as horizontal-leaf-coord, y as depth-coord.
  // We render tree top-down: convert to (y vertical = node-x, x horizontal = depth*step).
  const nodes = root.descendants();
  const xs = nodes.map((d: any) => d.x as number);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const padTop = 30;
  const padLeft = 40;
  const usableHeight = size.height - padTop * 2;
  const xScale = (v: number) => padTop + ((v - minX) / (maxX - minX || 1)) * usableHeight;

  const maxDepth = (root.height || 1);
  const depthStep = (size.width - padLeft - 220) / maxDepth; // leave room for labels on the right

  const g = svg.append('g');

  // Links — quadratic horizontal-flow curves.
  g.append('g')
    .attr('fill', 'none')
    .selectAll('path')
    .data(root.links())
    .join('path')
    .attr('d', (d: any) => {
      const sx = padLeft + d.source.depth * depthStep;
      const sy = xScale(d.source.x);
      const tx = padLeft + d.target.depth * depthStep;
      const ty = xScale(d.target.x);
      const mx = (sx + tx) / 2;
      return `M${sx},${sy}C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
    })
    .attr('stroke', (d) => {
      const onPath = activePathIds.has(d.source.data.id) && activePathIds.has(d.target.data.id);
      return onPath ? '#0f172a' : '#d6d3d1';
    })
    .attr('stroke-width', (d) => {
      const onPath = activePathIds.has(d.source.data.id) && activePathIds.has(d.target.data.id);
      return onPath ? 2.2 : 1;
    });

  const node = g
    .append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('transform', (d: any) => `translate(${padLeft + d.depth * depthStep},${xScale(d.x)})`)
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `${d.data.name.en} (${d.data.level})`)
    .style('cursor', 'pointer')
    .style('outline', 'none')
    .on('click', (_, d) => handlers.setSelected(d.data))
    .on('mouseenter', (event: MouseEvent, d) => {
      handlers.setHoveredId(d.data.id);
      handlers.setTip({
        x: event.clientX,
        y: event.clientY,
        content: <><strong>{d.data.name.en}</strong><br /><span style={{ opacity: 0.85 }}>{d.data.level}</span></>,
      });
    })
    .on('mouseleave', () => { handlers.setHoveredId(null); handlers.setTip({ x: null, y: null, content: null }); })
    .on('focus', function (_, d) {
      handlers.setHoveredId(d.data.id);
      const r = (this as SVGGElement).getBoundingClientRect();
      handlers.setTip({
        x: r.left + r.width / 2,
        y: r.top,
        content: <><strong>{d.data.name.en}</strong><br /><span style={{ opacity: 0.85 }}>{d.data.level}</span></>,
      });
    })
    .on('blur', () => { handlers.setHoveredId(null); handlers.setTip({ x: null, y: null, content: null }); })
    .on('keydown', function (event: KeyboardEvent, d) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handlers.setSelected(d.data);
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const siblings = d.parent?.children;
        if (!siblings || siblings.length < 2) return;
        const allG = node.nodes() as SVGGElement[];
        const sibIdxs = siblings.map((s) => allG.findIndex((el) => (d3.select(el).datum() as d3.HierarchyNode<TreeNode>).data.id === s.data.id));
        const myIdx = siblings.indexOf(d as any);
        const fwd = event.key === 'ArrowDown' || event.key === 'ArrowRight';
        const nextIdx = sibIdxs[(myIdx + (fwd ? 1 : -1) + siblings.length) % siblings.length];
        if (nextIdx >= 0) {
          event.preventDefault();
          (allG[nextIdx] as unknown as HTMLElement).focus?.();
        }
      }
    });

  node
    .append('circle')
    .attr('r', (d) => (d.data.highlight ? 8 : d.children ? 5 : 4))
    .attr('fill', (d) => LEVEL_COLOR[d.data.level].fill)
    .attr('stroke', (d) => LEVEL_COLOR[d.data.level].stroke)
    .attr('stroke-width', (d) => (activePathIds.has(d.data.id) ? 2 : 1))
    .attr('filter', (d) => (d.data.highlight ? 'url(#kadai-glow)' : null))
    .attr('class', (d) => (d.data.highlight ? 'animate-pulse' : null));

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

  node
    .filter((d) => !!d.data.highlight)
    .append('circle')
    .attr('r', 13)
    .attr('fill', 'none')
    .attr('stroke', '#f43f5e')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.7)
    .attr('class', 'animate-pulse');

  node
    .append('text')
    .attr('x', 10)
    .attr('dy', '0.32em')
    .attr('font-size', (d) => (d.data.level === 'root' ? 13 : d.data.highlight ? 12 : 11))
    .attr('font-weight', (d) =>
      d.data.highlight || d.data.level === 'root' || d.data.level === 'varna' ? 600 : 400,
    )
    .attr('fill', (d) => (activePathIds.has(d.data.id) ? '#0f172a' : '#44403c'))
    .attr('paint-order', 'stroke')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 3)
    .text((d) => (d.data.highlight ? `★ ${d.data.name.en}` : d.data.name.en));
}

// ---------------- Drawer ----------------
function Drawer({
  node,
  onClose,
  isMobile,
}: {
  node: TreeNode;
  onClose: () => void;
  isMobile: boolean;
}) {
  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const color = LEVEL_COLOR[node.level];
  const tier = node.tier ? TIER_BADGE[node.tier] : null;

  const panelClasses = isMobile
    ? 'fixed inset-x-0 bottom-0 max-h-[75vh] w-full overflow-y-auto rounded-t-2xl border-t border-stone-200 bg-white shadow-2xl'
    : 'fixed right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-stone-200 bg-white shadow-2xl';

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-stone-900/30 backdrop-blur-sm"
      />
      <aside className={panelClasses} role="dialog" aria-modal="true" aria-label={`${node.name.en} details`}>
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5">
          <div>
            <span
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white"
              style={{ background: color.fill }}
            >
              {color.label}
            </span>
            <h3 className="mt-2 text-2xl font-bold text-stone-900">{node.name.en}</h3>
            {node.name.ta && (
              <p className="mt-1 font-tamil text-lg text-stone-600">{node.name.ta}</p>
            )}
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
