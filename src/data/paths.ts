/**
 * Canonical definition of the single guided reading path — "The Decoded
 * Walkthrough" — surfaced on /explore.
 *
 * This module is the SINGLE SOURCE OF TRUTH. /explore.astro imports it directly
 * (no more inline lane duplication) and the Explorer quick-start widget reads
 * the stop count from it to prime progress. Edit the walkthrough here only.
 */

export type PathId = 'walkthrough';

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
  /** Display name. */
  name: string;
  tamilName: string;
  description: string;
  totalMinutes: number;
  stops: PathStop[];
}

/**
 * One ordered path that covers the site's whole thesis: the structural
 * distinction, the genetics, a lived case study, the deity at the bottom of a
 * lineage trail, and a decoded ritual — ending where every claim resolves.
 */
export const WALKTHROUGH: PathDef = {
  id: 'walkthrough',
  name: 'The Decoded Walkthrough',
  tamilName: 'தெளிவு பயணம்',
  description:
    'One guided path through the whole argument: how this site weighs evidence, the varna–jati distinction, what genetics actually shows, a worked lineage case study, the village goddess at the bottom of the trail, and a single ritual decoded.',
  totalMinutes: 19,
  stops: [
    {
      index: 1,
      title: 'How this site works',
      tamilTitle: 'அணுகுமுறை',
      href: '/about',
      minutes: 1,
      teaser:
        'Start here: the evidence-tier method (🟢🟡🔴⚖️) and what “decoded” means before any claim.',
    },
    {
      index: 2,
      title: 'Varna vs Jati',
      tamilTitle: 'வர்ணமும் ஜாதியும்',
      href: '/overview/varna-vs-jati',
      minutes: 5,
      teaser:
        'Varna ≠ jati: the structural difference that almost every popular account flattens.',
    },
    {
      index: 3,
      title: 'Genetics',
      tamilTitle: 'மரபியல்',
      href: '/overview/genetics',
      minutes: 6,
      teaser:
        'What genetics actually says about ANI/ASI admixture, founder effects, and caste endogamy.',
    },
    {
      index: 4,
      title: 'A lineage case study',
      tamilTitle: 'வம்சாவளி',
      href: '/lineage',
      minutes: 1,
      teaser:
        'The Kongu Vellala kootam system as a worked example — 145 exogamous clans, mapped.',
    },
    {
      index: 5,
      title: 'Konur Kaliamman',
      tamilTitle: 'கோனூர் காளியம்மன்',
      href: '/lineage/konur',
      minutes: 3,
      teaser:
        'The kuladeivam at the bottom of the trail — a village goddess, not a Brahmanical import.',
    },
    {
      index: 6,
      title: 'A ritual, decoded',
      tamilTitle: 'சடங்கு',
      href: '/rituals/tonsuring',
      minutes: 3,
      teaser:
        'Tonsuring: tradition, evidence, and rational basis — what a ritual is past the pamphlet version.',
    },
  ],
};
