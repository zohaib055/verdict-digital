import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Copy, UserCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function Profile() {
  const params = useParams();
  const userId = useMemo(() => Number(params.id), [params.id]);

  const profileQuery = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => api.publicProfile(userId),
    enabled: Number.isFinite(userId),
  });

  const shareQuery = useQuery({
    queryKey: ['profile-share', userId],
    queryFn: () => api.profileShare(userId),
    enabled: Number.isFinite(userId),
  });

  const copyShare = async () => {
    const share = shareQuery.data;
    if (!share) return;
    await navigator.clipboard.writeText(share.share_url).catch(() => undefined);
    toast.success('Profile share link copied');
  };

  if (profileQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading public profile...</div>;
  }

  if (profileQuery.error || !profileQuery.data) {
    return <div className="p-6 text-sm text-destructive">Public profile not found.</div>;
  }

  const profile = profileQuery.data;

  return (
    <div className="p-4 lg:p-6 pb-20 md:pb-6 max-w-5xl mx-auto space-y-6">
      <Link to="/leaderboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <UserCircle2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile.full_name}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Public profile backed by the `/prediction/profiles/{'{user_id}'}` and `/prediction/profiles/{'{user_id}'}/share` endpoints.
            </p>
          </div>
        </div>

        <Button variant="secondary" className="gap-2" onClick={copyShare} disabled={!shareQuery.data}>
          <Copy className="h-4 w-4" />
          Copy share link
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Balance</div><div className="text-lg font-bold">{money(profile.balance)}</div></div>
        <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Accuracy</div><div className="text-lg font-bold">{profile.accuracy_score.toFixed(1)}%</div></div>
        <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Reputation</div><div className="text-lg font-bold">{profile.reputation_score.toFixed(1)}</div></div>
        <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Resolved Markets</div><div className="text-lg font-bold">{profile.resolved_markets}</div></div>
        <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Correct Calls</div><div className="text-lg font-bold">{profile.correct_resolutions}</div></div>
        <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Current Streak</div><div className="text-lg font-bold">{profile.current_streak}</div></div>
        <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Best Streak</div><div className="text-lg font-bold">{profile.best_streak}</div></div>
        <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Total Volume</div><div className="text-lg font-bold">{money(profile.total_volume)}</div></div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold text-sm">Share Artifact</h2>
        {shareQuery.data ? (
          <>
            <p className="text-sm text-muted-foreground">{shareQuery.data.subtitle}</p>
            <div className="rounded-lg bg-secondary px-4 py-3 text-sm break-all">{shareQuery.data.share_url}</div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Loading profile share metadata...</p>
        )}
      </div>
    </div>
  );
}
