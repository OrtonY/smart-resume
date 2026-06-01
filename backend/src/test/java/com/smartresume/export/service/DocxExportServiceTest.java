package com.smartresume.export.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.smartresume.resume.dto.ResumeDtos.EducationItem;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import com.smartresume.resume.dto.ResumeDtos.SkillItem;
import com.smartresume.resume.dto.ResumeDtos.WorkExperienceItem;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;

class DocxExportServiceTest {

    private static final String ONE_PIXEL_PNG_DATA_URL =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

    private final DocxExportService service = new DocxExportService();

    @Test
    void exportsEditableDocxWithNameContactAndMarkdown() throws IOException {
        byte[] bytes = service.exportResumeDocx(resume(
            content(
                new PersonalInfo("张三", "Java 工程师", "13800000000", "test@example.com", "上海", "https://example.com", "", "28", ONE_PIXEL_PNG_DATA_URL),
                "擅长 **Spring Boot** 和 _Word 导出_。",
                List.of(new EducationItem("复旦大学", "本科", "计算机", "2018", "2022", "- GPA 3.8")),
                List.of(new WorkExperienceItem("Acme", "后端工程师", "2022", "至今", "- 建设导出服务\n- 优化性能")),
                List.of(new SkillItem("Java", "熟练"))
            ),
            new ResumeLayoutPayload(List.of("summary", "workExperience", "skills", "education"), List.of())
        ), "zh-CN");

        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            assertThat(String.join("\n", documentText(document)))
                .contains(
                    "张三",
                    "Java 工程师",
                    "电话",
                    "邮箱",
                    "城市",
                    "年龄",
                    "13800000000",
                    "test@example.com",
                    "上海",
                    "28岁",
                    "个人简介",
                    "工作经历",
                    "• 建设导出服务",
                    "技能",
                    "Java · 熟练",
                    "教育经历",
                    "• GPA 3.8"
                );
            assertThat(document.getParagraphs())
                .flatExtracting(paragraph -> paragraph.getRuns())
                .anySatisfy(run -> {
                    assertThat(run.text()).isEqualTo("Spring Boot");
                    assertThat(run.isBold()).isTrue();
                });
            assertThat(document.getAllPictures()).hasSize(1);
        }
    }

    @Test
    void routesTemplateKeysToDistinctDocxLayouts() throws IOException {
        assertThat(String.join("\n", documentText(service.exportResumeDocx(resume("north-star"), "zh-CN"))))
            .contains("教育经历", "个人简介", "工作经历", "2018 – 2022", "2022 – 至今");
        assertThat(String.join("\n", documentText(service.exportResumeDocx(resume("grid-slate"), "zh-CN"))))
            .contains("教育经历", "工作经历", "技能", "2018 – 2022", "2022 – 至今");
        assertThat(String.join("\n", documentText(service.exportResumeDocx(resume("ink-flow"), "zh-CN"))))
            .contains(
                "张三",
                "Java 工程师",
                "电话",
                "13800000000",
                "邮箱",
                "test@example.com",
                "城市",
                "上海",
                "链接",
                "https://example.com",
                "个人简介",
                "工作经历",
                "教育经历",
                "技能",
                "2018 – 2022",
                "2022 – 至今"
            );
    }

    @Test
    void skipsHiddenAndEmptySections() throws IOException {
        byte[] bytes = service.exportResumeDocx(resume(
            content(
                new PersonalInfo("Jane", "", "", "", "", "", "", "", null),
                "Visible summary",
                List.of(),
                List.of(new WorkExperienceItem("Hidden Co", "Role", "", "", "")),
                List.of(new SkillItem("", ""))
            ),
            new ResumeLayoutPayload(List.of("summary", "workExperience", "skills"), List.of("workExperience"))
        ), "en-US");

        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            assertThat(documentText(document))
                .contains("Jane", "Summary", "Visible summary")
                .doesNotContain("Work experience", "Hidden Co", "Skills");
        }
    }

    @Test
    void handlesNullContent() {
        ResumeDetailResponse resume = new ResumeDetailResponse(
            "r1",
            "Untitled",
            "pure-form",
            null,
            new ResumeLayoutPayload(List.of("summary"), List.of()),
            LocalDateTime.now(),
            null,
            null
        );

        assertThatCode(() -> service.exportResumeDocx(resume, "en-US")).doesNotThrowAnyException();
    }

    private ResumeDetailResponse resume(ResumeContentPayload content, ResumeLayoutPayload layout) {
        return new ResumeDetailResponse("r1", "Resume Title", "pure-form", content, layout, LocalDateTime.now(), null, null);
    }

    private ResumeDetailResponse resume(String templateKey) {
        return new ResumeDetailResponse(
            "r1",
            "Resume Title",
            templateKey,
            content(
                new PersonalInfo("张三", "Java 工程师", "13800000000", "test@example.com", "上海", "https://example.com", "", "28", ONE_PIXEL_PNG_DATA_URL),
                "擅长 **Spring Boot** 和 _Word 导出_。",
                List.of(new EducationItem("复旦大学", "本科", "计算机", "2018", "2022", "- GPA 3.8")),
                List.of(new WorkExperienceItem("Acme", "后端工程师", "2022", "至今", "- 建设导出服务")),
                List.of(new SkillItem("Java", "熟练"))
            ),
            new ResumeLayoutPayload(List.of("summary", "workExperience", "skills", "education"), List.of()),
            LocalDateTime.now(),
            null,
            null
        );
    }

    private List<String> documentText(byte[] bytes) throws IOException {
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            return documentText(document);
        }
    }

    private List<String> documentText(XWPFDocument document) {
        List<String> text = new java.util.ArrayList<>();
        text.addAll(document.getParagraphs().stream().map(paragraph -> paragraph.getText()).toList());
        document.getTables().forEach(table -> table.getRows().forEach(row -> row.getTableCells().forEach(cell -> {
            text.add(cell.getText());
            text.addAll(cell.getParagraphs().stream().map(paragraph -> paragraph.getText()).toList());
        })));
        return text;
    }

    private ResumeContentPayload content(
        PersonalInfo personalInfo,
        String summary,
        List<EducationItem> education,
        List<WorkExperienceItem> workExperience,
        List<SkillItem> skills
    ) {
        return new ResumeContentPayload(personalInfo, summary, education, workExperience, List.of(), skills, List.of(), List.of());
    }
}
