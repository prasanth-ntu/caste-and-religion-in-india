import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import manifest from '../../data/lineage-manifest.json';
import { PATHS, type PathId as SequencedPathId } from '../../data/paths';

type PathId = 'family' | 'evidence' | 'curious' | 'browse' | '';

type DeityRef = {
  slug?: string;
  name?: string;
  tamilName?: string;
} | null;

type KootamEntry = {
  slug: string;
  name: string;
  tamilName?: string;
  status?: string;
  deity?: DeityRef;
};

const LS_SHOWN = 'decoded.explorer.shown';
const LS_PATH = 'decoded.explorer.path';
const LS_STOP = 'decoded.explorer.stop';
const LS_LINEAGE = 'decoded.lineage';

const PATH_OPTIONS: Array<{
  id: Exclude<PathId, ''>;
  label: string;
  tamil: string;
  hint: string;
}> = [
  { id: 'family', label: 'Family history', tamil: 'குடும்ப வரலாறு', hint: 'Pick a kootam → kuladeivam' },
  { id: 'evidence', label: 'The evidence', tamil: 'ஆதாரம்', hint: 'Genetics, reservation, varna vs jati' },
  { id: 'curious', label: 'Just curious', tamil: 'சும்மா', hint: '5-minute guided tour' },
  { id: 'browse', label: 'Browse sources', tamil: 'ஆதாரங்கள்', hint: 'All citations in one place' },
];

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function safeGet(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export default function Explorer() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<1 | 2>(1);
  const [path, setPath] = useState<PathId>('');
  const [pathName, setPathName] = useState<string>('');
  const [reduced, setReduced] = useState(false);

  const chipRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const radioRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Hydrate from localStorage on mount + first-run auto-expand
  useEffect(() => {
    setMounted(true);
    setReduced(prefersReducedMotion());

    const storedPath = (safeGet(LS_PATH) as PathId) || '';
    if (
      storedPath === 'family' ||
      storedPath === 'evidence' ||
      storedPath === 'curious' ||
      storedPath === 'browse'
    ) {
      setPath(storedPath);
      const found = PATH_OPTIONS.find((p) => p.id === storedPath);
      if (found) setPathName(found.label);
    }

    const shown = safeGet(LS_SHOWN);
    const isHome = typeof window !== 'undefined' && window.location.pathname === '/';
    if (shown === null && isHome) {
      setOpen(true);
      setScreen(1);
    }
  }, []);

  // External "open" event (dispatched by home-page CTA + footer link)
  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setScreen(path ? 2 : 1);
    };
    window.addEventListener('decoded:open-explorer', handler);
    return () => window.removeEventListener('decoded:open-explorer', handler);
  }, [path]);

  // Focus management when opening
  useEffect(() => {
    if (!open) return;
    // Move focus into the card (close button is a safe initial focus)
    const t = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, reduced ? 0 : 50);
    return () => window.clearTimeout(t);
  }, [open, reduced]);

  // Escape to close + focus trap
  useEffect(() => {
    if (!open) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const card = cardRef.current;
      if (!card) return;
      const focusables = card.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function markShown() {
    if (safeGet(LS_SHOWN) === null) safeSet(LS_SHOWN, '1');
  }

  function handleOpen() {
    setOpen(true);
    // If we already picked a path, jump to screen 2 for continuity
    setScreen(path ? 2 : 1);
  }

  function handleClose() {
    setOpen(false);
    markShown();
    // Return focus to the chip
    window.setTimeout(() => chipRef.current?.focus(), 0);
  }

  function selectPath(id: Exclude<PathId, ''>) {
    setPath(id);
    const found = PATH_OPTIONS.find((p) => p.id === id);
    setPathName(found?.label ?? '');
    safeSet(LS_PATH, id);
    if (safeGet(LS_STOP) === null) safeSet(LS_STOP, '0');

    // For sequenced paths (family, curious), prime the PathProgress amber bar
    // so it appears from stop 0 ("Starting the … path — stop 1 of N: X →") on
    // whichever content page the user lands on next. Evidence + browse are not
    // sequenced lanes, so they get no path-progress wiring.
    if (id === 'family' || id === 'curious') {
      try {
        const sequencedId = id as SequencedPathId;
        const total = PATHS[sequencedId].stops.length;
        localStorage.setItem(
          `pathProgress.${sequencedId}`,
          JSON.stringify({ stop: 0, total, updatedAt: new Date().toISOString() }),
        );
        localStorage.setItem('pathProgress.active', sequencedId);
        window.dispatchEvent(new CustomEvent('decoded:path-progress-changed'));
      } catch {
        /* ignore */
      }
    }

    markShown();
    setScreen(2);
  }

  function onRadioKey(e: KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (idx + 1) % PATH_OPTIONS.length;
      radioRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (idx - 1 + PATH_OPTIONS.length) % PATH_OPTIONS.length;
      radioRefs.current[prev]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectPath(PATH_OPTIONS[idx].id);
    }
  }

  if (!mounted) return null;

  return (
    <>
      {/* Chip / collapsed trigger */}
      {!open && (
        <button
          ref={chipRef}
          type="button"
          onClick={handleOpen}
          aria-label="Open site explorer"
          aria-expanded={false}
          className={
            // Mobile: icon-only round FAB bottom-right
            'fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-xl ' +
            'flex items-center justify-center text-2xl ' +
            'hover:bg-indigo-700 active:scale-95 transition ' +
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ring-offset-2 ' +
            // Desktop: pill FAB stays bottom-right
            'lg:h-auto lg:w-auto lg:px-4 lg:py-3 lg:rounded-full lg:gap-2 lg:text-sm lg:font-medium'
          }
        >
          <span aria-hidden="true" className="lg:text-lg">🧭</span>
          <span className="hidden lg:inline-flex lg:items-center lg:gap-2">
            {path ? (
              <>
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full bg-indigo-300"
                />
                <span>Continue · {pathName || path}</span>
              </>
            ) : (
              <span>Find your path</span>
            )}
          </span>
        </button>
      )}

      {/* Expanded card */}
      {open && (
        <div
          ref={cardRef}
          role="complementary"
          aria-label="Site explorer"
          className={
            // Mobile: bottom sheet
            'fixed inset-x-3 bottom-3 z-40 max-h-[70vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl ' +
            'border border-slate-200 ' +
            // Desktop: bottom-right card (above FAB position)
            'lg:inset-auto lg:bottom-6 lg:right-6 lg:left-auto lg:top-auto ' +
            'lg:w-[340px] lg:max-h-[520px] ' +
            (reduced ? '' : 'transition duration-200 ease-out')
          }
          style={{
            opacity: 1,
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              {screen === 2 && (
                <button
                  type="button"
                  onClick={() => setScreen(1)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                >
                  ← Back
                </button>
              )}
              <h2 className="text-base font-semibold text-slate-900 mt-1">
                {screen === 1 ? 'What brings you here?' : screen2Title(path)}
              </h2>
              {screen === 1 && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Pick one. We'll personalise the homepage and remember your choice.
                </p>
              )}
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={handleClose}
              aria-label="Close site explorer"
              className="shrink-0 -mr-1 -mt-1 h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center text-xl leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              ×
            </button>
          </div>

          {screen === 1 ? (
            <ul role="radiogroup" aria-label="Path" className="space-y-2">
              {PATH_OPTIONS.map((opt, idx) => {
                const checked = path === opt.id;
                return (
                  <li key={opt.id}>
                    <button
                      ref={(el) => {
                        radioRefs.current[idx] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      tabIndex={checked || (!path && idx === 0) ? 0 : -1}
                      onKeyDown={(e) => onRadioKey(e, idx)}
                      onClick={() => selectPath(opt.id)}
                      className={
                        'w-full text-left rounded-xl border p-3 min-h-[44px] ' +
                        'transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ' +
                        (checked
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50')
                      }
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900">{opt.label}</span>
                        <span lang="ta" className="text-xs text-slate-500">
                          {opt.tamil}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.hint}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Screen2 path={path} onAfterAction={markShown} />
          )}
        </div>
      )}
    </>
  );
}

function screen2Title(path: PathId): string {
  switch (path) {
    case 'family':
      return 'Find your kootam';
    case 'evidence':
      return 'Pick a topic';
    case 'curious':
      return 'Take the 5-minute tour';
    case 'browse':
      return 'Open the sources';
    default:
      return '';
  }
}

function Screen2({ path, onAfterAction }: { path: PathId; onAfterAction: () => void }) {
  if (path === 'family') return <FamilyPicker onAfterAction={onAfterAction} />;
  if (path === 'evidence') return <EvidenceLinks onAfterAction={onAfterAction} />;
  if (path === 'curious') return <CuriousCta onAfterAction={onAfterAction} />;
  if (path === 'browse') return <BrowseCta onAfterAction={onAfterAction} />;
  return null;
}

/* ------------------------------ Family ------------------------------ */

function FamilyPicker({ onAfterAction }: { onAfterAction: () => void }) {
  const all = manifest as KootamEntry[];
  const documented = useMemo(
    () =>
      all
        .filter((k) => k.status === 'documented' && k.name && k.slug)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [all],
  );

  const [q, setQ] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return documented.slice(0, 8);
    return documented
      .filter((k) => {
        const hay =
          (k.name || '').toLowerCase() +
          ' ' +
          (k.tamilName || '').toLowerCase() +
          ' ' +
          (k.deity?.name || '').toLowerCase();
        return hay.includes(term);
      })
      .slice(0, 8);
  }, [q, documented]);

  function pick(entry: KootamEntry) {
    try {
      const payload = {
        kootam: entry.slug,
        deity: entry.deity?.slug || null,
        updatedAt: new Date().toISOString(),
      };
      safeSet(LS_LINEAGE, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('decoded:lineage-changed'));
    } catch {
      /* ignore */
    }
    onAfterAction();
    window.location.href = `/lineage/?kootam=${encodeURIComponent(entry.slug)}`;
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(matches.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = matches[activeIdx];
      if (target) pick(target);
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1" htmlFor="explorer-kootam">
        Type your kootam name
      </label>
      <input
        ref={inputRef}
        id="explorer-kootam"
        type="text"
        autoComplete="off"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActiveIdx(0);
        }}
        onKeyDown={onKeyDown}
        placeholder="e.g. Kadai, Maniyan, Senganni…"
        role="combobox"
        aria-expanded={true}
        aria-controls="explorer-kootam-list"
        aria-autocomplete="list"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus:border-indigo-500"
      />
      <ul
        id="explorer-kootam-list"
        role="listbox"
        className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100"
      >
        {matches.length === 0 && (
          <li className="px-3 py-2 text-xs text-slate-500">No matches.</li>
        )}
        {matches.map((k, i) => (
          <li key={k.slug} role="option" aria-selected={i === activeIdx}>
            <button
              type="button"
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => pick(k)}
              className={
                'w-full text-left px-3 py-2 text-sm flex items-baseline justify-between gap-2 ' +
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ' +
                (i === activeIdx ? 'bg-indigo-50' : 'hover:bg-slate-50')
              }
            >
              <span className="font-medium text-slate-900">{k.name}</span>
              {k.deity?.name ? (
                <span className="text-xs text-slate-500 truncate max-w-[55%]">
                  {k.deity.name}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <a
          href="/lineage/?guide=1"
          onClick={onAfterAction}
          className="text-xs text-indigo-600 hover:text-indigo-800 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
        >
          I don't know mine →
        </a>
      </div>
    </div>
  );
}

/* ------------------------------ Evidence ------------------------------ */

function EvidenceLinks({ onAfterAction }: { onAfterAction: () => void }) {
  const items: Array<{ label: string; href: string }> = [
    { label: 'Genetics', href: '/overview/genetics' },
    { label: 'Reservation', href: '/overview/reservation-policy' },
    { label: 'Varna vs Jati', href: '/overview/varna-vs-jati' },
    { label: 'Timeline', href: '/overview/timeline' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((it) => (
        <a
          key={it.href}
          href={it.href}
          onClick={onAfterAction}
          className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-900 hover:border-indigo-400 hover:bg-indigo-50 transition min-h-[44px] flex items-center justify-center text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {it.label}
        </a>
      ))}
    </div>
  );
}

/* ------------------------------ Curious ------------------------------ */

function CuriousCta({ onAfterAction }: { onAfterAction: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        A short, guided walk through the strongest evidence — about 5 minutes.
      </p>
      <a
        href="/explore?path=curious"
        onClick={onAfterAction}
        className="block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Take the 5-minute tour →
      </a>
      <a
        href="/"
        onClick={onAfterAction}
        className="block text-center text-xs text-slate-500 hover:text-slate-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
      >
        Skip and browse
      </a>
    </div>
  );
}

/* ------------------------------ Browse ------------------------------ */

function BrowseCta({ onAfterAction }: { onAfterAction: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Every figure on this site links to a source. Open the full index.
      </p>
      <a
        href="/sources/"
        onClick={onAfterAction}
        className="block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Open all sources →
      </a>
    </div>
  );
}
