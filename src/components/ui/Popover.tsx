import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';

/**
 * Popover — headless, ARIA-correct, position-aware popover.
 *
 * Usage:
 *
 *   <Popover content={<MyTooltipBody/>}>
 *     <button>Trigger</button>
 *   </Popover>
 *
 * Opens on hover + focus by default (keyboard parity).
 * Closes on outside click, Escape, mouseleave (with 150ms grace), or focusout.
 */

export type PopoverPlacement = 'top' | 'bottom';
export type PopoverTrigger = 'hover' | 'click';

export interface PopoverProps {
  /** The popover body. */
  content: ReactNode;
  /** Default placement; auto-flips if it'd go off the viewport edge. */
  placement?: PopoverPlacement;
  /** Open-on-click vs open-on-hover. Default 'hover' (also opens on focus). */
  trigger?: PopoverTrigger;
  /** Optional className for the trigger wrapper span. */
  className?: string;
  /** The trigger element(s). */
  children: ReactNode;
}

export function Popover({
  content,
  placement = 'bottom',
  trigger = 'hover',
  className = '',
  children,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [actualPlacement, setActualPlacement] = useState<PopoverPlacement>(placement);

  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const surfaceId = useId();

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 150);
  }, [clearCloseTimer]);

  const openNow = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  // Auto-flip placement based on viewport.
  useLayoutEffect(() => {
    if (!open) return;
    const t = triggerRef.current;
    const s = surfaceRef.current;
    if (!t || !s) return;

    const triggerRect = t.getBoundingClientRect();
    const surfaceHeight = s.offsetHeight;
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    if (placement === 'bottom') {
      if (spaceBelow < surfaceHeight + 16 && spaceAbove > spaceBelow) {
        setActualPlacement('top');
      } else {
        setActualPlacement('bottom');
      }
    } else {
      if (spaceAbove < surfaceHeight + 16 && spaceBelow > spaceAbove) {
        setActualPlacement('bottom');
      } else {
        setActualPlacement('top');
      }
    }
  }, [open, placement]);

  // Outside click + Escape global handling.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = triggerRef.current;
      const s = surfaceRef.current;
      const target = e.target as Node | null;
      if (!target) return;
      if (t && t.contains(target)) return;
      if (s && s.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        // Restore focus to a focusable child of trigger if any.
        const t = triggerRef.current;
        const focusable = t?.querySelector<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        focusable?.focus();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Cleanup timer on unmount.
  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  // Trigger event handlers.
  const onMouseEnter = useCallback(() => {
    if (trigger === 'hover') openNow();
  }, [trigger, openNow]);

  const onMouseLeave = useCallback(() => {
    if (trigger === 'hover') scheduleClose();
  }, [trigger, scheduleClose]);

  const onFocus = useCallback(() => {
    openNow();
  }, [openNow]);

  const onBlur = useCallback(
    (e: React.FocusEvent<HTMLSpanElement>) => {
      // If focus moves to the surface, keep open.
      const next = e.relatedTarget as Node | null;
      const s = surfaceRef.current;
      if (next && s && s.contains(next)) return;
      scheduleClose();
    },
    [scheduleClose],
  );

  const onClick = useCallback(() => {
    if (trigger === 'click') {
      setOpen((prev) => !prev);
    }
  }, [trigger]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (trigger === 'click') {
          e.preventDefault();
          setOpen((prev) => !prev);
        }
      }
    },
    [trigger],
  );

  // Surface mouse handlers (keep open while hovering the surface).
  const onSurfaceMouseEnter = useCallback(() => {
    clearCloseTimer();
  }, [clearCloseTimer]);

  const onSurfaceMouseLeave = useCallback(() => {
    if (trigger === 'hover') scheduleClose();
  }, [trigger, scheduleClose]);

  const surfacePosClass =
    actualPlacement === 'bottom'
      ? 'top-full mt-2'
      : 'bottom-full mb-2';

  return (
    <span
      ref={triggerRef}
      className={`relative inline-block ${className}`.trim()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? surfaceId : undefined}
      tabIndex={trigger === 'click' ? 0 : undefined}
    >
      {children}
      {open && (
        <div
          ref={surfaceRef}
          id={surfaceId}
          role="dialog"
          className={`absolute left-1/2 z-50 -translate-x-1/2 ${surfacePosClass} min-w-[180px] max-w-[280px] rounded-lg border border-stone-200 bg-white p-2 shadow-lg text-sm text-stone-700`}
          onMouseEnter={onSurfaceMouseEnter}
          onMouseLeave={onSurfaceMouseLeave}
        >
          {content}
        </div>
      )}
    </span>
  );
}

export default Popover;
