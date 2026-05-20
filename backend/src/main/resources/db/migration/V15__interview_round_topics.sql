CREATE TABLE interview_round_topics (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    round_index INT NOT NULL,
    topics_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_round_topics_session ON interview_round_topics(session_id);
