import { useEffect, useMemo } from 'react';
import { FilterBar } from '../ui/FilterBar';
import { useUrlFilterState } from '../../hooks/useUrlFilterState';

const TYPE_ORDER = ['paper', 'book', 'wiki', 'inscription', 'oral'] as const;
type SourceType = (typeof TYPE_ORDER)[number];

/**
 * Threshold (inclusive minimum) for the "most cited" toggle. Sources with a
 * citation count below this are hidden when the toggle is on. Tuned to leave
 * roughly a third of the catalogue visible on the current dataset (~39 src).
 */
const MOST_CITED_THRESHOLD = 2;

export interface SourcesFilterClientProps {
  /**
   * Lightweight metadata for each source card. The actual card markup is
   * still rendered server-side by Astro — this island only manages
   * visibility by toggling `.is-hidden` on the matching `<article>`.
   */
  sources: ReadonlyArray<{
    slug: string;
    type: SourceType;
    citationCount: number;
  }>;
  /** CSS selector for the grid that contains the server-rendered cards. */
  gridSelector?: string;
}

export default function SourcesFilterClient({
  sources,
  gridSelector = '[data-sources-grid]',
}: SourcesFilterClientProps) {
  const { state, toggle, setFacet, clearAll, isActive } = useUrlFilterState({
    defaults: {
      type: [] as string[],
      most_cited: [] as string[],
    },
    paramMap: { type: 'type', most_cited: 'most_cited' },
  });

  const mostCited = state.most_cited.includes('1');

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of sources) m[s.type] = (m[s.type] ?? 0) + 1;
    return m;
  }, [sources]);

  const matches = useMemo(() => {
    const types = new Set(state.type);
    return sources.filter((s) => {
      const typeOk = types.size === 0 || types.has(s.type);
      const cited = !mostCited || s.citationCount >= MOST_CITED_THRESHOLD;
      return typeOk && cited;
    });
  }, [sources, state.type, mostCited]);

  // Sync visibility onto the server-rendered cards.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const grid = document.querySelector(gridSelector);
    if (!grid) return;
    const visible = new Set(matches.map((m) => m.slug));
    const cards = grid.querySelectorAll<HTMLElement>('.source-card');
    cards.forEach((card) => {
      const slug = card.dataset.slug ?? '';
      const show = visible.has(slug);
      card.classList.toggle('is-hidden', !show);
    });
  }, [matches, gridSelector]);

  const activeCount = state.type.length + (mostCited ? 1 : 0);
  const hasFilters = activeCount > 0;
  const hiddenCount = sources.length - matches.length;

  return (
    <>
      <FilterBar ariaLabel="Filter sources" scrollOnMobile className="mb-3">
        <FilterBar.ChipGroup label="Type">
          {TYPE_ORDER.filter((t) => (typeCounts[t] ?? 0) > 0).map((t) => (
            <FilterBar.Chip
              key={t}
              pressed={isActive('type', t)}
              count={typeCounts[t]}
              onClick={() => toggle('type', t)}
            >
              {t}
            </FilterBar.Chip>
          ))}
        </FilterBar.ChipGroup>
        <FilterBar.ChipGroup label="Citation density">
          <FilterBar.Toggle
            pressed={mostCited}
            onChange={(next) => setFacet('most_cited', next ? ['1'] : [])}
            labelOff="All"
            labelOn="Most cited"
            ariaLabel="Toggle most-cited filter"
          />
        </FilterBar.ChipGroup>
      </FilterBar>

      <div className="mb-6 flex items-center justify-between text-xs text-stone-500">
        <p aria-live="polite">
          Showing <span className="font-semibold text-stone-800">{matches.length}</span> of{' '}
          {sources.length}
          {hiddenCount > 0 && (
            <span className="ml-1 text-stone-400">({hiddenCount} hidden)</span>
          )}
        </p>
        <FilterBar.ClearAll
          onClick={clearAll}
          activeCount={activeCount}
          disabled={!hasFilters}
        />
      </div>

      {matches.length === 0 && hasFilters && (
        <FilterBar.EmptyState
          message="No sources match the current filters."
          onClear={clearAll}
        />
      )}
    </>
  );
}
