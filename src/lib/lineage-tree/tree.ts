// =============================================================================
// lineage-tree/tree — builds the Varna→Jati TreeNode, optionally injecting
// manifest kootams as real leaves so the locator/explorer can highlight ANY of
// the 149 documented kootams (not just the ~8 curated ones).
//
// Pure module: imports only data (the curated tree + the manifest JSON). Safe in
// Astro frontmatter, React, and browser-bundled scripts.
// =============================================================================

import { varnaJatiTree } from '../../data/varna-jati-tree';
import manifest from '../../data/lineage-manifest.json';
import type { TreeNode } from './types';

type ManifestEntry = { slug: string; name: string; tamilName?: string };
const kootamManifest = manifest as ManifestEntry[];

/** Every documented kootam is a Kongu Vellala clan — the injection parent. */
export const KOOTAM_PARENT_ID = 'kongu-vellala';

/**
 * Narrative page slugs (and a couple of historical id mismatches) that don't
 * have their own tree node, mapped to the nearest node that does. Single source
 * of truth — mirrored into client payloads so the inline/bundled scripts and the
 * SSR pass agree byte-for-byte.
 */
export const SLUG_ALIASES: Record<string, string> = {
  // Kongu Vellala narrative pages.
  kongu: 'kongu-vellala',
  gounder: 'kongu-vellala',
  konur: 'kadai',
  ancestors: 'vellala',
  // Nagarathar (second documented community) narrative pages.
  chettinad: 'nagarathar',
  vairavar: 'vairavanpatti',
  // Historical slug drift: the manifest/narrative uses `sengunthar`, the tree
  // node id is `sengunthar-kootam`.
  sengunthar: 'sengunthar-kootam',
};

export function collectTreeIds(n: TreeNode, set: Set<string> = new Set()): Set<string> {
  set.add(n.id);
  (n.children ?? []).forEach((c) => collectTreeIds(c, set));
  return set;
}

/** Returns the manifest display info for a kootam slug, if it exists. */
export function manifestKootam(slug: string): ManifestEntry | undefined {
  return kootamManifest.find((m) => m.slug === slug);
}

/** slug -> display name for every documented kootam (used by captions/pickers). */
export function kootamNameMap(): Record<string, string> {
  const m: Record<string, string> = {};
  for (const k of kootamManifest) m[k.slug] = k.name;
  return m;
}

export interface BuildTreeOptions {
  /**
   * Manifest kootam slugs to inject as leaves under Kongu Vellala. Aliases and
   * slugs already present in the curated tree are ignored (no duplication).
   */
  injectSlugs?: Array<string | undefined | null>;
  /** Inject ALL documented manifest kootams (used by the full explorer). */
  injectAll?: boolean;
}

/**
 * Returns a (deep-cloned) copy of the curated tree with the requested manifest
 * kootams injected as Kongu Vellala leaves. Never mutates the shared import.
 */
export function buildTree(opts: BuildTreeOptions = {}): TreeNode {
  const present = collectTreeIds(varnaJatiTree);

  // Resolve the set of manifest slugs to inject (deduped, alias-aware, not
  // already in the curated tree).
  const toInject = new Set<string>();
  const consider = (slug: string | undefined | null) => {
    if (!slug) return;
    const canonical = SLUG_ALIASES[slug] ?? slug;
    if (present.has(canonical)) return; // already a curated node
    if (!manifestKootam(canonical)) return; // unknown slug
    toInject.add(canonical);
  };
  if (opts.injectAll) {
    for (const k of kootamManifest) consider(k.slug);
  }
  for (const s of opts.injectSlugs ?? []) consider(s);

  if (toInject.size === 0) return varnaJatiTree;

  const clone = structuredClone(varnaJatiTree) as TreeNode;
  // Find the Kongu Vellala node.
  const stack: TreeNode[] = [clone];
  let parent: TreeNode | null = null;
  while (stack.length) {
    const node = stack.pop()!;
    if (node.id === KOOTAM_PARENT_ID) {
      parent = node;
      break;
    }
    if (node.children) stack.push(...node.children);
  }
  if (!parent) return clone;

  for (const slug of toInject) {
    const entry = manifestKootam(slug)!;
    (parent.children ??= []).push({
      id: entry.slug,
      name: { en: entry.name, ta: entry.tamilName },
      level: 'kootam',
      injected: true,
    });
  }
  return clone;
}
