package com.smartresume.export.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.util.List;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.junit.jupiter.api.Test;

class MarkdownToDocxRendererTest {

    private final MarkdownToDocxRenderer renderer = new MarkdownToDocxRenderer();

    @Test
    void rendersStrongAndEmphasisRuns() throws IOException {
        try (XWPFDocument document = new XWPFDocument()) {
            renderer.render(document, "**bold** _italic_");

            List<XWPFRun> runs = document.getParagraphs().getFirst().getRuns();
            assertThat(runs).anySatisfy(run -> {
                assertThat(run.text()).isEqualTo("bold");
                assertThat(run.isBold()).isTrue();
            });
            assertThat(runs).anySatisfy(run -> {
                assertThat(run.text()).isEqualTo("italic");
                assertThat(run.isItalic()).isTrue();
            });
        }
    }

    @Test
    void rendersBulletAndOrderedListPrefixes() throws IOException {
        try (XWPFDocument document = new XWPFDocument()) {
            renderer.render(document, "- one\n- two\n\n2. second");

            assertThat(document.getParagraphs())
                .extracting(paragraph -> paragraph.getText())
                .contains("• one", "• two", "2. second");
        }
    }
}
