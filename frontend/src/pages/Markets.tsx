import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import MarketCard from '@/components/MarketCard';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { CATEGORIES, type Market } from '@/types/market';

const sortOptions = ['Volume', 'Closing Soon', 'Probability'] as const;
const topicChips = ['All', ...CATEGORIES] as const;

function mapMarket(market: Awaited<ReturnType<typeof api.markets>>[number]): Market {
  return {
    id: market.id,
    slug: market.slug,
    title: market.title,
    question: market.question,
    yesPrice: market.display_probability_yes * 100,
    noPrice: (1 - market.display_probability_yes) * 100,
    volume: market.traded_volume,
    closingDate: market.close_at,
    category: market.category,
    status: market.status === 'open' ? 'active' : market.status === 'paused' ? 'halted' : market.status === 'resolved' ? 'resolved' : 'upcoming',
  };
}

export default function Markets() {
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState<string>('Volume');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>(searchParams.get('category') || 'All');

  const { data, isLoading, error } = useQuery({
    queryKey: ['markets', 'list'],
    queryFn: () => api.markets({ limit: 100 }),
  });

  const filtered = useMemo(() => {
    const markets = (data || []).map(mapMarket).filter((market) => {
      if (selectedTopic !== 'All' && market.category !== selectedTopic) return false;
      if (searchQuery && !market.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    return [...markets].sort((a, b) => {
      switch (sortBy) {
        case 'Volume':
          return b.volume - a.volume;
        case 'Closing Soon':
          return new Date(a.closingDate).getTime() - new Date(b.closingDate).getTime();
        case 'Probability':
          return Math.abs(b.yesPrice - 50) - Math.abs(a.yesPrice - 50);
        default:
          return 0;
      }
    });
  }, [data, searchQuery, selectedTopic, sortBy]);

  return (
    <div className="pb-20 md:pb-6">
      <div className="border-b border-border bg-card/50">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin py-3">
            {topicChips.map((chip) => (
              <button
                key={chip}
                onClick={() => setSelectedTopic(chip)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                  selectedTopic === chip
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground hover:text-foreground'
                }`}
              >
                {chip}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <div className="relative hidden md:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-8 h-8 w-40 bg-muted border-border text-xs"
                />
              </div>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="text-xs bg-muted border border-border rounded-md px-2 py-1.5 text-foreground h-8"
              >
                {sortOptions.map((sortOption) => <option key={sortOption} value={sortOption}>{sortOption}</option>)}
              </select>
              <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground"><p className="text-sm">Loading markets...</p></div>
        ) : error ? (
          <div className="text-center py-20 text-destructive"><p className="text-sm">Unable to load markets.</p></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground"><p className="text-sm">No markets match your filters.</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((market) => <MarketCard key={market.id} market={market} />)}
          </div>
        )}
      </div>
    </div>
  );
}
