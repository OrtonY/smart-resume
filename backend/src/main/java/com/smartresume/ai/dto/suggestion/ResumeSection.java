package com.smartresume.ai.dto.suggestion;

import java.util.List;
import java.util.Map;

/**
 * Enum representing resume sections that AI suggestions can target.
 * Field whitelist per section aligns with frontend/src/features/resume/types.ts.
 */
public enum ResumeSection {

    personalInfo(false, List.of(
        "fullName", "headline", "phone", "email", "city", "website", "expectedSalary", "age"
    )),
    personalSummary(true, List.of("value")),
    education(false, List.of(
        "school", "degree", "major", "startDate", "endDate", "description"
    )),
    workExperience(false, List.of(
        "company", "role", "startDate", "endDate", "description"
    )),
    projectExperience(false, List.of(
        "name", "role", "startDate", "endDate", "description"
    )),
    skills(false, List.of("name", "level")),
    honors(false, List.of("title", "issuer", "awardedAt", "description")),
    certificates(false, List.of("name", "issuer", "issuedAt", "credentialId"));

    private final boolean scalar;
    private final List<String> allowedFields;

    ResumeSection(boolean scalar, List<String> allowedFields) {
        this.scalar = scalar;
        this.allowedFields = allowedFields;
    }

    /**
     * Whether this section is a scalar value (not an array).
     * For scalar sections, index must be null.
     */
    public boolean isScalar() {
        return scalar;
    }

    public List<String> getAllowedFields() {
        return allowedFields;
    }

    public boolean isFieldAllowed(String field) {
        return allowedFields.contains(field);
    }
}
