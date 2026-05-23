import { useEffect, useState } from 'react';
import manifestRaw from '../data/lineage-manifest.json';
import type { ManifestEntry } from './LineageSelector';

const manifest = manifestRaw as ManifestEntry[];
const STORAGE_KEY = 'decoded.lineage';
const DEFAULT_SLUG = 'kadai';

function readCurrentSlug(): string {
  if (typeof window === 'undefined') return DEFAULT_SLUG;
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get('kootam');
  if (fromUrl && manifest.some((m) => m.slug === fromUrl)) return fromUrl;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.kootam && manifest.some((m) => m.slug === parsed.kootam)) return parsed.kootam;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SLUG;
}

/**
 * Renders the personal "Mine is Kadai" sentence on /lineage/index.
 * On non-Kadai selection, swaps to "Yours is {name} (…). The kuladeivam is {deity}…".
 * SSR + first-paint = canonical Kadai copy, so search engines see the author's narrative.
 */
export default function LineagePersonalSentence() {
  const [slug, setSlug] = useState<string>(DEFAULT_SLUG);

  useEffect(() => {
    setSlug(readCurrentSlug());
  }, []);

  if (slug === DEFAULT_SLUG) {
    return (
      <>
        Mine is Kadai (<span className="font-tamil">காடை</span>, quail). The kuladeivam — clan
        deity — sits at the bottom of the tree: Konur Kaliamman, a village goddess in present-day
        Namakkal district.
      </>
    );
  }

  const current = manifest.find((m) => m.slug === slug);
  if (!current) {
    return (
      <>
        Mine is Kadai (<span className="font-tamil">காடை</span>, quail). The kuladeivam — clan
        deity — sits at the bottom of the tree: Konur Kaliamman, a village goddess in present-day
        Namakkal district.
      </>
    );
  }

  return (
    <>
      Yours is <strong>{current.name}</strong>
      {current.tamilName ? (
        <>
          {' '}(<span className="font-tamil">{current.tamilName}</span>
          {current.totemSpecies ? `, ${current.totemSpecies}` : ''})
        </>
      ) : null}
      .{' '}
      {current.deity ? (
        <>
          The kuladeivam is <strong>{current.deity.name}</strong>
          {current.deity.village
            ? `, a village deity in ${current.deity.village}${
                current.deity.district ? ` (${current.deity.district} district)` : ''
              }`
            : ''}
          .{' '}
        </>
      ) : (
        <>The kuladeivam for this kootam is not yet documented on this site.{' '}</>
      )}
      <a
        href={`/lineage/k/${current.slug}/`}
        className="underline hover:text-stone-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
      >
        Open {current.name}'s page →
      </a>
    </>
  );
}
