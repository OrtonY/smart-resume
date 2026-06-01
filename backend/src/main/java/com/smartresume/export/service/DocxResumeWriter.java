package com.smartresume.export.service;

import java.io.ByteArrayInputStream;
import java.math.BigInteger;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.util.Units;
import org.apache.poi.xwpf.usermodel.Borders;
import org.apache.poi.xwpf.usermodel.Document;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.TableWidthType;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTP;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPageMar;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPageSz;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTSectPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTShd;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTabStop;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTabs;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblGrid;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STShd;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STTabJc;

public class DocxResumeWriter {

    static final int A4_WIDTH_TWIPS = 11906;
    static final int A4_HEIGHT_TWIPS = 16838;
    static final int PAGE_MARGIN_TWIPS = 720;
    static final int CONTENT_RIGHT_EDGE_TWIPS = A4_WIDTH_TWIPS - PAGE_MARGIN_TWIPS * 2;

    private static final int HEADER_SHADING_PADDING_TWIPS = 180;
    private static final int CONTACT_COLUMN_WIDTH_TWIPS = 1500;
    private static final int CONTACT_COLUMN_GAP_TWIPS = 420;
    private static final int HEADER_AVATAR_COLUMN_TWIPS = 1720;
    private static final int HEADER_TEXT_COLUMN_TWIPS = CONTENT_RIGHT_EDGE_TWIPS - HEADER_AVATAR_COLUMN_TWIPS;
    private static final int LIST_INDENT_LEFT_TWIPS = 220;
    private static final int LIST_HANGING_TWIPS = 180;
    private static final int TABLE_CELL_MARGIN_TWIPS = 180;
    private static final int AVATAR_SIZE_EMU = Units.toEMU(72);
    private static final int SIDEBAR_WIDTH_TWIPS = 3300;
    private static final int MAIN_WIDTH_TWIPS = CONTENT_RIGHT_EDGE_TWIPS - SIDEBAR_WIDTH_TWIPS;
    private static final int EDITORIAL_NOTES_WIDTH_TWIPS = 3300;
    private static final int EDITORIAL_MAIN_WIDTH_TWIPS = CONTENT_RIGHT_EDGE_TWIPS - EDITORIAL_NOTES_WIDTH_TWIPS;
    private static final String MINIMAL_HEADER_FILL = "F8FAFC";
    private static final String CLASSIC_HEADER_FILL = "3157A4";
    private static final String CLASSIC_HEADER_TEXT = "FFFFFF";
    private static final String CLASSIC_HEADER_MUTED = "D9E2F3";
    private static final String SPLIT_SIDEBAR_FILL = "FFF2E8";
    private static final String EDITORIAL_HEADER_FILL = "392F5A";
    private static final String EDITORIAL_HEADER_TEXT = "F8F3FF";
    private static final String EDITORIAL_HEADER_MUTED = "D8CFF0";
    private static final String EDITORIAL_PANEL_FILL = "FFFFFF";

    public void configureDocument(XWPFDocument document) {
        CTSectPr section = document.getDocument().getBody().isSetSectPr()
            ? document.getDocument().getBody().getSectPr()
            : document.getDocument().getBody().addNewSectPr();
        CTPageSz pageSize = section.isSetPgSz() ? section.getPgSz() : section.addNewPgSz();
        pageSize.setW(BigInteger.valueOf(A4_WIDTH_TWIPS));
        pageSize.setH(BigInteger.valueOf(A4_HEIGHT_TWIPS));
        CTPageMar pageMargin = section.isSetPgMar() ? section.getPgMar() : section.addNewPgMar();
        pageMargin.setTop(BigInteger.valueOf(PAGE_MARGIN_TWIPS));
        pageMargin.setRight(BigInteger.valueOf(PAGE_MARGIN_TWIPS));
        pageMargin.setBottom(BigInteger.valueOf(PAGE_MARGIN_TWIPS));
        pageMargin.setLeft(BigInteger.valueOf(PAGE_MARGIN_TWIPS));
    }

