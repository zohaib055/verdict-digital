import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Trophy } from 'lucide-react';

import { api } from '@/lib/api';

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function Leaderboard() {
  const [scope, setScope] = useState<'weekly' | 'lifetime'>('weekly');
  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', scope],
    queryFn: () => api.leaderboard(scope, 50),
  });

  return (
    <div className="p-4 lg:p-6 pb-20 md:pb-6 max-w-6xl mx-auto space-y-6">
      <Link to="/explore" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground">Public player rankings powered by backend profile and leaderboard APIs.</p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {(['weekly', 'lifetime'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setScope(value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                scope === value ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {value === 'weekly' ? 'Weekly' : 'Lifetime'}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
              <th className="text-left px-4 py-3 font-semibold">Rank</th>
              <th className="text-left px-4 py-3 font-semibold">Trader</th>
              <th className="text-right px-4 py-3 font-semibold">Balance</th>
              <th className="text-right px-4 py-3 font-semibold">{scope === 'weekly' ? 'Weekly P&L' : 'Total P&L'}</th>
              <th className="text-right px-4 py-3 font-semibold">Accuracy</th>
              <th className="text-right px-4 py-3 font-semibold">Reputation</th>
              <th className="text-right px-4 py-3 font-semibold">Best Streak</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardQuery.data?.map((entry, index) => (
              <tr key={entry.user_id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3 font-semibold">{index + 1}</td>
                <td className="px-4 py-3">
                  <Link to={`/profile/${entry.user_id}`} className="font-medium hover:text-primary transition-colors">
                    {entry.full_name}
                  </Link>
                  <div className="text-xs text-muted-foreground">@{entry.username}</div>
                </td>
                <td className="text-right px-4 py-3 tabular-nums">{money(entry.balance)}</td>
                <td className={`text-right px-4 py-3 tabular-nums font-medium ${(scope === 'weekly' ? entry.weekly_pnl : entry.total_pnl) >= 0 ? 'text-yes' : 'text-no'}`}>
                  {money(scope === 'weekly' ? entry.weekly_pnl : entry.total_pnl)}
                </td>
                <td className="text-right px-4 py-3 tabular-nums">{entry.accuracy_score.toFixed(1)}%</td>
                <td className="text-right px-4 py-3 tabular-nums">{entry.reputation_score.toFixed(1)}</td>
                <td className="text-right px-4 py-3">{entry.best_streak}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {leaderboardQuery.isLoading ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">Loading leaderboard...</div>
        ) : null}
        {leaderboardQuery.error ? (
          <div className="px-4 py-8 text-sm text-destructive">Unable to load leaderboard.</div>
        ) : null}
      </div>
    </div>
  );
}
