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

export default function MarketCard({ market }: MarketCardProps) {
  return (
    <Link
      to={`/market/${market.slug}`}
      className="group block rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:bg-accent/30 h-full flex flex-col"
    >
      {/* Header: Icon + Title + Gauge */}
      <div className="flex items-start gap-3 mb-auto">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
            {market.category.charAt(0)}
          </div>
          <h3 className="font-semibold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors pt-0.5">
            {market.question}
          </h3>
        </div>
        <div className="shrink-0">
          <ProbabilityGauge percentage={market.yesPrice} size="sm" />
        </div>
      </div>

      {/* Yes/No Buttons - matching Polymarket style */}
      <div className="flex gap-3 mt-4 mb-4">
        <button
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors text-yes hover:bg-yes/15 border border-yes/20 bg-yes/5"
          onClick={e => e.preventDefault()}
        >
          Yes
        </button>
        <button
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors text-no hover:bg-no/15 border border-no/20 bg-no/5"
          onClick={e => e.preventDefault()}
        >
          No
        </button>
      </div>

      {/* Footer: Volume + Actions */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="tabular-nums">{formatVolume(market.volume)} Vol.</span>
          <RefreshCw className="h-3 w-3" />
        </div>
        <div className="flex items-center gap-2">
          <Bookmark className="h-3.5 w-3.5 hover:text-foreground cursor-pointer" onClick={e => e.preventDefault()} />
        </div>
      </div>
    </Link>
  );
}
