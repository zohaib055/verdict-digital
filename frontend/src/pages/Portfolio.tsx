import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Coins, TrendingDown, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const tabs = ['Positions', 'Trades', 'Transactions'] as const;

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState<string>('Positions');
  const { user, refreshMe } = useAuth();

  const portfolioQuery = useQuery({
    queryKey: ['portfolio', user?.id],
    queryFn: () => api.portfolio(user!.id),
    enabled: Boolean(user?.id),
  });

  const analyticsQuery = useQuery({
    queryKey: ['analytics', user?.id],
    queryFn: () => api.analytics(user!.id),
    enabled: Boolean(user?.id),
  });

  const tradesQuery = useQuery({
    queryKey: ['user-trades', user?.id],
    queryFn: () => api.userTrades(user!.id, 100),
    enabled: Boolean(user?.id),
  });

  const transactionsQuery = useQuery({
    queryKey: ['user-transactions', user?.id],
    queryFn: () => api.userTransactions(user!.id, 100),
    enabled: Boolean(user?.id),
  });

  const totalValue = useMemo(() => {
    if (!portfolioQuery.data) return 0;
    return portfolioQuery.data.positions.reduce(
      (sum, position) => sum + position.yes_shares * position.market_display_probability_yes + position.no_shares * (1 - position.market_display_probability_yes),
      0,
    );
  }, [portfolioQuery.data]);

  if (!user) {
    return <div className="p-6 text-sm text-muted-foreground">Log in to view your portfolio and analytics.</div>;
  }

  const claimFaucet = async () => {
    try {
      await api.faucetClaim(user.id);
      await Promise.all([
        refreshMe(),
        portfolioQuery.refetch(),
        analyticsQuery.refetch(),
        tradesQuery.refetch(),
        transactionsQuery.refetch(),
      ]);
      toast.success('Weekly faucet claimed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to claim faucet');
    }
  };

  return (
    <div className="p-4 lg:p-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Portfolio</h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>
        </div>
        <Button onClick={claimFaucet} variant="secondary" className="gap-2">
          <Coins className="h-4 w-4" />
          Claim weekly faucet
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Portfolio Value</div>
          <div className="text-lg font-bold tabular-nums">{money(totalValue)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Unrealized P&L</div>
          <div className={`text-lg font-bold tabular-nums flex items-center gap-1 ${(portfolioQuery.data?.total_unrealized_pnl || 0) >= 0 ? 'text-yes' : 'text-no'}`}>
            {(portfolioQuery.data?.total_unrealized_pnl || 0) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {money(portfolioQuery.data?.total_unrealized_pnl || 0)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Realized P&L</div>
          <div className="text-lg font-bold tabular-nums text-yes">{money(portfolioQuery.data?.total_realized_pnl || 0)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Balance</div>
          <div className="text-lg font-bold tabular-nums">{money(user.balance)}</div>
        </div>
      </div>

      {analyticsQuery.data ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Trades placed</div><div className="text-lg font-bold">{analyticsQuery.data.summary.total_trades}</div></div>
          <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Markets traded</div><div className="text-lg font-bold">{analyticsQuery.data.summary.total_markets_traded}</div></div>
          <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Accuracy</div><div className="text-lg font-bold">{analyticsQuery.data.summary.accuracy_score.toFixed(1)}%</div></div>
          <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Reputation</div><div className="text-lg font-bold">{analyticsQuery.data.summary.reputation_score.toFixed(1)}</div></div>
          <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Best streak</div><div className="text-lg font-bold">{analyticsQuery.data.summary.best_streak}</div></div>
        </div>
      ) : null}

      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Positions' && (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                <th className="text-left px-4 py-3 font-semibold">Market</th>
                <th className="text-left px-4 py-3 font-semibold">YES Shares</th>
                <th className="text-left px-4 py-3 font-semibold">NO Shares</th>
                <th className="text-right px-4 py-3 font-semibold">Current Prob.</th>
                <th className="text-right px-4 py-3 font-semibold">Unrealized P&L</th>
                <th className="text-right px-4 py-3 font-semibold">Realized P&L</th>
              </tr>
            </thead>
            <tbody>
              {(portfolioQuery.data?.positions || []).map((position) => (
                <tr key={position.market_id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-[250px] truncate">{position.market_title}</td>
                  <td className="px-4 py-3 tabular-nums">{position.yes_shares.toFixed(3)}</td>
                  <td className="px-4 py-3 tabular-nums">{position.no_shares.toFixed(3)}</td>
                  <td className="text-right px-4 py-3 tabular-nums">{(position.market_display_probability_yes * 100).toFixed(2)}%</td>
                  <td className={`text-right px-4 py-3 tabular-nums font-medium ${position.unrealized_pnl >= 0 ? 'text-yes' : 'text-no'}`}>{money(position.unrealized_pnl)}</td>
                  <td className={`text-right px-4 py-3 tabular-nums font-medium ${position.realized_pnl >= 0 ? 'text-yes' : 'text-no'}`}>{money(position.realized_pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Trades' && (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                <th className="text-left px-4 py-3 font-semibold">Market</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
                <th className="text-left px-4 py-3 font-semibold">Side</th>
                <th className="text-right px-4 py-3 font-semibold">Shares</th>
                <th className="text-right px-4 py-3 font-semibold">Cash</th>
                <th className="text-right px-4 py-3 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {(tradesQuery.data || []).map((trade) => (
                <tr key={trade.trade_id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{trade.market_title}</td>
                  <td className="px-4 py-3 capitalize">{trade.action}</td>
                  <td className={`px-4 py-3 font-semibold ${trade.side === 'yes' ? 'text-yes' : 'text-no'}`}>{trade.side.toUpperCase()}</td>
                  <td className="text-right px-4 py-3 tabular-nums">{trade.shares_delta.toFixed(3)}</td>
                  <td className="text-right px-4 py-3 tabular-nums">{money(trade.cash_amount)}</td>
                  <td className="text-right px-4 py-3 text-muted-foreground">{new Date(trade.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Transactions' && (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Market</th>
                <th className="text-right px-4 py-3 font-semibold">Amount</th>
                <th className="text-right px-4 py-3 font-semibold">Balance After</th>
                <th className="text-right px-4 py-3 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {(transactionsQuery.data || []).map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 capitalize">{entry.entry_type.replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3">{entry.market_title || 'Account'}</td>
                  <td className={`text-right px-4 py-3 tabular-nums font-medium ${entry.amount >= 0 ? 'text-yes' : 'text-no'}`}>{money(entry.amount)}</td>
                  <td className="text-right px-4 py-3 tabular-nums">{money(entry.balance_after)}</td>
                  <td className="text-right px-4 py-3 text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
