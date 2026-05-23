import { useEffect, useMemo, useRef, useState } from 'react';
import manifestRaw from '../data/lineage-manifest.json';

export interface ManifestEntry {
  slug: string;
  name: string;
  tamilName: string;
  totemEmoji: string;
  totemType: string;
  totemSpecies: string;
  region: string;
  status: 'documented' | 'stub';
  attestation: 'academic' | 'community' | 'oral-family' | null;
  deity: null | {
    slug: string;
    name: string;
    tamilName: string;
    village: string;
    district: string;
    tradition: string;
    festivals: string[];
    attestation: string | null;
  };
}

const manifest = manifestRaw as ManifestEntry[];

const STORAGE_KEY = 'decoded.lineage';
const DEFAULT_SLUG = 'kadai';

export interface SelectedLineage {
  kootam: string;
  deity: string | null;
  updatedAt: string;
}

export function readSelected(): SelectedLineage {
  // URL → localStorage → default
  if (typeof window !== 'undefined') {
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
        const parsed = JSON.parse(raw) as SelectedLineage;
        if (parsed?.kootam && manifest.some((m) => m.slug === parsed.kootam)) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
  }
  const def = manifest.find((m) => m.slug === DEFAULT_SLUG);
  return {
    kootam: DEFAULT_SLUG,
    deity: def?.deity?.slug ?? null,
    updatedAt: new Date().toISOString(),
  };
}

function persist(sel: SelectedLineage) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
  } catch {
    /* ignore quota errors */
  }
  const url = new URL(window.location.href);
  url.searchParams.set('kootam', sel.kootam);
  if (sel.deity) url.searchParams.set('deity', sel.deity);
  else url.searchParams.delete('deity');
  window.history.replaceState({}, '', url.toString());
}

export interface LineageSelectorProps {
  /** When true, change navigates to /lineage/k/{slug}/. Otherwise (e.g. on /compare) it only updates state. */
  navigateOnChange?: boolean;
  /** Optional controlled value (e.g. for the compare-page A/B selectors). */
  value?: string;
  /** Optional change callback. Called after persist. */
  onChange?: (sel: SelectedLineage) => void;
  /** Compact mode hides the prelude text. */
  compact?: boolean;
  /** Label override (e.g. "Lineage A"). */
  label?: string;
}

