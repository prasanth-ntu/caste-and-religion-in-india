/**
 * Reading-time + audience meta helpers for hub cards.
 *
 * `estimateReadTime(text)` — words / 200, rounded up to nearest minute,
 *   with a 1-minute floor. Stripping HTML/Markdown noise is left to the
 *   caller; callers typically pass the raw `body` of a content entry or
 *   a hand-written description.
 *
 * `formatMeta(audience, readTime)` — produces display-ready strings for
 *   the small "8 min read · For everyone" line under a card title.
 */

export type Audience = 'everyone' | 'researchers' | 'curious';

export function estimateReadTime(text: string): number {
  if (!text) return 1;
  // Light cleanup: strip HTML tags and collapse whitespace before counting.
  const cleaned = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>~\[\]\(\)]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned ? cleaned.split(' ').length : 0;
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}

const AUDIENCE_LABELS: Record<Audience, string> = {
  everyone: 'For everyone',
  researchers: 'For researchers',
  curious: 'For the curious',
};

export function formatMeta(
  audience: Audience | undefined,
  readTime: number | undefined,
): { time: string; audience: string } {
  const aud = audience ?? 'everyone';
  const t = readTime && readTime > 0 ? readTime : undefined;
  return {
    time: t ? `${t} min read` : '',
    audience: AUDIENCE_LABELS[aud],
  };
}
