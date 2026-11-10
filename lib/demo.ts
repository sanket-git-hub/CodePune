// Demo accounts. Admin is intentionally NOT here.
export const DEMO_ACCOUNTS = {
  reviewer: {
    name: "Demo Reviewer",
    email: "reviewer@demo.byebyebrain.test",
    role: "reviewer",
  },
  incoming: {
    name: "Arjun (Demo Incoming)",
    email: "arjun@demo.byebyebrain.test",
    role: "incoming",
  },
  outsider: {
    name: "Demo Outsider",
    email: "outsider@demo.byebyebrain.test",
    role: "outsider",
  },
} as const;

export type DemoKey = keyof typeof DEMO_ACCOUNTS;
