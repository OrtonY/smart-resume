package com.smartresume.export.service;

import com.smartresume.common.exception.AppException;
import com.smartresume.resume.dto.ResumeDtos.CertificateItem;
import com.smartresume.resume.dto.ResumeDtos.EducationItem;
import com.smartresume.resume.dto.ResumeDtos.HonorItem;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ProjectExperienceItem;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import com.smartresume.resume.dto.ResumeDtos.SkillItem;
import com.smartresume.resume.dto.ResumeDtos.WorkExperienceItem;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class DocxExportService {

    private static final List<String> DEFAULT_SECTION_ORDER = List.of(
        "education",
        "summary",
        "workExperience",
        "projectExperience",
        "skills",
        "honors",
        "certificates"
    );
    private static final List<String> SPLIT_SIDEBAR_SECTIONS = List.of("skills", "honors", "certificates");
    private static final List<String> SPLIT_MAIN_SECTIONS = List.of("summary", "workExperience", "projectExperience", "education");
    private static final List<String> EDITORIAL_MAIN_SECTIONS = List.of("workExperience", "projectExperience");
    private static final List<String> EDITORIAL_NOTES_SECTIONS = List.of("education", "skills", "honors", "certificates");
    private static final String DATE_RANGE_SEPARATOR = " – ";

    private final MarkdownToDocxRenderer markdownRenderer;
    private final DocxResumeWriter writer;

    public DocxExportService() {
        this(new MarkdownToDocxRenderer(), new DocxResumeWriter());
    }

    DocxExportService(MarkdownToDocxRenderer markdownRenderer, DocxResumeWriter writer) {
        this.markdownRenderer = markdownRenderer;
        this.writer = writer;
    }

    public byte[] exportResumeDocx(ResumeDetailResponse resume, String languageTag) {
        try (XWPFDocument document = new XWPFDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            writer.configureDocument(document);
            ResumeContentPayload content = resume == null ? null : resume.content();
            ExportLanguage language = resolveLanguage(languageTag);
            writeResume(document, resume, content, language);
            document.write(output);
            return output.toByteArray();
        } catch (IOException | RuntimeException exception) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.export.docxGenerationFailed");
        }
    }

    private void writeResume(
        XWPFDocument document,
        ResumeDetailResponse resume,
        ResumeContentPayload content,
        ExportLanguage language
    ) {
        switch (resolveTemplateLayout(resume)) {
            case CLASSIC -> writeClassicResume(document, resume, content, language);
            case TWO_COLUMN -> writeSplitResume(document, resume, content, language);
            case EDITORIAL -> writeEditorialResume(document, resume, content, language);
            case MINIMAL -> writeMinimalResume(document, resume, content, language);
        }
    }

    private void writeMinimalResume(
        XWPFDocument document,
        ResumeDetailResponse resume,
        ResumeContentPayload content,
        ExportLanguage language
    ) {
        writer.writeName(document, resolveName(resume));
        writeHeaderBlock(document, content, HeaderVariant.MINIMAL);
        writeSections(document, visibleSectionOrder(resume == null ? null : resume.layout()), content, language);
    }

    private void writeClassicResume(
        XWPFDocument document,
        ResumeDetailResponse resume,
        ResumeContentPayload content,
        ExportLanguage language
    ) {
        writer.writeClassicName(document, resolveName(resume));
        writeHeaderBlock(document, content, HeaderVariant.CLASSIC);
        writeSections(document, visibleSectionOrder(resume == null ? null : resume.layout()), content, language);
    }

    private void writeSplitResume(
        XWPFDocument document,
        ResumeDetailResponse resume,
        ResumeContentPayload content,
        ExportLanguage language
    ) {
        XWPFTable table = writer.createSplitTable(document, "FFF2E8");
        XWPFTableCell sidebar = table.getRow(0).getCell(0);
        XWPFTableCell main = table.getRow(0).getCell(1);
        PersonalInfo info = content == null ? null : content.personalInfo();
        writer.writeSplitHeaderCell(sidebar, resolveName(resume), info == null ? null : info.headline());
        writeContactStack(sidebar, content);
        List<String> ordered = visibleSectionOrder(resume == null ? null : resume.layout());
        writeSections(sidebar, filterSections(ordered, SPLIT_SIDEBAR_SECTIONS), content, language);
        writeSections(main, filterSections(ordered, SPLIT_MAIN_SECTIONS), content, language);
    }

    private void writeEditorialResume(
        XWPFDocument document,
        ResumeDetailResponse resume,
        ResumeContentPayload content,
        ExportLanguage language
    ) {
        writer.writeEditorialName(document, resolveName(resume));
        writeHeaderBlock(document, content, HeaderVariant.EDITORIAL);
        if (content != null) {
            writer.writeEditorialSummaryPanel(document, language.summaryTitle(), content.personalSummary(), markdownRenderer);
        }

        XWPFTable table = writer.createEditorialTable(document);
        XWPFTableCell main = table.getRow(0).getCell(0);
        XWPFTableCell notes = table.getRow(0).getCell(1);
        List<String> ordered = visibleSectionOrder(resume == null ? null : resume.layout());
        writeSections(main, filterSections(ordered, EDITORIAL_MAIN_SECTIONS), content, language);
        writeSections(notes, filterSections(ordered, EDITORIAL_NOTES_SECTIONS), content, language);
    }

    private void writeHeaderBlock(XWPFDocument document, ResumeContentPayload content, HeaderVariant variant) {
        PersonalInfo info = content == null ? null : content.personalInfo();
        if (info == null) {
            return;
        }
        switch (variant) {
            case CLASSIC -> writer.writeClassicSubtitle(document, info.headline());
            case EDITORIAL -> writer.writeEditorialSubtitle(document, info.headline());
            case MINIMAL -> writer.writeSubtitle(document, info.headline());
        }
        List<DocxResumeWriter.ContactItem> items = contactItems(info);
        switch (variant) {
            case CLASSIC -> writer.writeClassicContactGrid(document, items);
            case EDITORIAL -> writer.writeEditorialContactGrid(document, items);
            case MINIMAL -> writer.writeContactGrid(document, items);
        }
    }

    private void writeContactStack(XWPFTableCell cell, ResumeContentPayload content) {
        PersonalInfo info = content == null ? null : content.personalInfo();
        if (info == null) {
            return;
        }
        writer.writeContactStack(cell, contactItems(info));
    }

    private List<DocxResumeWriter.ContactItem> contactItems(PersonalInfo info) {
        return List.of(
            new DocxResumeWriter.ContactItem("电话", valueOrEmpty(info.phone())),
            new DocxResumeWriter.ContactItem("邮箱", valueOrEmpty(info.email())),
            new DocxResumeWriter.ContactItem("城市", valueOrEmpty(info.city())),
            new DocxResumeWriter.ContactItem("链接", valueOrEmpty(info.website())),
            new DocxResumeWriter.ContactItem("期望薪资", valueOrEmpty(info.expectedSalary()))
        );
    }

    private void writeSections(
        XWPFDocument document,
        List<String> sections,
        ResumeContentPayload content,
        ExportLanguage language
    ) {
        for (String section : sections) {
            writeSection(document, section, content, language);
        }
    }

    private void writeSections(
        XWPFTableCell cell,
        List<String> sections,
        ResumeContentPayload content,
        ExportLanguage language
    ) {
        for (String section : sections) {
            writeSection(cell, section, content, language);
        }
    }

    private void writeSection(XWPFDocument document, String section, ResumeContentPayload content, ExportLanguage language) {
        if (content == null) {
            return;
        }
        switch (section) {
            case "education" -> writeEducation(document, content.education(), language);
            case "summary" -> writeSummary(document, content.personalSummary(), language);
            case "workExperience" -> writeWorkExperience(document, content.workExperience(), language);
            case "projectExperience" -> writeProjectExperience(document, content.projectExperience(), language);
            case "skills" -> writeSkills(document, content.skills(), language);
            case "honors" -> writeHonors(document, content.honors(), language);
            case "certificates" -> writeCertificates(document, content.certificates(), language);
            default -> {
            }
        }
    }

    private void writeSection(XWPFTableCell cell, String section, ResumeContentPayload content, ExportLanguage language) {
        if (content == null) {
            return;
        }
        switch (section) {
            case "education" -> writeEducation(cell, content.education(), language);
            case "summary" -> writeSummary(cell, content.personalSummary(), language);
            case "workExperience" -> writeWorkExperience(cell, content.workExperience(), language);
            case "projectExperience" -> writeProjectExperience(cell, content.projectExperience(), language);
            case "skills" -> writeSkills(cell, content.skills(), language);
            case "honors" -> writeHonors(cell, content.honors(), language);
            case "certificates" -> writeCertificates(cell, content.certificates(), language);
            default -> {
            }
        }
    }

    private void writeSummary(XWPFDocument document, String summary, ExportLanguage language) {
        if (isBlank(summary)) {
            return;
        }
        writer.writeSectionTitle(document, language.summaryTitle());
        markdownRenderer.render(document, summary);
    }

    private void writeSummary(XWPFTableCell cell, String summary, ExportLanguage language) {
        if (isBlank(summary)) {
            return;
        }
        writer.writeSectionTitle(cell, language.summaryTitle());
        markdownRenderer.render(cell, summary);
    }

    private void writeEducation(XWPFDocument document, List<EducationItem> education, ExportLanguage language) {
        List<EducationItem> items = safeList(education).stream().filter(this::hasEducationContent).toList();
        if (items.isEmpty()) {
            return;
        }
        writer.writeSectionTitle(document, language.educationTitle());
        for (EducationItem item : items) {
            writer.writeItemHeader(document, item.school(), joinParts(item.degree(), item.major()), dateRange(item.startDate(), item.endDate()));
            markdownRenderer.render(document, item.description());
        }
    }

    private void writeEducation(XWPFTableCell cell, List<EducationItem> education, ExportLanguage language) {
        List<EducationItem> items = safeList(education).stream().filter(this::hasEducationContent).toList();
        if (items.isEmpty()) {
            return;
        }
        writer.writeSectionTitle(cell, language.educationTitle());
        for (EducationItem item : items) {
            writer.writeItemHeader(cell, item.school(), joinParts(item.degree(), item.major()), dateRange(item.startDate(), item.endDate()));
            markdownRenderer.render(cell, item.description());
        }
    }

    private void writeWorkExperience(XWPFDocument document, List<WorkExperienceItem> workExperience, ExportLanguage language) {
        List<WorkExperienceItem> items = safeList(workExperience).stream().filter(this::hasWorkContent).toList();
        if (items.isEmpty()) {
            return;
        }
        writer.writeSectionTitle(document, language.workExperienceTitle());
        for (WorkExperienceItem item : items) {
            writer.writeItemHeader(document, item.company(), item.role(), dateRange(item.startDate(), item.endDate()));
            markdownRenderer.render(document, item.description());
        }
    }

    private void writeWorkExperience(XWPFTableCell cell, List<WorkExperienceItem> workExperience, ExportLanguage language) {
        List<WorkExperienceItem> items = safeList(workExperience).stream().filter(this::hasWorkContent).toList();
        if (items.isEmpty()) {
            return;
        }
        writer.writeSectionTitle(cell, language.workExperienceTitle());
        for (WorkExperienceItem item : items) {
            writer.writeItemHeader(cell, item.company(), item.role(), dateRange(item.startDate(), item.endDate()));
            markdownRenderer.render(cell, item.description());
        }
    }

    private void writeProjectExperience(XWPFDocument document, List<ProjectExperienceItem> projectExperience, ExportLanguage language) {
        List<ProjectExperienceItem> items = safeList(projectExperience).stream().filter(this::hasProjectContent).toList();
        if (items.isEmpty()) {
            return;
        }
        writer.writeSectionTitle(document, language.projectExperienceTitle());
        for (ProjectExperienceItem item : items) {
            writer.writeItemHeader(document, item.name(), item.role(), dateRange(item.startDate(), item.endDate()));
            markdownRenderer.render(document, item.description());
        }
    }

    private void writeProjectExperience(XWPFTableCell cell, List<ProjectExperienceItem> projectExperience, ExportLanguage language) {
        List<ProjectExperienceItem> items = safeList(projectExperience).stream().filter(this::hasProjectContent).toList();
        if (items.isEmpty()) {
            return;
        }
        writer.writeSectionTitle(cell, language.projectExperienceTitle());
        for (ProjectExperienceItem item : items) {
            writer.writeItemHeader(cell, item.name(), item.role(), dateRange(item.startDate(), item.endDate()));
            markdownRenderer.render(cell, item.description());
        }
    }

    private void writeSkills(XWPFDocument document, List<SkillItem> skills, ExportLanguage language) {
        List<SkillItem> items = safeList(skills).stream().filter(this::hasSkillContent).toList();
        if (items.isEmpty()) {
            return;
        }
        writer.writeSectionTitle(document, language.skillsTitle());
        writer.writeBodyLine(document, items.stream()
            .map(item -> joinParts(item.name(), item.level()))
            .filter(value -> !isBlank(value))
            .reduce((left, right) -> left + " / " + right)
            .orElse(""));
    }

    private void writeSkills(XWPFTableCell cell, List<SkillItem> skills, ExportLanguage language) {
        List<SkillItem> items = safeList(skills).stream().filter(this::hasSkillContent).toList();
        if (items.isEmpty()) {
            return;
        }
        writer.writeSectionTitle(cell, language.skillsTitle());
        writer.writeBodyLine(cell, items.stream()
            .map(item -> joinParts(item.name(), item.level()))
            .filter(value -> !isBlank(value))
            .reduce((left, right) -> left + " / " + right)
            .orElse(""));
    }

    private void writeHonors(XWPFDocument document, List<HonorItem> honors, ExportLanguage language) {
        List<HonorItem> items = safeList(honors).stream().filter(this::hasHonorContent).toList();
        if (items.isEmpty()) {
            return;
        }
        writer.writeSectionTitle(document, language.honorsTitle());
        for (HonorItem item : items) {
            writer.writeItemHeader(document, item.title(), item.issuer(), item.awardedAt());
            markdownRenderer.render(document, item.description());
        }
    }

    private void writeHonors(XWPFTableCell cell, List<HonorItem> honors, ExportLanguage language) {
        List<HonorItem> items = safeList(honors).stream().filter(this::hasHonorContent).toList();
        if (items.isEmpty()) {
            return;
        }
        writer.writeSectionTitle(cell, language.honorsTitle());
        for (HonorItem item : items) {
            writer.writeItemHeader(cell, item.title(), item.issuer(), item.awardedAt());
            markdownRenderer.render(cell, item.description());
        }
    }

    private void writeCertificates(XWPFDocument document, List<CertificateItem> certificates, ExportLanguage language) {
        List<CertificateItem> items = safeList(certificates).stream().filter(this::hasCertificateContent).toList();
        if (items.isEmpty()) {
            return;
        }
        writer.writeSectionTitle(document, language.certificatesTitle());
        for (CertificateItem item : items) {
            writer.writeItemHeader(document, item.name(), item.issuer(), item.issuedAt());
            if (!isBlank(item.credentialId())) {
                writer.writeBodyLine(document, language.credentialIdLabel() + item.credentialId().trim());
            }
        }
    }

    private void writeCertificates(XWPFTableCell cell, List<CertificateItem> certificates, ExportLanguage language) {
        List<CertificateItem> items = safeList(certificates).stream().filter(this::hasCertificateContent).toList();
        if (items.isEmpty()) {
            return;
        }
        writer.writeSectionTitle(cell, language.certificatesTitle());
        for (CertificateItem item : items) {
            writer.writeItemHeader(cell, item.name(), item.issuer(), item.issuedAt());
            if (!isBlank(item.credentialId())) {
                writer.writeBodyLine(cell, language.credentialIdLabel() + item.credentialId().trim());
            }
        }
    }

    private List<String> visibleSectionOrder(ResumeLayoutPayload layout) {
        List<String> source = layout == null || layout.sectionOrder() == null ? DEFAULT_SECTION_ORDER : layout.sectionOrder();
        Set<String> hiddenSections = layout == null || layout.hiddenSections() == null ? Set.of() : Set.copyOf(layout.hiddenSections());
        LinkedHashSet<String> ordered = new LinkedHashSet<>();
        for (String section : source) {
            if (DEFAULT_SECTION_ORDER.contains(section)) {
                ordered.add(section);
            }
        }
        ordered.addAll(DEFAULT_SECTION_ORDER);
        return ordered.stream()
            .filter(section -> !hiddenSections.contains(section))
            .toList();
    }

    private List<String> filterSections(List<String> ordered, List<String> allowed) {
        return ordered.stream().filter(allowed::contains).toList();
    }

    private TemplateLayout resolveTemplateLayout(ResumeDetailResponse resume) {
        String layout = resume == null || resume.resolvedTemplate() == null ? null : resume.resolvedTemplate().layout();
        if (isBlank(layout)) {
            layout = switch (resume == null ? "" : valueOrEmpty(resume.templateKey())) {
                case "north-star" -> "classic";
                case "grid-slate" -> "two-column";
                case "ink-flow" -> "editorial";
                default -> "minimal";
            };
        }
        return TemplateLayout.from(layout);
    }

    private String resolveName(ResumeDetailResponse resume) {
        if (resume != null && resume.content() != null && resume.content().personalInfo() != null
            && !isBlank(resume.content().personalInfo().fullName())) {
            return resume.content().personalInfo().fullName();
        }
        return resume == null ? null : resume.title();
    }

    private ExportLanguage resolveLanguage(String languageTag) {
        String candidate = languageTag == null || languageTag.isBlank()
            ? LocaleContextHolder.getLocale().toLanguageTag()
            : languageTag.trim();
        return candidate.toLowerCase(Locale.ROOT).startsWith("en") ? ExportLanguage.EN : ExportLanguage.ZH;
    }

    private boolean hasEducationContent(EducationItem item) {
        return item != null && hasAny(item.school(), item.degree(), item.major(), item.startDate(), item.endDate(), item.description());
    }

    private boolean hasWorkContent(WorkExperienceItem item) {
        return item != null && hasAny(item.company(), item.role(), item.startDate(), item.endDate(), item.description());
    }

    private boolean hasProjectContent(ProjectExperienceItem item) {
        return item != null && hasAny(item.name(), item.role(), item.startDate(), item.endDate(), item.description());
    }

    private boolean hasSkillContent(SkillItem item) {
        return item != null && hasAny(item.name(), item.level());
    }

    private boolean hasHonorContent(HonorItem item) {
        return item != null && hasAny(item.title(), item.issuer(), item.awardedAt(), item.description());
    }

    private boolean hasCertificateContent(CertificateItem item) {
        return item != null && hasAny(item.name(), item.issuer(), item.issuedAt(), item.credentialId());
    }

    private boolean hasAny(String... values) {
        for (String value : values) {
            if (!isBlank(value)) {
                return true;
            }
        }
        return false;
    }

    private String dateRange(String startDate, String endDate) {
        if (isBlank(startDate)) {
            return valueOrEmpty(endDate);
        }
        if (isBlank(endDate)) {
            return startDate.trim();
        }
        return startDate.trim() + DATE_RANGE_SEPARATOR + endDate.trim();
    }

    private String joinParts(String... parts) {
        return String.join(" · ", Arrays.stream(parts)
            .filter(part -> !isBlank(part))
            .map(String::trim)
            .toList());
    }

    private <T> List<T> safeList(List<T> items) {
        return items == null ? List.of() : items;
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private enum HeaderVariant {
        MINIMAL,
        CLASSIC,
        EDITORIAL
    }

    private enum TemplateLayout {
        CLASSIC,
        TWO_COLUMN,
        MINIMAL,
        EDITORIAL;

        static TemplateLayout from(String layout) {
            return switch (valueOrEmptyStatic(layout).toLowerCase(Locale.ROOT)) {
                case "classic" -> CLASSIC;
                case "two-column" -> TWO_COLUMN;
                case "editorial" -> EDITORIAL;
                default -> MINIMAL;
            };
        }

        private static String valueOrEmptyStatic(String value) {
            return value == null ? "" : value.trim();
        }
    }

    private enum ExportLanguage {
        ZH(
            "教育经历",
            "个人简介",
            "工作经历",
            "项目经历",
            "技能",
            "荣誉奖项",
            "资格证书",
            "证书编号："
        ),
        EN(
            "Education",
            "Summary",
            "Work experience",
            "Projects",
            "Skills",
            "Honors",
            "Certificates",
            "Credential ID: "
        );

        private final String educationTitle;
        private final String summaryTitle;
        private final String workExperienceTitle;
        private final String projectExperienceTitle;
        private final String skillsTitle;
        private final String honorsTitle;
        private final String certificatesTitle;
        private final String credentialIdLabel;

        ExportLanguage(
            String educationTitle,
            String summaryTitle,
            String workExperienceTitle,
            String projectExperienceTitle,
            String skillsTitle,
            String honorsTitle,
            String certificatesTitle,
            String credentialIdLabel
        ) {
            this.educationTitle = educationTitle;
            this.summaryTitle = summaryTitle;
            this.workExperienceTitle = workExperienceTitle;
            this.projectExperienceTitle = projectExperienceTitle;
            this.skillsTitle = skillsTitle;
            this.honorsTitle = honorsTitle;
            this.certificatesTitle = certificatesTitle;
            this.credentialIdLabel = credentialIdLabel;
        }

        String educationTitle() {
            return educationTitle;
        }

        String summaryTitle() {
            return summaryTitle;
        }

        String workExperienceTitle() {
            return workExperienceTitle;
        }

        String projectExperienceTitle() {
            return projectExperienceTitle;
        }

        String skillsTitle() {
            return skillsTitle;
        }

        String honorsTitle() {
            return honorsTitle;
        }

        String certificatesTitle() {
            return certificatesTitle;
        }

        String credentialIdLabel() {
            return credentialIdLabel;
        }
    }
}
