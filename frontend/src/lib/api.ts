export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000/api/v1";

const TOKEN_KEY = "verdict_token";

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export type AuthUser = {
  id: number;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  balance: number;
  reputation_score: number;
  accuracy_score: number;
  last_login_at: string | null;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
};

export type MarketListItem = {
  id: number;
  slug: string;
  title: string;
  question: string;
  category: string;
  status: string;
  is_public: boolean;
  close_at: string;
  traded_volume: number;
  raw_probability_yes: number;
  display_probability_yes: number;
};

export type MarketDetail = {
  id: number;
  slug: string;
  title: string;
  question: string;
  description: string | null;
  category: string;
  terms: string;
  resolution_criteria: string;
  status: string;
  is_public: boolean;
  close_at: string;
  resolve_by: string | null;
  resolved_at: string | null;
  outcome: "yes" | "no" | "cancelled" | null;
  resolved_source_url: string | null;
  resolved_explanation: string | null;
  traded_volume: number;
  raw_probability_yes: number;
  display_probability_yes: number;
  reserve_yes: number;
  reserve_no: number;
  metadata_json: Record<string, unknown>;
};

export type TradeQuote = {
  side: "yes" | "no";
  action: "buy" | "sell";
  quantity_type: "cash" | "shares";
  amount_in: number;
  fee_amount: number;
  shares_out: number;
  cash_out: number;
  average_price: number;
  probability_before: number;
  probability_after: number;
  display_probability_after: number;
  price_impact_bps: number;
  balance_required: number;
};

export type TradeActivityItem = {
  id: number;
  market_id: number;
  user_id: number;
  client_order_id: string | null;
  side: "yes" | "no";
  action: "buy" | "sell";
  cash_amount: number;
  fee_amount: number;
  shares_delta: number;
  avg_price: number;
  probability_before: number;
  probability_after: number;
  display_probability_after: number;
  created_at: string;
};

export type PortfolioResponse = {
  user_id: number;
  username: string;
  balance: number;
  total_realized_pnl: number;
  total_unrealized_pnl: number;
  positions: Array<{
    market_id: number;
    market_slug: string;
    market_title: string;
    yes_shares: number;
    no_shares: number;
    realized_pnl: number;
    unrealized_pnl: number;
    market_display_probability_yes: number;
    market_status: string;
    market_outcome: string | null;
  }>;
};

export type AnalyticsResponse = {
  summary: {
    user_id: number;
    username: string;
    full_name: string;
    balance: number;
    reputation_score: number;
    accuracy_score: number;
    total_markets_traded: number;
    total_trades: number;
    total_buy_trades: number;
    total_sell_trades: number;
    total_faucet_claims: number;
    net_deposits_from_faucet: number;
    total_fees_paid: number;
    total_realized_pnl: number;
    total_unrealized_pnl: number;
    total_volume: number;
    resolved_markets: number;
    correct_resolutions: number;
    current_streak: number;
    best_streak: number;
    last_trade_at: string | null;
  };
  recent_trades: Array<{
    trade_id: number;
    market_id: number;
    market_slug: string;
    market_title: string;
    side: "yes" | "no";
    action: "buy" | "sell";
    cash_amount: number;
    fee_amount: number;
    shares_delta: number;
    avg_price: number;
    probability_before: number;
    probability_after: number;
    display_probability_after: number;
    created_at: string;
  }>;
  recent_transactions: Array<{
    id: number;
    market_id: number | null;
    market_slug: string | null;
    market_title: string | null;
    trade_id: number | null;
    entry_type: string;
    amount: number;
    balance_after: number;
    metadata_json: Record<string, unknown>;
    created_at: string;
  }>;
};

export type UserTradeHistoryItem = AnalyticsResponse["recent_trades"][number];
export type UserTransactionItem = AnalyticsResponse["recent_transactions"][number];

