import type { Person } from "./demo-data";

export type Chapter = {
  id: string;
  label: string;
  tone: "violet" | "amber";
  title: string;
  summary: string;
  who: Person;
  storyOf: string;
  tag: string;
  context: string;
  decisionIds: string[];
};

export const CHAPTERS: Chapter[] = [
  {
    id: "c1",
    label: "Chapter 01 · January",
    tone: "violet",
    title: "The beginning",
    summary:
      "Aarav joined and inherited a rough MVP. The team needed a way to take payments fast.",
    who: "Aarav",
    storyOf: "Aarav’s story",
    tag: "Payments",
    context:
      "The first version was built in a hurry. Auth was handed to a managed service so the team could ship payments instead of login screens.",
    decisionIds: ["d03"],
  },
  {
    id: "c2",
    label: "Chapter 02 · March",
    tone: "violet",
    title: "The great gateway debate",
    summary:
      "Razorpay, Stripe and PayU were all on the table. After two weeks of testing, Aarav chose Stripe: better docs, faster onboarding.",
    who: "Aarav",
    storyOf: "Aarav’s story",
    tag: "Payments",
    context:
      "Two weeks of testing compared documentation, onboarding time and international payment support. Stripe won on all three.",
    decisionIds: ["d01"],
  },
  {
    id: "c3",
    label: "Plot twist · June",
    tone: "amber",
    title: "Forty orders. One silent failure.",
    summary:
      "A failed webhook silently dropped 40 orders. The team added retry logic, but monitoring is still missing.",
    who: "Aarav",
    storyOf: "Aarav’s story",
    tag: "Payments",
    context:
      "Nobody noticed for days because failures were not alerted. Retries fixed the symptom. Alerting is the missing piece.",
    decisionIds: ["d02", "d15"],
  },
  {
    id: "c4",
    label: "Cliffhanger · October",
    tone: "violet",
    title: "The unfinished refund flow",
    summary:
      "The refund flow is 70% built and blocked on legal approval. Only Aarav knows where the draft lives.",
    who: "Aarav",
    storyOf: "Aarav’s story",
    tag: "Payments",
    context:
      "The draft sits in the payments repository. Legal approval is pending, so the flow cannot ship yet.",
    decisionIds: ["d23", "d18"],
  },
  {
    id: "c5",
    label: "The next chapter · November",
    tone: "violet",
    title: "Over to you, Priya.",
    summary:
      "Priya steps in. Her first mission: unblock refunds and add webhook monitoring. A new owner. The same shared context.",
    who: "Priya",
    storyOf: "Priya’s next chapter",
    tag: "Payments",
    context:
      "Payments has no backup owner, so this handover is the safety net. Start with the Open work board.",
    decisionIds: ["d22", "d24"],
  },
];

export const WORK_STATUSES = [
  "not_started",
  "in_progress",
  "blocked",
  "done",
] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

export const STATUS_LABELS: Record<WorkStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

export type WorkItem = {
  id: string;
  title: string;
  note: string;
  owner: Person;
  due: string;
  status: WorkStatus;
};

export const WORK_ITEMS: WorkItem[] = [
  {
    id: "w1",
    title: "Add webhook monitoring",
    note: "Retries are live. Add alerts for repeated failures.",
    owner: "Priya",
    due: "Nov 15",
    status: "not_started",
  },
  {
    id: "w2",
    title: "Update API documentation",
    note: "Document the new refund endpoints.",
    owner: "Kabir",
    due: "Nov 18",
    status: "not_started",
  },
  {
    id: "w3",
    title: "Review access permissions",
    note: "Revoke unused production credentials.",
    owner: "Priya",
    due: "Nov 16",
    status: "not_started",
  },
  {
    id: "w4",
    title: "Review billing migration",
    note: "Backfill tested in staging. Production rollout still needs review.",
    owner: "Meera",
    due: "Nov 12",
    status: "in_progress",
  },
  {
    id: "w5",
    title: "Write payment runbook",
    note: "Outline ready; add incident replay commands.",
    owner: "Aarav",
    due: "Nov 13",
    status: "in_progress",
  },
  {
    id: "w6",
    title: "Finish refund flow",
    note: "70% built. Draft is in the payments repository; legal approval is pending.",
    owner: "Aarav",
    due: "Nov 14",
    status: "blocked",
  },
  {
    id: "w7",
    title: "Resolve legal approval",
    note: "Waiting for updated refund policy.",
    owner: "Zoya",
    due: "Nov 12",
    status: "blocked",
  },
  {
    id: "w8",
    title: "Test subscription renewal",
    note: "All renewal test cases pass.",
    owner: "Dev",
    due: "Nov 08",
    status: "done",
  },
  {
    id: "w9",
    title: "Transfer support context",
    note: "Top customer issues documented.",
    owner: "Zoya",
    due: "Nov 09",
    status: "done",
  },
];

export type Area = {
  id: string;
  area: string;
  owner: Person;
  backup: Person | null;
  topics: string[];
};

export const OWNERSHIP: Area[] = [
  {
    id: "o1",
    area: "Payments",
    owner: "Aarav",
    backup: null,
    topics: ["Billing", "Stripe", "Webhooks"],
  },
  {
    id: "o2",
    area: "Infrastructure",
    owner: "Meera",
    backup: "Kabir",
    topics: ["Deployments", "Database"],
  },
  {
    id: "o3",
    area: "API & Security",
    owner: "Kabir",
    backup: "Meera",
    topics: ["Authentication", "Audit logs"],
  },
  {
    id: "o4",
    area: "Customer success",
    owner: "Zoya",
    backup: "Dev",
    topics: ["Clients", "Support"],
  },
  {
    id: "o5",
    area: "Quality assurance",
    owner: "Dev",
    backup: "Zoya",
    topics: ["Testing", "Releases"],
  },
  {
    id: "o6",
    area: "Product engineering",
    owner: "Priya",
    backup: "Meera",
    topics: ["Refunds", "Onboarding"],
  },
];
