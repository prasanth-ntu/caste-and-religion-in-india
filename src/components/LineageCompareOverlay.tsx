import { useEffect, useMemo, useState } from 'react';
import manifestRaw from '../data/lineage-manifest.json';
import type { ManifestEntry } from './LineageSelector';
import LineageCompare from './LineageCompare';

const manifest = manifestRaw as ManifestEntry[];

export interface LineageCompareOverlayProps {
  /** The slug of the lineage currently being viewed on the page. */
  currentSlug: string;
}

/**
 * Floating "Compare with…" button on individual lineage pages.
 * - Desktop (≥1024px): opens a half-screen split-view drawer with a compact LineageCompare.
 * - Mobile / tablet (<1024px): the drawer offers a CTA to navigate to /compare?a={current}&b={picked}.
 */
export default function LineageCompareOverlay({ currentSlug }: LineageCompareOverlayProps) {
  const [open, setOpen] = useState(false);
  const [pickedB, setPickedB] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return manifest
      .filter((m) => m.slug !== currentSlug && m.status === 'documented' && m.deity)
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.slug.toLowerCase().includes(q) ||
          (m.deity?.name?.toLowerCase().includes(q) ?? false) ||
          (m.deity?.village?.toLowerCase().includes(q) ?? false)
      );
  }, [query, currentSlug]);

  const drawerWidth = isDesktop && pickedB ? 'max-w-[min(960px,calc(100vw-3rem))]' : 'max-w-md';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Compare lineages"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 shadow-lg transition hover:border-stone-500 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 sm:bottom-8 sm:right-8"
      >
        <span aria-hidden="true">⇄</span>
        <span className="hidden sm:inline">Compare with…</span>
        <span className="sm:hidden">Compare</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close overlay"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Compare lineages"
            className={`absolute right-0 top-0 flex h-full w-full ${drawerWidth} flex-col bg-white shadow-2xl transition-[max-width] duration-200`}
          >
            <header className="flex items-start justify-between border-b border-stone-200 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  Compare
                </p>
                <h2 className="mt-0.5 text-lg font-semibold text-stone-900">
                  {pickedB ? 'Side-by-side comparison' : 'Pick a second lineage'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
              >
                ✕
              </button>
            </header>

            {!pickedB && (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <p className="mb-3 text-sm text-stone-600">
                  You're viewing <span className="font-medium">{labelFor(currentSlug)}</span>. Pick
                  another lineage to compare it with.
                </p>
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by kootam, deity, village…"
                  className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
                />
                <ul className="space-y-1">
                  {candidates.map((m) => (
                    <li key={m.slug}>
                      <button
                        type="button"
                        onClick={() => setPickedB(m.slug)}
                        className="flex w-full items-start gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-sm hover:border-stone-400 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
                      >
                        <span aria-hidden="true">{m.totemEmoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-stone-900">{m.name}</span>
                          {m.deity && (
                            <span className="block text-xs text-stone-500">
                              {m.deity.name}
                              {m.deity.village ? `, ${m.deity.village}` : ''}
                            </span>
                          )}
                        </span>
                        <span className="text-stone-400">→</span>
                      </button>
                    </li>
                  ))}
                  {candidates.length === 0 && (
                    <li className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-4 text-center text-sm text-stone-500">
                      No matches.
                    </li>
                  )}
                </ul>
              </div>
            )}

            {pickedB && (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {isDesktop ? (
                  <>
                    <p className="mb-3 text-xs text-stone-500">
                      <button
                        type="button"
                        onClick={() => setPickedB(null)}
                        className="font-medium text-stone-600 underline hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 rounded"
                      >
                        ← Pick a different B
                      </button>
                      <span className="mx-2">·</span>
                      <a
                        href={`/compare?a=${currentSlug}&b=${pickedB}#chart`}
                        className="font-medium text-emerald-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 rounded"
                      >
                        Open full /compare page →
                      </a>
                    </p>
                    <LineageCompare
                      initialA={currentSlug}
                      initialB={pickedB}
                      bindToUrl={false}
                      compact
                    />
                  </>
                ) : (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-5 text-sm text-stone-700">
                    <p>
                      You picked <span className="font-medium">{labelFor(pickedB)}</span>. The
                      side-by-side view is wider than this screen — open the full compare page:
                    </p>
                    <a
                      href={`/compare?a=${currentSlug}&b=${pickedB}#chart`}
                      className="mt-3 inline-flex items-center gap-1 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
                    >
                      Open full compare view →
                    </a>
                    <p className="mt-3">
                      <button
                        type="button"
                        onClick={() => setPickedB(null)}
                        className="text-stone-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 rounded"
                      >
                        ← Pick a different B
                      </button>
                    </p>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function labelFor(slug: string): string {
  const m = manifest.find((x) => x.slug === slug);
  return m ? `${m.totemEmoji} ${m.name}` : slug;
}