    public void writeName(XWPFDocument document, String name) {
        XWPFParagraph paragraph = document.createParagraph();
        configureHeaderParagraph(paragraph, MINIMAL_HEADER_FILL);
        paragraph.setSpacingBefore(0);
        paragraph.setSpacingAfter(240);
        XWPFRun run = paragraph.createRun();
        DocxFonts.applyTitle(run);
        run.setText(isBlank(name) ? "Resume" : name.trim());
    }

    public void writeMasthead(
        XWPFDocument document,
        String name,
        String subtitle,
        List<ContactItem> contactItems,
        String avatar
    ) {
        writeMasthead(document, name, subtitle, contactItems, avatar, MINIMAL_HEADER_FILL, null, null, null);
    }

    public void writeClassicMasthead(
        XWPFDocument document,
        String name,
        String subtitle,
        List<ContactItem> contactItems,
        String avatar
    ) {
        writeMasthead(
            document,
            name,
            subtitle,
            contactItems,
            avatar,
            CLASSIC_HEADER_FILL,
            CLASSIC_HEADER_TEXT,
            CLASSIC_HEADER_MUTED,
            CLASSIC_HEADER_TEXT
        );
    }

    public void writeEditorialMasthead(
        XWPFDocument document,
        String name,
        String subtitle,
        List<ContactItem> contactItems,
        String avatar
    ) {
        writeMasthead(
            document,
            name,
            subtitle,
            contactItems,
            avatar,
            EDITORIAL_HEADER_FILL,
            EDITORIAL_HEADER_TEXT,
            EDITORIAL_HEADER_MUTED,
            EDITORIAL_HEADER_TEXT
        );
    }

    public void writeClassicName(XWPFDocument document, String name) {
        XWPFParagraph paragraph = document.createParagraph();
        configureHeaderParagraph(paragraph, CLASSIC_HEADER_FILL);
        paragraph.setSpacingBefore(160);
        paragraph.setSpacingAfter(240);
        XWPFRun run = paragraph.createRun();
        DocxFonts.applyTitle(run, CLASSIC_HEADER_TEXT);
        run.setText(isBlank(name) ? "Resume" : name.trim());
    }

    public void writeEditorialName(XWPFDocument document, String name) {
        XWPFParagraph paragraph = document.createParagraph();
        configureHeaderParagraph(paragraph, EDITORIAL_HEADER_FILL);
        paragraph.setSpacingBefore(160);
        paragraph.setSpacingAfter(240);
        XWPFRun run = paragraph.createRun();
        DocxFonts.applyTitle(run);
        run.setText(isBlank(name) ? "Resume" : name.trim());
    }

    public void writeSubtitle(XWPFDocument document, String subtitle) {
        if (isBlank(subtitle)) {
            return;
        }
        XWPFParagraph paragraph = document.createParagraph();
        configureHeaderParagraph(paragraph, MINIMAL_HEADER_FILL);
        paragraph.setSpacingAfter(260);
        XWPFRun run = paragraph.createRun();
        DocxFonts.applySubtitle(run);
        run.setText(subtitle.trim());
    }

    public void writeClassicSubtitle(XWPFDocument document, String subtitle) {
        writeHeaderSubtitle(document, subtitle, CLASSIC_HEADER_FILL, CLASSIC_HEADER_MUTED);
    }

    public void writeEditorialSubtitle(XWPFDocument document, String subtitle) {
        writeHeaderSubtitle(document, subtitle, EDITORIAL_HEADER_FILL, null);
    }

    public void writeContactGrid(XWPFDocument document, List<ContactItem> items) {
        writeContactGrid(document, items, MINIMAL_HEADER_FILL, null, null);
    }

    public void writeClassicContactGrid(XWPFDocument document, List<ContactItem> items) {
        writeContactGrid(document, items, CLASSIC_HEADER_FILL, CLASSIC_HEADER_MUTED, CLASSIC_HEADER_TEXT);
    }

    public void writeEditorialContactGrid(XWPFDocument document, List<ContactItem> items) {
        writeContactGrid(document, items, EDITORIAL_HEADER_FILL, null, null);
    }

