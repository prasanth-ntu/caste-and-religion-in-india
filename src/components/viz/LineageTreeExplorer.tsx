import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { buildTree } from '../../lib/lineage-tree';
import type { TreeNode, CasteLevel } from '../../lib/lineage-tree';
import { LEVEL_COLOR, CHART } from '../../lib/chart-tokens';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { useInView } from '../../hooks/useInView';
import { prefersReducedMotion } from '../../lib/chart-motion';
import Tooltip, { type TooltipState } from '../ui/Tooltip';

// =============================================================================
// LineageTreeExplorer — the full-page interactive dendrogram for /overview/tree.
//
// Built on the shared lineage-tree core (buildTree) and chart-tokens (LEVEL_COLOR)
// so it stays in lockstep with the SSR locator. Unlike the focused "you are here"
// VarnaJatiRadial, this is an exploratory tool: pick the depth, reveal all 145
// kootams, show every label, and focus ANY node (deep-linkable via ?node=).
//   • top-down vertical at every width — desktop gets airier spacing, dense
//     levels overflow into horizontal scroll.
// =============================================================================

const SECONDARY_RING = '#8b5cf6';

// Detail-level steps map to a max visible depth. Society (root, depth 0) is
// always shown; the steps reveal progressively deeper rings.
const LEVEL_STEPS: { label: string; maxDepth: number }[] = [
  { label: 'Varnas', maxDepth: 1 },
  { label: 'Caste clusters', maxDepth: 2 },
  { label: 'Sub-castes', maxDepth: 3 },
  { label: 'Kootams', maxDepth: 4 },
];

// Top-down vertical at every width (one design language across the site).
// Desktop gets airier tiers + wider leaf spacing; dense levels (all 145 kootams)
// overflow into horizontal scroll inside the card.
const DEPTH_STEP = { mobile: 104, desktop: 128 };
const LEAF_BREADTH = { mobile: 16, desktop: 26 };
const PAD_T = 40;
const PAD_B = 44;
const PAD_X = 16;

function truncate(s: string, max: number) {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

/** Deep-clone the tree and drop any children below `maxDepth`. Never mutates the
 *  shared import. */
function pruneToDepth(tree: TreeNode, maxDepth: number): TreeNode {
  const clone = structuredClone(tree) as TreeNode;
  const strip = (n: TreeNode, depth: number) => {
    if (depth >= maxDepth) {
      delete n.children;
      return;
    }
    (n.children ?? []).forEach((c) => strip(c, depth + 1));
  };
  strip(clone, 0);
  return clone;
}

interface FlatNode {
  id: string;
  name: string;
  level: CasteLevel;
}

function readNodeParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('node');
}

interface LineageTreeExplorerProps {
  id?: string;
}

