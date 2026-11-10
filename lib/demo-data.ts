// Demo data only. Every page that shows it carries a "Demo data" badge (rule 8).
export type Person = "Aarav" | "Priya" | "Meera" | "Kabir" | "Zoya" | "Dev";

export const PEOPLE: Record<Person, { color: string }> = {
  Aarav: { color: "#4A3F7A" },
  Priya: { color: "#2F7D6B" },
  Meera: { color: "#7A5648" },
  Kabir: { color: "#3E5C99" },
  Zoya: { color: "#8A5A7A" },
  Dev: { color: "#6B7A45" },
};

export const HANDOVER = { from: "Aarav", to: "Priya" } as const;

export const STATS = [
  {
    label: "Decisions",
    value: 24,
    note: "The why, preserved",
    icon: "decisions",
  },
  { label: "Work items", value: 9, note: "Clear next steps", icon: "work" },
  { label: "Risks", value: 5, note: "2 high priority", icon: "risks" },
  { label: "Owners", value: 6, note: "People behind the work", icon: "owners" },
] as const;

export const READINESS = { percent: 72, done: 18, total: 25 };

export const NEEDS_ATTENTION: {
  text: string;
  tone: "warn" | "danger";
  href?: string;
}[] = [
  {
    text: "Review decisions with missing context",
    tone: "warn",
    href: "/decisions",
  },
  { text: "2 tasks are blocked", tone: "warn" },
  { text: "Payments has no backup owner", tone: "danger" },
];

export const ACTIVITY = [
  {
    who: "Aarav",
    what: "Captured the payment gateway decision",
    when: "2 hours ago",
  },
  { who: "Priya", what: "Joined the next chapter", when: "4 hours ago" },
  { who: "Meera", what: "Updated the billing migration", when: "Yesterday" },
];

export type Decision = {
  id: string;
  tag: string;
  date: string;
  title: string;
  by: Person;
  why: string;
  rejected: string;
};

