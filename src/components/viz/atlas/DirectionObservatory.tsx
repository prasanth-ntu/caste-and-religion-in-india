// Direction C — The Observatory. The cinematic layout: the live fly-map is a
// viewport with a rail-descent down its left edge, arrival narration floats over
// the map, the identity tree docks beneath, and a right "chapter" column carries
// the micro-narrative + evidence + payoff. Same ground truth as Warm, different
// staging. Ported from direction-observatory.jsx.

import { Fragment } from 'react';
import AtlasMap from './AtlasMap';
import AtlasDendro from './AtlasDendro';
import MascotQuail from './MascotQuail';
import {
  EXPicker,
  EXViewSwitch,
  EXArrival,
  EXStoryLink,
  EXKootamFlags,
  EXKootamDeity,
  EXDeity,
  EXAnchor,
} from './parts';
import { useBox } from './useBox';
import { nodeNarr, stageForNode, RAIL, EX_LV_DOT, type ResolvedStage, type StageId } from '../../../data/atlas-explore';
import type { ShellProps } from './DirectionWarm';

function ObservatoryRail({ stageIdx, onJump, guide = 'lamp' }: { stageIdx: number; onJump: (node: string) => void; guide?: 'lamp' | 'quail' }) {
  const progress = stageIdx / (RAIL.length - 1);
  const D = 'M16 6 C 5 70, 27 130, 16 196 C 7 262, 25 322, 16 388 C 9 452, 23 510, 16 560';
  return (
    <div className="obC-rail">
      <svg className="obC-river" viewBox="0 0 32 566" preserveAspectRatio="none">
        <path d={D} fill="none" stroke="var(--obc-river-bd)" strokeWidth="7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={D} fill="none" stroke="#38bdf8" strokeWidth="7" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} style={{ transition: 'stroke-dashoffset .5s var(--ease-editorial)', filter: 'drop-shadow(0 0 5px rgba(56,189,248,.5))' }} />
      </svg>
      {RAIL.map((r, i) => (
        <button type="button" key={r.id} className={`obC-tick${i === stageIdx ? ' on' : ''}${i < stageIdx ? ' past' : ''}`} style={{ top: `${6 + (i / (RAIL.length - 1)) * 84}%` }} onClick={() => onJump(r.node)} title={r.en}>
          <span className="obC-tick-dot" />
          <span className="obC-tick-lab"><span className="obC-tick-en">{r.en}</span><span lang="ta" className="ta obC-tick-ta">{r.ta}</span></span>
        </button>
      ))}
      <div className="obC-lamp" style={{ top: `${6 + progress * 84}%` }} key={stageIdx}>
        {guide === 'quail' ? (
          <MascotQuail size={29} />
        ) : (
          <>
            <span className="obC-lamp-glow" />
            <span className="obC-lamp-icon" role="img" aria-label="oil lamp">🪔</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function DirectionObservatory({
  focus,
  setFocus,
  maxDepth,
  setMaxDepth,
  collapsed,
  onToggleCollapse,
  theme = 'dark',
  guide = 'lamp',
  accent,
  lamp = true,
  onShare,
  stagesById,
}: ShellProps) {
  const stage = stageForNode(focus);
  const N = nodeNarr(focus, stagesById);
  const sd = N.sd;
  const idx = N.stageIdx;
  const dark = theme !== 'light';
  const pick = (id: string) => setFocus(id);

  const [vpRef, vpBox] = useBox({ w: 760, h: 452 });
  const [treeRef, treeBox] = useBox({ w: 812, h: 232 });

  return (
    <div className="exC-cq" style={{ width: '100%', height: '100%' }}>
      <div className="ex exC" data-theme={theme} style={{ width: '100%', height: '100%', ...(accent ? ({ '--ex-accent': accent } as React.CSSProperties) : {}) }}>
        <header className="obC-bar">
          <div className="obC-brand">Atlas <span lang="ta" className="ta">வம்சாவளி</span></div>
          <EXPicker focus={focus} setFocus={pick} theme={dark ? 'dark' : 'warm'} />
          <div className="obC-seg">
            {([['Varnas', 1], ['Clusters', 2], ['Sub-castes', 3], ['Kootams', 4]] as const).map(([lab, d]) => (
              <button key={d} className={maxDepth === d ? 'on' : ''} onClick={() => setMaxDepth(d)}>{lab}</button>
            ))}
          </div>
          <div className="obC-sp" />
          <EXViewSwitch current="explore" stage={stage} />
          <button className="obC-share" onClick={onShare}>🔗 Share view</button>
        </header>

        <div className="obC-body">
          <div className="obC-stage">
            <div className={`obC-viewport${lamp ? '' : ' no-rail'}`}>
              {lamp && <ObservatoryRail stageIdx={idx} onJump={pick} guide={guide} />}
              <div className="obC-map" ref={vpRef}>
                <AtlasMap stageIndex={idx} theme={theme} accent={accent} width={vpBox.w} height={vpBox.h} />
              </div>
              <div className="obC-crumb">
                {RAIL.map((r, i) => (
                  <Fragment key={r.id}>
                    <span className={i === idx ? 'on' : ''}>{r.en}</span>
                    {i < RAIL.length - 1 && <span className="sep">›</span>}
                  </Fragment>
                ))}
              </div>
              <div className="obC-arrival" key={stage}>
                <EXArrival stage={stage} />
              </div>
            </div>

            <div className="obC-treebar">
              <div className="obC-treebar-cap">Identity tree <span lang="ta" className="ta">அடையாள மரம்</span> — tap a node to descend</div>
              <div className="obC-tree" ref={treeRef}>
                <AtlasDendro focus={focus} onFocus={pick} dir="horizontal" width={treeBox.w} height={treeBox.h} collapsed={collapsed} onToggleCollapse={onToggleCollapse} maxDepth={maxDepth} theme={theme} accent={accent} />
              </div>
            </div>
          </div>

          <aside className="obC-chapter">
            <div className="ex-eye">
              <span>{sd.sec}</span><span className="sc">{sd.scale}</span><span className="al">— {sd.altitude}</span>
            </div>
            <h2 className="ex-title">
              {N.node.name}{N.node.ta && <span lang="ta" className="ta">{N.node.ta}</span>}
            </h2>
            <div style={{ marginTop: 9 }}>
              <span className="ex-lv" style={{ background: EX_LV_DOT[N.node.level] || '#4338ca' }}>{N.levelLabel}</span>
            </div>

            <div className="ex-path">
              {sd.path.map((p, k) => (
                <Fragment key={k}>
                  <span className={`ex-step${k === sd.path.length - 1 ? ' on' : ''}`}>{p}</span>
                  {k < sd.path.length - 1 && <span className="ex-sep">→</span>}
                </Fragment>
              ))}
            </div>

            <p className="ex-lede">{N.lede}</p>
            <EXStoryLink stage={stage} />

            {stage === 'kongu' && <div className="obC-feature"><EXKootamFlags focus={focus} onPick={pick} kongu={stagesById.kongu} /><EXKootamDeity focus={focus} /></div>}
            {stage === 'konur' && <div className="obC-feature"><EXDeity deity={stagesById.konur.deity} lit guide={guide} /></div>}

            <div className="obC-evi">
              <span className="obC-evi-cap">Evidence travelling with this view</span>
              <div className="ex-anchors">
                {N.claims.slice(0, 2).map((a, i) => <EXAnchor key={i} a={a} />)}
              </div>
            </div>
          </aside>
        </div>

        <style>{`
          .exC-cq{ container-type:inline-size; }
          .exC{ display:flex; flex-direction:column; color:var(--ex-ink); background:var(--ex-bg); }
          .exC[data-theme="dark"]{ --ex-ink:#f1f5f9; --ex-ink2:#cbd5e1; --ex-muted:#94a3b8; --ex-faint:#64748b;
            --ex-card:#131a2e; --ex-card2:#0d1426; --ex-rule:#283449; --ex-accent:#fbbf24; --ex-primary:#818cf8;
            --ex-bg:radial-gradient(140% 90% at 50% 0%, #131a2e, #0b1020 72%);
            --obc-bar:#0d1426; --obc-barbd:#1e293b; --obc-seg:#131a2e; --obc-seg-on:#4338ca; --obc-seg-ontext:#fff;
            --obc-vp:#0a1322; --obc-vpbd:#243049; --obc-river-bd:rgba(120,140,180,.28);
            --obc-tickdot:#0d1426; --obc-tickbd:#3a4761; --obc-ticktext:#e2e8f0;
            --obc-crumb:rgba(13,20,38,.78); --obc-crumb-on:#f8fafc; --obc-arrival:rgba(11,16,32,.82);
            --obc-tree:#0d1426; --obc-chapter:#0b1224; --obc-title:#fff; --obc-vignette:rgba(8,12,24,.55); }
          .exC[data-theme="light"]{ --ex-ink:#1c1917; --ex-ink2:#44403c; --ex-muted:#78716c; --ex-faint:#a8a29e;
            --ex-card:#ffffff; --ex-card2:#fdfcf9; --ex-rule:#e7e5e4; --ex-accent:#b45309; --ex-primary:#4338ca;
            --ex-bg:#faf7f1;
            --obc-bar:#fdfcf9; --obc-barbd:#e7e5e4; --obc-seg:#f5f1e8; --obc-seg-on:#b45309; --obc-seg-ontext:#fff;
            --obc-vp:#eef4fb; --obc-vpbd:#e7e5e4; --obc-river-bd:rgba(120,140,180,.3);
            --obc-tickdot:#ffffff; --obc-tickbd:#d6d3d1; --obc-ticktext:#44403c;
            --obc-crumb:rgba(255,255,255,.84); --obc-crumb-on:#1c1917; --obc-arrival:rgba(255,255,255,.9);
            --obc-tree:#fbfaf7; --obc-chapter:#fdfcf9; --obc-title:#1c1917; --obc-vignette:rgba(120,120,140,.14); }
          .obC-bar{ display:flex; align-items:center; gap:12px; padding:10px 22px; background:var(--obc-bar); border-bottom:1px solid var(--obc-barbd); flex:none; }
          .obC-brand{ font-family:var(--font-display); font-weight:700; font-size:19px; color:var(--ex-ink); }
          .obC-brand .ta{ font-family:var(--font-tamil); font-size:12px; color:var(--ex-primary); font-weight:500; margin-left:4px; }
          .obC-seg{ display:inline-flex; gap:2px; background:var(--obc-seg); border:1px solid var(--ex-rule); border-radius:8px; padding:2px; }
          .obC-seg button{ border:none; background:none; font:inherit; font-size:11.5px; font-weight:500; color:var(--ex-muted); padding:5px 10px; border-radius:6px; cursor:pointer; }
          .obC-seg button.on{ background:var(--obc-seg-on); color:var(--obc-seg-ontext); }
          .obC-sp{ flex:1; }
          .obC-share{ font:inherit; font-size:12px; font-weight:600; color:var(--ex-ink2); background:var(--obc-seg); border:1px solid var(--ex-rule); border-radius:8px; padding:7px 13px; cursor:pointer; white-space:nowrap; }
          .obC-share:hover{ border-color:var(--ex-primary); }
          .obC-body{ flex:1; min-height:0; display:flex; gap:0; }
          .obC-stage{ flex:1; min-width:0; display:flex; flex-direction:column; padding:18px 18px 18px 20px; gap:14px; }
          .obC-viewport{ position:relative; flex:1.5; min-height:300px; border:1px solid var(--obc-vpbd); border-radius:16px; overflow:hidden; background:var(--obc-vp); box-shadow:0 14px 38px rgba(0,0,0,.42); }
          .exC[data-theme="light"] .obC-viewport{ box-shadow:var(--shadow-md); }
          .obC-viewport.no-rail .obC-arrival{ left:16px; }
          .obC-map{ position:absolute; inset:0; }
          .obC-viewport::after{ content:''; position:absolute; inset:0; pointer-events:none; box-shadow:inset 0 0 70px var(--obc-vignette); }
          .obC-rail{ position:absolute; left:0; top:0; bottom:0; width:128px; z-index:6; background:linear-gradient(90deg, color-mix(in oklch, var(--obc-vp) 86%, transparent), transparent); }
          .obC-river{ position:absolute; left:30px; top:0; bottom:0; transform:translateX(-50%); width:32px; height:100%; }
          .obC-tick{ position:absolute; left:30px; transform:translate(-50%,-50%); display:flex; align-items:center; gap:8px; background:none; border:none; cursor:pointer; padding:0; z-index:2; }
          .obC-tick-dot{ width:11px; height:11px; border-radius:9999px; background:var(--obc-tickdot); border:2px solid var(--obc-tickbd); flex:none; transition:all var(--dur-base) var(--ease-editorial); }
          .obC-tick.past .obC-tick-dot{ background:#38bdf8; border-color:#0ea5e9; }
          .obC-tick.on .obC-tick-dot{ background:var(--ex-accent); border-color:var(--ex-accent); box-shadow:0 0 0 5px color-mix(in oklch, var(--ex-accent) 18%, transparent), 0 0 9px color-mix(in oklch, var(--ex-accent) 60%, transparent); }
          .obC-tick-lab{ display:flex; flex-direction:column; line-height:1.05; opacity:.5; transition:opacity var(--dur-base); }
          .obC-tick.on .obC-tick-lab{ opacity:1; }
          .obC-tick-en{ font-size:11px; font-weight:600; color:var(--obc-ticktext); white-space:nowrap; }
          .obC-tick-ta{ font-size:9px; color:var(--ex-muted); white-space:nowrap; }
          .obC-lamp{ position:absolute; left:30px; transform:translate(-50%,-50%); z-index:3; will-change:top; transition:top .5s var(--ease-editorial); }
          .obC-lamp-icon{ font-size:21px; display:block; filter:drop-shadow(0 2px 8px rgba(251,191,36,.7)); }
          .obC-lamp-glow{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:42px; height:42px; border-radius:9999px; background:radial-gradient(circle, rgba(251,191,36,.4), transparent 70%); animation:ex-pulse 2.4s ease-in-out infinite; }
          .obC-crumb{ position:absolute; top:12px; right:14px; z-index:6; display:flex; align-items:center; gap:6px; font-size:10.5px; font-weight:600; letter-spacing:.04em; color:var(--ex-muted); background:var(--obc-crumb); border:1px solid var(--obc-vpbd); border-radius:9999px; padding:5px 12px; backdrop-filter:blur(3px); }
          .obC-crumb .on{ color:var(--obc-crumb-on); }
          .obC-crumb .sep{ color:var(--ex-faint); }
          .obC-arrival{ position:absolute; left:128px; right:16px; bottom:14px; z-index:6; background:var(--obc-arrival); border:1px solid var(--obc-vpbd); border-left:3px solid var(--ex-accent); border-radius:12px; padding:13px 16px; backdrop-filter:blur(3px); max-width:560px; }
          .obC-treebar{ flex:1; min-height:0; display:flex; flex-direction:column; }
          .obC-treebar-cap{ font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--ex-faint); margin-bottom:7px; }
          .obC-treebar-cap .ta{ font-family:var(--font-tamil); color:var(--ex-muted); letter-spacing:0; }
          .obC-tree{ flex:1; min-height:180px; border:1px solid var(--obc-barbd); border-radius:14px; overflow:hidden; background:var(--obc-tree); position:relative; }
          .obC-tree svg{ display:block; width:100%; height:100%; }
          .obC-chapter{ flex:none; width:418px; min-height:0; overflow:auto; padding:22px 24px 28px; background:var(--obc-chapter); border-left:1px solid var(--obc-barbd); }
          .obC-chapter .ex-title{ color:var(--obc-title); font-size:34px; }
          .obC-chapter .ex-step{ background:var(--ex-card); }
          .obC-chapter .ex-step.on{ background:var(--ex-accent); border-color:var(--ex-accent); color:#1c1917; }
          .obC-chapter .ex-lede{ color:var(--ex-ink2); }
          .obC-feature{ margin-top:22px; }
          .obC-evi{ margin-top:24px; }
          .obC-evi-cap{ display:block; font-size:10px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--ex-faint); margin-bottom:9px; }
          @container (max-width: 920px){
            .obC-body{ flex-direction:column; overflow:auto; }
            .obC-stage{ padding:14px; }
            .obC-viewport{ flex:none; height:300px; }
            .obC-treebar{ flex:none; height:320px; }
            .obC-chapter{ width:100%; border-left:none; border-top:1px solid var(--obc-barbd); }
            .obC-arrival{ left:16px; }
          }
          @container (max-width: 620px){
            .obC-bar{ flex-wrap:wrap; gap:8px; padding:10px 14px; }
            .obC-chapter .ex-title{ font-size:28px; }
          }
        `}</style>
      </div>
    </div>
  );
}
