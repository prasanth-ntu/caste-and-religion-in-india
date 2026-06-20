// The Atlas (Explore) model. Flattens the real varna→jati tree into a node
// index, maps any node to its descent stage (india → tamil-nadu → kongu →
// konur), and carries the per-node micro-narratives + arrival copy the two
// Explore shells share. Pure + client-safe (no astro:content): the page resolves
// the factual stage payload (claims, kootams, deity) from the content
// collections and passes it in as `ResolvedStage[]`.

import { varnaJatiTree, type TreeNode } from './varna-jati-tree';
import type { Tier } from './atlas-journey';

export type StageId = 'india' | 'tamil-nadu' | 'kongu' | 'konur';

export interface ExNode {
  id: string;
  name: string; // English
  ta?: string;
  level: TreeNode['level'];
  summary?: string;
  tier?: Tier;
}

// ---- flat node index -------------------------------------------------------
function flatten(node: TreeNode, parent: string | null, out: ExNode[], parentMap: Record<string, string | null>): void {
  out.push({
    id: node.id,
    name: node.name.en,
    ta: node.name.ta,
    level: node.level,
    summary: node.summary,
    tier: node.tier,
  });
  parentMap[node.id] = parent;
  node.children?.forEach((c) => flatten(c, node.id, out, parentMap));
}

const PARENT: Record<string, string | null> = {};
export const ALL: ExNode[] = [];
flatten(varnaJatiTree, null, ALL, PARENT);
export const BYID: Record<string, ExNode> = Object.fromEntries(ALL.map((n) => [n.id, n]));

function ancestorsInclusive(id: string): Set<string> {
  const set = new Set<string>();
  let cur: string | null = id;
  while (cur) {
    set.add(cur);
    cur = PARENT[cur] ?? null;
  }
  return set;
}

// ---- node → descent stage --------------------------------------------------
// Tamil communities map to the Tamil-country frame; Kongu Vellala + its kootams
// to Kongu; Kadai (the one documented kuladeivam) all the way to Konur; every
// other varna / non-Tamil jati rests at the widest India frame.
export function stageForNode(id: string): StageId {
  if (id === 'kadai') return 'konur';
  const anc = ancestorsInclusive(id);
  if (anc.has('kongu-vellala')) return 'kongu';
  if (anc.has('vellala') || anc.has('chettiar') || anc.has('tamil-brahmin')) return 'tamil-nadu';
  return 'india';
}

// ---- the four descent stages (rail) ----------------------------------------
export interface RailStop {
  id: StageId;
  node: string; // representative tree node to focus when jumping here
  en: string;
  ta: string;
}
export const RAIL: RailStop[] = [
  { id: 'india', node: 'indian-society', en: 'India', ta: 'இந்தியா' },
  { id: 'tamil-nadu', node: 'vellala', en: 'Tamil Nadu', ta: 'தமிழ்நாடு' },
  { id: 'kongu', node: 'kongu-vellala', en: 'Kongu', ta: 'கொங்கு' },
  { id: 'konur', node: 'kadai', en: 'Konur', ta: 'கோனூர்' },
];
export function railIdx(stage: StageId): number {
  return Math.max(0, RAIL.findIndex((r) => r.id === stage));
}

// ---- arrival narration (second person, only for wayfinding) ----------------
export const ARRIVAL: Record<StageId, { where: string; line: string }> = {
  india: {
    where: 'The widest view',
    line: 'You begin at the subcontinental frame — four notional varnas drawn over thousands of lived jatis.',
  },
  'tamil-nadu': {
    where: 'You enter the Tamil country',
    line: 'South now — into the land once split between Chola, Pandya, Tondai and Kongu Nadus.',
  },
  kongu: {
    where: 'You leave the Tamil plains',
    line: 'The Cauvery uplands open below — the western seven districts, homeland of the Kongu Vellala Gounders.',
  },
  konur: {
    where: 'The descent ends',
    line: 'One village. One temple. The literal address of a single clan’s guardian deity.',
  },
};

export const LVLAB: Record<TreeNode['level'], string> = {
  root: 'Society',
  varna: 'Varna',
  'caste-cluster': 'Caste cluster',
  jati: 'Jati',
  'sub-jati': 'Sub-jati',
  kootam: 'Kootam',
  'temple-clan': 'Temple-clan',
};

export const EX_LV_DOT: Record<TreeNode['level'], string> = {
  root: '#a8a29e',
  varna: '#4338ca',
  'caste-cluster': '#b45309',
  jati: '#b45309',
  'sub-jati': '#047857',
  kootam: '#be123c',
  'temple-clan': '#6d28d9',
};

