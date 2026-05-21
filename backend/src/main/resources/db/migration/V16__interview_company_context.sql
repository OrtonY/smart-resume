ALTER TABLE interview_sessions
    ADD COLUMN target_company VARCHAR(200) NULL;

ALTER TABLE interview_sessions
    ADD COLUMN company_context_summary_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE interview_sessions
    ADD COLUMN company_context_status VARCHAR(30) NOT NULL DEFAULT 'NOT_REQUESTED';

CREATE INDEX IF NOT EXISTS idx_interview_sessions_target_company_updated
    ON interview_sessions (target_company, updated_at DESC);
