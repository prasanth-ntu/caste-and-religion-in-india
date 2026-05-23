import { Popover } from './ui/Popover';

export interface CiteSourceMeta {
  id: string;
  type: 'paper' | 'book' | 'wiki' | 'inscription' | 'oral';
  title: string;
  authors: string[];
  year?: number;
  notes?: string;
}

export interface CiteWithPreviewProps {
  /** Display number (e.g. 1, 2, 3) shown in the chip. */
  n: number;
  /** Source metadata (resolved at SSR time in Cite.astro). */
  source: CiteSourceMeta;
}

const TYPE_LABEL: Record<CiteSourceMeta['type'], string> = {
  paper: 'paper',
  book: 'book',
  wiki: 'wiki',
  inscription: 'inscription',
  oral: 'oral',
};

const TYPE_CLASSES: Record<CiteSourceMeta['type'], string> = {
  paper: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  book: 'bg-amber-50 text-amber-800 ring-amber-200',
  wiki: 'bg-sky-50 text-sky-800 ring-sky-200',
  inscription: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  oral: 'bg-rose-50 text-rose-800 ring-rose-200',
};

function formatAuthors(authors: string[]): string {
  if (!authors || authors.length === 0) return '';
  if (authors.length <= 3) return authors.join(' · ');
  return `${authors.slice(0, 3).join(' · ')} et al.`;
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + '…';
}

/**
 * Inline citation chip with a hover/focus popover preview card.
 * Wraps an anchor → /sources/{id} in a Popover. The chip itself is small,
 * stone-tinted, and ring-focusable; the popover shows title, authors, year,
 * type badge, a 1-line notes excerpt, and a "View full entry →" link.
 */
export function CiteWithPreview({ n, source }: CiteWithPreviewProps) {
  const { id, type, title, authors, year, notes } = source;
  const href = `/sources/${id}`;
  const ariaLabel = `Reference ${n}: ${title}${year ? `, ${year}` : ''}`;

  const preview = (
    <div className="w-[260px] max-w-[280px] p-1">
      <div className="font-display text-[15px] leading-snug text-stone-900">
        {title}
      </div>
      {(authors.length > 0 || year) && (
        <div className="mt-1 text-xs text-stone-600">
          {formatAuthors(authors)}
          {authors.length > 0 && year ? ' · ' : ''}
          {year ? <span>{year}</span> : null}
        </div>
      )}
      <div className="mt-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TYPE_CLASSES[type]}`}
        >
          {TYPE_LABEL[type]}
        </span>
      </div>
      {notes && (
        <p className="mt-2 text-xs leading-snug text-stone-700">
          {truncate(notes, 100)}
        </p>
      )}
      <div className="mt-2 border-t border-stone-200 pt-2">
        <a
          href={href}
          className="text-xs font-medium text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded"
        >
          View full entry →
        </a>
      </div>
    </div>
  );

  return (
    <Popover content={preview} placement="bottom" trigger="hover">
      <a
        href={href}
        aria-label={ariaLabel}
        className="ml-0.5 inline-flex items-center rounded-full bg-stone-100 px-1.5 py-px text-[11px] font-medium text-stone-700 ring-1 ring-inset ring-stone-200 no-underline align-baseline hover:bg-stone-200 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
      >
        {n}
      </a>
    </Popover>
  );
}

export default CiteWithPreview;
