package com.smartresume.interview.domain;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import java.time.LocalDateTime;

@Table("interview_sessions")
public class InterviewSessionEntity {

    @Id(keyType = KeyType.None)
    private String id;
    private String resumeId;
    private String title;
    private String aiConversationId;
    private String jobDescription;
    private String difficulty;
    private String interviewerRolesJson;
    private Integer activeRoundIndex;
    private String status;
    private String reportStatus;
    private String reportContent;
    private Integer totalElapsedSeconds;
    private LocalDateTime lastResumedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime endedAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getResumeId() {
        return resumeId;
    }

    public void setResumeId(String resumeId) {
        this.resumeId = resumeId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getAiConversationId() {
        return aiConversationId;
    }

    public void setAiConversationId(String aiConversationId) {
        this.aiConversationId = aiConversationId;
    }

    public String getJobDescription() {
        return jobDescription;
    }

    public void setJobDescription(String jobDescription) {
        this.jobDescription = jobDescription;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public String getInterviewerRolesJson() {
        return interviewerRolesJson;
    }

    public void setInterviewerRolesJson(String interviewerRolesJson) {
        this.interviewerRolesJson = interviewerRolesJson;
    }

    public Integer getActiveRoundIndex() {
        return activeRoundIndex;
    }

    public void setActiveRoundIndex(Integer activeRoundIndex) {
        this.activeRoundIndex = activeRoundIndex;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getReportStatus() {
        return reportStatus;
    }

    public void setReportStatus(String reportStatus) {
        this.reportStatus = reportStatus;
    }

    public String getReportContent() {
        return reportContent;
    }

    public void setReportContent(String reportContent) {
        this.reportContent = reportContent;
    }

    public Integer getTotalElapsedSeconds() {
        return totalElapsedSeconds;
    }

    public void setTotalElapsedSeconds(Integer totalElapsedSeconds) {
        this.totalElapsedSeconds = totalElapsedSeconds;
    }

    public LocalDateTime getLastResumedAt() {
        return lastResumedAt;
    }

    public void setLastResumedAt(LocalDateTime lastResumedAt) {
        this.lastResumedAt = lastResumedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(LocalDateTime endedAt) {
        this.endedAt = endedAt;
    }
}
