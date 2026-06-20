// The Living Atlas — a scroll-driven descent from the subcontinent to one
// village shrine. Ported from the Claude-Design prototype (living-atlas-app /
// atlas-scene / atlas-styles) into a production React island: in-browser Babel,
// CDN React and the design-canvas Tweaks panel are gone; the four stages, their
// claims, kootams and deity arrive as props resolved from the real content
// collections by src/pages/atlas/living.astro.
//
// The oil lamp travels the Cauvery rail as you descend the four altitude bands;
// claims expand their evidence, kootams highlight on tap, and the village shrine
// lights when the lamp reaches it.

import { useState, useEffect, useRef, useCallback } from 'react';

type Tier = 'green' | 'yellow' | 'red' | 'rational';

interface Anchor {
  kind: 'claim' | 'data';
  label?: string;
  tier: Tier;
  text: string;
  evidence: string;
}
interface FeaturedKootam {
  en: string;
  ta: string;
  totem: string;
  note: string;
  isAuthor: boolean;
}
interface Deity {
  en: string;
  ta: string;
  place: string;
}
export interface AtlasStage {
  id: string;
  en: string;
  ta: string;
  sec: string;
  scale: string;
  altitude: string;
  path: string[];
  lede: string;
  exploreNode: string;
  anchors: Anchor[];
  kootams?: FeaturedKootam[];
  kootamsMore?: number;
  deity?: Deity;
}
export interface LivingAtlasProps {
  stages: AtlasStage[];
  pullQuote: string;
}

const ACCENT = '#b45309'; // amber — the lamp / accent hue
const TAMIL_SCALE = 0.72; // "balanced" Tamil prominence

const TIER_META: Record<Tier, { emoji: string; label: string; color: string; fill: string }> = {
  green: { emoji: '🟢', label: 'well-established', color: 'var(--color-tier-green)', fill: 'var(--color-tier-green-50)' },
  yellow: { emoji: '🟡', label: 'plausible / debated', color: 'var(--color-tier-yellow)', fill: 'var(--color-tier-yellow-50)' },
  red: { emoji: '🔴', label: 'myth / unverified', color: 'var(--color-tier-red)', fill: 'var(--color-tier-red-50)' },
  rational: { emoji: '⚖️', label: 'rational basis', color: 'var(--color-tier-rational)', fill: 'var(--color-tier-rational-50)' },
};

// Per-band palette: indigo plain → emerald lowland → rose uplands → sky valley.
const BANDS = [
  { light: '#eef2ff', next: '#ecfdf5', h1: '#c7d2fe', h2: '#a5b4fc', h3: '#818cf8', deep: '#4338ca', ink: '#3730a3' },
  { light: '#ecfdf5', next: '#fff1f2', h1: '#a7f3d0', h2: '#6ee7b7', h3: '#34d399', deep: '#047857', ink: '#065f46' },
  { light: '#fff1f2', next: '#f0f9ff', h1: '#fecdd3', h2: '#fda4af', h3: '#fb7185', deep: '#be123c', ink: '#9f1239' },
  { light: '#f0f9ff', next: '#fffbeb', h1: '#bae6fd', h2: '#7dd3fc', h3: '#38bdf8', deep: '#0369a1', ink: '#0c4a6e' },
];

type Band = (typeof BANDS)[number];

// ---- Illustrated scene atoms ------------------------------------------------
function Hills({ b }: { b: Band }) {
  return (
    <svg className="at2-hills" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 18 Q24 8 48 15 T100 14 L100 34 L0 34 Z" fill={b.h1} opacity="0.55" />
      <path d="M0 22 Q18 12 34 18 T66 16 T100 20 L100 34 L0 34 Z" fill={b.h2} opacity={0.85} />
      <path d="M0 28 Q22 18 44 24 T80 22 T100 26 L100 34 L0 34 Z" fill={b.h3} opacity={0.75} />
      <path d="M0 32 Q30 26 60 30 T100 30 L100 34 L0 34 Z" fill={b.deep} opacity="0.16" />
    </svg>
  );
}

