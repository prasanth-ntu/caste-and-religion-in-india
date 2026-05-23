import { useEffect, useRef, useState } from 'react';
import manifestRaw from '../../data/lineage-manifest.json';
import type { ManifestEntry } from '../LineageSelector';

const manifest = manifestRaw as ManifestEntry[];
const STORAGE_KEY = 'decoded.lineage';
const DEFAULT_SLUG = 'kadai';

interface Selected {
  kootam: string;
  deity: string | null;
  updatedAt: string;
}

function readSelected(): Selected | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get('kootam');
  if (fromUrl && manifest.some((m) => m.slug === fromUrl)) {
    const m = manifest.find((x) => x.slug === fromUrl)!;
    return {
      kootam: fromUrl,
      deity: m.deity?.slug ?? null,
      updatedAt: new Date().toISOString(),
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Selected;
      if (parsed?.kootam && manifest.some((m) => m.slug === parsed.kootam)) {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Persistent lineage chip in the SiteHeader. Hidden until the visitor picks a
 * kootam (the Explorer widget carries that affordance for first-run). Once
 * picked, the chip shows current selection and opens a popover with: a quick
 * kootam typeahead, "Compare with another" → /compare, and "Clear."
 */
export default function LineageChip() {
  const [mounted, setMounted] = useState(false);
  const [sel, setSel] = useState<Selected | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Hydrate on mount + listen for cross-component updates
  useEffect(() => {
    setMounted(true);
    setSel(readSelected());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSel(readSelected());
    };
    const onCustom = () => setSel(readSelected());
    window.addEventListener('storage', onStorage);
    window.addEventListener('decoded:lineage-changed', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('decoded:lineage-changed', onCustom as EventListener);
    };
  }, []);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!mounted || !sel) return null;

  const current = manifest.find((m) => m.slug === sel.kootam);
  if (!current) return null;

  const filtered = !query
    ? manifest
        .filter((m) => m.status === 'documented')
        .slice(0, 8)
    : manifest
        .filter((m) => {
          const q = query.trim().toLowerCase();
          return (
            m.slug.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q) ||
            m.tamilName.includes(q) ||
            (m.deity?.name?.toLowerCase().includes(q) ?? false) ||
            (m.deity?.village?.toLowerCase().includes(q) ?? false)
          );
        })
        .slice(0, 20);

  function persist(next: Selected | null) {
    try {
      if (next) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent('decoded:lineage-changed'));
  }

  function pick(m: ManifestEntry) {
    const next: Selected = {
      kootam: m.slug,
      deity: m.deity?.slug ?? null,
      updatedAt: new Date().toISOString(),
    };
    setSel(next);
    setOpen(false);
    setQuery('');
    persist(next);
    // Navigate to the canonical per-kootam page
    if (typeof window !== 'undefined') {
      window.location.href = `/lineage/k/${m.slug}/`;
    }
  }

  function clear() {
    setSel(null);
    setOpen(false);
    persist(null);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800 shadow-sm transition hover:border-indigo-400 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
      >
        <span aria-hidden="true" className="text-base leading-none">
          {current.totemEmoji}
        </span>
        <span className="hidden truncate sm:inline-block sm:max-w-[12rem]">
          {current.name}
          {current.deity && (
            <span className="ml-1 font-normal text-stone-500">· {current.deity.name}</span>
          )}
        </span>
        <span className="sm:hidden">{current.name}</span>
        <span aria-hidden="true" className="text-stone-400">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Your lineage"
          className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-stone-200 bg-white p-3 shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-stone-500">
            <span>Your lineage</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              ✕
            </button>
          </div>

          <div className="mb-3 rounded-lg bg-stone-50 p-3 text-sm">
            <p className="font-medium text-stone-900">
              <span aria-hidden="true">{current.totemEmoji}</span> {current.name}
              {current.tamilName && (
                <span className="ml-1 font-tamil text-stone-600">({current.tamilName})</span>
              )}
            </p>
            {current.deity && (
              <p className="mt-0.5 text-xs text-stone-600">
                Kuladeivam: <span className="font-medium">{current.deity.name}</span>
                {current.deity.village && <> · {current.deity.village}</>}
                {current.deity.district && <> ({current.deity.district})</>}
              </p>
            )}
          </div>

          <input
            type="text"
            placeholder="Switch — search kootam, deity, village…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
          <ul className="mb-3 max-h-[12rem] overflow-y-auto rounded-md border border-stone-100">
            {filtered.map((m) => (
              <li key={m.slug}>
                <button
                  type="button"
                  onClick={() => pick(m)}
                  className={`flex w-full items-start gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-stone-50 ${
                    m.slug === current.slug ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  <span aria-hidden="true">{m.totemEmoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-stone-900">
                      {m.name}
                      {m.tamilName && (
                        <span className="ml-1 font-tamil font-normal text-stone-500">
                          ({m.tamilName})
                        </span>
                      )}
                    </span>
                    {m.deity ? (
                      <span className="block truncate text-xs text-stone-500">
                        {m.deity.name}
                        {m.deity.village ? ` · ${m.deity.village}` : ''}
                      </span>
                    ) : (
                      <span className="block text-xs italic text-stone-400">
                        {m.status === 'stub' ? 'stub' : 'deity pending'}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-center text-xs text-stone-500">No matches.</li>
            )}
          </ul>

          <div className="flex items-center justify-between gap-2 text-xs">
            <a
              href={`/compare?a=${current.slug}`}
              className="rounded-md border border-stone-200 px-2.5 py-1.5 font-medium text-stone-700 hover:border-indigo-400 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              ⇄ Compare with another
            </a>
            <button
              type="button"
              onClick={clear}
              className="rounded-md px-2.5 py-1.5 font-medium text-stone-600 hover:bg-stone-100 hover:text-rose-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
