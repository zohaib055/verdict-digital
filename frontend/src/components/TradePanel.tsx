import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/lib/auth';
import { api, type TradeQuote } from '@/lib/api';

interface TradePanelProps {
  marketId: number;
  yesPrice: number;
  noPrice: number;
  onTradeComplete?: () => Promise<void> | void;
}

export default function TradePanel({ marketId, yesPrice, noPrice, onTradeComplete }: TradePanelProps) {
  const { user, refreshMe } = useAuth();
  const [outcome, setOutcome] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('100');
  const [quote, setQuote] = useState<TradeQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const quickAmounts = [10, 50, 100, 500];

  const price = outcome === 'yes' ? yesPrice : noPrice;

  useEffect(() => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setQuote(null);
      return;
    }

    const controller = new AbortController();
    setLoadingQuote(true);
    void api
      .quoteTrade(marketId, {
        side: outcome,
        action: 'buy',
        amount: numericAmount,
        quantity_type: 'cash',
      })
      .then(setQuote)
      .catch(() => setQuote(null))
      .finally(() => setLoadingQuote(false));

    return () => controller.abort();
  }, [marketId, outcome, amount]);

  const estimatedShares = useMemo(() => {
    if (quote) return quote.shares_out;
    const numericAmount = Number(amount);
    return numericAmount > 0 && price > 0 ? numericAmount / (price / 100) : 0;
  }, [quote, amount, price]);

  const handleTrade = async () => {
    if (!user) {
      toast.error('Please log in to trade');
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      await api.trade(marketId, {
        user_id: user.id,
        side: outcome,
        action: 'buy',
        amount: numericAmount,
        quantity_type: 'cash',
        min_shares_out: quote ? Math.max(0.000001, quote.shares_out * 0.99) : undefined,
        client_order_id: `web-${user.id}-${marketId}-${Date.now()}`,
      });
      await refreshMe();
      await onTradeComplete?.();
      toast.success(`Bought ${outcome.toUpperCase()} position`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Trade failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setOutcome('yes')}
          className={`py-3 rounded-lg text-sm font-semibold transition-all ${
            outcome === 'yes'
              ? 'bg-yes text-yes-foreground ring-2 ring-yes/30'
              : 'bg-secondary text-muted-foreground hover:bg-accent'
          }`}
        >
          <div>Yes</div>
          <div className="text-lg tabular-nums">{yesPrice.toFixed(1)}%</div>
        </button>
        <button
          onClick={() => setOutcome('no')}
          className={`py-3 rounded-lg text-sm font-semibold transition-all ${
            outcome === 'no'
              ? 'bg-no text-no-foreground ring-2 ring-no/30'
              : 'bg-secondary text-muted-foreground hover:bg-accent'
          }`}
        >
          <div>No</div>
          <div className="text-lg tabular-nums">{noPrice.toFixed(1)}%</div>
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Buy amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-secondary border border-border text-sm tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            min="0"
          />
        </div>
        <div className="flex gap-2">
          {quickAmounts.map((quickAmount) => (
            <button
              key={quickAmount}
              onClick={() => setAmount(String(quickAmount))}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                amount === String(quickAmount)
                  ? 'bg-accent text-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-accent/70'
              }`}
            >
              ${quickAmount}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 text-sm border-t border-border pt-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Displayed probability</span>
          <span className="tabular-nums text-foreground">{price.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Estimated shares</span>
          <span className="tabular-nums text-foreground">{estimatedShares.toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Fee</span>
          <span className="tabular-nums text-foreground">{quote ? `$${quote.fee_amount.toFixed(2)}` : '...'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Price impact</span>
          <span className="tabular-nums text-foreground">{quote ? `${quote.price_impact_bps.toFixed(0)} bps` : '...'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Post-trade probability</span>
          <span className="tabular-nums text-foreground">{quote ? `${(quote.display_probability_after * 100).toFixed(2)}%` : '...'}</span>
        </div>
      </div>

      <Button
        className={`w-full py-3 text-sm font-semibold ${
          outcome === 'yes'
            ? 'bg-yes hover:bg-yes/90 text-yes-foreground'
            : 'bg-no hover:bg-no/90 text-no-foreground'
        }`}
        size="lg"
        onClick={handleTrade}
        disabled={submitting || loadingQuote}
      >
        {submitting ? 'Submitting trade...' : `Buy ${outcome === 'yes' ? 'Yes' : 'No'}`}
      </Button>

      <p className="text-center text-[11px] text-muted-foreground">
        {user ? `Balance: $${user.balance.toFixed(2)} play money` : 'Log in to place trades.'}
      </p>
    </div>
  );
}
