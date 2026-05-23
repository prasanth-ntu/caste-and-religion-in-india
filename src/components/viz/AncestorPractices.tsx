import { useEffect, useRef, useState } from 'react';

/**
 * AncestorPractices — V8
 *
 * A toggleable panel over a stylised Kongu landscape. Each hotspot reveals a
 * tier-tagged factsheet describing a concrete material practice: a crop, a
 * tool, a role, or a memorial form.
 *
 * Goal: counter both romantic ("noble cultivator") and shame-only ("oppressor")
 * framings of Vellala ancestry with grounded, evidence-tagged material practice.
 */

type Tier = 'green' | 'yellow' | 'red' | 'rational';

type Category =
  | 'crop'
  | 'tool'
  | 'role'
  | 'memorial';

interface Hotspot {
  id: string;
  category: Category;
  // Coordinates on the 800x400 landscape viewBox.
  x: number;
  y: number;
  label: { en: string; ta: string };
  // Short framing pairs, taken from the spec.
  tradition: string;
  evidence: string;
  tier: Tier;
  sources: { id: string; label: string }[];
}

const CATEGORY_META: Record<Category, { label: string; ta: string; color: string; ring: string; bg: string }> = {
  crop:     { label: 'Crops',       ta: 'பயிர்கள்',   color: '#15803d', ring: 'ring-emerald-300', bg: 'bg-emerald-50' },
  tool:     { label: 'Tools',       ta: 'கருவிகள்',  color: '#0369a1', ring: 'ring-sky-300',     bg: 'bg-sky-50' },
  role:     { label: 'Roles',       ta: 'பதவிகள்',   color: '#a16207', ring: 'ring-amber-300',   bg: 'bg-amber-50' },
  memorial: { label: 'Memorials',   ta: 'நினைவுச்சின்னம்', color: '#9f1239', ring: 'ring-rose-300', bg: 'bg-rose-50' },
};

const TIER_META: Record<Tier, { emoji: string; label: string; bg: string; fg: string; ring: string }> = {
  green:    { emoji: '🟢', label: 'Well-established',     bg: 'bg-emerald-50', fg: 'text-emerald-800', ring: 'ring-emerald-200' },
  yellow:   { emoji: '🟡', label: 'Plausible / debated',  bg: 'bg-amber-50',   fg: 'text-amber-800',   ring: 'ring-amber-200' },
  red:      { emoji: '🔴', label: 'Myth / unverified',    bg: 'bg-rose-50',    fg: 'text-rose-800',    ring: 'ring-rose-200' },
  rational: { emoji: '⚖️', label: 'Rational basis',       bg: 'bg-sky-50',     fg: 'text-sky-800',     ring: 'ring-sky-200' },
};

