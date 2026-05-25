import { useTranslation } from "react-i18next";
import { InlineMarkdown } from "../InlineMarkdown";
import { ResumeHeader } from "../PreviewPrimitives";
import { renderSectionStack } from "../previewUtils";
import type { TemplateRendererProps } from "../previewTypes";

export function EditorialResumeTemplate({ model, sectionNodes, orderedKeys }: TemplateRendererProps) {
  const { t } = useTranslation("workspace");
  const showSummary = Boolean(sectionNodes.summary);

  return (
    <div className="resume-template resume-template--editorial">
      <header className="resume-template__hero resume-template__hero--compact">
        <div className="resume-template__hero-main">
          <ResumeHeader model={model} />
        </div>
        <div className="resume-template__hero-panel">
          <h2>{t("preview.summary")}</h2>
          {showSummary ? (
            <p className="resume-template__paragraph"><InlineMarkdown text={model.summary} /></p>
          ) : (
            <p className="resume-template__paragraph">{t("preview.summaryFallback")}</p>
          )}
        </div>
      </header>

      <div className="resume-template__editorial-grid">
        <main className="resume-template__content-column">
          {renderSectionStack(orderedKeys, ["workExperience", "projectExperience"], sectionNodes)}
        </main>

        <aside className="resume-template__notes-column">
          {renderSectionStack(orderedKeys, ["education", "skills", "honors", "certificates"], sectionNodes)}
        </aside>
      </div>
    </div>
  );
}
