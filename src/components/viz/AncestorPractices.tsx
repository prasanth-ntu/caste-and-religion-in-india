import { useCallback, useEffect, useState } from 'react';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { useInView } from '../../hooks/useInView';
import { FG } from '../../lib/chart-tokens';

/**
 * AncestorPractices — V8 (Enhanced Visuals)
 *
 * A toggleable panel over a beautiful, AI-generated stylised Kongu landscape. 
 * Each hotspot reveals a tier-tagged factsheet describing a concrete material practice: 
 * a crop, a tool, a role, or a memorial form.
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
  // Coordinates on the 1000x1000 landscape viewBox (matching public/images/kongu_landscape.png)
  x: number;
  y: number;
  label: { en: string; ta: string };
  tradition: string;
  evidence: string;
  tier: Tier;
  sources: { id: string; label: string }[];
}

const CATEGORY_META: Record<Category, { label: string; ta: string; color: string; ring: string; bg: string }> = {
  crop:     { label: 'Crops',       ta: 'பயிர்கள்',   color: '#16a34a', ring: 'ring-emerald-300', bg: 'bg-emerald-50' },
  tool:     { label: 'Tools',       ta: 'கருவிகள்',  color: '#0284c7', ring: 'ring-sky-300',     bg: 'bg-sky-50' },
  role:     { label: 'Roles',       ta: 'பதவிகள்',   color: '#d97706', ring: 'ring-amber-300',   bg: 'bg-amber-50' },
  memorial: { label: 'Memorials',   ta: 'நினைவுச்சின்னம்', color: '#e11d48', ring: 'ring-rose-300', bg: 'bg-rose-50' },
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
    x: 150, y: 850,
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
    x: 630, y: 800,
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
    x: 410, y: 820,
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
    x: 800, y: 880,
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
    x: 350, y: 560,
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
    x: 400, y: 470,
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
    x: 680, y: 570,
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
    x: 180, y: 400,
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
    x: 710, y: 420,
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
    x: 890, y: 550,
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

const pulseStyles = `
@keyframes ping-slow {
  0% { transform: scale(1); opacity: 0.85; }
  70% { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
}
.animate-ping-slow {
  animation: ping-slow 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
}
`;

export default function AncestorPractices({ id }: { id?: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Shared sizing foundation (site-canonical 640 mobile breakpoint).
  const { ref: dimRef, isMobile, measured } = useChartDimensions({ breakpoint: 640 });
  const [inViewRef] = useInView<HTMLDivElement>();

  // Merge the dimensions ref + in-view ref onto the same measured container.
  const setContainer = useCallback(
    (node: HTMLDivElement | null) => {
      dimRef.current = node;
      inViewRef.current = node;
    },
    [dimRef, inViewRef],
  );

  // Hydration sentinel — flips the page's ChartSkeleton off as soon as the
  // container is measured, instead of waiting the full safety timeout.
  useEffect(() => {
    if (measured) dimRef.current?.setAttribute('data-hydrated', 'true');
  }, [measured, dimRef]);

  const active = HOTSPOTS.find((h) => h.id === activeId) ?? null;

  const toggle = (id: string) => setActiveId((curr) => (curr === id ? null : id));

  // Always apply the transition class — the global `prefers-reduced-motion` rule
  // in global.css neutralizes durations, so this stays hydration-safe (no
  // server/client markup divergence from a synchronous media query at render).
  const transitionClass = 'transition-all duration-300 ease-out';

  return (
    <div ref={setContainer} id={id} className="w-full">
      <style dangerouslySetInnerHTML={{ __html: pulseStyles }} />

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-stone-600 bg-stone-50 border border-stone-200 rounded-xl p-3 shadow-sm">
        {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
          const m = CATEGORY_META[cat];
          return (
            <span key={cat} className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full shadow-sm" style={{ background: m.color }} />
              <span className="text-stone-800">{m.label}</span>
              <span className="font-tamil text-stone-400 font-normal">· {m.ta}</span>
            </span>
          );
        })}
      </div>

      {isMobile ? (
        // ----- Mobile: static landscape + vertical list -----
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 shadow-md">
            <LandscapeSVG hotspots={[]} activeId={null} onToggle={() => {}} compact />
            <p className="mt-2 text-center text-xs text-stone-500 font-medium">
              Grounded Kongu Landscape — tank, paddy, cotton, sugarcane, wells, and hero stones.
            </p>
          </div>

          <ul className="space-y-2.5">
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
                    className={`flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-sm ${transitionClass} ${
                      isActive ? `${cm.bg} ring-2 ${cm.ring} border-transparent` : 'border-stone-200 hover:border-stone-300 hover:shadow-md'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-3 w-3 shrink-0 rounded-full shadow-sm"
                      style={{ background: cm.color }}
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-stone-900">{h.label.en}</span>
                      <span className="block font-tamil text-xs text-stone-600 font-normal">{h.label.ta}</span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 bg-stone-100 rounded-md px-1.5 py-0.5">{cm.label}</span>
                    <span className="text-stone-400 text-lg">{isActive ? '−' : '+'}</span>
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
        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 shadow-lg">
            <LandscapeSVG
              hotspots={HOTSPOTS}
              activeId={activeId}
              onToggle={toggle}
              compact={false}
            />
            <p className="mt-3 text-center text-xs font-medium text-stone-500">
              Interactive Kongu Landscape — click any numbered hotspot to reveal the historical factsheet. Click again to close.
            </p>
          </div>

          {active ? (
            <div className="animate-fade-in">
              <Factsheet hotspot={active} onClose={() => setActiveId(null)} />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-8 text-center text-sm text-stone-500 shadow-inner">
              <svg className="mx-auto h-8 w-8 text-stone-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              Click a hotspot on the graphic above to explore Vellala ancestor material practices — the crops they cultivated, hydraulic engineering, local governance roles, and hero stone memorials, complete with evidence-based audits.
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
  return (
    <div className="relative w-full aspect-square overflow-hidden rounded-xl border border-stone-200/60 shadow-md">
      {/* Premium AI illustration background */}
      <img
        src="/images/kongu_landscape.png"
        alt="Beautiful modern digital vector illustration of the Kongu landscape."
        className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
      />
      
      {/* SVG Hotspot Overlay Layer */}
      {!compact && (
        <svg
          viewBox="0 0 1000 1000"
          className="absolute inset-0 h-full w-full select-none"
        >
          {hotspots.map((h, i) => {
            const cm = CATEGORY_META[h.category];
            const isActive = h.id === activeId;
            return (
              <g
                key={h.id}
                role="button"
                aria-label={`${h.label.en} hotspot — ${cm.label}. Click to toggle details.`}
                aria-pressed={isActive}
                style={{ cursor: 'pointer' }}
                onClick={() => onToggle(h.id)}
                className="group"
              >
                {/* Active pulse aura */}
                {isActive && (
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r="40"
                    fill={cm.color}
                    className="animate-ping-slow"
                    style={{ transformOrigin: `${h.x}px ${h.y}px` }}
                  />
                )}
                
                {/* Hover glow ring */}
                <circle
                  cx={h.x}
                  cy={h.y}
                  r="30"
                  fill="white"
                  opacity={isActive ? "0.35" : "0.0"}
                  className="group-hover:opacity-25 transition-all duration-300"
                />

                {/* Hotspot body */}
                <circle
                  cx={h.x}
                  cy={h.y}
                  r={isActive ? "23" : "19"}
                  fill="white"
                  stroke={cm.color}
                  strokeWidth={isActive ? "5" : "3.5"}
                  className="transition-all duration-300 group-hover:scale-110 shadow-md filter drop-shadow-md"
                  style={{ transformOrigin: `${h.x}px ${h.y}px` }}
                />
                
                {/* Hotspot number text */}
                <text
                  x={h.x}
                  y={h.y + 7.5}
                  textAnchor="middle"
                  fontSize={isActive ? "20" : "17"}
                  fontWeight={800}
                  fill={cm.color}
                  className="font-sans transition-all duration-300 pointer-events-none"
                >
                  {i + 1}
                </text>

                {/* Styled tooltip banner above/below the hotspot */}
                <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <rect
                    x={h.x - 90}
                    y={h.y - 62}
                    width="180"
                    height="32"
                    rx="6"
                    fill={FG[1]}
                    opacity="0.9"
                  />
                  <polygon
                    points={`${h.x - 6},${h.y - 30} ${h.x + 6},${h.y - 30} ${h.x},${h.y - 24}`}
                    fill={FG[1]}
                    opacity="0.9"
                  />
                  <text
                    x={h.x}
                    y={h.y - 41}
                    textAnchor="middle"
                    fill="white"
                    fontSize="13"
                    fontWeight="700"
                    className="font-sans"
                  >
                    {h.label.en}
                  </text>
                </g>
                <title>{`${h.label.en} — ${h.label.ta} (${cm.label})`}</title>
              </g>
            );
          })}
        </svg>
      )}
    </div>
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
      className={`rounded-2xl border bg-white/95 backdrop-blur-md p-6 shadow-xl ring-2 ${cm.ring} border-transparent transition-all duration-300 animate-slide-up`}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: cm.color }}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: cm.color }} />
            {cm.label} <span className="font-tamil text-stone-400 font-normal">· {cm.ta}</span>
          </p>
          <h3 className="mt-1.5 text-2xl font-extrabold text-stone-900 tracking-tight">{hotspot.label.en}</h3>
          <p className="font-tamil text-lg text-stone-500 font-medium">{hotspot.label.ta}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${t.bg} ${t.fg} ${t.ring} shadow-sm`}
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
              className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800 flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Tradition framing
          </p>
          <p className="mt-2.5 text-sm text-stone-700 leading-relaxed font-medium">{hotspot.tradition}</p>
        </div>
        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Evidence framing
          </p>
          <p className="mt-2.5 text-sm text-stone-700 leading-relaxed font-medium">{hotspot.evidence}</p>
        </div>
      </div>

      {hotspot.sources.length > 0 && (
        <div className="mt-5 pt-4 border-t border-stone-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Sources & Inscriptions</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {hotspot.sources.map((s) => (
              <li key={s.id}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600 shadow-sm">
                  <span aria-hidden="true" className="text-stone-400 font-bold">[src]</span>
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
