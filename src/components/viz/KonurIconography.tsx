import { useCallback, useEffect, useState } from 'react';
import { useChartDimensions } from '../../hooks/useChartDimensions';
import { useInView } from '../../hooks/useInView';
import { FG } from '../../lib/chart-tokens';

interface IconHotspot {
  id: string;
  x: number;
  y: number;
  label: { en: string; ta: string };
  body: string;
}

const ICON_HOTSPOTS: IconHotspot[] = [
  {
    id: 'crown',
    x: 500,
    y: 260,
    label: { en: 'Karagam / crown', ta: 'கரகம்' },
    body:
      'A decorated pot or crown (கரகம்) sits atop the goddess in many Amman processions. In village-Amman traditions, the karagam is sometimes the goddess herself, carried in procession.',
  },
  {
    id: 'trident',
    x: 345,
    y: 360,
    label: { en: 'Trishul / trident', ta: 'திரிசூலம்' },
    body:
      'The trident (திரிசூலம்) is associated with the Shakta tradition and the destruction of evil. In village Kaliamman shrines it is often planted in the ground beside the deity, sometimes as the primary aniconic form.',
  },
  {
    id: 'tongue',
    x: 500,
    y: 350,
    label: { en: 'Protruding tongue / features', ta: 'நீட்டிய நாக்கு / திருமுகம்' },
    body:
      'The Kali iconography includes a protruding tongue, conventionally interpreted as a sign of momentary restraint after a fierce act. Kaliamman shrines often soften this — Kaliamman is the village mother form, not the Mahakali warrior form.',
  },
  {
    id: 'neem',
    x: 660,
    y: 355,
    label: { en: 'Neem branch', ta: 'வேப்பிலை' },
    body:
      'Neem (வேப்பிலை) is offered at Amman shrines; the leaves are anti-microbial and traditionally hung at the doorway during pox outbreaks. The rational basis here is genuine — neem has documented anti-pathogenic properties.',
  },
  {
    id: 'turmeric',
    x: 500,
    y: 885,
    label: { en: 'Turmeric / kumkum', ta: 'மஞ்சள் / குங்குமம்' },
    body:
      'Turmeric (மஞ்சள்) and kumkum are central offerings. Turmeric has documented antiseptic properties; in village-shrine logic the offering also doubles as healing material for devotees.',
  },
];

const pulseStyles = `
@keyframes ping-slow-rose {
  0% { transform: scale(1); opacity: 0.85; }
  70% { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
}
.animate-ping-slow-rose {
  animation: ping-slow-rose 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
}
`;

