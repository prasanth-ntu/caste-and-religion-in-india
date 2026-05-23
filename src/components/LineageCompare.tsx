import { useEffect, useMemo, useState } from 'react';
import manifestRaw from '../data/lineage-manifest.json';
import type { ManifestEntry } from './LineageSelector';
import LineageSelector from './LineageSelector';

const manifest = manifestRaw as ManifestEntry[];

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  community: { label: '🟢 community', cls: 'bg-emerald-100 text-emerald-900' },
  'oral-family': { label: '🟡 oral-family', cls: 'bg-amber-100 text-amber-900' },
  academic: { label: '🟢 academic', cls: 'bg-emerald-100 text-emerald-900' },
};

export interface LineageCompareProps {
  /** Initial A slug. */
  initialA?: string;
  /** Initial B slug. */
  initialB?: string;
  /** Reads URL params on mount when true (default). Set to false inside the overlay drawer. */
  bindToUrl?: boolean;
  /** Compact mode used inside the overlay drawer (no top-level selectors, fewer paddings). */
  compact?: boolean;
}

function find(slug?: string | null): ManifestEntry | null {
  if (!slug) return null;
  return manifest.find((m) => m.slug === slug) ?? null;
}

function paramsFromUrl(): { a: string; b: string | null } {
  if (typeof window === 'undefined') return { a: 'kadai', b: null };
  const u = new URL(window.location.href);
  const a = u.searchParams.get('a') ?? 'kadai';
  const b = u.searchParams.get('b');
  return { a, b };
}

function writeUrl(a: string, b: string | null) {
  if (typeof window === 'undefined') return;
  const u = new URL(window.location.href);
  u.searchParams.set('a', a);
  if (b) u.searchParams.set('b', b);
  else u.searchParams.delete('b');
  window.history.replaceState({}, '', u.toString());
}

export default function LineageCompare({
  initialA,
  initialB,
  bindToUrl = true,
  compact = false,
}: LineageCompareProps) {
  const [mounted, setMounted] = useState(false);
  const [aSlug, setASlug] = useState<string>(initialA ?? 'kadai');
  const [bSlug, setBSlug] = useState<string | null>(initialB ?? null);

  useEffect(() => {
    setMounted(true);
    if (bindToUrl) {
      const { a, b } = paramsFromUrl();
      if (find(a)) setASlug(a);
      if (b && find(b)) setBSlug(b);
    }
  }, [bindToUrl]);

  useEffect(() => {
    if (bindToUrl && mounted) writeUrl(aSlug, bSlug);
  }, [aSlug, bSlug, bindToUrl, mounted]);

  const a = find(aSlug);
  const b = find(bSlug);

  const swap = () => {
    if (!b) return;
    setASlug(b.slug);
    setBSlug(a?.slug ?? null);
  };

  if (!mounted) {
    return <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-500">Loading…</div>;
  }

  return (
    <div>
      {!compact && b && (
        <div className="sticky top-0 z-20 -mx-6 mb-3 flex items-center justify-between gap-2 border-b border-stone-200 bg-white/95 px-6 py-2 text-sm shadow-sm backdrop-blur md:hidden">
          <span className="min-w-0 truncate">
            <span aria-hidden="true">{a?.totemEmoji}</span>{' '}
            <span className="font-medium text-stone-900">{a?.name ?? 'A'}</span>
            <span className="mx-1 text-stone-400">vs</span>
            <span aria-hidden="true">{b.totemEmoji}</span>{' '}
            <span className="font-medium text-stone-900">{b.name}</span>
          </span>
          <button
            type="button"
            onClick={swap}
            aria-label="Swap A and B"
            className="shrink-0 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:border-stone-400"
          >
            ⇄ Swap
          </button>
        </div>
      )}
      {!compact && (
        <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Lineage A
            </p>
            <LineageSelector
              navigateOnChange={false}
              value={aSlug}
              compact
              label="A"
              onChange={(sel) => setASlug(sel.kootam)}
            />
          </div>
          <button
            type="button"
            onClick={swap}
            disabled={!b}
            aria-label="Swap A and B"
            className="self-end rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ⇄ Swap
          </button>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Lineage B
            </p>
            <LineageSelector
              navigateOnChange={false}
              value={bSlug ?? ''}
              compact
              label="B"
              onChange={(sel) => setBSlug(sel.kootam)}
            />
          </div>
        </div>
      )}

      {!b && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-stone-600">
          <p className="font-medium text-stone-700">Pick a second lineage to compare against {a?.name ?? 'A'}.</p>
          <p className="mt-1">Try one of: Maniyan, Senganni, Vilayan.</p>
        </div>
      )}

      {a && b && a.slug === b.slug && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          You've selected the same lineage on both sides. Pick a different one for B to see a comparison.
        </div>
      )}

      {a && b && a.slug !== b.slug && <CompareGrid a={a} b={b} compact={compact} />}

      {!compact && (
        <p className="mt-6 text-xs text-stone-500">
          Legend: <span className="rounded bg-emerald-100 px-1.5 py-0.5">shared</span>{' '}
          <span className="rounded bg-amber-100 px-1.5 py-0.5">unique</span>{' '}
          fields with a <span className="font-mono">≠</span> badge differ between A and B.
          "Different" doesn't mean "wrong" — both can be authentically attested.
        </p>
      )}
    </div>
  );
}

function CompareGrid({ a, b, compact }: { a: ManifestEntry; b: ManifestEntry; compact: boolean }) {
  const rows = useMemo(() => buildRows(a, b), [a, b]);
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Row key={row.key} row={row} compact={compact} />
      ))}
    </div>
  );
}

