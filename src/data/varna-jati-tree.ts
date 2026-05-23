// Varna -> Jati tree.
//
// IMPORTANT: This data is *illustrative*, not authoritative or exhaustive.
// There are thousands of jatis in India (the 1931 colonial census enumerated
// ~4,000+). This tree shows a representative slice -- enough to make the
// "4 varnas explode into many jatis" point visible -- with a deliberate path
// drilling down to the user's own kootam (Kadai) to anchor the "you are here"
// leaf. Regional bias: South India is over-represented because that's where
// the lineage path lands.
//
// Framing note on the "Outside varna" node: classical varna texts (e.g. the
// Purusha-Sukta of Rig Veda 10.90) enumerate only four varnas. Dalit and
// Adivasi communities are placed under "Outside varna" here to reflect the
// *historical exclusion* encoded by those texts -- it describes the schema,
// it does not endorse it. See node.note.

export type CasteLevel =
  | 'root'
  | 'varna'
  | 'caste-cluster'
  | 'jati'
  | 'sub-jati'
  | 'kootam';

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
  children?: TreeNode[];
}

export const varnaJatiTree: TreeNode = {
  id: 'indian-society',
  name: { en: 'Indian society', ta: 'இந்திய சமூகம்' },
  level: 'root',
  summary:
    'The aggregate of communities across the subcontinent. The varna schema is a textual category from Vedic-era literature; jati is the lived, endogamous, regional reality.',
  children: [
    {
      id: 'brahmin',
      name: { en: 'Brahmin', ta: 'பிராமணர்' },
      level: 'varna',
      tier: 'green',
      summary:
        'Priestly varna in classical texts. In practice a constellation of regional, often endogamous jatis with distinct rites and languages.',
      children: [
        {
          id: 'tamil-brahmin',
          name: { en: 'Tamil Brahmin', ta: 'தமிழ் பிராமணர்' },
          level: 'caste-cluster',
          summary: 'Smarta and Sri Vaishnava communities of Tamil Nadu.',
          children: [
            { id: 'iyer', name: { en: 'Iyer', ta: 'ஐயர்' }, level: 'jati', summary: 'Smarta Tamil Brahmins.' },
            { id: 'iyengar', name: { en: 'Iyengar', ta: 'ஐயங்கார்' }, level: 'jati', summary: 'Sri Vaishnava Tamil Brahmins.' },
          ],
        },
        { id: 'saraswat', name: { en: 'Saraswat' }, level: 'jati', summary: 'Konkan / Goa coastal Brahmin community.' },
        { id: 'namboodiri', name: { en: 'Namboodiri', ta: 'நம்பூதிரி' }, level: 'jati', summary: 'Kerala Brahmin community with distinct primogeniture rules.' },
        { id: 'kashmiri-pandit', name: { en: 'Kashmiri Pandit' }, level: 'jati', summary: 'Kashmir Valley Brahmin community.' },
        { id: 'gaur-brahmin', name: { en: 'Gaur Brahmin' }, level: 'jati', summary: 'North Indian Brahmin cluster.' },
      ],
    },
    {
      id: 'kshatriya',
      name: { en: 'Kshatriya', ta: 'க்ஷத்திரியர்' },
      level: 'varna',
      tier: 'yellow',
      summary:
        'Warrior / ruler varna. South Indian groups rarely map cleanly onto this category; many "ruling" jatis claimed Kshatriya status post-hoc.',
      children: [
        { id: 'rajput', name: { en: 'Rajput' }, level: 'jati', summary: 'A cluster of warrior lineages of northern and western India.' },
        { id: 'thakur', name: { en: 'Thakur' }, level: 'jati', summary: 'Title used by several land-holding warrior communities.' },
        { id: 'nair', name: { en: 'Nair', ta: 'நாயர்' }, level: 'jati', summary: 'Kerala martial community, matrilineal historically.' },
        { id: 'maratha-kshatriya', name: { en: 'Maratha (Kshatriya claim)' }, level: 'jati', summary: 'Shivaji-era assertion of Kshatriya status; disputed historically.' },
      ],
    },
    {
      id: 'vaishya',
      name: { en: 'Vaishya', ta: 'வைசியர்' },
      level: 'varna',
      tier: 'green',
      summary: 'Merchant / agriculturalist varna in classical texts.',
      children: [
        { id: 'bania', name: { en: 'Bania' }, level: 'jati', summary: 'North Indian merchant cluster.' },
        { id: 'marwari', name: { en: 'Marwari' }, level: 'jati', summary: 'Rajasthani trading community.' },
        { id: 'chettiar', name: { en: 'Chettiar', ta: 'செட்டியார்' }, level: 'jati', summary: 'Tamil merchant / banking community (Nattukottai etc.).' },
        { id: 'komati', name: { en: 'Komati' }, level: 'jati', summary: 'Telugu merchant community.' },
      ],
    },
    {
      id: 'shudra',
      name: { en: 'Shudra', ta: 'சூத்திரர்' },
      level: 'varna',
      tier: 'yellow',
      summary:
        'In classical texts, the service / cultivator varna. In practice this label has been applied to a huge and heterogeneous set of regional jatis, including many dominant landed groups.',
      children: [
        { id: 'reddy', name: { en: 'Reddy', ta: 'ரெட்டி' }, level: 'jati', summary: 'Telugu landed agriculturalist community.' },
        { id: 'kamma', name: { en: 'Kamma' }, level: 'jati', summary: 'Telugu / Andhra agriculturalist community.' },
        { id: 'patel-patidar', name: { en: 'Patel / Patidar' }, level: 'jati', summary: 'Gujarati landed agriculturalist community.' },
        { id: 'yadav', name: { en: 'Yadav' }, level: 'jati', summary: 'North Indian pastoralist cluster.' },
        { id: 'maratha', name: { en: 'Maratha' }, level: 'jati', summary: 'Maharashtra dominant agriculturalist / warrior community.' },
        {
          id: 'vellala',
          name: { en: 'Vellala', ta: 'வேளாளர்' },
          level: 'jati',
          summary: 'Tamil landed agriculturalist cluster -- a major Tamil Shudra-classified caste category.',
          children: [
            { id: 'saiva-vellala', name: { en: 'Saiva Vellala', ta: 'சைவ வேளாளர்' }, level: 'sub-jati', summary: 'Saiva-aligned Vellala community.' },
            { id: 'karkatha-vellala', name: { en: 'Karkatha Vellala', ta: 'கார்காத்த வேளாளர்' }, level: 'sub-jati', summary: 'Karkatha Vellala sub-community.' },
            { id: 'mudaliar', name: { en: 'Mudaliar', ta: 'முதலியார்' }, level: 'sub-jati', summary: 'A title-cum-sub-group within the Vellala cluster.' },
            {
              id: 'kongu-vellala',
              name: { en: 'Kongu Vellala (Gounder)', ta: 'கொங்கு வேளாளர்' },
              level: 'sub-jati',
              tier: 'green',
              summary:
                'Dominant agriculturalist caste of the Kongu Nadu region (western Tamil Nadu). Organised into ~145 exogamous kootams (clans), each with a totem.',
              children: [
                {
                  id: 'kadai',
                  name: { en: 'Kadai Kootam', ta: 'கடை கூட்டம்' },
                  level: 'kootam',
                  tier: 'green',
                  highlight: true,
                  summary:
                    'One of the ~145 Kongu Vellala kootams. Totem: kadai (quail). Endogamous within Kongu Vellala but exogamous at the kootam level.',
                },
                { id: 'sengunthar-kootam', name: { en: 'Sengunthar', ta: 'செங்குந்தர்' }, level: 'kootam', summary: 'A Kongu Vellala kootam (note: also a separate caste name elsewhere; here used as the kootam sense).' },
                { id: 'periya-pulli', name: { en: 'Periya Pulli', ta: 'பெரிய புள்ளி' }, level: 'kootam', summary: 'A Kongu Vellala kootam.' },
                { id: 'pavalan', name: { en: 'Pavalan', ta: 'பவளன்' }, level: 'kootam', summary: 'A Kongu Vellala kootam.' },
                { id: 'aandai', name: { en: 'Aandai', ta: 'ஆண்டை' }, level: 'kootam', summary: 'A Kongu Vellala kootam.' },
                { id: 'aalan', name: { en: 'Aalan', ta: 'ஆலன்' }, level: 'kootam', summary: 'A Kongu Vellala kootam.' },
                { id: 'velaalan', name: { en: 'Velaalan', ta: 'வேளாளன்' }, level: 'kootam', summary: 'A Kongu Vellala kootam.' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'outside-varna',
      name: { en: 'Outside varna', ta: 'வர்ணத்திற்கு வெளியே' },
      level: 'varna',
      tier: 'yellow',
      note:
        'Classical varna texts enumerate only four varnas; Dalit and Adivasi communities are historically excluded from that schema. This node reflects that historical exclusion -- it documents the framing in classical sources, it does not endorse it.',
      summary:
        'Communities placed outside the four-varna schema by classical texts: Dalit (formerly "untouchable") jatis and Adivasi (indigenous tribal) groups.',
      children: [
        {
          id: 'dalit',
          name: { en: 'Dalit', ta: 'தலித்' },
          level: 'caste-cluster',
          summary: 'Communities historically subjected to untouchability; constitutionally protected as Scheduled Castes.',
          children: [
            { id: 'paraiyar', name: { en: 'Paraiyar', ta: 'பறையர்' }, level: 'jati', summary: 'Tamil Dalit community.' },
            { id: 'mahar', name: { en: 'Mahar' }, level: 'jati', summary: 'Maharashtra Dalit community; Ambedkar\'s community.' },
            { id: 'chamar', name: { en: 'Chamar' }, level: 'jati', summary: 'North Indian Dalit community.' },
            { id: 'pulayar', name: { en: 'Pulayar', ta: 'புலையர்' }, level: 'jati', summary: 'Kerala Dalit community.' },
          ],
        },
        {
          id: 'adivasi',
          name: { en: 'Adivasi', ta: 'ஆதிவாசி' },
          level: 'caste-cluster',
          summary: 'Indigenous tribal communities; constitutionally protected as Scheduled Tribes.',
          children: [
            { id: 'gond', name: { en: 'Gond' }, level: 'jati', summary: 'Central Indian tribal community.' },
            { id: 'santhal', name: { en: 'Santhal' }, level: 'jati', summary: 'Eastern Indian tribal community.' },
            { id: 'bhil', name: { en: 'Bhil' }, level: 'jati', summary: 'Western Indian tribal community.' },
            { id: 'toda', name: { en: 'Toda', ta: 'தோடா' }, level: 'jati', summary: 'Nilgiris pastoralist tribal community.' },
          ],
        },
      ],
    },
  ],
};
