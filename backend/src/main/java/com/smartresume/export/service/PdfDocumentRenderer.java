package com.smartresume.export.service;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.options.Margin;
import com.microsoft.playwright.options.WaitForSelectorState;
import com.microsoft.playwright.options.WaitUntilState;
import jakarta.annotation.PreDestroy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class PdfDocumentRenderer {

    private static final Logger log = LoggerFactory.getLogger(PdfDocumentRenderer.class);
    private static final String PLAYWRIGHT_BROWSERS_PATH = "PLAYWRIGHT_BROWSERS_PATH";
    private static final String PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD";
    private static final String CHROMIUM_REVISION = "1223";
    private static final String CHROMIUM_HEADLESS_SHELL_REVISION = "1223";

    private final int serverPort;
    private Playwright playwright;
    private Browser browser;
    private Boolean playwrightAvailable;

    public PdfDocumentRenderer(@Value("${server.port:8080}") int serverPort) {
        this.serverPort = serverPort;
    }

    public boolean isAvailable() {
        if (!new ClassPathResource("static/export.html").exists()) {
            return false;
        }
        if (playwrightAvailable != null) {
            return playwrightAvailable;
        }
        if (!isChromiumInstalled()) {
            log.warn("Playwright Chromium is not installed, server-side PDF export will be disabled.");
            playwrightAvailable = false;
            return playwrightAvailable;
        }
        try {
            ensureBrowser();
            playwrightAvailable = true;
        } catch (Throwable t) {
            log.warn("Playwright Chromium is not usable, server-side PDF export will be disabled: {}", t.getMessage());
            playwrightAvailable = false;
        }
        return playwrightAvailable;
    }

    public byte[] renderResumePdf(String payloadJson) {
        ensureBrowser();
        try (Page page = browser.newPage()) {
            page.navigate("http://127.0.0.1:" + serverPort + "/export.html",
                new Page.NavigateOptions().setWaitUntil(WaitUntilState.LOAD));

            page.waitForSelector("[data-export-bootstrapped='true']",
                new Page.WaitForSelectorOptions()
                    .setState(WaitForSelectorState.ATTACHED)
                    .setTimeout(10000));

            page.evaluate("(json) => window.smartResumeExportRender(JSON.parse(json))", payloadJson);

            page.waitForSelector("[data-export-ready='true']",
                new Page.WaitForSelectorOptions()
                    .setState(WaitForSelectorState.ATTACHED)
                    .setTimeout(15000));

            return page.pdf(new Page.PdfOptions()
                .setFormat("A4")
                .setPrintBackground(true)
                .setMargin(new Margin()
                    .setTop("0")
                    .setBottom("0")
                    .setLeft("0")
                    .setRight("0")));
        } catch (Exception e) {
            log.error("Failed to render resume pdf", e);
            throw new PdfRenderException("PDF rendering failed", e);
        }
    }

    private synchronized void ensureBrowser() {
        if (browser != null && browser.isConnected()) {
            return;
        }
        if (playwright == null) {
            playwright = Playwright.create(new Playwright.CreateOptions()
                .setEnv(Map.of(PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD, "1")));
        }
        browser = playwright.chromium().launch(new BrowserType.LaunchOptions().setHeadless(true));
    }

    static boolean isChromiumInstalled() {
        return isChromiumInstalled(defaultBrowsersPath());
    }

    static boolean isChromiumInstalled(Path browsersPath) {
        return Files.exists(chromiumInstallMarker(browsersPath))
            && Files.exists(chromiumHeadlessShellInstallMarker(browsersPath));
    }

    static Path chromiumInstallMarker(Path browsersPath) {
        return browsersPath
            .resolve("chromium-" + CHROMIUM_REVISION)
            .resolve("INSTALLATION_COMPLETE");
    }

    static Path chromiumHeadlessShellInstallMarker(Path browsersPath) {
        return browsersPath
            .resolve("chromium_headless_shell-" + CHROMIUM_HEADLESS_SHELL_REVISION)
            .resolve("INSTALLATION_COMPLETE");
    }

    static Path defaultBrowsersPath() {
        String configuredPath = System.getenv(PLAYWRIGHT_BROWSERS_PATH);
        if (configuredPath != null && !configuredPath.isBlank() && !"0".equals(configuredPath)) {
            return Paths.get(configuredPath);
        }
        if ("0".equals(configuredPath)) {
            return Paths.get("node_modules", "playwright-core", ".local-browsers");
        }

        String osName = System.getProperty("os.name", "").toLowerCase();
        String userHome = System.getProperty("user.home");
        if (osName.contains("win")) {
            String localAppData = System.getenv("LOCALAPPDATA");
            if (localAppData != null && !localAppData.isBlank()) {
                return Paths.get(localAppData, "ms-playwright");
            }
            return Paths.get(userHome, "AppData", "Local", "ms-playwright");
        }
        if (osName.contains("mac")) {
            return Paths.get(userHome, "Library", "Caches", "ms-playwright");
        }
        String xdgCacheHome = System.getenv("XDG_CACHE_HOME");
        if (xdgCacheHome != null && !xdgCacheHome.isBlank()) {
            return Paths.get(xdgCacheHome, "ms-playwright");
        }
        return Paths.get(userHome, ".cache", "ms-playwright");
    }

    @PreDestroy
    public void shutdown() {
        if (browser != null) {
            try { browser.close(); } catch (Exception ignored) {}
        }
        if (playwright != null) {
            try { playwright.close(); } catch (Exception ignored) {}
        }
    }

    public static class PdfRenderException extends RuntimeException {
        public PdfRenderException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
