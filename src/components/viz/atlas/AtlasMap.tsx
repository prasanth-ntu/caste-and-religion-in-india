// =============================================================================
// AtlasMap — a CONTROLLED, prop-driven semantic-zoom map of
// India → Tamil Nadu → Kongu → Konur.
//
// This is a presentational component: the parent owns `stageIndex` and the
// dimensions. AtlasMap fits a d3.geoMercator projection to India once, then
// animates center + scale toward `stages[stageIndex]` whenever the prop
// changes. The focal geographic point stays pinned dead-centre throughout the
// fly because we geo-interpolate the center and log-interpolate the scale, then
// rebuild `translate` to put that center at the viewport middle every frame.
//
// Visually faithful to /tmp/decoded-design-src/zoommap-mock.jsx but driven by
// the REAL repo geo + stages. No internal pan/zoom, no d3.zoom — pure tween.
//
// React 19 automatic JSX runtime: no `import React`.
// SSR-safe: a static frame for the current stageIndex renders on the server;
// rAF only runs inside effects.
// =============================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import {
  indiaStates,
  tamilNaduDistricts,
  konguDistricts,
} from '../../../data/geo/india';
import {
  stages,
  stateCapitals,
  konguDistrictPins,
  konurTemplePin,
} from '../../../data/zoom-map-stages';
import { FG, BG, TIER } from '../../../lib/chart-tokens';

// ---------------- Props ----------------
export interface AtlasMapProps {
  /** 0=india, 1=tamil-nadu, 2=kongu, 3=konur. Animate toward this stage. */
  stageIndex: number;
  theme: 'light' | 'dark';
  /** Accent hex (used for the Kongu highlight + active breadcrumb). */
  accent: string;
  /** Container width in px. */
  width: number;
  /** Container height in px. */
  height: number;
  /** Optional small breadcrumb overlay. */
  showBreadcrumb?: boolean;
}

// ---------------- Theme palettes ----------------
// `light` is the paper/ink editorial look; `dark` is dark land/sea with
// glowing strokes. Tier-green (#047857) is the canonical Kongu hue; accent is
// layered on top for the active-stage emphasis.
interface Palette {
  sea: string;
  land: string;
  landStroke: string;
  tnFill: string;
  tnStroke: string;
  konguFill: string;
  konguFillOpacity: number;
  konguStroke: string;
  capitalDot: string;
  capitalLabel: string;
  capitalHalo: string;
  konguDot: string;
  konguDotStroke: string;
  konguLabel: string;
  templeRing: string;
  chipFill: string;
  chipStroke: string;
  chipKicker: string;
  chipLabel: string;
  crumbBg: string;
  crumbText: string;
  crumbOn: string;
}

function palette(theme: 'light' | 'dark'): Palette {
  if (theme === 'dark') {
    return {
      sea: '#0b1220',
      land: '#1e293b',
      landStroke: '#334155',
      tnFill: '#27303f',
      tnStroke: '#475569',
      konguFill: TIER.green,
      konguFillOpacity: 0.32,
      konguStroke: '#34d399',
      capitalDot: '#94a3b8',
      capitalLabel: '#e2e8f0',
      capitalHalo: '#0b1220',
      konguDot: '#34d399',
      konguDotStroke: '#0b1220',
      konguLabel: '#d1fae5',
      templeRing: '#fbbf24',
      chipFill: '#1c1407',
      chipStroke: TIER.yellow,
      chipKicker: '#fcd34d',
      chipLabel: '#fde68a',
      crumbBg: 'rgba(15,23,42,0.72)',
      crumbText: '#94a3b8',
      crumbOn: '#f1f5f9',
    };
  }
  return {
    sea: '#eef4fb',
    land: '#f3eee1',
    landStroke: '#d8cdb4',
    tnFill: '#fdf6e9',
    tnStroke: '#e0cfa6',
    konguFill: '#d1fae5',
    konguFillOpacity: 1,
    konguStroke: TIER.green,
    capitalDot: FG[4],
    capitalLabel: FG[2],
    capitalHalo: BG.white,
    konguDot: TIER.green,
    konguDotStroke: BG.white,
    konguLabel: '#065f46',
    templeRing: TIER.yellow,
    chipFill: '#fff7ed',
    chipStroke: TIER.yellow,
    chipKicker: TIER.yellow,
    chipLabel: '#7c2d12',
    crumbBg: 'rgba(255,255,255,0.85)',
    crumbText: FG[4],
    crumbOn: FG[1],
  };
}

