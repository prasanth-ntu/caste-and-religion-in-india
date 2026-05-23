import type { ReactNode } from 'react';

export type Tier = 'green' | 'yellow' | 'red' | 'rational';

interface TierMeta {
  emoji: string;
  label: string;
  blurb: string;
}

const TIER_META: Record<Tier, TierMeta> = {
  green: {
    emoji: '🟢',
    label: 'Well-established',
    blurb: 'Multiple independent scholarly sources converge.',
  },
  yellow: {
    emoji: '🟡',
    label: 'Plausible / debated',
    blurb: 'Some evidence, but contested or partial.',
  },
  red: {
    emoji: '🔴',
    label: 'Myth / unverified',
    blurb: 'Folk claim without supporting evidence.',
  },
  rational: {
    emoji: '⚖️',
    label: 'Rational basis',
    blurb: 'A plausible material or ecological reason underlies the practice.',
  },
};

export interface TierTooltipProps {
  tier: Tier;
}

/** Body content for a tier badge popover. Pass into <Popover content={...}>. */
export function TierTooltip({ tier }: TierTooltipProps): ReactNode {
  const meta = TIER_META[tier];
  return (
    <div className="flex flex-col gap-1.5 p-1">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
        <span aria-hidden="true">{meta.emoji}</span>
        <span>{meta.label}</span>
      </div>
      <p className="text-xs leading-snug text-stone-600">{meta.blurb}</p>
      <a
        href="/#tiering"
        className="text-xs font-medium text-indigo-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
      >
        How we tier claims →
      </a>
    </div>
  );
}

export default TierTooltip;
