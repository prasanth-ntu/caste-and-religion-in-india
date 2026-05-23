import { useEffect, useMemo, useState } from 'react';
import manifestRaw from '../data/lineage-manifest.json';
import type { ManifestEntry } from './LineageSelector';

const manifest = manifestRaw as ManifestEntry[];
const STORAGE_KEY = 'decoded.lineage';
const DEFAULT_SLUG = 'kadai';

/**
 * Swap strategy (Option B, kept minimal):
 *
 * The Astro page wraps the SSR Kadai card grid in:
 *   <div id="lineage-hub-cards" data-default-lineage="kadai"> …SSR cards… </div>
 * followed by <LineageHubAdapter client:load />.
 *
 * On mount, this island reads the visitor's lineage selection.
 *   - If selection === Kadai (default): the island renders nothing; the SSR
 *     Kadai cards remain visible. This keeps SEO + first-paint correct.
 *   - If selection !== Kadai: the island hides the SSR Kadai cards (by adding
 *     a `hidden` class to the sibling #lineage-hub-cards element) and renders
 *     its own alternate card grid in their place.
 *
 * The island also re-evaluates on the `decoded:lineage-changed` window event
 * (dispatched by LineageChip / LineageSelector) so the swap is live without
 * reload.
 */

function readCurrentSlug(): string {
  if (typeof window === 'undefined') return DEFAULT_SLUG;
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get('kootam');
  if (fromUrl && manifest.some((m) => m.slug === fromUrl)) return fromUrl;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.kootam && manifest.some((m) => m.slug === parsed.kootam)) {
        return parsed.kootam;
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SLUG;
}

function setSsrCardsHidden(hidden: boolean) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('lineage-hub-cards');
  if (!el) return;
  if (hidden) el.classList.add('hidden');
  else el.classList.remove('hidden');
}

export default function LineageHubAdapter() {
  const [slug, setSlug] = useState<string>(DEFAULT_SLUG);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const next = readCurrentSlug();
    setSlug(next);
    setSsrCardsHidden(next !== DEFAULT_SLUG);
    const onChange = () => {
      const n = readCurrentSlug();
      setSlug(n);
      setSsrCardsHidden(n !== DEFAULT_SLUG);
    };
    window.addEventListener('decoded:lineage-changed', onChange);
    window.addEventListener('storage', onChange);
    // Cleanup: restore the SSR cards if the adapter unmounts (e.g., view transition)
    return () => {
      window.removeEventListener('decoded:lineage-changed', onChange);
      window.removeEventListener('storage', onChange);
      setSsrCardsHidden(false);
    };
  }, []);

  const current = useMemo(
    () => manifest.find((m) => m.slug === slug) ?? manifest[0],
    [slug]
  );

  // Before hydration OR when Kadai is selected, render nothing — let the SSR
  // canonical card grid speak for itself.
  if (!hydrated || slug === DEFAULT_SLUG) {
    // Still render the "Currently viewing" line so the user sees confirmation
    // of the default lineage when hydrated.
    if (hydrated && slug === DEFAULT_SLUG) {
      return (
        <p className="mb-6 text-xs text-stone-500">
          <span aria-hidden="true">★</span> Currently viewing:{' '}
          <strong className="font-medium text-stone-700">Kadai Kootam</strong>
          {' · '}Konur Kaliamman (author&apos;s lineage)
        </p>
      );
    }
    return null;
  }

  const isStub = current.status === 'stub';
  const detailHref = `/lineage/k/${current.slug}/`;

  return (
    <div>
      <p className="mb-6 text-xs text-stone-500">
        Currently viewing:{' '}
        <strong className="font-medium text-stone-700">{current.name}</strong>
        {current.tamilName ? (
          <>
            {' '}
            <span className="font-tamil">({current.tamilName})</span>
          </>
        ) : null}
        {current.deity ? (
          <>
            {' · '}
            {current.deity.name}
            {current.deity.village ? `, ${current.deity.village}` : ''}
          </>
        ) : null}
      </p>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold text-stone-900">
          Drill into a layer
          <span className="ml-2 font-tamil text-lg font-medium text-stone-600">அடுக்குகள்</span>
        </h2>

        {isStub ? (
          <StubGrid current={current} detailHref={detailHref} />
        ) : (
          <DocumentedGrid current={current} detailHref={detailHref} />
        )}

        {/* Author's parallel narrative — links back to the Kadai canonical pages */}
        <a
          href="/lineage/konur"
          className="group mt-4 flex items-start gap-4 rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 via-amber-50 to-rose-50 p-6 shadow-md transition-all hover:border-rose-400 hover:shadow-lg"
        >
          <span className="text-4xl" aria-hidden="true">
            🪔
          </span>
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-rose-700">
              Author&apos;s parallel narrative
            </span>
            <span className="mt-1 block text-xl font-bold text-stone-900">
              Read the Kadai story
              <span className="ml-2 font-tamil text-base font-medium text-rose-700">காடை</span>
            </span>
            <span className="mt-2 block text-sm text-stone-700">
              The author&apos;s lineage runs Kongu → Vellala → Gounder → Kadai → Konur Kaliamman.
              Use it as a worked example of how to investigate your own.
            </span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-rose-800 group-hover:underline">
              Read the Kadai story →
            </span>
          </span>
        </a>
      </section>
    </div>
  );
}

