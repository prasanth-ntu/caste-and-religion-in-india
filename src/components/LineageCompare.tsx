import { useEffect, useMemo, useState } from 'react';
import manifestRaw from '../data/lineage-manifest.json';
import communitiesRaw from '../data/communities-manifest.json';
import type { ManifestEntry } from './LineageSelector';
import LineageSelector from './LineageSelector';

// The shared ManifestEntry type (LineageSelector) doesn't declare the exogamy
// fields, but the generated manifest JSON carries them (see
// scripts/generate-lineage-manifest.mjs → exogamyPartners / exogamyPangaliExcluded,
// each an array of kootam *slugs*). Compare needs them, so widen the type locally.
type CompareEntry = ManifestEntry & {
  exogamyPartners?: string[];
  exogamyPangaliExcluded?: string[];
  /** Explicit detail-page URL. Communities declare it (e.g. Vairavanpatti →
   *  /lineage/vairavar/); kootams fall back to their canonical /lineage/k/<slug>/. */
  href?: string;
};

/** Resolve a comparable lineage to its detail page. Every kootam (documented or
 *  stub) has a canonical /lineage/k/<slug>/ route; communities carry an explicit
 *  href. Returns null when no detail page exists (so we render plain text). */
function detailHref(m: CompareEntry): string | null {
  if (m.href) return m.href;
  if (m.kind === 'community') return null;
  return `/lineage/k/${m.slug}/`;
}

const manifest = manifestRaw as CompareEntry[];
// Non-kootam comparable lineages (e.g. Nagarathar temple-clans). Merged into
// compare lookups + pickers only — kept out of every other kootam surface.
// Community entries have no totem-clan exogamy arrays (their exogamy is
// temple-clan based — see exogamyBasis), so these stay undefined for them.
const communities = communitiesRaw as CompareEntry[];
const comparable = [...manifest, ...communities];

/** Resolve a kootam slug to its display name, falling back to the raw token
 *  when it isn't a known entry (some partner lists use spelling variants that
 *  don't map to a canonical slug — e.g. "kaadai" for "kadai"). */
function partnerLabel(slug: string): string {
  return comparable.find((m) => m.slug === slug)?.name ?? slug;
}

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