interface Row {
  key: string;
  label: string;
  kind: 'scalar' | 'set';
  aValue?: string;
  bValue?: string;
  aSet?: string[];
  bSet?: string[];
  diff: boolean;
}

function buildRows(a: ManifestEntry, b: ManifestEntry): Row[] {
  return [
    { key: 'name', label: 'Name', kind: 'scalar', aValue: a.name, bValue: b.name, diff: a.name !== b.name },
    { key: 'tamil', label: 'Tamil name', kind: 'scalar', aValue: a.tamilName, bValue: b.tamilName, diff: a.tamilName !== b.tamilName },
    { key: 'totemType', label: 'Totem type', kind: 'scalar', aValue: a.totemType, bValue: b.totemType, diff: a.totemType !== b.totemType },
    { key: 'totemSpecies', label: 'Totem species', kind: 'scalar', aValue: a.totemSpecies, bValue: b.totemSpecies, diff: a.totemSpecies !== b.totemSpecies },
    { key: 'region', label: 'Region', kind: 'scalar', aValue: a.region, bValue: b.region, diff: a.region !== b.region },
    {
      key: 'deityName',
      label: 'Kuladeivam',
      kind: 'scalar',
      aValue: a.deity?.name ?? '—',
      bValue: b.deity?.name ?? '—',
      diff: (a.deity?.name ?? null) !== (b.deity?.name ?? null),
    },
    {
      key: 'village',
      label: 'Temple village',
      kind: 'scalar',
      aValue: a.deity?.village ?? '—',
      bValue: b.deity?.village ?? '—',
      diff: (a.deity?.village ?? null) !== (b.deity?.village ?? null),
    },
    {
      key: 'district',
      label: 'District',
      kind: 'scalar',
      aValue: a.deity?.district ?? '—',
      bValue: b.deity?.district ?? '—',
      diff: (a.deity?.district ?? null) !== (b.deity?.district ?? null),
    },
    {
      key: 'tradition',
      label: 'Deity tradition',
      kind: 'scalar',
      aValue: a.deity?.tradition ?? '—',
      bValue: b.deity?.tradition ?? '—',
      diff: (a.deity?.tradition ?? null) !== (b.deity?.tradition ?? null),
    },
    {
      key: 'festivals',
      label: 'Festivals',
      kind: 'set',
      aSet: a.deity?.festivals ?? [],
      bSet: b.deity?.festivals ?? [],
      diff: !setsEqual(a.deity?.festivals ?? [], b.deity?.festivals ?? []),
    },
    {
      key: 'attestation',
      label: 'Attestation',
      kind: 'scalar',
      aValue: a.attestation ?? '—',
      bValue: b.attestation ?? '—',
      diff: a.attestation !== b.attestation,
    },
    {
      key: 'status',
      label: 'Status',
      kind: 'scalar',
      aValue: a.status,
      bValue: b.status,
      diff: a.status !== b.status,
    },
  ];
}

function setsEqual(x: string[], y: string[]) {
  if (x.length !== y.length) return false;
  const sx = new Set(x);
  return y.every((v) => sx.has(v));
}

function Row({ row, compact }: { row: Row; compact: boolean }) {
  const diffCls = row.diff
    ? 'border-l-4 border-l-emerald-400 bg-white'
    : 'border-l-4 border-l-stone-200 bg-stone-50';
  return (
    <div className={`grid gap-2 rounded-lg ${diffCls} p-3 md:grid-cols-[1fr_auto_1fr] md:items-center`}>
      <Cell value={row} side="A" compact={compact} />
      <div className="flex items-center justify-center text-xs">
        <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-600">
          {row.label}
        </span>
        {row.diff && (
          <span aria-label="differs" className="ml-1 font-mono text-emerald-700">
            ≠
          </span>
        )}
      </div>
      <Cell value={row} side="B" compact={compact} />
    </div>
  );
}

function Cell({ value, side, compact }: { value: Row; side: 'A' | 'B'; compact: boolean }) {
  const isA = side === 'A';
  if (value.kind === 'set') {
    const set = isA ? value.aSet ?? [] : value.bSet ?? [];
    const other = isA ? value.bSet ?? [] : value.aSet ?? [];
    const otherSet = new Set(other);
    return (
      <div className={`${isA ? 'order-1 md:order-none' : 'order-3 md:order-none'}`}>
        {!compact && (
          <p className="mb-1 text-[10px] uppercase tracking-wider text-stone-500 md:hidden">({side})</p>
        )}
        {set.length === 0 ? (
          <span className="text-sm italic text-stone-400">—</span>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {set.map((v) => {
              const shared = otherSet.has(v);
              return (
                <li
                  key={v}
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    shared
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-amber-300 bg-amber-50 text-amber-900'
                  }`}
                >
                  {v}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
  const v = isA ? value.aValue : value.bValue;
  const isTier = value.key === 'attestation' && v && TIER_BADGE[v];
  return (
    <div className={`${isA ? 'order-1 md:order-none' : 'order-3 md:order-none'}`}>
      {!compact && (
        <p className="mb-1 text-[10px] uppercase tracking-wider text-stone-500 md:hidden">({side})</p>
      )}
      {isTier ? (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TIER_BADGE[v!].cls}`}>
          {TIER_BADGE[v!].label}
        </span>
      ) : (
        <p className={`text-sm ${value.diff ? 'font-medium text-stone-900' : 'text-stone-700'}`}>
          {v || '—'}
        </p>
      )}
    </div>
  );
}
