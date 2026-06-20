import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';

export interface DrawerProps {
  /** Mobile → bottom sheet (swipe-down to dismiss). Desktop → right sidebar. */
  isMobile: boolean;
  onClose: () => void;
  /** Accessible label for the dialog. */
  ariaLabel: string;
  /** Left-hand content of the header bar (title, badges). A close button is
   *  always rendered on the right. */
  header: ReactNode;
  /** Optional full-width row under the header (e.g. prev/next navigation). */
  subheader?: ReactNode;
  /** Drawer body. Provide your own padding (e.g. a `p-5` wrapper). */
  children: ReactNode;
  /** Optional Left/Right arrow-key handler (e.g. sibling navigation). */
  onArrow?: (dir: -1 | 1) => void;
}

/**
 * Shared slide-in drawer shell: stone scrim + backdrop blur, a bottom sheet on
 * mobile (with grab-handle swipe-to-dismiss) or a right sidebar on desktop,
 * Escape-to-close, and `role="dialog"`/`aria-modal`. Extracted from the
 * VarnaJatiDendrogram node drawer so citations and charts share one tested shell.
 */
export function Drawer({
  isMobile,
  onClose,
  ariaLabel,
  header,
  subheader,
  children,
  onArrow,
}: DrawerProps) {
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onArrow?.(-1);
      else if (e.key === 'ArrowRight') onArrow?.(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onArrow]);

  // Swipe-down-to-dismiss on the mobile handle.
  const onHandleTouchStart = (e: TouchEvent) => {
    dragStart.current = e.touches[0].clientY;
  };
  const onHandleTouchMove = (e: TouchEvent) => {
    if (dragStart.current == null) return;
    setDragY(Math.max(0, e.touches[0].clientY - dragStart.current));
  };
  const onHandleTouchEnd = () => {
    if (dragY > 90) onClose();
    setDragY(0);
    dragStart.current = null;
  };

  const panelClasses = isMobile
    ? 'fixed inset-x-0 bottom-0 max-h-[80vh] w-full overflow-y-auto rounded-t-2xl border-t border-stone-200 bg-white shadow-2xl'
    : 'fixed right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-stone-200 bg-white shadow-2xl';

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-stone-900/30 backdrop-blur-sm"
      />
      <aside
        className={panelClasses}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={
          isMobile
            ? {
                transform: `translateY(${dragY}px)`,
                transition: dragStart.current == null ? 'transform 200ms ease' : 'none',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }
            : undefined
        }
      >
        {isMobile && (
          <div
            className="flex cursor-grab touch-none justify-center pt-2.5 pb-1 active:cursor-grabbing"
            onTouchStart={onHandleTouchStart}
            onTouchMove={onHandleTouchMove}
            onTouchEnd={onHandleTouchEnd}
            aria-hidden="true"
          >
            <span className="h-1.5 w-10 rounded-full bg-stone-300" />
          </div>
        )}
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5 pt-3">
          <div className="min-w-0">{header}</div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {subheader}
        {children}
      </aside>
    </div>
  );
}

export default Drawer;
