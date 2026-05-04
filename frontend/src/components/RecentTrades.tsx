import { useEffect, useMemo, useState } from 'react';

type TradeRow = {
  id: string;
  time: string;
  side: 'yes' | 'no';
  price: number;
  size: number;
};

export default function RecentTrades({ trades }: { trades: TradeRow[] }) {
  const [flashingTrades, setFlashingTrades] = useState<Record<string, boolean>>({});
  const rows = useMemo(() => trades.slice(0, 12), [trades]);

  // Animate recent trades flash
  useEffect(() => {
    if (!rows.length) return;
    const interval = setInterval(() => {
      const randomTrade = rows[Math.floor(Math.random() * rows.length)];
      const flashKey = randomTrade.id;
      
      setFlashingTrades(prev => ({ ...prev, [flashKey]: true }));
      setTimeout(() => {
        setFlashingTrades(prev => ({ ...prev, [flashKey]: false }));
      }, 800);
    }, 4000);

    return () => clearInterval(interval);
  }, [rows]);

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No trades yet for this market.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-4 text-[11px] uppercase font-semibold text-muted-foreground px-4 py-2.5 bg-secondary/50">
        <span>Time</span>
        <span>Side</span>
        <span className="text-right">Price</span>
        <span className="text-right">Size</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map(trade => {
          const isFlashing = flashingTrades[trade.id];
          const isYes = trade.side === 'yes';
          return (
            <div
              key={trade.id}
              className={`grid grid-cols-4 text-xs tabular-nums px-4 py-2.5 hover:bg-accent/30 transition-colors ${
                isFlashing ? (isYes ? 'flash-up' : 'flash-down') : ''
              }`}
            >
              <span className="text-muted-foreground">{trade.time}</span>
              <span className={trade.side === 'yes' ? 'text-yes font-medium' : 'text-no font-medium'}>
                {trade.side.toUpperCase()}
              </span>
              <span className={`text-right font-medium ${isYes ? 'text-yes' : 'text-no'}`}>{trade.price}¢</span>
              <span className="text-right text-muted-foreground">${trade.size.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
