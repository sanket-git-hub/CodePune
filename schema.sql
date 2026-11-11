CREATE TABLE IF NOT EXISTS users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role          TEXT NOT NULL DEFAULT 'incoming'
                CHECK (role IN ('admin','reviewer','leaver','incoming','outsider')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT REFERENCES users(id),
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  detail     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chunks_access_idx ON chunks (access_tag);
CREATE INDEX IF NOT EXISTS claims_access_idx ON claims (access_tag, review_state);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_log (created_at DESC);