export default function LineageTreeExplorer({ id }: LineageTreeExplorerProps = {}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [showAllKootams, setShowAllKootams] = useState(false);
  const [levelStep, setLevelStep] = useState(3); // index into LEVEL_STEPS (Kootams)
  const [showAllLabels, setShowAllLabels] = useState(false);
  const [focusId, setFocusId] = useState<string>('kadai');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tip, setTip] = useState<TooltipState>({ x: null, y: null, content: null });

  const { ref: dimRef, width, isMobile, measured } = useChartDimensions({
    breakpoint: 768,
    initialWidth: 820,
  });
  const [inViewRef, inView] = useInView<HTMLDivElement>();
  const setContainerRef = (el: HTMLDivElement | null) => {
    dimRef.current = el;
    inViewRef.current = el;
  };

  useEffect(() => {
    if (measured) dimRef.current?.setAttribute('data-hydrated', 'true');
  }, [measured, dimRef]);

  // Initialise focus from ?node= on mount (deep links from the locator).
  useEffect(() => {
    const fromUrl = readNodeParam();
    if (fromUrl) setFocusId(fromUrl);
  }, []);

  const maxDepth = LEVEL_STEPS[levelStep].maxDepth;

  // Build the full tree once per kootam toggle, then prune to the chosen depth.
  const fullTree = useMemo(
    () => buildTree(showAllKootams ? { injectAll: true } : {}),
    [showAllKootams],
  );
  const tree = useMemo(() => pruneToDepth(fullTree, maxDepth), [fullTree, maxDepth]);

  const root = useMemo(() => {
    const h = d3.hierarchy<TreeNode>(tree);
    h.sort((a, b) => d3.ascending(a.data.name.en, b.data.name.en));
    return h;
  }, [tree]);

  // Full (unpruned) ancestor chain of the user's focus pick — lets us fall back
  // to the deepest *visible* ancestor when the focus is pruned out of view.
  const focusChain = useMemo(() => {
    const full = d3.hierarchy<TreeNode>(fullTree);
    const t = full.descendants().find((d) => d.data.id === focusId);
    return t ? t.ancestors().map((d) => d.data.id).reverse() : [];
  }, [fullTree, focusId]);

  // Flat list of currently-visible nodes for the focus picker (grouped by level).
  const flat = useMemo<FlatNode[]>(
    () =>
      root
        .descendants()
        .map((d) => ({ id: d.data.id, name: d.data.name.en, level: d.data.level })),
    [root],
  );

  // If the focused node fell out of view (depth/kootam toggle changed), clamp to
  // the deepest visible ancestor so the picker + path highlight stay valid.
  const visibleIds = useMemo(() => new Set(flat.map((f) => f.id)), [flat]);
  const effectiveFocusId = useMemo(() => {
    if (visibleIds.has(focusId)) return focusId;
    for (let i = focusChain.length - 1; i >= 0; i -= 1) {
      if (visibleIds.has(focusChain[i])) return focusChain[i];
    }
    return root.data.id; // root is always visible
  }, [visibleIds, focusId, focusChain, root]);

  const focusPathIds = useMemo(() => {
    const target = root.descendants().find((d) => d.data.id === effectiveFocusId);
    if (!target) return new Set<string>();
    return new Set(target.ancestors().map((d) => d.data.id));
  }, [root, effectiveFocusId]);

  const activePathIds = useMemo(() => {
    if (hoveredId) {
      const t = root.descendants().find((d) => d.data.id === hoveredId);
      if (t) return new Set(t.ancestors().map((d) => d.data.id));
    }
    return focusPathIds;
  }, [hoveredId, root, focusPathIds]);

  const treeMetrics = useMemo(() => {
    const md = root.height || 4;
    const leafCount = root.leaves().length;
    return { md, leafCount };
  }, [root]);

  const size = useMemo(() => {
    const depthStep = isMobile ? DEPTH_STEP.mobile : DEPTH_STEP.desktop;
    const leafBreadth = isMobile ? LEAF_BREADTH.mobile : LEAF_BREADTH.desktop;
    const height = PAD_T + PAD_B + treeMetrics.md * depthStep;
    const breadth = Math.max(width, treeMetrics.leafCount * leafBreadth + PAD_X * 2);
    return { width: Math.max(breadth, 320), height };
  }, [isMobile, width, treeMetrics]);

  const laidOut = useMemo(() => {
    const r = root.copy();
    const depthStep = isMobile ? DEPTH_STEP.mobile : DEPTH_STEP.desktop;
    const treeHeight = (r.height || 4) * depthStep;
    d3
      .tree<TreeNode>()
      .size([size.width - PAD_X * 2, treeHeight])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2))(r);
    return r;
  }, [root, size, isMobile]);

  // Render pass.
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const glow = defs
      .append('filter')
      .attr('id', 'lte-focus-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', 3.5).attr('result', 'blur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const handlers = {
      onFocus: (id: string) => setFocusId(id),
      setHoveredId,
      setTip,
      inView,
      showAllLabels,
      focusId: effectiveFocusId,
      isMobile,
    };

    renderVertical(svg, laidOut, size, activePathIds, handlers);
  }, [laidOut, size, activePathIds, isMobile, inView, showAllLabels, effectiveFocusId]);

  // When the tree is wider than its card (e.g. all 145 kootams on desktop),
  // centre the horizontal scroll on the focused node so the view never lands on
  // a blank edge. No-op when the tree fits (scrollWidth ≈ clientWidth).
  useEffect(() => {
    const el = dimRef.current;
    if (!el || !measured) return;
    if (el.scrollWidth <= el.clientWidth + 2) return;
    const focusNode = laidOut.descendants().find((d) => d.data.id === effectiveFocusId);
    if (!focusNode) return;
    const fx = PAD_X + ((focusNode as any).x as number);
    el.scrollLeft = Math.max(0, Math.min(fx - el.clientWidth / 2, el.scrollWidth - el.clientWidth));
  }, [laidOut, size, effectiveFocusId, measured, dimRef]);

  // Keep ?node= in sync for shareable deep links.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('node') === effectiveFocusId) return;
    url.searchParams.set('node', effectiveFocusId);
    window.history.replaceState(null, '', url.toString());
  }, [effectiveFocusId]);

  // Group picker options by level, in canonical level order.
  const grouped = useMemo(() => {
    const order: CasteLevel[] = [
      'root',
      'varna',
      'caste-cluster',
      'jati',
      'sub-jati',
      'kootam',
      'temple-clan',
    ];
    const byLevel = new Map<CasteLevel, FlatNode[]>();
    for (const f of flat) {
      if (!byLevel.has(f.level)) byLevel.set(f.level, []);
      byLevel.get(f.level)!.push(f);
    }
    return order
      .filter((lv) => byLevel.has(lv))
      .map((lv) => ({
        level: lv,
        label: LEVEL_COLOR[lv]?.label ?? lv,
        items: byLevel.get(lv)!.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [flat]);

  const focusName = flat.find((f) => f.id === effectiveFocusId)?.name ?? effectiveFocusId;

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
        {/* Detail level */}
        <div className="min-w-0">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500">
            Detail level
          </label>
          <div className="inline-flex flex-wrap gap-1 rounded-lg border border-stone-300 bg-white p-1">
            {LEVEL_STEPS.map((s, i) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setLevelStep(i)}
                aria-pressed={levelStep === i}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  levelStep === i
                    ? 'bg-indigo-600 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Focus picker */}
        <div className="min-w-0 flex-1">
          <label
            htmlFor="lte-focus"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500"
          >
            Focus a node
          </label>
          <select
            id="lte-focus"
            value={effectiveFocusId}
            onChange={(e) => setFocusId(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {grouped.map((g) => (
              <optgroup key={g.level} label={g.label}>
                {g.items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={showAllKootams}
              onChange={(e) => setShowAllKootams(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
            Show all 145 kootams
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={showAllLabels}
              onChange={(e) => setShowAllLabels(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
            Show all labels
          </label>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-600">
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
        <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full bg-rose-500 ring-2 ring-rose-300" />
          Focused: {focusName}
        </span>
      </div>

      {isMobile && measured && (
        <p className="mb-2 text-center text-xs text-stone-400">
          Tap any node to focus it · scroll the card to pan
        </p>
      )}

      <div
        ref={setContainerRef}
        id={id}
        className="relative overflow-auto rounded-2xl border border-stone-200 bg-white p-2 sm:p-4"
      >
        {measured && (
          <svg
            ref={svgRef}
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
            /* Desktop keeps intrinsic width so a dense tree (all 145 kootams)
               scrolls horizontally inside the card; mobile scales to fit. */
            className={`mx-auto block ${isMobile ? 'max-w-full' : ''}`}
            role="img"
            aria-label={`Varna→Jati tree, focused on ${focusName}. Detail level: ${LEVEL_STEPS[levelStep].label}.`}
          />
        )}
      </div>

      <Tooltip x={tip.x} y={tip.y}>
        {tip.content}
      </Tooltip>
    </div>
  );
}

// ─────────────────────────── shared render helpers ───────────────────────────

type Handlers = {
  onFocus: (id: string) => void;
  setHoveredId: (id: string | null) => void;
  setTip: (s: TooltipState) => void;
  inView: boolean;
  showAllLabels: boolean;
  focusId: string;
  isMobile: boolean;
};

function entryAnim(node: d3.Selection<any, d3.HierarchyNode<TreeNode>, any, any>, inView: boolean) {
  const reduced = prefersReducedMotion();
  if (!reduced && inView) {
    node.each(function (d, i) {
      const sel = d3.select(this);
      const delay = Math.min(d.depth * 50 + i * 4, 500);
      sel.style('opacity', 0).style('transition', `opacity 320ms ease ${delay}ms`);
      requestAnimationFrame(() => sel.style('opacity', null));
    });
  } else if (!inView && !reduced) {
    node.style('opacity', 0);
  }
}

function renderVertical(
  svg: d3.Selection<SVGSVGElement | null, unknown, null, undefined>,
  root: d3.HierarchyNode<TreeNode>,
  _size: { width: number; height: number },
  activePathIds: Set<string>,
  h: Handlers,
) {
  const padL = PAD_X;
  const padT = PAD_T;
  const nx = (d: d3.HierarchyNode<TreeNode>) => padL + ((d as any).x as number);
  const ny = (d: d3.HierarchyNode<TreeNode>) => padT + ((d as any).y as number);
  const m = h.isMobile;
  // Desktop has room for larger dots, fonts, and longer labels.
  const R = { focus: m ? 8 : 9.5, sec: m ? 7 : 8.5, branch: m ? 5 : 6, leaf: m ? 4 : 5 };
  const F = { root: m ? 12 : 15, focus: m ? 11 : 13, base: m ? 9 : 11 };
  const TR = { root: m ? 18 : 26, base: m ? 20 : 30 };

  const focusActive = activePathIds.size > 0;
  const showLabel = (d: d3.HierarchyNode<TreeNode>) =>
    h.showAllLabels ||
    d.data.level === 'root' ||
    d.data.level === 'varna' ||
    d.data.id === h.focusId ||
    d.data.secondary ||
    activePathIds.has(d.data.id);

  const g = svg.append('g');

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
    .attr('stroke', (d: any) =>
      activePathIds.has(d.source.data.id) && activePathIds.has(d.target.data.id)
        ? CHART.linkActive
        : CHART.link,
    )
    .attr('stroke-linecap', 'round')
    .attr('stroke-width', (d: any) =>
      activePathIds.has(d.source.data.id) && activePathIds.has(d.target.data.id)
        ? 3
        : Math.max(1, 2 - d.target.depth * 0.25),
    )
    .attr('stroke-opacity', (d: any) => {
      const onPath = activePathIds.has(d.source.data.id) && activePathIds.has(d.target.data.id);
      return focusActive && !onPath ? 0.3 : 0.8;
    });

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
    .style('opacity', (d) => (focusActive && !activePathIds.has(d.data.id) ? 0.45 : 1))
    .on('click', (_, d) => h.onFocus(d.data.id))
    .on('mouseenter', (_e, d) => h.setHoveredId(d.data.id))
    .on('mouseleave', () => h.setHoveredId(null))
    .on('focus', (_e, d) => h.setHoveredId(d.data.id))
    .on('blur', () => h.setHoveredId(null))
    .on('keydown', function (event: KeyboardEvent, d) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        h.onFocus(d.data.id);
      }
    });

  node
    .append('circle')
    .attr('r', 20)
    .attr('fill', 'transparent')
    .style('pointer-events', 'all');

  node
    .append('circle')
    .attr('r', (d) => (d.data.id === h.focusId ? R.focus : d.data.secondary ? R.sec : d.children ? R.branch : R.leaf))
    .attr('fill', (d) => LEVEL_COLOR[d.data.level].fill)
    .attr('stroke', (d) => LEVEL_COLOR[d.data.level].stroke)
    .attr('stroke-width', (d) => (activePathIds.has(d.data.id) ? 2 : 1))
    .style('pointer-events', 'none')
    .attr('filter', (d) => (d.data.id === h.focusId ? 'url(#lte-focus-glow)' : null));

  node
    .filter((d) => d.data.id === h.focusId)
    .append('circle')
    .attr('r', m ? 13 : 15)
    .attr('fill', 'none')
    .attr('stroke', '#f43f5e')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.75)
    .attr('class', 'animate-pulse');

  node
    .filter((d) => !!d.data.secondary)
    .append('circle')
    .attr('r', m ? 12 : 14)
    .attr('fill', 'none')
    .attr('stroke', SECONDARY_RING)
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '3 2')
    .attr('stroke-opacity', 0.8);

  node
    .filter((d) => showLabel(d))
    .append('text')
    .attr('dy', (d) => {
      const below = m ? 18 : 22;
      const above = m ? -10 : -14;
      return d.data.level === 'root' || d.data.level === 'varna' ? below : d.children ? above : below;
    })
    .attr('text-anchor', 'middle')
    .attr('font-size', (d) => (d.data.level === 'root' ? F.root : d.data.id === h.focusId ? F.focus : F.base))
    .attr('font-weight', (d) =>
      d.data.id === h.focusId || d.data.level === 'root' || d.data.level === 'varna' ? 600 : 500,
    )
    .attr('fill', (d) =>
      d.data.secondary
        ? LEVEL_COLOR['temple-clan'].text
        : activePathIds.has(d.data.id)
          ? '#0f172a'
          : LEVEL_COLOR[d.data.level].text,
    )
    .attr('paint-order', 'stroke')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 3)
    .text((d) => {
      const raw = d.data.id === h.focusId ? `★ ${d.data.name.en}` : d.data.secondary ? `◆ ${d.data.name.en}` : d.data.name.en;
      if (d.data.level === 'root') return truncate(raw, TR.root);
      return truncate(raw, TR.base);
    });

  entryAnim(node, h.inView);
}
