import { useId, useState } from 'react';
import FactTierTooltip from './FactTierTooltip';
import type { Tier } from './ui/TierTooltip';

export interface ClaimEvidenceToggleProps {
  tier: Tier;
  /** Inline evidence summary. If absent or empty, the badge renders without a toggle. */
  evidenceSummary?: string;
}

const TIER_RULE_CLASS: Record<Tier, string> = {
  green: 'border-l-emerald-600',
  yellow: 'border-l-amber-700',
  red: 'border-l-rose-700',
  rational: 'border-l-violet-700',
};

/**
 * Wraps FactTierTooltip in a click-to-expand affordance. When an
 * `evidenceSummary` is provided, the badge becomes a button that toggles a
 * stone-50 inline block with the summary text. When absent, the badge renders
 * exactly as before (no toggle UI). Hover popover (tier explanation) still
 * works through FactTierTooltip — this control only adds the click behavior.
 *
 * Visual spec:
 *   - 1.5px left rule in the tier color
 *   - stone-50 background, stone-700 italic 12px body
 *   - 200ms slide-down via max-height transition
 *   - respects prefers-reduced-motion via global CSS rule
 */
export function ClaimEvidenceToggle({ tier, evidenceSummary }: ClaimEvidenceToggleProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const hasEvidence = Boolean(evidenceSummary && evidenceSummary.trim().length > 0);

  if (!hasEvidence) {
    return <FactTierTooltip tier={tier} />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center align-middle bg-transparent border-0 p-0 m-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
        title={open ? 'Hide evidence' : 'Show evidence'}
      >
        <FactTierTooltip tier={tier} />
      </button>
      <span
        id={panelId}
        role="region"
        aria-label="Evidence summary"
        className={`block w-full overflow-hidden transition-[max-height,opacity] duration-[200ms] ease-out ${
          open ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'
        }`}
      >
        <span
          className={`block rounded-r bg-stone-50 border-l-[1.5px] ${TIER_RULE_CLASS[tier]} px-3 py-2 text-[12px] italic leading-snug text-stone-700`}
        >
          {evidenceSummary}
        </span>
      </span>
    </>
  );
}

export default ClaimEvidenceToggle;