export type LeaderboardEntry = {
  user_id: number;
  username: string;
  full_name: string;
  balance: number;
  total_pnl: number;
  weekly_pnl: number;
  accuracy_score: number;
  reputation_score: number;
  current_streak: number;
  best_streak: number;
};

export type PublicProfile = {
  user_id: number;
  username: string;
  full_name: string;
  balance: number;
  reputation_score: number;
  accuracy_score: number;
  resolved_markets: number;
  correct_resolutions: number;
  current_streak: number;
  best_streak: number;
  total_pnl: number;
  total_volume: number;
};

export type ShareArtifact = {
  artifact_type: string;
  title: string;
  subtitle: string;
  share_url: string;
  payload: Record<string, unknown>;
};

export type AdminMarketCreate = {
  title: string;
  question: string;
  description?: string | null;
  category: string;
  terms: string;
  resolution_criteria: string;
  close_at: string;
  resolve_by?: string | null;
  is_public?: boolean;
  base_liquidity?: number;
  fee_bps?: number;
  smoothing_alpha?: number;
  smoothing_beta?: number;
  smoothing_scale?: number;
  status?: string;
  metadata_json?: Record<string, unknown>;
};

export type AdminMarketUpdate = Partial<AdminMarketCreate> & {
  fee_bps?: number;
};

export type AdminMarketResolve = {
  outcome: "yes" | "no" | "cancelled";
  resolved_source_url: string;
  resolved_explanation: string;
};

export type SchedulerJob = {
  id: number;
  name: string;
  interval_minutes: number;
  is_active: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
};

export type SchedulerJobUpsert = {
  name: string;
  interval_minutes: number;
  is_active: boolean;
};

export type ScrapeRun = {
  id: number;
  job_id: number;
  status: string;
  started_at: string;
  finished_at: string | null;
  events_discovered: number;
  clusters_generated: number;
  suggestions_generated: number;
  error_message: string | null;
};

export type EventCluster = {
  id: number;
  topic: string;
  label: string;
  confidence: number;
  latest_event_at: string | null;
};

