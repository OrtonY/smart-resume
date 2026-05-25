import { DEFAULT_RESUME_SECTION_ORDER } from "../../../types";
import { ResumeHeader } from "../PreviewPrimitives";
import { renderSectionStack } from "../previewUtils";
import type { TemplateRendererProps } from "../previewTypes";

export function ClassicResumeTemplate({ model, sectionNodes, orderedKeys }: TemplateRendererProps) {
  return (
    <div className="resume-template resume-template--classic">
      <ResumeHeader model={model} />

      <main className="resume-template__content-column resume-template__content-column--classic">
        {renderSectionStack(orderedKeys, DEFAULT_RESUME_SECTION_ORDER, sectionNodes)}
      </main>
    </div>
  );
}
