import { useState } from 'react';
import { ArrowRight, Menu, PhoneCall, Sparkles, X } from 'lucide-react';

const NAV_LINKS = ['Product', 'Platform', 'Solutions', 'Pricing'];

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line/0 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <a href="#" className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper">
            Z
          </span>
          <span className="text-[15px] font-medium tracking-tight">ZuZo Dialer</span>
        </a>
        <nav className="hidden items-center gap-8 text-[15px] text-ink/80 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l} href="#" className="transition-colors hover:text-ink">
              {l}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-5 md:flex">
          <a href="#" className="text-[15px] text-ink/80 transition-colors hover:text-ink">
            Sign in
          </a>
          <a
            href="#contact"
            className="rounded-xl bg-ink px-4 py-2.5 text-[15px] font-medium text-paper transition-opacity hover:opacity-90"
          >
            Book a demo
          </a>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex size-9 items-center justify-center rounded-lg border border-line md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-line px-6 py-4 md:hidden">
          <nav className="grid gap-3 text-[15px]">
            {NAV_LINKS.map((l) => (
              <a key={l} href="#" className="text-ink/80">
                {l}
              </a>
            ))}
            <a href="#" className="text-ink/80">
              Sign in
            </a>
            <a href="#contact" className="font-medium text-ink">
              Book a demo
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

