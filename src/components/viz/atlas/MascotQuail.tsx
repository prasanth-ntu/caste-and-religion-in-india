// The quail mascot (காடை) — the Kadai kootam's own totem, an alternative to the
// oil lamp as the descent's guide. Event-driven: call quailMood('fly'|'run'|
// 'wink'|'sleep'|'idle'|'hop'|'perch') and every mounted quail reacts in sync.
// All motion sits behind prefers-reduced-motion. Ported from mascot-quail.jsx.

import { useState, useEffect } from 'react';

export type QuailMood = 'idle' | 'hop' | 'fly' | 'run' | 'wink' | 'sleep' | 'perch';

export function quailMood(action: QuailMood) {
  try {
    window.dispatchEvent(new CustomEvent('quailmood', { detail: action }));
  } catch {
    /* noop */
  }
}

const MQ_CSS = `
  .mq{ position:relative; display:inline-block; line-height:0; }
  .mq-hopper{ display:inline-block; line-height:0; }
  .mq-svg{ display:block; overflow:visible; filter:drop-shadow(0 2px 4px rgba(124,74,22,.35)); }
  .mq-svg g, .mq-svg path, .mq-svg ellipse, .mq-svg circle{ transform-box:fill-box; }
  .mq-lid{ opacity:0; transform-origin:center; }
  .mq-zzz{ position:absolute; top:-8px; right:-6px; font:600 9px/1 ui-sans-serif,sans-serif; color:#7c4a16; }
  .mq-zzz span{ font-size:7px; }
  @media (prefers-reduced-motion: no-preference){
    .mq-svg{ animation: mq-bob 2.6s ease-in-out infinite; }
    .mq-eye{ transform-origin:center; animation: mq-blink 3.8s ease-in-out infinite; }
    .mq-tail{ transform-origin:90% 60%; animation: mq-wag 2.9s ease-in-out infinite; }
    .mq-plume{ transform-origin:0% 100%; animation: mq-sway 3.2s ease-in-out infinite; }
    .mq-hop .mq-hopper{ animation: mq-hop .6s cubic-bezier(.22,1,.36,1) both; }
    .mq-hop .mq-wing{ transform-origin:55% 80%; animation: mq-flap .6s ease both; }
    .mq-fly .mq-hopper{ animation: mq-fly .72s cubic-bezier(.22,1,.36,1) both; }
    .mq-fly .mq-wing{ transform-origin:55% 80%; animation: mq-flap .16s ease-in-out 4; }
    .mq-fly .mq-svg{ animation: mq-bob 2.6s ease-in-out infinite; }
    .mq-run .mq-hopper{ animation: mq-run .7s ease both; }
    .mq-run .mq-legs{ transform-origin:50% 0%; animation: mq-legpump .15s linear 5; }
    .mq-wink .mq-lid{ opacity:1; animation: mq-wink .5s ease both; }
    .mq-wink .mq-eye{ animation:none; }
    .mq-sleep .mq-svg{ animation: mq-bob 4.6s ease-in-out infinite; }
    .mq-sleep .mq-eye{ animation:none; }
    .mq-sleep .mq-lid{ opacity:1; }
    .mq-sleep .mq-zzz{ animation: mq-zzz 2.4s ease-in-out infinite; }
    .mq-sleep .mq-plume{ animation:none; transform:rotate(-12deg); }
    .mq-perch .mq-hopper{ animation: mq-settle .55s cubic-bezier(.22,1,.36,1) both; }
    .mq-perch .mq-svg{ animation: mq-bob 3.8s ease-in-out infinite; }
    .mq-perch .mq-legs{ opacity:0; }
    .mq-perch .mq-eye{ animation: mq-blink 5.2s ease-in-out infinite; }
    .mq-perch .mq-tail{ animation: mq-wag 4.4s ease-in-out infinite; }
    .mq-perch .mq-plume{ animation: mq-sway 4.6s ease-in-out infinite; }
  }
  .mq-sleep .mq-pupil{ opacity:0; }
  .mq-sleep .mq-lid, .mq-wink .mq-lid{ opacity:1; }
  @keyframes mq-bob{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-1.6px); } }
  @keyframes mq-blink{ 0%,90%,100%{ transform:scaleY(1); } 95%{ transform:scaleY(.1); } }
  @keyframes mq-wag{ 0%,100%{ transform:rotate(0deg); } 50%{ transform:rotate(-10deg); } }
  @keyframes mq-sway{ 0%,100%{ transform:rotate(0deg); } 50%{ transform:rotate(8deg); } }
  @keyframes mq-hop{ 0%{ transform:translateY(7px) rotate(-5deg); } 55%{ transform:translateY(-6px) rotate(3deg); } 100%{ transform:translateY(0) rotate(0); } }
  @keyframes mq-fly{ 0%{ transform:translateY(10px) scale(.92); } 40%{ transform:translateY(-9px) rotate(-4deg); } 70%{ transform:translateY(-3px) rotate(2deg); } 100%{ transform:translateY(0) rotate(0); } }
  @keyframes mq-run{ 0%{ transform:translateX(-5px); } 25%{ transform:translateX(-1px) translateY(-2px); } 50%{ transform:translateX(2px); } 75%{ transform:translateX(4px) translateY(-2px); } 100%{ transform:translateX(0); } }
  @keyframes mq-legpump{ 0%,100%{ transform:skewX(0deg); } 50%{ transform:skewX(16deg); } }
  @keyframes mq-flap{ 0%{ transform:rotate(0deg); } 30%{ transform:rotate(-30deg); } 60%{ transform:rotate(8deg); } 100%{ transform:rotate(0); } }
  @keyframes mq-wink{ 0%,100%{ transform:scaleY(.1); } 45%{ transform:scaleY(1); } }
  @keyframes mq-zzz{ 0%{ transform:translate(0,0); opacity:0; } 30%{ opacity:1; } 100%{ transform:translate(4px,-9px); opacity:0; } }
  @keyframes mq-settle{ 0%{ transform:translateY(-9px) rotate(4deg); } 50%{ transform:translateY(2px) rotate(-2deg); } 100%{ transform:translateY(0) rotate(0); } }
`;

