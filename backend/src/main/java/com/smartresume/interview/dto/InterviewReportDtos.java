package com.smartresume.interview.dto;

import java.util.List;

public final class InterviewReportDtos {

    private InterviewReportDtos() {
    }

    public record InterviewReport(
        int overallScore,
        String summary,
        List<String> strengths,
        List<String> improvements,
        SkillAssessment skillAssessment,
        List<RoundEvaluation> rounds,
        List<LearningResource> learningResources,
        String generatedAt
    ) {
    }

    public record SkillAssessment(
        int technicalAbility,
        int communication,
        int problemSolving,
        int professionalism
    ) {
    }

    public record RoundEvaluation(
        String role,
        int roundScore,
        String summary,
        List<QuestionEvaluation> questions
    ) {
    }

    public record QuestionEvaluation(
        String question,
        String candidateAnswer,
        int score,
        String feedback,
        String referenceAnswer
    ) {
    }

    public record LearningResource(
        String topic,
        String reason,
        List<String> suggestions
    ) {
    }

    public record ReportStatusEvent(
        String interviewId,
        String reportStatus,
        String reportContent
    ) {
    }
}
