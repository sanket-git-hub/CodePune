# Demo Guide for ByeByeBrain (Baton)

This guide walks you through using the **demo accounts** and testing the key UI features (Gap Finder and Day 1/7/30 onboarding plan).

## 1. Demo Login Credentials

| Role      | Email                         | Password (default) |
|-----------|------------------------------|--------------------|
| Admin     | `admin@demo.byebyebrain.test`| `ADMIN_PASSWORD` (set in `.env.local`) |
| Reviewer  | `reviewer@demo.byebyebrain.test`| `DEMO_PASSWORD` |
| Leaver    | `leaver@demo.byebyebrain.test`| `DEMO_PASSWORD` |
| Incoming  | `incoming@demo.byebyebrain.test`| `DEMO_PASSWORD` |
| Outsider  | `outsider@demo.byebyebrain.test`| `DEMO_PASSWORD` |

> **Tip:** The passwords are the values you placed in the `.env.local` file under `DEMO_PASSWORD` and `ADMIN_PASSWORD`.

## 2. Starting the Development Server

```bash
npm install          # install dependencies (run once)
npm run dev          # start Next.js dev server on http://localhost:3000
```

Visit the URL in a browser and click **Login → Demo**. Choose the role you want to test.

## 3. Using the Gap Finder

1. After logging in, navigate to a project (e.g., **Campus Pay**).
2. Open **Knowledge Gaps** via the left‑hand menu or URL `/projects/[id]/gaps`.
3. Click **Run Gap Finder**. The system will scan claims, tasks, and sources and display any gaps.
4. As a **Leaver** or **Admin**, you can answer gap questions directly in the UI; reviewers can ignore or resolve gaps.

## 4. Day 1 / 7 / 30 Onboarding Plan

1. Open the **Onboarding Plan** page: `/projects/[id]/plan`.
2. Click **Generate My Onboarding Plan** (visible for **Incoming** and **Admin** roles).
3. The UI shows a roadmap with milestones for Day 1, Day 7, and Day 30, plus a readiness gauge (0‑100 %).
4. Complete checklist items or answer comprehension quizzes to see the gauge update.

## 5. Verifying Email Invitations (Admin Only)

- In the Admin panel (`/projects/[id]/admin`), click **Connect Gmail** and follow the OAuth flow.
- Use **Send Test Email** to confirm the Gmail API integration works.

## 6. Next Steps after Demo

- To create a new project, use the **Create Project** button; the creator is automatically assigned the **admin** role.
- Admins can invite additional admins via the **Invite Members** UI.
- Import PDFs is currently a placeholder – see the roadmap for future implementation.

---

*This guide is maintained in `README_demo_guide.md`. Merge it into the main `README.md` when you are ready to ship the final documentation.*
