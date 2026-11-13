import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown, X } from 'lucide-react';

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

/** The browser's own dropdown arrow ignores border-radius and clips across
 * a rounded-full corner, so it's suppressed (appearance-none) in favor of a
 * custom chevron with padding that actually clears the curve. */
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select
        {...props}
        className={`${fieldClass} appearance-none pr-10 ${props.className ?? ''}`}
      />
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}

const textareaClass =
  'w-full resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={`${textareaClass} ${props.className ?? ''}`} />
  );
}

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
}

/** Closed state shows selected items as removable chips (or a placeholder);
 * clicking opens a checklist panel below, closed by an outside click. */
export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = 'Select…',
}: {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }
  function remove(value: string) {
    onChange(selected.filter((v) => v !== value));
  }

  const selectedOptions = options.filter((o) => selected.includes(o.value));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[2.75rem] w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-xl border border-input bg-background px-3 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {selectedOptions.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          selectedOptions.map((o) => (
            <span
              key={o.value}
              className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {o.label}
              <X
                className="size-3 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(o.value);
                }}
              />
            </span>
          ))
        )}
        <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-background p-1.5 shadow-lg">
          {options.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No options available.</p>
          )}
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="mt-0.5 size-4 cursor-pointer accent-primary"
              />
              <span>
                <span className="font-medium text-foreground">{o.label}</span>
                {o.description && (
                  <span className="block text-xs text-muted-foreground">{o.description}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
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
            {headers.map((h) => (
              <th key={h} className="px-5 py-3.5 text-xs font-medium uppercase tracking-wide">
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
  blue: { card: 'border-[#2f5fe0] bg-[#2f5fe0]', label: 'text-white/70', value: 'text-white' },
  green: { card: 'border-[#17874a] bg-[#17874a]', label: 'text-white/70', value: 'text-white' },
  amber: { card: 'border-[#b4650f] bg-[#b4650f]', label: 'text-white/75', value: 'text-white' },
  red: { card: 'border-[#c23327] bg-[#c23327]', label: 'text-white/75', value: 'text-white' },
  gray: { card: 'border-border bg-card', label: 'text-muted-foreground', value: 'text-foreground' },
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
  const cls = STAT_COLOR_CLASSES[color];
  return (
    <div className={`rounded-xl border p-5 ${cls.card}`}>
      <p className={`mb-1.5 text-xs font-medium ${cls.label}`}>{label}</p>
      <div className={`tabular-nums text-2xl font-bold ${cls.value}`}>{value}</div>
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
