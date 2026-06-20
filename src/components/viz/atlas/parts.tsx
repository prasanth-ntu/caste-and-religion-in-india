// Shared narrative parts for the two Explore shells. Each reads a small set of
// --ex-* CSS vars (set by the shell) so the same component renders warm
// (cream/ink) or dark (slate) without forking. Ported from explore-parts.jsx,
// with window.* globals replaced by imports + props.

import { useState } from 'react';
import { Temple, QuailMark } from './scene';
import MascotQuail from './MascotQuail';
import {
  ALL,
  BYID,
  RAIL,
  ARRIVAL,
  LVLAB,
  EX_LV_DOT,
  metaForNode,
  stageForNode,
  type StageId,
  type Anchor,
  type ResolvedStage,
} from '../../../data/atlas-explore';

type Guide = 'lamp' | 'quail';
type ThemeName = 'warm' | 'dark';

const TIER_META: Record<Anchor['tier'], { emoji: string; label: string; color: string; fill: string }> = {
  green: { emoji: '🟢', label: 'well-established', color: 'var(--color-tier-green)', fill: 'var(--color-tier-green-50)' },
  yellow: { emoji: '🟡', label: 'plausible / debated', color: 'var(--color-tier-yellow)', fill: 'var(--color-tier-yellow-50)' },
  red: { emoji: '🔴', label: 'myth / unverified', color: 'var(--color-tier-red)', fill: 'var(--color-tier-red-50)' },
  rational: { emoji: '⚖️', label: 'rational basis', color: 'var(--color-tier-rational)', fill: 'var(--color-tier-rational-50)' },
};

// ---- arrival narration ------------------------------------------------------
export function EXArrival({ stage, lamp = true }: { stage: StageId; lamp?: boolean }) {
  const a = ARRIVAL[stage] || ARRIVAL.india;
  return (
    <div className="ex-arr ex-anim" key={stage}>
      {lamp && <span className="ex-arr-lamp" aria-hidden="true">🪔</span>}
      <div>
        <div className="ex-arr-where">{a.where}</div>
        <p className="ex-arr-line">{a.line}</p>
      </div>
    </div>
  );
}

// ---- evidence-tier anchor card ----------------------------------------------
export function EXAnchor({ a }: { a: Anchor }) {
  const [open, setOpen] = useState(false);
  const t = TIER_META[a.tier];
  return (
    <div className="ex-anchor" style={{ '--tier': t.color, '--tier-fill': t.fill } as React.CSSProperties}>
      <button type="button" className="ex-anchor-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="ex-anchor-pin" aria-hidden="true">{t.emoji}</span>
        <span className="ex-anchor-main">
          <span className="ex-anchor-kind">{a.kind === 'data' ? a.label : 'Claim'} · {t.label}</span>
          <span className="ex-anchor-text">{a.text}</span>
        </span>
        <span className="ex-anchor-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      <div className="ex-anchor-evi" hidden={!open}>
        <span className="cap">Evidence</span>
        <p>{a.evidence}</p>
      </div>
    </div>
  );
}

// ---- kootam totem-flag layer (surfaces at Kongu) ----------------------------
export function EXKootamFlags({ focus, onPick, kongu }: { focus: string; onPick: (id: string) => void; kongu?: ResolvedStage }) {
  const koot = kongu?.kootams ?? [];
  const more = kongu?.kootamsMore ?? 0;
  return (
    <div>
      <span className="ex-koot-cap">The 145 kootams come into view — tap one</span>
      <div className="ex-flags">
        {koot.map((k) => {
          const inTree = !!BYID[k.slug];
          const on = focus === k.slug;
          const clickable = k.isAuthor || inTree;
          return (
            <button
              type="button"
              key={k.slug}
              className={`ex-flag${on ? ' on' : ''}`}
              style={clickable ? undefined : { cursor: 'default' }}
              onClick={() => clickable && onPick(k.isAuthor ? 'kadai' : k.slug)}
              title={`${k.en} — totem ${k.totem}`}
            >
              {k.isAuthor ? <QuailMark color={on ? '#fff' : 'var(--ex-accent)'} /> : <span className="ex-flag-dot" />}
              <span>{k.en}</span>
              <span lang="ta" className="ta">{k.ta}</span>
            </button>
          );
        })}
        {more > 0 && <span className="ex-flag more">+{more} more</span>}
      </div>
    </div>
  );
}