    private void writeContactGrid(
        XWPFDocument document,
        List<ContactItem> items,
        String fill,
        String labelColor,
        String valueColor
    ) {
        List<ContactItem> visibleItems = items.stream()
            .filter(item -> item != null && !isBlank(item.value()))
            .toList();
        if (visibleItems.isEmpty()) {
            return;
        }
        for (int start = 0; start < visibleItems.size(); start += 3) {
            int end = Math.min(start + 3, visibleItems.size());
            writeContactLabelRow(document, visibleItems.subList(start, end), start == 0 ? 0 : 180, fill, labelColor);
            writeContactValueRow(document, visibleItems.subList(start, end), fill, valueColor);
        }
        XWPFParagraph spacer = document.createParagraph();
        configureHeaderParagraph(spacer, fill);
        spacer.setSpacingAfter(250);
    }

    public void writeSplitHeaderCell(XWPFTableCell cell, String name, String subtitle, String avatar) {
        configureCell(cell, SPLIT_SIDEBAR_FILL, SIDEBAR_WIDTH_TWIPS);
        writeAvatar(cell, avatar, ParagraphAlignment.LEFT);
        XWPFParagraph nameParagraph = addCellParagraph(cell);
        nameParagraph.setSpacingBefore(160);
        nameParagraph.setSpacingAfter(170);
        XWPFRun nameRun = nameParagraph.createRun();
        DocxFonts.applyTitle(nameRun);
        nameRun.setText(isBlank(name) ? "Resume" : name.trim());

        if (!isBlank(subtitle)) {
            XWPFParagraph subtitleParagraph = addCellParagraph(cell);
            subtitleParagraph.setSpacingAfter(220);
            XWPFRun subtitleRun = subtitleParagraph.createRun();
            DocxFonts.applySubtitle(subtitleRun);
            subtitleRun.setText(subtitle.trim());
        }
    }

    public void writeContactStack(XWPFTableCell cell, List<ContactItem> items) {
        List<ContactItem> visibleItems = items.stream()
            .filter(item -> item != null && !isBlank(item.value()))
            .toList();
        if (visibleItems.isEmpty()) {
            return;
        }
        for (ContactItem item : visibleItems) {
            XWPFParagraph labelParagraph = addCellParagraph(cell);
            labelParagraph.setSpacingBefore(80);
            labelParagraph.setSpacingAfter(20);
            XWPFRun labelRun = labelParagraph.createRun();
            DocxFonts.applyContactLabel(labelRun);
            labelRun.setText(item.label());

            XWPFParagraph valueParagraph = addCellParagraph(cell);
            valueParagraph.setSpacingAfter(100);
            XWPFRun valueRun = valueParagraph.createRun();
            DocxFonts.applyContactValue(valueRun);
            valueRun.setText(item.value().trim());
        }
    }

    public void writeEditorialSummaryPanel(XWPFDocument document, String title, String summary, MarkdownToDocxRenderer renderer) {
        if (isBlank(summary)) {
            return;
        }
        XWPFTableCell cell = insertPanelCell(document, EDITORIAL_PANEL_FILL, CONTENT_RIGHT_EDGE_TWIPS);

        XWPFParagraph titleParagraph = addCellParagraph(cell);
        titleParagraph.setSpacingAfter(140);
        XWPFRun titleRun = titleParagraph.createRun();
        DocxFonts.applySectionTitle(titleRun);
        titleRun.setText(title);

        renderer.render(cell, summary);
    }

    public XWPFTable createSplitTable(XWPFDocument document, String sidebarFill) {
        XWPFTable table = document.createTable(1, 2);
        table.removeBorders();
        table.setWidthType(TableWidthType.DXA);
        table.setWidth(CONTENT_RIGHT_EDGE_TWIPS);
        setTableGrid(table, SIDEBAR_WIDTH_TWIPS, MAIN_WIDTH_TWIPS);
        table.setCellMargins(TABLE_CELL_MARGIN_TWIPS, TABLE_CELL_MARGIN_TWIPS, TABLE_CELL_MARGIN_TWIPS, TABLE_CELL_MARGIN_TWIPS);
        XWPFTableRow row = table.getRow(0);
        configureCell(row.getCell(0), sidebarFill, SIDEBAR_WIDTH_TWIPS);
        configureCell(row.getCell(1), null, MAIN_WIDTH_TWIPS);
        return table;
    }

