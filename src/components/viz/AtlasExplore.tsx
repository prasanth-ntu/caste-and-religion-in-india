// The Atlas (Explore) — one live descent, presented two ways (Warm editorial
// column · cinematic Observatory) in two themes (light · dark), guided by the oil
// lamp or the quail mascot. The descent state (focused node, depth, collapsed
// branches) is lifted here and shared across every layout/theme swap; your place
// persists to the URL (?node=). Ported from atlas-explore-app.jsx — the design
// Tweaks panel becomes a compact on-canvas control strip.

import { useState, useEffect, useRef } from 'react';
import DirectionWarm, { type ShellProps } from './atlas/DirectionWarm';
import DirectionObservatory from './atlas/DirectionObservatory';
import { EX_PARTS_CSS } from './atlas/parts';
import { quailMood } from './atlas/MascotQuail';
import { BYID, stageForNode, type ResolvedStage, type StageId } from '../../data/atlas-explore';

type Layout = 'warm' | 'observatory';
type Theme = 'light' | 'dark';
type Guide = 'lamp' | 'quail';

const ACCENT_DARK: Record<string, string> = { '#b45309': '#fbbf24', '#4338ca': '#818cf8', '#be123c': '#fb7185', '#047857': '#34d399' };
const BASE_ACCENT = '#b45309';

export interface AtlasExploreProps {
  stages: ResolvedStage[];
}

