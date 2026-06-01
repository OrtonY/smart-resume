package com.smartresume.export.service;

import org.apache.poi.xwpf.usermodel.XWPFRun;

final class DocxFonts {

    static final String LATIN = "Arial";
    static final String EAST_ASIA = "Microsoft YaHei";
    static final String TITLE_COLOR = "111827";
    static final String SECONDARY_COLOR = "6B7280";
    static final String BODY_COLOR = "374151";
    static final String MUTED_COLOR = "4B5563";
    static final String BORDER_COLOR = "D1D5DB";

    private DocxFonts() {
    }

    static void applyTitle(XWPFRun run) {
        apply(run, 28, TITLE_COLOR, true);
    }

    static void applyTitle(XWPFRun run, String color) {
        apply(run, 28, color, true);
    }

    static void applySubtitle(XWPFRun run) {
        apply(run, 11, SECONDARY_COLOR, false);
    }

    static void applySubtitle(XWPFRun run, String color) {
        apply(run, 11, color, false);
    }

    static void applyContactLabel(XWPFRun run) {
        apply(run, 9, SECONDARY_COLOR, false);
    }

    static void applyContactLabel(XWPFRun run, String color) {
        apply(run, 9, color, false);
    }

    static void applyContactValue(XWPFRun run) {
        apply(run, 10, BODY_COLOR, true);
    }

    static void applyContactValue(XWPFRun run, String color) {
        apply(run, 10, color, true);
    }

    static void applySectionTitle(XWPFRun run) {
        apply(run, 13, TITLE_COLOR, true);
    }

    static void applySectionTitle(XWPFRun run, String color) {
        apply(run, 13, color, true);
    }

    static void applyItemPrimary(XWPFRun run) {
        apply(run, 12, TITLE_COLOR, true);
    }

    static void applyItemSecondary(XWPFRun run) {
        apply(run, 12, SECONDARY_COLOR, false);
    }

    static void applyDate(XWPFRun run) {
        apply(run, 10, SECONDARY_COLOR, true);
    }

    static void applyBody(XWPFRun run) {
        apply(run, 10, BODY_COLOR, false);
    }

    static void applyMutedBody(XWPFRun run) {
        apply(run, 10, MUTED_COLOR, false);
    }

    static void applyBullet(XWPFRun run) {
        apply(run, 10, BODY_COLOR, false);
    }

    private static void apply(XWPFRun run, int fontSize, String color, boolean bold) {
        run.setFontFamily(LATIN);
        run.setFontFamily(EAST_ASIA, XWPFRun.FontCharRange.eastAsia);
        run.setFontSize(fontSize);
        if (color != null && !color.isBlank()) {
            run.setColor(color);
        }
        run.setBold(bold);
    }
}
