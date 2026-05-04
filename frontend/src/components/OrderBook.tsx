import { useState, useEffect } from 'react';
import { mockOrderBook } from '@/data/mockData';

export default function OrderBook() {
  const [flashingItems, setFlashingItems] = useState<Record<string, boolean>>({});

  const maxTotal = Math.max(
    mockOrderBook.bids[mockOrderBook.bids.length - 1]?.total || 0,
    mockOrderBook.asks[mockOrderBook.asks.length - 1]?.total || 0
  );

  // Animate random price movements
  useEffect(() => {
    const interval = setInterval(() => {
      const allPrices = [
        ...mockOrderBook.asks.map((_, i) => `ask-${i}`),
        ...mockOrderBook.bids.map((_, i) => `bid-${i}`),
      ];
      const randomPrice = allPrices[Math.floor(Math.random() * allPrices.length)];
      
      setFlashingItems(prev => ({ ...prev, [randomPrice]: true }));
      setTimeout(() => {
        setFlashingItems(prev => ({ ...prev, [randomPrice]: false }));
      }, 1000);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-3 text-[11px] uppercase font-semibold text-muted-foreground px-4 py-2.5 bg-secondary/50">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (reversed) */}
      <div className="divide-y divide-border/50">
        {[...mockOrderBook.asks].reverse().map((entry, i) => {
          const flashKey = `ask-${mockOrderBook.asks.length - 1 - i}`;
          const isFlashing = flashingItems[flashKey];
          return (
            <div
              key={flashKey}
              className={`grid grid-cols-3 text-xs tabular-nums px-4 py-2 relative overflow-hidden cursor-pointer hover:bg-accent/30 transition-colors ${
                isFlashing ? 'flash-down' : ''
              }`}
            >
              <div
                className="absolute inset-y-0 right-0 bg-no/8"
                style={{ width: `${(entry.total / maxTotal) * 100}%` }}
              />
              <span className="relative text-no font-medium">{entry.price}¢</span>
              <span className="relative text-right text-foreground">{entry.size.toLocaleString()}</span>
              <span className="relative text-right text-muted-foreground">{entry.total.toLocaleString()}</span>
            </div>
          );
        })}
      </div>

      {/* Spread */}
      <div className="text-center text-xs text-muted-foreground py-2 border-y border-border bg-secondary/30 font-medium">
        Spread: 1¢
      </div>

      {/* Bids */}
      <div className="divide-y divide-border/50">
        {mockOrderBook.bids.map((entry, i) => {
          const flashKey = `bid-${i}`;
          const isFlashing = flashingItems[flashKey];
          return (
            <div
              key={flashKey}
              className={`grid grid-cols-3 text-xs tabular-nums px-4 py-2 relative overflow-hidden cursor-pointer hover:bg-accent/30 transition-colors ${
                isFlashing ? 'flash-up' : ''
              }`}
            >
              <div
                className="absolute inset-y-0 right-0 bg-yes/8"
                style={{ width: `${(entry.total / maxTotal) * 100}%` }}
              />
              <span className="relative text-yes font-medium">{entry.price}¢</span>
              <span className="relative text-right text-foreground">{entry.size.toLocaleString()}</span>
              <span className="relative text-right text-muted-foreground">{entry.total.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
