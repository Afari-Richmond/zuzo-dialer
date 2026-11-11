import { useState } from 'react';
import { Download } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, type AnalyticsOverview } from './api';
import { ErrorBanner, StatCard, useLoad } from './ui';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const TODAY = isoDate(new Date());
const THIRTY_DAYS_AGO = isoDate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

const OUTCOME_LABELS: Record<string, string> = {
  interested: 'Interested',
  not_interested: 'Not interested',
  callback_requested: 'Callback requested',
  wrong_number: 'Wrong number',
  converted: 'Converted',
  no_decision_yet: 'No decision yet',
  other: 'Other',
};

function toCsv(overview: AnalyticsOverview): string {
  const lines = ['Daily trend', 'Date,Count'];
  for (const r of overview.dailyTrend) lines.push(`${r.date},${r.count}`);
  lines.push('', 'Outcome breakdown', 'Outcome,Count');
  for (const r of overview.outcomeBreakdown) lines.push(`${OUTCOME_LABELS[r.outcome] ?? r.outcome},${r.count}`);
  return lines.join('\n');
}

function downloadCsv(overview: AnalyticsOverview) {
  const blob = new Blob([toCsv(overview)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `outreach-analytics-${TODAY}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const dateInputClass =
  'rounded-full border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export function AnalyticsPage() {
  const [from, setFrom] = useState(THIRTY_DAYS_AGO);
  const [to, setTo] = useState(TODAY);
  const { data, error, loading } = useLoad(() => api.analyticsOverview(from, to), `${from}:${to}`);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground">From</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className={dateInputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground">To</span>
            <input
              type="date"
              value={to}
              min={from}
              max={TODAY}
              onChange={(e) => setTo(e.target.value)}
              className={dateInputClass}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={!data}
          onClick={() => data && downloadCsv(data)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-input bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-4" />
          Export CSV
        </button>
      </div>

      {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ErrorBanner error={error} />

      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Total attempts" value={data.totals.total} color="gray" />
            <StatCard label="Completed" value={data.totals.completed} color="green" />
            <StatCard label="Failed" value={data.totals.failed} color="red" />
            <StatCard label="Answer rate" value={`${Math.round(data.totals.answerRate * 100)}%`} color="blue" />
          </div>

          <div className="card-surface mb-6 p-6">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Daily call volume</h2>
            {data.dailyTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity in this range.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyTrend}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-primary)"
                      fill="url(#trendFill)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card-surface p-6">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Outcome breakdown</h2>
            {data.outcomeBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logged outcomes in this range.</p>
            ) : (
              <div style={{ height: Math.max(160, data.outcomeBreakdown.length * 44) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.outcomeBreakdown.map((r) => ({
                      ...r,
                      label: OUTCOME_LABELS[r.outcome] ?? r.outcome,
                    }))}
                    layout="vertical"
                    margin={{ left: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={140}
                      tick={{ fontSize: 12 }}
                      stroke="var(--color-muted-foreground)"
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
