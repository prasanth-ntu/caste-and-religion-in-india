import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * URL-synced filter state. The URL is canonical; no localStorage involvement.
 *
 * Convention: `?<facet>=<value>[,<value>]` — comma-separated multi-values.
 * Empty arrays drop the param entirely.
 *
 * SSR-safe: returns `defaults` until mounted in the browser. After mount,
 * reads from `window.location.search` once and listens to `popstate` so the
 * back button restores state. Updates write via `history.replaceState`.
 */
export interface UseUrlFilterStateOptions<T extends Record<string, string[]>> {
  defaults: T;
  /** Optional rename map: state-key → URL-param name. Defaults to identity. */
  paramMap?: Partial<Record<keyof T, string>>;
}

export interface UseUrlFilterStateResult<T extends Record<string, string[]>> {
  state: T;
  setFacet: (key: keyof T, values: string[]) => void;
  toggle: (key: keyof T, value: string) => void;
  clearAll: () => void;
  isActive: (key: keyof T, value: string) => boolean;
}

function readFromSearch<T extends Record<string, string[]>>(
  defaults: T,
  paramFor: (k: keyof T) => string,
): T {
  if (typeof window === 'undefined') return defaults;
  const params = new URLSearchParams(window.location.search);
  const next = { ...defaults } as T;
  (Object.keys(defaults) as (keyof T)[]).forEach((key) => {
    const raw = params.get(paramFor(key));
    if (raw === null) {
      // keep default
      return;
    }
    if (raw === '') {
      (next as Record<string, string[]>)[key as string] = [];
      return;
    }
    (next as Record<string, string[]>)[key as string] = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  });
  return next;
}

function writeToSearch<T extends Record<string, string[]>>(
  state: T,
  defaults: T,
  paramFor: (k: keyof T) => string,
): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  (Object.keys(state) as (keyof T)[]).forEach((key) => {
    const paramName = paramFor(key);
    const values = state[key];
    const defaultValues = defaults[key];
    const isDefault =
      values.length === defaultValues.length &&
      values.every((v, i) => v === defaultValues[i]);
    if (values.length === 0 || isDefault) {
      params.delete(paramName);
    } else {
      params.set(paramName, values.join(','));
    }
  });
  const qs = params.toString();
  const newUrl =
    window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
  window.history.replaceState(window.history.state, '', newUrl);
}

export function useUrlFilterState<T extends Record<string, string[]>>({
  defaults,
  paramMap,
}: UseUrlFilterStateOptions<T>): UseUrlFilterStateResult<T> {
  const paramFor = useCallback(
    (key: keyof T): string => {
      const mapped = paramMap?.[key];
      return mapped ?? (key as string);
    },
    [paramMap],
  );

  // SSR-safe initial: defaults until we mount.
  const [state, setState] = useState<T>(defaults);

  // On mount, hydrate from URL.
  useEffect(() => {
    setState(readFromSearch(defaults, paramFor));
    // We intentionally do NOT re-run on defaults change — defaults are
    // expected to be stable (object identity from the caller).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen to popstate so the back button restores state.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      setState(readFromSearch(defaults, paramFor));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback(
    (updater: (prev: T) => T) => {
      setState((prev) => {
        const next = updater(prev);
        writeToSearch(next, defaults, paramFor);
        return next;
      });
    },
    [defaults, paramFor],
  );

  const setFacet = useCallback(
    (key: keyof T, values: string[]) => {
      update((prev) => ({ ...prev, [key]: values }) as T);
    },
    [update],
  );

  const toggle = useCallback(
    (key: keyof T, value: string) => {
      update((prev) => {
        const current = prev[key] ?? [];
        const has = current.includes(value);
        const nextValues = has
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [key]: nextValues } as T;
      });
    },
    [update],
  );

  const clearAll = useCallback(() => {
    update(() => {
      const empty = { ...defaults } as T;
      (Object.keys(empty) as (keyof T)[]).forEach((k) => {
        (empty as Record<string, string[]>)[k as string] = [];
      });
      return empty;
    });
  }, [defaults, update]);

  const isActive = useCallback(
    (key: keyof T, value: string): boolean => {
      const arr = state[key];
      return Array.isArray(arr) && arr.includes(value);
    },
    [state],
  );

  return useMemo(
    () => ({ state, setFacet, toggle, clearAll, isActive }),
    [state, setFacet, toggle, clearAll, isActive],
  );
}

export default useUrlFilterState;
