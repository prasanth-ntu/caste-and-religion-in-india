/**
 * Canonical definition of the three curated reading paths surfaced on /explore.
 *
 * This module is the single source of truth for runtime code (Explorer popup,
 * PathProgress amber bar). The /explore.astro page renders the same lane data
 * inline in its frontmatter — keep the two in sync. If they diverge, treat
 * /explore.astro as authoritative and update this file.
 */

export type PathId = 'researcher' | 'family' | 'curious';

export interface PathStop {
  /** 1-based for display. Internal storage uses 0-based indices. */
  index: number;
  title: string;
  tamilTitle?: string;
  href: string;
  minutes: number;
  teaser: string;
}

export interface PathDef {
  id: PathId;
  /** Display name used in the amber PathProgress bar copy. */
  name: string;
  totalMinutes: number;
  stops: PathStop[];
}

export const PATHS: Record<PathId, PathDef> = {
  researcher: {
    id: 'researcher',
    name: 'researcher',
    totalMinutes: 22,
    stops: [
      {
        index: 1,
        title: 'Varna vs Jati',
        tamilTitle: 'வர்ணமும் ஜாதியும்',
        href: '/overview/varna-vs-jati?path=researcher&stop=1',
        minutes: 5,
        teaser:
          'Varna ≠ jati: the structural difference that almost every popular account flattens.',
      },
      {
        index: 2,
        title: 'Genetics',
        tamilTitle: 'மரபியல்',
        href: '/overview/genetics?path=researcher&stop=2',
        minutes: 6,
        teaser:
          'What genetics actually says about ANI/ASI admixture, founder effects, and caste endogamy.',
      },
      {
        index: 3,
        title: 'Timeline',
        tamilTitle: 'காலவரிசை',
        href: '/overview/timeline?path=researcher&stop=3',
        minutes: 4,
        teaser: 'Sangam → 1881 census → Mandal → today: two thousand years in one chart.',
      },
      {
        index: 4,
        title: 'Reservation policy',
        tamilTitle: 'இடஒதுக்கீடு',
        href: '/overview/reservation-policy?path=researcher&stop=4',
        minutes: 4,
        teaser:
          'The Sankey of category → education → jobs, with Tamil Nadu’s 69% as a case study.',
      },
      {
        index: 5,
        title: 'Sources',
        tamilTitle: 'ஆதாரங்கள்',
        href: '/sources?path=researcher&stop=5',
        minutes: 3,
        teaser:
          'The full tier-coded bibliography — every claim on the site points back here.',
      },
    ],
  },
  family: {
    id: 'family',
    name: 'family historian',
    totalMinutes: 18,
    stops: [
      {
        index: 1,
        title: 'Pick a kootam',
        tamilTitle: 'குலம்',
        href: '/lineage?path=family&stop=1',
        minutes: 1,
        teaser:
          'Start here. Pick one of 145 documented kootams — the exogamous clan unit.',
      },
      {
        index: 2,
        title: 'Kadai kootam',
        tamilTitle: 'கடை குலம்',
        href: '/lineage/k/kadai?path=family&stop=2',
        minutes: 5,
        teaser:
          'The Kadai (quail) kootam: totem, region, and the worked example used across this site.',
      },
      {
        index: 3,
        title: 'Konur Kaliamman',
        tamilTitle: 'கோனூர் காளியம்மன்',
        href: '/lineage/konur?path=family&stop=3',
        minutes: 4,
        teaser:
          'The kuladeivam at the bottom of the trail — a village goddess, not a Brahmanical import.',
      },
      {
        index: 4,
        title: 'Ancestor practices',
        tamilTitle: 'முன்னோர் செய்தவை',
        href: '/lineage/ancestors?path=family&stop=4',
        minutes: 5,
        teaser:
          'What Vellala actually did — material life, tier-tagged, over a stylised Kongu landscape.',
      },
      {
        index: 5,
        title: 'Contribute',
        tamilTitle: 'பங்களிப்பு',
        href: '/contribute?path=family&stop=5',
        minutes: 3,
        teaser: 'If a kootam isn’t documented yet — what we need, and how to send it.',
      },
    ],
  },
  curious: {
    id: 'curious',
    name: 'curious reader',
    totalMinutes: 12,
    stops: [
      {
        index: 1,
        title: 'What this site is about',
        tamilTitle: 'அறிமுகம்',
        href: '/?path=curious&stop=1',
        minutes: 1,
        teaser:
          'Fact vs fiction in caste, religion, and ritual — the one-paragraph version.',
      },
      {
        index: 2,
        title: 'The big picture in 5 minutes',
        tamilTitle: 'பெரிய படம்',
        href: '/overview/varna-vs-jati?path=curious&stop=2',
        minutes: 5,
        teaser:
          'Varna is a textual category of four. Jati is the lived reality of thousands.',
      },
      {
        index: 3,
        title: 'Why a village goddess',
        tamilTitle: 'கிராம தெய்வம்',
        href: '/lineage/konur?path=curious&stop=3',
        minutes: 3,
        teaser:
          'Konur Kaliamman: why a village goddess sits at the bottom of any honest lineage trail.',
      },
      {
        index: 4,
        title: 'Decoding a ritual',
        tamilTitle: 'சடங்கு',
        href: '/rituals/tonsuring?path=curious&stop=4',
        minutes: 3,
        teaser:
          'Tonsuring: what a ritual actually is when you peel back the temple-pamphlet version.',
      },
    ],
  },
};
