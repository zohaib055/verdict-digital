import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Radar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

export default function Intelligence() {
  const [jobName, setJobName] = useState('Default Political Radar');
  const [intervalMinutes, setIntervalMinutes] = useState('30');

  const jobsQuery = useQuery({
    queryKey: ['scheduler-jobs'],
    queryFn: () => api.schedulerJobs(),
  });
  const runsQuery = useQuery({
    queryKey: ['scheduler-runs'],
    queryFn: () => api.schedulerRuns(),
  });
  const clustersQuery = useQuery({
    queryKey: ['event-clusters'],
    queryFn: () => api.eventClusters(),
  });
  const suggestionsQuery = useQuery({
    queryKey: ['market-suggestions'],
    queryFn: () => api.marketSuggestions(),
  });

  const refreshAll = async () => {
    await Promise.all([
      jobsQuery.refetch(),
      runsQuery.refetch(),
      clustersQuery.refetch(),
      suggestionsQuery.refetch(),
    ]);
  };

  const createJob = async () => {
    try {
      await api.upsertSchedulerJob({
        name: jobName,
        interval_minutes: Number(intervalMinutes),
        is_active: true,
      });
      toast.success('Scheduler job saved');
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save job');
    }
  };

  const runJob = async (jobId: number) => {
    try {
      await api.runSchedulerJob(jobId);
      toast.success('Scheduler job started');
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to run job');
    }
  };

  return (
    <div className="p-4 lg:p-6 pb-20 md:pb-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Radar className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Political Intelligence</h1>
          <p className="text-sm text-muted-foreground">Frontend coverage for scheduler jobs, runs, event clusters, and generated market suggestions.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold text-sm">Scheduler job</h2>
        <div className="grid md:grid-cols-[1fr_160px_auto] gap-3">
          <Input value={jobName} onChange={(event) => setJobName(event.target.value)} placeholder="Job name" />
          <Input value={intervalMinutes} onChange={(event) => setIntervalMinutes(event.target.value)} placeholder="Interval minutes" />
          <Button onClick={createJob}>Save job</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-sm font-semibold">Scheduler jobs</div>
          <div className="divide-y divide-border">
            {jobsQuery.data?.map((job) => (
              <div key={job.id} className="px-4 py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{job.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Every {job.interval_minutes} min · {job.is_active ? 'active' : 'inactive'}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => runJob(job.id)}>Run now</Button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-sm font-semibold">Recent runs</div>
          <div className="divide-y divide-border">
            {runsQuery.data?.map((run) => (
              <div key={run.id} className="px-4 py-4">
                <div className="font-medium">Run #{run.id} · {run.status}</div>
                <div className="text-xs text-muted-foreground">
                  events {run.events_discovered} · clusters {run.clusters_generated} · suggestions {run.suggestions_generated}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-sm font-semibold">Clusters</div>
          <div className="divide-y divide-border">
            {clustersQuery.data?.map((cluster) => (
              <div key={cluster.id} className="px-4 py-4">
                <div className="font-medium">{cluster.label}</div>
                <div className="text-xs text-muted-foreground">
                  topic {cluster.topic} · confidence {(cluster.confidence * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-sm font-semibold">Market suggestions</div>
          <div className="divide-y divide-border">
            {suggestionsQuery.data?.map((suggestion) => (
              <div key={suggestion.id} className="px-4 py-4">
                <div className="font-medium">{suggestion.title}</div>
                <div className="text-xs text-muted-foreground">
                  cluster #{suggestion.cluster_id} · {suggestion.status} · confidence {(suggestion.confidence * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">{suggestion.market_question}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
