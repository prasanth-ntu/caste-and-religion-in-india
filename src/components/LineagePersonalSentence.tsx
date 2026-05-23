import { useEffect, useState } from 'react';
import {
  manifest,
  DEFAULT_SLUG,
  AUTHOR_SLUG,
  readCurrentSlug,
  hasExplicitSelection,
  subscribeLineageChange,
} from '../lib/lineage-selection';

/**
 * Renders the personal "Mine is Kadai" sentence on /lineage/index.
 * On non-Kadai selection, swaps to "Yours is {name} (…). The kuladeivam is {deity}…".
 * When the reader explicitly selects Kadai (same as author), renders a "same as the author's" branch.
 * SSR + first-paint = canonical Kadai copy, so search engines see the author's narrative.
 */
export default function LineagePersonalSentence() {
  const [slug, setSlug] = useState<string>(DEFAULT_SLUG);
  const [explicit, setExplicit] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      setSlug(readCurrentSlug());
      setExplicit(hasExplicitSelection());
    };
    update();
    return subscribeLineageChange(update);
  }, []);

  // Reader explicitly selected the author's kootam (Kadai)
  if (explicit && slug === AUTHOR_SLUG) {
    return (
      <>
        Yours is <strong>Kadai</strong> (<span className="font-tamil">காடை</span>, quail) — same as
        the author&apos;s. The kuladeivam is <strong>Konur Kaliamman</strong>, a village goddess in
        present-day Namakkal district.{' '}
        <a
          href="/lineage/k/kadai/"
          className="underline hover:text-stone-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
        >
          Open Kadai Kootam&apos;s page →
        </a>
      </>
    );
  }

  // Default: no explicit selection, or slug falls back to Kadai
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

  // Reader selected a non-Kadai documented kootam
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
        Open {current.name}&apos;s page →
      </a>
    </>
  );
}
