package com.smartresume.resume.service;

import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.memory.AiConversationIdGenerator;
import com.smartresume.ai.memory.AiFeatureType;
import com.smartresume.ai.service.AiChatService;
import com.smartresume.common.exception.AppException;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ResumeImportService {

    private static final int MIN_EXTRACTED_TEXT_LENGTH = 40;
    private static final List<String> SUPPORTED_EXTENSIONS = List.of("pdf", "docx", "txt");
    private static final String IMPORTED_RESUME_FALLBACK_TITLE = "Imported Resume";

    private static final String IMPORT_SYSTEM_PROMPT = """
        You are a professional resume parsing assistant.
        Convert the provided raw resume text into the target structured resume JSON schema.

        Rules:
        - Output must strictly match the JSON schema.
        - Default all textual content to Chinese unless the source resume is clearly in another language.
        - Preserve concrete facts from the source. Do not invent employers, schools, dates, metrics, certificates, skills, or personal details.
        - If a field is unknown, return an empty string or an empty array as appropriate.
        - Keep list ordering aligned with the source resume as much as possible.
        - personalSummary should be concise and resume-ready.
        - skills should be split into distinct skill items when possible.
        - Do not include markdown code fences or extra commentary.
        """;

    private final AiChatService aiChatService;
    private final ResumeContentService resumeContentService;
    private final ResumeService resumeService;

    public ResumeImportService(
        AiChatService aiChatService,
        ResumeContentService resumeContentService,
        ResumeService resumeService
    ) {
        this.aiChatService = aiChatService;
        this.resumeContentService = resumeContentService;
        this.resumeService = resumeService;
    }

    public ResumeDetailResponse importResume(MultipartFile file, String templateKey) {
        if (file == null || file.isEmpty()) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.resume.importFileRequired");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = resolveExtension(originalFilename);
        if (!SUPPORTED_EXTENSIONS.contains(extension)) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.resume.importUnsupportedFileType");
        }

        String extractedText = extractText(file, extension);
        if (!StringUtils.hasText(extractedText) || extractedText.strip().length() < MIN_EXTRACTED_TEXT_LENGTH) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.resume.importInsufficientText");
        }

        String conversationId = AiConversationIdGenerator.generate(null, AiFeatureType.RESUME_IMPORT);
        ResumeContentPayload aiContent = aiChatService.callStructured(
            new AiInvocationRequest(IMPORT_SYSTEM_PROMPT, buildUserMessage(extractedText), conversationId),
            ResumeContentPayload.class
        );

        return resumeService.createResumeFromContent(
            resolveTitle(originalFilename),
            templateKey,
            normalizeImportedContent(aiContent)
        );
    }

    private String buildUserMessage(String extractedText) {
        return "Resume raw text:\n" + extractedText.strip();
    }

    private ResumeContentPayload normalizeImportedContent(ResumeContentPayload content) {
        ResumeContentPayload defaults = resumeContentService.defaultContent();
        ResumeContentPayload source = content == null ? defaults : content;
        PersonalInfo sourcePersonalInfo = source.personalInfo() == null ? defaults.personalInfo() : source.personalInfo();
        return new ResumeContentPayload(
            new PersonalInfo(
                nullToEmpty(sourcePersonalInfo.fullName()),
                nullToEmpty(sourcePersonalInfo.headline()),
                nullToEmpty(sourcePersonalInfo.phone()),
                nullToEmpty(sourcePersonalInfo.email()),
                nullToEmpty(sourcePersonalInfo.city()),
                nullToEmpty(sourcePersonalInfo.website()),
                nullToEmpty(sourcePersonalInfo.expectedSalary()),
                nullToEmpty(sourcePersonalInfo.age()),
                nullToEmpty(sourcePersonalInfo.avatar())
            ),
            nullToEmpty(source.personalSummary()),
            source.education() == null ? List.of() : source.education(),
            source.workExperience() == null ? List.of() : source.workExperience(),
            source.projectExperience() == null ? List.of() : source.projectExperience(),
            source.skills() == null ? List.of() : source.skills(),
            source.honors() == null ? List.of() : source.honors(),
            source.certificates() == null ? List.of() : source.certificates()
        );
    }

    private String extractText(MultipartFile file, String extension) {
        try {
            return switch (extension) {
                case "txt" -> new String(file.getBytes(), StandardCharsets.UTF_8);
                case "pdf" -> extractPdf(file.getInputStream());
                case "docx" -> extractDocx(file.getInputStream());
                default -> throw AppException.of(HttpStatus.BAD_REQUEST, "error.resume.importUnsupportedFileType");
            };
        } catch (IOException exception) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.resume.importReadFailed");
        }
    }

    private String extractPdf(InputStream inputStream) throws IOException {
        try (PDDocument document = Loader.loadPDF(inputStream.readAllBytes())) {
            return new PDFTextStripper().getText(document);
        }
    }

    private String extractDocx(InputStream inputStream) throws IOException {
        try (XWPFDocument document = new XWPFDocument(inputStream);
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }

    private String resolveExtension(String originalFilename) {
        if (!StringUtils.hasText(originalFilename)) {
            return "";
        }
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == originalFilename.length() - 1) {
            return "";
        }
        return originalFilename.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }

    private String resolveTitle(String originalFilename) {
        if (!StringUtils.hasText(originalFilename)) {
            return IMPORTED_RESUME_FALLBACK_TITLE;
        }
        String trimmed = originalFilename.trim();
        int dotIndex = trimmed.lastIndexOf('.');
        String baseName = dotIndex > 0 ? trimmed.substring(0, dotIndex) : trimmed;
        return StringUtils.hasText(baseName) ? baseName : IMPORTED_RESUME_FALLBACK_TITLE;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
