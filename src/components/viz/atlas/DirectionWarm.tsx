// Direction A — Warm Atlas. The editorial-column layout: a river rail spines the
// left, a narrative column carries the node's micro-narrative + evidence +
// kootam totems / gopuram payoff, and the live fly-map + identity tree sit as
// framed plates. Theme-able (light cream OR dark slate) off one set of semantic
// vars. Ported from direction-warm.jsx.

import { Fragment } from 'react';
import AtlasMap from './AtlasMap';
import AtlasDendro from './AtlasDendro';
import { Hills, type SceneBand, type Intensity } from './scene';
import {
  EXPicker,
  EXViewSwitch,
  EXTopRail,
  EXRiverRail,
  EXArrival,
  EXStoryLink,
  EXKootamFlags,
  EXKootamDeity,
  EXDeity,
  EXAnchor,
  railNodeForIndex,
} from './parts';
import { useBox } from './useBox';
import { nodeNarr, stageForNode, EX_LV_DOT, type ResolvedStage, type StageId } from '../../../data/atlas-explore';

const WARM_BAND: SceneBand = { light: '#fde7c4', h1: '#fde7c4', h2: '#fbd49a', h3: '#f4b76a', deep: '#b45309', ink: '#7c2d12' };

export interface ShellProps {
  focus: string;
  setFocus: (id: string) => void;
  maxDepth: number;
  setMaxDepth: (d: number) => void;
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
  theme: 'light' | 'dark';
  guide: 'lamp' | 'quail';
  accent: string;
  illustration: Intensity;
  lamp?: boolean;
  onShare: () => void;
  stagesById: Record<StageId, ResolvedStage>;
}

