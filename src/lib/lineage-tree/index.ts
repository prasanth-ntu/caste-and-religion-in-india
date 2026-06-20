// =============================================================================
// lineage-tree — shared, dependency-free core for the Varna→Jati tree. Imported
// by the SSR locator (VarnaJatiLocator.astro), the interactive chart, and the
// reactive client scripts so tree shape, selection resolution, layout, and
// rendering have exactly one implementation each.
// =============================================================================

export type {
  CasteLevel,
  CasteTier,
  TreeNode,
  LayoutMode,
  LayoutNode,
  LayoutEdge,
  Layout,
} from './types';

export {
  buildTree,
  collectTreeIds,
  manifestKootam,
  kootamNameMap,
  SLUG_ALIASES,
  KOOTAM_PARENT_ID,
} from './tree';

export { resolveSelection } from './resolve';

export { layoutTree, ancestorChain, lcaOfChains } from './layout';

export { renderMinimapInner, compareSummary, forkPath, renderForkBreadcrumb } from './render';
export type { ForkCrumb, ForkPath } from './render';