// ---- per-node micro-narratives (editorial; invent no claims) ---------------
export const NODECOPY: Record<string, string> = {
  'indian-society':
    'The widest frame — four notional varnas of scripture drawn over several thousand jatis people actually live in. The whole descent starts from one distinction: varna is a model, jati is the reality.',
  brahmin:
    'The priestly-scholarly varna of the classical scheme — internally split by region and rite into many endogamous jatis that share little beyond the label.',
  kshatriya:
    'The warrior-ruler varna in theory — in practice a contested category many landholding and martial groups claimed into, rather than a fixed descent line.',
  vaishya:
    'The merchant-pastoralist varna of the texts — its lived form is a scatter of trading and banking jatis, each with its own marriage circle.',
  shudra:
    'In the four-fold scheme, the service-and-cultivator order — but on the ground a vast, heterogeneous set of regional jatis, many of them dominant landholders, with little in common beyond the classification.',
  'outside-varna':
    'Communities the varna scheme never accommodated — Dalit and Adivasi groups whose place in the model is its sharpest failure, not a tidy fifth tier.',
  vellala:
    'Not one descent group but a status-cluster of Tamil landholding cultivators — its exact composition shifts by region and by who is doing the counting. One of the better-attested status terms in the Tamil record, yet still an umbrella, not a lineage.',
  'kongu-vellala':
    'The dominant agriculturalist community of the Cauvery uplands, organised into roughly 145 exogamous kootams — clans you must marry outside of. The kootam system is where a broad caste label finally resolves into something a family can name.',
  kadai:
    'The author’s own kootam — totem the quail (காடை). It descends all the way to a single village: its kuladeivam is Konur Kaliamman, and the shrine is, in effect, the clan’s permanent address.',
  nagarathar:
    'Nattukottai Chettiar — a mercantile-banking community of Chettinad organised into nine exogamous temple-clans. A structural echo of the kootam system, arrived at independently in a very different economy.',
  'saiva-vellala':
    'A Saivite sub-group of the Vellala cluster, historically associated with temple service and literacy — status claimed through religious vocation as much as land.',
  mudaliar:
    'A title-bearing Vellala sub-group — “Mudaliar” is an honorific of precedence that attached to several distinct communities, so the name marks rank more than a single descent.',
  iyer:
    'A Smarta Tamil Brahmin jati — endogamous, with its own sub-divisions; one worked example of how a single varna fragments into many marriage circles.',
  iyengar:
    'A Sri Vaishnava Tamil Brahmin jati, itself split into Vadakalai and Thenkalai sub-traditions — endogamy operating two levels below the varna label.',
};

export function kootamCopy(node: ExNode): string | null {
  if (node.id === 'kadai') return null;
  return 'A named Kongu Vellala kootam. Exogamous within Kongu Vellala; its tutelary shrine is named in tradition but not yet documented here, so the descent rests at Kongu.';
}

// ---- node detail + redirect targets (mirror real content routes) -----------
export interface NodeMeta {
  tier: Tier;
  summary: string;
  href: string;
  cta: string;
}
const NODE_META: Record<string, NodeMeta> = {
  kadai: { tier: 'green', summary: 'One of the ~145 Kongu Vellala kootams. Totem: quail (காடை). Endogamous within Kongu Vellala, exogamous at kootam level.', href: '/lineage/konur', cta: 'Open Konur Kaliamman' },
  aalan: { tier: 'yellow', summary: 'A Kongu Vellala kootam (illustrative). Village + deity pending records.', href: '/lineage/k/aalan/', cta: 'Open Aalan kootam' },
  'kongu-vellala': { tier: 'green', summary: 'Dominant agriculturalist caste of Kongu Nadu, organised into ~145 exogamous kootams.', href: '/overview/tree/?node=kongu-vellala', cta: 'Explore Kongu Vellala' },
  vellala: { tier: 'yellow', summary: 'Tamil landed-agriculturalist cluster — a major Tamil Shudra-classified category.', href: '/overview/tree/?node=vellala', cta: 'Explore Vellala' },
  shudra: { tier: 'yellow', summary: 'Service / cultivator varna in classical texts; in practice a vast, heterogeneous set of regional jatis.', href: '/overview/varna-vs-jati', cta: 'Read varna vs jati' },
  nagarathar: { tier: 'green', summary: 'Nattukottai Chettiar; mercantile-banking community of Chettinad, nine exogamous temple-clans.', href: '/lineage/nagarathar', cta: 'Open Nagarathar' },
};
export function metaForNode(id: string): NodeMeta {
  if (NODE_META[id]) return NODE_META[id];
  const n = BYID[id];
  return {
    tier: n?.tier ?? (n?.level === 'kootam' ? 'yellow' : 'green'),
    summary: n?.summary ?? `${n?.name ?? id} — ${(n?.level ?? 'node').replace('-', ' ')} in the Varna→Jati tree.`,
    href: `/overview/tree/?node=${id}`,
    cta: `Open ${n?.name ?? id}`,
  };
}

// ---- the resolved factual stage payload (built by the page) ----------------
export interface Anchor {
  kind: 'claim' | 'data';
  label?: string;
  tier: Tier;
  text: string;
  evidence: string;
}
export interface FeaturedKootam {
  slug: string;
  en: string;
  ta: string;
  totem: string;
  note: string;
  isAuthor: boolean;
}
export interface ResolvedStage {
  id: StageId;
  en: string;
  ta: string;
  sec: string;
  scale: string;
  altitude: string;
  path: string[];
  lede: string;
  anchors: Anchor[];
  kootams?: FeaturedKootam[];
  kootamsMore?: number;
  deity?: { en: string; ta: string; place: string };
}

// ---- the narrative for a focused node --------------------------------------
export interface NodeNarr {
  node: ExNode;
  stage: StageId;
  sd: ResolvedStage;
  lede: string;
  claims: Anchor[];
  levelLabel: string;
  stageIdx: number;
  meta: NodeMeta;
  tier: Tier;
}
export function nodeNarr(focus: string, stagesById: Record<StageId, ResolvedStage>): NodeNarr {
  const node: ExNode = BYID[focus] ?? { id: focus, name: focus, level: 'kootam' };
  const stage = stageForNode(focus);
  const sd = stagesById[stage];
  const meta = metaForNode(focus);
  const lede =
    NODECOPY[focus] ||
    (node.level === 'kootam' ? kootamCopy(node) : null) ||
    node.summary ||
    meta.summary ||
    sd.lede;
  return {
    node,
    stage,
    sd,
    lede,
    claims: sd.anchors ?? [],
    levelLabel: LVLAB[node.level] ?? node.level,
    stageIdx: railIdx(stage),
    meta,
    tier: meta.tier,
  };
}
