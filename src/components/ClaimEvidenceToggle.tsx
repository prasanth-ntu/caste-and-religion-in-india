import { useEffect, useState } from 'react';
import FactTierTooltip from './FactTierTooltip';
import type { Tier } from './ui/TierTooltip';

const TIER_RULE_CLASS: Record<Tier, string> = {
  green: 'border-l-emerald-600',
  yellow: 'border-l-amber-700',
  red: 'border-l-rose-700',
  rational: 'border-l-violet-700',
};

const TIER_BG_CLASS: Record<Tier, string> = {
  green: 'bg-emerald-50',
  yellow: 'bg-amber-50',
  red: 'bg-rose-50',
  rational: 'bg-violet-50',
};

const TOGGLE_EVENT = 'claim:toggle';

interface ClaimToggleDetail {
  claimId: string;
  open: boolean;
}

export interface ClaimBadgeProps {
  tier: Tier;
  claimId: string;
  hasEvidence: boolean;
}

/**
 * Inline portion of an evidence-bearing claim badge. Renders the tier emoji
 * (via FactTierTooltip, preserving hover-popover behavior) plus a ▾ caret to
 * signal the click-to-expand affordance. Clicking dispatches a CustomEvent on
 * `document` keyed by `claimId`; the sibling <ClaimEvidencePanel> listens for
 * that event and toggles its own visibility. This split lets the panel live as
 * a true block sibling of the inline claim span, which avoids the
 * "block-inside-inline" HTML invalidity that previously broke paragraph flow.
 *
 * When `hasEvidence` is false, the badge renders without a button wrapper or
 * caret (pure inline tier indicator).
 */
export function ClaimBadge({ tier, claimId, hasEvidence }: ClaimBadgeProps) {
  const [open, setOpen] = useState(false);
  const panelId = `claim-evidence-${claimId}`;

  if (!hasEvidence) {
    return <FactTierTooltip tier={tier} />;
  }

  const handleClick = () => {
    const next = !open;
    setOpen(next);
    document.dispatchEvent(
      new CustomEvent<ClaimToggleDetail>(TOGGLE_EVENT, {
        detail: { claimId, open: next },
      })
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={open}
      aria-controls={panelId}
      className="inline-flex items-center align-middle bg-transparent border-0 p-0 m-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
      title={open ? 'Hide evidence' : 'Show evidence'}
    >
      <FactTierTooltip tier={tier} />
      <span
        aria-hidden="true"
        className={`ml-0.5 inline-block text-[10px] leading-none text-stone-500 transition-transform duration-150 ${
          open ? 'rotate-180' : ''
        }`}
      >
        ▾
      </span>
    </button>
  );
}

export interface ClaimEvidencePanelProps {
  tier: Tier;
  claimId: string;
  evidenceSummary: string;
}

/**
 * Block-level expansion panel for a claim's evidence summary. Rendered as a
 * <span class="block ..."> rather than a <div>, so it remains valid HTML when
 * the parent ancestor is a <p> (block-level <div> inside <p> would be invalid
 * and force browsers to break the paragraph). Listens to document-level
 * `claim:toggle` events and matches on `claimId`.
 */
export function ClaimEvidencePanel({
  tier,
  claimId,
  evidenceSummary,
}: ClaimEvidencePanelProps) {
  const [open, setOpen] = useState(false);
  const panelId = `claim-evidence-${claimId}`;

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<ClaimToggleDetail>;
      if (ce.detail?.claimId === claimId) {
        setOpen(ce.detail.open);
      }
    };
    document.addEventListener(TOGGLE_EVENT, handler);
    return () => document.removeEventListener(TOGGLE_EVENT, handler);
  }, [claimId]);

  return (
    <span
      id={panelId}
      data-claim-evidence-panel={claimId}
      role="region"
      aria-label="Evidence summary"
      hidden={!open}
      className={`block overflow-hidden transition-[max-height,opacity] duration-[200ms] ease-out ${
        open ? 'max-h-[32rem] opacity-100 mt-2' : 'max-h-0 opacity-0'
      }`}
    >
      <span
        className={`block rounded-r border-l-[1.5px] ${TIER_RULE_CLASS[tier]} ${TIER_BG_CLASS[tier]} px-3 py-2 text-[12px] italic leading-snug text-stone-700`}
      >
        {evidenceSummary}
      </span>
    </span>
  );
}

export default ClaimBadge;
