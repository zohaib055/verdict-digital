import { Link } from 'react-router-dom';
import { Bookmark, RefreshCw } from 'lucide-react';
import { Market } from '@/types/market';
import ProbabilityGauge from './ProbabilityGauge';

function formatVolume(volume: number) {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
  return `$${volume.toFixed(0)}`;
}

interface MarketCardProps {
  market: Market;
}

function formatCategory(category: string) {
  return category.replace(/[-_]/g, ' ');
}

export default function MarketCard({ market }: MarketCardProps) {
  const categoryLabel = formatCategory(market.category);

  return (
    <Link
      to={`/market/${market.slug}`}
      className="group block h-full rounded-lg border border-border bg-card p-5 transition-all duration-200 hover:border-primary/35 hover:bg-accent/25 hover:shadow-lg hover:shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={market.question}
    >
      <div className="flex min-h-[198px] flex-col">
        <div className="grid grid-cols-[1fr_auto] items-start gap-4">
          <div className="grid min-w-0 grid-cols-[44px_1fr] gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold uppercase text-muted-foreground">
              {categoryLabel.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {categoryLabel}
              </div>
              <h3 className="line-clamp-3 text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                {market.question}
              </h3>
            </div>
          </div>
          <div className="w-[76px] shrink-0 overflow-hidden pt-0.5">
            <ProbabilityGauge percentage={market.yesPrice} size="sm" />
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
          <div className="rounded-lg border border-yes/20 bg-yes/5 py-3 text-center text-sm font-semibold text-yes transition-colors group-hover:bg-yes/10">
            Yes
          </div>
          <div className="rounded-lg border border-no/20 bg-no/5 py-3 text-center text-sm font-semibold text-no transition-colors group-hover:bg-no/10">
            No
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate tabular-nums">{formatVolume(market.volume)} Vol.</span>
            <RefreshCw className="h-3 w-3 shrink-0" />
          </div>
          <Bookmark className="h-3.5 w-3.5 shrink-0 transition-colors group-hover:text-foreground" />
        </div>
      </div>
    </Link>
  );
}
