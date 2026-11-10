# ByeByeBrain — Round 2 build
Purpose: evidence-led, permission-aware knowledge handover. Imported sources become a
Claim Ledger; a human approves; the incoming person sees only approved claims they may read.

Stack: Next.js (App Router, the version in package.json — check it before writing code),
TypeScript, Tailwind, Auth.js (next-auth@beta) with Credentials (bcryptjs) + Google,
Neon PostgreSQL via pg, Gemini API via fetch (server only), zod for validation.
No Express, no EJS, no Prisma. Deploy on Vercel.

Roles: admin, reviewer, leaver, incoming, outsider.
Access tags: public, eng, hr, finance.
Clearance: admin=all; reviewer/leaver/incoming=public+eng; outsider=public only.

Rules (never break):
1. Secrets/emails/phones masked BEFORE any AI call (lib/screen.ts).
2. Permission filter in SQL (access_tag = ANY($1)) BEFORE content reaches the AI or a page.
3. Claim access_tag = its source chunk's tag.
4. Integrity: claim.excerpt must be an exact substring of its chunk, else integrity_ok=false.
5. 'verified' only when a human approves AND integrity_ok=true. AI may only propose
   'inferred' or 'missing'.
6. Incoming/outsider see a handover only when handovers.status='approved'.
7. Every import/edit/approve/share/acknowledge writes audit_log.
8. If Gemini fails, show an error. Demo claims must carry a "Demo data" badge.
9. Secrets only in env vars, never in client components. Parameterized SQL only.
10. Every page and API route requires login except /, /login, /register.
11. Check the session and role INSIDE every route handler and server action,
    not only in middleware.
Tables: see schema.sql. Demo project: "Campus Pay", Riya (leaver) -> Arjun (incoming).