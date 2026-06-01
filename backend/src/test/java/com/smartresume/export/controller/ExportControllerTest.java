package com.smartresume.export.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

class ExportControllerTest {

    @Test
    void buildPdfResponseUsesAsciiFallbackForUnicodeFilename() {
        ResponseEntity<byte[]> response = ExportController.buildPdfResponse(new byte[] {1, 2, 3}, "\u6211\u7684\u7b80\u5386");

        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
            .isEqualTo("attachment; filename=\"resume.pdf\"; filename*=UTF-8''%E6%88%91%E7%9A%84%E7%AE%80%E5%8E%86.pdf");
        assertThat(response.getHeaders().getContentLength()).isEqualTo(3);
    }

    @Test
    void buildPdfResponseKeepsAsciiFilenameWhenPossible() {
        ResponseEntity<byte[]> response = ExportController.buildPdfResponse(new byte[] {1}, "Resume 2026");

        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
            .isEqualTo("attachment; filename=\"Resume 2026.pdf\"; filename*=UTF-8''Resume%202026.pdf");
    }

    @Test
    void buildDocxResponseUsesAsciiFallbackForUnicodeFilename() {
        ResponseEntity<byte[]> response = ExportController.buildDocxResponse(new byte[] {1, 2, 3}, "\u6211\u7684\u7b80\u5386");

        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
            .isEqualTo("attachment; filename=\"resume.docx\"; filename*=UTF-8''%E6%88%91%E7%9A%84%E7%AE%80%E5%8E%86.docx");
        assertThat(response.getHeaders().getContentType().toString())
            .isEqualTo("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        assertThat(response.getHeaders().getContentLength()).isEqualTo(3);
    }

    @Test
    void buildDocxResponseKeepsAsciiFilenameWhenPossible() {
        ResponseEntity<byte[]> response = ExportController.buildDocxResponse(new byte[] {1}, "Resume 2026");

        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
            .isEqualTo("attachment; filename=\"Resume 2026.docx\"; filename*=UTF-8''Resume%202026.docx");
    }

    @Test
    void buildDocxResponseFallsBackForBlankTitle() {
        ResponseEntity<byte[]> response = ExportController.buildDocxResponse(new byte[] {1}, "   ");

        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
            .isEqualTo("attachment; filename=\"resume.docx\"; filename*=UTF-8''resume.docx");
    }
}
