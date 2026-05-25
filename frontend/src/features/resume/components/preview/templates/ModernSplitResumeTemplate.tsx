import { ContactList, IdentityBlock, ProfileAvatar } from "../PreviewPrimitives";
import { renderSectionStack } from "../previewUtils";
import type { TemplateRendererProps } from "../previewTypes";

export function ModernSplitResumeTemplate({ model, sectionNodes, orderedKeys }: TemplateRendererProps) {
  return (
    <div className="resume-template resume-template--split">
      <aside className="resume-template__sidebar">
        <div className="resume-template__sidebar-header">
          <div className="resume-template__sidebar-profile">
            <ProfileAvatar avatar={model.avatar} name={model.name} compact />
            <div className="resume-template__sidebar-header-copy">
              <IdentityBlock model={model} />
            </div>
          </div>
        </div>
        <ContactList items={model.contact} stacked card />
        {renderSectionStack(orderedKeys, ["skills", "honors", "certificates"], sectionNodes)}
      </aside>

      <main className="resume-template__content-column">
        {renderSectionStack(orderedKeys, ["summary", "workExperience", "projectExperience", "education"], sectionNodes)}
      </main>
    </div>
  );
}