// ---- non-Kadai kootam payoff (honest "pending records" shrine) --------------
export function EXKootamDeity({ focus }: { focus: string }) {
  const node = BYID[focus];
  if (!node || node.level !== 'kootam' || focus === 'kadai') return null;
  const meta = metaForNode(focus);
  const t = TIER_META[meta.tier] || TIER_META.yellow;
  const b = { deep: '#9a8866', ink: '#57534e', light: '#f5f5f4', h2: '#d6d3d1', h3: '#bcae93' };
  return (
    <div className="ex-deity ex-deity-pending">
      <div className="ex-deity-art"><Temple b={b} intensity="textured" lit={false} /></div>
      <div>
        <span className="ex-deity-cap">Kuladeivam · {node.name} {node.ta && <span lang="ta" className="ta">{node.ta}</span>}</span>
        <span className="ex-deity-name ex-pending-name">Pending records <span aria-hidden="true">{t.emoji}</span></span>
        <span className="ex-deity-place">{meta.summary}</span>
        <span className="ex-deity-hint ex-pending-hint">No documented shrine for this kootam — the descent ends at Kongu.</span>
      </div>
    </div>
  );
}

// ---- gopuram / deity payoff (lands at Konur) --------------------------------
export function EXDeity({ deity, lit = true, guide = 'lamp' }: { deity?: { en: string; ta: string; place: string }; lit?: boolean; guide?: Guide }) {
  if (!deity) return null;
  const b = { deep: '#b45309', ink: '#7c2d12', light: '#fff7ed', h2: '#f4b76a', h3: '#e09040' };
  return (
    <div className="ex-deity">
      <div className="ex-deity-art">
        <Temple b={b} intensity="rich" lit={lit} />
        {guide === 'quail' && lit && <span className="ex-deity-perch"><MascotQuail size={28} /></span>}
      </div>
      <div>
        <span className="ex-deity-cap">Kuladeivam · journey’s end</span>
        <span className="ex-deity-name">{deity.en} {deity.ta && <span lang="ta" className="ta">{deity.ta}</span>}</span>
        <span className="ex-deity-place">{deity.place}</span>
        <span className="ex-deity-hint">
          {lit ? (guide === 'quail' ? 'The quail has settled at the shrine.' : 'The lamp has reached the shrine.') : 'Descend further — the lamp is arriving…'}
        </span>
      </div>
    </div>
  );
}

// ---- view switch (Explore ↔ Story) + contextual story deep-link ------------
export function EXViewSwitch({ current = 'explore', stage = 'kongu' }: { current?: 'explore' | 'story'; stage?: StageId }) {
  return (
    <div className="ex-vswitch" role="group" aria-label="View">
      <a className={`ex-vswitch-b${current === 'story' ? ' on' : ''}`} href={`/atlas/living#${stage}`}>Story</a>
      <a className={`ex-vswitch-b${current === 'explore' ? ' on' : ''}`} href="/atlas/explore">Explore</a>
    </div>
  );
}

export function EXStoryLink({ stage = 'kongu', label = 'Read this stretch as a story' }: { stage?: StageId; label?: string }) {
  return (
    <a className="ex-storylink" href={`/atlas/living#${stage}`}>
      <span className="ex-storylink-lamp" aria-hidden="true">🪔</span>
      <span>{label}</span>
      <span className="ex-storylink-arr" aria-hidden="true">→</span>
    </a>
  );
}

