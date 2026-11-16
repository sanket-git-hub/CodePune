// Demo accounts for instant 1-click evaluation
export const DEMO_ACCOUNTS = {
  admin: {
    name: "Admin",
    email: "admin@demo.byebyebrain.test",
    role: "admin",
  },
  reviewer: {
    name: "Demo Reviewer",
    email: "reviewer@demo.byebyebrain.test",
    role: "reviewer",
  },
  leaver: {
    name: "Riya (Leaver)",
    email: "riya@demo.byebyebrain.test",
    role: "leaver",
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
