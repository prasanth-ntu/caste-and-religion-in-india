import { useEffect, useState } from 'react';

// =============================================================================
// Tooltip — small position-aware floating tooltip used inside D3 charts.
//
// Usage from a chart (pattern):
//   const [tip, setTip] = useState<TooltipState>({ x: null, y: null, content: null });
//   // On mouseenter / focus → setTip({ x: ev.clientX, y: ev.clientY, content: <>…</> })
//   // On mouseleave / blur → setTip({ x: null, y: null, content: null })
//   return (<>
//     <svg … />
//     <Tooltip x={tip.x} y={tip.y}>{tip.content}</Tooltip>
//   </>)
// =============================================================================

export type TooltipState = {
  x: number | null;
  y: number | null;
  content: React.ReactNode;
};

export interface TooltipProps {
  x: number | null;
  y: number | null;
  children?: React.ReactNode;
  /** Offset from cursor in pixels. */
  offset?: { dx?: number; dy?: number };
}

export default function Tooltip({ x, y, children, offset }: TooltipProps) {
  const dx = offset?.dx ?? 12;
  const dy = offset?.dy ?? 12;
  const [vw, setVw] = useState<number>(typeof window === 'undefined' ? 1024 : window.innerWidth);
  const [vh, setVh] = useState<number>(typeof window === 'undefined' ? 768 : window.innerHeight);

  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (x === null || y === null || !children) return null;

  // Clamp so the tooltip stays on screen (we don't know its actual size, so we
  // use a reasonable max-width/height and flip the offset if we're near an edge).
  const maxW = 280;
  const maxH = 200;
  let left = x + dx;
  let top = y + dy;
  if (left + maxW > vw - 4) left = Math.max(4, x - dx - maxW);
  if (top + maxH > vh - 4) top = Math.max(4, y - dy - maxH);

  return (
    <div
      role="tooltip"
      aria-hidden="false"
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 60,
        maxWidth: maxW,
        background: 'rgba(28, 25, 23, 0.95)', // stone-900/95
        color: '#ffffff',
        fontSize: 12,
        lineHeight: 1.4,
        padding: '8px 10px',
        borderRadius: 6,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        pointerEvents: 'none',
        whiteSpace: 'normal',
      }}
    >
      {children}
    </div>
  );
}
