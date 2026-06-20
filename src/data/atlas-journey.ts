// The Living Atlas journey — the narrative scaffolding for the scroll-driven
// descent at /atlas/living. Geography (WHERE) is woven against identity-narrowing
// (WHO) across the same four stages as the semantic-zoom map (see
// ./zoom-map-stages.ts), but the *factual* payload — claims, kootams, deity — is
// resolved at build time from the real content collections by the page, NOT
// hardcoded here. This module only holds presentation framing + the claim slugs
// each stage surfaces.

import { stagesById, type StageId } from './zoom-map-stages';

export type Tier = 'green' | 'yellow' | 'red' | 'rational';

export interface TierMeta {
  emoji: string;
  label: string;
}

/** Canonical tier presentation (mirrors FactTier / the evidence legend). */
export const TIERS: Record<Tier, TierMeta> = {
  green: { emoji: '🟢', label: 'well-established' },
  yellow: { emoji: '🟡', label: 'plausible / debated' },
  red: { emoji: '🔴', label: 'myth / unverified' },
  rational: { emoji: '⚖️', label: 'rational basis' },
};

export const PULL_QUOTE = 'The Kuladeivam shrine is, in effect, the kootam’s address.';

export interface JourneyStageDef {
  id: StageId;
  /** English / Tamil titles — sourced from the real zoom-map stages. */
  en: string;
  ta: string;
  sec: string;
  scale: string;
  altitude: string;
  path: string[];
  lede: string;
  /** Claim slugs (into the `claims` collection) shown as this stage's anchors. */
  claimSlugs: string[];
  /** Optional per-claim card framing — `data` cards get a labelled pill. */
  claimKinds?: Record<string, { kind: 'claim' | 'data'; label?: string }>;
  /** Kongu surfaces the kootam totem grid. */
  showKootams?: boolean;
  /** Konur surfaces the kuladeivam gopuram. */
  showDeity?: boolean;
  /** Representative free-Atlas tree node for the "open in the Atlas" cross-link. */
  exploreNode: string;
}

const label = (id: StageId) => stagesById[id].label;

export const JOURNEY: JourneyStageDef[] = [
  {
    id: 'india',
    en: label('india').en,
    ta: label('india').ta,
    sec: 'Section A',
    scale: '1 : 1.4 billion',
    altitude: 'the subcontinent',
    path: ['India', 'Varna'],
    lede: 'The civilisational frame — four notional varnas drawn over thousands of lived jatis.',
    claimSlugs: ['varna-not-equal-jati', 'ani-asi-admixture-model'],
    claimKinds: { 'ani-asi-admixture-model': { kind: 'data', label: 'Genetics' } },
    exploreNode: 'indian-society',
  },
  {
    id: 'tamil-nadu',
    en: label('tamil-nadu').en,
    ta: label('tamil-nadu').ta,
    sec: 'Section B',
    scale: '1 : 72 million',
    altitude: 'the Tamil country',
    path: ['India', 'Varna', 'Jati'],
    lede: 'A Tamil-speaking state, historically split into Chola, Pandya, Tondai and Kongu Nadus.',
    claimSlugs: ['vellala-tank-irrigation', 'vellala-kaveri-origin'],
    claimKinds: { 'vellala-tank-irrigation': { kind: 'data', label: 'Timeline' } },
    exploreNode: 'vellala',
  },
  {
    id: 'kongu',
    en: label('kongu').en,
    ta: label('kongu').ta,
    sec: 'Section C',
    scale: '1 : 9 million',
    altitude: 'the western uplands',
    path: ['Jati', 'Gounder', '145 kootams'],
    lede: 'The western seven districts on the Cauvery uplands — homeland of the Kongu Vellala Gounders.',
    claimSlugs: ['kootam-exogamy-genetic-rationale', 'kootam-totem-system'],
    claimKinds: { 'kootam-totem-system': { kind: 'data', label: 'Count' } },
    showKootams: true,
    exploreNode: 'kongu-vellala',
  },
  {
    id: 'konur',
    en: label('konur').en,
    ta: label('konur').ta,
    sec: 'Section D',
    scale: '1 : 1 village',
    altitude: 'a single village',
    path: ['145 kootams', 'Kadai', 'Konur Kaliamman'],
    lede: 'One village. One temple. The literal address of a single clan’s guardian deity.',
    claimSlugs: ['kuladeivam-curse-on-non-visit', 'kongu-totem-clan-deity-triad'],
    showDeity: true,
    exploreNode: 'kadai',
  },
];

/**
 * Featured kootams for the Kongu stage's totem grid. Kadai (the author's own
 * clan, quail totem) is pinned first; the rest are filled in from documented
 * named kootams by the page so the grid never shows undocumented stubs.
 */
export const FEATURED_KOOTAM_SLUGS = ['kadai', 'maniyan', 'aalan', 'aandai'];
