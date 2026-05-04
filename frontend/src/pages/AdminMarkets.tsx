import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/lib/auth';
import { api, type MarketDetail } from '@/lib/api';

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 16);
}

function makeDefaultForm() {
  const closeAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const resolveBy = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
  return {
    title: '',
    question: '',
    description: '',
    category: 'Politics',
    terms: 'This market uses play money only. Resolution is based on the listed source criteria and final admin review.',
    resolution_criteria: '',
    close_at: toDateTimeLocal(closeAt.toISOString()),
    resolve_by: toDateTimeLocal(resolveBy.toISOString()),
  };
}

function normalizeDateTimeLocal(value: string) {
  if (!value) return '';
  const normalized = value.replace(' ', 'T').trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) return normalized;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return toDateTimeLocal(parsed.toISOString());
}

function validateForm(form: ReturnType<typeof makeDefaultForm>) {
  const issues: string[] = [];
  if (form.title.trim().length < 8) issues.push('Title must be at least 8 characters.');
  if (form.question.trim().length < 12) issues.push('Question must be at least 12 characters.');
  if (form.category.trim().length < 2) issues.push('Category is required.');
  if (form.terms.trim().length < 20) issues.push('Terms must be at least 20 characters.');
  if (form.resolution_criteria.trim().length < 20) issues.push('Resolution criteria must be at least 20 characters.');
  if (!form.close_at) issues.push('Close date is required.');

  const closeAt = form.close_at ? new Date(form.close_at) : null;
  const resolveBy = form.resolve_by ? new Date(form.resolve_by) : null;

  if (closeAt && Number.isNaN(closeAt.getTime())) issues.push('Close date is invalid.');
  if (resolveBy && Number.isNaN(resolveBy.getTime())) issues.push('Resolve-by date is invalid.');
  if (closeAt && closeAt.getTime() <= Date.now()) issues.push('Close date must be in the future.');
  if (closeAt && resolveBy && resolveBy.getTime() <= closeAt.getTime()) {
    issues.push('Resolve-by must be after the close date.');
  }

  return issues;
}

const defaultForm = makeDefaultForm();

const suggestionDescription = (id: number) =>
  `Created from political-intelligence suggestion #${id}. Review the source context and adjust before publishing.`;

const defaultFormValues = {
  category: 'Politics',
  terms: 'This market uses play money only. Resolution is based on the listed source criteria and final admin review.',
};

function defaultResolveForm(market?: MarketDetail | { title?: string; metadata_json?: Record<string, unknown> }) {
  const sourceContext = Array.isArray(market?.metadata_json?.source_context)
    ? (market?.metadata_json?.source_context as Array<Record<string, unknown>>)
    : [];
  const primarySourceUrl = typeof sourceContext[0]?.source_url === 'string' ? sourceContext[0].source_url : '';
  const marketTitle = market?.title || 'this market';
  return {
    outcome: 'yes' as 'yes' | 'no' | 'cancelled',
    resolved_source_url: primarySourceUrl,
    resolved_explanation: `Resolved YES for "${marketTitle}" after admin review of the linked source coverage.`,
  };
}

function validateResolveForm(form: { resolved_source_url: string; resolved_explanation: string }) {
  const issues: string[] = [];
  if (form.resolved_source_url.trim().length < 5) issues.push('Resolution source URL is required.');
  if (form.resolved_explanation.trim().length < 10) issues.push('Resolution explanation must be at least 10 characters.');
  return issues;
}

