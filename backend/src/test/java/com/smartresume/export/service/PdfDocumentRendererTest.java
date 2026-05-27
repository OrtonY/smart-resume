package com.smartresume.export.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class PdfDocumentRendererTest {

    @TempDir
    Path tempDir;

    @Test
    void chromiumInstallMarkerUsesPlaywrightRevisionDirectory() {
        Path marker = PdfDocumentRenderer.chromiumInstallMarker(tempDir);

        assertThat(marker)
            .isEqualTo(tempDir.resolve("chromium-1223").resolve("INSTALLATION_COMPLETE"));
    }

    @Test
    void chromiumHeadlessShellInstallMarkerUsesPlaywrightRevisionDirectory() {
        Path marker = PdfDocumentRenderer.chromiumHeadlessShellInstallMarker(tempDir);

        assertThat(marker)
            .isEqualTo(tempDir.resolve("chromium_headless_shell-1223").resolve("INSTALLATION_COMPLETE"));
    }

    @Test
    void chromiumInstalledWhenRequiredMarkersExist() throws IOException {
        createMarker(PdfDocumentRenderer.chromiumInstallMarker(tempDir));
        createMarker(PdfDocumentRenderer.chromiumHeadlessShellInstallMarker(tempDir));

        assertThat(PdfDocumentRenderer.isChromiumInstalled(tempDir)).isTrue();
    }

    @Test
    void chromiumMissingWhenMarkerDoesNotExist() {
        assertThat(PdfDocumentRenderer.isChromiumInstalled(tempDir)).isFalse();
    }

    @Test
    void chromiumMissingWhenHeadlessShellMarkerDoesNotExist() throws IOException {
        createMarker(PdfDocumentRenderer.chromiumInstallMarker(tempDir));

        assertThat(PdfDocumentRenderer.isChromiumInstalled(tempDir)).isFalse();
    }

    private void createMarker(Path marker) throws IOException {
        Files.createDirectories(marker.getParent());
        Files.createFile(marker);
    }
}
