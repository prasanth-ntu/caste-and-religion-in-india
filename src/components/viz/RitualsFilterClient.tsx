import { useEffect, useMemo } from 'react';
import { FilterBar } from '../ui/FilterBar';
import { useUrlFilterState } from '../../hooks/useUrlFilterState';

const CATEGORY_ORDER = [
  'birth',
  'puberty',
  'marriage',
  'death',
  'kuladeivam',
  'kootam',
  'food',
  'purity',
  'other',
] as const;
type Category = (typeof CATEGORY_ORDER)[number];

const TIER_ORDER = ['green', 'yellow', 'red', 'rational'] as const;
type Tier = (typeof TIER_ORDER)[number];

const TIER_LABEL: Record<Tier, string> = {
  green: '🟢 Well-established',
  yellow: '🟡 Plausible',
  red: '🔴 Myth',
  rational: '⚖️ Rational',
};

export interface RitualsFilterClientProps {
  /**
   * Lightweight metadata for each ritual card. The actual card markup is
   * still rendered server-side by Astro — this island only manages
   * visibility by toggling `.is-hidden` on the matching `<article>`.
   */
  rituals: ReadonlyArray<{ slug: string; category: Category; tier: Tier }>;
  /** CSS selector for the grid that contains the server-rendered cards. */
  gridSelector?: string;
}

export default function RitualsFilterClient({
  rituals,
  gridSelector = '[data-rituals-grid]',
}: RitualsFilterClientProps) {
  const { state, toggle, clearAll, isActive } = useUrlFilterState({
    defaults: {
      category: [] as string[],
      tier: [] as string[],
    },
    paramMap: { category: 'cat', tier: 'tier' },
  });

  // Counts per facet (computed from the full list — these don't change
  // when filters move; only the resulting card visibility does).
  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rituals) m[r.category] = (m[r.category] ?? 0) + 1;
    return m;
  }, [rituals]);

  const tierCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rituals) m[r.tier] = (m[r.tier] ?? 0) + 1;
    return m;
  }, [rituals]);

  const matches = useMemo(() => {
    const cats = new Set(state.category);
    const tiers = new Set(state.tier);
    return rituals.filter((r) => {
      const catOk = cats.size === 0 || cats.has(r.category);
      const tierOk = tiers.size === 0 || tiers.has(r.tier);
      return catOk && tierOk;
    });
  }, [rituals, state.category, state.tier]);

  // Sync visibility onto the server-rendered cards.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const grid = document.querySelector(gridSelector);
    if (!grid) return;
    const visible = new Set(matches.map((m) => m.slug));
    const cards = grid.querySelectorAll<HTMLElement>('.ritual-flip-card');
    cards.forEach((card) => {
      const slug = card.dataset.slug ?? '';
      const show = visible.has(slug);
      card.classList.toggle('is-hidden', !show);
      // Reset any flip state when a card is filtered away.
      if (!show) card.classList.remove('is-flipped');
    });
  }, [matches, gridSelector]);

  const activeCount = state.category.length + state.tier.length;
  const hasFilters = activeCount > 0;
  const hiddenCount = rituals.length - matches.length;

  return (
    <>
      <FilterBar ariaLabel="Filter rituals" scrollOnMobile className="mb-3">
        <FilterBar.ChipGroup label="Category">
          {CATEGORY_ORDER.filter((c) => (categoryCounts[c] ?? 0) > 0).map((c) => (
            <FilterBar.Chip
              key={c}
              pressed={isActive('category', c)}
              count={categoryCounts[c]}
              onClick={() => toggle('category', c)}
            >
              {c}
            </FilterBar.Chip>
          ))}
        </FilterBar.ChipGroup>
        <FilterBar.ChipGroup label="Evidence tier">
          {TIER_ORDER.filter((t) => (tierCounts[t] ?? 0) > 0).map((t) => (
            <FilterBar.Chip
              key={t}
              pressed={isActive('tier', t)}
              count={tierCounts[t]}
              onClick={() => toggle('tier', t)}
            >
              {TIER_LABEL[t]}
            </FilterBar.Chip>
          ))}
        </FilterBar.ChipGroup>
      </FilterBar>

      <div className="mb-6 flex items-center justify-between text-xs text-stone-500">
        <p aria-live="polite">
          Showing <span className="font-semibold text-stone-800">{matches.length}</span> of{' '}
          {rituals.length}
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
          message="No rituals match the current filters."
          onClear={clearAll}
        />
      )}
    </>
  );
}
