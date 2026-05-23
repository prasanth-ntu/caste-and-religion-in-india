/**
 * FilterBar usage example — NOT rendered anywhere. Serves as inline documentation.
 *
 * Pattern: bind a small set of facets to URL params via `useUrlFilterState`,
 * then drive the visual primitives in `FilterBar`. Cards/rows further down
 * the page consult `state` to show/hide themselves.
 *
 * @example
 * ```tsx
 * import { FilterBar } from './FilterBar';
 * import { useUrlFilterState } from '../../hooks/useUrlFilterState';
 *
 * const CATEGORIES = ['birth', 'death', 'marriage'] as const;
 * const TIERS = ['green', 'yellow', 'red'] as const;
 *
 * function MyFilteredList({ items }: { items: Item[] }) {
 *   const { state, toggle, clearAll, isActive } = useUrlFilterState({
 *     defaults: { category: [] as string[], tier: [] as string[] },
 *     paramMap: { category: 'cat', tier: 'tier' },
 *   });
 *
 *   const visible = items.filter((it) => {
 *     const catOk = state.category.length === 0 || state.category.includes(it.category);
 *     const tierOk = state.tier.length === 0 || state.tier.includes(it.tier);
 *     return catOk && tierOk;
 *   });
 *
 *   const activeCount = state.category.length + state.tier.length;
 *
 *   return (
 *     <>
 *       <FilterBar ariaLabel="Filter items">
 *         <FilterBar.ChipGroup label="Category">
 *           {CATEGORIES.map((c) => (
 *             <FilterBar.Chip
 *               key={c}
 *               pressed={isActive('category', c)}
 *               onClick={() => toggle('category', c)}
 *             >
 *               {c}
 *             </FilterBar.Chip>
 *           ))}
 *         </FilterBar.ChipGroup>
 *         <FilterBar.ChipGroup label="Tier">
 *           {TIERS.map((t) => (
 *             <FilterBar.Chip
 *               key={t}
 *               pressed={isActive('tier', t)}
 *               onClick={() => toggle('tier', t)}
 *             >
 *               {t}
 *             </FilterBar.Chip>
 *           ))}
 *         </FilterBar.ChipGroup>
 *         <FilterBar.ClearAll
 *           onClick={clearAll}
 *           activeCount={activeCount}
 *           disabled={activeCount === 0}
 *         />
 *       </FilterBar>
 *
 *       {visible.length === 0 ? (
 *         <FilterBar.EmptyState
 *           message="No items match your filters."
 *           onClear={clearAll}
 *         />
 *       ) : (
 *         <ul>{visible.map((it) => <li key={it.id}>{it.name}</li>)}</ul>
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export {};
