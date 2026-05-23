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

interface Props {
  pageSlug: string;
  pageName: string;
}

/**
 * Rose banner shown on a kootam page when the visitor's currently-selected kootam
 * matches this page's slug. Companion to the SSR'd Kadai-specific banner — this one
 * only fires for non-Kadai kootams so the two never stack.
 */
export default function LineageYoursBanner({ pageSlug, pageName }: Props) {
  const [currentSlug, setCurrentSlug] = useState<string>(DEFAULT_SLUG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentSlug(readCurrentSlug());
  }, []);

  if (!mounted) return null;
  if (pageSlug === DEFAULT_SLUG) return null;
  if (currentSlug !== pageSlug) return null;

  const current = manifest.find((m) => m.slug === pageSlug);
  if (!current) return null;

  return (
    <div className="mb-6 rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-amber-50 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-rose-700">
        ★ This is your selected kootam
      </p>
      <p className="mt-1 text-sm text-stone-800">
        You've picked <strong>{pageName}</strong> as your lineage. The kuladeivam
        {current.deity ? (
          <>
            {' '}is{' '}
            <strong>{current.deity.name}</strong>
            {current.deity.village ? <> ({current.deity.village}{current.deity.district ? `, ${current.deity.district}` : ''})</> : null}
            .
          </>
        ) : (
          <> for this kootam is not yet documented.</>
        )}{' '}
        <a
          href={`/lineage/k/${pageSlug}/`}
          className="font-medium underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
        >
          Open the {pageName} compare-and-explore page →
        </a>
      </p>
    </div>
  );
}
