import manifestRaw from '../data/lineage-manifest.json';
import type { ManifestEntry } from '../components/LineageSelector';

export const manifest = manifestRaw as ManifestEntry[];
export const STORAGE_KEY = 'decoded.lineage';
export const DEFAULT_SLUG = 'kadai';
export const AUTHOR_SLUG = 'kadai';

export function readCurrentSlug(): string {
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

export function subscribeLineageChange(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('decoded:lineage-changed', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('decoded:lineage-changed', handler);
    window.removeEventListener('storage', handler);
  };
}

/** True when the reader's selection is explicitly the author's lineage. */
export function isReaderEqualsAuthor(slug: string, explicit: boolean): boolean {
  return explicit && slug === AUTHOR_SLUG;
}

/** Returns true if there was an explicit selection (URL param or localStorage), false if we fell back to DEFAULT_SLUG. */
export function hasExplicitSelection(): boolean {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  if (url.searchParams.get('kootam')) return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.kootam) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
