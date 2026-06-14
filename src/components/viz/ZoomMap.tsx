import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import {
  indiaStates,
  tamilNaduDistricts,
  konguDistricts,
} from '../../data/geo/india';
import {
  stateCapitals,
  konguDistrictPins,
  konurTemplePin,
  buildStagesForKootam,
  type KootamStageBundle,
  type StageId,
  type ZoomStage,
} from '../../data/zoom-map-stages';
import {
  readCurrentSlug,
  subscribeLineageChange,
  manifest,
} from '../../lib/lineage-selection';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { prefersReducedMotion } from '../../lib/chart-motion';
import { CHART, FG, BG } from '../../lib/chart-tokens';

// ---------------- Constants ----------------
const SCALE_EXTENT: [number, number] = [0.8, 200];
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

// Choose nearest stage given current k, aware of whether the konur stage exists.
function nearestStageId(k: number, hasVillageStage: boolean): StageId {
  if (k < 3) return 'india';
  if (k < 8) return 'tamil-nadu';
  if (k < 40) return 'kongu';
  return hasVillageStage ? 'konur' : 'kongu';
}

interface ZoomMapProps {
  height?: number; // optional explicit height for SSR / testing
  /** Optional id applied to the chart root. Used by `ChartSkeleton` to detect
   *  hydration via `data-hydrated="true"` and auto-hide its placeholder. */
  id?: string;
}

