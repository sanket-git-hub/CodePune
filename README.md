# ByeByeBrain (Baton)

**Keep the knowledge. Pass the project.**

ByeByeBrain (Baton) ensures teams transition projects seamlessly when an engineer departs. It captures architectural decisions, open tasks, cross-system dependencies, ownership maps, and risks in one centralized workspace. Sensitive sources (HR, finance) remain strictly partitioned by role-based clearance.

Live Demo: https://byebyebrain.vercel.app

> The demo includes synthetic data for a fictional project called **Campus Pay**. Do not store real production secrets or personal credentials in it.

---

## Key Features

- **Automated Knowledge Gap Finder (`/projects/[id]/gaps`):** Scans captured claims for ungrounded decisions (missing rationale keywords), orphaned tasks lacking owners, and single-contributor sources. Features an interactive Leaver Question Flow to resolve gaps directly into verifiable claims.
- **Conflict & Stale-Work Finder (`/projects/[id]/conflicts`):** Detects contradictory technical decisions via deterministic rule checks and batched Gemini verification, and highlights stale in-progress items with no activity for >14 days.
- **Day 1 / 7 / 30 Onboarding Roadmap & Readiness (`/projects/[id]/plan`):** Synthesizes approved claims into a structured 3-stage milestone trajectory with interactive comprehension quiz checks that calculate live successor readiness scores (0–100%).
- **Direct Gmail API Invitation Dispatch:** Automatically delivers team invitation emails from your personal or Google Workspace account via the official `googleapis` OAuth 2.0 client—no domain verification or 3rd-party sandbox restrictions required.
- **PDF Handover Packet Export (`/api/handover/export`):** Generates standalone, formatted handover packages for offline review and archival.
- **Pre-Storage Data Screening (`lib/screen.ts`):** Automatically masks API keys, bearer tokens, private keys, passwords, phone numbers, and emails before persistence or AI ingestion.
- **Granular RBAC with SQL Clearance Enforcement:** SQL-level access filters ensure lower-clearance users can never view restricted claims or excerpts.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19 & Turbopack
- **Language:** TypeScript 5 with strict typing
- **Styling:** Tailwind CSS 4 with custom glassmorphism design system
- **Authentication:** Auth.js (`next-auth` v5) — Credentials & Google OAuth
- **Database:** PostgreSQL on Neon, connected via parameterised SQL with `pg`
- **Email Service:** Gmail API via official `googleapis` (OAuth 2.0 with AES-256-GCM encrypted refresh tokens)
- **AI Synthesis:** Google Gemini Flash (`gemini-3.8-flash`) for claim analysis and contradiction checks
- **Deployment:** Vercel

---

## Roles and Access Clearance

| Role | Permitted Access Tags | Primary Responsibilities |
| --- | --- | --- |
| **admin** | `public`, `eng`, `hr`, `finance` | Workspace administration, Gmail API linking, member invitations, and dispute resolution. |
| **reviewer** | `public`, `eng` | Reviews extracted claims, resolves technical contradictions, and approves handovers. |
| **leaver** | `public`, `eng` | Authors sources, answers gap discovery questions, and hands over technical ownership. |
| **incoming** | `public`, `eng` | Reads approved handovers, checks off Day 1/7/30 milestones, and takes comprehension checks. |
| **outsider** | `public` | High-level status overview only; sensitive context is completely redacted. |

---

## Getting Started

### 1. Prerequisites

- Node.js 20 or newer
- Neon PostgreSQL database instance
- Google Cloud Console Project (with OAuth 2.0 Client credentials)

### 2. Installation

```bash
git clone https://github.com/<your-username>/byebyebrain.git
cd byebyebrain
npm install
```

### 3. Environment Variables

Create `.env.local` in the project root:

```env
# Database
DATABASE_URL=postgresql://<user>:<password>@<neon-host>/neondb?sslmode=verify-full

# Auth.js Configuration
AUTH_SECRET=your_32_byte_secret_here
AUTH_GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
AUTH_URL=http://localhost:3000

# Gmail API Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/email/google/callback
GMAIL_SENDER_EMAIL=your-gmail-address@gmail.com
GOOGLE_REFRESH_TOKEN=

# Gemini AI Engine
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.8-flash

# Demo Configuration
ENABLE_DEMO_LOGIN=true
DEMO_PASSWORD=your_demo_password
ADMIN_PASSWORD=your_admin_password
```