export default function KonurIconography({ id }: { id?: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Shared sizing foundation — drives the hydration sentinel below. This is an
  // image-overlay chart with no width-dependent layout (the columns reflow via
  // `lg:` classes), so only `measured` + the container ref are consumed.
  const { ref: dimRef, measured } = useChartDimensions({ breakpoint: 640 });
  const [inViewRef] = useInView<HTMLDivElement>();

  // Merge the dimensions ref + in-view ref onto the same measured container.
  const setContainer = useCallback(
    (node: HTMLDivElement | null) => {
      dimRef.current = node;
      inViewRef.current = node;
    },
    [dimRef, inViewRef],
  );

  // Hydration sentinel — flips the page's ChartSkeleton off as soon as the
  // container is measured, instead of waiting the full safety timeout.
  useEffect(() => {
    if (measured) dimRef.current?.setAttribute('data-hydrated', 'true');
  }, [measured, dimRef]);

  const handleToggle = (id: string) => {
    setActiveId((curr) => (curr === id ? null : id));
  };

  // Always apply the transition class — the global `prefers-reduced-motion`
  // rule in global.css neutralizes durations, so this stays hydration-safe
  // (no server/client markup divergence from a synchronous media query).
  const transitionClass = 'transition-all duration-300 ease-out';

  return (
    <div ref={setContainer} id={id} className="grid gap-6 lg:grid-cols-[1.1fr_1fr] items-start">
      <style dangerouslySetInnerHTML={{ __html: pulseStyles }} />

      {/* Left Column: Stylised image with hotspots overlay */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 shadow-lg">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
          Interactive Deity Iconography
        </p>
        
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-stone-100 shadow-md">
          {/* Beautiful generated deity image */}
          <img
            src="/images/konur_kaliamman.png"
            alt="Illustrative depiction of Konur Kaliamman deity"
            className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
          />

          {/* SVG Hotspots Overlay */}
          <svg
            viewBox="0 0 1000 1000"
            className="absolute inset-0 h-full w-full select-none"
          >
            {ICON_HOTSPOTS.map((h, i) => {
              const isActive = h.id === activeId;
              return (
                <g
                  key={h.id}
                  role="button"
                  aria-label={`${h.label.en} hotspot. Click to toggle factsheet.`}
                  aria-pressed={isActive}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleToggle(h.id)}
                  className="group pointer-events-auto"
                >
                  {/* Ping Animation for active */}
                  {isActive && (
                    <circle
                      cx={h.x}
                      cy={h.y}
                      r="40"
                      fill="#e11d48"
                      className="animate-ping-slow-rose"
                      style={{ transformOrigin: `${h.x}px ${h.y}px` }}
                    />
                  )}

                  {/* Active/Hover Glow Ring */}
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r="30"
                    fill="white"
                    opacity={isActive ? "0.35" : "0.0"}
                    className="group-hover:opacity-25 transition-all duration-300"
                  />

                  {/* Hotspot Outer Ring & Circle */}
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r={isActive ? "22" : "18"}
                    fill="white"
                    stroke="#e11d48"
                    strokeWidth={isActive ? "5" : "3.5"}
                    className="transition-all duration-300 group-hover:scale-110 shadow-md"
                    style={{ transformOrigin: `${h.x}px ${h.y}px` }}
                  />

                  {/* Number Inside Circle */}
                  <text
                    x={h.x}
                    y={h.y + 7}
                    textAnchor="middle"
                    fontSize={isActive ? "20" : "17"}
                    fontWeight={800}
                    fill="#e11d48"
                    className="font-sans pointer-events-none"
                  >
                    {i + 1}
                  </text>

                  {/* Hover tooltip banner */}
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <rect
                      x={h.x - 90}
                      y={h.y - 62}
                      width="180"
                      height="32"
                      rx="6"
                      fill={FG[1]}
                      opacity="0.9"
                    />
                    <polygon
                      points={`${h.x - 6},${h.y - 30} ${h.x + 6},${h.y - 30} ${h.x},${h.y - 24}`}
                      fill={FG[1]}
                      opacity="0.9"
                    />
                    <text
                      x={h.x}
                      y={h.y - 41}
                      textAnchor="middle"
                      fill="white"
                      fontSize="13"
                      fontWeight="700"
                      className="font-sans"
                    >
                      {h.label.en}
                    </text>
                  </g>
                  <title>{`${h.label.en} — ${h.label.ta}`}</title>
                </g>
              );
            })}
          </svg>
        </div>

        <p className="mt-3 text-center text-xs text-stone-500 font-medium">
          Stylised; not based on a photograph of the Konur shrine. Hotspots map to common Kaliamman iconographic elements.
        </p>
      </div>

      {/* Right Column: Hotspot Factsheet Cards List */}
      <ul className="space-y-3.5">
        {ICON_HOTSPOTS.map((h, i) => {
          const isActive = h.id === activeId;
          return (
            <li
              key={h.id}
              onClick={() => handleToggle(h.id)}
              className={`cursor-pointer rounded-2xl border p-5 shadow-sm ${transitionClass} ${
                isActive
                  ? 'border-rose-400 bg-rose-50/80 ring-2 ring-rose-200/60 shadow-md scale-[1.01]'
                  : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-md hover:bg-stone-50/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-sm ${transitionClass} ${
                    isActive ? 'bg-rose-600 text-white shadow-sm' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className={`font-semibold text-base ${isActive ? 'text-rose-900' : 'text-stone-900'}`}>{h.label.en}</p>
                  <p className="font-tamil text-sm text-stone-500 font-medium">{h.label.ta}</p>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-rose-500 animate-pulse' : 'bg-stone-300'}`} />
              </div>
              <p className={`mt-3 text-sm leading-relaxed ${isActive ? 'text-stone-800 font-medium' : 'text-stone-600'}`}>{h.body}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
