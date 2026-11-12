# ByeByeBrain

**Keep the knowledge. Pass the project.**

ByeByeBrain helps a team hand a project over when someone leaves. It collects decisions, open work, owners and risks in one place, so the person taking over gets the context without a scavenger hunt. Access is controlled by role, so sensitive sources (HR, finance) stay hidden from people who shouldn't see them.

Live demo: https://byebyebrain.vercel.app

> The demo uses synthetic data for a fictional project called Campus Pay. Do not store real secrets or personal data in it.

## Features

Working now:

- Sign in with email and password, Google, or one-click demo accounts
- Role-based access: admin, reviewer, leaver, incoming, outsider
- Dashboard, Quick Capture, Decisions, The story so far, Open work, Ownership map
- Risk register, Handover brief (four-step flow) and Ask Baton (keyword-matched answers from captured data, no AI call)
- Secret and personal-data masking (`lib/screen.ts`) that runs before anything is saved
- Permission filters written in SQL (`lib/permissions.ts`) and an audit log helper

Planned:

- Import of text, JSON and CSV sources
- Claim extraction with Gemini, with exact-excerpt integrity checks
- Review screen with evidence viewer, approve and reject
- Handover approval, acknowledgement and shared-token page
- Leak test page that checks each role cannot see restricted data

## Tech stack

- Next.js 15 (App Router) and React 19
- TypeScript and Tailwind CSS 4
- Auth.js (`next-auth` v5): credentials and Google
- PostgreSQL on Neon, accessed with `pg`
- Gemini API for extraction (server-side key only)
- Hosted on Vercel

## Roles and access

| Role | Can read | Notes |
| --- | --- | --- |
| admin | public, eng, hr, finance | Full access |
| reviewer | public, eng | Reviews and approves claims |
| leaver | public, eng | Edits own claims |
| incoming | public, eng | Reads the approved handover |
| outsider | public | Status-level information only |

New accounts are created as `incoming`. Promote a user in the Neon SQL editor:

```sql
UPDATE users SET role = 'reviewer' WHERE email = 'person@example.com';
```

## Getting started

### Prerequisites

- Node.js 20 or newer
- A Neon Postgres database
- A Google OAuth client (only for Google sign-in)

### 1. Install

```bash
git clone https://github.com/<your-username>/byebyebrain.git
cd byebyebrain
npm install
```

### 2. Environment variables

Create `.env.local` in the project root (see `.env.example`):

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Neon connection string |
| `AUTH_SECRET` | Random secret, generate with `npx auth secret` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `GEMINI_API_KEY` | Gemini API key from Google AI Studio |
| `GEMINI_MODEL` | Gemini model id from AI Studio |
| `ENABLE_DEMO_LOGIN` | `true` shows the demo account buttons |
| `DEMO_PASSWORD` | Password for the seeded demo accounts |
| `ADMIN_PASSWORD` | Password for the seeded admin account |

Never commit `.env.local`. It is listed in `.gitignore`.

### 3. Create the database tables

Open the Neon SQL editor, paste the contents of `schema.sql` and run it. It is safe to run more than once.

### 4. Seed demo data

```bash
npm run seed
```

This creates the demo users, the Campus Pay project and five sample sources (public, engineering, HR and finance). Fake secrets in the samples are masked before they are saved.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run seed` | Seed demo users and sources |

## Google sign-in setup

In Google Cloud Console, create an OAuth client of type **Web application** and add:

- Authorized JavaScript origins: `http://localhost:3000` and your production URL
- Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://<your-domain>/api/auth/callback/google`

Set the consent screen to **In production** so anyone can sign in. Until the app is verified, Google shows an "unverified app" warning on first sign-in.

## Deploying to Vercel

1. Push the repository to GitHub.
2. In Vercel, choose **Add New, Project**, import the repository and keep the Next.js defaults.
3. Add the environment variables above under **Settings, Environment Variables**.
4. Deploy. Redeploy after any variable change.

The same Neon database serves local and production, so no extra database step is needed.

## Project structure

```
app/                 Pages, server actions and routes (App Router)
  login/, register/  Authentication pages
  dashboard/, capture/, decisions/, story/, work/, ownership/
  risks/, brief/, ask/
components/          Shared UI (app shell, sidebar, avatar, page header)
lib/                 Database, sessions, permissions, screening, audit, demo data
types/               Auth.js type extensions
auth.ts              Auth.js configuration
auth.config.ts       Edge-safe auth rules used by middleware
middleware.ts        Redirects signed-out visitors to /login
schema.sql           Database schema
seed.ts              Demo data seeding
```

## Security notes

- Secrets and personal data are masked before storage and before any AI call.
- Access filtering happens in SQL, not in the page code.
- The Gemini key is only used on the server.
- Passwords are hashed with bcrypt, and unknown roles fall back to the lowest clearance.
- Turn `ENABLE_DEMO_LOGIN` off once real data is stored.
- Regex masking is a safety net, not a guarantee. Review sources before importing them.

## License

Add a license of your choice (for example MIT) before sharing the code publicly.