export const DECISIONS: Decision[] = [
  {
    id: "d01",
    tag: "Payments",
    date: "Mar 12, 2026",
    title: "Choose Stripe for payments",
    by: "Aarav",
    why: "Better documentation, faster onboarding, and reliable international payments.",
    rejected: "Razorpay: settlement delays. PayU: integration complexity.",
  },
  {
    id: "d02",
    tag: "Reliability",
    date: "Jun 18, 2026",
    title: "Retry failed webhooks",
    by: "Aarav",
    why: "A failed webhook dropped 40 orders. Retry with exponential backoff.",
    rejected: "Manual replay: too much operational overhead.",
  },
  {
    id: "d03",
    tag: "Security",
    date: "Jan 24, 2026",
    title: "Use Supabase for authentication",
    by: "Meera",
    why: "Managed auth lets the team focus on the product.",
    rejected: "Custom auth: ongoing security burden.",
  },
  {
    id: "d04",
    tag: "Billing",
    date: "Apr 08, 2026",
    title: "Ship usage-based billing",
    by: "Aarav",
    why: "Customers asked to pay for what they use, and it lowers the barrier to start.",
    rejected: "Flat tiers only: poor fit for heavy and light users.",
  },
  {
    id: "d05",
    tag: "Security",
    date: "May 16, 2026",
    title: "Keep audit logs for 90 days",
    by: "Kabir",
    why: "Covers most incident investigations without large storage costs.",
    rejected: "30 days: too short for quarterly reviews. 1 year: storage cost.",
  },
  {
    id: "d06",
    tag: "Billing",
    date: "Mar 20, 2026",
    title: "Use feature flags for billing rollout",
    by: "Meera",
    why: "Lets us roll billing out to a few accounts first and switch it off fast.",
    rejected: "Big-bang release: too risky for revenue.",
  },
  {
    id: "d07",
    tag: "Billing",
    date: "Apr 13, 2026",
    title: "Archive the legacy invoice worker",
    by: "Aarav",
    why: "The new pipeline covers every invoice type, and the old worker was a maintenance burden.",
    rejected: "Run both in parallel: risk of duplicate invoices.",
  },
  {
    id: "d08",
    tag: "Platform",
    date: "Apr 23, 2026",
    title: "Cache subscription plan metadata",
    by: "Meera",
    why: "Plan data rarely changes, and caching cut page load time.",
    rejected: "Query on every request: unnecessary database load.",
  },
  {
    id: "d09",
    tag: "Infrastructure",
    date: "May 02, 2026",
    title: "Move deployments to a staged pipeline",
    by: "Meera",
    why: "Staging first catches migration problems before production.",
    rejected: "Direct deploys: no safety net.",
  },
  {
    id: "d10",
    tag: "Platform",
    date: "Jul 02, 2026",
    title: "Move email delivery to Resend",
    by: "Zoya",
    why: "Simpler API and better delivery visibility.",
    rejected:
      "Old provider: limited logs. Self-hosted SMTP: deliverability risk.",
  },
  {
    id: "d11",
    tag: "Platform",
    date: "Jan 28, 2026",
    title: "Adopt TypeScript across the frontend",
    by: "Priya",
    why: "Catches mistakes early and makes handovers easier to read.",
    rejected: "Stay on JavaScript: faster at first, costly later.",
  },
  {
    id: "d12",
    tag: "Security",
    date: "Feb 06, 2026",
    title: "Use Postgres row-level security",
    by: "Kabir",
    why: "Enforces access rules in the database, not only in app code.",
    rejected: "App-level checks only: one missed check leaks data.",
  },
  {
    id: "d13",
    tag: "API",
    date: "Feb 19, 2026",
    title: "Standardize API error responses",
    by: "Kabir",
    why: "One shape for errors makes the client and the docs simpler.",
    rejected: "Per-endpoint formats: inconsistent and hard to document.",
  },
  {
    id: "d14",
    tag: "Reliability",
    date: "May 24, 2026",
    title: "Add request identifiers to logs",
    by: "Kabir",
    why: "Lets us trace one request across services when debugging.",
    rejected: "Timestamp matching: slow and unreliable.",
  },
  {
    id: "d15",
    tag: "Payments",
    date: "Jun 03, 2026",
    title: "Keep payment events immutable",
    by: "Aarav",
    why: "Gives a trustworthy audit trail for refunds and disputes.",
    rejected: "Editable records: history can be lost.",
  },
  {
    id: "d16",
    tag: "Operations",
    date: "Jun 27, 2026",
    title: "Document incident follow-ups",
    by: "Dev",
    why: "Follow-ups were forgotten after incidents, so failures repeated.",
    rejected: "Verbal handoff only: nothing is recorded.",
  },
  {
    id: "d17",
    tag: "Customer success",
    date: "Jul 14, 2026",
    title: "Use staged customer onboarding",
    by: "Zoya",
    why: "Smaller steps reduce drop-off in the first week.",
    rejected: "One long setup form: high abandonment.",
  },
  {
    id: "d18",
    tag: "Payments",
    date: "Jul 29, 2026",
    title: "Introduce refund approval limits",
    by: "Aarav",
    why: "Large refunds need a second person to cut fraud and mistakes.",
    rejected: "No limits: too risky. Manual approval for all: too slow.",
  },
  {
    id: "d19",
    tag: "Quality",
    date: "Aug 07, 2026",
    title: "Make release checks explicit",
    by: "Dev",
    why: "A written checklist stops steps from being skipped under pressure.",
    rejected: "Rely on memory: steps get missed.",
  },
  {
    id: "d20",
    tag: "Support",
    date: "Aug 21, 2026",
    title: "Route billing support to Zoya",
    by: "Zoya",
    why: "One owner gives faster answers and keeps billing context in one place.",
    rejected: "Shared inbox: unclear ownership.",
  },
  {
    id: "d21",
    tag: "Infrastructure",
    date: "Sep 05, 2026",
    title: "Pin the production runbook",
    by: "Meera",
    why: "The on-call person needs one trusted place to look during an incident.",
    rejected: "Scattered docs: hard to find under pressure.",
  },
  {
    id: "d22",
    tag: "Ownership",
    date: "Oct 10, 2026",
    title: "Transfer payment context to Priya",
    by: "Aarav",
    why: "Priya takes over payments next, and Aarav is the only person who knows the details.",
    rejected: "Handover on the last day: too late and too rushed.",
  },
  {
    id: "d23",
    tag: "Payments",
    date: "Oct 16, 2026",
    title: "Record the refund draft location",
    by: "Aarav",
    why: "The refund flow is 70% built, and only Aarav knows where the draft lives.",
    rejected: "Leave it in a personal branch: easy to lose.",
  },
  {
    id: "d24",
    tag: "Reliability",
    date: "Oct 23, 2026",
    title: "Set the webhook alert threshold",
    by: "Meera",
    why: "Alert after repeated failures so the team hears about problems before customers do.",
    rejected: "Alert on every failure: too noisy.",
  },
];

export const SAMPLE_NOTES = `We went with Stripe for the better docs. Aarav owns payments.
Refunds are blocked on legal. Don’t forget the webhook monitoring.
Payments has no backup owner, so Priya should shadow Aarav this week.
We decided to keep audit logs for 90 days.`;

export const LAST_DAY_PROMPTS = [
  "What would break if I disappeared tomorrow?",
  "Who should people ask about each area?",
  "What am I in the middle of, and where did I leave it?",
  "What do I know that is not written down anywhere?",
  "Which decision would confuse a newcomer?",
];