export type MarketSuggestion = {
  id: number;
  cluster_id: number;
  status: string;
  title: string;
  market_question: string;
  resolution_criteria: string;
  confidence: number;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function normalizeMarketListItem(item: Record<string, unknown>): MarketListItem {
  return {
    ...(item as Omit<MarketListItem, "traded_volume" | "raw_probability_yes" | "display_probability_yes">),
    traded_volume: toNumber(item.traded_volume as number | string),
    raw_probability_yes: toNumber(item.raw_probability_yes as number | string),
    display_probability_yes: toNumber(item.display_probability_yes as number | string),
  };
}

function normalizeMarketDetail(item: Record<string, unknown>): MarketDetail {
  return {
    ...(item as Omit<MarketDetail, "traded_volume" | "raw_probability_yes" | "display_probability_yes" | "reserve_yes" | "reserve_no">),
    traded_volume: toNumber(item.traded_volume as number | string),
    raw_probability_yes: toNumber(item.raw_probability_yes as number | string),
    display_probability_yes: toNumber(item.display_probability_yes as number | string),
    reserve_yes: toNumber(item.reserve_yes as number | string),
    reserve_no: toNumber(item.reserve_no as number | string),
  };
}

function normalizeTradeQuote(item: Record<string, unknown>): TradeQuote {
  return {
    ...(item as Omit<
      TradeQuote,
      | "amount_in"
      | "fee_amount"
      | "shares_out"
      | "cash_out"
      | "average_price"
      | "probability_before"
      | "probability_after"
      | "display_probability_after"
      | "price_impact_bps"
      | "balance_required"
    >),
    amount_in: toNumber(item.amount_in as number | string),
    fee_amount: toNumber(item.fee_amount as number | string),
    shares_out: toNumber(item.shares_out as number | string),
    cash_out: toNumber(item.cash_out as number | string),
    average_price: toNumber(item.average_price as number | string),
    probability_before: toNumber(item.probability_before as number | string),
    probability_after: toNumber(item.probability_after as number | string),
    display_probability_after: toNumber(item.display_probability_after as number | string),
    price_impact_bps: toNumber(item.price_impact_bps as number | string),
    balance_required: toNumber(item.balance_required as number | string),
  };
}

function normalizeTradeActivityItem(item: Record<string, unknown>): TradeActivityItem {
  return {
    ...(item as Omit<
      TradeActivityItem,
      | "cash_amount"
      | "fee_amount"
      | "shares_delta"
      | "avg_price"
      | "probability_before"
      | "probability_after"
      | "display_probability_after"
    >),
    cash_amount: toNumber(item.cash_amount as number | string),
    fee_amount: toNumber(item.fee_amount as number | string),
    shares_delta: toNumber(item.shares_delta as number | string),
    avg_price: toNumber(item.avg_price as number | string),
    probability_before: toNumber(item.probability_before as number | string),
    probability_after: toNumber(item.probability_after as number | string),
    display_probability_after: toNumber(item.display_probability_after as number | string),
  };
}

function normalizePortfolio(item: Record<string, unknown>): PortfolioResponse {
  const positions = Array.isArray(item.positions) ? item.positions : [];
  return {
    ...(item as Omit<PortfolioResponse, "balance" | "total_realized_pnl" | "total_unrealized_pnl" | "positions">),
    balance: toNumber(item.balance as number | string),
    total_realized_pnl: toNumber(item.total_realized_pnl as number | string),
    total_unrealized_pnl: toNumber(item.total_unrealized_pnl as number | string),
    positions: positions.map((position) => ({
      ...(position as PortfolioResponse["positions"][number]),
      yes_shares: toNumber((position as Record<string, unknown>).yes_shares as number | string),
      no_shares: toNumber((position as Record<string, unknown>).no_shares as number | string),
      realized_pnl: toNumber((position as Record<string, unknown>).realized_pnl as number | string),
      unrealized_pnl: toNumber((position as Record<string, unknown>).unrealized_pnl as number | string),
      market_display_probability_yes: toNumber(
        (position as Record<string, unknown>).market_display_probability_yes as number | string,
      ),
    })),
  };
}

function normalizeAnalytics(item: Record<string, unknown>): AnalyticsResponse {
  const summary = (item.summary || {}) as Record<string, unknown>;
  const recentTrades = Array.isArray(item.recent_trades) ? item.recent_trades : [];
  const recentTransactions = Array.isArray(item.recent_transactions) ? item.recent_transactions : [];
  return {
    summary: {
      ...(summary as AnalyticsResponse["summary"]),
      balance: toNumber(summary.balance as number | string),
      reputation_score: toNumber(summary.reputation_score as number | string),
      accuracy_score: toNumber(summary.accuracy_score as number | string),
      net_deposits_from_faucet: toNumber(summary.net_deposits_from_faucet as number | string),
      total_fees_paid: toNumber(summary.total_fees_paid as number | string),
      total_realized_pnl: toNumber(summary.total_realized_pnl as number | string),
      total_unrealized_pnl: toNumber(summary.total_unrealized_pnl as number | string),
      total_volume: toNumber(summary.total_volume as number | string),
    },
    recent_trades: recentTrades.map((trade) => ({
      ...(trade as AnalyticsResponse["recent_trades"][number]),
      cash_amount: toNumber((trade as Record<string, unknown>).cash_amount as number | string),
      fee_amount: toNumber((trade as Record<string, unknown>).fee_amount as number | string),
      shares_delta: toNumber((trade as Record<string, unknown>).shares_delta as number | string),
      avg_price: toNumber((trade as Record<string, unknown>).avg_price as number | string),
      probability_before: toNumber((trade as Record<string, unknown>).probability_before as number | string),
      probability_after: toNumber((trade as Record<string, unknown>).probability_after as number | string),
      display_probability_after: toNumber((trade as Record<string, unknown>).display_probability_after as number | string),
    })),
    recent_transactions: recentTransactions.map((entry) => ({
      ...(entry as AnalyticsResponse["recent_transactions"][number]),
      amount: toNumber((entry as Record<string, unknown>).amount as number | string),
      balance_after: toNumber((entry as Record<string, unknown>).balance_after as number | string),
    })),
  };
}

function normalizeLeaderboardEntry(item: Record<string, unknown>): LeaderboardEntry {
  return {
    ...(item as Omit<LeaderboardEntry, "balance" | "total_pnl" | "weekly_pnl" | "accuracy_score" | "reputation_score">),
    balance: toNumber(item.balance as number | string),
    total_pnl: toNumber(item.total_pnl as number | string),
    weekly_pnl: toNumber(item.weekly_pnl as number | string),
    accuracy_score: toNumber(item.accuracy_score as number | string),
    reputation_score: toNumber(item.reputation_score as number | string),
  };
}

function normalizePublicProfile(item: Record<string, unknown>): PublicProfile {
  return {
    ...(item as Omit<PublicProfile, "balance" | "reputation_score" | "accuracy_score" | "total_pnl" | "total_volume">),
    balance: toNumber(item.balance as number | string),
    reputation_score: toNumber(item.reputation_score as number | string),
    accuracy_score: toNumber(item.accuracy_score as number | string),
    total_pnl: toNumber(item.total_pnl as number | string),
    total_volume: toNumber(item.total_volume as number | string),
  };
}

function normalizeShareArtifact(item: Record<string, unknown>): ShareArtifact {
  return {
    ...(item as ShareArtifact),
    payload: (item.payload as Record<string, unknown>) || {},
  };
}

type ApiOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  const resolvedToken = options.token ?? getStoredToken();
  if (resolvedToken) {
    headers.set("Authorization", `Bearer ${resolvedToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "Request failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  signup: (payload: { email: string; username: string; full_name: string; password: string }) =>
    request<AuthResponse>("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: (token: string) => request<AuthResponse>("/auth/me", { token }),
  markets: (params?: { category?: string; status?: string; limit?: number; include_private?: boolean }) => {
    const search = new URLSearchParams();
    if (params?.category) search.set("category", params.category);
    if (params?.status) search.set("status", params.status);
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.include_private) search.set("include_private", "true");
    const query = search.toString();
    return request<Record<string, unknown>[]>(`/prediction/markets${query ? `?${query}` : ""}`).then((items) =>
      items.map(normalizeMarketListItem),
    );
  },
  market: (slug: string) =>
    request<Record<string, unknown>>(`/prediction/markets/${slug}`).then(normalizeMarketDetail),
  marketActivity: (marketId: number) =>
    request<{ trades: Record<string, unknown>[] }>(`/prediction/markets/${marketId}/activity`).then((payload) => ({
      trades: payload.trades.map(normalizeTradeActivityItem),
    })),
  quoteTrade: (marketId: number, payload: { side: "yes" | "no"; action: "buy" | "sell"; amount: number; quantity_type: "cash" | "shares" }) =>
    request<Record<string, unknown>>(`/prediction/markets/${marketId}/quote`, {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(normalizeTradeQuote),
  trade: (
    marketId: number,
    payload: {
      user_id: number;
      side: "yes" | "no";
      action: "buy" | "sell";
      amount: number;
      quantity_type: "cash" | "shares";
      min_shares_out?: number;
      min_cash_out?: number;
      max_probability_yes_after?: number;
      min_probability_yes_after?: number;
      client_order_id?: string;
    },
  ) =>
    request<Record<string, unknown>>(`/prediction/markets/${marketId}/trade`, {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(normalizeTradeActivityItem),
  portfolio: (userId: number) =>
    request<Record<string, unknown>>(`/prediction/users/${userId}/portfolio`).then(normalizePortfolio),
  analytics: (userId: number) =>
    request<Record<string, unknown>>(`/prediction/users/${userId}/analytics`).then(normalizeAnalytics),
  userTrades: (userId: number, limit = 50) =>
    request<Record<string, unknown>[]>(`/prediction/users/${userId}/trades?limit=${limit}`).then((items) =>
      items.map((trade) => normalizeAnalytics({ summary: {}, recent_trades: [trade], recent_transactions: [] }).recent_trades[0]),
    ),
  userTransactions: (userId: number, limit = 100) =>
    request<Record<string, unknown>[]>(`/prediction/users/${userId}/transactions?limit=${limit}`).then((items) =>
      items.map((entry) => normalizeAnalytics({ summary: {}, recent_trades: [], recent_transactions: [entry] }).recent_transactions[0]),
    ),
  leaderboard: (scope: "weekly" | "lifetime", limit = 20) =>
    request<Record<string, unknown>[]>(`/prediction/leaderboards/${scope}?limit=${limit}`).then((items) =>
      items.map(normalizeLeaderboardEntry),
    ),
  publicProfile: (userId: number) =>
    request<Record<string, unknown>>(`/prediction/profiles/${userId}`).then(normalizePublicProfile),
  marketShare: (marketId: number, artifactType: string, userId?: number) =>
    request<Record<string, unknown>>(
      `/prediction/markets/${marketId}/share/${artifactType}${userId ? `?user_id=${userId}` : ""}`,
      { method: "POST" },
    ).then(normalizeShareArtifact),
  profileShare: (userId: number) =>
    request<Record<string, unknown>>(`/prediction/profiles/${userId}/share`).then(normalizeShareArtifact),
  adminCreateMarket: (payload: AdminMarketCreate) =>
    request<Record<string, unknown>>("/prediction/admin/markets", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(normalizeMarketDetail),
  adminUpdateMarket: (marketId: number, payload: AdminMarketUpdate) =>
    request<Record<string, unknown>>(`/prediction/admin/markets/${marketId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }).then(normalizeMarketDetail),
  adminApproveMarket: (marketId: number) =>
    request<Record<string, unknown>>(`/prediction/admin/markets/${marketId}/approve`, {
      method: "POST",
    }).then(normalizeMarketDetail),
  adminPauseMarket: (marketId: number) =>
    request<Record<string, unknown>>(`/prediction/admin/markets/${marketId}/pause`, {
      method: "POST",
    }).then(normalizeMarketDetail),
  adminResumeMarket: (marketId: number) =>
    request<Record<string, unknown>>(`/prediction/admin/markets/${marketId}/resume`, {
      method: "POST",
    }).then(normalizeMarketDetail),
  adminResolveMarket: (marketId: number, payload: AdminMarketResolve) =>
    request<Record<string, unknown>>(`/prediction/admin/markets/${marketId}/resolve`, {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(normalizeMarketDetail),
  schedulerJobs: () => request<SchedulerJob[]>('/political-intelligence/scheduler/jobs'),
  upsertSchedulerJob: (payload: SchedulerJobUpsert) =>
    request<SchedulerJob>('/political-intelligence/scheduler/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  runSchedulerJob: (jobId: number) =>
    request<ScrapeRun>(`/political-intelligence/scheduler/jobs/${jobId}/run`, {
      method: 'POST',
    }),
  schedulerRuns: () => request<ScrapeRun[]>('/political-intelligence/scheduler/runs'),
  eventClusters: () => request<EventCluster[]>('/political-intelligence/clusters'),
  marketSuggestions: () => request<MarketSuggestion[]>('/political-intelligence/market-suggestions'),
  faucetClaim: (userId: number) =>
    request<{ user_id: number; claim_week: string; amount: number | string; balance_after: number | string }>(
      `/prediction/users/${userId}/faucet/claim`,
      { method: "POST" },
    ).then((payload) => ({
      ...payload,
      amount: toNumber(payload.amount),
      balance_after: toNumber(payload.balance_after),
    })),
};