const HOTSPOTS: Hotspot[] = [
  // ----- Crops / occupations -----
  {
    id: 'paddy',
    category: 'crop',
    x: 200, y: 290,
    label: { en: 'Paddy', ta: 'செந்நெல்' },
    tradition: 'The "noble cultivator" identity is anchored in wet-rice agriculture — paddy as the prestige crop, the marker of settled, irrigated, lineage-rooted farming.',
    evidence: 'Paddy was grown wherever tank- or well-fed water allowed; in semi-arid Kongu, paddy plots were the small, irrigated core surrounded by larger dry-land tracts. Sangam and medieval inscriptions confirm Vellala involvement in paddy economies, but rice was never the only Kongu crop.',
    tier: 'green',
    sources: [
      { id: 'wikipedia-kongu-vellalar', label: 'Wikipedia: Kongu Vellalar' },
      { id: 'bayly-1999-caste', label: 'Bayly 1999, Caste, Society & Politics' },
    ],
  },
  {
    id: 'sugarcane',
    category: 'crop',
    x: 360, y: 300,
    label: { en: 'Sugarcane', ta: 'கரும்பு' },
    tradition: 'Sugarcane appears in Tamil literary memory as a sweetness associated with prosperous river-valley farming.',
    evidence: 'Sugarcane was cultivated in pockets of Kongu wherever sustained irrigation was possible; jaggery production was a recurring Kongu trade. The crop is labour-intensive and water-hungry — its presence required both irrigation infrastructure and a labour force, neither of which the landowner alone supplied.',
    tier: 'yellow',
    sources: [
      { id: 'wikipedia-kongu-vellalar', label: 'Wikipedia: Kongu Vellalar' },
    ],
  },
  {
    id: 'cotton',
    category: 'crop',
    x: 520, y: 300,
    label: { en: 'Cotton', ta: 'பருத்தி' },
    tradition: 'Cotton is often skipped in romantic genealogies that prefer paddy — yet it is arguably the more historically defining Kongu crop.',
    evidence: 'The Kongu region was a major pre-modern cotton belt, feeding the handloom economies of Coimbatore, Erode, and later Tiruppur. Dry-land cotton fit the semi-arid climate better than paddy and was central to Vellala-managed agriculture across centuries.',
    tier: 'green',
    sources: [
      { id: 'wikipedia-kongu-vellalar', label: 'Wikipedia: Kongu Vellalar' },
      { id: 'bayly-1999-caste', label: 'Bayly 1999, Caste, Society & Politics' },
    ],
  },
  {
    id: 'millets',
    category: 'crop',
    x: 660, y: 295,
    label: { en: 'Millets', ta: 'கேழ்வரகு / குதிரைவாலி' },
    tradition: 'Often left out of the prestige story because millets are framed as "poor people\'s food" in modern Tamil culture.',
    evidence: 'Millets — finger millet (கேழ்வரகு), kodo / barnyard millets (குதிரைவாலி) — were the everyday staple across Kongu dry-land. Most Kongu Vellala households ate millet far more often than paddy until the twentieth century. The recent valorisation of millets as a "superfood" is a near-inversion of the recent past.',
    tier: 'green',
    sources: [
      { id: 'wikipedia-kongu-vellalar', label: 'Wikipedia: Kongu Vellalar' },
    ],
  },

  // ----- Tools / infrastructure -----
  {
    id: 'kamalai',
    category: 'tool',
    x: 130, y: 200,
    label: { en: 'Kamalai', ta: 'கமலை' },
    tradition: 'A bullock-driven leather-bag water lift used to draw well-water onto fields — emblematic of Kongu hydraulic ingenuity.',
    evidence: 'The kamalai is a well-documented pre-modern Tamil irrigation device: a leather bag (மோட்டை) on a rope, pulled up a sloped ramp by a pair of bullocks, tipping its load into a channel. It defined the Vellala "masters of water" identity in a literal mechanical sense, and it required coordinated labour from cultivator and labouring castes alike.',
    tier: 'green',
    sources: [
      { id: 'vellala-tank-irrigation', label: 'Tank & well irrigation (yellow)' },
      { id: 'wikipedia-kongu-vellalar', label: 'Wikipedia: Kongu Vellalar' },
    ],
  },
  {
    id: 'eri',
    category: 'tool',
    x: 400, y: 195,
    label: { en: 'Eri / tank irrigation', ta: 'ஏரி' },
    tradition: 'The village tank (ஏரி) is the social heart of Kongu hydrology — a man-made reservoir feeding paddy fields through sluice gates.',
    evidence: 'Tank irrigation is the most defensible piece of the Vellala material legacy. Medieval inscriptions across the Kaveri delta, Kongu, and Tondai country document Vellala-managed tank systems; the engineering — earthen bunds, sluice gates, command-area channels — is preserved in landscape and inscription alike. Maintenance was a community obligation, not the landowner\'s alone.',
    tier: 'green',
    sources: [
      { id: 'vellala-tank-irrigation', label: 'Tank & well irrigation' },
      { id: 'bayly-1999-caste', label: 'Bayly 1999, Caste, Society & Politics' },
    ],
  },
  {
    id: 'kalathu-medai',
    category: 'tool',
    x: 600, y: 215,
    label: { en: 'Threshing floor', ta: 'களத்துமேடை' },
    tradition: 'The threshing floor (களத்துமேடை) is the post-harvest convergence point — where the year\'s grain is separated, weighed, and divided.',
    evidence: 'A raised, mud-plastered circular platform on which harvested paddy or millet sheaves were threshed by bullock-tread. The threshing floor is also where the year\'s grain share was distributed across labour castes, tenants, and the landlord — making it the concrete site at which agrarian caste hierarchy was enacted, not just symbolised.',
    tier: 'yellow',
    sources: [
      { id: 'bayly-1999-caste', label: 'Bayly 1999, Caste, Society & Politics' },
    ],
  },

  // ----- Roles / governance -----
  {
    id: 'naattaanmai',
    category: 'role',
    x: 250, y: 130,
    label: { en: 'Naattaanmai', ta: 'நாட்டாண்மை' },
    tradition: 'The community elder / headman role — the figure who arbitrated marriages, land disputes, and kootam-level decisions before the colonial courts.',
    evidence: 'Naattaanmai (literally "the rulership of the country") is well-attested in Kongu ethnography as a hereditary or semi-hereditary office held by senior Kongu Vellala men. The role provided real local power but was also the mechanism by which kootam exogamy, ritual sanction, and labour relations were enforced — both protective and disciplinary.',
    tier: 'yellow',
    sources: [
      { id: 'wikipedia-kongu-vellalar', label: 'Wikipedia: Kongu Vellalar' },
      { id: 'dirks-2001-castes-of-mind', label: 'Dirks 2001, Castes of Mind' },
    ],
  },
  {
    id: 'pattakaarar',
    category: 'role',
    x: 540, y: 120,
    label: { en: 'Pattakaarar', ta: 'பட்டக்காரர்' },
    tradition: 'A titled landlord / judicial figure — the "title-holder" recognised by both the village and the larger polity.',
    evidence: 'Pattakaarar (பட்டக்காரர், "title-bearer") refers to a hereditary office with judicial and ceremonial authority across a set of villages, sometimes a kootam or natu. Colonial-era records and Bayly\'s 1999 history both document the survival and partial transformation of such titles under the Madras Presidency. Like Naattaanmai, the role was both genuinely consultative and a hard ceiling on subordinate communities.',
    tier: 'yellow',
    sources: [
      { id: 'bayly-1999-caste', label: 'Bayly 1999, Caste, Society & Politics' },
      { id: 'dirks-2001-castes-of-mind', label: 'Dirks 2001, Castes of Mind' },
    ],
  },

  // ----- Memorial markers -----
  {
    id: 'naadukal',
    category: 'memorial',
    x: 720, y: 250,
    label: { en: 'Naadukal / hero stone', ta: 'நடுகல் / வீரக்கல்' },
    tradition: 'A planted stone for a warrior who died defending cattle, land, or kin — one of the oldest continuous Tamil memorial forms.',
    evidence: 'Tolkappiyam describes a six-stage hero-stone protocol; surviving inscribed stones across Kongu Nadu confirm continuous practice from the Sangam era through medieval times. The practice itself is well-attested. Specific attribution of individual stones to named Kongu Vellala ancestors, however, is community-internal and rarely independently corroborated.',
    tier: 'yellow',
    sources: [
      { id: 'naadu-kal-hero-stones', label: 'Naadukal / hero stones (claim)' },
      { id: 'wikipedia-hero-stone', label: 'Wikipedia: Hero stone' },
    ],
  },
];

