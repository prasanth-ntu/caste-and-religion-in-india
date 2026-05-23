import { useEffect, useState } from 'react';
import { PATHS, type PathId } from '../../data/paths';

/**
 * Thin amber bar that surfaces a user's active curated path (set on /explore
 * or from the Explorer popup).
 *
 * localStorage contract:
 *   - `pathProgress.<pathId>`: JSON `{ stop: number, total: number, updatedAt?: string }`
 *     stop = the *current* zero-indexed stop the user has reached.
 *     stop === 0 means "just selected the path, hasn't visited any stop yet".
 *   - `pathProgress.active`: the active pathId, or absent.
 *
 * The bar appears when `active` is set AND `0 <= stop < total` (so there's a
 * next stop to point at). At stop === 0 the copy reads "Starting the …";
 * at stop > 0 it reads "Continuing the …".
 *
 * Dismiss (×) clears `pathProgress.active` but leaves per-path progress intact,
 * so the user can resume by re-activating from /explore or the Explorer.
 */

type PathProgressRecord = {
  stop: number;
  total: number;
  updatedAt?: string;
};

function safeGet(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemove(key: string) {
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function readPathProgress(id: PathId): PathProgressRecord | null {
  const raw = safeGet(`pathProgress.${id}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PathProgressRecord;
    if (typeof parsed.stop !== 'number' || typeof parsed.total !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function PathProgress() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<PathId | null>(null);
  const [progress, setProgress] = useState<PathProgressRecord | null>(null);

  useEffect(() => {
    setMounted(true);
    const refresh = () => {
      const raw = safeGet('pathProgress.active');
      if (raw === 'researcher' || raw === 'family' || raw === 'curious') {
        const p = readPathProgress(raw);
        setActive(raw);
        setProgress(p);
      } else {
        setActive(null);
        setProgress(null);
      }
    };
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith('pathProgress.')) refresh();
    };
    const onCustom = () => refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('decoded:path-progress-changed', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('decoded:path-progress-changed', onCustom);
    };
  }, []);

  if (!mounted || !active || !progress) return null;
  if (progress.stop < 0) return null;
  if (progress.stop >= progress.total) return null;

  const path = PATHS[active];
  if (!path) return null;
  const nextStop = path.stops[progress.stop]; // zero-indexed = next one to visit
  if (!nextStop) return null;

  const isStarting = progress.stop === 0;
  const stopNumber = progress.stop + 1;

  function dismiss() {
    safeRemove('pathProgress.active');
    setActive(null);
  }

  return (
    <div
      role="region"
      aria-label={`Active path: ${path.name}`}
      className="border-b border-amber-200 bg-amber-50/90 text-amber-900"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 text-sm sm:px-6">
        <a
          href={nextStop.href}
          className="flex flex-1 items-center gap-2 truncate rounded font-medium hover:text-amber-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50"
        >
          <span aria-hidden="true">↳</span>
          <span className="truncate">
            {isStarting ? 'Starting' : 'Continuing'} the {path.name} path — stop {stopNumber} of {progress.total}: {nextStop.title} →
          </span>
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss active path"
          className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-amber-700 hover:bg-amber-100 hover:text-amber-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
        >
          <span aria-hidden="true" className="text-base leading-none">×</span>
        </button>
      </div>
    </div>
  );
}
