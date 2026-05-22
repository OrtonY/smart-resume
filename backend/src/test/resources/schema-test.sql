CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    username VARCHAR(80) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS system_credentials (
    id BIGINT PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
    id BIGINT PRIMARY KEY,
    registration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS resumes (
    id VARCHAR(64) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    template_key VARCHAR(80) NOT NULL,
    layout_json TEXT NOT NULL,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS resume_sections (
    id VARCHAR(64) PRIMARY KEY,
    resume_id VARCHAR(64) NOT NULL,
    user_id BIGINT NOT NULL,
    section_type VARCHAR(80) NOT NULL,
    sort_order INTEGER NOT NULL,
    content_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_resume_sections_resume_type UNIQUE (resume_id, section_type)
);

CREATE TABLE IF NOT EXISTS resume_versions (
    id VARCHAR(64) PRIMARY KEY,
    resume_id VARCHAR(64) NOT NULL,
    user_id BIGINT NOT NULL,
    version_number INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    template_key VARCHAR(80) NOT NULL,
    content_json TEXT NOT NULL,
    layout_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_resume_versions_resume_version UNIQUE (resume_id, version_number)
);

CREATE TABLE IF NOT EXISTS resume_share_links (
    id VARCHAR(64) PRIMARY KEY,
    resume_id VARCHAR(64) NOT NULL,
    user_id BIGINT NOT NULL,
    share_code VARCHAR(80) NOT NULL UNIQUE,
    title VARCHAR(50) NULL,
    share_mode VARCHAR(20) NOT NULL,
    target_version_id VARCHAR(64) NULL,
    password_hash VARCHAR(200) NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS share_access_logs (
    id VARCHAR(64) PRIMARY KEY,
    share_id VARCHAR(64) NOT NULL,
    user_id BIGINT NOT NULL,
    accessed_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45) NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_configurations (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    vendor VARCHAR(40) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    api_key VARCHAR(1000) NOT NULL,
    model_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_configurations_user_id
    ON ai_configurations (user_id);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id BIGINT PRIMARY KEY,
    resume_id VARCHAR(64) NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_chat_conversations (
    conversation_id VARCHAR(128) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    resume_id VARCHAR(64) NOT NULL,
    title VARCHAR(160) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS SPRING_AI_CHAT_MEMORY (
    conversation_id VARCHAR(128) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS SPRING_AI_CHAT_MEMORY_IDX
    ON SPRING_AI_CHAT_MEMORY (conversation_id, timestamp);

CREATE TABLE IF NOT EXISTS interview_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    resume_id VARCHAR(64) NULL,
    title VARCHAR(200) NOT NULL,
    ai_conversation_id VARCHAR(128) NOT NULL UNIQUE,
    job_description TEXT NULL,
    difficulty VARCHAR(20) NOT NULL,
    interviewer_roles_json TEXT NOT NULL,
    active_round_index INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL,
    report_status VARCHAR(30) NOT NULL,
    report_content TEXT NULL,
    total_elapsed_seconds INTEGER NOT NULL DEFAULT 0,
    last_resumed_at TIMESTAMP NULL,
    target_company VARCHAR(200) NULL,
    company_context_summary_json TEXT NOT NULL DEFAULT '[]',
    company_context_status VARCHAR(30) NOT NULL DEFAULT 'NOT_REQUESTED',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS interview_messages (
    id VARCHAR(64) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    role VARCHAR(30) NOT NULL,
    content TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    round_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'NORMAL'
);

CREATE TABLE IF NOT EXISTS interview_round_topics (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    round_index INT NOT NULL,
    topics_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_round_topics_session
    ON interview_round_topics(session_id);

CREATE TABLE IF NOT EXISTS resume_templates (
    key VARCHAR(80) PRIMARY KEY,
    user_id BIGINT NULL,
    name VARCHAR(120) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    category VARCHAR(120) NOT NULL,
    layout VARCHAR(40) NOT NULL,
    theme_json TEXT NOT NULL,
    preview_json TEXT NOT NULL,
    built_in BOOLEAN NOT NULL DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_resumes_deleted
    ON resumes (deleted, updated_at);

CREATE INDEX IF NOT EXISTS idx_resumes_user_updated
    ON resumes (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_resume_sections_resume_id
    ON resume_sections (resume_id);

CREATE INDEX IF NOT EXISTS idx_resume_sections_user_resume
    ON resume_sections (user_id, resume_id);

CREATE INDEX IF NOT EXISTS idx_resume_versions_user_resume
    ON resume_versions (user_id, resume_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_resume_share_links_resume_id
    ON resume_share_links (resume_id);

CREATE INDEX IF NOT EXISTS idx_resume_share_links_user_resume
    ON resume_share_links (user_id, resume_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_share_access_logs_share_id
    ON share_access_logs (share_id);

CREATE INDEX IF NOT EXISTS idx_share_access_logs_user_share
    ON share_access_logs (user_id, share_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_resume_id_created_at
    ON ai_chat_messages (resume_id, created_at, id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_resume
    ON ai_chat_messages (user_id, resume_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_resume_id_updated_at
    ON ai_chat_conversations (resume_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_user_resume_updated
    ON ai_chat_conversations (user_id, resume_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_resume_updated
    ON interview_sessions (resume_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_status_updated
    ON interview_sessions (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_updated
    ON interview_sessions (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_target_company_updated
    ON interview_sessions (target_company, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_messages_session_order
    ON interview_messages (session_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_interview_messages_session_round
    ON interview_messages (session_id, round_index, sort_order);

CREATE INDEX IF NOT EXISTS idx_interview_messages_user_session
    ON interview_messages (user_id, session_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_interview_round_topics_user_session
    ON interview_round_topics (user_id, session_id, round_index);

CREATE INDEX IF NOT EXISTS idx_resume_templates_deleted
    ON resume_templates (deleted, updated_at);

CREATE INDEX IF NOT EXISTS idx_resume_templates_built_in
    ON resume_templates (built_in, deleted);

CREATE INDEX IF NOT EXISTS idx_resume_templates_user_updated
    ON resume_templates (user_id, updated_at DESC);