export default function AncestorPractices() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Responsive
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsMobile(entry.contentRect.width < 720);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  const active = HOTSPOTS.find((h) => h.id === activeId) ?? null;

  const toggle = (id: string) => setActiveId((curr) => (curr === id ? null : id));

  const transitionClass = reducedMotion ? '' : 'transition-all duration-200 ease-out';

  return (
    <div ref={wrapRef} className="w-full">
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-600">
        {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
          const m = CATEGORY_META[cat];
          return (
            <span key={cat} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
              {m.label}
              <span className="font-tamil text-stone-500">· {m.ta}</span>
            </span>
          );
        })}
      </div>

      {isMobile ? (
        // ----- Mobile: static landscape + vertical list -----
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-3">
            <LandscapeSVG hotspots={[]} activeId={null} onToggle={() => {}} compact />
            <p className="mt-2 text-center text-xs text-stone-500">
              Stylised Kongu landscape — tank, fields, palm grove, hero stone.
            </p>
          </div>

          <ul className="space-y-2">
            {HOTSPOTS.map((h) => {
              const cm = CATEGORY_META[h.category];
              const isActive = h.id === activeId;
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => toggle(h.id)}
                    aria-pressed={isActive}
                    aria-label={`Toggle factsheet for ${h.label.en}`}
                    className={`flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left ${transitionClass} ${
                      isActive ? `${cm.bg} ring-2 ${cm.ring} border-transparent` : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: cm.color }}
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-stone-900">{h.label.en}</span>
                      <span className="block font-tamil text-xs text-stone-600">{h.label.ta}</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-stone-500">{cm.label}</span>
                    <span className="text-stone-400">{isActive ? '−' : '+'}</span>
                  </button>
                  {isActive && active && active.id === h.id && (
                    <div className="mt-2">
                      <Factsheet hotspot={active} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        // ----- Desktop: landscape with hotspots, factsheet below -----
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-4">
            <LandscapeSVG
              hotspots={HOTSPOTS}
              activeId={activeId}
              onToggle={toggle}
              compact={false}
            />
            <p className="mt-2 text-center text-xs text-stone-500">
              Stylised Kongu landscape — click a numbered hotspot for the tier-tagged factsheet. Click again to close.
            </p>
          </div>

          {active ? (
            <Factsheet hotspot={active} onClose={() => setActiveId(null)} />
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-600">
              Click a hotspot above to read what Vellala actually <em>did</em> — the crops, the tools, the
              roles, and the memorial markers — with the evidence tier for each.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// Stylised landscape
// -------------------------------------------------------------------

function LandscapeSVG({
  hotspots,
  activeId,
  onToggle,
  compact,
}: {
  hotspots: Hotspot[];
  activeId: string | null;
  onToggle: (id: string) => void;
  compact: boolean;
}) {
  // viewBox 800x400.
  // The illustration is intentionally minimal — silhouettes, gradients, no photoreal detail.
  return (
    <svg
      viewBox="0 0 800 400"
      role="img"
      aria-label="Stylised Kongu landscape with paddy fields, an irrigation tank, palm trees, a kamalai well, a threshing floor, and a hero stone."
      className="h-auto w-full"
    >
      <defs>
        <linearGradient id="ap-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="ap-hills" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8a29e" />
          <stop offset="100%" stopColor="#78716c" />
        </linearGradient>
        <linearGradient id="ap-fields" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bbf7d0" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>
        <linearGradient id="ap-tank" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>
        <linearGradient id="ap-soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d6d3d1" />
          <stop offset="100%" stopColor="#a8a29e" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="800" height="240" fill="url(#ap-sky)" />

      {/* Sun */}
      <circle cx="650" cy="70" r="28" fill="#fbbf24" opacity="0.85" />
      <circle cx="650" cy="70" r="40" fill="#fbbf24" opacity="0.2" />

      {/* Distant hills */}
      <path
        d="M 0 200 L 60 160 L 130 180 L 200 140 L 270 175 L 340 150 L 430 185 L 520 145 L 600 175 L 690 155 L 800 185 L 800 240 L 0 240 Z"
        fill="url(#ap-hills)"
        opacity="0.55"
      />

      {/* Mid-ground tank (eri) — broad shallow water body */}
      <ellipse cx="400" cy="220" rx="230" ry="28" fill="url(#ap-tank)" stroke="#0284c7" strokeWidth="1" />
      {/* Tank bund (earthen embankment) */}
      <path d="M 160 225 Q 400 240 640 225 L 640 232 Q 400 248 160 232 Z" fill="url(#ap-soil)" />
      {/* Water ripples */}
      <path d="M 280 218 q 12 -3 24 0 q 12 3 24 0" stroke="#0ea5e9" strokeWidth="1" fill="none" opacity="0.6" />
      <path d="M 430 222 q 12 -3 24 0 q 12 3 24 0" stroke="#0ea5e9" strokeWidth="1" fill="none" opacity="0.6" />

      {/* Foreground paddy/field bands */}
      <rect x="0" y="240" width="800" height="160" fill="url(#ap-fields)" />
      {/* Field divisions — bunds */}
      <path d="M 0 280 L 800 280" stroke="#65a30d" strokeWidth="0.8" opacity="0.6" />
      <path d="M 0 320 L 800 320" stroke="#65a30d" strokeWidth="0.8" opacity="0.6" />
      <path d="M 0 360 L 800 360" stroke="#65a30d" strokeWidth="0.8" opacity="0.6" />
      <path d="M 180 240 L 200 400" stroke="#65a30d" strokeWidth="0.8" opacity="0.5" />
      <path d="M 380 240 L 400 400" stroke="#65a30d" strokeWidth="0.8" opacity="0.5" />
      <path d="M 580 240 L 600 400" stroke="#65a30d" strokeWidth="0.8" opacity="0.5" />

      {/* Crop rows — tiny tick marks */}
      {Array.from({ length: 30 }).map((_, i) => (
        <line
          key={`crop-${i}`}
          x1={20 + i * 26}
          y1={335}
          x2={22 + i * 26}
          y2={342}
          stroke="#166534"
          strokeWidth="0.8"
        />
      ))}

      {/* Palm trees — three on the left */}
      <PalmTree x={70} y={250} />
      <PalmTree x={95} y={260} scale={0.8} />
      <PalmTree x={50} y={265} scale={0.7} />

      {/* Palm tree right */}
      <PalmTree x={750} y={255} scale={0.9} />

      {/* Kamalai well — left mid-ground (a small circular well with a sloped ramp + bullock silhouette) */}
      <g>
        {/* Well ring */}
        <ellipse cx="130" cy="225" rx="18" ry="6" fill="#78716c" stroke="#44403c" strokeWidth="1" />
        <ellipse cx="130" cy="222" rx="14" ry="4" fill="#0c4a6e" />
        {/* Ramp going down-left */}
        <path d="M 130 225 L 60 280 L 80 285 L 130 232 Z" fill="#d6d3d1" stroke="#78716c" strokeWidth="0.6" />
        {/* Rope from well over pulley */}
        <line x1="130" y1="222" x2="80" y2="282" stroke="#1c1917" strokeWidth="0.8" />
        {/* Bullock silhouette pulling */}
        <ellipse cx="50" cy="295" rx="14" ry="6" fill="#44403c" />
        <rect x="40" y="290" width="3" height="10" fill="#44403c" />
        <rect x="55" y="290" width="3" height="10" fill="#44403c" />
        <path d="M 40 290 L 36 285 L 33 285" stroke="#44403c" strokeWidth="1.5" fill="none" />
      </g>

      {/* Threshing floor — circular raised platform centre-right */}
      <g>
        <ellipse cx="600" cy="230" rx="40" ry="10" fill="#d6d3d1" stroke="#78716c" strokeWidth="1" />
        <ellipse cx="600" cy="227" rx="36" ry="7" fill="#e7e5e4" />
        {/* Sheaves */}
        <ellipse cx="588" cy="223" rx="5" ry="3" fill="#fbbf24" />
        <ellipse cx="610" cy="223" rx="5" ry="3" fill="#fbbf24" />
      </g>

      {/* Hero stone (Naadukal) — far right */}
      <g>
        <rect x="715" y="225" width="14" height="40" fill="#57534e" stroke="#1c1917" strokeWidth="0.8" rx="2" />
        {/* Carved figure outline */}
        <circle cx="722" cy="235" r="3" fill="#a8a29e" />
        <rect x="719" y="240" width="6" height="14" fill="#a8a29e" />
        {/* Garland */}
        <ellipse cx="722" cy="225" rx="9" ry="2" fill="#fb923c" opacity="0.8" />
      </g>

      {/* Headman / Naattaanmai figure — silhouette under palm */}
      <g>
        <circle cx="250" cy="135" r="6" fill="#44403c" />
        <rect x="244" y="140" width="12" height="22" fill="#44403c" rx="2" />
        <path d="M 240 145 L 248 152 L 250 162" stroke="#44403c" strokeWidth="2" fill="none" />
        <path d="M 260 145 L 252 152 L 250 162" stroke="#44403c" strokeWidth="2" fill="none" />
        {/* Turban */}
        <path d="M 244 132 Q 250 126 256 132 L 254 134 L 246 134 Z" fill="#dc2626" />
      </g>

      {/* Pattakaarar figure — taller, with a staff */}
      <g>
        <circle cx="540" cy="125" r="6" fill="#44403c" />
        <rect x="534" y="130" width="12" height="24" fill="#44403c" rx="2" />
        <line x1="548" y1="130" x2="552" y2="160" stroke="#78350f" strokeWidth="1.5" />
        <path d="M 534 122 Q 540 116 546 122 L 544 124 L 536 124 Z" fill="#1e3a8a" />
      </g>

      {/* Sugarcane stalks — bunch */}
      <g>
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={`cane-${i}`}
            x1={355 + i * 4}
            y1={300}
            x2={358 + i * 4}
            y2={265}
            stroke="#16a34a"
            strokeWidth="1.5"
          />
        ))}
        {/* Leaves */}
        <path d="M 358 270 Q 370 260 376 270" stroke="#15803d" strokeWidth="1" fill="none" />
        <path d="M 362 270 Q 350 258 344 270" stroke="#15803d" strokeWidth="1" fill="none" />
      </g>

      {/* Cotton plant — bushy with white tufts */}
      <g>
        <ellipse cx="520" cy="295" rx="16" ry="10" fill="#4d7c0f" />
        <circle cx="514" cy="290" r="3" fill="#ffffff" stroke="#a8a29e" strokeWidth="0.5" />
        <circle cx="522" cy="288" r="3" fill="#ffffff" stroke="#a8a29e" strokeWidth="0.5" />
        <circle cx="528" cy="294" r="3" fill="#ffffff" stroke="#a8a29e" strokeWidth="0.5" />
      </g>

      {/* Millet — small spiky plant */}
      <g>
        <line x1="660" y1="295" x2="660" y2="270" stroke="#a16207" strokeWidth="1.2" />
        <line x1="664" y1="295" x2="664" y2="272" stroke="#a16207" strokeWidth="1.2" />
        <line x1="656" y1="295" x2="656" y2="272" stroke="#a16207" strokeWidth="1.2" />
        <circle cx="660" cy="267" r="3" fill="#facc15" />
        <circle cx="664" cy="269" r="2.5" fill="#facc15" />
        <circle cx="656" cy="269" r="2.5" fill="#facc15" />
      </g>

      {/* Paddy plant — small green tufts */}
      <g>
        <path d="M 200 290 q 3 -8 6 0" stroke="#15803d" strokeWidth="1" fill="none" />
        <path d="M 195 290 q 3 -7 6 0" stroke="#15803d" strokeWidth="1" fill="none" />
        <path d="M 205 290 q 3 -7 6 0" stroke="#15803d" strokeWidth="1" fill="none" />
      </g>

      {/* Hotspots */}
      {!compact && hotspots.map((h, i) => {
        const cm = CATEGORY_META[h.category];
        const isActive = h.id === activeId;
        return (
          <g
            key={h.id}
            tabIndex={0}
            role="button"
            aria-label={`${h.label.en} hotspot — ${cm.label}. Click to toggle factsheet.`}
            aria-pressed={isActive}
            style={{ cursor: 'pointer' }}
            onClick={() => onToggle(h.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle(h.id);
              }
            }}
          >
            {/* Pulse ring when active */}
            {isActive && (
              <circle cx={h.x} cy={h.y} r="18" fill={cm.color} opacity="0.18" />
            )}
            <circle
              cx={h.x}
              cy={h.y}
              r={isActive ? 13 : 11}
              fill="#ffffff"
              stroke={cm.color}
              strokeWidth={isActive ? 3 : 2}
            />
            <text
              x={h.x}
              y={h.y + 4}
              textAnchor="middle"
              fontSize="12"
              fontWeight={700}
              fill={cm.color}
            >
              {i + 1}
            </text>
            <title>{`${h.label.en} — ${h.label.ta} (${cm.label})`}</title>
          </g>
        );
      })}
    </svg>
  );
}

function PalmTree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  // Origin (x, y) is the base of the trunk.
  const s = scale;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {/* Trunk */}
      <path d="M 0 0 Q 2 -30 0 -55" stroke="#78350f" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Fronds */}
      <path d="M 0 -55 Q -15 -65 -28 -58" stroke="#15803d" strokeWidth="2" fill="none" />
      <path d="M 0 -55 Q 15 -65 28 -58" stroke="#15803d" strokeWidth="2" fill="none" />
      <path d="M 0 -55 Q -10 -75 -20 -78" stroke="#15803d" strokeWidth="2" fill="none" />
      <path d="M 0 -55 Q 10 -75 20 -78" stroke="#15803d" strokeWidth="2" fill="none" />
      <path d="M 0 -55 Q 0 -75 -4 -84" stroke="#15803d" strokeWidth="2" fill="none" />
      <path d="M 0 -55 Q 0 -75 4 -84" stroke="#15803d" strokeWidth="2" fill="none" />
    </g>
  );
}

// -------------------------------------------------------------------
// Factsheet panel
// -------------------------------------------------------------------

function Factsheet({ hotspot, onClose }: { hotspot: Hotspot; onClose?: () => void }) {
  const cm = CATEGORY_META[hotspot.category];
  const t = TIER_META[hotspot.tier];
  return (
    <article
      className={`rounded-2xl border bg-white p-5 sm:p-6 ${cm.ring} ring-2 border-transparent`}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: cm.color }}>
            {cm.label} <span className="font-tamil text-stone-500">· {cm.ta}</span>
          </p>
          <h3 className="mt-1 text-2xl font-bold text-stone-900">{hotspot.label.en}</h3>
          <p className="font-tamil text-base text-stone-600">{hotspot.label.ta}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${t.bg} ${t.fg} ${t.ring}`}
            aria-label={`Evidence tier: ${t.label}`}
          >
            <span aria-hidden="true">{t.emoji}</span>
            <span>{t.label}</span>
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close factsheet"
              className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-800">
            Tradition framing
          </p>
          <p className="mt-1.5 text-sm text-stone-800">{hotspot.tradition}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-800">
            Evidence framing
          </p>
          <p className="mt-1.5 text-sm text-stone-800">{hotspot.evidence}</p>
        </div>
      </div>

      {hotspot.sources.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">Sources</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {hotspot.sources.map((s) => (
              <li key={s.id}>
                <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs text-stone-700">
                  <span aria-hidden="true" className="text-stone-400">[src]</span>
                  {s.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