// Illustrated gopuram (temple tower) — the journey's payoff. `lit` glows the lamp.
function Temple({ b, lit }: { b: Band; lit: boolean }) {
  return (
    <svg viewBox="0 0 120 124" width="100%" height="100%" aria-hidden="true" className="at2-temple">
      <defs>
        <radialGradient id="at2-lampglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--at2-accent)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--at2-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="112" rx="48" ry="7" fill={b.deep} opacity="0.12" />
      {lit && <circle cx="60" cy="96" r="26" fill="url(#at2-lampglow)" className="at2-temple-glow" />}
      <path d="M36 100 L84 100 L80 80 L40 80 Z" fill="#fde68a" stroke={b.ink} strokeWidth="1.5" />
      <path d="M42 80 L78 80 L74 62 L46 62 Z" fill="#fcd34d" stroke={b.ink} strokeWidth="1.5" />
      <path d="M48 62 L72 62 L69 46 L51 46 Z" fill="#fbbf24" stroke={b.ink} strokeWidth="1.5" />
      <g stroke={b.ink} strokeWidth="0.8" opacity="0.5">
        <line x1="44" y1="90" x2="76" y2="90" />
        <line x1="49" y1="71" x2="71" y2="71" />
      </g>
      <path d="M54 46 L66 46 L60 36 Z" fill={b.ink} />
      <circle cx="60" cy="33" r="3" fill={b.ink} />
      <g fill={b.ink}>
        <circle cx="44" cy="80" r="1.6" />
        <circle cx="76" cy="80" r="1.6" />
        <circle cx="48" cy="62" r="1.4" />
        <circle cx="72" cy="62" r="1.4" />
      </g>
      <path d="M54 100 L54 86 Q60 81 66 86 L66 100 Z" fill={b.ink} opacity="0.85" />
      <circle cx="60" cy="95" r={lit ? 3.4 : 2.4} fill="var(--at2-accent)" className={lit ? 'at2-temple-flame' : ''} />
    </svg>
  );
}

// Quail totem mark for the Kadai kootam (the author's clan).
function QuailMark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 28 24" width="22" height="19" aria-hidden="true">
      <path
        d="M5 15 Q4 9 10 8 Q14 4 20 7 Q25 9 23 14 Q22 18 16 18 L8 18 Q5 18 5 15 Z"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="10" r="1" fill={color} />
      <path d="M23 13 Q26 12 27 14" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 18 L7 21 M12 18 L11 21" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ---- Interactive claim / data card (expands its evidence) -------------------
function AnchorCard({ a }: { a: Anchor }) {
  const [open, setOpen] = useState(false);
  const t = TIER_META[a.tier];
  return (
    <div
      className={`at2-anchor${open ? ' is-open' : ''}`}
      style={{ '--tier': t.color, '--tier-fill': t.fill } as React.CSSProperties}
    >
      <button type="button" className="at2-anchor-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="at2-anchor-pin" aria-hidden="true">{t.emoji}</span>
        <span className="at2-anchor-main">
          <span className="at2-anchor-kind">{a.kind === 'data' ? a.label : 'Claim'} · {t.label}</span>
          <span className="at2-anchor-text">{a.text}</span>
        </span>
        <span className="at2-anchor-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      <div className="at2-anchor-evi" hidden={!open}>
        <span className="at2-anchor-evi-cap">Evidence</span>
        <p>{a.evidence}</p>
      </div>
    </div>
  );
}