    public XWPFTable createEditorialTable(XWPFDocument document) {
        XWPFTable table = document.createTable(1, 2);
        table.removeBorders();
        table.setWidthType(TableWidthType.DXA);
        table.setWidth(CONTENT_RIGHT_EDGE_TWIPS);
        setTableGrid(table, EDITORIAL_MAIN_WIDTH_TWIPS, EDITORIAL_NOTES_WIDTH_TWIPS);
        table.setCellMargins(TABLE_CELL_MARGIN_TWIPS, TABLE_CELL_MARGIN_TWIPS, TABLE_CELL_MARGIN_TWIPS, TABLE_CELL_MARGIN_TWIPS);
        XWPFTableRow row = table.getRow(0);
        configureCell(row.getCell(0), null, EDITORIAL_MAIN_WIDTH_TWIPS);
        configureCell(row.getCell(1), null, EDITORIAL_NOTES_WIDTH_TWIPS);
        return table;
    }

    public void writeSectionTitle(XWPFDocument document, String title) {
        if (isBlank(title)) {
            return;
        }
        writeSectionTitle(document::createParagraph, title);
    }

    public void writeSectionTitle(XWPFTableCell cell, String title) {
        if (isBlank(title)) {
            return;
        }
        writeSectionTitle(() -> addCellParagraph(cell), title);
    }

    private void writeSectionTitle(MarkdownToDocxRenderer.ParagraphSink sink, String title) {
        XWPFParagraph paragraph = sink.createParagraph();
        paragraph.setSpacingBefore(180);
        paragraph.setSpacingAfter(120);
        paragraph.setKeepNext(true);
        paragraph.setBorderBottom(Borders.SINGLE);
        XWPFRun run = paragraph.createRun();
        DocxFonts.applySectionTitle(run);
        run.setText(title.trim());
    }

    public void writeItemHeader(XWPFDocument document, String primary, String secondary, String right) {
        if (isBlank(primary) && isBlank(secondary) && isBlank(right)) {
            return;
        }
        writeItemHeader(document::createParagraph, primary, secondary, right);
    }

    public void writeInlineItemHeader(XWPFDocument document, String primary, String secondary, String right) {
        if (isBlank(primary) && isBlank(secondary) && isBlank(right)) {
            return;
        }
        writeItemHeader(document::createParagraph, primary, secondary, right);
    }

    public void writeStackedItemHeader(XWPFDocument document, String primary, String secondary, String right) {
        if (isBlank(primary) && isBlank(secondary) && isBlank(right)) {
            return;
        }
        writeStackedItemHeader(document::createParagraph, CONTENT_RIGHT_EDGE_TWIPS, primary, secondary, right);
    }

    public void writeItemHeader(XWPFTableCell cell, String primary, String secondary, String right) {
        if (isBlank(primary) && isBlank(secondary) && isBlank(right)) {
            return;
        }
        XWPFParagraph paragraph = addCellParagraph(cell);
        configureItemParagraph(paragraph);
        paragraph.setKeepNext(true);
        if (!isBlank(primary)) {
            XWPFRun primaryRun = paragraph.createRun();
            DocxFonts.applyItemPrimary(primaryRun);
            primaryRun.setText(primary.trim());
        }
        if (!isBlank(secondary)) {
            XWPFRun secondaryRun = paragraph.createRun();
            DocxFonts.applyItemSecondary(secondaryRun);
            secondaryRun.setText((isBlank(primary) ? "" : "  ") + secondary.trim());
        }
        if (!isBlank(right)) {
            XWPFRun dateRun = paragraph.createRun();
            DocxFonts.applyDate(dateRun);
            dateRun.setText((isBlank(primary) && isBlank(secondary) ? "" : "  ") + right.trim());
        }
    }

