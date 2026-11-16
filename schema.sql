-- ==============================================================================
-- BATON AI — COMPLETE PRODUCTION DATABASE SCHEMA FOR NEON POSTGRESQL
-- Safe, idempotent script. You can run this directly in the Neon SQL Editor.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role          TEXT NOT NULL DEFAULT 'incoming'
                CHECK (role IN ('admin','reviewer','leaver','incoming','outsider')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

-- 4. PROJECT MEMBERS (RBAC & Multi-tenant membership)
CREATE TABLE IF NOT EXISTS project_members (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('admin','reviewer','leaver','incoming','outsider')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- 5. SECURE PROJECT INVITATIONS
CREATE TABLE IF NOT EXISTS project_invitations (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id    BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invited_by    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_role  TEXT NOT NULL CHECK (invited_role IN ('reviewer','leaver','incoming','outsider')),
  token_hash    TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at    TIMESTAMPTZ NOT NULL,
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. JOIN REQUESTS & PROJECT MESSAGES
CREATE TABLE IF NOT EXISTS join_requests (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by BIGINT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_messages (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. KNOWLEDGE SOURCES & TEXT CHUNKS
CREATE TABLE IF NOT EXISTS sources (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'text',
  access_tag TEXT NOT NULL CHECK (access_tag IN ('public','eng','hr','finance')),
  redactions INT  NOT NULL DEFAULT 0,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, title)
);

CREATE TABLE IF NOT EXISTS chunks (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id  BIGINT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  position   INT    NOT NULL,
  content    TEXT   NOT NULL,
  access_tag TEXT   NOT NULL CHECK (access_tag IN ('public','eng','hr','finance')),
  UNIQUE (source_id, position)
);

-- 8. VECTOR DOCUMENT CHUNKS (FOR RAG & SEMANTIC SEARCH)
CREATE TABLE IF NOT EXISTS document_chunks (
  id          BIGSERIAL PRIMARY KEY,
  project_id  BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  source_id   BIGINT REFERENCES sources(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   VECTOR(768),
  redacted    BOOLEAN DEFAULT false,
  sha256      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. CLAIMS (AI-EXTRACTED FACTS) & VERSIONS
CREATE TABLE IF NOT EXISTS claims (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id      BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id       BIGINT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  chunk_id        BIGINT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN
                  ('decision','question','owner','risk','dependency','blocker','next_action')),
  statement       TEXT NOT NULL,
  excerpt         TEXT NOT NULL,
  access_tag      TEXT NOT NULL CHECK (access_tag IN ('public','eng','hr','finance')),
  evidence_status TEXT NOT NULL DEFAULT 'inferred'
                  CHECK (evidence_status IN ('inferred','missing','verified')),
  review_state    TEXT NOT NULL DEFAULT 'draft'
                  CHECK (review_state IN ('draft','approved','rejected')),
  integrity_ok    BOOLEAN NOT NULL DEFAULT false,
  is_demo         BOOLEAN NOT NULL DEFAULT false,
  version         INT NOT NULL DEFAULT 1,
  created_by      BIGINT REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT verified_needs_integrity CHECK (evidence_status <> 'verified' OR integrity_ok)
);

CREATE TABLE IF NOT EXISTS claim_versions (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  claim_id        BIGINT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  version         INT NOT NULL,
  statement       TEXT NOT NULL,
  excerpt         TEXT NOT NULL,
  review_state    TEXT NOT NULL,
  evidence_status TEXT NOT NULL,
  changed_by      BIGINT REFERENCES users(id),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. HANDOVERS & ACKNOWLEDGEMENTS
CREATE TABLE IF NOT EXISTS handovers (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  leaver_id   BIGINT REFERENCES users(id),
  incoming_id BIGINT REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved')),
  share_token TEXT UNIQUE,
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acknowledgements (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  handover_id     BIGINT NOT NULL REFERENCES handovers(id) ON DELETE CASCADE,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (handover_id, user_id)
);

CREATE TABLE IF NOT EXISTS handover_reports (
  id          BIGSERIAL PRIMARY KEY,
  project_id  BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  version     INT NOT NULL DEFAULT 1,
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  sha256      TEXT,
  created_by  BIGINT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. AUDIT LOG (IMMUTABLE COMPLIANCE TRAIL)
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT REFERENCES users(id),
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  detail     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. ADVANCED ROUND 3 FEATURES:
-- A) AI KNOWLEDGE GAP DETECTOR
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id                      BIGSERIAL PRIMARY KEY,
  project_id              BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  description             TEXT NOT NULL,
  severity                TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status                  TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'ignored')),
  related_source_id       BIGINT REFERENCES sources(id) ON DELETE SET NULL,
  suggested_owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B) AI SUCCESSOR ONBOARDING PLANS
CREATE TABLE IF NOT EXISTS onboarding_plans (
  id          BIGSERIAL PRIMARY KEY,
  project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_json   JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- C) DECISION INTELLIGENCE TIMELINE
CREATE TABLE IF NOT EXISTS decisions (
  id                  BIGSERIAL PRIMARY KEY,
  project_id          BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  decision_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  responsible_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  source_id           BIGINT REFERENCES sources(id) ON DELETE SET NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  superseded_by_id    BIGINT REFERENCES decisions(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- D) KNOWLEDGE OWNERSHIP TRANSFER
CREATE TABLE IF NOT EXISTS ownership_transfers (
  id                BIGSERIAL PRIMARY KEY,
  project_id        BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  departing_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  successor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'awaiting_acknowledgement', 'completed', 'cancelled')),
  checklist_json    JSONB NOT NULL DEFAULT '[]'::jsonb,
  audit_log         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS chunks_access_idx ON chunks (access_tag);
CREATE INDEX IF NOT EXISTS claims_access_idx ON claims (access_tag, review_state);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_members_proj ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_project_invitations_proj ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_project_messages_proj ON project_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_proj ON knowledge_gaps(project_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_plans_user ON onboarding_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_proj ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_proj ON ownership_transfers(project_id);

-- 14. DEFAULT SEED MAPPING FOR EXISTING DEMO USERS (SAFE & NON-DESTRUCTIVE)
INSERT INTO project_members (project_id, user_id, role)
SELECT p.id, u.id, u.role
FROM projects p
CROSS JOIN users u
WHERE p.name = 'Campus Pay' 
  AND u.email IN (
    'admin@demo.byebyebrain.test',
    'riya@demo.byebyebrain.test',
    'arjun@demo.byebyebrain.test',
    'reviewer@demo.byebyebrain.test'
  )
ON CONFLICT (project_id, user_id) DO NOTHING;
