import { Popover } from './ui/Popover';
import { TierTooltip, type Tier } from './ui/TierTooltip';

interface TierVisualMeta {
  emoji: string;
  label: string;
  classes: string;
}

const VISUAL: Record<Tier, TierVisualMeta> = {
  green: {
    emoji: '🟢',
    label: 'Well-established',
    classes: 'bg-green-50 text-green-800 ring-green-200',
  },
  yellow: {
    emoji: '🟡',
    label: 'Plausible / debated',
    classes: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
  red: {
    emoji: '🔴',
    label: 'Myth / unverified',
    classes: 'bg-red-50 text-red-800 ring-red-200',
  },
  rational: {
    emoji: '⚖️',
    label: 'Rational basis',
    classes: 'bg-sky-50 text-sky-800 ring-sky-200',
  },
};

export interface FactTierTooltipProps {
  tier: Tier;
}

/**
 * React island that mirrors the visual of FactTier.astro and wraps it in a
 * tier-specific Popover. Use this from Astro pages where you want the badge
 * to be interactive (hover/focus reveals a tooltip). The pure-SSR Astro
 * component `FactTier.astro` remains for static contexts.
 */
export function FactTierTooltip({ tier }: FactTierTooltipProps) {
  const { emoji, label, classes } = VISUAL[tier];
  return (
    <Popover content={<TierTooltip tier={tier} />} placement="bottom" trigger="hover">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium ring-1 ring-inset align-middle cursor-help ${classes}`}
        role="status"
        aria-label={`Evidence tier: ${label}`}
        tabIndex={0}
      >
        <span aria-hidden="true">{emoji}</span>
        <span>{label}</span>
      </span>
    </Popover>
  );
}

export default FactTierTooltip;