    public void writeInlineItemHeader(XWPFTableCell cell, String primary, String secondary, String right) {
        if (isBlank(primary) && isBlank(secondary) && isBlank(right)) {
            return;
        }
        writeItemHeader(cell, primary, secondary, right);
    }

    public void writeStackedItemHeader(XWPFTableCell cell, String primary, String secondary, String right) {
        if (isBlank(primary) && isBlank(secondary) && isBlank(right)) {
            return;
        }
        writeStackedItemHeader(() -> addCellParagraph(cell), cellWidth(cell, CONTENT_RIGHT_EDGE_TWIPS), primary, secondary, right);
    }

    private void writeItemHeader(MarkdownToDocxRenderer.ParagraphSink sink, String primary, String secondary, String right) {
        XWPFParagraph paragraph = sink.createParagraph();
        configureItemParagraph(paragraph);
        paragraph.setKeepNext(true);
        addRightTabStop(paragraph);
        if (!isBlank(primary)) {
            XWPFRun primaryRun = paragraph.createRun();
            DocxFonts.applyItemPrimary(primaryRun);
            primaryRun.setText(primary.trim());
        }
        if (!isBlank(secondary)) {
            XWPFRun secondaryRun = paragraph.createRun();
            DocxFonts.applyItemSecondary(secondaryRun);
            secondaryRun.setText((isBlank(primary) ? "" : "  ") + secondary.trim());
        }
        if (!isBlank(right)) {
            XWPFRun rightRun = paragraph.createRun();
            DocxFonts.applyDate(rightRun);
            rightRun.addTab();
            rightRun.setText(right.trim());
        }
    }

    private void writeStackedItemHeader(
        MarkdownToDocxRenderer.ParagraphSink sink,
        int rightEdgeTwips,
        String primary,
        String secondary,
        String right
    ) {
        XWPFParagraph primaryParagraph = sink.createParagraph();
        configureItemParagraph(primaryParagraph);
        primaryParagraph.setKeepNext(true);
        addRightTabStop(primaryParagraph, rightEdgeTwips);
        if (!isBlank(primary)) {
            XWPFRun primaryRun = primaryParagraph.createRun();
            DocxFonts.applyItemPrimary(primaryRun);
            primaryRun.setText(primary.trim());
        }
        if (!isBlank(right)) {
            XWPFRun rightRun = primaryParagraph.createRun();
            DocxFonts.applyDate(rightRun);
            rightRun.addTab();
            rightRun.setText(right.trim());
        }
        if (!isBlank(secondary)) {
            XWPFParagraph secondaryParagraph = sink.createParagraph();
            secondaryParagraph.setSpacingBefore(0);
            secondaryParagraph.setSpacingAfter(60);
            secondaryParagraph.setKeepNext(true);
            XWPFRun secondaryRun = secondaryParagraph.createRun();
            DocxFonts.applyItemSecondary(secondaryRun);
            secondaryRun.setText(secondary.trim());
        }
    }

    public void writeBodyLine(XWPFDocument document, String text) {
        if (isBlank(text)) {
            return;
        }
        writeBodyLine(document::createParagraph, text);
    }

    public void writeBodyLine(XWPFTableCell cell, String text) {
        if (isBlank(text)) {
            return;
        }
        writeBodyLine(() -> addCellParagraph(cell), text);
    }

    private void writeBodyLine(MarkdownToDocxRenderer.ParagraphSink sink, String text) {
        XWPFParagraph paragraph = sink.createParagraph();
        configureBodyParagraph(paragraph);
        XWPFRun run = paragraph.createRun();
        DocxFonts.applyBody(run);
        run.setText(text.trim());
    }

    static void configureBodyParagraph(XWPFParagraph paragraph) {
        paragraph.setSpacingBefore(0);
        paragraph.setSpacingAfter(70);
        paragraph.setSpacingBetween(1.12);
    }

