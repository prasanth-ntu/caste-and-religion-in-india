// =============================================================================
// lineage-tree/types — the single source of truth for the Varna→Jati tree
// shapes shared across the SSR locator (VarnaJatiLocator.astro), the interactive
// chart (VarnaJatiDendrogram / LineageTreeExplorer), and the reactive client scripts.
//
// Pure type module — no runtime imports, safe in Astro frontmatter, React, and
// browser-bundled scripts alike.
// =============================================================================

export type CasteLevel =
  | 'root'
  | 'varna'
  | 'caste-cluster'
  | 'jati'
  | 'sub-jati'
  | 'kootam'
  | 'temple-clan';

export type CasteTier = 'green' | 'yellow' | 'red' | 'rational';

export interface TreeNode {
  id: string;
  name: {
    en: string;
    ta?: string;
  };
  level: CasteLevel;
  /** Optional one-line summary shown in the drawer. */
  summary?: string;
  /** Evidence tier badge for the drawer. */
  tier?: CasteTier;
  /** Framing / caveat note (used on "Outside varna"). */
  note?: string;
  /** Marks the "you are here" leaf. */
  highlight?: boolean;
  /**
   * Marks a node belonging to a *second* documented community shown as a
   * parallel worked example (the Nattukottai Chettiar / Nagarathar).
   */
  secondary?: boolean;
  /** Marks a kootam injected from the manifest (not part of the curated tree). */
  injected?: boolean;
  children?: TreeNode[];
}

// ---------------------------------------------------------------------------
// Layout output — computed by layout.ts, consumed by render.ts and the React
// chart. Coordinates are in the layout's own viewBox space.
// ---------------------------------------------------------------------------

export interface LayoutNode {
  id: string;
  name: string;
  level: CasteLevel;
  parentId: string | null;
  depth: number;
  /** Mid-index over descendant leaves — drives the top-down layout. */
  leafIndex: number;
  isLeaf: boolean;
  highlight: boolean;
  secondary: boolean;
  injected: boolean;
  /** Final position in the layout's viewBox coordinate space. */
  x: number;
  y: number;
  children: string[];
}

export interface LayoutEdge {
  from: string;
  to: string;
}

export interface Layout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  /** viewBox dimensions. */
  width: number;
  height: number;
  /** Lookup by id for O(1) access in renderers/clients. */
  byId: Record<string, LayoutNode>;
}
