package com.smartresume.export.service;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.options.Margin;
import com.microsoft.playwright.options.WaitForSelectorState;
import com.microsoft.playwright.options.WaitUntilState;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class PdfDocumentRenderer {

    private static final Logger log = LoggerFactory.getLogger(PdfDocumentRenderer.class);

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
        try {
            ensureBrowser();
            playwrightAvailable = true;
        } catch (Throwable t) {
            log.warn("Playwright is not available, server-side PDF export will be disabled: {}", t.getMessage());
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
            playwright = Playwright.create();
        }
        browser = playwright.chromium().launch(new BrowserType.LaunchOptions().setHeadless(true));
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