### 4. Database Setup & Migrations

The database tables can be initialized in the Neon SQL editor using `schema.sql`. The incremental migrations in `migrations/` provide newer features:

- `001_project_invitations.sql`: Member invitations with 7-day cryptographically secure hashes.
- `002_onboarding_plans.sql`: Onboarding roadmap, checklist progress, and readiness scoring.
- `003_knowledge_gaps.sql`: Knowledge gap detection and leaver resolution answers.
- `004_claim_conflicts.sql`: Contradiction and stale item tracking.
- `005_system_settings.sql`: Encrypted storage (`AES-256-GCM`) for OAuth refresh tokens.

### 5. Seed Demo Data

```bash
npm run seed
```

This provisions sample users (`Riya`, `Arjun`, `Karan`, `Admin`), the **Campus Pay** project, and verified engineering, public, HR, and finance claims with secrets safely masked.

### 6. Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Gmail API One-Time Authorization

To send project invitations directly from your Gmail address without 3rd-party sandbox restrictions:

1. In [Google Cloud Console → APIs & Services → Library](https://console.cloud.google.com/apis/library), enable the **Gmail API**.
2. In **OAuth Consent Screen → Scopes**, add:
   `https://www.googleapis.com/auth/gmail.send`
3. Under **Credentials → OAuth 2.0 Client IDs**, add your Authorized redirect URIs:
   - `http://localhost:3000/api/email/google/callback` (Local Development)
   - `https://byebyebrain.vercel.app/api/email/google/callback` (Production)
4. In your project admin panel (`/projects/[id]/admin`), click **Connect Gmail**.
5. Once consented, the status changes to **Gmail Connected**. Use **Send Test Email** to verify instant inbox delivery.

---

## API Routes Reference

### Email & Invitations
| Endpoint | Method | Clearance | Description |
| --- | --- | --- | --- |
| `/api/email/google/connect` | `GET` | Authenticated | Begins Google OAuth authorization with CSRF state protection. |
| `/api/email/google/callback` | `GET` | Authenticated | Exchanges auth code for refresh token, encrypts token into Neon, and logs audit trail. |
| `/api/email/google/status` | `GET` | Authenticated | Checks live Gmail connection status, sender address, and token validity. |
| `/api/email/google/test` | `POST` | Authenticated | Dispatches an instant verification test email to the user. |
| `/api/email/google/disconnect` | `POST` | Authenticated | Revokes and deletes stored Gmail credentials from the database. |
| `/api/invitations/send` | `POST` | Admin | Rate-limited (15/min) invitation dispatcher using Gmail API. |

### Knowledge Gaps & Questions
| Endpoint | Method | Clearance | Description |
| --- | --- | --- | --- |
| `/api/projects/[id]/gaps/detect` | `POST` | Reviewer, Admin, Leaver | Executes deterministic gap detection across decisions, tasks, and sources. |
| `/api/projects/[id]/gaps` | `GET` | Authenticated | Lists open, resolved, and ignored continuity gaps. |
| `/api/projects/[id]/gaps/[gapId]/answer` | `POST` | Leaver, Admin | Submits leaver answer (10–2000 chars), masks PII, and generates a new draft claim. |
| `/api/projects/[id]/gaps/[gapId]/ignore` | `POST` | Reviewer, Admin | Dismisses or ignores an identified gap. |

### Conflicts & Stale Work
| Endpoint | Method | Clearance | Description |
| --- | --- | --- | --- |
| `/api/projects/[id]/conflicts/detect` | `POST` | Reviewer, Admin | Runs rule + Gemini analysis on conflicting decision pairs and flags stale items (>14 days). |
| `/api/projects/[id]/conflicts` | `GET` | Authenticated | Lists detected conflicts filtered strictly by the user's access clearance. |
| `/api/projects/[id]/conflicts/[cid]/resolve` | `POST` | Reviewer, Admin | Resolves conflict (`keep_a`, `keep_b`, `both_valid`, `dismiss`) with claim version tracking. |

### Onboarding Plan & Readiness
| Endpoint | Method | Clearance | Description |
| --- | --- | --- | --- |
| `/api/projects/[id]/plan` | `GET` | Authenticated | Retrieves Day 1/7/30 milestones, checklist state, and comprehension checks. |
| `/api/projects/[id]/plan` | `POST` | Incoming, Admin | Synthesizes approved claims into Day 1/7/30 roadmap via Gemini (or fallback rules). |
| `/api/projects/[id]/plan` | `PATCH` | Incoming, Admin | Toggles milestone completion or locks in a comprehension check answer. |
| `/api/projects/[id]/readiness` | `GET` | Reviewer, Admin | Dashboard of successor readiness scores across project members. |
| `/api/handover/export` | `GET` | Authenticated | Generates and exports the complete handover packet as a PDF document. |

---

## Security Architecture

1. **Pre-Storage Screening:** `lib/screen.ts` strips sensitive tokens, private keys, and passwords before anything touches Neon or Gemini.
2. **Encrypted Token Vault:** Gmail OAuth refresh tokens are encrypted at rest with `AES-256-GCM` using derived keys from `AUTH_SECRET`.
3. **Parameterised SQL Exclusively:** All database interactions use parameterised queries with `pg` to eliminate SQL injection vulnerabilities.
4. **Row-Level Security via Clearance:** Query clauses restrict data access using `access_tag = ANY($clearance)` computed dynamically from the user's role.
5. **Client-Safe Bundling:** Heavy server packages (`googleapis`, `crypto`, `child_process`) are strictly isolated to server components and API routes.

---

## Scripts

| Command | Action |
| --- | --- |
| `npm run dev` | Starts Next.js development server with Turbopack |
| `npm run build` | Compiles and builds production assets |
| `npm start` | Runs the production build |
| `npm run seed` | Seeds demo accounts, projects, and masked sample data |
| `npm run test:gaps` | Runs the automated gap detection suite |
| `npm run test:conflicts` | Runs the automated contradiction and stale detection test suite |

## Demo Guide

This guide walks you through using the **demo accounts** and testing the key UI features (Gap Finder and Day 1/7/30 onboarding plan).

### 1. Demo Login Credentials

| Role      | Email                         | Password (default) |
|-----------|------------------------------|--------------------|
| Admin     | `admin@demo.byebyebrain.test`| `ADMIN_PASSWORD` (set in `.env.local`) |
| Reviewer  | `reviewer@demo.byebyebrain.test`| `DEMO_PASSWORD` |
| Leaver    | `leaver@demo.byebyebrain.test`| `DEMO_PASSWORD` |
| Incoming  | `incoming@demo.byebyebrain.test`| `DEMO_PASSWORD` |
| Outsider  | `outsider@demo.byebyebrain.test`| `DEMO_PASSWORD` |

> **Tip:** The passwords are the values you placed in the `.env.local` file under `DEMO_PASSWORD` and `ADMIN_PASSWORD`.

### 2. Starting the Development Server

```bash
npm install          # install dependencies (run once)
npm run dev          # start Next.js dev server on http://localhost:3000
```

Visit the URL in a browser and click **Login → Demo**. Choose the role you want to test.

### 3. Using the Gap Finder

1. After logging in, navigate to a project (e.g., **Campus Pay**).
2. Open **Knowledge Gaps** via the left‑hand menu or URL `/projects/[id]/gaps`.
3. Click **Run Gap Finder**. The system will scan claims, tasks, and sources and display any gaps.
4. As a **Leaver** or **Admin**, you can answer gap questions directly in the UI; reviewers can ignore or resolve gaps.

### 4. Day 1 / 7 / 30 Onboarding Plan

1. Open the **Onboarding Plan** page: `/projects/[id]/plan`.
2. Click **Generate My Onboarding Plan** (visible for **Incoming** and **Admin** roles).
3. The UI shows a roadmap with milestones for Day 1, Day 7, and Day 30, plus a readiness gauge (0‑100 %).
4. Complete checklist items or answer comprehension quizzes to see the gauge update.

### 5. Verifying Email Invitations (Admin Only)

- In the Admin panel (`/projects/[id]/admin`), click **Connect Gmail** and follow the OAuth flow.
- Use **Send Test Email** to confirm the Gmail API integration works.

### 6. Next Steps after Demo

- To create a new project, use the **Create Project** button; the creator is automatically assigned the **admin** role.
- Admins can invite additional admins via the **Invite Members** UI.
- Import PDFs is currently a placeholder – see the roadmap for future implementation.