function DocumentedGrid({
  current,
  detailHref,
}: {
  current: ManifestEntry;
  detailHref: string;
}) {
  // Exogamy partners — the manifest does not currently carry this field;
  // surface a gentle "not documented" note rather than fabricating data.
  const exogamyPartners: string[] = [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Totem */}
      <div className="group flex items-start gap-4 rounded-2xl border bg-amber-50 border-amber-200 p-5 shadow-sm">
        <span className="text-3xl" aria-hidden="true">
          {current.totemEmoji}
        </span>
        <span>
          <span className="block text-lg font-semibold text-stone-900">
            Totem
            <span className="ml-2 font-tamil text-sm font-medium text-stone-500">குலச்சின்னம்</span>
          </span>
          <span className="mt-1 block text-sm text-stone-600">
            {current.totemSpecies || 'Species not yet documented on this site.'}
            {current.tamilName ? (
              <>
                {' '}
                <span className="font-tamil text-stone-500">({current.tamilName})</span>
              </>
            ) : null}
          </span>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-stone-700">
            {current.totemType ? `Type: ${current.totemType}` : null}
          </span>
        </span>
      </div>

      {/* Kuladeivam */}
      <a
        href={detailHref}
        className="group flex items-start gap-4 rounded-2xl border bg-rose-50 border-rose-200 p-5 shadow-sm transition-all hover:border-rose-400"
      >
        <span className="text-3xl" aria-hidden="true">
          🪔
        </span>
        <span>
          <span className="block text-lg font-semibold text-stone-900">
            Kuladeivam
            <span className="ml-2 font-tamil text-sm font-medium text-stone-500">குலதெய்வம்</span>
          </span>
          <span className="mt-1 block text-sm text-stone-600">
            {current.deity ? (
              <>
                <strong>{current.deity.name}</strong>
                {current.deity.village ? (
                  <>
                    {' '}
                    — {current.deity.village}
                    {current.deity.district ? `, ${current.deity.district} district` : ''}
                  </>
                ) : null}
                {current.deity.tradition ? <>. {current.deity.tradition}.</> : null}
              </>
            ) : (
              <em>Kuladeivam for this kootam is not yet documented on this site.</em>
            )}
          </span>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-stone-700 group-hover:underline">
            Open kootam page
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </span>
        </span>
      </a>

      {/* Exogamy partners */}
      <div className="group flex items-start gap-4 rounded-2xl border bg-violet-50 border-violet-200 p-5 shadow-sm">
        <span className="text-3xl" aria-hidden="true">
          🤝
        </span>
        <span>
          <span className="block text-lg font-semibold text-stone-900">
            Exogamy partners
            <span className="ml-2 font-tamil text-sm font-medium text-stone-500">பிற குலங்கள்</span>
          </span>
          <span className="mt-1 block text-sm text-stone-600">
            {exogamyPartners.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {exogamyPartners.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-violet-800 ring-1 ring-violet-200"
                  >
                    {p}
                  </span>
                ))}
              </span>
            ) : (
              <em>
                Exogamy partner kootams are not yet recorded in the manifest. The general rule:
                marriage outside one&apos;s own kootam, within the Kongu Vellala fold.{' '}
                <a href="/contribute/" className="underline hover:text-stone-900">
                  Contribute →
                </a>
              </em>
            )}
          </span>
        </span>
      </div>

      {/* Read on → full per-kootam page */}
      <a
        href={detailHref}
        className="group flex items-start gap-4 rounded-2xl border bg-emerald-50 border-emerald-200 p-5 shadow-sm transition-all hover:border-emerald-400"
      >
        <span className="text-3xl" aria-hidden="true">
          📖
        </span>
        <span>
          <span className="block text-lg font-semibold text-stone-900">
            Read on
            <span className="ml-2 font-tamil text-sm font-medium text-stone-500">மேலும்</span>
          </span>
          <span className="mt-1 block text-sm text-stone-600">
            Full {current.name} page — totem, deity, region, attestation tier, sources.
          </span>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-stone-700 group-hover:underline">
            {detailHref}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </span>
        </span>
      </a>
    </div>
  );
}

