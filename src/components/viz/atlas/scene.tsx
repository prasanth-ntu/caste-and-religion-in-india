// Shared illustrated scene atoms for The Atlas — the paper-cut hills, the
// gopuram (temple tower) payoff, and the quail totem mark. Ported from the
// design prototype's atlas-scene.jsx. Each honours an `intensity` so the
// illustration dials up/down. (The Living Atlas keeps its own inline copies.)

import { useId } from 'react';

export type Intensity = 'flat' | 'textured' | 'rich';
export interface SceneBand {
  light: string;
  h1?: string;
  h2: string;
  h3: string;
  deep: string;
  ink: string;
}

export function Hills({ b, intensity = 'rich' }: { b: SceneBand; intensity?: Intensity }) {
  return (
    <svg viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true" style={{ width: '100%', height: '100%', display: 'block' }}>
      {intensity === 'rich' && b.h1 && (
        <path d="M0 18 Q24 8 48 15 T100 14 L100 34 L0 34 Z" fill={b.h1} opacity="0.55" />
      )}
      <path d="M0 22 Q18 12 34 18 T66 16 T100 20 L100 34 L0 34 Z" fill={b.h2} opacity={intensity === 'flat' ? 0.6 : 0.85} />
      <path d="M0 28 Q22 18 44 24 T80 22 T100 26 L100 34 L0 34 Z" fill={b.h3} opacity={intensity === 'flat' ? 0.5 : 0.75} />
      {intensity !== 'flat' && (
        <path d="M0 32 Q30 26 60 30 T100 30 L100 34 L0 34 Z" fill={b.deep} opacity="0.16" />
      )}
    </svg>
  );
}

export function Temple({ b, intensity = 'rich', lit }: { b: SceneBand; intensity?: Intensity; lit: boolean }) {
  const gid = useId();
  return (
    <svg viewBox="0 0 120 124" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ex-accent, #b45309)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--ex-accent, #b45309)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="112" rx="48" ry="7" fill={b.deep} opacity="0.12" />
      {lit && <circle cx="60" cy="96" r="26" fill={`url(#${gid})`} className="ex-temple-glow" />}
      <path d="M36 100 L84 100 L80 80 L40 80 Z" fill="#fde68a" stroke={b.ink} strokeWidth="1.5" />
      <path d="M42 80 L78 80 L74 62 L46 62 Z" fill="#fcd34d" stroke={b.ink} strokeWidth="1.5" />
      <path d="M48 62 L72 62 L69 46 L51 46 Z" fill="#fbbf24" stroke={b.ink} strokeWidth="1.5" />
      {intensity !== 'flat' && (
        <g stroke={b.ink} strokeWidth="0.8" opacity="0.5">
          <line x1="44" y1="90" x2="76" y2="90" />
          <line x1="49" y1="71" x2="71" y2="71" />
        </g>
      )}
      <path d="M54 46 L66 46 L60 36 Z" fill={b.ink} />
      <circle cx="60" cy="33" r="3" fill={b.ink} />
      {intensity === 'rich' && (
        <g fill={b.ink}>
          <circle cx="44" cy="80" r="1.6" />
          <circle cx="76" cy="80" r="1.6" />
          <circle cx="48" cy="62" r="1.4" />
          <circle cx="72" cy="62" r="1.4" />
        </g>
      )}
      <path d="M54 100 L54 86 Q60 81 66 86 L66 100 Z" fill={b.ink} opacity="0.85" />
      <circle cx="60" cy="95" r={lit ? 3.4 : 2.4} fill="var(--ex-accent, #b45309)" className={lit ? 'ex-temple-flame' : ''} />
    </svg>
  );
}

export function QuailMark({ color }: { color: string }) {
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
