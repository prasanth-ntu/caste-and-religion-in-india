import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import {
  indiaStates,
  tamilNaduDistricts,
  konguDistricts,
} from '../../data/geo/india';
import {
  stages,
  stagesById,
  stateCapitals,
  konguDistrictPins,
  konurTemplePin,
  type StageId,
  type ZoomStage,
} from '../../data/zoom-map-stages';

// ---------------- Constants ----------------
const SCALE_EXTENT: [number, number] = [0.8, 200];
// Round to fixed precision so SSR and client render byte-identical transform
// strings (avoids React hydration mismatches from JS float drift).
function fxy(xy: [number, number]): [number, number] {
  return [Math.round(xy[0] * 1000) / 1000, Math.round(xy[1] * 1000) / 1000];
}

const KONGU_NAMES = new Set([
  'Coimbatore',
  'Erode',
  'Salem',
  'Namakkal',
  'Karur',
  'Dindigul',
  'Dharmapuri',
]);

// Stage-driven layer visibility thresholds (use d3.zoom k scalar).
function visibleLayers(k: number) {
  return {
    statesFill: true, // always show country/state outlines
    tnDistricts: k >= 4, // pop in around Tamil Nadu zoom
    konguDistricts: k >= 8, // pop in around Kongu zoom
    capitals: k < 4,
    konguPins: k >= 4,
    templePin: k >= 8,
    districtLabels: k >= 6,
  };
}

// Choose nearest stage given current k.
function nearestStage(k: number): StageId {
  // Snap thresholds: arrange ascending zoom.
  if (k < 3) return 'india';
  if (k < 8) return 'tamil-nadu';
  if (k < 40) return 'kongu';
  return 'konur';
}

interface ZoomMapProps {
  height?: number; // optional explicit height for SSR / testing
}