function StubGrid({
  current,
  detailHref,
}: {
  current: ManifestEntry;
  detailHref: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border bg-emerald-50 border-emerald-200 p-5 shadow-sm">
        <span className="block text-lg font-semibold text-stone-900">
          What we know
          <span className="ml-2 font-tamil text-sm font-medium text-stone-500">தெரிந்தவை</span>
        </span>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
          <li>
            Name: <strong>{current.name}</strong>
            {current.tamilName ? (
              <>
                {' '}
                (<span className="font-tamil">{current.tamilName}</span>)
              </>
            ) : null}
          </li>
          {current.totemType ? <li>Totem type: {current.totemType}</li> : null}
          {current.totemSpecies ? <li>Totem species: {current.totemSpecies}</li> : null}
          {current.region ? <li>Region: {current.region}</li> : null}
          <li>Status: stub — undocumented on this site.</li>
        </ul>
      </div>

      <div className="rounded-2xl border bg-amber-50 border-amber-200 p-5 shadow-sm">
        <span className="block text-lg font-semibold text-stone-900">
          What we need
          <span className="ml-2 font-tamil text-sm font-medium text-stone-500">தேவையானவை</span>
        </span>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
          <li>Kuladeivam name + village + district.</li>
          <li>Totem species confirmation + Tamil name.</li>
          <li>Exogamy partner kootams (oral or written).</li>
          <li>Any community source or family elder attestation.</li>
        </ul>
        <a
          href="/contribute/"
          className="mt-3 inline-flex items-center gap-1 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-amber-800"
        >
          Contribute what you know →
        </a>
      </div>

      <a
        href={detailHref}
        className="group sm:col-span-2 flex items-start gap-4 rounded-2xl border bg-stone-50 border-stone-200 p-5 shadow-sm transition-all hover:border-stone-400"
      >
        <span className="text-3xl" aria-hidden="true">
          📄
        </span>
        <span>
          <span className="block text-lg font-semibold text-stone-900">
            Stub page for {current.name}
          </span>
          <span className="mt-1 block text-sm text-stone-600">
            A minimal placeholder page exists at <code className="text-xs">{detailHref}</code>. As
            data lands, it will be promoted to a full per-kootam page.
          </span>
        </span>
      </a>
    </div>
  );
}
