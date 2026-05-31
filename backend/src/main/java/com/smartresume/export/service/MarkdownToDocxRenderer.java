package com.smartresume.export.service;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.commonmark.node.AbstractVisitor;
import org.commonmark.node.BulletList;
import org.commonmark.node.Emphasis;
import org.commonmark.node.Link;
import org.commonmark.node.ListItem;
import org.commonmark.node.Node;
import org.commonmark.node.OrderedList;
import org.commonmark.node.Paragraph;
import org.commonmark.node.SoftLineBreak;
import org.commonmark.node.StrongEmphasis;
import org.commonmark.node.Text;
import org.commonmark.parser.Parser;

public class MarkdownToDocxRenderer {

    private final Parser parser = Parser.builder().build();

    public void render(XWPFDocument document, String markdown) {
        render(document::createParagraph, markdown);
    }

    public void render(XWPFTableCell cell, String markdown) {
        render(cell::addParagraph, markdown);
    }

    public void render(ParagraphSink sink, String markdown) {
        if (isBlank(markdown)) {
            return;
        }
        parser.parse(markdown).accept(new RenderingVisitor(sink));
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static final class RenderingVisitor extends AbstractVisitor {

        private final ParagraphSink paragraphSink;
        private XWPFParagraph currentParagraph;
        private ListState listState;
        private boolean bold;
        private boolean italic;

        private RenderingVisitor(ParagraphSink paragraphSink) {
            this.paragraphSink = paragraphSink;
        }

        @Override
        public void visit(Paragraph paragraph) {
            XWPFParagraph previous = currentParagraph;
            boolean ownsParagraph = previous == null;
            if (ownsParagraph) {
                currentParagraph = paragraphSink.createParagraph();
                DocxResumeWriter.configureBodyParagraph(currentParagraph);
            }
            visitChildren(paragraph);
            currentParagraph = previous;
        }

        @Override
        public void visit(BulletList bulletList) {
            ListState previous = listState;
            int depth = previous == null ? 0 : previous.depth() + 1;
            listState = new ListState(false, 1, depth, previous);
            visitChildren(bulletList);
            listState = previous;
        }

        @Override
        public void visit(OrderedList orderedList) {
            ListState previous = listState;
            int depth = previous == null ? 0 : previous.depth() + 1;
            listState = new ListState(true, orderedList.getMarkerStartNumber(), depth, previous);
            visitChildren(orderedList);
            listState = previous;
        }

        @Override
        public void visit(ListItem listItem) {
            XWPFParagraph previousParagraph = currentParagraph;
            currentParagraph = paragraphSink.createParagraph();
            int depth = listState == null ? 0 : listState.depth();
            DocxResumeWriter.configureListParagraph(currentParagraph, depth);
            appendText(listState == null ? "• " : listState.marker(), true);
            visitChildren(listItem);
            if (listState != null) {
                listState = listState.next();
            }
            currentParagraph = previousParagraph;
        }

        @Override
        public void visit(StrongEmphasis strongEmphasis) {
            boolean previous = bold;
            bold = true;
            visitChildren(strongEmphasis);
            bold = previous;
        }

        @Override
        public void visit(Emphasis emphasis) {
            boolean previous = italic;
            italic = true;
            visitChildren(emphasis);
            italic = previous;
        }

        @Override
        public void visit(Link link) {
            visitChildren(link);
            if (!isBlank(link.getDestination())) {
                appendText(" (" + link.getDestination() + ")");
            }
        }

        @Override
        public void visit(Text text) {
            appendText(text.getLiteral());
        }

        @Override
        public void visit(SoftLineBreak softLineBreak) {
            if (currentParagraph != null) {
                currentParagraph.createRun().addBreak();
            }
        }

        private void appendText(String text) {
            appendText(text, false);
        }

        private void appendText(String text, boolean bullet) {
            if (text == null || text.isEmpty()) {
                return;
            }
            if (currentParagraph == null) {
                currentParagraph = paragraphSink.createParagraph();
                DocxResumeWriter.configureBodyParagraph(currentParagraph);
            }
            XWPFRun run = currentParagraph.createRun();
            if (bullet) {
                DocxFonts.applyBullet(run);
            } else {
                DocxFonts.applyBody(run);
            }
            run.setBold(bold);
            run.setItalic(italic);
            run.setText(text);
        }

        @Override
        protected void visitChildren(Node parent) {
            Node node = parent.getFirstChild();
            while (node != null) {
                Node next = node.getNext();
                node.accept(this);
                node = next;
            }
        }
    }

    private record ListState(boolean ordered, int number, int depth, ListState parent) {

        String marker() {
            return ordered ? number + ". " : "• ";
        }

        ListState next() {
            return new ListState(ordered, number + 1, depth, parent);
        }
    }

    @FunctionalInterface
    public interface ParagraphSink {
        XWPFParagraph createParagraph();
    }
}
