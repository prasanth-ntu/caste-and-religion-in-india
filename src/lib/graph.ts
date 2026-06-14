/**
 * Build-time backlink resolver.
 *
 * Walks all content collections once per build and indexes which entries
 * reference each `sources` id (directly, or transitively via a claim that
 * itself references a source). Results are cached at module scope so repeated
 * calls during the same Astro build are O(1).
 *
 * URL conventions used here mirror the dynamic routes in `src/pages/`:
 *   - kootams        → /lineage/k/{slug}/
 *   - lineage-nodes  → /lineage/{slug}/   (only some have dedicated pages — see hardcoded set)
 *   - rituals        → /rituals/{slug}/
 *   - deities        → /lineage/konur/    (only konur has a dedicated page today)
 *   - timeline-events→ /overview/timeline/#{slug}
 *   - claims         → no dedicated page; we just expose them so callers can
 *                      surface the statement and pivot through their own backlinks.
 */

import { getCollection } from 'astro:content';

export type BacklinkCollection =
  | 'claims'
  | 'kootams'
  | 'deities'
  | 'lineage-nodes'
  | 'rituals'
  | 'timeline-events';

export interface Backlink {
  collection: BacklinkCollection;
  slug: string;
  name: string;
  href: string | null;
  tier?: 'green' | 'yellow' | 'red' | 'rational';
  /** True if this entry reaches the target only via a claim it references. */
  transitive?: boolean;
  /** Optional context — e.g. the claim id when transitive. */
  via?: string;
}

// ---------- href helpers ----------

const LINEAGE_NODES_WITH_PAGES = new Set([
  'kongu',
  'vellala',
  'gounder',
  'nagarathar',
  // konur is its own deity page, not a lineage-node route
]);

function hrefForLineageNode(slug: string): string | null {
  // The existing `/lineage/{slug}.astro` set is small; for nodes without a
  // dedicated page we still surface them in the list, but without a link.
  if (LINEAGE_NODES_WITH_PAGES.has(slug)) return `/lineage/${slug}/`;
  // The Nagarathar parallel chain folds into the two bespoke pages:
  // Chettinad region → the Nagarathar deep-dive; Vairavanpatti temple-clan →
  // the Vairavar deity page.
  if (slug === 'chettinad') return '/lineage/nagarathar/';
  if (slug === 'vairavanpatti') return '/lineage/vairavar/';
  return null;
}

function hrefForDeity(slug: string): string | null {
  if (slug === 'konur-kaliamman') return '/lineage/konur/';
  if (slug === 'vairavar-swamy-vairavanpatti') return '/lineage/vairavar/';
  return null;
}

function hrefFor(collection: BacklinkCollection, slug: string): string | null {
  switch (collection) {
    case 'kootams':
      return `/lineage/k/${slug}/`;
    case 'rituals':
      return `/rituals/${slug}/`;
    case 'lineage-nodes':
      return hrefForLineageNode(slug);
    case 'deities':
      return hrefForDeity(slug);
    case 'timeline-events':
      return `/overview/timeline/#${slug}`;
    case 'claims':
      return null;
  }
}

// ---------- ref normalisation ----------

function refId(r: unknown): string | null {
  if (!r) return null;
  if (typeof r === 'string') return r;
  if (typeof r === 'object' && r !== null && 'id' in r) {
    const id = (r as { id: unknown }).id;
    return typeof id === 'string' ? id : null;
  }
  return null;
}

function refIds(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(refId).filter((x): x is string => typeof x === 'string');
}

// ---------- index types ----------

interface Index {
  /** sourceId → list of backlinks (claims + any entry that directly cites a source) */
  bySource: Map<string, Backlink[]>;
  /** claimId → list of backlinks (any entry that references that claim) */
  byClaim: Map<string, Backlink[]>;
}

let cached: Index | null = null;
let inFlight: Promise<Index> | null = null;

// ---------- builder ----------

