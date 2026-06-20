// =============================================================================
// lineage-tree/layout — analytic (dependency-free) top-down layout for the
// mini-map locator: y from depth, x from leaf midpoint.
//
// No D3, no DOM — runs identically in Astro frontmatter and a browser-bundled
// script, so the reactive /compare + /lineage paths recompute positions for any
// runtime-selected kootam with the exact same math used at build time.
// =============================================================================

import type { TreeNode, LayoutNode, LayoutEdge, Layout } from './types';

// Vertical (top-down) constants.
const V_Y_STEP = 68; // px per depth level
const V_X_STEP = 14; // px per leaf-index unit
const V_PAD_X = 16;
const V_PAD_T = 18;
const V_PAD_B = 16;
const V_LABEL_PAD = 60; // room for the longest highlighted label

interface WalkAcc {
  nodes: Map<string, LayoutNode>;
  nextLeaf: number;
}

function walk(n: TreeNode, parentId: string | null, depth: number, acc: WalkAcc): void {
  const childIds = (n.children ?? []).map((c) => c.id);
  const isLeaf = childIds.length === 0;
  let leafStart: number;
  let leafEnd: number;
  if (isLeaf) {
    leafStart = acc.nextLeaf;
    leafEnd = acc.nextLeaf;
    acc.nextLeaf += 1;
  } else {
    leafStart = acc.nextLeaf;
    for (const c of n.children!) walk(c, n.id, depth + 1, acc);
    leafEnd = acc.nextLeaf - 1;
  }
  acc.nodes.set(n.id, {
    id: n.id,
    name: n.name.en,
    level: n.level,
    parentId,
    depth,
    leafIndex: (leafStart + leafEnd) / 2,
    isLeaf,
    highlight: Boolean(n.highlight),
    secondary: Boolean(n.secondary),
    injected: Boolean(n.injected),
    x: 0,
    y: 0,
    children: childIds,
  });
}

export function layoutTree(root: TreeNode): Layout {
  const acc: WalkAcc = { nodes: new Map(), nextLeaf: 0 };
  walk(root, null, 0, acc);
  const totalLeaves = Math.max(acc.nextLeaf, 1);
  const nodes = Array.from(acc.nodes.values());
  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);

  const width = V_PAD_X * 2 + (totalLeaves - 1) * V_X_STEP + V_LABEL_PAD;
  const height = V_PAD_T + V_PAD_B + maxDepth * V_Y_STEP;
  for (const node of nodes) {
    node.x = V_PAD_X + node.leafIndex * V_X_STEP;
    node.y = V_PAD_T + node.depth * V_Y_STEP;
  }

  const edges: LayoutEdge[] = [];
  const byId: Record<string, LayoutNode> = {};
  for (const node of nodes) {
    byId[node.id] = node;
    if (node.parentId) edges.push({ from: node.parentId, to: node.id });
  }

  return { nodes, edges, width, height, byId };
}

/** Root→target id chain (inclusive), using the layout's byId map. */
export function ancestorChain(byId: Record<string, LayoutNode>, id: string | null): string[] {
  const chain: string[] = [];
  let cur = id ? byId[id] ?? null : null;
  while (cur) {
    chain.unshift(cur.id);
    cur = cur.parentId ? byId[cur.parentId] ?? null : null;
  }
  return chain;
}

/** Lowest common ancestor id of two chains (deepest shared prefix). */
export function lcaOfChains(chainA: string[], chainB: string[]): string | null {
  let lca: string | null = null;
  const limit = Math.min(chainA.length, chainB.length);
  for (let i = 0; i < limit; i += 1) {
    if (chainA[i] === chainB[i]) lca = chainA[i];
    else break;
  }
  return lca;
}