    static void configureListParagraph(XWPFParagraph paragraph, int depth) {
        configureBodyParagraph(paragraph);
        paragraph.setIndentationLeft(LIST_INDENT_LEFT_TWIPS + Math.max(0, depth) * 360);
        paragraph.setIndentationHanging(LIST_HANGING_TWIPS);
    }

    private void writeHeaderSubtitle(XWPFDocument document, String subtitle, String fill, String color) {
        if (isBlank(subtitle)) {
            return;
        }
        XWPFParagraph paragraph = document.createParagraph();
        configureHeaderParagraph(paragraph, fill);
        paragraph.setSpacingAfter(260);
        XWPFRun run = paragraph.createRun();
        DocxFonts.applySubtitle(run, color);
        run.setText(subtitle.trim());
    }

    private void writeMasthead(
        XWPFDocument document,
        String name,
        String subtitle,
        List<ContactItem> contactItems,
        String avatar,
        String fill,
        String titleColor,
        String mutedColor,
        String valueColor
    ) {
        XWPFTable table = document.createTable(1, 2);
        table.removeBorders();
        table.setWidthType(TableWidthType.DXA);
        table.setWidth(CONTENT_RIGHT_EDGE_TWIPS);
        setTableGrid(table, HEADER_TEXT_COLUMN_TWIPS, HEADER_AVATAR_COLUMN_TWIPS);
        table.setCellMargins(220, 220, 220, 220);

        XWPFTableRow row = table.getRow(0);
        XWPFTableCell textCell = row.getCell(0);
        XWPFTableCell avatarCell = row.getCell(1);
        configureCell(textCell, fill, HEADER_TEXT_COLUMN_TWIPS);
        configureCell(avatarCell, fill, HEADER_AVATAR_COLUMN_TWIPS);
        avatarCell.setVerticalAlignment(XWPFTableCell.XWPFVertAlign.CENTER);

        XWPFParagraph nameParagraph = addCellParagraph(textCell);
        nameParagraph.setSpacingBefore(80);
        nameParagraph.setSpacingAfter(180);
        XWPFRun nameRun = nameParagraph.createRun();
        DocxFonts.applyTitle(nameRun, titleColor);
        nameRun.setText(isBlank(name) ? "Resume" : name.trim());

        if (!isBlank(subtitle)) {
            XWPFParagraph subtitleParagraph = addCellParagraph(textCell);
            subtitleParagraph.setSpacingAfter(220);
            XWPFRun subtitleRun = subtitleParagraph.createRun();
            DocxFonts.applySubtitle(subtitleRun, mutedColor);
            subtitleRun.setText(subtitle.trim());
        }
        writeContactGrid(textCell, contactItems, mutedColor, valueColor, HEADER_TEXT_COLUMN_TWIPS);
        writeAvatar(avatarCell, avatar, ParagraphAlignment.CENTER);
    }

    private void writeContactLabelRow(
        XWPFDocument document,
        List<ContactItem> items,
        int spacingBefore,
        String fill,
        String color
    ) {
        XWPFParagraph paragraph = document.createParagraph();
        configureContactParagraph(paragraph, fill);
        paragraph.setSpacingBefore(spacingBefore);
        for (int index = 0; index < items.size(); index++) {
            if (index > 0) {
                paragraph.createRun().addTab();
            }
            XWPFRun run = paragraph.createRun();
            DocxFonts.applyContactLabel(run, color);
            run.setText(items.get(index).label());
        }
    }

    private void writeContactValueRow(XWPFDocument document, List<ContactItem> items, String fill, String color) {
        XWPFParagraph paragraph = document.createParagraph();
        configureContactParagraph(paragraph, fill);
        paragraph.setSpacingAfter(0);
        for (int index = 0; index < items.size(); index++) {
            if (index > 0) {
                paragraph.createRun().addTab();
            }
            XWPFRun run = paragraph.createRun();
            DocxFonts.applyContactValue(run, color);
            run.setText(items.get(index).value().trim());
        }
    }

    private void configureHeaderParagraph(XWPFParagraph paragraph, String fill) {
        paragraph.setAlignment(ParagraphAlignment.LEFT);
        paragraph.setIndentationLeft(HEADER_SHADING_PADDING_TWIPS);
        applyShading(paragraph, fill);
    }