export default function DirectionWarm({
  focus,
  setFocus,
  maxDepth,
  setMaxDepth,
  collapsed,
  onToggleCollapse,
  theme = 'light',
  guide = 'lamp',
  accent,
  illustration = 'rich',
  lamp = true,
  onShare,
  stagesById,
}: ShellProps) {
  const stage = stageForNode(focus);
  const N = nodeNarr(focus, stagesById);
  const sd = N.sd;
  const atKongu = stage === 'kongu';
  const atKonur = stage === 'konur';
  const dark = theme === 'dark';
  const pick = (id: string) => setFocus(id);
  const jump = (i: number) => setFocus(railNodeForIndex(i));

  const [mapRef, mapBox] = useBox({ w: 430, h: 250 });
  const [treeRef, treeBox] = useBox({ w: 452, h: 398 });

  return (
    <div className="exA-cq" style={{ width: '100%', height: '100%' }}>
      <div className="ex exA" data-theme={theme} style={{ width: '100%', height: '100%', ...(accent ? ({ '--ex-accent': accent } as React.CSSProperties) : {}) }}>
        <header className="exA-bar">
          <div className="exA-brand">Atlas <span lang="ta" className="ta">வம்சாவளி</span></div>
          <EXPicker focus={focus} setFocus={pick} theme={dark ? 'dark' : 'warm'} />
          <div className="exA-seg">
            {([['Varnas', 1], ['Clusters', 2], ['Sub-castes', 3], ['Kootams', 4]] as const).map(([lab, d]) => (
              <button key={d} className={maxDepth === d ? 'on' : ''} onClick={() => setMaxDepth(d)}>{lab}</button>
            ))}
          </div>
          <div className="exA-sp" />
          <EXViewSwitch current="explore" stage={stage} />
          <button className="exA-share" onClick={onShare}>🔗 Share view</button>
        </header>

        {lamp && <div className="exA-toprail"><EXTopRail stageIdx={N.stageIdx} onJump={jump} guide={guide} theme={dark ? 'dark' : 'warm'} /></div>}

        <div className="exA-body">
          {lamp && <EXRiverRail stageIdx={N.stageIdx} onJump={jump} guide={guide} />}

          <section className="exA-mid">
            <div className="ex-eye">
              <span>{sd.sec}</span>
              <span className="sc">{sd.scale}</span>
              <span className="al">— {sd.altitude}</span>
            </div>
            <h2 className="ex-title">
              {N.node.name}
              {N.node.ta && <span lang="ta" className="ta">{N.node.ta}</span>}
            </h2>
            <div style={{ marginTop: 9 }}>
              <span className="ex-lv" style={{ background: EX_LV_DOT[N.node.level] || '#b45309' }}>{N.levelLabel}</span>
            </div>

            <div className="ex-path">
              {sd.path.map((p, k) => (
                <Fragment key={k}>
                  <span className={`ex-step${k === sd.path.length - 1 ? ' on' : ''}`}>{p}</span>
                  {k < sd.path.length - 1 && <span className="ex-sep">→</span>}
                </Fragment>
              ))}
            </div>

            <div style={{ marginTop: 20 }}><EXArrival stage={stage} /></div>
            <p className="ex-lede">{N.lede}</p>
            <EXStoryLink stage={stage} />

            <div className="exA-feature">
              {atKonur ? (
                <EXDeity deity={stagesById.konur.deity} lit guide={guide} />
              ) : atKongu ? (
                <>
                  <EXKootamFlags focus={focus} onPick={pick} kongu={stagesById.kongu} />
                  <EXKootamDeity focus={focus} />
                </>
              ) : null}
            </div>

            <div className="exA-anchors-wrap">
              <span className="exA-evi-cap">Evidence travelling with this view</span>
              <div className="ex-anchors">
                {N.claims.slice(0, 2).map((a, i) => <EXAnchor key={i} a={a} />)}
              </div>
            </div>
          </section>

          <aside className="exA-instr">
            <div className="exA-map-card">
              <div className="exA-plate-cap"><span>Live map</span><span lang="ta" className="ta">நில வரைபடம்</span></div>
              <div className="exA-map" ref={mapRef}>
                <AtlasMap stageIndex={N.stageIdx} theme={theme} accent={accent} width={mapBox.w} height={mapBox.h} />
                <div className="exA-hills"><Hills b={WARM_BAND} intensity={illustration} /></div>
              </div>
            </div>
            <div className="exA-tree-card">
              <div className="exA-plate-cap"><span>Identity tree — tap a node to travel</span></div>
              <div className="exA-tree" ref={treeRef}>
                <AtlasDendro focus={focus} onFocus={pick} dir="vertical" width={treeBox.w} height={treeBox.h} collapsed={collapsed} onToggleCollapse={onToggleCollapse} maxDepth={maxDepth} theme={theme} accent={accent} />
              </div>
            </div>
          </aside>
        </div>

        <style>{`
          .exA-cq{ container-type:inline-size; }
          .exA{ display:flex; flex-direction:column; background:var(--ex-bg); color:var(--ex-ink); }
          .exA[data-theme="light"]{ --ex-ink:#1c1917; --ex-ink2:#44403c; --ex-muted:#78716c; --ex-faint:#a8a29e;
            --ex-card:#ffffff; --ex-card2:#fdfcf9; --ex-rule:#e7e5e4; --ex-accent:#b45309; --ex-primary:#4338ca;
            --ex-bg:#faf7f1; --ex-bar:#fdfcf9; --ex-seg:#f5f1e8; --ex-btn:#ffffff; --ex-mapbg:#eef4fb; }
          .exA[data-theme="dark"]{ --ex-ink:#f1f5f9; --ex-ink2:#cbd5e1; --ex-muted:#94a3b8; --ex-faint:#64748b;
            --ex-card:#131a2e; --ex-card2:#0d1426; --ex-rule:#283449; --ex-accent:#fbbf24; --ex-primary:#818cf8;
            --ex-bg:radial-gradient(140% 90% at 50% 0%, #131a2e, #0b1020 72%); --ex-bar:#0d1426; --ex-seg:#131a2e;
            --ex-btn:#131a2e; --ex-mapbg:#0a1322; }
          .exA-bar{ display:flex; align-items:center; gap:12px; padding:10px 22px; background:var(--ex-bar); border-bottom:1px solid var(--ex-rule); flex:none; }
          .exA-brand{ font-family:var(--font-display); font-weight:700; font-size:19px; color:var(--ex-ink); }
          .exA-brand .ta{ font-family:var(--font-tamil); font-size:12px; color:var(--ex-accent); font-weight:500; margin-left:4px; }
          .exA-seg{ display:inline-flex; gap:2px; background:var(--ex-seg); border:1px solid var(--ex-rule); border-radius:8px; padding:2px; }
          .exA-seg button{ border:none; background:none; font:inherit; font-size:11.5px; font-weight:500; color:var(--ex-muted); padding:5px 10px; border-radius:6px; cursor:pointer; }
          .exA-seg button.on{ background:var(--ex-accent); color:#fff; }
          .exA[data-theme="dark"] .exA-seg button.on{ color:#1c1917; }
          .exA-sp{ flex:1; }
          .exA-share{ font:inherit; font-size:12px; font-weight:600; color:var(--ex-ink2); background:var(--ex-btn); border:1px solid var(--ex-rule); border-radius:8px; padding:7px 13px; cursor:pointer; white-space:nowrap; }
          .exA-share:hover{ border-color:var(--ex-accent); }
          .exA-toprail{ display:none; border-bottom:1px solid var(--ex-rule); background:var(--ex-bar); }
          .exA-body{ flex:1; min-height:0; display:flex; gap:0; padding:22px 26px 24px; }
          .exA-mid{ flex:1; min-width:0; padding:4px 30px 0 26px; overflow:auto; }
          .exA-feature{ margin-top:22px; }
          .exA-anchors-wrap{ margin-top:24px; }
          .exA-evi-cap{ display:block; font-size:10px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--ex-faint); margin-bottom:9px; }
          .exA-instr{ flex:none; width:474px; display:flex; flex-direction:column; gap:16px; }
          .exA-plate-cap{ display:flex; align-items:baseline; justify-content:space-between; gap:8px; font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--ex-muted); margin-bottom:8px; }
          .exA-plate-cap .ta{ font-family:var(--font-tamil); font-size:10px; color:var(--ex-faint); letter-spacing:0; }
          .exA-map{ position:relative; height:250px; border:1px solid var(--ex-rule); border-radius:var(--radius-2xl,1.25rem); overflow:hidden; box-shadow:var(--shadow-sm); background:var(--ex-mapbg); }
          .exA-hills{ position:absolute; left:0; right:0; bottom:0; height:64px; pointer-events:none; opacity:.9; }
          .exA-hills svg{ width:100%; height:100%; display:block; }
          .exA-tree-card{ flex:1; min-height:0; display:flex; flex-direction:column; }
          .exA-tree{ flex:1; min-height:260px; border:1px solid var(--ex-rule); border-radius:var(--radius-2xl,1.25rem); overflow:hidden; box-shadow:var(--shadow-sm); position:relative; }
          .exA-tree svg{ display:block; width:100%; height:100%; }
          @container (max-width: 920px){
            .exA-toprail{ display:block; }
            .exA-body{ flex-direction:column; padding:16px; overflow:auto; }
            .exA .ex-rail{ display:none; }
            .exA-mid{ padding:0; overflow:visible; }
            .exA-instr{ width:100%; }
            .exA-map{ height:220px; }
            .exA-tree{ height:360px; }
          }
          @container (max-width: 620px){
            .exA-bar{ flex-wrap:wrap; gap:8px; padding:10px 14px; }
            .exA .ex-title{ font-size:30px; }
          }
        `}</style>
      </div>
    </div>
  );
}
