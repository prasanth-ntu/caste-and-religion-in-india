// =============================================================================
// lineage-tree/resolve — the SINGLE selection resolver. Replaces the three
// duplicated `findClosestSlug` / `resolve` implementations (SSR frontmatter +
// two inline client scripts) with one alias-aware function.
//
// Given any incoming slug (a tree node id, a narrative page slug, or any of the
// 149 manifest kootams) it returns the id of the node to highlight. When the
// slug isn't a node in the supplied tree, it falls back to the nearest known
// ancestor so the locator can still answer "where am I" — every kootam is a
// Kongu Vellala clan, so the parent is the safe default.
// =============================================================================

import { SLUG_ALIASES, KOOTAM_PARENT_ID } from './tree';

/**
 * @param slug     incoming selection (may be undefined)
 * @param hasNode  predicate: does the current layout/tree contain this id?
 * @returns the node id to highlight, or null if no slug was given
 */
export function resolveSelection(
  slug: string | undefined | null,
  hasNode: (id: string) => boolean,
): string | null {
  if (!slug) return null;
  if (hasNode(slug)) return slug;
  const aliased = SLUG_ALIASES[slug];
  if (aliased && hasNode(aliased)) return aliased;
  if (aliased) return aliased;
  // Any other slug is almost certainly a Kongu Vellala kootam that isn't in the
  // current (un-injected) tree — point at the parent clan.
  return KOOTAM_PARENT_ID;
}
