import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type ReactNode,
} from 'react';

/**
 * FilterBar — the visual primitive for "one filter, one interaction grammar."
 *
 * Use together with `useUrlFilterState` to bind chips to URL params.
 * See `FilterBar.example.tsx` for a full usage demo.
 *
 * Subcomponents are exported both as named exports and as properties of
 * `FilterBar` itself, so callers can do either:
 *
 *   import { FilterBar, Chip } from './FilterBar';
 *   <FilterBar><Chip ... /></FilterBar>
 *
 *   import { FilterBar } from './FilterBar';
 *   <FilterBar><FilterBar.Chip ... /></FilterBar>
 */

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export interface FilterBarProps {
  children: ReactNode;
  /** When true, the bar becomes horizontally scrollable on narrow screens. */
  scrollOnMobile?: boolean;
  /** ARIA region label for assistive tech. */
  ariaLabel?: string;
  className?: string;
}

function FilterBarRoot({
  children,
  scrollOnMobile = false,
  ariaLabel = 'Filters',
  className = '',
}: FilterBarProps) {
  const base = 'flex flex-wrap items-start gap-3';
  const scroll = scrollOnMobile
    ? 'max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:-mx-2 max-sm:px-2'
    : '';
  return (
    <section
      role="region"
      aria-label={ariaLabel}
      className={`${base} ${scroll} ${className}`.trim()}
    >
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Chip
// ---------------------------------------------------------------------------

export interface ChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  pressed: boolean;
  children: ReactNode;
  /** Optional count badge shown after the label. */
  count?: number;
}

export function Chip({
  pressed,
  children,
  count,
  className = '',
  ...rest
}: ChipProps) {
  const base =
    'inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-medium capitalize ' +
    'transition-colors min-h-[44px] sm:min-h-[40px] ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1';
  const pressedClasses =
    'bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-300';
  const unpressedClasses =
    'bg-white text-stone-700 border-stone-300 hover:border-stone-500';
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`${base} ${pressed ? pressedClasses : unpressedClasses} ${className}`.trim()}
      {...rest}
    >
      <span>{children}</span>
      {typeof count === 'number' && (
        <span
          className={`rounded-full px-1.5 text-[10px] ${
            pressed ? 'bg-indigo-100 text-indigo-800' : 'bg-stone-100 text-stone-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ChipGroup — labelled cluster
// ---------------------------------------------------------------------------

export interface ChipGroupProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function ChipGroup({ label, children, className = '' }: ChipGroupProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </p>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle — two-state aria-switch with a sliding pill
// ---------------------------------------------------------------------------

export interface ToggleProps {
  pressed: boolean;
  onChange: (next: boolean) => void;
  labelOff: string;
  labelOn: string;
  ariaLabel?: string;
  className?: string;
}

export function Toggle({
  pressed,
  onChange,
  labelOff,
  labelOn,
  ariaLabel,
  className = '',
}: ToggleProps) {
  const base =
    'relative inline-flex items-center rounded-full border border-stone-300 bg-white p-1 ' +
    'min-h-[44px] sm:min-h-[40px] text-xs font-medium ' +
    'focus-within:ring-2 focus-within:ring-indigo-500';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      aria-label={ariaLabel ?? (pressed ? labelOn : labelOff)}
      onClick={() => onChange(!pressed)}
      className={`${base} ${className}`.trim()}
    >
      {/* Sliding pill */}
      <span
        aria-hidden="true"
        className={`absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-indigo-50 ring-1 ring-indigo-300 transition-transform duration-200 ${
          pressed ? 'translate-x-full' : 'translate-x-0'
        }`}
      />
      <span
        className={`relative z-10 px-3 ${pressed ? 'text-stone-500' : 'text-indigo-700'}`}
      >
        {labelOff}
      </span>
      <span
        className={`relative z-10 px-3 ${pressed ? 'text-indigo-700' : 'text-stone-500'}`}
      >
        {labelOn}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Search — text input with leading icon + global "/" hotkey
// ---------------------------------------------------------------------------

export interface SearchProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /**
   * Optional identifier. When set, pressing "/" anywhere on the page
   * (outside of inputs) focuses this Search field. Multiple Search inputs
   * can coexist with distinct ids; only the matching one focuses.
   */
  hotkeyId?: string;
  className?: string;
  ariaLabel?: string;
}

export function Search({
  value,
  onChange,
  placeholder = 'Search…',
  hotkeyId,
  className = '',
  ariaLabel,
}: SearchProps) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!hotkeyId || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      const el = ref.current;
      if (!el) return;
      if (el.dataset.filterSearch !== hotkeyId) return;
      e.preventDefault();
      el.focus();
      el.select();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hotkeyId]);

  return (
    <label
      className={`inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 min-h-[44px] sm:min-h-[40px] text-sm focus-within:ring-2 focus-within:ring-indigo-500 ${className}`.trim()}
    >
      <span aria-hidden="true" className="text-stone-500">
        🔍
      </span>
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        data-filter-search={hotkeyId}
        className="min-w-0 flex-1 border-0 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
      />
    </label>
  );
}

// ---------------------------------------------------------------------------
// ClearAll — small text link
// ---------------------------------------------------------------------------

export interface ClearAllProps {
  onClick: () => void;
  activeCount?: number;
  disabled?: boolean;
  className?: string;
}

export function ClearAll({
  onClick,
  activeCount,
  disabled = false,
  className = '',
}: ClearAllProps) {
  const label =
    typeof activeCount === 'number' && activeCount > 0
      ? `Clear filters · ${activeCount} active`
      : 'Clear filters';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center text-xs font-medium text-indigo-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-stone-400 disabled:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded ${className}`.trim()}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  message: string;
  onClear?: () => void;
  className?: string;
}

export function EmptyState({
  message,
  onClear,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center ${className}`.trim()}
    >
      <p className="text-sm text-stone-600">{message}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center rounded-full border border-indigo-300 bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compound export — attach subcomponents to the root
// ---------------------------------------------------------------------------

type FilterBarCompound = typeof FilterBarRoot & {
  Chip: typeof Chip;
  ChipGroup: typeof ChipGroup;
  Toggle: typeof Toggle;
  Search: typeof Search;
  ClearAll: typeof ClearAll;
  EmptyState: typeof EmptyState;
};

export const FilterBar = FilterBarRoot as FilterBarCompound;
FilterBar.Chip = Chip;
FilterBar.ChipGroup = ChipGroup;
FilterBar.Toggle = Toggle;
FilterBar.Search = Search;
FilterBar.ClearAll = ClearAll;
FilterBar.EmptyState = EmptyState;

export default FilterBar;
