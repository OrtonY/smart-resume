CREATE TABLE ai_resume_scores (
    resume_id VARCHAR(64) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    job_description TEXT NOT NULL,
    result_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_ai_resume_scores_user_updated
    ON ai_resume_scores (user_id, updated_at DESC);
