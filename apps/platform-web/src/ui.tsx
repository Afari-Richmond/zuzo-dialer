import {
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export function phonesToText(phones: string[]) {
  return phones.join(', ');
}

export function textToPhones(text: string) {
  return text
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

const fieldClass =
  'w-full rounded-full border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input(props, ref) {
    return (
      <input
        {...props}
        ref={ref}
        className={`${fieldClass} ${props.className ?? ''}`}
      />
    );
  },
);

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${fieldClass} ${props.className ?? ''}`} />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={`${fieldClass} ${props.className ?? ''}`} />
  );
}

export function Btn({
  children,
  kind = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: 'primary' | 'ghost' | 'danger';
}) {
  const cls =
    kind === 'danger'
      ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
      : kind === 'ghost'
        ? 'border border-input bg-background text-foreground hover:bg-secondary'
        : 'bg-primary text-primary-foreground hover:bg-primary/90';
  return (
    <button
      {...props}
      className={`cursor-pointer rounded-full px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${cls} ${props.className ?? ''}`}
    >
      {children}
    </button>
  );
}

/** A labeled two-state switch, e.g. AudioCodes' own "Unlock ⟷ Lock" control. */
export function Toggle({
  checked,
  onChange,
  offLabel,
  onLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  offLabel: string;
  onLabel: string;
}) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
      <span className={checked ? 'text-muted-foreground' : ''}>{offLabel}</span>
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-secondary'
        }`}
      >
        <span
          className={`inline-block size-4 transform rounded-full bg-card shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
      <span className={!checked ? 'text-muted-foreground' : ''}>{onLabel}</span>
    </label>
  );
}

export function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
      {error}
    </p>
  );
}

export function useLoad<T>(fn: () => Promise<T>, key = '', pollMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = () => {
    setLoading(true);
    fn()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    setLoading(true);
    let cancelled = false;
    const fetchQuietly = () =>
      fn()
        .then((d) => {
          if (cancelled) return;
          setData(d);
          setError(null);
        })
        .catch((e: Error) => {
          if (!cancelled) setError(e.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    fetchQuietly();
    if (!pollMs) return () => {
      cancelled = true;
    };
    const timer = setInterval(fetchQuietly, pollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [key, pollMs]);
  return { data, error, loading, reload, setData };
}

export function SearchForm({
  onSearch,
}: {
  onSearch: (q: string) => void;
}) {
  const [q, setQ] = useState('');
  return (
    <form
      className="mb-4 flex gap-2"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSearch(q);
      }}
    >
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search"
      />
      <Btn type="submit">Search</Btn>
    </form>
  );
}

export function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="min-w-full text-left text-sm">
        <thead className="text-muted-foreground">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-5 py-3.5 text-xs font-medium uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const STAT_COLOR_CLASSES = {
  blue: 'border-teal-100 bg-teal-50',
  green: 'border-green-100 bg-green-50',
  amber: 'border-amber-100 bg-amber-50',
  red: 'border-red-100 bg-red-50',
  gray: 'border-border bg-secondary',
} as const;

export function StatCard({
  label,
  value,
  color = 'gray',
}: {
  label: string;
  value: string | number;
  color?: keyof typeof STAT_COLOR_CLASSES;
}) {
  return (
    <div className={`rounded-xl border p-5 ${STAT_COLOR_CLASSES[color]}`}>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="tabular-nums text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  queued: 'bg-secondary text-muted-foreground',
  dialing: 'bg-amber-50 text-amber-700',
  answered: 'bg-teal-50 text-teal-700',
  machine: 'bg-teal-50 text-teal-700',
  completed: 'bg-green-50 text-green-700',
  no_answer: 'bg-secondary text-muted-foreground',
  failed: 'bg-red-50 text-destructive',
  dnc: 'bg-red-50 text-destructive',
  outside_window: 'bg-secondary text-muted-foreground',
  // tenant/platform-admin statuses — not present in the original call-center
  // vocabulary this component was built for, added here for the admin console.
  active: 'bg-green-50 text-green-700',
  trial: 'bg-amber-50 text-amber-700',
  suspended: 'bg-red-50 text-destructive',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE_CLASSES[status] ?? 'bg-secondary text-muted-foreground';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