// ---------------- Stage framing ----------------
// Each stage's projection is expressed as a geographic center + a scale (plus a
// hand-tuned zoom factor `k` that drives layer fade-in, mirroring the mock).
// We fit to India / TN / Kongu boundaries respectively; konur reuses Kongu's
// framing but pushed in tight onto the temple coordinate.
interface StageFraming {
  scale: number;
  center: [number, number];
  k: number;
}

const FIT_PAD = 14;
const TEMPLE: [number, number] = [konurTemplePin.lng, konurTemplePin.lat];
// Continuous zoom factor per stage — drives layer/pin fade as `k` is
// log-interpolated mid-flight (so districts/pins pop in during the descent).
const K_BY_STAGE = [1, 6, 22, 110];

function stageFraming(
  stageIndex: number,
  width: number,
  height: number,
): StageFraming {
  const fitTarget: FeatureCollection =
    stageIndex <= 0
      ? (indiaStates as FeatureCollection)
      : stageIndex === 1
      ? (tamilNaduDistricts as FeatureCollection)
      : (konguDistricts as FeatureCollection); // kongu + konur both frame Kongu

  const proj = d3
    .geoMercator()
    .fitExtent(
      [
        [FIT_PAD, FIT_PAD],
        [width - FIT_PAD, height - FIT_PAD],
      ],
      fitTarget,
    );

  let scale = proj.scale();
  let center = (proj.invert?.([width / 2, height / 2]) ?? [82, 22]) as [
    number,
    number,
  ];

  if (stageIndex >= 3) {
    scale *= 2.4;
    center = TEMPLE;
  }

  return { scale, center, k: K_BY_STAGE[Math.min(3, Math.max(0, stageIndex))] };
}

// ---------------- Layer visibility from the continuous `k` ----------------
function visibleLayers(k: number) {
  return {
    tn: k >= 4,
    kongu: k >= 8,
    capitals: k < 4,
    konguPins: k >= 4,
    temple: k >= 8,
    districtLabels: k >= 6,
    tight: k >= 60, // close on the temple → show the kuladeivam chip
  };
}

// ---------------- Greedy label de-collision ----------------
// Keep a label only if its box clears already-kept boxes and stays in-frame.
// Dots still render for every pin; only the text is culled.
type PinTuple = [number, number, string];
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function placeLabels(
  items: PinTuple[],
  charW: number,
  h: number,
  project: (p: [number, number]) => [number, number] | null,
  width: number,
  height: number,
  reserved: Box[] = [],
): Set<string> {
  const kept = new Set<string>();
  const boxes: Box[] = reserved.slice();
  for (const [lng, lat, name] of items) {
    const p = project([lng, lat]);
    if (!p) continue;
    const w = name.length * charW;
    const box: Box = { x: p[0] + 4, y: p[1] - h / 2, w, h };
    if (box.x + box.w > width - 2 || box.y < 2 || box.y + box.h > height - 2)
      continue;
    const hit = boxes.some(
      (b) =>
        !(
          box.x > b.x + b.w + 2 ||
          box.x + box.w < b.x - 2 ||
          box.y > b.y + b.h + 2 ||
          box.y + box.h < b.y - 2
        ),
    );
    if (hit) continue;
    boxes.push(box);
    kept.add(name);
  }
  return kept;
}