function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById('mq-styles')) return;
  const s = document.createElement('style');
  s.id = 'mq-styles';
  s.textContent = MQ_CSS;
  document.head.appendChild(s);
}

export default function MascotQuail({ size = 30 }: { size?: number }) {
  const [act, setAct] = useState<QuailMood>('idle');
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    ensureStyles();
    const h = (e: Event) => {
      setAct(((e as CustomEvent).detail as QuailMood) || 'idle');
      setNonce((n) => n + 1);
    };
    window.addEventListener('quailmood', h);
    return () => window.removeEventListener('quailmood', h);
  }, []);
  return (
    <span className={`mq mq-${act}`} aria-hidden="true" style={{ ['--mq-size' as string]: size + 'px' } as React.CSSProperties}>
      <span className="mq-hopper" key={act + '-' + nonce}>
        <svg className="mq-svg" viewBox="0 0 48 44" width={size} height={(size * 44) / 48}>
          <g className="mq-tail"><path d="M9 23 L1 17 Q2 24 4 27 Z" fill="#8a5a25" /></g>
          <ellipse cx="23" cy="25" rx="15" ry="11" fill="#c2843a" />
          <ellipse cx="21" cy="29" rx="11" ry="6.5" fill="#e7c79a" opacity="0.7" />
          <g className="mq-legs" stroke="#7c4a16" strokeWidth="1.5" strokeLinecap="round">
            <path className="mq-leg1" d="M19 35 L18 40 M18 40 L16 41 M18 40 L20 41" />
            <path className="mq-leg2" d="M26 35 L26 40 M26 40 L24 41 M26 40 L28 41" />
          </g>
          <path className="mq-wing" d="M14 21 Q24 16 33 23 Q25 28 16 26 Z" fill="#a8692c" />
          <path d="M18 23 Q24 21 30 24" stroke="#8a5a25" strokeWidth="1" fill="none" opacity="0.6" />
          <circle cx="36" cy="16" r="7.2" fill="#c98f45" />
          <path className="mq-plume" d="M37 9 Q42 2 40 9 Q44 5 41 11" stroke="#6f4519" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M43 15 L48 14.5 L43 18 Z" fill="#7c4a16" />
          <path d="M33 14 Q36 12 39 13" stroke="#a8692c" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />
          <g className="mq-eye">
            <circle cx="38" cy="15" r="2.3" fill="#fffaf2" />
            <circle className="mq-pupil" cx="38.6" cy="15" r="1.2" fill="#221603" />
          </g>
          <g className="mq-lid"><path d="M35.7 15 Q38 16.4 40.3 15" stroke="#7c4a16" strokeWidth="1.3" fill="none" strokeLinecap="round" /></g>
        </svg>
      </span>
      {act === 'sleep' && <span className="mq-zzz" aria-hidden="true">z<span>z</span></span>}
    </span>
  );
}
