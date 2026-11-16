-- Migration 004: Claim Conflicts & Stale Work Finder
CREATE TABLE IF NOT EXISTS claim_conflicts (
  id            BIGSERIAL PRIMARY KEY,
  project_id    BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('contradiction', 'stale')),
  claim_a_id    BIGINT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  claim_b_id    BIGINT REFERENCES claims(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL,
  detected_by   TEXT NOT NULL DEFAULT 'rule' CHECK (detected_by IN ('rule', 'gemini')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolution    TEXT CHECK (resolution IN ('keep_a', 'keep_b', 'both_valid', 'dismiss')),
  resolution_note TEXT,
  resolved_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  is_planted    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index for contradiction pairs (prevent duplicate pairs regardless of ordering)
CREATE UNIQUE INDEX IF NOT EXISTS claim_conflicts_contradiction_pair_idx 
ON claim_conflicts (project_id, LEAST(claim_a_id, claim_b_id), GREATEST(claim_a_id, claim_b_id))
WHERE kind = 'contradiction' AND claim_b_id IS NOT NULL;

-- Unique index for stale claims (one stale record per claim_a)
CREATE UNIQUE INDEX IF NOT EXISTS claim_conflicts_stale_claim_idx 
ON claim_conflicts (project_id, claim_a_id)
WHERE kind = 'stale';
