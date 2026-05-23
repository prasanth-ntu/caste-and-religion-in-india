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
 * Small banner shown at the top of the author's canonical deep-dive pages
 * (/lineage/konur, /lineage/kongu, /lineage/vellala, /lineage/gounder, /lineage/ancestors).
 *
 * - If the visitor's selected lineage IS kadai (default / author's): no banner — page reads
 *   as the author's first-person narrative.
 * - If the visitor has selected a different lineage: shows a banner explaining they're
 *   reading the author's canonical version, with a link to switch back to their own
 *   lineage's view via /lineage/k/{slug}/.
 *
 * Renders nothing during SSR and on first paint to avoid hydration flicker.
 */
export default function LineageContextBanner() {
  const [mounted, setMounted] = useState(false);
  const [currentSlug, setCurrentSlug] = useState<string>(DEFAULT_SLUG);

  useEffect(() => {
    setMounted(true);
    setCurrentSlug(readCurrentSlug());
  }, []);

  if (!mounted) return null;
  if (currentSlug === DEFAULT_SLUG) return null;

  const current = manifest.find((m) => m.slug === currentSlug);
  if (!current) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
      <p className="text-amber-900">
        <span className="font-semibold">Heads up:</span> you're reading the author's canonical
        deep-dive (★ Kadai Kootam / Konur Kaliamman). Your selected lineage is{' '}
        <span className="font-medium">
          {current.totemEmoji} {current.name}
          {current.deity ? ` / ${current.deity.name}` : ''}
        </span>
        .
      </p>
      <p className="mt-1.5">
        <a
          href={`/lineage/k/${current.slug}/`}
          className="inline-flex items-center gap-1 font-medium text-amber-900 underline hover:text-amber-950 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
        >
          Switch to your lineage view →
        </a>
      </p>
    </div>
  );
}
