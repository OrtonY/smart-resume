import { Empty } from "antd";
import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  FALLBACK_RESUME_TEMPLATE_CATALOG,
  createTemplateStyleVariables,
  resolveResumeTemplate,
  type ResumeTemplateDefinition,
} from "../templateCatalog";
import { normalizeResumeLayout, normalizeResumeSectionOrder, type ResumeDetail, type ResumeSectionKey } from "../types";
import { InlineMarkdown } from "./preview/InlineMarkdown";
import { PreviewSection, SkillSection, TimelineSection } from "./preview/PreviewPrimitives";
import { ClassicResumeTemplate } from "./preview/templates/ClassicResumeTemplate";
import { EditorialResumeTemplate } from "./preview/templates/EditorialResumeTemplate";
import { MinimalResumeTemplate } from "./preview/templates/MinimalResumeTemplate";
import { ModernSplitResumeTemplate } from "./preview/templates/ModernSplitResumeTemplate";
import {
  A4_PREVIEW_HEIGHT_PX,
  A4_PREVIEW_PAGE_GAP_PX,
  A4_PREVIEW_WIDTH_PX,
} from "./preview/previewPagination";
import type { PreviewModel, SectionNodeMap } from "./preview/previewTypes";
import { createPreviewModel } from "./preview/previewUtils";
import { useResumePreviewMetrics } from "./preview/useResumePreviewMetrics";

interface ResumePreviewProps {
  resume: Pick<ResumeDetail, "title" | "templateKey" | "content" | "layout">;
  sectionOrder?: ResumeSectionKey[];
  hiddenSections?: ResumeSectionKey[];
  templates?: ResumeTemplateDefinition[];
  previewMode?: "auto" | "a4-fit" | "a4-paged";
  onClick?: () => void;
}

