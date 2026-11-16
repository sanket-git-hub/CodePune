-- Ensure onboarding_plans has all requested columns and UNIQUE constraint
ALTER TABLE onboarding_plans ADD COLUMN IF NOT EXISTS checks_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE onboarding_plans ADD COLUMN IF NOT EXISTS answers_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE onboarding_plans ADD COLUMN IF NOT EXISTS readiness_score INT NOT NULL DEFAULT 0;

-- Ensure unique constraint on (project_id, user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_plans_project_user_unique'
  ) THEN
    ALTER TABLE onboarding_plans ADD CONSTRAINT onboarding_plans_project_user_unique UNIQUE (project_id, user_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