function DashboardMock() {
  return (
    <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_32px_80px_rgba(17,17,16,0.12)]">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2 text-xs font-medium text-ink/70">
          <span className="flex size-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-paper">
            Z
          </span>
          Outreach
        </div>
        <div className="flex gap-1.5 text-xs text-ink/50">
          <span className="rounded-full bg-paper-dim px-2.5 py-1">Dashboard</span>
          <span className="rounded-full px-2.5 py-1">Campaigns</span>
          <span className="rounded-full px-2.5 py-1">Analytics</span>
        </div>
      </div>
      <div className="grid gap-4 p-5">
        <div className="grid grid-cols-4 gap-3">
          {[
            ['Campaigns', '12'],
            ['Calls (7d)', '4,208'],
            ['Answer rate', '61%'],
            ['Avg. call', '58s'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-paper-dim/50 p-3">
              <div className="text-[11px] text-muted">{label}</div>
              <div className="font-display text-lg">{value}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2 border-b border-line pb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
          <span className="col-span-2">Contact</span>
          <span>Status</span>
          <span>Outcome</span>
          <span className="text-right">Time</span>
        </div>
        {[
          ['Ama Owusu', 'Completed', 'Renewed', '0:42'],
          ['Kofi Mensah', 'Completed', 'Callback requested', '1:03'],
          ['Efua Boateng', 'Calling…', '—', '0:12'],
        ].map(([name, status, outcome, time]) => (
          <div key={name} className="grid grid-cols-5 items-center gap-2 py-1 text-[13px]">
            <span className="col-span-2 font-medium">{name}</span>
            <span className="text-muted">{status}</span>
            <span className="text-muted">{outcome}</span>
            <span className="text-right text-muted">{time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="px-6 pb-20 pt-16 lg:px-10 lg:pt-24">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-[56px] leading-[1.05] tracking-tight sm:text-[72px] lg:text-[84px]">
          Calls that sound
          <br />
          like a person, run
          <br />
          like software.
        </h1>
        <p className="mt-7 max-w-xl text-lg text-ink/70">
          ZuZo Dialer calls your customers with a real conversation, not a script — renewal
          reminders, payment nudges, follow-ups — and reports back on every single one.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-[15px] font-medium text-paper transition-opacity hover:opacity-90"
          >
            Book a demo
          </a>
          <a
            href="#product"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-5 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-paper-dim"
          >
            See how it works
          </a>
          <span className="text-sm text-muted">No call center required.</span>
        </div>
      </div>
      <div className="mx-auto mt-16 max-w-5xl">
        <DashboardMock />
      </div>
    </section>
  );
}

function CapabilityStrip() {
  const items = [
    'Real conversations, not IVR trees',
    'Every call transcribed and reported',
    'Multi-tenant from day one',
    'Ghana-first telephony',
  ];
  return (
    <section className="border-y border-line bg-paper-dim/40 px-6 py-10 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 text-center">
        {items.map((item) => (
          <span key={item} className="text-sm font-medium text-ink/60">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function FeatureRow({
  eyebrow,
  title,
  subtitle,
  items,
  reverse,
  mock,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: { title: string; body: string; active?: boolean }[];
  reverse?: boolean;
  mock: React.ReactNode;
}) {
  return (
    <section id="product" className="px-6 py-20 lg:px-10 lg:py-28">
      <div
        className={`mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16 ${
          reverse ? 'lg:[&>*:first-child]:order-2' : ''
        }`}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
          <h2 className="font-display mt-3 text-4xl leading-[1.1] tracking-tight sm:text-5xl">{title}</h2>
          <p className="mt-4 max-w-md text-ink/70">{subtitle}</p>
          <div className="mt-8 grid gap-0">
            {items.map((item, i) => (
              <div key={item.title} className={`border-t border-line py-4 ${i === 0 ? 'border-t-0' : ''}`}>
                {item.active && <span className="mb-2 block h-px w-8 bg-accent" />}
                <h3 className="text-lg font-medium">{item.title}</h3>
                <p className="mt-1 text-sm text-ink/60">{item.body}</p>
              </div>
            ))}
            <div className="border-t border-line" />
          </div>
        </div>
        <div>{mock}</div>
      </div>
    </section>
  );
}

function AgentMock() {
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_32px_80px_rgba(17,17,16,0.1)]">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-medium">
        <Sparkles className="size-4 text-accent" />
        AI Agent — System prompt
      </div>
      <div className="space-y-3 p-5 text-[13px] leading-relaxed text-ink/70">
        <p>
          "You are Zoe, calling about a pending renewal. Confirm the customer's identity before
          sharing any policy detail. Never read a card number aloud…"
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {['check_payment_status', 'start_renewal', 'register_dnc', 'warm_transfer'].map((t) => (
            <span key={t} className="rounded-md bg-paper-dim px-2 py-1 font-mono text-[11px] text-ink/60">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CallMock() {
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_32px_80px_rgba(17,17,16,0.1)]">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-sm font-medium">
        <PhoneCall className="size-4 text-accent" />
        Call transcript
      </div>
      <div className="space-y-3 p-5 text-[13px]">
        <div>
          <span className="font-medium">Zoe</span>
          <p className="text-ink/60">Hi, this is Zoe from the team. Is now a good time?</p>
        </div>
        <div>
          <span className="font-medium">Customer</span>
          <p className="text-ink/60">Yes, go ahead.</p>
        </div>
        <div>
          <span className="font-medium">Zoe</span>
          <p className="text-ink/60">Your renewal is due Friday — want me to text the payment link?</p>
        </div>
      </div>
    </div>
  );
}

function StatsBand() {
  const stats = [
    ['Real AI', 'Not a decision tree — the agent actually understands the call'],
    ['Every call logged', 'Transcript, outcome, and next step, automatically'],
    ['Minutes, not months', 'A campaign goes from upload to calling the same day'],
    ['Built for Ghana', 'Local numbers, local hours, local payment flows'],
  ];
  return (
    <section className="bg-dark px-6 py-20 text-dark-ink lg:px-10 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display max-w-2xl text-4xl leading-[1.1] tracking-tight sm:text-5xl">
          Outbound calling, run like a product — not a call floor.
        </h2>
        <div className="mt-14 grid grid-cols-1 gap-8 border-t border-dark-line pt-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-dark-line">
          {stats.map(([title, body]) => (
            <div key={title} className="lg:px-8 lg:first:pl-0">
              <div className="font-display text-2xl">{title}</div>
              <p className="mt-2 text-sm text-dark-muted">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <section id="contact" className="bg-dark px-6 py-24 text-center text-dark-ink lg:px-10 lg:py-32">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
          Let's get your first
          <br />
          campaign calling.
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
          className="mx-auto mt-9 flex max-w-md flex-col gap-2.5 rounded-xl bg-[#1c1c1a] p-1.5 sm:flex-row"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your work email"
            className="w-full flex-1 rounded-lg bg-transparent px-4 py-2.5 text-[15px] text-dark-ink placeholder:text-dark-muted focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-dark-ink px-5 py-2.5 text-[15px] font-medium text-dark transition-opacity hover:opacity-90"
          >
            {sent ? 'Thanks — we’ll be in touch' : 'Book a demo'}
            {!sent && <ArrowRight className="size-4" />}
          </button>
        </form>
        <p className="mt-4 text-sm text-dark-muted">No self-serve signup yet — every account starts with a conversation.</p>
      </div>
    </section>
  );
}

const FOOTER_COLUMNS = [
  { title: 'Product', links: ['Campaigns', 'AI Agent', 'Analytics', 'Knowledge base'] },
  { title: 'Platform', links: ['Telephony', 'API', 'Reporting', 'Transcripts'] },
  { title: 'Company', links: ['About', 'Contact', 'Careers'] },
  { title: 'Legal', links: ['Privacy', 'Terms'] },
];

function Footer() {
  return (
    <footer className="bg-dark px-6 pb-10 pt-16 text-dark-ink lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 border-b border-dark-line pb-14 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-dark-ink text-xs font-bold text-dark">
                Z
              </span>
              <span className="text-[15px] font-medium">ZuZo Dialer</span>
            </div>
            <p className="mt-3 max-w-[22ch] text-sm text-dark-muted">AI voice outreach for teams who'd rather not dial.</p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-medium text-dark-ink">{col.title}</h4>
              <ul className="mt-4 grid gap-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-dark-muted transition-colors hover:text-dark-ink">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="pt-6 text-xs text-dark-muted">© {new Date().getFullYear()} ZuZo Dialer. All rights reserved.</p>
      </div>
    </footer>
  );
}

export function App() {
  return (
    <div>
      <Nav />
      <Hero />
      <CapabilityStrip />
      <FeatureRow
        eyebrow="Campaigns"
        title="Campaigns that run themselves."
        subtitle="Upload a list, give it a reason to call, and let it go — targets, scheduling, retries and failure handling, all in one place."
        items={[
          { title: 'Upload and go', body: 'A spreadsheet of contacts becomes a live campaign in minutes.', active: true },
          { title: 'Context per campaign', body: 'Tell the agent what this campaign is about — it adapts without a prompt rewrite.' },
          { title: 'Retry logic built in', body: 'Busy, no-answer, voicemail — each handled on your own rules.' },
          { title: 'Reports that make sense', body: 'Every call, outcome, and next step, exportable in one click.' },
        ]}
        mock={<DashboardMock />}
      />
      <FeatureRow
        eyebrow="AI Agent"
        title="One agent, your whole playbook."
        subtitle="The agent follows one system prompt, calls real tools during the conversation, and never touches a call it isn't confident about."
        items={[
          { title: 'Your own prompt', body: 'Write exactly how the agent should sound and behave — edit it anytime.', active: true },
          { title: 'Knowledge base', body: 'Give it policy documents, FAQs, pricing sheets to search while on a call.' },
          { title: 'Real tool calls', body: 'Check a payment, pull a policy, log a ticket — mid-conversation.' },
          { title: 'Full transcripts', body: 'Read exactly what was said, not just a one-line summary.' },
        ]}
        reverse
        mock={<AgentMock />}
      />
      <FeatureRow
        eyebrow="Visibility"
        title="You hear about it before your customer complains."
        subtitle="Every call is transcribed, scored, and searchable — so a bad call is something you catch, not something you find out about later."
        items={[
          { title: 'Live call attempts', body: 'Watch a campaign dial in real time, not after the fact.' },
          { title: 'Post-call analysis', body: 'Outcome, sentiment, next step — extracted automatically.', active: true },
          { title: 'Cross-campaign analytics', body: 'See trends across every campaign a tenant has ever run.' },
        ]}
        mock={<CallMock />}
      />
      <StatsBand />
      <FinalCta />
      <Footer />
    </div>
  );
}
