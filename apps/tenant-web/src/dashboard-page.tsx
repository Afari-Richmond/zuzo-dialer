import { ArrowRight, Megaphone, Phone, Sparkles, UploadCloud } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { aiAgentApi, api } from './api';
import { StatCard, StatusBadge, useLoad } from './ui';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const TODAY = isoDate(new Date());
const SEVEN_DAYS_AGO = isoDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));

const CAMPAIGN_STATUS_DOT: Record<string, string> = {
  'Not-started': 'bg-gray-400',
  'In-progress': 'bg-blue-500',
  Locked: 'bg-red-400',
  Completed: 'bg-green-500',
};

type NavTarget = 'upload' | 'campaigns' | 'attempts' | 'analytics';

function LinkOut({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      {children}
      <ArrowRight className="size-3.5" />
    </button>
  );
}

export function DashboardPage({ onNavigate }: { onNavigate: (id: NavTarget) => void }) {
  const { data: campaignsData } = useLoad(() => api.campaigns(), 'dashboard-campaigns');
  const { data: overview } = useLoad(() => api.analyticsOverview(SEVEN_DAYS_AGO, TODAY), 'dashboard-overview');
  const { data: attemptsData } = useLoad(() => api.attempts(), 'dashboard-attempts');
  const { data: agent } = useLoad(
    () => aiAgentApi.getCurrent().catch(() => null),
    'dashboard-agent',
  );

  const campaigns = campaignsData?.campaigns ?? [];
  const counts = { 'Not-started': 0, 'In-progress': 0, Locked: 0, Completed: 0 } as Record<string, number>;
  for (const c of campaigns) {
    if (c.status.campaignStatus in counts) counts[c.status.campaignStatus] += 1;
  }
  const recentAttempts = (attemptsData?.attempts ?? []).slice(0, 6);

  return (
    <div>
      <p className="mb-6 text-sm text-muted-foreground">
        An at-a-glance view of everything running across your outreach account.
      </p>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onNavigate('upload')}
          className="flex items-center gap-2 rounded-xl border border-primary/25 bg-accent px-4 py-3 text-sm font-medium text-accent-foreground transition-colors hover:border-primary/50 hover:bg-primary hover:text-primary-foreground"
        >
          <UploadCloud className="size-4" />
          Upload contacts
        </button>
        <button
          type="button"
          onClick={() => onNavigate('campaigns')}
          className="flex items-center gap-2 rounded-xl border border-primary/25 bg-accent px-4 py-3 text-sm font-medium text-accent-foreground transition-colors hover:border-primary/50 hover:bg-primary hover:text-primary-foreground"
        >
          <Megaphone className="size-4" />
          New campaign
        </button>
        <button
          type="button"
          onClick={() => onNavigate('campaigns')}
          className="flex items-center gap-2 rounded-xl border border-primary/25 bg-accent px-4 py-3 text-sm font-medium text-accent-foreground transition-colors hover:border-primary/50 hover:bg-primary hover:text-primary-foreground"
        >
          <Sparkles className="size-4" />
          Configure AI agent
        </button>
        <button
          type="button"
          onClick={() => onNavigate('attempts')}
          className="flex items-center gap-2 rounded-xl border border-primary/25 bg-accent px-4 py-3 text-sm font-medium text-accent-foreground transition-colors hover:border-primary/50 hover:bg-primary hover:text-primary-foreground"
        >
          <Phone className="size-4" />
          Call attempts
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Campaigns" value={campaigns.length} color="gray" />
        <StatCard label="In progress" value={counts['In-progress']} color="blue" />
        <StatCard label="Calls (7d)" value={overview?.totals.total ?? 0} color="gray" />
        <StatCard
          label="Answer rate (7d)"
          value={overview ? `${Math.round(overview.totals.answerRate * 100)}%` : '—'}
          color="green"
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Call volume — last 7 days</h2>
            <LinkOut onClick={() => onNavigate('analytics')}>View analytics</LinkOut>
          </div>
          {overview && overview.dailyTrend.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No calls in the last 7 days.</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overview?.dailyTrend ?? []}>
                  <defs>
                    <linearGradient id="dashTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-primary)"
                    fill="url(#dashTrendFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Campaign status</h2>
            <LinkOut onClick={() => onNavigate('campaigns')}>View all</LinkOut>
          </div>
          <div className="flex flex-col gap-3">
            {Object.entries(counts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className={`size-2 rounded-full ${CAMPAIGN_STATUS_DOT[status]}`} />
                  {status.replace('-', ' ')}
                </span>
                <span className="font-semibold tabular-nums text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent call activity</h2>
            <LinkOut onClick={() => onNavigate('attempts')}>View all</LinkOut>
          </div>
          {recentAttempts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No call attempts yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentAttempts.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{a.phone}</div>
                    <div className="truncate text-xs text-muted-foreground">{a.campaign}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-surface p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">AI Agent</h2>
          {agent ? (
            <>
              <div className="mb-1 font-medium text-foreground">{agent.name}</div>
              <div className="mb-4 text-sm text-muted-foreground">{agent.llm ?? 'No model selected'}</div>
            </>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">No AI agent connected yet.</p>
          )}
          <LinkOut onClick={() => onNavigate('campaigns')}>Manage agent</LinkOut>
        </div>
      </div>
    </div>
  );
}
