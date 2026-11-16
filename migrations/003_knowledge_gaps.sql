-- Migration 003: Knowledge Gaps Enhancement for Leaver Flow
ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS gap_type TEXT CHECK (gap_type IN ('decision_no_reason', 'action_no_owner', 'leaver_only'));
ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS question TEXT;
ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS answer TEXT;
ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS related_claim_id BIGINT REFERENCES claims(id) ON DELETE CASCADE;
ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS answered_claim_id BIGINT REFERENCES claims(id) ON DELETE SET NULL;
ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;

-- Unique index for idempotent detection
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_gaps_project_type_claim_idx 
ON knowledge_gaps (project_id, gap_type, related_claim_id) 
WHERE related_claim_id IS NOT NULL;

-- Unique index for leaver_only source-based gaps
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_gaps_project_type_source_idx 
ON knowledge_gaps (project_id, gap_type, related_source_id) 
WHERE related_source_id IS NOT NULL;