async function build(): Promise<Index> {
  const bySource = new Map<string, Backlink[]>();
  const byClaim = new Map<string, Backlink[]>();

  const push = (map: Map<string, Backlink[]>, key: string, link: Backlink) => {
    const existing = map.get(key);
    if (existing) {
      // De-dupe by (collection, slug, transitive flag) so a multi-claim ritual
      // isn't listed N times under the same source.
      if (
        existing.some(
          (b) =>
            b.collection === link.collection &&
            b.slug === link.slug &&
            !!b.transitive === !!link.transitive,
        )
      ) {
        return;
      }
      existing.push(link);
    } else {
      map.set(key, [link]);
    }
  };

  const [claims, kootams, deities, lineageNodes, rituals, timelineEvents] = await Promise.all([
    getCollection('claims'),
    getCollection('kootams'),
    getCollection('deities'),
    getCollection('lineage-nodes'),
    getCollection('rituals'),
    getCollection('timeline-events'),
  ]);

  // 1) Claims directly cite sources.
  for (const c of claims) {
    const d = c.data;
    const claimSources = refIds(d.sources);
    const claimLink: Backlink = {
      collection: 'claims',
      slug: d.id,
      name: d.statement,
      href: null,
      tier: d.tier,
    };
    for (const sid of claimSources) {
      push(bySource, sid, claimLink);
    }
  }

  // 2) Walk every other collection. Each can:
  //    a) reference claims (transitive route to sources)
  //    b) reference sources directly (timeline-events do this)
  const walk = (
    coll: BacklinkCollection,
    slug: string,
    name: string,
    tier: 'green' | 'yellow' | 'red' | 'rational' | undefined,
    claimRefIds: string[],
    directSourceIds: string[],
  ) => {
    const baseLink: Backlink = {
      collection: coll,
      slug,
      name,
      href: hrefFor(coll, slug),
      tier,
    };

    // Direct source citations.
    for (const sid of directSourceIds) {
      push(bySource, sid, baseLink);
    }

    // Claim refs → entry is a backlink for the claim, and transitively for the
    // sources each claim cites.
    for (const cid of claimRefIds) {
      push(byClaim, cid, baseLink);
      const claim = claims.find((c) => c.data.id === cid);
      if (!claim) continue;
      const claimSourceIds = refIds(claim.data.sources);
      for (const sid of claimSourceIds) {
        push(bySource, sid, { ...baseLink, transitive: true, via: cid });
      }
    }
  };

  for (const k of kootams) {
    walk('kootams', k.data.slug, k.data.name, undefined, refIds(k.data.claims), []);
  }
  for (const dty of deities) {
    walk('deities', dty.data.slug, dty.data.name, undefined, refIds(dty.data.claims), []);
  }
  for (const l of lineageNodes) {
    walk('lineage-nodes', l.data.slug, l.data.name, undefined, refIds(l.data.claims), []);
  }
  for (const r of rituals) {
    // Rituals have `claims` + `relatedPolicy` (also claim refs).
    const claimRefList = [
      ...refIds(r.data.claims),
      ...refIds(r.data.relatedPolicy),
    ];
    walk('rituals', r.data.slug, r.data.name, r.data.tier, claimRefList, []);
  }
  for (const t of timelineEvents) {
    walk(
      'timeline-events',
      t.data.slug,
      t.data.title,
      t.data.tier,
      [],
      refIds(t.data.sources),
    );
  }

  // Stable sort: direct citations first, then transitive; within each group
  // alphabetical by name.
  const sortBacklinks = (arr: Backlink[]) => {
    arr.sort((a, b) => {
      const at = a.transitive ? 1 : 0;
      const bt = b.transitive ? 1 : 0;
      if (at !== bt) return at - bt;
      return a.name.localeCompare(b.name);
    });
  };
  for (const arr of bySource.values()) sortBacklinks(arr);
  for (const arr of byClaim.values()) sortBacklinks(arr);

  return { bySource, byClaim };
}

async function getIndex(): Promise<Index> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = build().then((idx) => {
    cached = idx;
    inFlight = null;
    return idx;
  });
  return inFlight;
}

// ---------- public API ----------

export async function getSourceBacklinks(sourceId: string): Promise<Backlink[]> {
  const idx = await getIndex();
  return idx.bySource.get(sourceId) ?? [];
}

export async function getClaimBacklinks(claimId: string): Promise<Backlink[]> {
  const idx = await getIndex();
  return idx.byClaim.get(claimId) ?? [];
}

/** Returns total backlink count per source id — useful for the index page. */
export async function getSourceBacklinkCounts(): Promise<Map<string, number>> {
  const idx = await getIndex();
  const out = new Map<string, number>();
  for (const [k, v] of idx.bySource.entries()) out.set(k, v.length);
  return out;
}

/** Group a backlink list by collection, preserving sort order. */
export function groupBacklinksByCollection(
  links: Backlink[],
): Array<{ collection: BacklinkCollection; items: Backlink[] }> {
  const order: BacklinkCollection[] = [
    'claims',
    'rituals',
    'lineage-nodes',
    'kootams',
    'deities',
    'timeline-events',
  ];
  const map = new Map<BacklinkCollection, Backlink[]>();
  for (const l of links) {
    const arr = map.get(l.collection);
    if (arr) arr.push(l);
    else map.set(l.collection, [l]);
  }
  return order
    .filter((c) => map.has(c))
    .map((c) => ({ collection: c, items: map.get(c)! }));
}

export const COLLECTION_LABELS: Record<BacklinkCollection, string> = {
  claims: 'Claims',
  rituals: 'Rituals',
  'lineage-nodes': 'Lineage nodes',
  kootams: 'Kootams',
  deities: 'Deities',
  'timeline-events': 'Timeline events',
};
