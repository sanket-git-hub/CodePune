-- Evidence-support check migration
-- Adds support_result, support_reason, and support_checked_at to claims

ALTER TABLE claims 
  ADD COLUMN IF NOT EXISTS support_result TEXT CHECK (support_result IN ('supports','partial','not_supported')) NULL,
  ADD COLUMN IF NOT EXISTS support_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS support_checked_at TIMESTAMPTZ NULL;
