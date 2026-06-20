import { useEffect, useRef, useState } from 'react';

/**
 * Observe a container and flip a boolean to `true` the first time it intersects
 * the viewport. One-shot: disconnects after the first intersection so entry
 * animations fire exactly once. SSR-safe — returns `false` until mounted, and
 * resolves to `true` immediately where IntersectionObserver is unavailable.
 *
 * Extracted from the inline copies previously duplicated across the viz charts
 * (GeneticsChart, VarnaJatiDendrogram, KootamForceGraph).
 */
export function useInView<T extends Element>(): readonly [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}