export default function AtlasExplore({ stages }: AtlasExploreProps) {
  const stagesById = Object.fromEntries(stages.map((s) => [s.id, s])) as Record<StageId, ResolvedStage>;

  const [focus, setFocus] = useState('kongu-vellala');
  const [maxDepth, setMaxDepth] = useState(4);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<Layout>('warm');
  const [theme, setTheme] = useState<Theme>('light');
  const [guide, setGuide] = useState<Guide>('quail');
  const [toast, setToast] = useState(false);

  const stage = stageForNode(focus);
  const dark = theme === 'dark';
  const accent = dark ? ACCENT_DARK[BASE_ACCENT] : BASE_ACCENT;

  // Honor an arriving ?node= once on mount (kept off the initial render to avoid
  // a hydration mismatch).
  useEffect(() => {
    const node = new URLSearchParams(location.search).get('node');
    if (node && BYID[node]) setFocus(node);
  }, []);

  // Keep place in the URL.
  useEffect(() => {
    try {
      const u = new URL(location.href);
      u.searchParams.set('node', focus);
      history.replaceState(null, '', u.pathname + u.search);
    } catch {
      /* noop */
    }
  }, [focus]);

  // Quail mood controller: flutter between stages, scurry between siblings, wink
  // on click, nod off when idle, perch on arrival.
  const prevFocus = useRef(focus);
  const prevStage = useRef(stage);
  const sleepT = useRef<number | null>(null);
  const restT = useRef<number | null>(null);
  const armSleep = () => {
    if (sleepT.current) clearTimeout(sleepT.current);
    sleepT.current = window.setTimeout(() => quailMood('sleep'), 13000);
  };
  useEffect(() => {
    if (guide !== 'quail') return;
    if (focus !== prevFocus.current) {
      const ns = stageForNode(focus);
      quailMood(ns !== prevStage.current ? 'fly' : 'run');
      if (restT.current) clearTimeout(restT.current);
      const rest = ns === 'konur' ? 'perch' : 'idle';
      restT.current = window.setTimeout(() => quailMood(rest), 820);
      prevFocus.current = focus;
      prevStage.current = ns;
      if (ns !== 'konur') armSleep();
      else if (sleepT.current) clearTimeout(sleepT.current);
    }
  }, [focus, guide]);
  useEffect(() => {
    if (guide !== 'quail') return undefined;
    const wink = () => {
      quailMood('wink');
      if (restT.current) clearTimeout(restT.current);
      restT.current = window.setTimeout(() => quailMood(stageForNode(focus) === 'konur' ? 'perch' : 'idle'), 560);
      if (stageForNode(focus) !== 'konur') armSleep();
    };
    const wake = () => {
      if (stageForNode(focus) !== 'konur') armSleep();
    };
    window.addEventListener('pointerdown', wink);
    window.addEventListener('pointermove', wake, { passive: true });
    window.addEventListener('wheel', wake, { passive: true });
    if (stageForNode(focus) !== 'konur') armSleep();
    return () => {
      window.removeEventListener('pointerdown', wink);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('wheel', wake);
      if (sleepT.current) clearTimeout(sleepT.current);
      if (restT.current) clearTimeout(restT.current);
    };
  }, [guide, focus]);

  const onToggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const share = () => {
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(location.href);
    } catch {
      /* noop */
    }
    setToast(true);
    window.setTimeout(() => setToast(false), 1600);
  };

  const shared: ShellProps = {
    focus,
    setFocus,
    maxDepth,
    setMaxDepth,
    collapsed,
    onToggleCollapse,
    theme,
    guide,
    accent,
    illustration: 'rich',
    onShare: share,
    stagesById,
  };

  const Dir = layout === 'observatory' ? DirectionObservatory : DirectionWarm;

  return (
    <div className="ar-root">
      <style>{EX_PARTS_CSS}</style>
      <Dir key={layout} {...shared} />

      {/* compact on-canvas controls (replaces the design Tweaks panel) */}
      <div className={`ar-ctrl ar-ctrl-${dark ? 'dark' : 'light'}`} aria-label="Display settings">
        <Seg label="Layout" value={layout} onChange={(v) => setLayout(v as Layout)} opts={[['warm', 'Warm'], ['observatory', 'Observatory']]} />
        <Seg label="Theme" value={theme} onChange={(v) => setTheme(v as Theme)} opts={[['light', 'Light'], ['dark', 'Dark']]} />
        <Seg label="Guide" value={guide} onChange={(v) => setGuide(v as Guide)} opts={[['lamp', '🪔 Lamp'], ['quail', '🐦 Quail']]} />
      </div>

      {toast && <div className="ar-toast">Link copied — your place travels with it.</div>}

      <style>{`
        .ar-root{ position:relative; height:100%; width:100%; overflow:hidden; }
        .ar-root > .exA-cq, .ar-root > .exC-cq{ height:100%; }
        .ar-ctrl{ position:absolute; left:16px; bottom:16px; z-index:50; display:flex; flex-wrap:wrap; gap:10px;
          padding:9px 12px; border-radius:13px; box-shadow:0 10px 30px rgba(0,0,0,.18); backdrop-filter:blur(8px); }
        .ar-ctrl-light{ background:rgba(253,252,249,.9); border:1px solid #e7e5e4; }
        .ar-ctrl-dark{ background:rgba(13,20,38,.86); border:1px solid #283449; }
        .ar-seg{ display:flex; flex-direction:column; gap:3px; }
        .ar-seg-lab{ font-size:8.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; }
        .ar-ctrl-light .ar-seg-lab{ color:#78716c; }
        .ar-ctrl-dark .ar-seg-lab{ color:#94a3b8; }
        .ar-seg-btns{ display:inline-flex; gap:2px; border-radius:7px; padding:2px; }
        .ar-ctrl-light .ar-seg-btns{ background:#f5f1e8; border:1px solid #e7e5e4; }
        .ar-ctrl-dark .ar-seg-btns{ background:#131a2e; border:1px solid #283449; }
        .ar-seg-btns button{ font:inherit; font-size:11px; font-weight:600; border:none; background:none; cursor:pointer;
          padding:4px 9px; border-radius:5px; white-space:nowrap; }
        .ar-ctrl-light .ar-seg-btns button{ color:#78716c; }
        .ar-ctrl-dark .ar-seg-btns button{ color:#94a3b8; }
        .ar-ctrl-light .ar-seg-btns button.on{ background:#b45309; color:#fff; }
        .ar-ctrl-dark .ar-seg-btns button.on{ background:#fbbf24; color:#1c1917; }
        .ar-toast{ position:absolute; left:50%; bottom:26px; transform:translateX(-50%); z-index:60;
          background:#1c1917; color:#fafaf9; font:600 12.5px/1 var(--font-sans), sans-serif;
          padding:11px 18px; border-radius:9999px; box-shadow:0 12px 34px rgba(0,0,0,.3);
          animation: ar-toast-in .26s var(--ease-editorial, ease) both; }
        @keyframes ar-toast-in{ from{ opacity:0; transform:translate(-50%,8px); } to{ opacity:1; transform:translate(-50%,0); } }
        @media (max-width: 720px){ .ar-ctrl{ left:8px; right:8px; bottom:8px; justify-content:center; } }
      `}</style>
    </div>
  );
}

function Seg({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: Array<[string, string]> }) {
  return (
    <div className="ar-seg">
      <span className="ar-seg-lab">{label}</span>
      <div className="ar-seg-btns" role="group" aria-label={label}>
        {opts.map(([v, lab]) => (
          <button key={v} type="button" className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onChange(v)}>
            {lab}
          </button>
        ))}
      </div>
    </div>
  );
}