function find(slug?: string | null): CompareEntry | null {
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
            {a && detailHref(a) ? (
              <a href={detailHref(a)!} className="font-medium text-stone-900 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-900">
                {a.name}
              </a>
            ) : (
              <span className="font-medium text-stone-900">{a?.name ?? 'A'}</span>
            )}
            <span className="mx-1 text-stone-400">vs</span>
            <span aria-hidden="true">{b.totemEmoji}</span>{' '}
            {detailHref(b) ? (
              <a href={detailHref(b)!} className="font-medium text-stone-900 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-900">
                {b.name}
              </a>
            ) : (
              <span className="font-medium text-stone-900">{b.name}</span>
            )}
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

/** Header cell for a compared lineage: totem emoji + name, linked to its detail
 *  page when one exists (kootam canonical route or a community's declared href). */
function LineageHeading({ m }: { m: CompareEntry }) {
  const href = detailHref(m);
  const inner = (
    <>
      <span aria-hidden="true" className="mr-1.5">{m.totemEmoji}</span>
      {m.name}
    </>
  );
  if (!href) return <span>{inner}</span>;
  return (
    <a
      href={href}
      className="inline-flex items-center text-stone-900 underline decoration-stone-300 decoration-1 underline-offset-2 transition-colors hover:decoration-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 rounded-sm"
    >
      {inner}
      <span aria-hidden="true" className="ml-1 text-xs text-stone-400">↗</span>
    </a>
  );
}

function CompareGrid({ a, b, compact }: { a: CompareEntry; b: CompareEntry; compact: boolean }) {
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
              <LineageHeading m={a} />
            </th>
            <th
              scope="col"
              className="w-[35%] py-3 pl-3 pr-4 text-left text-sm font-semibold text-stone-900"
            >
              <LineageHeading m={b} />
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
  kind: 'scalar' | 'set' | 'exogamy';
  aValue?: string;
  bValue?: string;
  aSet?: string[];
  bSet?: string[];
  diff: boolean;
  /** scalar/set rows: when the side has no documented value, render this honest
   *  "not yet documented" label instead of a bare em-dash. Keyed per side. */
  aEmptyLabel?: string;
  bEmptyLabel?: string;
  /** exogamy rows: per-side partner chips (display names) + the cross-pair verdict. */
  aExogamy?: ExogamyCell;
  bExogamy?: ExogamyCell;
  verdict?: ExogamyVerdict;
}

interface ExogamyCell {
  /** Marriageable partner clans (display names). */
  partners: string[];
  /** Pangali / excluded clans (display names). */
  excluded: string[];
  /** True when this side is a community whose exogamy isn't totem-clan based. */
  notKootamBased: boolean;
  /** True when the side carries no exogamy arrays at all (undocumented gap). */
  undocumented: boolean;
}

type ExogamyVerdict =
  | { kind: 'marriageable' }
  | { kind: 'excluded' }
  | { kind: 'unknown' };

function lineageTypeLabel(m: CompareEntry): string {
  return m.kind === 'community'
    ? `${m.parentCaste || 'Other community'} — temple-clan`
    : 'Kongu Vellala kootam';
}

function exogamyBasisLabel(m: CompareEntry): string {
  return m.kind === 'community' ? m.exogamyBasis || 'Temple-clan' : 'Totem clan (kootam)';
}

/** Build the per-side exogamy cell from the raw slug arrays. */
function exogamyCell(m: CompareEntry): ExogamyCell {
  const partners = m.exogamyPartners ?? [];
  const excluded = m.exogamyPangaliExcluded ?? [];
  return {
    partners: partners.map(partnerLabel),
    excluded: excluded.map(partnerLabel),
    // Communities use a temple-clan (Nava Kovil) exogamy system, not the
    // Kongu totem-clan one — so we can't express their rule as kootam chips.
    notKootamBased: m.kind === 'community',
    undocumented:
      m.kind !== 'community' && partners.length === 0 && excluded.length === 0,
  };
}

/** Derive the cross-pair verdict honestly: only assert marriageable/excluded
 *  when the *raw slugs* attest it. If neither side names the other, stay unknown
 *  rather than inventing a relationship. Excluded (pangali) takes precedence —
 *  a single excluded listing is a hard block regardless of any partner listing. */
function exogamyVerdict(a: CompareEntry, b: CompareEntry): ExogamyVerdict {
  // No verdict across communities — different exogamy systems.
  if (a.kind === 'community' || b.kind === 'community') return { kind: 'unknown' };
  const aPartners = a.exogamyPartners ?? [];
  const aExcluded = a.exogamyPangaliExcluded ?? [];
  const bPartners = b.exogamyPartners ?? [];
  const bExcluded = b.exogamyPangaliExcluded ?? [];
  if (aExcluded.includes(b.slug) || bExcluded.includes(a.slug)) {
    return { kind: 'excluded' };
  }
  if (aPartners.includes(b.slug) || bPartners.includes(a.slug)) {
    return { kind: 'marriageable' };
  }
  return { kind: 'unknown' };
}

/** Honest empty-state label for the deity-derived rows of one side. */
function deityEmptyLabel(m: CompareEntry): string {
  if (m.status === 'stub') return 'Stub — not yet documented';
  if (!m.deity) return 'Kuladeivam not yet documented';
  return 'Not yet documented';
}

function buildRows(a: CompareEntry, b: CompareEntry): Row[] {
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
    {
      key: 'exogamyPartners',
      label: 'Exogamy partners',
      kind: 'exogamy',
      aExogamy: exogamyCell(a),
      bExogamy: exogamyCell(b),
      verdict: exogamyVerdict(a, b),
      // Highlight the row when a definite verdict exists — that's the most
      // marriage-relevant signal on the table.
      diff: exogamyVerdict(a, b).kind !== 'unknown',
    },
    { key: 'totemType', label: 'Totem type', kind: 'scalar', aValue: a.totemType, bValue: b.totemType, diff: a.totemType !== b.totemType },
    { key: 'totemSpecies', label: 'Totem species', kind: 'scalar', aValue: a.totemSpecies, bValue: b.totemSpecies, diff: a.totemSpecies !== b.totemSpecies },
    { key: 'region', label: 'Region', kind: 'scalar', aValue: a.region, bValue: b.region, diff: a.region !== b.region },
    {
      key: 'deityName',
      label: 'Kuladeivam',
      kind: 'scalar',
      aValue: a.deity?.name ?? '',
      bValue: b.deity?.name ?? '',
      aEmptyLabel: deityEmptyLabel(a),
      bEmptyLabel: deityEmptyLabel(b),
      diff: (a.deity?.name ?? null) !== (b.deity?.name ?? null),
    },
    {
      key: 'village',
      label: 'Temple village',
      kind: 'scalar',
      aValue: a.deity?.village ?? '',
      bValue: b.deity?.village ?? '',
      aEmptyLabel: deityEmptyLabel(a),
      bEmptyLabel: deityEmptyLabel(b),
      diff: (a.deity?.village ?? null) !== (b.deity?.village ?? null),
    },
    {
      key: 'district',
      label: 'District',
      kind: 'scalar',
      aValue: a.deity?.district ?? '',
      bValue: b.deity?.district ?? '',
      aEmptyLabel: deityEmptyLabel(a),
      bEmptyLabel: deityEmptyLabel(b),
      diff: (a.deity?.district ?? null) !== (b.deity?.district ?? null),
    },
    {
      key: 'tradition',
      label: 'Deity tradition',
      kind: 'scalar',
      aValue: a.deity?.tradition ?? '',
      bValue: b.deity?.tradition ?? '',
      aEmptyLabel: deityEmptyLabel(a),
      bEmptyLabel: deityEmptyLabel(b),
      diff: (a.deity?.tradition ?? null) !== (b.deity?.tradition ?? null),
    },
    {
      key: 'festivals',
      label: 'Festivals',
      kind: 'set',
      aSet: a.deity?.festivals ?? [],
      bSet: b.deity?.festivals ?? [],
      // Distinguish "deity has no festivals recorded yet" from "no deity at all".
      aEmptyLabel: a.deity ? 'Not yet documented' : deityEmptyLabel(a),
      bEmptyLabel: b.deity ? 'Not yet documented' : deityEmptyLabel(b),
      diff: !setsEqual(a.deity?.festivals ?? [], b.deity?.festivals ?? []),
    },
    {
      key: 'attestation',
      label: 'Attestation',
      kind: 'scalar',
      aValue: a.attestation ?? '',
      bValue: b.attestation ?? '',
      aEmptyLabel: 'Not yet documented',
      bEmptyLabel: 'Not yet documented',
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

const VERDICT_BADGE: Record<
  Exclude<ExogamyVerdict['kind'], 'unknown'>,
  { label: string; cls: string }
> = {
  marriageable: { label: '✓ Marriageable', cls: 'bg-emerald-100 text-emerald-900' },
  excluded: { label: '✕ Excluded (pangali)', cls: 'bg-rose-100 text-rose-900' },
};

function TableRow({ row, compact }: { row: Row; compact: boolean }) {
  const diffHighlight = row.diff ? 'bg-emerald-50/40' : '';
  const verdict = row.kind === 'exogamy' ? row.verdict : undefined;
  return (
    <tr className={diffHighlight}>
      <td className="py-2.5 pl-4 pr-3 text-xs font-medium text-stone-500">
        <span>{row.label}</span>
        {row.diff && row.kind !== 'exogamy' && (
          <span aria-label="differs" className="ml-1.5 font-mono text-[10px] text-emerald-600">
            ≠
          </span>
        )}
        {verdict && verdict.kind !== 'unknown' && (
          <span
            className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal ${VERDICT_BADGE[verdict.kind].cls}`}
          >
            {VERDICT_BADGE[verdict.kind].label}
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

function EmptyState({ label }: { label?: string }) {
  return <span className="text-xs italic text-stone-400">{label || 'Not yet documented'}</span>;
}

function CellContent({ row, side }: { row: Row; side: 'A' | 'B' }) {
  const isA = side === 'A';

  if (row.kind === 'exogamy') {
    const cell = isA ? row.aExogamy : row.bExogamy;
    if (!cell) return <EmptyState />;
    if (cell.notKootamBased) {
      return (
        <span className="text-xs italic text-stone-500">
          Temple-clan (Nava Kovil) exogamy — not totem-clan based
        </span>
      );
    }
    if (cell.undocumented) {
      return <EmptyState label="Exogamy partners not yet documented" />;
    }
    return (
      <div className="space-y-1.5">
        {cell.partners.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {cell.partners.map((v) => (
              <li
                key={`p-${v}`}
                className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-900"
              >
                {v}
              </li>
            ))}
          </ul>
        )}
        {cell.excluded.length > 0 && (
          <div>
            <span className="block text-[10px] uppercase tracking-wide text-stone-400">
              Pangali — excluded
            </span>
            <ul className="mt-0.5 flex flex-wrap gap-1.5">
              {cell.excluded.map((v) => (
                <li
                  key={`x-${v}`}
                  className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs text-rose-800"
                >
                  {v}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (row.kind === 'set') {
    const set = isA ? row.aSet ?? [] : row.bSet ?? [];
    const other = isA ? row.bSet ?? [] : row.aSet ?? [];
    const otherSet = new Set(other);
    if (set.length === 0) {
      return <EmptyState label={isA ? row.aEmptyLabel : row.bEmptyLabel} />;
    }
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
  if (!v) {
    return <EmptyState label={isA ? row.aEmptyLabel : row.bEmptyLabel} />;
  }
  return (
    <span className={`text-sm leading-snug ${row.diff ? 'font-medium text-stone-900' : 'text-stone-600'}`}>
      {v}
    </span>
  );
}
