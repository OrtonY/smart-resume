import { DEFAULT_RESUME_SECTION_ORDER } from "../../../types";
import { ResumeHeader } from "../PreviewPrimitives";
import { renderSectionStack } from "../previewUtils";
import type { TemplateRendererProps } from "../previewTypes";

export function MinimalResumeTemplate({ model, sectionNodes, orderedKeys }: TemplateRendererProps) {
  return (
    <div className="resume-template resume-template--minimal">
      <ResumeHeader model={model} />

      <div className="resume-template__content-column resume-template__content-column--minimal">
        {renderSectionStack(orderedKeys, DEFAULT_RESUME_SECTION_ORDER, sectionNodes)}
      </div>
    </div>
  );
}
