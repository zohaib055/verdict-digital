export interface Market {
  id: number | string;
  slug?: string;
  title?: string;
  question: string;
  description?: string | null;
  yesPrice: number;
  noPrice: number;
  change24h?: number;
  volume: number;
  liquidity?: number;
  closingDate: string;
  category: string;
  status: "active" | "upcoming" | "resolved" | "halted" | "disputed";
  resolvedOutcome?: "yes" | "no";
  resolutionSource?: string | null;
  sparklineData?: number[];
  featured?: boolean;
}

export interface Trade {
  id: string;
  marketId: number | string;
  time: string;
  side: "yes" | "no";
  price: number;
  size: number;
}

export interface Position {
  marketId: number | string;
  market: string;
  outcome: "yes" | "no";
  avgPrice: number;
  currentPrice: number;
  size: number;
  pnl: number;
  value: number;
}

export interface Order {
  id: string;
  marketId: number | string;
  market: string;
  side: "buy" | "sell";
  outcome: "yes" | "no";
  price: number;
  size: number;
}

export interface TradeHistory {
  id: string;
  marketId: number | string;
  market: string;
  action: "buy" | "sell";
  outcome: "yes" | "no";
  price: number;
  size: number;
  timestamp: string;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export const CATEGORIES = [
  "US Elections",
  "International Elections",
  "Referenda",
  "Policy",
  "Congress",
  "Geopolitics",
  "politics",
] as const;

export type Category = (typeof CATEGORIES)[number];
