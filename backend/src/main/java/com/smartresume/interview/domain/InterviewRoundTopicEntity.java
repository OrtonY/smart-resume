package com.smartresume.interview.domain;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;

@Table("interview_round_topics")
public class InterviewRoundTopicEntity {

    @Id(keyType = KeyType.None)
    private String id;
    private String sessionId;
    private Integer roundIndex;
    private String topicsJson;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public Integer getRoundIndex() {
        return roundIndex;
    }

    public void setRoundIndex(Integer roundIndex) {
        this.roundIndex = roundIndex;
    }

    public String getTopicsJson() {
        return topicsJson;
    }

    public void setTopicsJson(String topicsJson) {
        this.topicsJson = topicsJson;
    }
}
