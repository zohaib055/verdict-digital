import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Flame, Newspaper, TrendingUp, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import MarketCard from '@/components/MarketCard';
import { api } from '@/lib/api';
import type { Market } from '@/types/market';

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
    featured: market.traded_volume > 0,
  };
}

const sectionConfigs = [
  { title: 'Trending', icon: TrendingUp, pick: (markets: Market[]) => [...markets].sort((a, b) => b.volume - a.volume).slice(0, 4) },
  { title: 'Popular', icon: Flame, pick: (markets: Market[]) => markets.filter((market) => market.volume > 0).slice(0, 4) },
  { title: 'Closing Soon', icon: Clock, pick: (markets: Market[]) => [...markets].sort((a, b) => new Date(a.closingDate).getTime() - new Date(b.closingDate).getTime()).slice(0, 4) },
  { title: 'Top Movers', icon: Zap, pick: (markets: Market[]) => [...markets].sort((a, b) => Math.abs((b.yesPrice ?? 50) - 50) - Math.abs((a.yesPrice ?? 50) - 50)).slice(0, 4) },
];

function formatPublishedAt(value?: string | null) {
  if (!value) return 'Recent';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recent';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function cleanSummary(summary?: string | null) {
  if (!summary) return null;
  const trimmed = summary.trim();
  if (!trimmed) return null;
  if (/^\d{8}T\d{6}Z$/i.test(trimmed)) return null;
  if (/^\d{14}$/.test(trimmed)) return null;
  return trimmed;
}

function titleCaseTopic(value?: string | null) {
  if (!value) return 'Political Pulse';
  return value
    .replace(/-/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function Index() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['markets', 'explore'],
    queryFn: () => api.markets({ limit: 50 }),
  });
  const suggestionsQuery = useQuery({
    queryKey: ['market-suggestions', 'explore'],
    queryFn: () => api.marketSuggestions(),
  });

  const markets = (data || []).map(mapMarket);
  const suggestionCards = (suggestionsQuery.data || []).slice(0, 6);

  if (isLoading) {
    return <div className="px-6 py-10 text-sm text-muted-foreground">Loading markets...</div>;
  }

  if (error) {
    return <div className="px-6 py-10 text-sm text-destructive">Unable to load markets.</div>;
  }

  return (
    <div className="pb-20 md:pb-6">
      {suggestionCards.length ? (
        <section className="border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
            <div className="flex items-center gap-2 mb-4">
              <Newspaper className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Live Political News Radar</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {suggestionCards.map((suggestion) => {
                const sourceContext = Array.isArray(suggestion.metadata_json?.source_context)
                  ? (suggestion.metadata_json.source_context as Array<Record<string, string | null>>)
                  : [];
                const topStory = sourceContext[0];
                const summary = cleanSummary(topStory?.summary) || suggestion.market_question;
                const topic = typeof suggestion.metadata_json?.topic === 'string'
                  ? suggestion.metadata_json.topic
                  : null;
                return (
                  <div key={suggestion.id} className="rounded-xl border border-border bg-card p-5 flex h-full flex-col">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {(suggestion.metadata_json?.cluster_label as string) || suggestion.title}
                      </div>
                      <div className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {titleCaseTopic(topic)}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-xl leading-tight tracking-tight text-foreground">
                        {topStory?.headline || suggestion.market_question}
                      </h3>
                      <p className="text-sm leading-7 text-muted-foreground line-clamp-4">
                        {summary}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-3">
                        <span>{formatPublishedAt(topStory?.published_at)}</span>
                        <span>{((suggestion.confidence || 0) * 100).toFixed(1)}% confidence</span>
                      </div>
                      {topStory?.source ? (
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] uppercase tracking-wide">
                          {topStory.source}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-auto pt-5 flex items-center gap-4 text-sm">
                      {topStory?.source_url ? (
                        <a href={topStory.source_url} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 font-medium">
                          Read source
                        </a>
                      ) : null}
                      <Link to="/admin/markets" className="text-primary hover:text-primary/80 font-medium">
                        Create market from suggestion
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {sectionConfigs.map((section) => {
        const filtered = section.pick(markets);
        if (!filtered.length) return null;
        return (
          <section key={section.title} className="border-b border-border last:border-0">
            <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <section.icon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-base font-semibold">{section.title}</h2>
                </div>
                <Link to="/markets" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