export default function LineageSelector({
  navigateOnChange = true,
  value,
  onChange,
  compact = false,
  label,
}: LineageSelectorProps) {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<SelectedLineage>(() => ({
    kootam: value ?? DEFAULT_SLUG,
    deity: manifest.find((m) => m.slug === (value ?? DEFAULT_SLUG))?.deity?.slug ?? null,
    updatedAt: new Date().toISOString(),
  }));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Hydrate from URL/localStorage on mount (only when uncontrolled)
  useEffect(() => {
    setMounted(true);
    if (value === undefined) {
      const next = readSelected();
      setSelected(next);
      // If the URL provided a kootam param, repopulate localStorage so the
      // selection persists across reloads even when entering via a shared link.
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (url.searchParams.has('kootam')) {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            /* ignore quota errors */
          }
        }
      }
    }
  }, [value]);

  // Sync to controlled value
  useEffect(() => {
    if (value !== undefined) {
      const m = manifest.find((x) => x.slug === value);
      setSelected({
        kootam: value,
        deity: m?.deity?.slug ?? null,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = useMemo(
    () => manifest.find((m) => m.slug === selected.kootam) ?? manifest[0],
    [selected.kootam]
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (m: ManifestEntry) =>
      !q ||
      m.slug.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      m.tamilName.includes(q) ||
      (m.deity?.name?.toLowerCase().includes(q) ?? false) ||
      (m.deity?.village?.toLowerCase().includes(q) ?? false);
    const documented = manifest.filter(
      (m) => m.status === 'documented' && m.deity && match(m)
    );
    const namedNoDeity = manifest.filter(
      (m) => m.status === 'documented' && !m.deity && match(m)
    );
    const stubs = manifest.filter((m) => m.status === 'stub' && match(m));
    return { documented, namedNoDeity, stubs };
  }, [query]);

  function pick(m: ManifestEntry) {
    const next: SelectedLineage = {
      kootam: m.slug,
      deity: m.deity?.slug ?? null,
      updatedAt: new Date().toISOString(),
    };
    setSelected(next);
    setOpen(false);
    setQuery('');
    persist(next);
    onChange?.(next);
    if (navigateOnChange && typeof window !== 'undefined') {
      // Navigate to the parameterised lineage route
      window.location.href = `/lineage/k/${m.slug}/`;
    }
  }

  // Render fallback before hydration to avoid SSR/CSR mismatch flicker
  if (!mounted) {
    return (
      <div
        className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-500"
        aria-hidden="true"
      >
        Loading lineage selector…
      </div>
    );
  }

  const labelText = label ?? 'Currently viewing';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-stone-300 bg-white px-3 py-2 text-left text-sm shadow-sm transition hover:border-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-300"
      >
        <span className="min-w-0 flex-1">
          {!compact && (
            <span className="block text-[11px] uppercase tracking-wide text-stone-500">
              {labelText}
            </span>
          )}
          <span className="flex items-center gap-2">
            <span aria-hidden="true">{current.totemEmoji}</span>
            <span className="font-medium text-stone-900">{current.name}</span>
            {current.deity && (
              <span className="hidden truncate text-stone-500 sm:inline">
                · {current.deity.name}
                {current.deity.village ? `, ${current.deity.village}` : ''}
              </span>
            )}
          </span>
        </span>
        <span aria-hidden="true" className="text-stone-400">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select a lineage"
          className="absolute left-0 right-0 z-30 mt-1 max-h-[28rem] overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg"
        >
          <div className="sticky top-0 z-10 border-b border-stone-100 bg-white p-2">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by kootam, deity, village…"
              className="w-full rounded-md border border-stone-200 px-2 py-1.5 text-sm focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300"
            />
          </div>

          <Group title={`Documented (${groups.documented.length})`} hint="Fully described, with kuladeivam">
            {groups.documented.map((m) => (
              <Option key={m.slug} m={m} active={m.slug === selected.kootam} onPick={pick} />
            ))}
          </Group>

          {groups.namedNoDeity.length > 0 && (
            <Group
              title={`Named, deity not yet documented (${groups.namedNoDeity.length})`}
              hint="Real kootam name on the published list, kuladeivam pending"
            >
              {groups.namedNoDeity.map((m) => (
                <Option key={m.slug} m={m} active={m.slug === selected.kootam} onPick={pick} />
              ))}
            </Group>
          )}

          {groups.stubs.length > 0 && (
            <Group
              title={`Wanted — undocumented (${groups.stubs.length})`}
              hint={
                <span>
                  Honest data-gap.{' '}
                  <a
                    href="/contribute/"
                    className="text-stone-700 underline hover:text-stone-900"
                  >
                    Contribute →
                  </a>
                </span>
              }
            >
              {groups.stubs.slice(0, query ? 50 : 6).map((m) => (
                <Option key={m.slug} m={m} active={m.slug === selected.kootam} onPick={pick} />
              ))}
              {!query && groups.stubs.length > 6 && (
                <div className="px-3 py-1.5 text-[11px] italic text-stone-500">
                  …{groups.stubs.length - 6} more. Use the search box to find a specific stub.
                </div>
              )}
            </Group>
          )}

          {groups.documented.length === 0 &&
            groups.namedNoDeity.length === 0 &&
            groups.stubs.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-stone-500">No matches.</div>
            )}
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-stone-100 last:border-b-0">
      <div className="bg-stone-50 px-3 py-1.5 text-[11px] uppercase tracking-wide text-stone-600">
        {title}
        {hint && <span className="ml-2 normal-case tracking-normal text-stone-500">— {hint}</span>}
      </div>
      <ul>{children}</ul>
    </div>
  );
}

function Option({
  m,
  active,
  onPick,
}: {
  m: ManifestEntry;
  active: boolean;
  onPick: (m: ManifestEntry) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(m)}
        aria-selected={active}
        role="option"
        className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-stone-100 ${
          active ? 'bg-stone-100' : ''
        }`}
      >
        <span aria-hidden="true" className="mt-0.5">
          {m.totemEmoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-stone-900">
            {m.name}{' '}
            <span className="font-normal text-stone-500">
              {m.tamilName ? `(${m.tamilName})` : ''}
            </span>
          </span>
          {m.deity ? (
            <span className="block text-xs text-stone-500">
              {m.deity.name}
              {m.deity.village ? `, ${m.deity.village}` : ''}
              {m.deity.district ? ` · ${m.deity.district}` : ''}
            </span>
          ) : (
            <span className="block text-xs italic text-stone-400">
              {m.status === 'stub'
                ? 'Stub — undocumented'
                : 'Kuladeivam not yet documented'}
            </span>
          )}
        </span>
        {m.attestation && (
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
              m.attestation === 'oral-family'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {m.attestation === 'oral-family' ? '🟡 oral' : '🟢 community'}
          </span>
        )}
      </button>
    </li>
  );
}