// ---- Cauvery river-lamp rail (vertical, desktop) ----------------------------
const EX_RIVER_D = 'M17 4 C 5 80, 29 150, 17 226 C 7 300, 27 372, 17 448 C 8 520, 26 596, 17 668 C 11 740, 22 790, 17 830';
export function EXRiverRail({ stageIdx, onJump, guide = 'lamp' }: { stageIdx: number; onJump: (i: number) => void; guide?: Guide }) {
  const progress = stageIdx / (RAIL.length - 1);
  return (
    <div className="ex-rail">
      <svg className="ex-rail-river" viewBox="0 0 34 834" preserveAspectRatio="none">
        <path d={EX_RIVER_D} fill="none" stroke="var(--ex-rule)" strokeWidth="8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={EX_RIVER_D} fill="none" stroke="#7dd3fc" strokeWidth="8" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} style={{ transition: 'stroke-dashoffset .5s var(--ease-editorial)' }} />
      </svg>
      {RAIL.map((r, i) => (
        <button type="button" key={r.id} className={`ex-tick${i === stageIdx ? ' on' : ''}${i < stageIdx ? ' past' : ''}`} style={{ top: `${6 + (i / (RAIL.length - 1)) * 88}%` }} onClick={() => onJump(i)} title={r.en}>
          <span className="ex-tick-dot" />
          <span className="ex-tick-lab"><span className="ex-tick-en">{r.en}</span><span lang="ta" className="ex-tick-ta">{r.ta}</span></span>
        </button>
      ))}
      <div className="ex-lamp" style={{ top: `${6 + progress * 88}%` }}>
        {guide !== 'quail' && <span className="ex-lamp-glow" />}
        <span className="ex-guide" key={stageIdx}>
          {guide === 'quail' ? <MascotQuail size={31} /> : <span className="ex-lamp-icon" role="img" aria-label="oil lamp">🪔</span>}
        </span>
      </div>
    </div>
  );
}

// ---- mobile top rail (horizontal) -------------------------------------------
export function EXTopRail({ stageIdx, onJump, guide = 'lamp', theme = 'warm' }: { stageIdx: number; onJump: (i: number) => void; guide?: Guide; theme?: ThemeName }) {
  const progress = stageIdx / (RAIL.length - 1);
  return (
    <div className={`ex-trail ex-trail-${theme}`}>
      <div className="ex-trail-line"><div className="ex-trail-fill" style={{ width: `${progress * 100}%` }} /></div>
      <div className="ex-trail-ticks">
        {RAIL.map((r, i) => (
          <button type="button" key={r.id} className={`ex-trail-tick${i === stageIdx ? ' on' : ''}${i < stageIdx ? ' past' : ''}`} onClick={() => onJump(i)} title={r.en}>
            <span className="ex-trail-dot" />
            <span className="ex-trail-en">{r.en}</span>
          </button>
        ))}
        <div className="ex-trail-guide" key={stageIdx} style={{ left: `${progress * 100}%` }}>
          {guide === 'quail' ? <MascotQuail size={26} /> : <span role="img" aria-label="oil lamp" style={{ fontSize: 19 }}>🪔</span>}
        </div>
      </div>
    </div>
  );
}

