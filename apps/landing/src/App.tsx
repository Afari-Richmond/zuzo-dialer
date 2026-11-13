import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  FileText,
  Languages,
  Mic,
  Phone,
  PhoneCall,
  PlugZap,
  Sparkles,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white">
      {children}
    </span>
  );
}

// ---------- Nav ----------

function Nav() {
  return (
    <>
      <div className="h-1.5 w-full bg-accent" />
      <header className="sticky top-0 z-40 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="#top" className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-bold text-paper">
              Z
            </span>
            ZuZo Dialer
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink/70 md:flex">
            <a href="#capabilities" className="transition hover:text-ink">
              Product
            </a>
            <a href="#process" className="transition hover:text-ink">
              How it works
            </a>
            <a href="#pricing" className="transition hover:text-ink">
              Pricing
            </a>
            <a href="#faq" className="transition hover:text-ink">
              FAQ
            </a>
          </nav>
          <a
            href="#cta"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-accent"
          >
            Book a demo
          </a>
        </div>
      </header>
    </>
  );
}

// ---------- Hero ----------

const CAPABILITY_CHIPS = [
  'Bring your own carrier',
  'Real-time transcripts',
  'Multi-language agents',
  'Full tenant isolation',
  'Live call analytics',
  'Idempotent bulk uploads',
];

function CapabilityMarquee() {
  const items = [...CAPABILITY_CHIPS, ...CAPABILITY_CHIPS];
  return (
    <div className="overflow-hidden">
      <div className="marquee-track items-center gap-3">
        {items.map((name, i) => (
          <span
            key={i}
            className="mx-1.5 flex shrink-0 items-center rounded-full border border-line bg-white px-5 py-2 text-sm font-semibold text-ink/70"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-6 pb-20 pt-16 md:pt-24">
      <div className="mx-auto max-w-4xl text-center">
        <motion.div {...fadeUp}>
          <Eyebrow>AI Voice Outreach</Eyebrow>
        </motion.div>
        <motion.h1
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.08 }}
          className="mt-6 text-balance font-display text-5xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl md:text-7xl"
        >
          Voice agents that actually{' '}
          <span className="relative inline-block">
            close the call
            <svg
              viewBox="0 0 300 20"
              className="absolute -bottom-2 left-0 w-full text-accent"
              preserveAspectRatio="none"
            >
              <path d="M2 14C60 4 240 4 298 14" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
            </svg>
          </span>
        </motion.h1>
        <motion.p
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.16 }}
          className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted"
        >
          ZuZo Dialer launches, runs, and reports on outbound voice campaigns end to end, with real-time
          transcripts, live analytics, and agents that sound like your best rep, not a robot.
        </motion.p>
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.24 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#cta"
            className="group flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(255,90,31,0.6)] transition hover:-translate-y-0.5"
          >
            Book a demo
            <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
          </a>
          <a
            href="#process"
            className="rounded-full border border-line bg-white px-7 py-3.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-ink"
          >
            See how it works
          </a>
        </motion.div>
      </div>

      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.34 }}
        className="mx-auto mt-16 max-w-4xl"
      >
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          What&rsquo;s built in, out of the box
        </p>
        <CapabilityMarquee />
      </motion.div>
    </section>
  );
}

// ---------- Pain points ----------

const PAIN_POINTS = [
  'Reps burn out dialing the same script two hundred times a day',
  'Hot leads go cold waiting for a callback window',
  'No real visibility into what was actually said on a call',
  'Scaling outreach means hiring, not just dialing faster',
];

const FLOAT_TAGS = [
  { label: 'Qualified', rotate: -6, top: '6%', left: '4%', tone: 'bg-accent text-white' },
  { label: 'Sentiment: Positive', rotate: 4, top: '2%', right: '2%', tone: 'bg-ink text-paper' },
  { label: 'Call ended · 2:14', rotate: -3, bottom: '10%', left: '0%', tone: 'bg-white text-ink border border-line' },
  { label: 'Follow-up booked', rotate: 5, bottom: '2%', right: '6%', tone: 'bg-accent-soft text-accent' },
];

