CREATE TABLE interview_ai_assists (
    id VARCHAR(64) PRIMARY KEY,
    message_id VARCHAR(64) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    user_id BIGINT NOT NULL,
    answer_content TEXT NULL,
    answer_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    candidate_answer TEXT NULL,
    score INT NULL,
    feedback TEXT NULL,
    score_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX uk_interview_ai_assists_message ON interview_ai_assists (message_id);
CREATE INDEX idx_interview_ai_assists_session ON interview_ai_assists (session_id, user_id);
