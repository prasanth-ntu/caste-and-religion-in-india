// Tiny ResizeObserver hook: measures a container so the controlled D3 viz
// (AtlasMap / AtlasDendro) can fill it exactly. SSR-safe (returns a fallback
// until measured on the client).
import { useState, useRef, useEffect } from 'react';

export function useBox(fallback: { w: number; h: number } = { w: 480, h: 300 }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 0 && r.height > 0) setBox({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}