export default function ZoomMap({ height: heightProp, id }: ZoomMapProps = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const reducedMotionRef = useRef(false);

  // Shared sizing — single ResizeObserver on the container. Keep ZoomMap's own
  // 400/500/600 height tiers keyed off width (aspect would not match them), so
  // we don't pass `aspect` and derive `size` below.
  const { ref: dimRef, width: measuredWidth, measured } = useChartDimensions({
    breakpoint: 640,
    initialWidth: 800,
  });
  const setContainerRef = (el: HTMLDivElement | null) => {
    containerRef.current = el;
    dimRef.current = el;
  };

  // Hydration sentinel — see ChartSkeleton.astro. Now gated on first real
  // measurement so the skeleton hides once the chart has dimensions.
  useEffect(() => {
    if (measured) dimRef.current?.setAttribute('data-hydrated', 'true');
  }, [measured, dimRef]);

  // Detect reduced motion once (shared helper).
  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion();
  }, []);

  // Derive responsive size from the measured width, preserving the prior tiers.
  const size = useMemo(() => {
    const w = Math.max(320, Math.floor(measuredWidth));
    let h: number;
    if (heightProp) h = heightProp;
    else if (w >= 1024) h = 600;
    else if (w >= 640) h = 500;
    else h = 400;
    return { width: w, height: h };
  }, [measuredWidth, heightProp]);

  const [activeStage, setActiveStage] = useState<StageId>('india');
  const [currentK, setCurrentK] = useState(1);
  const [showTemplePopover, setShowTemplePopover] = useState(false);

  // ---------------- Lineage bundle (reactive) ----------------
  const [bundle, setBundle] = useState<KootamStageBundle>(() => buildStagesForKootam(null));

  // Subscribe to lineage changes (dropdown on /lineage/ page).
  useEffect(() => {
    const update = () => {
      const slug = readCurrentSlug();
      const entry = manifest.find((m) => m.slug === slug) ?? null;
      const newBundle = buildStagesForKootam(entry);
      setBundle((prev) => {
        // If current activeStage is no longer present in new bundle, snap to final.
        setActiveStage((currentActive) => {
          const stillValid = newBundle.stages.some((s) => s.id === currentActive);
          if (!stillValid) {
            const fallback = newBundle.stages[newBundle.stages.length - 1];
            // We'll snap to the fallback stage below via a side-effect triggered by bundle change.
            return fallback.id;
          }
          return currentActive;
        });
        return newBundle;
      });
    };
    update(); // initial
    return subscribeLineageChange(update);
  }, []);

  // When bundle changes, snap to the last stage if the current active stage is no longer valid.
  const prevBundleRef = useRef<KootamStageBundle | null>(null);
  useEffect(() => {
    if (!prevBundleRef.current) {
      prevBundleRef.current = bundle;
      return;
    }
    const prevStages = prevBundleRef.current.stages;
    prevBundleRef.current = bundle;

    // Check if the active stage still exists in the new bundle.
    const stillValid = bundle.stages.some((s) => s.id === activeStage);
    if (!stillValid) {
      const fallback = bundle.stages[bundle.stages.length - 1];
      setActiveStage(fallback.id);
      snapToStageRef.current?.(fallback, true);
    } else if (activeStage === 'konur') {
      // User was parked at village stage; if the new bundle has a village stage, snap to it.
      const newFinal = bundle.stages[bundle.stages.length - 1];
      snapToStageRef.current?.(newFinal, true);
    }

    // Close temple popover if there's no temple pin now.
    if (!bundle.templePin) {
      setShowTemplePopover(false);
    }
  }, [bundle]);

  // ---------------- Story mode (auto-advance) ----------------
  const [playing, setPlaying] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const storyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const STORY_DWELL_MS = 4000;
  // Defer SVG rendering until after mount; avoids hydration mismatch from
  // tiny float precision differences in projection output between Node and
  // the browser.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Stable ref to snapToStage for use in effects where snapToStage isn't yet defined.
  const snapToStageRef = useRef<((stage: ZoomStage, animate?: boolean) => void) | null>(null);

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
        // Access bundle via ref to get latest value without recreating the zoom behavior.
        setBundle((currentBundle) => {
          const hasVillage = currentBundle.stages.some((s) => s.id === 'konur');
          setActiveStage(nearestStageId(k, hasVillage));
          return currentBundle;
        });
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

  // Keep the ref in sync so bundle-change effects can call it.
  useEffect(() => {
    snapToStageRef.current = snapToStage;
  }, [snapToStage]);

  // Initial position once projection/size ready.
  useEffect(() => {
    if (!mounted || !zoomBehaviorRef.current) return;
    const currentStage =
      bundle.stages.find((s) => s.id === activeStage) ?? bundle.stages[0];
    snapToStage(currentStage, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection, mounted]);

  // Reset to currently active stage.
  const resetToStage = useCallback(() => {
    const currentStage =
      bundle.stages.find((s) => s.id === activeStage) ?? bundle.stages[0];
    snapToStage(currentStage, true);
  }, [activeStage, bundle, snapToStage]);

  // ---------------- Story-mode controls ----------------
  const toggleStory = useCallback(() => {
    const currentStages = bundle.stages;
    // Reduced motion: don't auto-advance. Jump straight to the last stage.
    if (reducedMotionRef.current) {
      const last = currentStages[currentStages.length - 1];
      setStoryIndex(currentStages.length - 1);
      setCompleted(true);
      setPlaying(false);
      snapToStage(last, false);
      return;
    }
    if (playing) {
      setPlaying(false);
      return;
    }
    // Starting fresh or replaying after completion.
    if (completed) {
      setStoryIndex(0);
      setCompleted(false);
      snapToStage(currentStages[0], true);
    } else {
      // Begin from current storyIndex; snap to that stage to align.
      snapToStage(currentStages[storyIndex] ?? currentStages[0], true);
    }
    setPlaying(true);
  }, [playing, completed, storyIndex, snapToStage, bundle]);

  // Advance through stages while playing (and not hover-paused).
  useEffect(() => {
    if (!playing || hoverPaused) return;
    const currentStages = bundle.stages;
    if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
    storyTimerRef.current = setTimeout(() => {
      const next = storyIndex + 1;
      if (next >= currentStages.length) {
        // Reached the end.
        setPlaying(false);
        setCompleted(true);
        return;
      }
      setStoryIndex(next);
      snapToStage(currentStages[next], true);
    }, STORY_DWELL_MS);
    return () => {
      if (storyTimerRef.current) {
        clearTimeout(storyTimerRef.current);
        storyTimerRef.current = null;
      }
    };
  }, [playing, hoverPaused, storyIndex, snapToStage, bundle]);

  // Cleanup timer on unmount.
  useEffect(() => {
    return () => {
      if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
    };
  }, []);

  const currentStages = bundle.stages;
  const storyButtonLabel = playing ? '⏸ Pause' : completed ? '▶ Replay' : '▶ Tell me the story';
  const storyCaption =
    currentStages[storyIndex]?.narrativeCaption ?? currentStages[storyIndex]?.description ?? '';
  const captionVisible = playing || (completed && storyIndex === currentStages.length - 1);

  // Active stage object (fall back to first stage if id not in current bundle).
  const activeStageObj =
    bundle.stages.find((s) => s.id === activeStage) ?? bundle.stages[0];

  // ---------------- Visibility per current k ----------------
  const layers = visibleLayers(currentK);

  // ---------------- Render ----------------
  return (
    <div ref={setContainerRef} id={id} className="relative w-full">
      {/* Stage controls */}
      <div
        className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2"
        role="tablist"
        aria-label="Zoom stages"
      >
        {currentStages.map((s) => {
          const active = s.id === activeStage;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-pressed={active}
              aria-selected={active}
              onClick={() => {
                // Manual stage selection pauses any active story playback.
                if (playing) setPlaying(false);
                snapToStage(s, true);
              }}
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

      {/* Story-mode control */}
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleStory}
          aria-pressed={playing}
          title={
            reducedMotionRef.current
              ? 'Auto-advance disabled · reduced motion is enabled'
              : undefined
          }
          className={[
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
            playing
              ? 'border-indigo-300 bg-indigo-100 text-indigo-900 shadow-sm'
              : 'border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50',
          ].join(' ')}
        >
          {storyButtonLabel}
        </button>
        {reducedMotionRef.current && (
          <span className="text-xs text-stone-500">Auto-advance disabled · reduced motion</span>
        )}
      </div>

      {/* Map SVG */}
      <div
        className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 shadow-inner"
        style={{ height: size.height }}
        data-zoom-map-story-mode={playing ? 'playing' : completed ? 'completed' : 'idle'}
        onMouseEnter={() => {
          if (playing) setHoverPaused(true);
        }}
        onMouseLeave={() => {
          if (hoverPaused) setHoverPaused(false);
        }}
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
                    fill={isTN ? '#fef3c7' : BG.paper}
                    stroke={CHART.link}
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
                temple pin above stays clickable through the district. */}
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
                      <circle r={3 / currentK} fill={FG[3]} stroke={BG.white} strokeWidth={0.5 / currentK} />
                      <text
                        x={5 / currentK}
                        y={3 / currentK}
                        fontSize={9 / currentK}
                        fill={FG[2]}
                        paintOrder="stroke"
                        stroke={BG.white}
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
                      <circle r={2.2 / currentK} fill="#92400e" stroke={BG.white} strokeWidth={0.4 / currentK} />
                      {layers.districtLabels && (
                        <text
                          x={4 / currentK}
                          y={3 / currentK}
                          fontSize={7 / currentK}
                          fill="#78350f"
                          fontWeight={500}
                          paintOrder="stroke"
                          stroke={BG.white}
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

            {/* Temple pin — pulsing rose pin. Only rendered when bundle has a templePin. */}
            {layers.templePin && bundle.templePin != null && (() => {
              const pin = bundle.templePin;
              const xy = projection([pin.lng, pin.lat]);
              if (!xy) return null;
              return (
                <g
                  transform={`translate(${xy[0]},${xy[1]})`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${pin.label} temple — open details`}
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
                    stroke={BG.white}
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
                    stroke={BG.white}
                    strokeWidth={2 / currentK}
                  >
                    ★ {pin.label}
                  </text>
                </g>
              );
            })()}
          </g>
        </svg>
        )}

        {/* Overlay chips for special bundle states */}
        {bundle.isAuthorExample && (
          <div className="pointer-events-none absolute left-3 top-3 z-10">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 shadow-sm">
              <span aria-hidden="true">★</span> Author's example — Konur, Kadai-Kootam
            </span>
          </div>
        )}
        {bundle.pendingVillage && (
          <div className="pointer-events-none absolute left-3 top-3 z-10">
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 shadow-sm">
              Your kuladeivam — {bundle.pendingVillage.deityName} ({bundle.pendingVillage.name}) — sits in Kongu Nadu. Exact pin pending.
            </span>
          </div>
        )}

        {/* Stage description overlay */}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2 text-xs">
          <div className="pointer-events-auto max-w-[28rem] rounded-lg bg-white/85 px-3 py-2 backdrop-blur-sm">
            <p className="font-medium text-stone-900">
              {activeStageObj.label.en}{' '}
              <span className="font-tamil text-stone-500">{activeStageObj.label.ta}</span>
            </p>
            <p className="mt-0.5 text-stone-600">{activeStageObj.description}</p>
          </div>
          <div className="pointer-events-auto rounded-md bg-white/85 px-2 py-1 font-mono text-[10px] text-stone-500 backdrop-blur-sm">
            zoom {currentK.toFixed(1)}×
          </div>
        </div>

        {/* Temple popover — only when bundle has a pin */}
        {showTemplePopover && layers.templePin && bundle.templePin != null && (
          <TemplePopover
            templePin={bundle.templePin}
            kootamName={bundle.kootamName}
            totemLabel={bundle.totemLabel}
            onClose={() => setShowTemplePopover(false)}
          />
        )}

        {/* Story-mode caption + progress dots */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-12 flex flex-col items-center gap-2"
          aria-hidden={!captionVisible}
        >
          <div
            key={`caption-${storyIndex}`}
            role="status"
            aria-live="polite"
            className="max-w-[70%] rounded-lg bg-stone-900/70 p-3 text-center text-[14px] leading-snug text-white shadow-lg backdrop-blur-sm transition-opacity duration-[180ms]"
            style={{ opacity: captionVisible ? 1 : 0 }}
          >
            {storyCaption}
          </div>
          {(playing || completed) && (
            <div className="flex gap-1" aria-label="Story progress">
              {currentStages.map((_s, i) => (
                <span
                  key={`dot-${i}`}
                  className={[
                    'h-2 w-2 rounded-full transition-colors',
                    i === storyIndex ? 'bg-indigo-500' : 'bg-stone-300',
                  ].join(' ')}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <nav
        aria-label="Lineage breadcrumb"
        className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600"
      >
        {currentStages.map((s, i) => (
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
            {i < currentStages.length - 1 && <span aria-hidden="true" className="text-stone-400">›</span>}
          </span>
        ))}
        {activeStage === 'konur' && bundle.templePin != null && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-900">
            <span aria-hidden="true">★</span> Kuladeivam: {bundle.templePin.label}
          </span>
        )}
      </nav>
    </div>
  );
}

// ---------------- Popover ----------------
interface TemplePopoverProps {
  templePin: typeof konurTemplePin;
  kootamName?: string;
  totemLabel?: string;
  onClose: () => void;
}

function TemplePopover({ templePin, kootamName, totemLabel, onClose }: TemplePopoverProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const villageDisplay = templePin.villageTa
    ? `${templePin.village} (${templePin.villageTa})`
    : templePin.village;
  const deityDisplay = templePin.deityTa
    ? `${templePin.deity} (${templePin.deityTa})`
    : templePin.deity;
  const kootamDisplay = kootamName && totemLabel
    ? `${kootamName} — ${totemLabel}`
    : kootamName ?? '';

  return (
    <div className="absolute right-3 top-3 z-10 w-64 rounded-xl border border-rose-200 bg-white p-4 text-sm shadow-2xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">
            Kuladeivam
          </p>
          <h3 className="mt-0.5 text-base font-bold text-stone-900">{templePin.label}</h3>
          <p className="font-tamil text-sm text-stone-600">{templePin.labelTa}</p>
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
        <dd className="col-span-2 text-stone-800">{villageDisplay}</dd>
        <dt className="text-stone-500">Deity</dt>
        <dd className="col-span-2 text-stone-800">{deityDisplay}</dd>
        {kootamDisplay && (
          <>
            <dt className="text-stone-500">Kootam</dt>
            <dd className="col-span-2 text-stone-800">{kootamDisplay}</dd>
          </>
        )}
      </dl>
      <a
        href={templePin.href}
        className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
      >
        Read the temple page
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </a>
    </div>
  );
}
