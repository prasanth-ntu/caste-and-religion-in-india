import { useEffect, useMemo, useState } from 'react';
import manifestRaw from '../data/lineage-manifest.json';
import communitiesRaw from '../data/communities-manifest.json';
import type { ManifestEntry } from './LineageSelector';
import LineageSelector from './LineageSelector';

const manifest = manifestRaw as ManifestEntry[];
// Non-kootam comparable lineages (e.g. Nagarathar temple-clans). Merged into
// compare lookups + pickers only — kept out of every other kootam surface.
const communities = communitiesRaw as ManifestEntry[];
const comparable = [...manifest, ...communities];

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
  return comparable.find((m) => m.slug === slug) ?? null;
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

  // When the user lands on /compare?...#chart (e.g. via the "Open full
  // compare view" CTA from a lineage page), jump straight to the table so
  // the intro doesn't hide the thing they came to see.
  useEffect(() => {
    if (!mounted) return;
    if (!bindToUrl) return;
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#chart') return;
    const a = find(aSlug);
    const b = find(bSlug);
    if (!a || !b || a.slug === b.slug) return;
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById('chart');
      if (!el) return;
      el.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [mounted, bindToUrl, aSlug, bSlug]);

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
            className="shrink-0 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
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
              extraEntries={communities}
              onChange={(sel) => setASlug(sel.kootam)}
            />
          </div>
          <button
            type="button"
            onClick={swap}
            disabled={!b}
            aria-label="Swap A and B"
            className="self-end rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
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
              extraEntries={communities}
              onChange={(sel) => setBSlug(sel.kootam)}
            />
          </div>
        </div>
      )}

      {!b && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-stone-600">
          <p className="font-medium text-stone-700">Pick a second lineage to compare against {a?.name ?? 'A'}.</p>
          <p className="mt-1">Try a kootam (Maniyan, Senganni, Vilayan) — or a different community altogether, like Vairavanpatti (Nagarathar).</p>
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
    <div id="chart" className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm scroll-mt-24">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50">
            <th
              scope="col"
              className="w-[30%] py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500"
            >
              Field
            </th>
            <th
              scope="col"
              className="w-[35%] py-3 px-3 text-left text-sm font-semibold text-stone-900"
            >
              <span aria-hidden="true" className="mr-1.5">{a.totemEmoji}</span>
              {a.name}
            </th>
            <th
              scope="col"
              className="w-[35%] py-3 pl-3 pr-4 text-left text-sm font-semibold text-stone-900"
            >
              <span aria-hidden="true" className="mr-1.5">{b.totemEmoji}</span>
              {b.name}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row) => (
            <TableRow key={row.key} row={row} compact={compact} />
          ))}
        </tbody>
      </table>
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

function lineageTypeLabel(m: ManifestEntry): string {
  return m.kind === 'community'
    ? `${m.parentCaste || 'Other community'} — temple-clan`
    : 'Kongu Vellala kootam';
}

function exogamyBasisLabel(m: ManifestEntry): string {
  return m.kind === 'community' ? m.exogamyBasis || 'Temple-clan' : 'Totem clan (kootam)';
}

function buildRows(a: ManifestEntry, b: ManifestEntry): Row[] {
  return [
    { key: 'name', label: 'Name', kind: 'scalar', aValue: a.name, bValue: b.name, diff: a.name !== b.name },
    { key: 'tamil', label: 'Tamil name', kind: 'scalar', aValue: a.tamilName, bValue: b.tamilName, diff: a.tamilName !== b.tamilName },
    {
      key: 'lineageType',
      label: 'Lineage type',
      kind: 'scalar',
      aValue: lineageTypeLabel(a),
      bValue: lineageTypeLabel(b),
      diff: lineageTypeLabel(a) !== lineageTypeLabel(b),
    },
    {
      key: 'exogamyBasis',
      label: 'Exogamy basis',
      kind: 'scalar',
      aValue: exogamyBasisLabel(a),
      bValue: exogamyBasisLabel(b),
      diff: exogamyBasisLabel(a) !== exogamyBasisLabel(b),
    },
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

function TableRow({ row, compact }: { row: Row; compact: boolean }) {
  const diffHighlight = row.diff ? 'bg-emerald-50/40' : '';
  return (
    <tr className={diffHighlight}>
      <td className="py-2.5 pl-4 pr-3 text-xs font-medium text-stone-500">
        <span>{row.label}</span>
        {row.diff && (
          <span aria-label="differs" className="ml-1.5 font-mono text-[10px] text-emerald-600">
            ≠
          </span>
        )}
      </td>
      <td className="py-2.5 px-3 align-top">
        <CellContent row={row} side="A" />
      </td>
      <td className="py-2.5 pl-3 pr-4 align-top">
        <CellContent row={row} side="B" />
      </td>
    </tr>
  );
}

function CellContent({ row, side }: { row: Row; side: 'A' | 'B' }) {
  const isA = side === 'A';
  if (row.kind === 'set') {
    const set = isA ? row.aSet ?? [] : row.bSet ?? [];
    const other = isA ? row.bSet ?? [] : row.aSet ?? [];
    const otherSet = new Set(other);
    if (set.length === 0) return <span className="text-sm italic text-stone-400">—</span>;
    return (
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
    );
  }
  const v = isA ? row.aValue : row.bValue;
  const isTier = row.key === 'attestation' && v && TIER_BADGE[v];
  if (isTier) {
    return (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TIER_BADGE[v!].cls}`}>
        {TIER_BADGE[v!].label}
      </span>
    );
  }
  return (
    <span className={`text-sm leading-snug ${row.diff ? 'font-medium text-stone-900' : 'text-stone-600'}`}>
      {v || '—'}
    </span>
  );
}