// ---- One altitude band ------------------------------------------------------
function BandSection({
  s,
  b,
  lit,
  revealed,
  bandRef,
}: {
  s: AtlasStage;
  b: Band;
  lit: boolean;
  revealed: boolean;
  bandRef: (el: HTMLElement | null) => void;
}) {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <section
      ref={bandRef}
      id={s.id}
      className={`at2-band at2-reveal${revealed ? ' is-in' : ''}`}
      style={{
        background: `linear-gradient(${b.light}, ${b.next})`,
        '--deep': b.deep,
        '--ink': b.ink,
        '--h2': b.h2,
        '--tamil-scale': TAMIL_SCALE,
      } as React.CSSProperties}
    >
      <Hills b={b} />
      <div className="at2-band-inner">
        <div className="at2-eyebrow" style={{ color: b.ink }}>
          <span>{s.sec}</span>
          <span className="at2-scale">{s.scale}</span>
          <span className="at2-altitude">— {s.altitude}</span>
        </div>

        <h2 className="at2-title" style={{ color: b.deep }}>
          {s.en}
          <span lang="ta" className="at2-title-ta" style={{ color: b.ink }}>{s.ta}</span>
        </h2>

        <div className="at2-path">
          {s.path.map((p, k) => (
            <span key={k} className="at2-path-frag">
              <span
                className="at2-path-step"
                style={
                  k === s.path.length - 1
                    ? { background: b.deep, color: '#fff', borderColor: b.deep }
                    : { borderColor: b.h2, color: b.ink }
                }
              >
                {p}
              </span>
              {k < s.path.length - 1 && <span className="at2-path-sep" style={{ color: b.h2 }}>→</span>}
            </span>
          ))}
        </div>

        <p className="at2-lede">{s.lede}</p>

        <a className="at2-explore-link" href={`/atlas/explore?node=${s.exploreNode}`}>
          <span aria-hidden="true">◉</span>
          <span>Open {s.en} in the free Atlas</span>
          <span aria-hidden="true">→</span>
        </a>

        {s.kootams && s.kootams.length > 0 && (
          <div className="at2-kootams">
            <span className="at2-cap">The 145 kootams come into view — tap one</span>
            <div className="at2-flags">
              {s.kootams.map((k, n) => (
                <button
                  type="button"
                  key={n}
                  className={`at2-flag${sel === n ? ' is-sel' : ''}`}
                  style={{ '--deep': b.deep, '--h2': b.h2 } as React.CSSProperties}
                  onClick={() => setSel(sel === n ? null : n)}
                >
                  {k.isAuthor ? (
                    <QuailMark color={sel === n ? '#fff' : b.deep} />
                  ) : (
                    <span className="at2-flag-dot" style={{ background: sel === n ? '#fff' : b.deep }} />
                  )}
                  <span className="at2-flag-en">{k.en}</span>
                  <span lang="ta" className="at2-flag-ta">{k.ta}</span>
                </button>
              ))}
              {s.kootamsMore ? <span className="at2-flag at2-flag-more">+{s.kootamsMore} more</span> : null}
            </div>
            <div className="at2-kootam-readout" style={{ borderColor: b.h2 }}>
              {sel === null ? (
                <span className="muted">Each kootam is exogamous — a clan you must marry <em>outside</em> of.</span>
              ) : (
                <span>
                  <strong style={{ color: b.deep }}>
                    {s.kootams[sel].en} <span lang="ta">{s.kootams[sel].ta}</span>
                  </strong>{' '}
                  — totem <em>{s.kootams[sel].totem}</em>. {s.kootams[sel].note}
                </span>
              )}
            </div>
          </div>
        )}

        {s.deity && (
          <div className="at2-deity" style={{ '--deep': b.deep } as React.CSSProperties}>
            <div className="at2-deity-art">
              <Temple b={b} lit={lit} />
            </div>
            <div className="at2-deity-text">
              <span className="at2-deity-cap" style={{ color: b.ink }}>Kuladeivam · journey’s end</span>
              <span className="at2-deity-name" style={{ color: b.deep }}>
                {s.deity.en} <span lang="ta">{s.deity.ta}</span>
              </span>
              <span className="at2-deity-place">{s.deity.place}</span>
              <span className="at2-deity-hint">
                {lit ? 'The lamp has reached the shrine.' : 'Scroll on — the lamp is arriving…'}
              </span>
            </div>
          </div>
        )}

        <div className="at2-anchors">
          {s.anchors.map((a, n) => (
            <AnchorCard key={n} a={a} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- The travelling-lamp rail (Cauvery) -------------------------------------
function Rail({
  progress,
  activeIdx,
  ticks,
  stages,
  onJump,
}: {
  progress: number;
  activeIdx: number;
  ticks: (number | null)[];
  stages: AtlasStage[];
  onJump: (i: number) => void;
}) {
  const RIVER = 'M20 6 C 6 90, 34 180, 20 270 C 8 360, 32 450, 20 540 C 9 630, 31 720, 20 810 C 13 890, 24 950, 20 994';
  return (
    <aside className="at2-rail" aria-hidden="true">
      <svg className="at2-river" viewBox="0 0 40 1000" preserveAspectRatio="none">
        <path className="at2-river-bed" d={RIVER} fill="none" stroke="var(--color-rule)" strokeWidth="9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path
          className="at2-river-flow"
          pathLength="1"
          d={RIVER}
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="9"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          strokeDasharray="1"
          strokeDashoffset={1 - progress}
        />
      </svg>

      <div className="at2-ticks">
        {stages.map((s, i) => (
          <button
            type="button"
            key={s.id}
            className={`at2-tick${i === activeIdx ? ' is-active' : ''}${i < activeIdx ? ' is-past' : ''}`}
            style={{ top: `${(ticks[i] ?? (i + 0.5) / stages.length) * 100}%` }}
            onClick={() => onJump(i)}
            title={s.en}
          >
            <span className="at2-tick-dot" />
            <span className="at2-tick-label">
              <span className="at2-tick-en">{s.en}</span>
              <span lang="ta" className="at2-tick-ta">{s.ta}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="at2-lamp" style={{ top: `${6 + progress * 88}%`, color: ACCENT }}>
        <span className="at2-lamp-glow" />
        <span className="at2-lamp-icon" role="img" aria-label="oil lamp">🪔</span>
      </div>
    </aside>
  );
}

// ---- Root -------------------------------------------------------------------
export default function LivingAtlas({ stages, pullQuote }: LivingAtlasProps) {
  const [progress, setProgress] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [ticks, setTicks] = useState<(number | null)[]>([]);
  const [lit, setLit] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>(() => stages.map((_, i) => i === 0));
  const revealedRef = useRef<boolean[]>(stages.map((_, i) => i === 0));
  const bandRefs = useRef<(HTMLElement | null)[]>([]);

  const measureTicks = useCallback(() => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    if (total <= 0) return;
    setTicks(
      bandRefs.current.map((el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const centerY = window.scrollY + r.top + r.height / 2;
        return Math.min(1, Math.max(0, (centerY - window.innerHeight / 2) / total));
      }),
    );
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const p = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
        setProgress(p);
        const mid = window.scrollY + window.innerHeight / 2;
        let best = 0;
        let bestD = Infinity;
        bandRefs.current.forEach((el, i) => {
          if (!el) return;
          const r = el.getBoundingClientRect();
          const c = window.scrollY + r.top + r.height / 2;
          const d = Math.abs(c - mid);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        setActiveIdx(best);
        if (best === stages.length - 1) setLit(true);
        let changed = false;
        const next = revealedRef.current.slice();
        bandRefs.current.forEach((el, i) => {
          if (!el || next[i]) return;
          if (el.getBoundingClientRect().top < window.innerHeight * 0.82) {
            next[i] = true;
            changed = true;
          }
        });
        if (changed) {
          revealedRef.current = next;
          setRevealed(next);
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measureTicks);
    measureTicks();
    onScroll();
    const ti = window.setTimeout(measureTicks, 400);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measureTicks);
      window.clearTimeout(ti);
    };
  }, [measureTicks, stages.length]);

  const jump = (i: number) => {
    const el = bandRefs.current[i];
    if (el) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 80, behavior: 'smooth' });
  };

  // Honor a #stage hash arriving from the Atlas — bands are React-rendered, so
  // reveal the target and scroll to it on mount.
  useEffect(() => {
    const id = (location.hash || '').replace('#', '');
    if (!id) return;
    const i = stages.findIndex((s) => s.id === id);
    if (i < 0) return;
    const next = revealedRef.current.slice();
    for (let k = 0; k <= i; k++) next[k] = true;
    revealedRef.current = next;
    setRevealed(next);
    const go = () => {
      const el = bandRefs.current[i];
      if (el) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 80, behavior: 'auto' });
    };
    requestAnimationFrame(() => requestAnimationFrame(go));
    window.setTimeout(go, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tierKeys: Tier[] = ['green', 'yellow', 'red', 'rational'];

  return (
    <div className="at2-root il-rich tamil-balanced" style={{ '--at2-accent': ACCENT } as React.CSSProperties}>
      <AtlasStyles />

      <Rail progress={progress} activeIdx={activeIdx} ticks={ticks} stages={stages} onJump={jump} />

      <div className="at2-scroll has-rail">
        <header className="at2-hero">
          <span className="at2-hero-lamp" aria-hidden="true">🪔</span>
          <div className="at2-hero-kick" lang="ta">Lineage · வம்சாவளி</div>
          <h1 className="at2-hero-h1">A river from the subcontinent to one shrine</h1>
          <p className="at2-hero-sub">
            A trail from the subcontinent down to a single village temple — the literal physical narrowing of one
            identity. Geography descends on one axis, <em>identity</em> on the other; every claim along the way carries
            its evidence tier.
          </p>
          <div className="at2-hero-legend">
            {tierKeys.map((t) => (
              <span className="at2-legend-item" key={t}>
                <span aria-hidden="true">{TIER_META[t].emoji}</span>
                <b>{TIER_META[t].label}</b>
              </span>
            ))}
          </div>
          <div className="at2-hero-scrollcue">
            <span>Descend with the lamp</span>
            <span className="at2-hero-arrow" aria-hidden="true">↓</span>
          </div>
        </header>

        {stages.map((s, i) => (
          <BandSection
            key={s.id}
            s={s}
            b={BANDS[i] ?? BANDS[BANDS.length - 1]}
            lit={lit && i === stages.length - 1}
            revealed={revealed[i]}
            bandRef={(el) => {
              bandRefs.current[i] = el;
            }}
          />
        ))}

        <footer className="at2-foot">
          <div className="at2-foot-rule" />
          <blockquote className="pull-quote">{pullQuote}</blockquote>
          <p className="at2-foot-note">Boundaries are simplified for legibility, not survey-accurate.</p>
        </footer>
      </div>
    </div>
  );
}

// ---- Styles (scoped via the unique at2- prefix) -----------------------------
function AtlasStyles() {
  return (
    <style>{`
      .at2-root{ font-family:var(--font-sans); color:var(--fg-1); background:#eef2ff;
        --rail-w:128px; display:flex; align-items:flex-start; }
      .at2-root *{ box-sizing:border-box; }

      .at2-scroll{ flex:1 1 auto; min-width:0; }
      @media (max-width:880px){ .at2-root{ --rail-w:0px; } }

      /* hero */
      .at2-hero{ position:relative; text-align:center; padding:84px 32px 64px;
        background:linear-gradient(#e0e7ff,#eef2ff); }
      .at2-hero-lamp{ font-size:38px; display:inline-block;
        filter:drop-shadow(0 6px 16px color-mix(in srgb, var(--at2-accent) 55%, transparent)); }
      .at2-hero-kick{ font-family:var(--font-tamil); font-size:13px; font-weight:600; letter-spacing:.12em;
        text-transform:uppercase; color:#4338ca; margin-top:14px; }
      .at2-hero-h1{ font-family:var(--font-display); font-weight:700; font-size:clamp(34px,5vw,56px); line-height:1.02;
        letter-spacing:-.025em; color:#1e1b4b; margin:14px auto 0; max-width:17ch; }
      .at2-hero-sub{ font-size:clamp(15px,1.6vw,17px); line-height:1.65; color:#3730a3; margin:18px auto 0; max-width:54ch; }
      .at2-hero-sub em{ font-family:var(--font-display); font-style:italic; }
      .at2-hero-legend{ margin-top:26px; display:flex; flex-wrap:wrap; justify-content:center; gap:10px 20px; }
      .at2-legend-item{ display:inline-flex; align-items:center; gap:7px; font-size:13px; color:#3730a3; }
      .at2-legend-item b{ font-weight:600; }
      .at2-hero-scrollcue{ margin-top:34px; display:flex; flex-direction:column; align-items:center; gap:6px;
        font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:#6366f1; }
      .at2-hero-arrow{ font-size:20px; animation:at2bob 1.8s var(--ease-editorial,ease) infinite; }
      @keyframes at2bob{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(6px); } }

      /* band */
      .at2-band{ position:relative; padding:64px 40px 96px; overflow:hidden; }
      .at2-band-inner{ position:relative; z-index:2; max-width:620px; margin:0 auto; }
      .at2-hills{ position:absolute; left:0; right:0; bottom:0; width:100%; height:150px; z-index:0; }

      .at2-eyebrow{ display:flex; align-items:baseline; gap:12px; flex-wrap:wrap;
        font-size:11px; font-weight:700; letter-spacing:.13em; text-transform:uppercase; }
      .at2-scale{ font-family:var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
        font-size:10px; letter-spacing:0; text-transform:none; color:var(--fg-muted); }
      .at2-altitude{ font-weight:500; letter-spacing:.02em; text-transform:none; font-style:italic;
        font-family:var(--font-display); opacity:.8; }
      .at2-title{ font-family:var(--font-display); font-weight:700; font-size:clamp(40px,6vw,60px); line-height:1;
        letter-spacing:-.03em; margin:10px 0 0; }
      .at2-title-ta{ font-family:var(--font-tamil); font-weight:500; letter-spacing:0; margin-left:16px;
        font-size:calc(clamp(40px,6vw,60px) * var(--tamil-scale)); }

      .at2-path{ margin-top:18px; display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
      .at2-path-frag{ display:inline-flex; align-items:center; gap:6px; }
      .at2-path-step{ font-size:11.5px; font-weight:600; border:1.5px solid; border-radius:9999px; padding:3px 12px;
        background:rgba(255,255,255,.72); white-space:nowrap; }
      .at2-path-sep{ font-size:13px; }

      .at2-lede{ font-family:var(--font-display); font-size:clamp(17px,2vw,20px); line-height:1.5; color:var(--fg-2);
        margin:20px 0 0; max-width:46ch; }

      .at2-cap{ display:block; font-size:11px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--fg-4); }

      /* per-band "open in the Atlas" cross-link */
      .at2-explore-link{ display:inline-flex; align-items:center; gap:9px; margin:18px 0 4px; text-decoration:none;
        font-family:var(--font-display); font-style:italic; font-size:15px; color:var(--deep);
        border-bottom:1px solid transparent; padding-bottom:2px; width:fit-content; transition:border-color .16s; }
      .at2-explore-link span:first-child{ font-style:normal; font-size:13px; }
      .at2-explore-link span:last-child{ font-style:normal; transition:transform .16s cubic-bezier(.22,1,.36,1); }
      .at2-explore-link:hover{ border-bottom-color:var(--deep); }
      .at2-explore-link:hover span:last-child{ transform:translateX(3px); }

      /* kootams */
      .at2-kootams{ margin-top:28px; }
      .at2-flags{ margin-top:11px; display:flex; flex-wrap:wrap; gap:9px; }
      .at2-flag{ display:inline-flex; align-items:center; gap:8px; cursor:pointer;
        font-size:13px; color:var(--fg-2); background:#fff; border:1px solid var(--h2); border-radius:.5rem;
        padding:7px 13px; box-shadow:var(--shadow-sm); transition:transform var(--dur-fast,160ms) var(--ease-editorial,ease),
        background var(--dur-fast,160ms), color var(--dur-fast,160ms); }
      .at2-flag:hover{ transform:translateY(-1px); }
      .at2-flag.is-sel{ background:var(--deep); color:#fff; border-color:var(--deep); }
      .at2-flag.is-sel .at2-flag-ta{ color:rgba(255,255,255,.78); }
      .at2-flag-dot{ width:8px; height:8px; border-radius:9999px; }
      .at2-flag-ta{ font-family:var(--font-tamil); color:var(--fg-4); font-size:calc(13px * var(--tamil-scale,.72) + 3px); }
      .at2-flag-more{ cursor:default; color:var(--fg-4); border-style:dashed; box-shadow:none; background:rgba(255,255,255,.5); }
      .at2-flag-more:hover{ transform:none; }
      .at2-kootam-readout{ margin-top:13px; font-size:13.5px; line-height:1.55; color:var(--fg-2);
        background:rgba(255,255,255,.7); border:1px solid; border-radius:.75rem; padding:12px 15px; max-width:52ch; }
      .at2-kootam-readout .muted{ color:var(--fg-4); }
      .at2-kootam-readout em{ font-style:italic; }
      .at2-kootam-readout [lang]{ font-family:var(--font-tamil); }

      /* deity */
      .at2-deity{ margin-top:32px; display:flex; align-items:center; gap:22px; background:rgba(255,255,255,.82);
        border:1px solid color-mix(in srgb, var(--deep) 22%, transparent); border-radius:var(--radius-2xl,1.25rem);
        padding:20px 24px; box-shadow:var(--shadow-md); }
      .at2-deity-art{ flex:none; width:118px; height:122px; }
      .at2-deity-cap{ font-size:10.5px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; }
      .at2-deity-name{ display:block; font-family:var(--font-display); font-weight:700; font-size:clamp(22px,3vw,28px); margin-top:4px; }
      .at2-deity-name [lang]{ font-family:var(--font-tamil); font-weight:500; font-size:.72em; color:var(--fg-3); }
      .at2-deity-place{ display:block; font-size:12.5px; color:var(--fg-4); margin-top:4px; }
      .at2-deity-hint{ display:block; font-family:var(--font-display); font-style:italic; font-size:13px; color:var(--at2-accent); margin-top:10px; }
      .at2-temple-glow{ animation:at2pulse 2.4s ease-in-out infinite; transform-origin:center; }
      .at2-temple-flame{ animation:at2flame 1.6s ease-in-out infinite; }
      @keyframes at2pulse{ 0%,100%{ opacity:.5; } 50%{ opacity:.95; } }
      @keyframes at2flame{ 0%,100%{ r:3.2px; } 50%{ r:3.8px; } }

      /* anchors */
      .at2-anchors{ margin-top:30px; display:flex; flex-direction:column; gap:11px; max-width:560px; }
      .at2-anchor{ background:rgba(255,255,255,.85); border:1px solid var(--color-rule); border-left:3px solid var(--tier);
        border-radius:1rem; box-shadow:var(--shadow-sm); overflow:hidden; }
      .at2-anchor-head{ width:100%; display:flex; align-items:flex-start; gap:12px; text-align:left; cursor:pointer;
        background:none; border:none; padding:14px 16px; font:inherit; }
      .at2-anchor-pin{ flex:none; width:24px; height:24px; border-radius:9999px; background:var(--tier-fill);
        box-shadow:inset 0 0 0 1.5px color-mix(in srgb, var(--tier) 45%, transparent);
        display:grid; place-items:center; font-size:11px; margin-top:1px; }
      .at2-anchor-main{ flex:1; display:flex; flex-direction:column; gap:3px; }
      .at2-anchor-kind{ font-size:10.5px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--tier); }
      .at2-anchor-text{ font-size:13.5px; line-height:1.5; color:var(--fg-2); }
      .at2-anchor-caret{ flex:none; color:var(--fg-4); font-size:12px; margin-top:2px; }
      .at2-anchor-evi{ padding:0 16px 15px 52px; }
      .at2-anchor-evi[hidden]{ display:none; }
      .at2-anchor-evi-cap{ font-size:10px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--fg-4); }
      .at2-anchor-evi p{ margin:5px 0 0; font-size:13px; line-height:1.6; color:var(--fg-3); }

      /* reveal — animate TRANSFORM ONLY so content is always opacity:1 and
         visible even if the animation never advances. */
      @media (prefers-reduced-motion: no-preference){
        .at2-reveal.is-in .at2-band-inner > *{ animation:at2rise .55s var(--ease-editorial,ease) both; }
        .at2-reveal.is-in .at2-band-inner > *:nth-child(2){ animation-delay:.05s; }
        .at2-reveal.is-in .at2-band-inner > *:nth-child(3){ animation-delay:.10s; }
        .at2-reveal.is-in .at2-band-inner > *:nth-child(4){ animation-delay:.15s; }
        .at2-reveal.is-in .at2-band-inner > *:nth-child(5){ animation-delay:.20s; }
        .at2-reveal.is-in .at2-band-inner > *:nth-child(n+6){ animation-delay:.24s; }
      }
      @keyframes at2rise{ from{ transform:translateY(20px); } to{ transform:none; } }

      /* rail */
      .at2-rail{ position:sticky; top:4rem; align-self:flex-start; flex:none; width:var(--rail-w);
        height:calc(100dvh - 4rem); z-index:20;
        background:linear-gradient(#f5f7ff,#eef2ff); border-right:1px solid var(--color-rule); }
      @media (max-width:880px){ .at2-rail{ display:none; } }
      .at2-river{ position:absolute; left:50%; transform:translateX(-50%); top:0; height:100%; width:40px; }
      .at2-ticks{ position:absolute; inset:0; }
      .at2-tick{ position:absolute; left:50%; transform:translate(-50%,-50%); display:flex; align-items:center; gap:9px;
        background:none; border:none; cursor:pointer; padding:0; }
      .at2-tick-dot{ width:13px; height:13px; border-radius:9999px; background:#fff; border:2px solid #d6d3d1;
        flex:none; transition:all var(--dur-base,260ms) var(--ease-editorial,ease); box-shadow:0 1px 3px rgba(28,25,23,.12); }
      .at2-tick.is-past .at2-tick-dot{ background:#7dd3fc; border-color:#38bdf8; }
      .at2-tick.is-active .at2-tick-dot{ background:var(--at2-accent); border-color:var(--at2-accent);
        box-shadow:0 0 0 5px color-mix(in srgb, var(--at2-accent) 18%, transparent); }
      .at2-tick-label{ display:flex; flex-direction:column; line-height:1.1; opacity:.55;
        transition:opacity var(--dur-base,260ms); }
      .at2-tick.is-active .at2-tick-label{ opacity:1; }
      .at2-tick-en{ font-size:12px; font-weight:600; color:var(--fg-2); white-space:nowrap; }
      .at2-tick-ta{ font-family:var(--font-tamil); font-size:10px; color:var(--fg-4); white-space:nowrap; }

      .at2-lamp{ position:absolute; left:50%; transform:translate(-50%,-50%); z-index:5; will-change:top; }
      .at2-lamp-icon{ position:relative; font-size:26px; display:block;
        filter:drop-shadow(0 3px 8px color-mix(in srgb, currentColor 60%, transparent)); }
      .at2-lamp-glow{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:46px; height:46px;
        border-radius:9999px; background:radial-gradient(circle, color-mix(in srgb, currentColor 38%, transparent), transparent 70%);
        animation:at2pulse 2.4s ease-in-out infinite; }

      /* footer */
      .at2-foot{ text-align:center; padding:64px 40px 88px; background:linear-gradient(#fffbeb,#fef3c7); }
      .at2-foot-rule{ width:46px; height:2px; background:var(--at2-accent); margin:0 auto 22px; }
      .at2-foot .pull-quote{ max-width:32ch; margin:0 auto; border:none; padding:0;
        font-family:var(--font-display); font-style:italic; font-size:clamp(20px,2.6vw,26px); line-height:1.38; color:#7c2d12; }
      .at2-foot-note{ font-size:12.5px; color:#a16207; margin-top:22px; font-style:italic; }
    `}</style>
  );
}
