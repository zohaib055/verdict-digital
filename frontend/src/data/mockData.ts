import { Market, Trade, Position, Order, TradeHistory, OrderBookEntry } from '@/types/market';

export const mockMarkets: Market[] = [
  {
    id: '1',
    question: 'Will the Democratic candidate win the 2028 Presidential Election?',
    description: 'This market resolves YES if the Democratic Party nominee wins the 2028 US Presidential Election.',
    yesPrice: 52,
    noPrice: 48,
    change24h: 2.3,
    volume: 12500000,
    liquidity: 3200000,
    closingDate: '2028-11-03',
    category: 'US Elections',
    status: 'active',
    resolutionSource: 'Associated Press',
    sparklineData: [48, 49, 47, 50, 51, 49, 52, 53, 51, 52],
    featured: true,
  },
  {
    id: '2',
    question: 'Will the US pass a federal carbon tax by 2027?',
    description: 'Resolves YES if the US Congress passes legislation implementing a federal carbon tax before January 1, 2027.',
    yesPrice: 18,
    noPrice: 82,
    change24h: -1.5,
    volume: 4200000,
    liquidity: 1100000,
    closingDate: '2027-01-01',
    category: 'Policy',
    status: 'active',
    resolutionSource: 'Congress.gov',
    sparklineData: [22, 21, 20, 19, 18, 19, 17, 18, 18, 18],
    featured: true,
  },
  {
    id: '3',
    question: 'Will Republicans hold the House majority after 2026 midterms?',
    description: 'Resolves YES if the Republican Party holds 218+ seats after the 2026 midterm elections.',
    yesPrice: 61,
    noPrice: 39,
    change24h: 0.8,
    volume: 8900000,
    liquidity: 2400000,
    closingDate: '2026-11-05',
    category: 'Congress',
    status: 'active',
    resolutionSource: 'Associated Press',
    sparklineData: [58, 59, 60, 59, 61, 60, 62, 61, 60, 61],
    featured: true,
  },
  {
    id: '4',
    question: 'Will Ukraine join NATO by 2030?',
    description: 'Resolves YES if Ukraine becomes a full member of NATO before January 1, 2030.',
    yesPrice: 12,
    noPrice: 88,
    change24h: -0.3,
    volume: 6700000,
    liquidity: 1800000,
    closingDate: '2030-01-01',
    category: 'Geopolitics',
    status: 'active',
    resolutionSource: 'NATO Official',
    sparklineData: [15, 14, 13, 12, 13, 12, 11, 12, 12, 12],
  },
  {
    id: '5',
    question: 'Will the UK hold a second Scottish independence referendum by 2028?',
    description: 'Resolves YES if Scotland holds an officially sanctioned independence referendum before 2028.',
    yesPrice: 8,
    noPrice: 92,
    change24h: -0.1,
    volume: 2100000,
    liquidity: 560000,
    closingDate: '2028-01-01',
    category: 'Referenda',
    status: 'active',
    resolutionSource: 'UK Government',
    sparklineData: [10, 9, 9, 8, 9, 8, 8, 8, 8, 8],
  },
  {
    id: '6',
    question: 'Will France elect a far-right president in 2027?',
    description: 'Resolves YES if a candidate from Rassemblement National or further right wins the French presidency in 2027.',
    yesPrice: 35,
    noPrice: 65,
    change24h: 4.2,
    volume: 5400000,
    liquidity: 1500000,
    closingDate: '2027-05-01',
    category: 'International Elections',
    status: 'active',
    resolutionSource: 'French Constitutional Council',
    sparklineData: [28, 29, 31, 30, 33, 32, 34, 33, 35, 35],
  },
  {
    id: '7',
    question: 'Will the US Federal Reserve cut rates below 3% in 2026?',
    description: 'Resolves YES if the Fed Funds Rate target range goes below 3% at any point in 2026.',
    yesPrice: 24,
    noPrice: 76,
    change24h: 1.1,
    volume: 7800000,
    liquidity: 2100000,
    closingDate: '2026-12-31',
    category: 'Policy',
    status: 'active',
    resolutionSource: 'Federal Reserve',
    sparklineData: [20, 21, 22, 23, 22, 24, 23, 24, 24, 24],
  },
  {
    id: '8',
    question: 'Will Taiwan hold a defense referendum by 2027?',
    description: 'Resolves YES if Taiwan holds a national referendum on defense spending or military policy by 2027.',
    yesPrice: 6,
    noPrice: 94,
    change24h: 0.0,
    volume: 1200000,
    liquidity: 340000,
    closingDate: '2027-01-01',
    category: 'Geopolitics',
    status: 'active',
    resolutionSource: 'Taiwan CEC',
    sparklineData: [7, 7, 6, 6, 7, 6, 6, 6, 6, 6],
  },
  {
    id: '9',
    question: 'Will a third-party candidate win any Electoral College votes in 2028?',
    description: 'Resolves YES if any candidate not from the Democratic or Republican party wins at least one Electoral College vote.',
    yesPrice: 4,
    noPrice: 96,
    change24h: 0.5,
    volume: 3400000,
    liquidity: 890000,
    closingDate: '2028-12-01',
    category: 'US Elections',
    status: 'active',
    resolutionSource: 'National Archives',
    sparklineData: [3, 3, 4, 3, 4, 4, 3, 4, 4, 4],
  },
  {
    id: '10',
    question: 'Will the EU adopt a common defense force by 2030?',
    description: 'Resolves YES if the EU formally establishes a unified military command structure.',
    yesPrice: 15,
    noPrice: 85,
    change24h: 0.9,
    volume: 4100000,
    liquidity: 1050000,
    closingDate: '2030-01-01',
    category: 'Geopolitics',
    status: 'active',
    resolutionSource: 'European Council',
    sparklineData: [12, 13, 14, 13, 14, 15, 14, 15, 15, 15],
  },
];