// ---- searchable node picker (shared) ----------------------------------------
export function EXPicker({ focus, setFocus, theme = 'warm' }: { focus: string; setFocus: (id: string) => void; theme?: ThemeName }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const cur = BYID[focus] || { name: focus };
  const res = ALL.filter((n) => n.name.toLowerCase().includes(q.toLowerCase()));
  const order: Array<keyof typeof EX_LV_DOT> = ['root', 'varna', 'caste-cluster', 'jati', 'sub-jati', 'kootam', 'temple-clan'];
  const groups = order.map((l) => ({ l, items: res.filter((n) => n.level === l) })).filter((g) => g.items.length);
  return (
    <div className={`ex-pk ex-pk-${theme}`} tabIndex={0} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <div className="ex-pk-f" onClick={() => setOpen(true)}>
        <span className="ex-pk-i" aria-hidden="true">⌕</span>
        <input value={open ? q : ''} placeholder={open ? 'Search any node…' : cur.name} aria-label="Search nodes" onChange={(e) => { setQ(e.target.value); setOpen(true); }} />
        <span className="ex-pk-c" aria-hidden="true">▾</span>
      </div>
      {open && (
        <div className="ex-pk-pop">
          <div className="ex-pk-n">{res.length} matches</div>
          <div className="ex-pk-l">
            {groups.map((g) => (
              <div key={g.l}>
                <div className="ex-pk-gh"><span className="ex-pk-dot" style={{ background: EX_LV_DOT[g.l] }} />{LVLAB[g.l]} <span className="gn">{g.items.length}</span></div>
                {g.items.slice(0, g.l === 'kootam' ? 6 : 99).map((n) => (
                  <div key={n.id} className={`ex-pk-o${n.id === focus ? ' on' : ''}`} onMouseDown={() => { setFocus(n.id); setOpen(false); setQ(''); }}>
                    <span className="ex-pk-dot" style={{ background: EX_LV_DOT[n.level] }} />{n.name}
                  </div>
                ))}
                {g.l === 'kootam' && g.items.length > 6 && <div className="ex-pk-mo">+{g.items.length - 6} — keep typing</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Convenience: jump-by-stage-index → focus a representative node.
export function railNodeForIndex(i: number): string {
  return RAIL[Math.max(0, Math.min(RAIL.length - 1, i))].node;
}
export { stageForNode };

// ---- shared CSS (rendered once by the controller) ---------------------------
export const EX_PARTS_CSS = `
  .ex { --ex-ink:#1c1917; --ex-ink2:#44403c; --ex-muted:#78716c; --ex-faint:#a8a29e;
    --ex-card:#ffffff; --ex-card2:#fdfcf9; --ex-rule:#e7e5e4; --ex-accent:#b45309; --ex-primary:#4338ca;
    font-family:var(--font-sans); color:var(--ex-ink); }
  .ex *{ box-sizing:border-box; }
  .ex .ta{ font-family:var(--font-tamil); }
  .ex-eye{ display:flex; align-items:baseline; gap:11px; flex-wrap:wrap;
    font-size:11px; font-weight:700; letter-spacing:.13em; text-transform:uppercase; color:var(--ex-accent); }
  .ex-eye .sc{ font-family:var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); font-size:10px; letter-spacing:0; text-transform:none; color:var(--ex-faint); }
  .ex-eye .al{ font-family:var(--font-display); font-weight:500; font-style:italic; letter-spacing:.01em; text-transform:none; color:var(--ex-muted); }
  .ex-title{ font-family:var(--font-display); font-weight:700; line-height:1.02; letter-spacing:-.025em; color:var(--ex-ink); margin:8px 0 0; font-size:38px; }
  .ex-title .ta{ display:block; margin-left:0; margin-top:2px; font-weight:500; letter-spacing:0; color:var(--ex-muted); font-size:.6em; }
  .ex-lv{ display:inline-block; white-space:nowrap; font-size:9.5px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:#fff; border-radius:5px; padding:2px 8px; vertical-align:middle; }
  .ex-path{ margin-top:13px; display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
  .ex-step{ font-size:11px; font-weight:600; border:1.5px solid var(--ex-rule); border-radius:9999px; padding:3px 11px; color:var(--ex-ink2); background:var(--ex-card); white-space:nowrap; }
  .ex-step.on{ background:var(--ex-accent); border-color:var(--ex-accent); color:#fff; }
  .ex-sep{ font-size:12px; color:var(--ex-faint); }
  .ex-lede{ font-family:var(--font-display); font-size:18px; line-height:1.5; color:var(--ex-ink2); margin:16px 0 0; max-width:46ch; }
  .ex-arr{ display:flex; gap:11px; align-items:flex-start; }
  .ex-arr-lamp{ font-size:22px; line-height:1; filter:drop-shadow(0 2px 7px rgba(180,83,9,.55)); flex:none; margin-top:1px; }
  .ex-arr-where{ font-size:10.5px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--ex-accent); }
  .ex-arr-line{ font-family:var(--font-display); font-style:italic; font-size:14.5px; line-height:1.5; color:var(--ex-ink2); margin:3px 0 0; max-width:48ch; }
  @keyframes ex-rise{ from{ transform:translateY(7px); } to{ transform:none; } }
  @media (prefers-reduced-motion: no-preference){ .ex-anim{ animation:ex-rise .42s var(--ease-editorial,ease) both; } }
  .ex-anchors{ display:flex; flex-direction:column; gap:9px; }
  .ex-anchor{ background:var(--ex-card); border:1px solid var(--ex-rule); border-left:3px solid var(--tier); border-radius:1rem; box-shadow:var(--shadow-sm); overflow:hidden; }
  .ex-anchor-head{ width:100%; display:flex; align-items:flex-start; gap:11px; text-align:left; cursor:pointer; background:none; border:none; padding:12px 14px; font:inherit; }
  .ex-anchor-pin{ flex:none; width:23px; height:23px; border-radius:9999px; background:var(--tier-fill); box-shadow:inset 0 0 0 1.5px color-mix(in srgb, var(--tier) 45%, transparent); display:grid; place-items:center; font-size:11px; margin-top:1px; }
  .ex-anchor-main{ flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
  .ex-anchor-kind{ font-size:10px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--tier); }
  .ex-anchor-text{ font-size:13px; line-height:1.5; color:var(--ex-ink2); }
  .ex-anchor-caret{ flex:none; color:var(--ex-faint); font-size:11px; margin-top:3px; }
  .ex-anchor-evi{ padding:0 14px 13px 48px; }
  .ex-anchor-evi[hidden]{ display:none; }
  .ex-anchor-evi .cap{ font-size:9.5px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--ex-faint); }
  .ex-anchor-evi p{ margin:4px 0 0; font-size:12.5px; line-height:1.6; color:var(--ex-muted); }
  .ex-koot-cap{ font-size:11px; font-weight:700; letter-spacing:.11em; text-transform:uppercase; color:var(--ex-muted); }
  .ex-flags{ margin-top:10px; display:flex; flex-wrap:wrap; gap:8px; }
  .ex-flag{ display:inline-flex; align-items:center; gap:7px; cursor:pointer; font-size:12.5px; color:var(--ex-ink2); background:var(--ex-card); border:1px solid var(--ex-rule); border-radius:.5rem; padding:6px 11px; box-shadow:var(--shadow-sm); transition:transform var(--dur-fast,160ms) var(--ease-editorial), background var(--dur-fast,160ms), color var(--dur-fast,160ms), border-color var(--dur-fast,160ms); }
  .ex-flag:hover{ transform:translateY(-1px); border-color:var(--ex-accent); }
  .ex-flag.on{ background:var(--ex-accent); color:#fff; border-color:var(--ex-accent); }
  .ex-flag.on .ta{ color:rgba(255,255,255,.8); }
  .ex-flag .ta{ font-family:var(--font-tamil); color:var(--ex-faint); font-size:11px; }
  .ex-flag-dot{ width:8px; height:8px; border-radius:9999px; background:var(--ex-accent); }
  .ex-flag.more{ cursor:default; color:var(--ex-faint); border-style:dashed; box-shadow:none; }
  .ex-flag.more:hover{ transform:none; border-color:var(--ex-rule); }
  .ex-deity{ display:flex; align-items:center; gap:18px; background:var(--ex-card); border:1px solid color-mix(in srgb, var(--ex-accent) 28%, var(--ex-rule)); border-radius:var(--radius-2xl,1.25rem); padding:16px 18px; box-shadow:var(--shadow-md); }
  .ex-deity-art{ flex:none; width:96px; height:100px; position:relative; }
  .ex-deity-perch{ position:absolute; left:50%; top:-9px; transform:translateX(-50%); z-index:2; line-height:0; animation: ex-perch-land .5s var(--ease-editorial, ease) both; }
  @keyframes ex-perch-land{ from{ opacity:0; transform:translate(-50%,-7px); } to{ opacity:1; transform:translate(-50%,0); } }
  .ex-deity-cap{ font-size:10px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--ex-accent); }
  .ex-deity-name{ display:block; font-family:var(--font-display); font-weight:700; font-size:22px; color:var(--ex-ink); margin-top:3px; }
  .ex-deity-name .ta{ font-weight:500; font-size:.66em; color:var(--ex-muted); }
  .ex-deity-place{ display:block; font-size:12px; color:var(--ex-muted); margin-top:3px; }
  .ex-deity-hint{ display:block; font-family:var(--font-display); font-style:italic; font-size:12.5px; color:var(--ex-accent); margin-top:8px; }
  .ex-deity-pending{ border-style:dashed; box-shadow:none; opacity:.92; }
  .ex-deity-pending .ex-deity-art{ opacity:.55; filter:grayscale(.4); }
  .ex-pending-name{ font-size:18px; color:var(--ex-muted); }
  .ex-pending-hint{ color:var(--ex-muted); font-style:italic; }
  .ex-temple-glow{ animation:ex-pulse 2.4s ease-in-out infinite; transform-origin:center; }
  .ex-temple-flame{ animation:ex-flame 1.6s ease-in-out infinite; }
  @keyframes ex-flame{ 0%,100%{ r:3.2px; } 50%{ r:3.8px; } }
  .ex-vswitch{ display:inline-flex; gap:2px; background:var(--ex-seg, var(--ex-card2)); border:1px solid var(--ex-rule); border-radius:8px; padding:2px; }
  .ex-vswitch-b{ font:inherit; font-size:11.5px; font-weight:600; color:var(--ex-muted); text-decoration:none; padding:5px 11px; border-radius:6px; transition:color var(--dur-fast,.16s), background var(--dur-fast,.16s); }
  .ex-vswitch-b:hover{ color:var(--ex-ink); }
  .ex-vswitch-b.on{ background:var(--ex-accent); color:#fff; }
  .ex[data-theme="dark"] .ex-vswitch-b.on{ color:#1c1917; }
  .ex-storylink{ display:inline-flex; align-items:center; gap:8px; margin-top:16px; text-decoration:none; font-family:var(--font-display); font-style:italic; font-size:14px; color:var(--ex-accent); border-bottom:1px solid transparent; padding-bottom:1px; width:fit-content; }
  .ex-storylink-lamp{ font-style:normal; font-size:15px; }
  .ex-storylink-arr{ font-style:normal; transition:transform var(--dur-fast,.16s) var(--ease-editorial, ease); }
  .ex-storylink:hover{ border-bottom-color:var(--ex-accent); }
  .ex-storylink:hover .ex-storylink-arr{ transform:translateX(3px); }
  .ex-rail{ position:relative; width:118px; flex:none; }
  .ex-rail-river{ position:absolute; left:50%; top:0; bottom:0; transform:translateX(-50%); width:34px; }
  .ex-tick{ position:absolute; left:50%; transform:translate(-50%,-50%); display:flex; align-items:center; gap:8px; background:none; border:none; cursor:pointer; padding:0; z-index:2; }
  .ex-tick-dot{ width:12px; height:12px; border-radius:9999px; background:var(--ex-card); border:2px solid var(--ex-rule); flex:none; box-shadow:0 1px 3px rgba(28,25,23,.12); transition:all var(--dur-base) var(--ease-editorial); }
  .ex-tick.past .ex-tick-dot{ background:#7dd3fc; border-color:#38bdf8; }
  .ex-tick.on .ex-tick-dot{ background:var(--ex-accent); border-color:var(--ex-accent); box-shadow:0 0 0 5px color-mix(in srgb, var(--ex-accent) 20%, transparent); }
  .ex-tick-lab{ display:flex; flex-direction:column; line-height:1.1; opacity:.55; transition:opacity var(--dur-base); }
  .ex-tick.on .ex-tick-lab{ opacity:1; }
  .ex-tick-en{ font-size:11.5px; font-weight:600; color:var(--ex-ink2); white-space:nowrap; }
  .ex-tick-ta{ font-family:var(--font-tamil); font-size:9.5px; color:var(--ex-faint); white-space:nowrap; }
  .ex-lamp{ position:absolute; left:50%; transform:translate(-50%,-50%); z-index:3; will-change:top; transition:top .5s var(--ease-editorial); }
  .ex-lamp-icon{ font-size:23px; display:block; filter:drop-shadow(0 3px 8px rgba(180,83,9,.6)); }
  .ex-lamp-glow{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:42px; height:42px; border-radius:9999px; background:radial-gradient(circle, rgba(180,83,9,.34), transparent 70%); animation:ex-pulse 2.4s ease-in-out infinite; }
  @keyframes ex-pulse{ 0%,100%{ opacity:.5; } 50%{ opacity:.95; } }
  .ex-guide{ display:inline-block; }
  .ex-pk{ position:relative; width:240px; outline:none; font-family:var(--font-sans); }
  .ex-pk-f{ display:flex; align-items:center; gap:7px; border:1px solid var(--ex-pk-bd); background:var(--ex-pk-bg); border-radius:9px; padding:6px 11px; cursor:text; }
  .ex-pk-i,.ex-pk-c{ color:var(--ex-pk-mut); font-size:11px; }
  .ex-pk-f input{ flex:1; min-width:0; background:none; border:none; outline:none; color:var(--ex-pk-fg); font:inherit; font-size:13px; }
  .ex-pk-f input::placeholder{ color:var(--ex-pk-ph); opacity:1; }
  .ex-pk-pop{ position:absolute; left:0; right:0; top:calc(100% + 6px); z-index:40; background:var(--ex-pk-pop); border:1px solid var(--ex-pk-bd); border-radius:11px; box-shadow:0 16px 40px rgba(28,25,23,.18); }
  .ex-pk-n{ font-size:10px; color:var(--ex-pk-mut); padding:8px 12px 3px; }
  .ex-pk-l{ max-height:286px; overflow:auto; padding:0 6px 8px; }
  .ex-pk-gh{ display:flex; align-items:center; gap:6px; font-size:9px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--ex-pk-mut); padding:7px 6px 3px; }
  .ex-pk-gh .gn{ color:var(--ex-pk-mut); opacity:.7; }
  .ex-pk-o{ display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--ex-pk-fg); padding:6px 8px; border-radius:7px; cursor:pointer; }
  .ex-pk-o:hover{ background:var(--ex-pk-hov); } .ex-pk-o.on{ background:var(--ex-pk-on); }
  .ex-pk-dot{ width:7px; height:7px; border-radius:9999px; flex:none; }
  .ex-pk-mo{ font-size:10px; color:var(--ex-pk-mut); padding:4px 8px; font-style:italic; }
  .ex-pk-warm{ --ex-pk-bd:#e7e5e4; --ex-pk-bg:#fff; --ex-pk-pop:#fff; --ex-pk-fg:#1c1917; --ex-pk-mut:#78716c; --ex-pk-ph:#a8a29e; --ex-pk-hov:#f5f5f4; --ex-pk-on:#fef3c7; }
  .ex-pk-dark{ --ex-pk-bd:#2f3b58; --ex-pk-bg:#0d1426; --ex-pk-pop:#0d1426; --ex-pk-fg:#e2e8f0; --ex-pk-mut:#64748b; --ex-pk-ph:#94a3b8; --ex-pk-hov:#172036; --ex-pk-on:#1e293b; }
  .ex-trail{ padding:14px 18px 16px; }
  .ex-trail-line{ position:relative; height:3px; border-radius:9999px; background:var(--ex-trail-bd,#e7e5e4); margin:0 6px; }
  .ex-trail-fill{ position:absolute; left:0; top:0; height:100%; border-radius:9999px; background:#7dd3fc; transition:width .5s var(--ease-editorial); }
  .ex-trail-ticks{ position:relative; display:flex; justify-content:space-between; margin-top:-7px; }
  .ex-trail-tick{ display:flex; flex-direction:column; align-items:center; gap:5px; background:none; border:none; cursor:pointer; padding:0; flex:1; }
  .ex-trail-dot{ width:11px; height:11px; border-radius:9999px; background:var(--ex-trail-dotbg,#fff); border:2px solid var(--ex-trail-bd,#d6d3d1); transition:all var(--dur-base) var(--ease-editorial); }
  .ex-trail-tick.past .ex-trail-dot{ background:#7dd3fc; border-color:#38bdf8; }
  .ex-trail-tick.on .ex-trail-dot{ background:var(--ex-accent,#b45309); border-color:var(--ex-accent,#b45309); box-shadow:0 0 0 4px color-mix(in srgb, var(--ex-accent,#b45309) 22%, transparent); }
  .ex-trail-en{ font-size:10.5px; font-weight:600; color:var(--ex-trail-fg,#78716c); white-space:nowrap; }
  .ex-trail-tick.on .ex-trail-en{ color:var(--ex-trail-on,#1c1917); }
  .ex-trail-guide{ position:absolute; top:-26px; transform:translateX(-50%); transition:left .5s var(--ease-editorial); line-height:0; }
  .ex-trail-warm{ --ex-trail-bd:#e7e5e4; --ex-trail-dotbg:#fff; --ex-trail-fg:#78716c; --ex-trail-on:#1c1917; }
  .ex-trail-dark{ --ex-trail-bd:#2f3b58; --ex-trail-dotbg:#0d1426; --ex-trail-fg:#94a3b8; --ex-trail-on:#f8fafc; }
`;
