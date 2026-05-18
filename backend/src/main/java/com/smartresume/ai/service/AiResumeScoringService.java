package com.smartresume.ai.service;

import com.smartresume.ai.dto.AiDtos.AiResumeContext;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreResponse;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreSuggestionGroup;
import com.smartresume.resume.dto.ResumeDtos.CertificateItem;
import com.smartresume.resume.dto.ResumeDtos.EducationItem;
import com.smartresume.resume.dto.ResumeDtos.HonorItem;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ProjectExperienceItem;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.SkillItem;
import com.smartresume.resume.dto.ResumeDtos.WorkExperienceItem;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AiResumeScoringService {

    public AiResumeScoreResponse scoreResume(AiResumeScoreRequest request) {
        AiResumeContext resume = request.resume();
        ResumeContentPayload content = resume.content();
        boolean jobDescriptionProvided = StringUtils.hasText(request.jobDescription());
        int score = calculateScore(content, jobDescriptionProvided);
        List<String> strengths = buildStrengths(content, jobDescriptionProvided);
        List<AiResumeScoreSuggestionGroup> suggestionGroups = buildSuggestionGroups(content, jobDescriptionProvided);
        String summary = buildSummary(score, content, jobDescriptionProvided);

        return new AiResumeScoreResponse(
            score,
            summary,
            strengths,
            suggestionGroups,
            jobDescriptionProvided,
            Instant.now().toString(),
            "mock"
        );
    }

    private int calculateScore(ResumeContentPayload content, boolean jobDescriptionProvided) {
        PersonalInfo personalInfo = content.personalInfo();
        int score = 42;

        if (personalInfo != null) {
            score += filledCount(
                personalInfo.fullName(),
                personalInfo.headline(),
                personalInfo.phone(),
                personalInfo.email(),
                personalInfo.city(),
                personalInfo.website()
            );
        }
        if (StringUtils.hasText(content.personalSummary())) {
            score += 10;
        }
        if (hasFilledEducation(content.education())) {
            score += 8;
        }
        if (hasFilledWorkExperience(content.workExperience())) {
            score += 12;
        }
        if (hasFilledProjects(content.projectExperience())) {
            score += 10;
        }
        score += Math.min(8, filledSkillCount(content.skills()) * 2);
        if (hasFilledHonors(content.honors()) || hasFilledCertificates(content.certificates())) {
            score += 4;
        }
        if (jobDescriptionProvided) {
            score += 6;
        }

        return Math.max(35, Math.min(score, 96));
    }

    private List<String> buildStrengths(ResumeContentPayload content, boolean jobDescriptionProvided) {
        List<String> strengths = new ArrayList<>();

        if (StringUtils.hasText(content.personalSummary())) {
            strengths.add("已提供个人总结，适合快速建立职业定位。");
        }
        if (hasFilledWorkExperience(content.workExperience())) {
            strengths.add("工作经历模块已具备，可继续强化成果表达。");
        }
        if (hasFilledProjects(content.projectExperience())) {
            strengths.add("项目经历已具备，便于突出技术场景和业务影响。");
        }
        if (filledSkillCount(content.skills()) >= 3) {
            strengths.add("技能清单相对完整，便于招聘方快速筛选关键词。");
        }
        if (jobDescriptionProvided) {
            strengths.add("本次评分已结合 JD，可更聚焦岗位匹配度。");
        }
        if (strengths.isEmpty()) {
            strengths.add("简历基础结构已建立，适合继续补齐关键经历与结果。");
        }

        return strengths;
    }

    private List<AiResumeScoreSuggestionGroup> buildSuggestionGroups(ResumeContentPayload content, boolean jobDescriptionProvided) {
        List<AiResumeScoreSuggestionGroup> groups = new ArrayList<>();
        List<String> completenessSuggestions = new ArrayList<>();

        if (!StringUtils.hasText(content.personalSummary())) {
            completenessSuggestions.add("补充 3-5 句个人总结，先说明核心岗位方向、年限和代表性成果。");
        }
        if (!hasFilledWorkExperience(content.workExperience())) {
            completenessSuggestions.add("补充至少一段工作经历，写清公司、角色、时间和关键结果。");
        }
        if (!hasFilledProjects(content.projectExperience())) {
            completenessSuggestions.add("增加项目经历，重点突出业务背景、技术栈、你的职责和最终影响。");
        }
        if (filledSkillCount(content.skills()) < 3) {
            completenessSuggestions.add("技能部分建议补足 3 项以上可验证技能，并标明熟练方向或使用场景。");
        }
        if (!hasFilledEducation(content.education())) {
            completenessSuggestions.add("教育经历建议补齐，避免基础背景信息缺失。");
        }
        if (completenessSuggestions.isEmpty()) {
            completenessSuggestions.add("基础结构较完整，下一步可把每段经历继续打磨成更有结果感的表述。");
        }
        groups.add(new AiResumeScoreSuggestionGroup("内容完整性", completenessSuggestions));

        List<String> expressionSuggestions = new ArrayList<>();
        expressionSuggestions.add("将经历描述尽量改为“动作 + 场景 + 结果”的表达，减少纯职责罗列。");
        expressionSuggestions.add("优先量化成果，例如转化率、效率提升、成本下降、交付规模或用户量。");
        if (hasFilledWorkExperience(content.workExperience()) || hasFilledProjects(content.projectExperience())) {
            expressionSuggestions.add("每段经历优先保留最强的 2-4 条亮点，不必平均铺开所有工作内容。");
        }
        groups.add(new AiResumeScoreSuggestionGroup("表达优化", expressionSuggestions));

        List<String> targetingSuggestions = new ArrayList<>();
        if (jobDescriptionProvided) {
            targetingSuggestions.add("根据 JD 中的核心职责和关键词，建议把最匹配的经历前置到个人总结和前两段经历。");
            targetingSuggestions.add("对照 JD 检查是否缺少岗位高频关键词，可在技能、项目和经历结果中自然补入。");
        } else {
            targetingSuggestions.add("未填写 JD，本次评分更偏通用质量；投递前建议补充目标岗位 JD 再做一次定向评分。");
            targetingSuggestions.add("如果岗位方向明确，建议把简历标题、副标题和个人总结先围绕单一岗位聚焦。");
        }
        groups.add(new AiResumeScoreSuggestionGroup(jobDescriptionProvided ? "JD 定向优化" : "投递前优化", targetingSuggestions));

        return groups;
    }

    private String buildSummary(int score, ResumeContentPayload content, boolean jobDescriptionProvided) {
        String matchPerspective = jobDescriptionProvided ? "结合目标 JD 看，" : "从通用简历质量看，";
        if (score >= 85) {
            return matchPerspective + "这份简历已经具备较强的结构完整度，下一步重点是继续强化量化结果和岗位关键词贴合度。";
        }
        if (score >= 70) {
            return matchPerspective + "这份简历已有不错基础，但还可以通过补充成果细节、优化总结和增强岗位针对性来继续提升。";
        }
        if (hasFilledWorkExperience(content.workExperience()) || hasFilledProjects(content.projectExperience())) {
            return matchPerspective + "经历基础已经存在，当前更需要系统整理表达方式，并补足缺失模块来提升整体说服力。";
        }
        return matchPerspective + "当前更适合先完善基础内容，再进行定向优化，这样后续评分和改写建议会更稳定。";
    }

    private int filledCount(String... values) {
        int count = 0;
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                count++;
            }
        }
        return count;
    }

    private boolean hasFilledEducation(List<EducationItem> items) {
        return items != null && items.stream().anyMatch(item ->
            item != null && (
                StringUtils.hasText(item.school())
                    || StringUtils.hasText(item.degree())
                    || StringUtils.hasText(item.major())
                    || StringUtils.hasText(item.description())
            )
        );
    }

    private boolean hasFilledWorkExperience(List<WorkExperienceItem> items) {
        return items != null && items.stream().anyMatch(item ->
            item != null && (
                StringUtils.hasText(item.company())
                    || StringUtils.hasText(item.role())
                    || StringUtils.hasText(item.description())
            )
        );
    }

    private boolean hasFilledProjects(List<ProjectExperienceItem> items) {
        return items != null && items.stream().anyMatch(item ->
            item != null && (
                StringUtils.hasText(item.name())
                    || StringUtils.hasText(item.role())
                    || StringUtils.hasText(item.description())
            )
        );
    }

    private int filledSkillCount(List<SkillItem> items) {
        if (items == null) {
            return 0;
        }
        return (int) items.stream().filter(item ->
            item != null && (StringUtils.hasText(item.name()) || StringUtils.hasText(item.level()))
        ).count();
    }

    private boolean hasFilledHonors(List<HonorItem> items) {
        return items != null && items.stream().anyMatch(item ->
            item != null && (
                StringUtils.hasText(item.title())
                    || StringUtils.hasText(item.issuer())
                    || StringUtils.hasText(item.description())
            )
        );
    }

    private boolean hasFilledCertificates(List<CertificateItem> items) {
        return items != null && items.stream().anyMatch(item ->
            item != null && (
                StringUtils.hasText(item.name())
                    || StringUtils.hasText(item.issuer())
                    || StringUtils.hasText(item.credentialId())
            )
        );
    }
}