// ---------------- Pin source tuples ----------------
const CAPITAL_TUPLES: PinTuple[] = stateCapitals.map((p) => [
  p.lng,
  p.lat,
  p.label,
]);
const KONGU_PIN_TUPLES: PinTuple[] = konguDistrictPins.map((p) => [
  p.lng,
  p.lat,
  p.label,
]);

const STAGE_LABELS = stages.map((s) => ({
  id: s.id,
  en: s.label.en,
  ta: s.label.ta,
}));

const TEMPLE_LABEL = konurTemplePin.label; // "Konur Kaliamman"

// ---------------- Reduced-motion probe ----------------
function reducedMotion(): boolean {
  return (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// =============================================================================
// Component
// =============================================================================
export default function AtlasMap({
  stageIndex,
  theme,
  accent,
  width,
  height,
  showBreadcrumb = false,
}: AtlasMapProps): JSX.Element {
  const W = Math.max(1, Math.round(width));
  const H = Math.max(1, Math.round(height));
  const target = Math.max(0, Math.min(stages.length - 1, Math.round(stageIndex)));

  const pal = useMemo(() => palette(theme), [theme]);

  // Precompute the four stage framings once per size.
  const framings = useMemo(
    () => stages.map((_s, i) => stageFraming(i, W, H)),
    [W, H],
  );

  // `pos` — fractional position along the descent (0=india … 3=konur). On the
  // server (and first client render) this equals `target`, giving a correct
  // static frame. On the client, an effect tweens it toward `target`.
  const [pos, setPos] = useState<number>(target);
  const posRef = useRef<number>(target);
  const rafRef = useRef<number>(0);
  const mountedRef = useRef(false);

  // Tween `pos` toward `target` whenever the stage changes (client only).
  useEffect(() => {
    mountedRef.current = true;
    const from = posRef.current;
    if (reducedMotion() || from === target) {
      posRef.current = target;
      setPos(target);
      return;
    }
    const dist = Math.abs(target - from);
    const dur = Math.min(1200, 380 + dist * 320); // ~700ms for a single step
    const t0 =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const ease = (x: number) => 1 - Math.pow(1 - x, 3); // ease-out cubic
    cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const e = Math.min(1, (now - t0) / dur);
      const v = from + (target - from) * ease(e);
      posRef.current = v;
      setPos(v);
      if (e < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // Cleanup any in-flight frame on unmount.
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // ---------------- Per-frame projection ----------------
  // Interpolate framing between the two bracketing stage targets, then rebuild
  // a fresh projection so `center` lands at the viewport middle this frame.
  const frame = useMemo(() => {
    const last = stages.length - 1;
    const i0 = Math.max(0, Math.min(last, Math.floor(pos)));
    const i1 = Math.min(last, i0 + 1);
    const f = pos - i0;
    const a = framings[i0];
    const b = framings[i1];
    const lerp = (p: number, q: number) => p + (q - p) * f;
    const loglerp = (p: number, q: number) =>
      Math.exp(Math.log(p) + (Math.log(q) - Math.log(p)) * f);

    const scale = loglerp(a.scale, b.scale);
    const center: [number, number] = [
      lerp(a.center[0], b.center[0]),
      lerp(a.center[1], b.center[1]),
    ];
    const k = loglerp(a.k, b.k);

    const proj = d3
      .geoMercator()
      .scale(scale)
      .center(center)
      .translate([W / 2, H / 2]);
    const path = d3.geoPath(proj);
    const project = (p: [number, number]) => proj(p) as [number, number] | null;

    return { proj, path, project, k };
  }, [pos, framings, W, H]);

  const { path, project, k } = frame;
  const layers = visibleLayers(k);

  // ---------------- Label de-collision passes ----------------
  const capKeep = useMemo(
    () =>
      layers.capitals
        ? placeLabels(CAPITAL_TUPLES, 4.6, 11, project, W, H)
        : new Set<string>(),
    [layers.capitals, project, W, H],
  );

  // Reserve the temple chip footprint first so district labels (esp. Erode,
  // whose box overlaps Konur) yield to it rather than colliding.
  const templeP = layers.temple ? project(TEMPLE) : null;
  const chipW = TEMPLE_LABEL.length * 7 + 22;
  const templeBoxes: Box[] =
    layers.tight && templeP
      ? [{ x: templeP[0] - chipW / 2, y: templeP[1] - 30 - 12, w: chipW, h: 23 }]
      : [];

  const distKeep = useMemo(
    () =>
      layers.districtLabels
        ? placeLabels(
            KONGU_PIN_TUPLES,
            5.2,
            12,
            project,
            W,
            H,
            templeBoxes,
          )
        : new Set<string>(),
    // templeBoxes depends on project/layers already; recompute when those change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layers.districtLabels, layers.tight, project, W, H],
  );

  const glowId = 'atlas-konur-glow';
  const strokeNarrow = k < 2 ? 0.6 : 0.4;

  // ---------------- Render ----------------
  return (
    <div
      className="atlas-map"
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <style>{`
        .atlas-map { line-height: 0; }
        .atlas-map svg { display: block; user-select: none; }
        .atlas-cap { font-size: 9px; }
        .atlas-dist { font-size: 8px; font-weight: 500; }
        .atlas-crumb {
          position: absolute; left: 10px; top: 10px;
          display: flex; align-items: center; gap: 6px;
          padding: 5px 10px; border-radius: 9999px;
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 11px; line-height: 1; letter-spacing: 0.01em;
          backdrop-filter: blur(4px); pointer-events: none;
        }
        .atlas-crumb .sep { opacity: 0.5; }
      `}</style>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        role="img"
        aria-label="Semantic-zoom map from India to Tamil Nadu to Kongu Nadu to Konur"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter
            id={glowId}
            x="-60%"
            y="-60%"
            width="220%"
            height="220%"
          >
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sea */}
        <rect x={0} y={0} width={W} height={H} fill={pal.sea} />

        {/* India states (always) */}
        <g aria-label="India states" style={{ pointerEvents: 'none' }}>
          {(indiaStates.features as Feature<Geometry, any>[]).map((feat, i) => (
            <path
              key={`state-${i}`}
              d={path(feat as any) || ''}
              fill={pal.land}
              stroke={pal.landStroke}
              strokeWidth={strokeNarrow}
              filter={theme === 'dark' ? `url(#${glowId})` : undefined}
            />
          ))}
        </g>

        {/* Tamil Nadu districts (stage ≥ 1) */}
        {layers.tn && (
          <g aria-label="Tamil Nadu districts" style={{ pointerEvents: 'none' }}>
            {(tamilNaduDistricts.features as Feature<Geometry, any>[]).map(
              (feat, i) => (
                <path
                  key={`tn-${i}`}
                  d={path(feat as any) || ''}
                  fill={pal.tnFill}
                  stroke={pal.tnStroke}
                  strokeWidth={0.5}
                />
              ),
            )}
          </g>
        )}

        {/* Kongu districts highlighted (stage ≥ 2). Accent-tinted stroke. */}
        {layers.kongu && (
          <g aria-label="Kongu Nadu districts" style={{ pointerEvents: 'none' }}>
            {(konguDistricts.features as Feature<Geometry, any>[]).map(
              (feat, i) => (
                <path
                  key={`kongu-${i}`}
                  d={path(feat as any) || ''}
                  fill={pal.konguFill}
                  fillOpacity={pal.konguFillOpacity}
                  stroke={accent || pal.konguStroke}
                  strokeWidth={1}
                />
              ),
            )}
          </g>
        )}

        {/* State capitals (stage 0–1, fades at k≥4) */}
        {layers.capitals && (
          <g aria-label="State capitals">
            {CAPITAL_TUPLES.map(([lng, lat, name], i) => {
              const p = project([lng, lat]);
              if (!p) return null;
              return (
                <g key={`cap-${i}`}>
                  <circle cx={p[0]} cy={p[1]} r={2.6} fill={pal.capitalDot} />
                  {capKeep.has(name) && (
                    <text
                      className="atlas-cap"
                      x={p[0] + 4}
                      y={p[1] + 3}
                      fill={pal.capitalLabel}
                      paintOrder="stroke"
                      stroke={pal.capitalHalo}
                      strokeWidth={2}
                    >
                      {name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* Kongu district pins (stage ≥ 1) */}
        {layers.konguPins && (
          <g aria-label="Kongu district centers">
            {KONGU_PIN_TUPLES.map(([lng, lat, name], i) => {
              const p = project([lng, lat]);
              if (!p) return null;
              return (
                <g key={`kp-${i}`}>
                  <circle
                    cx={p[0]}
                    cy={p[1]}
                    r={3}
                    fill={pal.konguDot}
                    stroke={pal.konguDotStroke}
                    strokeWidth={1}
                  />
                  {layers.districtLabels && distKeep.has(name) && (
                    <text
                      className="atlas-dist"
                      x={p[0] + 5}
                      y={p[1] + 3}
                      fill={pal.konguLabel}
                      paintOrder="stroke"
                      stroke={pal.capitalHalo}
                      strokeWidth={1.5}
                    >
                      {name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* Konur temple pin (stage 3 region, k≥8) + kuladeivam chip when tight */}
        {layers.temple &&
          templeP &&
          (() => {
            const tight = layers.tight;
            return (
              <g aria-label="Konur Kaliamman temple">
                <circle
                  cx={templeP[0]}
                  cy={templeP[1]}
                  r={tight ? 16 : 9}
                  fill="none"
                  stroke={pal.templeRing}
                  strokeWidth={1.4}
                  strokeOpacity={0.55}
                  filter={theme === 'dark' ? `url(#${glowId})` : undefined}
                />
                <text
                  x={templeP[0]}
                  y={templeP[1] + (tight ? 6 : 5)}
                  textAnchor="middle"
                  fontSize={tight ? 22 : 15}
                >
                  🪔
                </text>
                {tight && (
                  <g transform={`translate(${templeP[0]},${templeP[1] - 30})`}>
                    <rect
                      x={-chipW / 2}
                      y={-12}
                      width={chipW}
                      height={23}
                      rx={11.5}
                      fill={pal.chipFill}
                      stroke={pal.chipStroke}
                      strokeWidth={1.3}
                    />
                    <text
                      x={0}
                      y={-2.5}
                      textAnchor="middle"
                      fontSize={7.5}
                      fontWeight={700}
                      letterSpacing="0.08em"
                      fill={pal.chipKicker}
                      fontFamily="var(--font-sans, system-ui, sans-serif)"
                    >
                      KULADEIVAM · Konur Kaliamman
                    </text>
                    <text
                      x={0}
                      y={7}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={700}
                      fill={pal.chipLabel}
                      fontFamily="var(--font-sans, system-ui, sans-serif)"
                    >
                      {TEMPLE_LABEL}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}
      </svg>

      {showBreadcrumb && (
        <div
          className="atlas-crumb"
          style={{ background: pal.crumbBg, color: pal.crumbText }}
        >
          {STAGE_LABELS.map((s, i) => {
            const on = i === target;
            return (
              <span key={s.id} style={{ display: 'flex', gap: 6 }}>
                <span
                  style={{
                    color: on ? accent || pal.crumbOn : pal.crumbText,
                    fontWeight: on ? 700 : 400,
                  }}
                >
                  {s.en}
                </span>
                {i < STAGE_LABELS.length - 1 && (
                  <span className="sep" aria-hidden="true">
                    ›
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
