Browser (EJS pages + plain CSS)
        │  HTTPS
        ▼
Express server (Render)
  ├─ helmet, rate-limit, session (connect-pg-simple)
  ├─ Passport: local (bcrypt) + Google OAuth
  ├─ middleware/auth.js  → requireAuth, requireRole
  ├─ routes/  → auth, pages, import, claims, handover, admin
  └─ lib/     → permissions → screen → extract → audit
        │                         │
        ▼                         ▼
PostgreSQL (Neon)          Gemini API (server-side key only)