    private void configureContactParagraph(XWPFParagraph paragraph, String fill) {
        configureHeaderParagraph(paragraph, fill);
        paragraph.setSpacingAfter(80);
        addContactTabStops(paragraph);
    }

    private void configureItemParagraph(XWPFParagraph paragraph) {
        configureBodyParagraph(paragraph);
        paragraph.setSpacingBefore(70);
    }

    private void addContactTabStops(XWPFParagraph paragraph) {
        CTTabs tabs = ensureTabs(paragraph);
        for (int column = 1; column < 3; column++) {
            CTTabStop tabStop = tabs.addNewTab();
            tabStop.setVal(STTabJc.LEFT);
            tabStop.setPos(BigInteger.valueOf(column * (CONTACT_COLUMN_WIDTH_TWIPS + CONTACT_COLUMN_GAP_TWIPS)));
        }
    }

    private void addContactTabStops(XWPFParagraph paragraph, int columnCount, int availableWidthTwips) {
        CTTabs tabs = ensureTabs(paragraph);
        int visibleColumns = Math.max(1, columnCount);
        int columnWidth = availableWidthTwips / visibleColumns;
        for (int column = 1; column < visibleColumns; column++) {
            CTTabStop tabStop = tabs.addNewTab();
            tabStop.setVal(STTabJc.LEFT);
            tabStop.setPos(BigInteger.valueOf(column * columnWidth));
        }
    }

    private static void addRightTabStop(XWPFParagraph paragraph) {
        addRightTabStop(paragraph, CONTENT_RIGHT_EDGE_TWIPS);
    }

    private static void addRightTabStop(XWPFParagraph paragraph, int rightEdgeTwips) {
        CTTabStop tabStop = ensureTabs(paragraph).addNewTab();
        tabStop.setVal(STTabJc.RIGHT);
        tabStop.setPos(BigInteger.valueOf(Math.max(1200, rightEdgeTwips)));
    }

    private static CTTabs ensureTabs(XWPFParagraph paragraph) {
        CTP ctp = paragraph.getCTP();
        CTPPr properties = ctp.isSetPPr() ? ctp.getPPr() : ctp.addNewPPr();
        return properties.isSetTabs() ? properties.getTabs() : properties.addNewTabs();
    }

    private XWPFTableCell insertPanelCell(XWPFDocument document, String fill, int widthTwips) {
        XWPFTable table = document.createTable(1, 1);
        table.removeBorders();
        table.setWidthType(TableWidthType.DXA);
        table.setWidth(widthTwips);
        table.setCellMargins(0, 0, 0, 0);
        XWPFTableCell cell = table.getRow(0).getCell(0);
        configureCell(cell, fill, widthTwips);
        return cell;
    }

    private XWPFParagraph addCellParagraph(XWPFTableCell cell) {
        if (cell.getParagraphs().size() == 1 && cell.getParagraphs().getFirst().getText().isBlank()) {
            return cell.getParagraphs().getFirst();
        }
        return cell.addParagraph();
    }

    private void writeContactGrid(
        XWPFTableCell cell,
        List<ContactItem> items,
        String labelColor,
        String valueColor,
        int availableWidthTwips
    ) {
        List<ContactItem> visibleItems = items.stream()
            .filter(item -> item != null && !isBlank(item.value()))
            .toList();
        if (visibleItems.isEmpty()) {
            return;
        }
        int columnCount = Math.min(visibleItems.size(), 6);
        XWPFParagraph labelParagraph = addCellParagraph(cell);
        labelParagraph.setSpacingAfter(40);
        addContactTabStops(labelParagraph, columnCount, availableWidthTwips);
        XWPFParagraph valueParagraph = addCellParagraph(cell);
        valueParagraph.setSpacingAfter(80);
        addContactTabStops(valueParagraph, columnCount, availableWidthTwips);
        for (int index = 0; index < visibleItems.size(); index++) {
            if (index > 0) {
                labelParagraph.createRun().addTab();
                valueParagraph.createRun().addTab();
            }
            XWPFRun labelRun = labelParagraph.createRun();
            DocxFonts.applyContactLabel(labelRun, labelColor);
            labelRun.setText(visibleItems.get(index).label());

            XWPFRun valueRun = valueParagraph.createRun();
            DocxFonts.applyContactValue(valueRun, valueColor);
            valueRun.setText(visibleItems.get(index).value().trim());
        }
    }