export default function ZoomMap({ height: heightProp }: ZoomMapProps = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const reducedMotionRef = useRef(false);

  const [size, setSize] = useState({ width: 800, height: 600 });
  const [activeStage, setActiveStage] = useState<StageId>('india');
  const [currentK, setCurrentK] = useState(1);
  const [showTemplePopover, setShowTemplePopover] = useState(false);
  // Defer SVG rendering until after mount; avoids hydration mismatch from
  // tiny float precision differences in projection output between Node and
  // the browser.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // ---------------- Responsive sizing ----------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Detect reduced motion once.
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    const compute = (w: number) => {
      let h: number;
      if (heightProp) h = heightProp;
      else if (w >= 1024) h = 600;
      else if (w >= 640) h = 500;
      else h = 400;
      setSize({ width: Math.max(320, Math.floor(w)), height: h });
    };

    compute(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) compute(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [heightProp]);

  // ---------------- Projection ----------------
  // We fit the projection ONCE to all-India (k=1 in d3.zoom space). Then d3.zoom
  // transforms (translate + scale) are applied to the parent <g>. This keeps
  // path rendering cheap and lets d3.zoom own the math.
  const projection = useMemo(() => {
    const p = d3.geoMercator();
    // fit at our current SVG size to India bounding box.
    p.fitSize([size.width, size.height], indiaStates as FeatureCollection);
    return p;
  }, [size.width, size.height]);

  const pathGen = useMemo(() => d3.geoPath(projection), [projection]);

  // ---------------- d3.zoom setup ----------------
  useEffect(() => {
    if (!mounted) return;
    const svg = d3.select(svgRef.current!);
    const g = d3.select(gRef.current!);
    if (!svg.node() || !g.node()) return;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent(SCALE_EXTENT)
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
        const k = event.transform.k;
        setCurrentK(k);
        setActiveStage(nearestStage(k));
      });
    zoomBehaviorRef.current = zoom;

    svg.call(zoom);
    // On mobile, allow native vertical scrolling via touch-action; d3.zoom
    // still receives pinch + drag. The CSS rule below permits pan-y plus
    // pinch-zoom for the SVG specifically.

    return () => {
      svg.on('.zoom', null);
    };
  }, [projection, mounted]);

  // ---------------- Snap to stage ----------------
  const snapToStage = useCallback(
    (stage: ZoomStage, animate = true) => {
      const svg = d3.select(svgRef.current!);
      const zoom = zoomBehaviorRef.current;
      if (!svg.node() || !zoom) return;

      // We want the screen point at (W/2, H/2) to show stage.center at scale k.
      // d3.zoom transform: screen = k * projected + translate
      // So translate = [W/2 - k*px, H/2 - k*py] where [px,py] = projection(center)
      const projected = projection(stage.center);
      if (!projected) return;
      const k = stage.zoom;
      const tx = size.width / 2 - k * projected[0];
      const ty = size.height / 2 - k * projected[1];
      const t = d3.zoomIdentity.translate(tx, ty).scale(k);

      const sel = animate && !reducedMotionRef.current ? svg.transition().duration(750) : svg;
      (sel as any).call(zoom.transform, t);
      setActiveStage(stage.id);
      if (stage.id !== 'konur') setShowTemplePopover(false);
    },
    [projection, size.width, size.height],
  );

  // Initial position once projection/size ready.
  useEffect(() => {
    if (!mounted || !zoomBehaviorRef.current) return;
    snapToStage(stagesById[activeStage], false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection, mounted]);

  // Reset to currently active stage.
  const resetToStage = useCallback(() => {
    snapToStage(stagesById[activeStage], true);
  }, [activeStage, snapToStage]);

  // ---------------- Visibility per current k ----------------
  const layers = visibleLayers(currentK);

  // ---------------- Render ----------------
  return (
    <div ref={containerRef} className="relative w-full">
      {/* Stage controls */}
      <div
        className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2"
        role="tablist"
        aria-label="Zoom stages"
      >
        {stages.map((s) => {
          const active = s.id === activeStage;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-pressed={active}
              aria-selected={active}
              onClick={() => snapToStage(s, true)}
              className={[
                'inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'border-rose-300 bg-rose-100 text-rose-900 shadow-sm'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100',
              ].join(' ')}
            >
              <span>{s.label.en}</span>
              <span className="ml-1.5 font-tamil text-xs text-stone-500">{s.label.ta}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={resetToStage}
          className="ml-auto col-span-2 inline-flex items-center justify-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 sm:col-span-1"
          aria-label="Reset map to current stage"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>
          Reset
        </button>
      </div>

      {/* Map SVG */}
      <div
        className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 shadow-inner"
        style={{ height: size.height }}
      >
        {!mounted && (
          <div className="flex h-full items-center justify-center text-sm text-stone-400">
            Loading map…
          </div>
        )}
        {mounted && (
        <svg
          ref={svgRef}
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          role="img"
          aria-label="Semantic-zoom map from India to Tamil Nadu to Kongu Nadu to Konur"
          className="block touch-pan-y touch-pinch-zoom select-none"
          style={{ touchAction: 'pan-y pinch-zoom' }}
        >
          <defs>
            <filter id="konur-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g ref={gRef}>
            {/* India outline / state fill */}
            <g aria-label="India states" style={{ pointerEvents: 'none' }}>
              {(indiaStates.features as Feature<Geometry, any>[]).map((f, i) => {
                const isTN = f.properties?.name === 'Tamil Nadu';
                return (
                  <path
                    key={`state-${i}`}
                    d={pathGen(f as any) || ''}
                    fill={isTN ? '#fef3c7' : '#fafaf9'}
                    stroke="#a8a29e"
                    strokeWidth={0.6 / currentK}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </g>

            {/* Tamil Nadu districts */}
            {layers.tnDistricts && (
              <g aria-label="Tamil Nadu districts" style={{ pointerEvents: 'none' }}>
                {(tamilNaduDistricts.features as Feature<Geometry, any>[]).map((f, i) => {
                  const isKongu = KONGU_NAMES.has(f.properties?.name);
                  return (
                    <path
                      key={`tn-${i}`}
                      d={pathGen(f as any) || ''}
                      fill={isKongu ? '#fde68a' : 'transparent'}
                      stroke="#92400e"
                      strokeOpacity={0.45}
                      strokeWidth={0.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </g>
            )}

            {/* Kongu districts (highlighted). pointer-events: none so the
                Konur temple pin above stays clickable through the district. */}
            {layers.konguDistricts && (
              <g aria-label="Kongu Nadu districts" style={{ pointerEvents: 'none' }}>
                {(konguDistricts.features as Feature<Geometry, any>[]).map((f, i) => (
                  <path
                    key={`kongu-${i}`}
                    d={pathGen(f as any) || ''}
                    fill="#fcd34d"
                    fillOpacity={0.55}
                    stroke="#b45309"
                    strokeWidth={0.8}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            )}

            {/* Capital pins (low zoom only) */}
            {layers.capitals && (
              <g aria-label="State capitals">
                {stateCapitals.map((p) => {
                  const xy = projection([p.lng, p.lat]);
                  if (!xy) return null;
                  return (
                    <g key={`cap-${p.label}`} transform={`translate(${xy[0]},${xy[1]})`}>
                      <circle r={3 / currentK} fill="#57534e" stroke="#fff" strokeWidth={0.5 / currentK} />
                      <text
                        x={5 / currentK}
                        y={3 / currentK}
                        fontSize={9 / currentK}
                        fill="#44403c"
                        paintOrder="stroke"
                        stroke="#fff"
                        strokeWidth={2 / currentK}
                      >
                        {p.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Kongu district pins */}
            {layers.konguPins && (
              <g aria-label="Kongu district centers">
                {konguDistrictPins.map((p) => {
                  const xy = projection([p.lng, p.lat]);
                  if (!xy) return null;
                  return (
                    <g key={`kp-${p.label}`} transform={`translate(${xy[0]},${xy[1]})`}>
                      <circle r={2.2 / currentK} fill="#92400e" stroke="#fff" strokeWidth={0.4 / currentK} />
                      {layers.districtLabels && (
                        <text
                          x={4 / currentK}
                          y={3 / currentK}
                          fontSize={7 / currentK}
                          fill="#78350f"
                          fontWeight={500}
                          paintOrder="stroke"
                          stroke="#fff"
                          strokeWidth={1.5 / currentK}
                        >
                          {p.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {/* Konur Kaliamman temple — pulsing rose pin */}
            {layers.templePin && (() => {
              const xy = projection([konurTemplePin.lng, konurTemplePin.lat]);
              if (!xy) return null;
              return (
                <g
                  transform={`translate(${xy[0]},${xy[1]})`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${konurTemplePin.label} temple — open details`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTemplePopover((v) => !v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowTemplePopover((v) => !v);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Invisible hit area — gives a reliable click/tap target
                      around the small pin glyph for both pointer and touch.
                      pointerEvents=all so SVG's default visiblePainted model
                      doesn't ignore the transparent fill. */}
                  <circle r={30 / currentK} fill="transparent" style={{ pointerEvents: 'all' }} />
                  {/* Pulsing halo (CSS animation disabled by prefers-reduced-motion via class). */}
                  <circle
                    r={6 / currentK}
                    fill="#f43f5e"
                    fillOpacity={0.25}
                    className="motion-safe:animate-ping"
                    style={{ pointerEvents: 'none' }}
                  />
                  <circle
                    r={3 / currentK}
                    fill="#f43f5e"
                    stroke="#fff"
                    strokeWidth={0.6 / currentK}
                    filter="url(#konur-glow)"
                  />
                  <text
                    x={5 / currentK}
                    y={-4 / currentK}
                    fontSize={8 / currentK}
                    fontWeight={700}
                    fill="#9f1239"
                    paintOrder="stroke"
                    stroke="#fff"
                    strokeWidth={2 / currentK}
                  >
                    ★ {konurTemplePin.label}
                  </text>
                </g>
              );
            })()}
          </g>
        </svg>
        )}

        {/* Stage description overlay */}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2 text-xs">
          <div className="pointer-events-auto max-w-[28rem] rounded-lg bg-white/85 px-3 py-2 backdrop-blur-sm">
            <p className="font-medium text-stone-900">
              {stagesById[activeStage].label.en}{' '}
              <span className="font-tamil text-stone-500">{stagesById[activeStage].label.ta}</span>
            </p>
            <p className="mt-0.5 text-stone-600">{stagesById[activeStage].description}</p>
          </div>
          <div className="pointer-events-auto rounded-md bg-white/85 px-2 py-1 font-mono text-[10px] text-stone-500 backdrop-blur-sm">
            zoom {currentK.toFixed(1)}×
          </div>
        </div>

        {/* Konur temple popover */}
        {showTemplePopover && layers.templePin && (
          <KonurPopover onClose={() => setShowTemplePopover(false)} />
        )}
      </div>

      {/* Breadcrumb */}
      <nav
        aria-label="Lineage breadcrumb"
        className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600"
      >
        {stages.map((s, i) => (
          <span key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => snapToStage(s, true)}
              className={[
                'rounded px-1 py-0.5 transition-colors',
                s.id === activeStage
                  ? 'font-semibold text-stone-900 underline decoration-rose-400 decoration-2 underline-offset-4'
                  : 'hover:text-stone-900',
              ].join(' ')}
            >
              {s.label.en}
            </button>
            {i < stages.length - 1 && <span aria-hidden="true" className="text-stone-400">›</span>}
          </span>
        ))}
        {activeStage === 'konur' && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-900">
            <span aria-hidden="true">★</span> Kuladeivam: Konur Kaliamman
          </span>
        )}
      </nav>
    </div>
  );
}

// ---------------- Popover ----------------
function KonurPopover({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="absolute right-3 top-3 z-10 w-64 rounded-xl border border-rose-200 bg-white p-4 text-sm shadow-2xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">
            Kuladeivam
          </p>
          <h3 className="mt-0.5 text-base font-bold text-stone-900">{konurTemplePin.label}</h3>
          <p className="font-tamil text-sm text-stone-600">{konurTemplePin.labelTa}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-900"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-y-1 text-xs">
        <dt className="text-stone-500">Village</dt>
        <dd className="col-span-2 text-stone-800">Konur, Namakkal dist.</dd>
        <dt className="text-stone-500">Deity</dt>
        <dd className="col-span-2 text-stone-800">Kaliamman (காளியம்மன்)</dd>
        <dt className="text-stone-500">Kootam</dt>
        <dd className="col-span-2 text-stone-800">Kadai (quail / காடை)</dd>
      </dl>
      <a
        href={konurTemplePin.href}
        className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
      >
        Read the temple page
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </a>
    </div>
  );
}
