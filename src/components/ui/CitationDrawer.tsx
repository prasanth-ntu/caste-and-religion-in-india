import { Drawer } from './Drawer';
import {
  type CiteSourceMeta,
  TYPE_LABEL,
  TYPE_CLASSES,
  formatAuthors,
} from '../CiteWithPreview';

export interface CitationDrawerProps {
  source: CiteSourceMeta;
  isMobile: boolean;
  onClose: () => void;
}

/**
 * Mobile-friendly citation preview: a thin wrapper over the shared {@link Drawer}
 * that shows a source's title, type, authors/year, notes, and a link to the
 * full /sources/{id} entry. Used by CiteWithPreview when a citation chip is
 * tapped on a small viewport, replacing the hover popover + instant redirect.
 */
export function CitationDrawer({ source, isMobile, onClose }: CitationDrawerProps) {
  const { id, type, title, authors, year, notes } = source;
  const href = `/sources/${id}`;

  const header = (
    <>
      <h3 className="text-lg font-bold leading-snug text-stone-900">{title}</h3>
      <div className="mt-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TYPE_CLASSES[type]}`}
        >
          {TYPE_LABEL[type]}
        </span>
      </div>
    </>
  );

  return (
    <Drawer isMobile={isMobile} onClose={onClose} ariaLabel={`Citation: ${title}`} header={header}>
      <div className="space-y-4 p-5 text-sm leading-relaxed text-stone-700">
        {(authors.length > 0 || year) && (
          <p className="text-stone-600">
            {formatAuthors(authors)}
            {authors.length > 0 && year ? ' · ' : ''}
            {year ? <span>{year}</span> : null}
          </p>
        )}
        {notes && <p>{notes}</p>}
        <div className="border-t border-stone-200 pt-4">
          <a
            href={href}
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded"
          >
            View full entry <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </Drawer>
  );
}

export default CitationDrawer;