    private void writeAvatar(XWPFTableCell cell, String avatar, ParagraphAlignment alignment) {
        AvatarImage image = decodeAvatar(avatar);
        if (image == null) {
            return;
        }
        XWPFParagraph paragraph = addCellParagraph(cell);
        paragraph.setAlignment(alignment);
        paragraph.setSpacingAfter(140);
        XWPFRun run = paragraph.createRun();
        try (ByteArrayInputStream input = new ByteArrayInputStream(image.bytes())) {
            run.addPicture(input, image.pictureType(), image.filename(), AVATAR_SIZE_EMU, AVATAR_SIZE_EMU);
        } catch (InvalidFormatException | java.io.IOException exception) {
            // Invalid user-provided avatar data should not fail the entire export.
        }
    }

    private AvatarImage decodeAvatar(String avatar) {
        if (isBlank(avatar)) {
            return null;
        }
        String trimmed = avatar.trim();
        if (!trimmed.startsWith("data:image/")) {
            return null;
        }
        int separator = trimmed.indexOf(',');
        if (separator < 0 || !trimmed.substring(0, separator).toLowerCase(Locale.ROOT).contains(";base64")) {
            return null;
        }
        String mediaType = trimmed.substring(5, separator).split(";")[0].toLowerCase(Locale.ROOT);
        int pictureType = pictureType(mediaType);
        if (pictureType == -1) {
            return null;
        }
        try {
            byte[] bytes = Base64.getDecoder().decode(trimmed.substring(separator + 1));
            return new AvatarImage(bytes, pictureType, "avatar." + extension(mediaType));
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private int pictureType(String mediaType) {
        return switch (mediaType) {
            case "image/png" -> Document.PICTURE_TYPE_PNG;
            case "image/jpeg", "image/jpg" -> Document.PICTURE_TYPE_JPEG;
            case "image/gif" -> Document.PICTURE_TYPE_GIF;
            default -> -1;
        };
    }

    private String extension(String mediaType) {
        return switch (mediaType) {
            case "image/png" -> "png";
            case "image/jpeg", "image/jpg" -> "jpg";
            case "image/gif" -> "gif";
            default -> "img";
        };
    }

    private void setTableGrid(XWPFTable table, int... widths) {
        CTTblGrid grid = table.getCTTbl().getTblGrid() == null ? table.getCTTbl().addNewTblGrid() : table.getCTTbl().getTblGrid();
        while (grid.sizeOfGridColArray() > 0) {
            grid.removeGridCol(0);
        }
        for (int width : widths) {
            grid.addNewGridCol().setW(BigInteger.valueOf(width));
        }
    }

    private int cellWidth(XWPFTableCell cell, int fallback) {
        int width = cell.getWidth();
        return width > 0 ? width : fallback;
    }

    private void configureCell(XWPFTableCell cell, String fill, int widthTwips) {
        cell.setWidth(String.valueOf(widthTwips));
        if (!isBlank(fill)) {
            cell.setColor(fill);
        }
    }

    private static void applyShading(XWPFParagraph paragraph, String fill) {
        if (isBlank(fill)) {
            return;
        }
        CTPPr properties = paragraph.getCTP().isSetPPr() ? paragraph.getCTP().getPPr() : paragraph.getCTP().addNewPPr();
        CTShd shading = properties.isSetShd() ? properties.getShd() : properties.addNewShd();
        shading.setVal(STShd.CLEAR);
        shading.setFill(fill);
    }

    static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record ContactItem(String label, String value) {
    }

    private record AvatarImage(byte[] bytes, int pictureType, String filename) {
    }
}
