import { Popover } from '../ui/Popover';

interface Tier {
  emoji: string;
  label: string;
  desc: string;
}

const TIERS: Tier[] = [
  {
    emoji: '🟢',
    label: 'well-established',
    desc: 'Well-established: multiple independent peer-reviewed or primary sources agree.',
  },
  {
    emoji: '🟡',
    label: 'plausible / debated',
    desc: 'Plausible or debated: sources disagree, or the evidence is partial.',
  },
  {
    emoji: '🔴',
    label: 'myth / unverified',
    desc: 'Myth or unverified: popular folklore not supported by evidence.',
  },
  {
    emoji: '⚖️',
    label: 'rational basis',
    desc: 'Rational basis: a plausible practical or material rationale, distinct from the stated tradition.',
  },
];

/**
 * Evidence-tier legend. Each pill is a click/keyboard-focusable Popover trigger
 * (replacing the old hover-only, keyboard-invisible `title` tooltips) so the
 * tier definitions are reachable on touch and by keyboard. Shares the site's
 * Popover primitive with the inline citation chips.
 */
export function TierLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {TIERS.map((t) => (
        <Popover
          key={t.label}
          trigger="click"
          placement="bottom"
          content={<p className="max-w-[240px] text-sm leading-snug text-stone-700">{t.desc}</p>}
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <span className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700 hover:bg-stone-200">
            <span aria-hidden="true">{t.emoji}</span>
            <span>{t.label}</span>
          </span>
        </Popover>
      ))}
    </div>
  );
}

export default TierLegend;