function PainPoints() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2">
        <motion.div {...fadeUp}>
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-5 text-balance font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
            Cold calling doesn&rsquo;t scale. Your pipeline shouldn&rsquo;t suffer for it.
          </h2>
          <ul className="mt-8 flex flex-col gap-4">
            {PAIN_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-base text-ink/80">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
                  <Check size={13} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.1 }}
          className="relative mx-auto aspect-[4/3] w-full max-w-md rounded-[28px] bg-ink p-6"
        >
          <div className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white">
                <PhoneCall size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-paper">Outbound &middot; Zoe Agent</p>
                <p className="text-xs text-dark-muted">Live call in progress</p>
              </div>
            </div>
            <div className="flex items-end gap-1">
              {[14, 26, 18, 34, 22, 30, 16, 28, 20].map((h, i) => (
                <span key={i} className="w-2 rounded-full bg-accent/70" style={{ height: h }} />
              ))}
            </div>
          </div>

          {FLOAT_TAGS.map((tag) => (
            <span
              key={tag.label}
              className={`absolute rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-lg ${tag.tone}`}
              style={{
                transform: `rotate(${tag.rotate}deg)`,
                top: tag.top,
                left: tag.left,
                right: tag.right,
                bottom: tag.bottom,
              }}
            >
              {tag.label}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ---------- Capabilities ----------

const CAPABILITIES = [
  {
    icon: Phone,
    title: 'Outbound campaigns',
    body: 'Upload a contact list, pick an agent, set a schedule, and go live in minutes.',
  },
  {
    icon: FileText,
    title: 'Live transcripts & analysis',
    body: 'Every call transcribed, scored, and searchable. No more guessing what happened.',
  },
  {
    icon: Languages,
    title: 'Multi-language voice agents',
    body: 'Agents that switch tone and language mid-conversation, built on real speech models.',
  },
];

function CapabilityCard({ icon: Icon, title, body, index }: (typeof CAPABILITIES)[number] & { index: number }) {
  const [hover, setHover] = useState(false);
  return (
    <motion.div
      {...fadeUp}
      transition={{ ...fadeUp.transition, delay: index * 0.08 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[28px] bg-ink p-7 text-paper"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/25 via-transparent to-transparent transition-opacity duration-500"
        style={{ opacity: hover ? 1 : 0 }}
      />
      <div className="relative flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
          <Icon size={20} />
        </span>
        <motion.span
          animate={{ rotate: hover ? 45 : 0 }}
          transition={{ duration: 0.3 }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white"
        >
          <ArrowUpRight size={16} />
        </motion.span>
      </div>
      <div className="relative">
        <h3 className="font-display text-2xl font-semibold leading-snug">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-dark-muted">{body}</p>
      </div>
    </motion.div>
  );
}

function Capabilities() {
  return (
    <section id="capabilities" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="max-w-xl">
          <Eyebrow>What you get</Eyebrow>
          <h2 className="mt-5 text-balance font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
            Everything an outreach team needs, built in.
          </h2>
        </motion.div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c, i) => (
            <CapabilityCard key={c.title} {...c} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Process ----------

const STEPS = [
  {
    n: '01',
    title: 'Connect your numbers',
    body: 'Bring your own carrier line, or dial out on ours. Switch any time.',
  },
  {
    n: '02',
    title: 'Build your agent',
    body: 'Write a prompt, attach a knowledge base, and choose how it should sound.',
  },
  {
    n: '03',
    title: 'Launch a campaign',
    body: 'Upload contacts, set the schedule and daily call window, then hit go.',
  },
  {
    n: '04',
    title: 'Review & refine',
    body: 'Read full transcripts, check outcomes, and tune the script from real calls.',
  },
];

function Process() {
  return (
    <section id="process" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-[0.8fr_1.2fr]">
          <div className="md:sticky md:top-28 md:self-start">
            <motion.div {...fadeUp}>
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-5 text-balance font-display text-4xl font-bold leading-tight text-ink">
                From contact list to closed call in four steps
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted">
                No telephony expertise required. If you can write a prompt and upload a spreadsheet,
                you can run a campaign.
              </p>
              <a
                href="#cta"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition hover:bg-accent"
              >
                Book a demo
                <ArrowRight size={15} />
              </a>
            </motion.div>
          </div>

          <div className="flex flex-col gap-5">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                className="flex gap-5 rounded-3xl border border-line bg-white p-7"
              >
                <span className="font-display text-2xl font-bold text-accent">{step.n}</span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Stats (count-up) ----------

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

const STATS = [
  { target: 100, suffix: '%', prefix: '', decimals: 0, label: 'Of calls fully transcribed, every time' },
  { target: 2, suffix: '+', prefix: '', decimals: 0, label: 'Telephony providers supported out of the box' },
  { target: 5, suffix: ' min', prefix: '<', decimals: 0, label: 'Average time to launch a new campaign' },
];

function StatCard({ stat, index }: { stat: (typeof STATS)[number]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const value = useCountUp(stat.target, inView);
  return (
    <motion.div
      ref={ref}
      {...fadeUp}
      transition={{ ...fadeUp.transition, delay: index * 0.1 }}
      className="rounded-3xl border border-dark-line bg-white/[0.03] p-8"
    >
      <p className="tabular-nums font-display text-5xl font-bold text-paper">
        {stat.prefix}
        {value.toFixed(stat.decimals)}
        {stat.suffix}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-dark-muted">{stat.label}</p>
    </motion.div>
  );
}

function Stats() {
  return (
    <section className="bg-dark px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="max-w-xl">
          <Eyebrow>Built for scale</Eyebrow>
          <h2 className="mt-5 text-balance font-display text-4xl font-bold leading-tight text-paper md:text-5xl">
            Numbers that hold up at volume
          </h2>
        </motion.div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {STATS.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Pricing ----------

const PLANS = [
  {
    name: 'Starter',
    blurb: 'For a single team testing a first campaign.',
    features: ['1 active campaign', '1 voice agent', 'Core call reporting', 'Email support'],
  },
  {
    name: 'Growth',
    blurb: 'For teams running outreach every week.',
    features: [
      'Unlimited campaigns',
      'Multiple voice agents',
      'Full transcripts & analytics',
      'Idempotent bulk uploads',
      'Priority support',
    ],
    featured: true,
  },
  {
    name: 'Scale',
    blurb: 'For multi-brand or multi-region operations.',
    features: ['Everything in Growth', 'Multiple tenants & teams', 'Custom telephony routing', 'Dedicated onboarding'],
  },
];

function Pricing() {
  return (
    <section id="pricing" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="max-w-xl">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="mt-5 text-balance font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
            Transparent plans, built around campaigns
          </h2>
          <p className="mt-4 text-base text-muted">
            Every plan is tailored to your call volume and provider setup. Talk to us for a quote.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              className={`flex flex-col rounded-[28px] border p-8 transition hover:-translate-y-1 ${
                plan.featured ? 'border-accent bg-ink text-paper' : 'border-line bg-white text-ink'
              }`}
            >
              {plan.featured && (
                <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
                  <Sparkles size={12} /> Most popular
                </span>
              )}
              <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
              <p className={`mt-2 text-sm ${plan.featured ? 'text-dark-muted' : 'text-muted'}`}>{plan.blurb}</p>
              <ul className="mt-6 flex flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check size={15} className="mt-0.5 text-accent" />
                    <span className={plan.featured ? 'text-paper/90' : 'text-ink/80'}>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#cta"
                className={`mt-8 flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${
                  plan.featured
                    ? 'bg-accent text-white hover:brightness-110'
                    : 'bg-paper-dim text-ink hover:bg-ink hover:text-paper'
                }`}
              >
                Talk to sales
                <ArrowRight size={14} />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Showcase ----------

function Showcase() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="max-w-xl">
          <Eyebrow>See it in action</Eyebrow>
          <h2 className="mt-5 text-balance font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
            One dashboard for every call, every agent, every outcome
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-5 md:grid-rows-2">
          <motion.div {...fadeUp} className="rounded-[28px] border border-line bg-white p-6 md:col-span-3 md:row-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Campaign overview</p>
            <div className="mt-5 flex items-end gap-2">
              {[40, 65, 50, 80, 60, 90, 70, 95, 55].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-paper-dim">
                  <div className="w-full rounded-t-md bg-accent transition-all" style={{ height: h, marginTop: 100 - h }} />
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5">
              {[
                ['Dialed', '1,204'],
                ['Connected', '812'],
                ['Qualified', '268'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="font-display text-xl font-bold text-ink">{val}</p>
                  <p className="text-xs text-muted">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.08 }}
            className="rounded-[28px] bg-ink p-6 text-paper md:col-span-2"
          >
            <div className="flex items-center gap-2">
              <Mic size={16} className="text-accent" />
              <p className="text-xs font-semibold uppercase tracking-wide text-dark-muted">Live transcript</p>
            </div>
            <div className="mt-4 flex flex-col gap-2 text-xs">
              <p className="rounded-xl bg-white/10 px-3 py-2 text-dark-ink">
                &ldquo;Hi, this is Zoe calling about your policy renewal&hellip;&rdquo;
              </p>
              <p className="ml-auto max-w-[80%] rounded-xl bg-accent px-3 py-2 text-white">
                &ldquo;Sure, what are my options?&rdquo;
              </p>
            </div>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.16 }}
            className="rounded-[28px] border border-line bg-white p-6 md:col-span-2"
          >
            <div className="flex items-center gap-2">
              <PlugZap size={16} className="text-accent" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Connected lines</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Primary line', 'Backup line', 'Voice engine'].map((p) => (
                <span key={p} className="rounded-full bg-paper-dim px-3 py-1.5 text-xs font-semibold text-ink/80">
                  {p}
                </span>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-muted">
              <BarChart3 size={14} className="text-accent" />
              Outcome breakdown updates in real time
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ---------- FAQ ----------

const FAQS = [
  {
    q: 'Do I need to bring my own telephony provider?',
    a: 'No. You can connect your own carrier credentials, or run campaigns on ours. Switch any time from Settings.',
  },
  {
    q: 'Can I run more than one campaign at once?',
    a: 'Yes. The platform is built for multiple campaigns per account, each with its own agent, contact list, and schedule.',
  },
  {
    q: 'What languages do the voice agents support?',
    a: 'Agents can be configured for multiple languages and can switch tone mid-conversation based on how the call is going.',
  },
  {
    q: 'How do I see what was actually said on a call?',
    a: 'Every call gets a full transcript plus a post-call analysis, covering outcome, sentiment, and key moments, all searchable from the dashboard.',
  },
  {
    q: 'Is my data isolated from other accounts?',
    a: 'Yes. Every account is fully tenant-isolated at the database level, with no shared visibility between organizations.',
  },
];

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: index * 0.05 }} className="border-b border-line">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-6 py-6 text-left">
        <span className="font-display text-lg font-semibold text-ink">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0 text-muted">
          <ChevronDown size={20} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="pb-6 pr-10 text-sm leading-relaxed text-muted">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Faq() {
  return (
    <section id="faq" className="px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <motion.div {...fadeUp} className="text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-5 text-balance font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
            Questions, answered
          </h2>
        </motion.div>
        <div className="mt-12">
          {FAQS.map((f, i) => (
            <FaqItem key={f.q} q={f.q} a={f.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Final CTA ----------

function FinalCta() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const shapeRow = (
    <>
      <div className="h-28 w-28 shrink-0 rounded-full bg-accent" />
      <div className="h-28 w-10 shrink-0 rounded-full bg-paper" />
      <div className="h-28 w-10 shrink-0 rounded-full bg-accent-soft" />
      <div className="flex h-28 w-28 shrink-0 overflow-hidden rounded-full">
        <div className="h-full w-1/2 bg-accent" />
        <div className="h-full w-1/2 bg-paper" />
      </div>
      <div className="flex h-28 w-28 shrink-0 flex-col overflow-hidden rounded-full">
        <div className="h-1/2 w-full bg-accent" />
        <div className="h-1/2 w-full bg-accent-soft" />
      </div>
    </>
  );

  return (
    <section id="cta" className="overflow-hidden bg-dark pt-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div {...fadeUp}>
          <Eyebrow>Let&rsquo;s talk</Eyebrow>
          <h2 className="mt-6 text-balance font-display text-4xl font-bold leading-tight text-paper md:text-5xl">
            Ready to put your outreach on autopilot?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-dark-muted">
            Tell us about your campaign and we&rsquo;ll set up a walkthrough with your actual data.
          </p>
        </motion.div>

        <motion.form
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.1 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (email) setSent(true);
          }}
          className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-full border border-dark-line bg-white/5 px-5 py-3 text-sm text-paper placeholder:text-dark-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {sent ? 'Thanks, we’ll be in touch' : 'Let’s talk'}
            {!sent && <ArrowRight size={15} />}
          </button>
        </motion.form>
      </div>

      <div className="mt-16 overflow-hidden">
        <div className="marquee-track marquee-track-slow items-end gap-6 px-6 pb-6">
          {shapeRow}
          {shapeRow}
          {shapeRow}
        </div>
      </div>
    </section>
  );
}

// ---------- Footer ----------

function Footer() {
  return (
    <footer className="bg-paper-dim px-6 pt-16">
      <div className="mx-auto grid max-w-6xl gap-10 border-b border-line pb-14 sm:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Email us</p>
          <a href="mailto:info@zuzogp.com" className="mt-2 block font-display text-2xl font-bold text-ink hover:text-accent">
            info@zuzogp.com
          </a>
          <p className="mt-4 text-xs text-muted">&copy; 2026 ZuZo Dialer. All rights reserved.</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Product</p>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-ink/80">
            <li>
              <a href="#capabilities" className="hover:text-accent">
                Capabilities
              </a>
            </li>
            <li>
              <a href="#process" className="hover:text-accent">
                How it works
              </a>
            </li>
            <li>
              <a href="#pricing" className="hover:text-accent">
                Pricing
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Company</p>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-ink/80">
            <li>
              <a href="#faq" className="hover:text-accent">
                FAQ
              </a>
            </li>
            <li>
              <a href="mailto:info@zuzogp.com" className="hover:text-accent">
                Contact
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="overflow-hidden py-8 text-center">
        <p className="select-none font-display text-[13vw] font-bold leading-none tracking-tight text-transparent [-webkit-text-stroke:1.5px_var(--line)] sm:text-[9vw]">
          ZuZo Dialer
        </p>
      </div>
    </footer>
  );
}

// ---------- App ----------

export function App() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <Hero />
      <PainPoints />
      <Capabilities />
      <Process />
      <Stats />
      <Pricing />
      <Showcase />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
