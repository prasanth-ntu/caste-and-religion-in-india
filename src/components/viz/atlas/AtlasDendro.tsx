// =============================================================================
// AtlasDendro — a controlled, prop-driven "lumipill" dendrogram of the real
// varna→jati tree.
//
// Visual port of the design prototype `dendro-lumipill.jsx` (`DendroLumiPill`):
// rounded pill nodes with a level-coloured dot, a glowing ancestor focus path
// (feGaussianBlur), a ★ on the focused node, `+N` collapse badges on nodes with
// hidden children, elbow links, and a label-budget pass that degrades crowded
// pills down to dots. Dark and light themes; vertical and horizontal layout.
//
// This component is *controlled* — it owns no selection/collapse state. The host
// drives `focus`, `collapsed`, and `maxDepth`, and gets `onFocus` /
// `onToggleCollapse` callbacks. It deliberately ports ONLY the visual dendrogram;
// the prototype's stage/meta/kootam-id helpers live elsewhere.
//
// SSR-safe: render reads no window/document; the only browser access is in an
// effect (reduced-motion). Given props, it returns a meaningful SVG on the
// server.
// =============================================================================
import { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { varnaJatiTree } from '../../../data/varna-jati-tree';
import type { TreeNode } from '../../../lib/lineage-tree/types';
import { LEVEL_COLOR } from '../../../lib/chart-tokens';

export interface AtlasDendroProps {
  /** Currently focused node id. */
  focus: string;
  /** Called when a node is clicked. */
  onFocus: (id: string) => void;
  /** 1..4 — 1=varnas, 2=caste-clusters, 3=sub-castes/jati, 4=kootams. */
  maxDepth: number;
  /** Node ids whose subtree is collapsed. */
  collapsed: Set<string>;
  /** Called when a collapse "+" badge is clicked. */
  onToggleCollapse: (id: string) => void;
  /** Layout orientation (warm shell = vertical, observatory = horizontal). */
  dir: 'vertical' | 'horizontal';
  theme: 'light' | 'dark';
  /** Accent hex (focus glow / star). */
  accent: string;
  /** Container px. */
  width: number;
  /** Container px. */
  height: number;
}

// ─────────────────────────── Theme ───────────────────────────
// Dark = the prototype's glow variant (brighter strokes, blurred focus path);
// light = the editorial paper variant. `focus`/`linkOn` are overridden per-call
// by the `accent` prop so the host can theme the glow + star.
interface Pal {
  bg: string;
  link: string;
  linkOn: string;
  pillOff: string;
  pillStroke: string;
  textOff: string;
  pillInk: string; // text/dot colour drawn *inside* an on-path filled pill
  glow: boolean;
  focus: string;
}

const THEME: Record<'light' | 'dark', Pal> = {
  dark: {
    bg: 'radial-gradient(120% 100% at 50% 0%, #131a2e 0%, #0b1020 70%)',
    link: '#2a3550',
    linkOn: '#fb7185',
    pillOff: '#172036',
    pillStroke: '#2f3b58',
    textOff: '#cbd5e1',
    pillInk: '#0b1020',
    glow: true,
    focus: '#fb7185',
  },
  light: {
    bg: 'radial-gradient(120% 100% at 50% 0%, #fbfaf7 0%, #f3efe7 72%)',
    link: '#d6d3d1',
    linkOn: '#be123c',
    pillOff: '#ffffff',
    pillStroke: '#e7e5e4',
    textOff: '#44403c',
    pillInk: '#ffffff',
    glow: false,
    focus: '#be123c',
  },
};

// ─────────────────────────── Tree shaping ───────────────────────────
// Prune the tree by `maxDepth` and by the collapsed set, mirroring the
// prototype's `strip`: at-or-past the depth budget, or explicitly collapsed,
// the node keeps a `_kids` count and drops its `children`. depth(root)=0, so
// maxDepth=1 keeps root+varnas (varnas as leaves), 2 adds caste-clusters, etc.
interface PrunedNode extends TreeNode {
  _kids?: number;
  children?: PrunedNode[];
}

function pruneTree(maxDepth: number, collapsed: Set<string>): PrunedNode {
  // Deep clone so we can mutate freely without touching the shared data module.
  const t: PrunedNode = structuredClone(varnaJatiTree) as PrunedNode;
  const strip = (n: PrunedNode, d: number) => {
    if (d >= maxDepth || collapsed.has(n.id)) {
      n._kids = (n.children || []).length;
      delete n.children;
      return;
    }
    (n.children || []).forEach((c) => strip(c, d + 1));
  };
  strip(t, 0);
  return t;
}

// Ancestor chain of `focus` in the *full* tree — used to glow the focus path
// even when intermediate nodes happen to be collapsed in the pruned view.
function ancestorIds(id: string): Set<string> {
  const h = d3.hierarchy<TreeNode>(varnaJatiTree);
  const hit = h.descendants().find((d) => d.data.id === id);
  return new Set(hit ? hit.ancestors().map((d) => d.data.id) : []);
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s;
}

// ─────────────────────────── Component ───────────────────────────
export default function AtlasDendro({
  focus,
  onFocus,
  maxDepth,
  collapsed,
  onToggleCollapse,
  dir,
  theme,
  accent,
  width,
  height,
}: AtlasDendroProps): JSX.Element {
  // Reduced-motion is the only browser read; gate it behind an effect so the
  // first (server + hydration) paint is deterministic.
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  const P = THEME[theme] || THEME.dark;
  const focusColor = accent || P.focus;
  const glowRef = P.glow ? 'url(#atlas-glow)' : undefined;

  const horiz = dir === 'horizontal';
  const PAD = 26;

  // Build the pruned hierarchy + the focus ancestor set. Re-sorted by English
  // name like the prototype (highlight node is not forced first here — the host
  // controls focus).
  const root = useMemo(() => {
    const pruned = pruneTree(maxDepth, collapsed);
    const h = d3.hierarchy<PrunedNode>(pruned);
    h.sort((a, b) => d3.ascending(a.data.name.en, b.data.name.en));
    return h;
  }, [maxDepth, collapsed]);

  const active = useMemo(() => ancestorIds(focus), [focus]);

  // Lay the tree out. d3.tree size is [breadth, depth]; we map it into the
  // chosen orientation. `depthExt` spans the available depth axis with a little
  // reserved room on the right for horizontal labels.
  const layout = useMemo(() => {
    const W = Math.max(width, 1);
    const H = Math.max(height, 1);
    const r2 = root.copy();
    const breadth = (horiz ? H : W) - PAD * 2;
    const depthAxis = (horiz ? W - 170 : H - PAD * 2);
    const depthExt = Math.max(depthAxis, 1);
    d3
      .tree<PrunedNode>()
      .size([Math.max(breadth, 1), depthExt])
      .separation((a, b) => (a.parent === b.parent ? 1.15 : 1.8))(r2);
    return r2;
  }, [root, width, height, horiz]);

  const W = Math.max(width, 1);
  const H = Math.max(height, 1);

  // Orientation-aware accessors. In horizontal mode d.y is the depth axis (x)
  // and d.x is the breadth axis (y); vertical swaps them.
  const nx = (d: d3.HierarchyNode<PrunedNode>) =>
    horiz ? PAD + (d as any).y : PAD + (d as any).x;
  const ny = (d: d3.HierarchyNode<PrunedNode>) =>
    horiz ? PAD + (d as any).x : PAD + (d as any).y;

  const onPath = (
    a: d3.HierarchyNode<PrunedNode>,
    b: d3.HierarchyNode<PrunedNode>,
  ) => active.has(a.data.id) && active.has(b.data.id);

  // Right-angle "elbow" connector between parent and child.
  const elbow = (
    s: d3.HierarchyNode<PrunedNode>,
    t: d3.HierarchyNode<PrunedNode>,
  ) => {
    const sx = nx(s), sy = ny(s), tx = nx(t), ty = ny(t);
    if (horiz) {
      const mx = (sx + tx) / 2;
      return `M${sx},${sy}H${mx}V${ty}H${tx}`;
    }
    const my = (sy + ty) / 2;
    return `M${sx},${sy}V${my}H${tx}V${ty}`;
  };

  // SVG width grows in horizontal mode so deep trees scroll rather than crush.
  const depthExt = (horiz ? W - 170 : H - PAD * 2);
  const svgW = horiz ? Math.max(W, depthExt + 170) : W;

  const descendants = layout.descendants();

  // Real laid-out gap to a node's nearest same-depth neighbour. d3.tree clusters
  // siblings under their parent, so a naive breadth/count estimate badly
  // overstates the room a node has — measure the actual gap along the breadth
  // axis (d.x) instead, and feed it to the pill→dot budget.
  const gapBy = useMemo(() => {
    const byDepth: Record<number, d3.HierarchyNode<PrunedNode>[]> = {};
    descendants.forEach((d) => {
      (byDepth[d.depth] = byDepth[d.depth] || []).push(d);
    });
    const g: Record<string, number> = {};
    Object.values(byDepth).forEach((arr) => {
      arr.sort((a, b) => (a as any).x - (b as any).x);
      arr.forEach((d, i) => {
        const l = i > 0 ? (d as any).x - (arr[i - 1] as any).x : Infinity;
        const r =
          i < arr.length - 1 ? (arr[i + 1] as any).x - (d as any).x : Infinity;
        g[d.data.id] = Math.min(l, r);
      });
    });
    return g;
  }, [descendants]);

  // Depths that carry a focus-path / focused node — at those depths we hold the
  // line at "essential" labelling and don't opportunistically expand neighbours.
  const essDepth = useMemo(() => {
    const e: Record<number, boolean> = {};
    descendants.forEach((d) => {
      if (active.has(d.data.id) || d.data.id === focus) e[d.depth] = true;
    });
    return e;
  }, [descendants, active, focus]);

  const click = (d: d3.HierarchyNode<PrunedNode>) => onFocus(d.data.id);
  const toggle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onToggleCollapse(id);
  };

  // Animation: a soft fade-in on the node layer, suppressed under reduced motion.
  const nodeAnim = reduced ? undefined : 'atlas-fade 420ms cubic-bezier(0.22,1,0.36,1) both';

  // Draw on-path nodes last so their glow sits above neighbours.
  const drawOrder = descendants
    .slice()
    .sort(
      (a, b) =>
        (active.has(a.data.id) ? 1 : 0) - (active.has(b.data.id) ? 1 : 0),
    );

  return (
    <svg
      viewBox={`0 0 ${svgW} ${H}`}
      width="100%"
      height="100%"
      role="img"
      aria-label="Dendrogram of the varna to jati tree"
      style={{ display: 'block', background: P.bg }}
    >
      <defs>
        <filter
          id="atlas-glow"
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
        >
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <style>{`
        @keyframes atlas-fade { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .atlas-node { animation: none !important; }
        }
        .atlas-ta { font-family: var(--font-tamil, inherit); }
      `}</style>

      {/* Links */}
      {layout.links().map((l, i) => {
        const on = onPath(l.source, l.target);
        return (
          <path
            key={`l-${i}`}
            d={elbow(l.source, l.target)}
            fill="none"
            stroke={on ? (accent || P.linkOn) : P.link}
            strokeWidth={on ? 2.4 : 1.2}
            strokeOpacity={on ? 1 : 0.6}
            strokeLinejoin="round"
            filter={on ? glowRef : undefined}
          />
        );
      })}

      {/* Nodes */}
      {drawOrder.map((d, i) => {
        const lv = LEVEL_COLOR[d.data.level] || LEVEL_COLOR.root;
        const isF = d.data.id === focus;
        const on = active.has(d.data.id);
        const collapsedNode = (d.data._kids ?? 0) > 0;
        const essential = on || isF || d.data.level === 'root';
        const avail = gapBy[d.data.id] ?? Infinity;
        const showPill = essential || (!essDepth[d.depth] && avail >= 90);

        const charW = isF ? 7.2 : 6.8;
        const starW = isF ? 11 : 0; // width of the '★ ' focus prefix
        const collapseW = collapsedNode ? 22 : 0;
        // Clamp the pill to its column so it never overruns a neighbour.
        const budget = Math.min(184, Math.max(essential ? 96 : 60, avail - 6));
        const fitCh = Math.floor((budget - 30 - starW - collapseW) / charW);
        const maxCh = Math.max(
          essential ? 8 : 4,
          Math.min(essential ? 18 : 16, fitCh),
        );
        const label = truncate(d.data.name.en, maxCh);
        const textW = label.length * charW + starW;
        const w = Math.min(184, Math.max(42, textW + 30 + collapseW));

        // Tamil sub-label only on focused / on-path pills with vertical breathing
        // room, so it never collides with the row below.
        const ta = d.data.name.ta;
        const showTa = showPill && !!ta && (isF || on) && (avail >= 64 || avail === Infinity);

        const fill = on ? lv.fill : P.pillOff;
        const stroke = on ? lv.fill : P.pillStroke;
        const ink = on ? P.pillInk : P.textOff;

        return (
          <g
            key={`n-${d.data.id}-${i}`}
            className="atlas-node"
            transform={`translate(${nx(d)},${ny(d)})`}
            opacity={active.size && !on ? 0.5 : 1}
            style={{ cursor: 'pointer', animation: nodeAnim }}
            onClick={() => click(d)}
            role="button"
            aria-label={`${d.data.name.en} — ${lv.label}`}
          >
            {showPill ? (
              <g transform={`translate(${-w / 2},-13)`}>
                {isF && (
                  <rect
                    x="-3"
                    y="-3"
                    width={w + 6}
                    height="32"
                    rx="16"
                    fill="none"
                    stroke={focusColor}
                    strokeWidth="1.4"
                    opacity="0.7"
                    filter={glowRef}
                  />
                )}
                <rect
                  width={w}
                  height="26"
                  rx="13"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="1"
                  filter={on ? glowRef : undefined}
                />
                <circle
                  cx="13"
                  cy="13"
                  r="4"
                  fill={on ? P.pillInk : lv.stroke}
                  filter={on ? undefined : glowRef}
                />
                <text
                  x={collapsedNode ? w - 26 : (w + 18) / 2}
                  y={showTa ? 13 : 17}
                  textAnchor={collapsedNode ? 'end' : 'middle'}
                  fontSize="11.5"
                  fontWeight={isF ? 700 : 500}
                  fill={ink}
                >
                  {isF ? '★ ' : ''}
                  {label}
                </text>
                {showTa && (
                  <text
                    className="atlas-ta"
                    x={collapsedNode ? w - 26 : (w + 18) / 2}
                    y="22.5"
                    textAnchor={collapsedNode ? 'end' : 'middle'}
                    fontSize="8.5"
                    fontWeight={500}
                    fill={ink}
                    opacity={0.85}
                  >
                    {truncate(ta!, maxCh + 2)}
                  </text>
                )}
                {collapsedNode && (
                  <g
                    transform={`translate(${w - 20},6.5)`}
                    onClick={(e) => toggle(e, d.data.id)}
                    role="button"
                    aria-label={`Expand ${d.data.name.en} (${d.data._kids} hidden)`}
                  >
                    <rect
                      width="14"
                      height="14"
                      rx="4"
                      fill={on ? P.pillInk : lv.fill}
                      opacity={on ? 0.3 : 0.22}
                    />
                    <text
                      x="7"
                      y="10.5"
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="700"
                      fill={on ? P.pillInk : lv.fill}
                    >
                      +
                    </text>
                  </g>
                )}
              </g>
            ) : (
              // Degraded: a level-coloured dot. Collapsed dots carry a '+' and a
              // larger hit area so the toggle still works when crowded.
              <g>
                <circle r={collapsedNode ? 5.5 : 3.6} fill={lv.fill} filter={glowRef} />
                {collapsedNode && (
                  <>
                    <text
                      y="2.8"
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="800"
                      fill={P.pillInk}
                    >
                      +
                    </text>
                    <circle
                      r="11"
                      fill="transparent"
                      onClick={(e) => toggle(e, d.data.id)}
                      role="button"
                      aria-label={`Expand ${d.data.name.en} (${d.data._kids} hidden)`}
                      style={{ cursor: 'pointer' }}
                    />
                  </>
                )}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