export const mockTrades: Trade[] = [
  { id: 't1', marketId: '1', time: '2 min ago', side: 'yes', price: 52, size: 5000 },
  { id: 't2', marketId: '1', time: '5 min ago', side: 'no', price: 48, size: 3200 },
  { id: 't3', marketId: '1', time: '8 min ago', side: 'yes', price: 51, size: 12000 },
  { id: 't4', marketId: '1', time: '12 min ago', side: 'yes', price: 51, size: 8500 },
  { id: 't5', marketId: '1', time: '15 min ago', side: 'no', price: 49, size: 4100 },
  { id: 't6', marketId: '1', time: '22 min ago', side: 'yes', price: 50, size: 6700 },
  { id: 't7', marketId: '1', time: '30 min ago', side: 'no', price: 50, size: 2900 },
  { id: 't8', marketId: '1', time: '45 min ago', side: 'yes', price: 49, size: 15000 },
];

export const mockPositions: Position[] = [
  { marketId: '1', market: 'Will the Democratic candidate win the 2028 Presidential Election?', outcome: 'yes', avgPrice: 48, currentPrice: 52, size: 10000, pnl: 400, value: 5200 },
  { marketId: '3', market: 'Will Republicans hold the House majority after 2026 midterms?', outcome: 'no', avgPrice: 35, currentPrice: 39, size: 5000, pnl: -200, value: 1950 },
  { marketId: '7', market: 'Will the US Federal Reserve cut rates below 3% in 2026?', outcome: 'yes', avgPrice: 20, currentPrice: 24, size: 8000, pnl: 320, value: 1920 },
];

export const mockOrders: Order[] = [
  { id: 'o1', marketId: '1', market: 'Will the Democratic candidate win the 2028 Presidential Election?', side: 'buy', outcome: 'yes', price: 50, size: 5000 },
  { id: 'o2', marketId: '6', market: 'Will France elect a far-right president in 2027?', side: 'buy', outcome: 'no', price: 60, size: 3000 },
];

export const mockTradeHistory: TradeHistory[] = [
  { id: 'th1', marketId: '1', market: 'Democratic candidate 2028', action: 'buy', outcome: 'yes', price: 48, size: 10000, timestamp: '2026-02-10 14:30' },
  { id: 'th2', marketId: '3', market: 'Republicans House 2026', action: 'buy', outcome: 'no', price: 35, size: 5000, timestamp: '2026-02-09 09:15' },
  { id: 'th3', marketId: '7', market: 'Fed rate cut 2026', action: 'buy', outcome: 'yes', price: 20, size: 8000, timestamp: '2026-02-08 16:45' },
  { id: 'th4', marketId: '2', market: 'Carbon tax 2027', action: 'sell', outcome: 'yes', price: 22, size: 3000, timestamp: '2026-02-07 11:20' },
];

export const mockOrderBook = {
  bids: [
    { price: 51, size: 5200, total: 5200 },
    { price: 50, size: 8100, total: 13300 },
    { price: 49, size: 12400, total: 25700 },
    { price: 48, size: 6300, total: 32000 },
    { price: 47, size: 9800, total: 41800 },
  ] as OrderBookEntry[],
  asks: [
    { price: 52, size: 4800, total: 4800 },
    { price: 53, size: 7200, total: 12000 },
    { price: 54, size: 3900, total: 15900 },
    { price: 55, size: 11000, total: 26900 },
    { price: 56, size: 5500, total: 32400 },
  ] as OrderBookEntry[],
};

export const mockChartData = Array.from({ length: 90 }, (_, i) => {
  const base = 45;
  const noise = Math.sin(i / 10) * 5 + Math.random() * 3 - 1.5;
  const trend = i * 0.08;
  return {
    date: new Date(2025, 10, 1 + i).toISOString().split('T')[0],
    yes: Math.round((base + noise + trend) * 100) / 100,
    no: Math.round((100 - base - noise - trend) * 100) / 100,
  };
});

export function formatVolume(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function formatPrice(n: number): string {
  return `${n}¢`;
}
