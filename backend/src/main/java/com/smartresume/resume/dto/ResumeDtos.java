package com.smartresume.resume.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public final class ResumeDtos {

    private ResumeDtos() {
    }

    public record ResumeSummaryResponse(
        String id,
        String title,
        String templateKey,
        boolean deleted,
        LocalDateTime updatedAt
    ) {
    }

    public record ResumePageResponse(
        List<ResumeSummaryResponse> items,
        long total,
        int page,
        int pageSize,
        int totalPages
    ) {
    }

    public record ResumeDetailResponse(
        String id,
        String title,
        String templateKey,
        ResumeContentPayload content,
        ResumeLayoutPayload layout,
        LocalDateTime updatedAt,
        LocalDateTime deletedAt
    ) {
    }

    public record ResumeCreateRequest(
        @NotBlank(message = "Resume title is required")
        String title,
        @NotBlank(message = "Template key is required")
        String templateKey
    ) {
    }

    public record ResumeCopyRequest(
        @NotBlank(message = "Resume title is required")
        String title
    ) {
    }

    public record ResumeUpdateRequest(
        @NotBlank(message = "Resume title is required")
        String title,
        @NotBlank(message = "Template key is required")
        String templateKey,
        @NotNull(message = "Resume content is required")
        @Valid
        ResumeContentPayload content,
        @NotNull(message = "Resume layout is required")
        @Valid
        ResumeLayoutPayload layout
    ) {
    }

    public record ResumeContentPayload(
        @Valid PersonalInfo personalInfo,
        String personalSummary,
        List<@Valid EducationItem> education,
        List<@Valid WorkExperienceItem> workExperience,
        List<@Valid ProjectExperienceItem> projectExperience,
        List<@Valid SkillItem> skills,
        List<@Valid HonorItem> honors,
        List<@Valid CertificateItem> certificates
    ) {
    }

    public record ResumeLayoutPayload(
        List<@NotBlank(message = "Section key cannot be blank") String> sectionOrder,
        List<@NotBlank(message = "Hidden section key cannot be blank") String> hiddenSections
    ) {
    }

    public record PersonalInfo(
        String fullName,
        String headline,
        String phone,
        String email,
        String city,
        String website,
        String expectedSalary,
        String avatar
    ) {
    }

    public record EducationItem(
        String school,
        String degree,
        String major,
        String startDate,
        String endDate,
        String description
    ) {
    }

    public record WorkExperienceItem(
        String company,
        String role,
        String startDate,
        String endDate,
        String description
    ) {
    }

    public record ProjectExperienceItem(
        String name,
        String role,
        String startDate,
        String endDate,
        String description
    ) {
    }

    public record SkillItem(String name, String level) {
    }

    public record HonorItem(String title, String issuer, String awardedAt, String description) {
    }

    public record CertificateItem(String name, String issuer, String issuedAt, String credentialId) {
    }
}
