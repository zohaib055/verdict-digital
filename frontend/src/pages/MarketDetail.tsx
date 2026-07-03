import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, Clock, MessageSquare, Share2, TrendingUp, Users } from 'lucide-react';

import OrderBook from '@/components/OrderBook';
import PriceChart from '@/components/PriceChart';
import ProbabilityGauge from '@/components/ProbabilityGauge';
import RecentTrades from '@/components/RecentTrades';
import TradePanel from '@/components/TradePanel';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function relativeTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.max(1, Math.round(diffMs / 60000));
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.round(diffHour / 24)}d ago`;
}

export default function MarketDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const marketQuery = useQuery({
    queryKey: ['market', id],
    queryFn: () => api.market(id || ''),
    enabled: Boolean(id),
  });

  const market = marketQuery.data;
  const sourceContext = Array.isArray(market?.metadata_json?.source_context)
    ? (market.metadata_json.source_context as Array<Record<string, string | null>>)
    : [];

  const activityQuery = useQuery({
    queryKey: ['market-activity', market?.id],
    queryFn: () => api.marketActivity(market!.id),
    enabled: Boolean(market?.id),
  });

  const tradeRows = useMemo(
    () =>
      (activityQuery.data?.trades || []).map((trade) => ({
        id: String(trade.id),
        time: relativeTime(trade.created_at),
        side: trade.side,
        price: trade.display_probability_after * 100,
        size: trade.cash_amount,
      })),
    [activityQuery.data],
  );

  const chartData = useMemo(() => {
    const trades = activityQuery.data?.trades || [];
    if (!trades.length && market) {
      return Array.from({ length: 10 }, (_, index) => {
        const date = new Date(Date.now() - (9 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return {
          date,
          yes: market.display_probability_yes * 100,
          no: 100 - market.display_probability_yes * 100,
        };
      });
    }
    return trades
      .slice()
      .reverse()
      .map((trade) => ({
        date: trade.created_at.split('T')[0],
        yes: trade.display_probability_after * 100,
        no: 100 - trade.display_probability_after * 100,
      }));
  }, [activityQuery.data, market]);

  if (marketQuery.isLoading) {
    return <div className="px-6 py-10 text-sm text-muted-foreground">Loading market...</div>;
  }

  if (marketQuery.error || !market) {
    return <div className="px-6 py-10 text-sm text-destructive">Market not found.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 pb-24 md:pb-6">
      <Link to="/markets" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Markets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl lg:text-2xl font-bold leading-tight text-foreground">
                {market.question}
              </h1>
              <Button
                variant="ghost"
                className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                onClick={async () => {
                  try {
                    const artifact = await api.marketShare(market.id, 'market_detail', user?.id);
                    await navigator.clipboard.writeText(artifact.share_url).catch(() => undefined);
                    toast.success('Share link copied');
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Unable to generate share link');
                  }
                }}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>{formatCurrency(market.traded_volume)} Vol.</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>
                  {Math.max(1, Math.round(market.traded_volume / 500))}{' '}
                  {Math.max(1, Math.round(market.traded_volume / 500)) === 1 ? 'trader' : 'traders'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{new Date(market.close_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              {market.status === 'open' && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-yes">
                  <span className="h-1.5 w-1.5 rounded-full bg-yes animate-pulse" />
                  Active
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center">
              <ProbabilityGauge percentage={market.display_probability_yes * 100} size="lg" />
              <div className="flex items-center justify-between w-full mt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-yes">Yes</span>
                <div className="text-xs font-medium tabular-nums px-2 py-0.5 rounded-md text-yes bg-yes-muted">
                  {market.raw_probability_yes ? `${((market.display_probability_yes - market.raw_probability_yes) * 100).toFixed(1)} adj` : 'live'}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center">
              <ProbabilityGauge percentage={(1 - market.display_probability_yes) * 100} size="lg" />
              <div className="flex items-center justify-between w-full mt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-no">No</span>
                <div className="text-xs font-medium tabular-nums px-2 py-0.5 rounded-md text-no bg-no-muted">
                  live
                </div>
              </div>
            </div>
          </div>

          <PriceChart data={chartData} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <RecentTrades trades={tradeRows} />
            <OrderBook />
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-sm text-foreground">About this market</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{market.description || 'No description provided yet.'}</p>
            <div className="space-y-2 pt-2 text-xs text-muted-foreground">
              <p>Resolution criteria: <span className="text-foreground">{market.resolution_criteria}</span></p>
              <p>Market terms: <span className="text-foreground">{market.terms}</span></p>
              {market.resolved_source_url ? (
                <p>
                  Source:{" "}
                  <a href={market.resolved_source_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {market.resolved_source_url}
                  </a>
                </p>
              ) : null}
            </div>
          </div>

          {sourceContext.length ? (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h3 className="font-semibold text-sm text-foreground">Source Event Context</h3>
              <div className="grid gap-3">
                {sourceContext.map((source, index) => (
                  <div key={`${source.source_url || index}`} className="rounded-lg border border-border bg-background px-4 py-3">
                    <div className="text-sm font-medium">{source.headline || 'Source headline unavailable'}</div>
                    {source.summary ? <div className="text-sm text-muted-foreground mt-1">{source.summary}</div> : null}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {source.source ? <span>{source.source}</span> : null}
                      {source.source_url ? (
                        <a href={source.source_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          Open source
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 order-first lg:order-none">
          <TradePanel
            marketId={market.id}
            yesPrice={market.display_probability_yes * 100}
            noPrice={(1 - market.display_probability_yes) * 100}
            onTradeComplete={async () => {
              await Promise.all([marketQuery.refetch(), activityQuery.refetch()]);
            }}
          />

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Public signals</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Raw probability: {(market.raw_probability_yes * 100).toFixed(2)}%</p>
              <p>Displayed probability: {(market.display_probability_yes * 100).toFixed(2)}%</p>
              <p className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Volume: {formatCurrency(market.traded_volume)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Discussion</h3>
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Public comments are not wired yet, but market activity and share links are live.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