export default function AdminMarkets() {
  const { user } = useAuth();
  const [form, setForm] = useState(defaultForm);
  const [editingMarketId, setEditingMarketId] = useState<number | null>(null);
  const [resolveMarketId, setResolveMarketId] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<number | null>(null);
  const [resolveForm, setResolveForm] = useState({
    outcome: 'yes' as 'yes' | 'no' | 'cancelled',
    resolved_source_url: '',
    resolved_explanation: '',
  });

  const marketsQuery = useQuery({
    queryKey: ['admin-markets'],
    queryFn: () => api.markets({ limit: 100, include_private: true }),
    enabled: Boolean(user?.is_admin),
  });
  const suggestionsQuery = useQuery({
    queryKey: ['admin-market-suggestions'],
    queryFn: () => api.marketSuggestions(),
    enabled: Boolean(user?.is_admin),
  });

  const selectedMarket = useMemo(
    () => marketsQuery.data?.find((market) => market.id === editingMarketId),
    [editingMarketId, marketsQuery.data],
  );
  const selectedResolveMarket = useMemo(
    () => marketsQuery.data?.find((market) => market.id === resolveMarketId),
    [marketsQuery.data, resolveMarketId],
  );

  useEffect(() => {
    if (!selectedMarket || !editingMarketId) return;
    void api.market(selectedMarket.slug).then((detail) => {
      setForm({
        title: detail.title,
        question: detail.question,
        description: detail.description || '',
        category: detail.category,
        terms: detail.terms,
        resolution_criteria: detail.resolution_criteria,
        close_at: toDateTimeLocal(detail.close_at),
        resolve_by: toDateTimeLocal(detail.resolve_by),
      });
      setFormErrors([]);
    });
  }, [editingMarketId, selectedMarket]);

  if (!user?.is_admin) {
    return <div className="p-6 text-sm text-muted-foreground">Admin market controls require an authenticated admin account.</div>;
  }

  const refreshMarkets = async () => {
    await marketsQuery.refetch();
  };

  const submitForm = async () => {
    const issues = validateForm(form);
    setFormErrors(issues);
    if (issues.length) {
      toast.error(issues[0]);
      return;
    }
    try {
      const basePayload = {
        ...form,
        description: form.description || null,
        resolve_by: form.resolve_by || null,
      };
      if (editingMarketId) {
        await api.adminUpdateMarket(editingMarketId, basePayload);
        toast.success('Market updated');
      } else {
        await api.adminCreateMarket({
          ...basePayload,
          is_public: true,
          base_liquidity: 1000,
          fee_bps: 200,
          smoothing_alpha: 12,
          smoothing_beta: 12,
          smoothing_scale: 250,
          status: 'draft',
        });
        toast.success('Market created');
      }
      setForm(makeDefaultForm());
      setEditingMarketId(null);
      setSelectedSuggestionId(null);
      setFormErrors([]);
      await refreshMarkets();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save market');
    }
  };

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      await action();
      toast.success(successMessage);
      await refreshMarkets();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Admin action failed');
    }
  };

  const submitResolution = async () => {
    if (!resolveMarketId) return;
    const issues = validateResolveForm(resolveForm);
    if (issues.length) {
      toast.error(issues[0]);
      return;
    }
    await runAction(
      () => api.adminResolveMarket(resolveMarketId, resolveForm),
      'Market resolved',
    );
    setResolveMarketId(null);
    setResolveForm(defaultResolveForm());
  };

  const openResolveForm = (market: MarketDetail | { id: number; title: string; slug: string; status: string; category: string; display_probability_yes: number; traded_volume: number; metadata_json?: Record<string, unknown> }) => {
    setResolveMarketId(market.id);
    setResolveForm(defaultResolveForm(market));
  };

  const populateFromSuggestion = (suggestionId: number) => {
    const suggestion = suggestionsQuery.data?.find((item) => item.id === suggestionId);
    if (!suggestion) return;
    const closeAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const resolveBy = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    setEditingMarketId(null);
    setSelectedSuggestionId(suggestion.id);
    setForm({
      title: suggestion.title,
      question: suggestion.market_question,
      description: suggestionDescription(suggestion.id),
      category: 'Political Intelligence',
      terms: defaultFormValues.terms,
      resolution_criteria: suggestion.resolution_criteria,
      close_at: toDateTimeLocal(closeAt.toISOString()),
      resolve_by: toDateTimeLocal(resolveBy.toISOString()),
    });
    setFormErrors([]);
    toast.success('Suggestion copied into the form');
  };

  const createDraftFromSuggestion = async (suggestionId: number) => {
    const suggestion = suggestionsQuery.data?.find((item) => item.id === suggestionId);
    if (!suggestion) return;
    try {
      await api.adminCreateMarket({
        title: suggestion.title,
        question: suggestion.market_question,
        description: suggestionDescription(suggestion.id),
        category: 'Political Intelligence',
        terms: defaultFormValues.terms,
        resolution_criteria: suggestion.resolution_criteria,
        close_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        resolve_by: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        is_public: true,
        base_liquidity: 1000,
        fee_bps: 200,
        smoothing_alpha: 12,
        smoothing_beta: 12,
        smoothing_scale: 250,
        status: 'draft',
        metadata_json: {
          suggestion_id: suggestion.id,
          cluster_id: suggestion.cluster_id,
          source_context: suggestion.metadata_json?.source_context || [],
          cluster_label: suggestion.metadata_json?.cluster_label || suggestion.title,
          topic: suggestion.metadata_json?.topic || 'politics',
        },
      });
      toast.success('Draft market created from suggestion');
      await refreshMarkets();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create from suggestion');
    }
  };

  return (
    <div className="p-4 lg:p-6 pb-20 md:pb-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin Markets</h1>
          <p className="text-sm text-muted-foreground">Frontend controls for create, update, approve, pause, resume, and resolve endpoints.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[420px_1fr] gap-6">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold text-sm">{editingMarketId ? 'Edit market' : 'Create market'}</h2>
          {selectedSuggestionId ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              Prefilled from suggestion #{selectedSuggestionId}. Review and submit when ready.
            </div>
          ) : null}
          {formErrors.length ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formErrors[0]}
            </div>
          ) : null}
          <Input placeholder="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          <textarea className="w-full min-h-24 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Question" value={form.question} onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))} />
          <textarea className="w-full min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <Input placeholder="Category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
          <textarea className="w-full min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Terms" value={form.terms} onChange={(event) => setForm((current) => ({ ...current, terms: event.target.value }))} />
          <textarea className="w-full min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Resolution criteria" value={form.resolution_criteria} onChange={(event) => setForm((current) => ({ ...current, resolution_criteria: event.target.value }))} />
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Close at</label>
            <Input type="datetime-local" value={form.close_at} onChange={(event) => setForm((current) => ({ ...current, close_at: normalizeDateTimeLocal(event.target.value) }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Resolve by</label>
            <Input type="datetime-local" value={form.resolve_by} onChange={(event) => setForm((current) => ({ ...current, resolve_by: normalizeDateTimeLocal(event.target.value) }))} />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={submitForm}>{editingMarketId ? 'Update market' : 'Create market'}</Button>
            {editingMarketId ? (
              <Button variant="secondary" onClick={() => { setEditingMarketId(null); setSelectedSuggestionId(null); setForm(makeDefaultForm()); setFormErrors([]); }}>
                Cancel
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => { setSelectedSuggestionId(null); setForm(makeDefaultForm()); setFormErrors([]); }}>
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-sm font-semibold">Create from suggestion</div>
            <div className="divide-y divide-border">
              {suggestionsQuery.data?.slice(0, 8).map((suggestion) => (
                <div key={suggestion.id} className="px-4 py-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{suggestion.title}</div>
                    <div className="text-xs text-muted-foreground">
                      cluster #{suggestion.cluster_id} · {((suggestion.confidence || 0) * 100).toFixed(1)}% confidence
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{suggestion.market_question}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="secondary" className="gap-2" onClick={() => populateFromSuggestion(suggestion.id)}>
                      <Sparkles className="h-4 w-4" />
                      Use in form
                    </Button>
                    <Button size="sm" onClick={() => createDraftFromSuggestion(suggestion.id)}>Create draft</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {resolveMarketId ? (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h2 className="font-semibold text-sm">Resolve market #{resolveMarketId}</h2>
              {selectedResolveMarket ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  Resolving <span className="font-medium text-foreground">{selectedResolveMarket.title}</span>. The source URL is prefilled from the attached news context when available.
                </div>
              ) : null}
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={resolveForm.outcome}
                onChange={(event) => setResolveForm((current) => ({ ...current, outcome: event.target.value as 'yes' | 'no' | 'cancelled' }))}
              >
                <option value="yes">YES</option>
                <option value="no">NO</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Input placeholder="Source URL" value={resolveForm.resolved_source_url} onChange={(event) => setResolveForm((current) => ({ ...current, resolved_source_url: event.target.value }))} />
              <textarea className="w-full min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Resolution explanation" value={resolveForm.resolved_explanation} onChange={(event) => setResolveForm((current) => ({ ...current, resolved_explanation: event.target.value }))} />
              <div className="flex gap-2">
                <Button onClick={submitResolution}>Resolve</Button>
                <Button variant="secondary" onClick={() => setResolveMarketId(null)}>Cancel</Button>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-sm font-semibold">Market lifecycle</div>
            <div className="divide-y divide-border">
              {marketsQuery.data?.map((market) => (
                <MarketRow
                  key={market.id}
                  market={market}
                  onEdit={() => setEditingMarketId(market.id)}
                  onApprove={() => runAction(() => api.adminApproveMarket(market.id), 'Market approved')}
                  onPause={() => runAction(() => api.adminPauseMarket(market.id), 'Market paused')}
                  onResume={() => runAction(() => api.adminResumeMarket(market.id), 'Market resumed')}
                  onResolve={() => openResolveForm(market)}
                />
              ))}
              {marketsQuery.isLoading ? <div className="px-4 py-6 text-sm text-muted-foreground">Loading markets...</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketRow({
  market,
  onEdit,
  onApprove,
  onPause,
  onResume,
  onResolve,
}: {
  market: MarketDetail | { id: number; title: string; slug: string; status: string; category: string; display_probability_yes: number; traded_volume: number; };
  onEdit: () => void;
  onApprove: () => void;
  onPause: () => void;
  onResume: () => void;
  onResolve: () => void;
}) {
  return (
    <div className="px-4 py-4 flex items-start justify-between gap-4 flex-wrap">
      <div className="space-y-1">
        <div className="font-medium">{market.title}</div>
        <div className="text-xs text-muted-foreground">
          #{market.id} · {market.slug} · {market.category} · {market.status}
        </div>
        <div className="text-xs text-muted-foreground">
          Displayed probability {(market.display_probability_yes * 100).toFixed(2)}% · Volume ${market.traded_volume.toFixed(2)}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={onEdit}>Edit</Button>
        {market.status === 'draft' || market.status === 'pending_approval' ? (
          <Button size="sm" onClick={onApprove}>Approve</Button>
        ) : null}
        {market.status === 'open' ? <Button variant="secondary" size="sm" onClick={onPause}>Pause</Button> : null}
        {market.status === 'paused' ? <Button variant="secondary" size="sm" onClick={onResume}>Resume</Button> : null}
        {(market.status === 'open' || market.status === 'paused') ? (
          <Button size="sm" onClick={onResolve}>Resolve</Button>
        ) : null}
      </div>
    </div>
  );
}