export function ResumePreview({
  resume,
  sectionOrder,
  hiddenSections,
  templates = FALLBACK_RESUME_TEMPLATE_CATALOG,
  previewMode = "auto",
  onClick,
}: ResumePreviewProps) {
  const { t, i18n } = useTranslation('workspace');
  const stageRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLElement | null>(null);
  const template = resolveResumeTemplate(templates, resume.templateKey);
  const model = createPreviewModel(resume, template, t);
  const layout = normalizeResumeLayout(resume.layout);
  const orderedKeys = normalizeResumeSectionOrder(sectionOrder ?? layout.sectionOrder);
  const hiddenKeySet = new Set(hiddenSections ?? layout.hiddenSections);
  const sectionNodes = createSectionNodes(model, hiddenKeySet, t);
  const templateStyleVariables = createTemplateStyleVariables(template);
  const isFixedA4Preview = previewMode === "a4-fit";
  const isPagedA4Preview = previewMode === "a4-paged";
  const metricsWatchKey = JSON.stringify({
    hiddenSections: hiddenSections ?? layout.hiddenSections,
    language: i18n.language,
    orderedKeys,
    resume,
  });
  const previewMetrics = useResumePreviewMetrics({
    isFixedA4Preview,
    isPagedA4Preview,
    measureRef,
    stageRef,
    watchKey: metricsWatchKey,
  });
  const stageStyle = {
    "--resume-preview-scale": String(previewMetrics.scale),
    "--resume-preview-page-gap": `${Math.max(18, Math.round(A4_PREVIEW_PAGE_GAP_PX * previewMetrics.scale))}px`,
  } as CSSProperties;
  const paperStyle = {
    width: `${A4_PREVIEW_WIDTH_PX * previewMetrics.scale}px`,
    height: `${(isFixedA4Preview ? A4_PREVIEW_HEIGHT_PX : previewMetrics.contentHeight) * previewMetrics.scale}px`,
  };
  const pagedPaperStyle = {
    ...templateStyleVariables,
    width: `${A4_PREVIEW_WIDTH_PX * previewMetrics.scale}px`,
    height: `${A4_PREVIEW_HEIGHT_PX * previewMetrics.scale}px`,
  } as CSSProperties;
  const previewClassName = ["resume-preview", `preview--${template.layout}`, isFixedA4Preview ? "resume-preview--a4-fit" : ""]
    .filter(Boolean)
    .join(" ");
  const pageStartOffsets = isPagedA4Preview ? previewMetrics.pageSlices : [{ offset: 0, inset: 0, visibleHeight: previewMetrics.contentHeight }];
  const renderedTemplate = () => renderTemplate(model, sectionNodes, orderedKeys);

  function handlePreviewKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onClick) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <div
      className={[
        "resume-preview-stage",
        isFixedA4Preview ? "resume-preview-stage--fit" : "",
        isPagedA4Preview ? "resume-preview-stage--paged" : "",
        onClick ? "resume-preview-stage--interactive" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      ref={stageRef}
      style={stageStyle}
      onClick={onClick}
      onKeyDown={handlePreviewKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="resume-preview-measure" aria-hidden="true">
        <article className={[previewClassName, "resume-preview--measure"].filter(Boolean).join(" ")} ref={measureRef} style={templateStyleVariables}>
          {renderedTemplate()}
        </article>
      </div>

      {isPagedA4Preview ? (
        <div className="resume-preview-pages">
          {pageStartOffsets.map((pageSlice, pageIndex) => {
            return (
              <div className="resume-preview-paper resume-preview-paper--page" key={pageIndex} style={pagedPaperStyle}>
                <div
                  className="resume-preview-page-viewport"
                  style={{
                    paddingTop: `${pageSlice.inset * previewMetrics.scale}px`,
                  }}
                >
                  <div
                    className="resume-preview-page-window"
                    style={{
                      height: `${pageSlice.visibleHeight * previewMetrics.scale}px`,
                    }}
                  >
                    <article
                      className={[previewClassName, "resume-preview--page"].filter(Boolean).join(" ")}
                      style={{
                        ...templateStyleVariables,
                        minHeight: `${previewMetrics.contentHeight}px`,
                        top: `${-pageSlice.offset * previewMetrics.scale}px`,
                        transform: `scale(${previewMetrics.scale})`,
                      }}
                    >
                      {renderedTemplate()}
                    </article>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="resume-preview-paper" style={paperStyle}>
          <article className={previewClassName} style={templateStyleVariables}>
            {renderedTemplate()}
          </article>
        </div>
      )}
    </div>
  );
}

function renderTemplate(model: PreviewModel, sectionNodes: Record<ResumeSectionKey, ReactNode | null>, orderedKeys: ResumeSectionKey[]) {
  switch (model.template.layout) {
    case "two-column":
      return <ModernSplitResumeTemplate model={model} sectionNodes={sectionNodes} orderedKeys={orderedKeys} />;
    case "minimal":
      return <MinimalResumeTemplate model={model} sectionNodes={sectionNodes} orderedKeys={orderedKeys} />;
    case "editorial":
      return <EditorialResumeTemplate model={model} sectionNodes={sectionNodes} orderedKeys={orderedKeys} />;
    case "classic":
    default:
      return <ClassicResumeTemplate model={model} sectionNodes={sectionNodes} orderedKeys={orderedKeys} />;
  }
}

function createSectionNodes(
  model: PreviewModel,
  hiddenSections: Set<ResumeSectionKey>,
  t: (key: string, opts?: Record<string, unknown>) => string,
): SectionNodeMap {
  return {
    summary: hiddenSections.has("summary") ? null : (
      <PreviewSection title={t("preview.summary")} hidden={!model.summary}>
        <p className="resume-template__paragraph"><InlineMarkdown text={model.summary} /></p>
      </PreviewSection>
    ),
    workExperience: hiddenSections.has("workExperience") ? null : <TimelineSection title={t("preview.workExperience")} items={model.work} />,
    projectExperience: hiddenSections.has("projectExperience") ? null : <TimelineSection title={t("preview.projectExperience")} items={model.projects} />,
    education: hiddenSections.has("education") ? null : <TimelineSection title={t("preview.education")} items={model.education} inlineSubtitle />,
    skills: hiddenSections.has("skills") ? null : <SkillSection title={t("preview.skills")} items={model.skills} tone="plain" />,
    honors: hiddenSections.has("honors") ? null : <TimelineSection title={t("preview.honors")} items={model.honors} compact />,
    certificates: hiddenSections.has("certificates") ? null : <TimelineSection title={t("preview.certificates")} items={model.certificates} compact />,
  };
}

export function EmptyPreview() {
  const { t } = useTranslation('workspace');
  return (
    <div className="glass-card">
      <div className="empty-state">
        <Empty description={t('preview.empty')} />
      </div>
    </div>
  );
}
