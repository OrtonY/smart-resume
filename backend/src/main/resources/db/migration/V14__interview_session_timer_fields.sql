-- Add timer persistence fields to interview_sessions
ALTER TABLE interview_sessions ADD COLUMN total_elapsed_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE interview_sessions ADD COLUMN last_resumed_at TIMESTAMP NULL;
