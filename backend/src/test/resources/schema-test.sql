-- Test schema for H2 in-memory database
CREATE TABLE IF NOT EXISTS resumes (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    template_key VARCHAR(80) NOT NULL,
    layout_json TEXT,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS interview_sessions (
    id VARCHAR(64) PRIMARY KEY,
    resume_id VARCHAR(64) NULL,
    title VARCHAR(200) NOT NULL,
    ai_conversation_id VARCHAR(128) NOT NULL UNIQUE,
    job_description TEXT,
    difficulty VARCHAR(20) NOT NULL,
    interviewer_roles_json TEXT NOT NULL,
    active_round_index INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL,
    report_status VARCHAR(30) NOT NULL,
    report_content TEXT NULL,
    total_elapsed_seconds INTEGER NOT NULL DEFAULT 0,
    last_resumed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS interview_messages (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    role VARCHAR(30) NOT NULL,
    content TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    round_index INTEGER NULL,
    created_at TIMESTAMP NOT NULL,
    status VARCHAR(30) NULL
);

CREATE TABLE IF NOT EXISTS SPRING_AI_CHAT_MEMORY (
    conversation_id VARCHAR(128) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS SPRING_AI_CHAT_MEMORY_IDX
    ON SPRING_AI_CHAT_MEMORY (conversation_id, timestamp);

CREATE TABLE IF NOT EXISTS interview_round_topics (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    round_index INT NOT NULL,
    topics_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_round_topics_session ON interview_round_topics(session_id);
