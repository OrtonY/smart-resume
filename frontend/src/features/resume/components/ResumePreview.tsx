import { Empty } from "antd";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import {
  FALLBACK_RESUME_TEMPLATE_CATALOG,
  createTemplateStyleVariables,
  resolveResumeTemplate,
  type ResumeTemplateDefinition,
} from "../templateCatalog";
import { DEFAULT_RESUME_SECTION_ORDER, normalizeResumeLayout, normalizeResumeSectionOrder, type ResumeDetail, type ResumeSectionKey } from "../types";

interface ResumePreviewProps {
  resume: Pick<ResumeDetail, "title" | "templateKey" | "content" | "layout">;
  sectionOrder?: ResumeSectionKey[];
  hiddenSections?: ResumeSectionKey[];
  templates?: ResumeTemplateDefinition[];
  previewMode?: "auto" | "a4-fit" | "a4-paged";
  onClick?: () => void;
}

interface TimelineEntry {
  title: string;
  subtitle?: string;
  meta?: string;
  body?: string;
}

interface PreviewModel {
  template: ResumeTemplateDefinition;
  name: string;
  headline: string;
  summary: string;
  avatar?: string;
  contact: Array<{ label: string; value: string }>;
  education: TimelineEntry[];
  work: TimelineEntry[];
  projects: TimelineEntry[];
  honors: TimelineEntry[];
  certificates: TimelineEntry[];
  skills: string[];
}

interface PageSlice {
  offset: number;
  inset: number;
  visibleHeight: number;
}

type PageItemLevel = "section" | "child" | "fragment";

interface LineRect {
  top: number;
  bottom: number;
}

interface PageItem {
  top: number;
  bottom: number;
  effectiveBottom: number;
  level: PageItemLevel;
  lines?: LineRect[];
}

const A4_PREVIEW_WIDTH_PX = 794;
const A4_PREVIEW_HEIGHT_PX = 1123;
const A4_PREVIEW_PAGE_GAP_PX = 28;
const A4_PREVIEW_CONTINUATION_TOP_SPACING_PX = 56;
export function ResumePreview({
  resume,
  sectionOrder,
  hiddenSections,
  templates = FALLBACK_RESUME_TEMPLATE_CATALOG,
  previewMode = "auto",
  onClick,
}: ResumePreviewProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLElement | null>(null);
  const [previewMetrics, setPreviewMetrics] = useState({
    scale: 1,
    contentHeight: A4_PREVIEW_HEIGHT_PX,
    pageSlices: [{ offset: 0, inset: 0, visibleHeight: A4_PREVIEW_HEIGHT_PX }] as PageSlice[],
  });
  const template = resolveResumeTemplate(templates, resume.templateKey);
  const model = createPreviewModel(resume, template);
  const layout = normalizeResumeLayout(resume.layout);
  const orderedKeys = normalizeResumeSectionOrder(sectionOrder ?? layout.sectionOrder);
  const hiddenKeySet = new Set(hiddenSections ?? layout.hiddenSections);
  const sectionNodes = createSectionNodes(model, hiddenKeySet);
  const templateStyleVariables = createTemplateStyleVariables(template);
  const isFixedA4Preview = previewMode === "a4-fit";
  const isPagedA4Preview = previewMode === "a4-paged";
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

  useEffect(() => {
    const stageElement = stageRef.current;
    const measureElement = measureRef.current;

    if (!stageElement || !measureElement) {
      return;
    }

    const updateMetrics = () => {
      const stageWidth = stageElement.clientWidth || A4_PREVIEW_WIDTH_PX;
      const widthScale = stageWidth / A4_PREVIEW_WIDTH_PX;
      const nextScale = isPagedA4Preview
        ? Math.min(1, widthScale)
        : isFixedA4Preview
          ? Math.min(1, widthScale, (stageElement.clientHeight || A4_PREVIEW_HEIGHT_PX) / A4_PREVIEW_HEIGHT_PX)
          : Math.min(1, widthScale);
      const nextContentHeight = Math.max(A4_PREVIEW_HEIGHT_PX, measureElement.scrollHeight);
      const nextPageSlices = isPagedA4Preview
        ? createPagedPreviewSlices(nextContentHeight, readMeasuredPageItems(measureElement), A4_PREVIEW_CONTINUATION_TOP_SPACING_PX)
        : [{ offset: 0, inset: 0, visibleHeight: nextContentHeight }];

      setPreviewMetrics((current) => {
        if (
          Math.abs(current.scale - nextScale) < 0.001 &&
          current.contentHeight === nextContentHeight &&
          arePageSlicesEqual(current.pageSlices, nextPageSlices)
        ) {
          return current;
        }

        return {
          scale: nextScale,
          contentHeight: nextContentHeight,
          pageSlices: nextPageSlices,
        };
      });
    };

    updateMetrics();

    const resizeObserver = new ResizeObserver(() => {
      updateMetrics();
    });

    resizeObserver.observe(stageElement);
    resizeObserver.observe(measureElement);
    window.addEventListener("resize", updateMetrics);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateMetrics);
    };
  }, [hiddenSections, isFixedA4Preview, isPagedA4Preview, orderedKeys, resume, sectionNodes]);

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

function readMeasuredPageItems(root: HTMLElement): PageItem[] {
  const rootRect = root.getBoundingClientRect();
  const selector = "[data-preview-page-item], [data-preview-page-item-child], [data-preview-page-item-fragment]";
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));

  const items: PageItem[] = [];

  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    const top = rect.top - rootRect.top;
    const bottom = rect.bottom - rootRect.top;

    if (bottom <= top) continue;

    let level: PageItemLevel;
    if (node.hasAttribute("data-preview-page-item")) {
      level = "section";
    } else if (node.hasAttribute("data-preview-page-item-child")) {
      level = "child";
    } else {
      level = "fragment";
    }

    const keepWithNext = node.dataset.previewKeepWithNext === "true";
    let effectiveBottom = bottom;
    if (keepWithNext) {
      const next = node.nextElementSibling as HTMLElement | null;
      if (next) {
        const nextRect = next.getBoundingClientRect();
        effectiveBottom = Math.max(bottom, nextRect.bottom - rootRect.top);
      }
    }

    let lines: LineRect[] | undefined;
    if (level === "fragment" && node.firstChild) {
      try {
        const range = node.ownerDocument!.createRange();
        range.selectNodeContents(node);
        const rectList = range.getClientRects();
        const collected: LineRect[] = [];
        for (let index = 0; index < rectList.length; index += 1) {
          const lineRect = rectList[index];
          if (lineRect.height <= 0) continue;
          collected.push({
            top: lineRect.top - rootRect.top,
            bottom: lineRect.bottom - rootRect.top,
          });
        }
        if (collected.length > 0) {
          lines = collected;
        }
        range.detach?.();
      } catch {
        lines = undefined;
      }
    }

    items.push({ top, bottom, effectiveBottom, level, lines });
  }

  return items;
}

function createPagedPreviewSlices(contentHeight: number, items: PageItem[], continuationTopSpacing: number) {
  const safeContentHeight = Math.max(A4_PREVIEW_HEIGHT_PX, contentHeight);
  const normalizedItems = items
    .map((item) => ({
      top: Math.max(0, Math.floor(item.top)),
      bottom: Math.max(0, Math.ceil(item.bottom)),
      effectiveBottom: Math.max(0, Math.ceil(item.effectiveBottom)),
      level: item.level,
      lines: item.lines?.map((line) => ({
        top: Math.max(0, Math.floor(line.top)),
        bottom: Math.max(0, Math.ceil(line.bottom)),
      })),
    }))
    .sort((left, right) => left.top - right.top);

  const slices: PageSlice[] = [];
  let currentOffset = 0;
  let pageIndex = 0;
  let guard = 0;

  while (currentOffset < safeContentHeight && guard < 200) {
    const inset = pageIndex === 0 ? 0 : continuationTopSpacing;
    const capacity = Math.max(1, A4_PREVIEW_HEIGHT_PX - inset);
    const visibleLimit = currentOffset + capacity;

    if (visibleLimit >= safeContentHeight) {
      slices.push({ offset: currentOffset, inset, visibleHeight: safeContentHeight - currentOffset });
      break;
    }

    let breakAt = visibleLimit;

    const sectionNearBottom = normalizedItems.find(
      (item) =>
        item.level === "section" &&
        item.top > currentOffset &&
        item.top <= visibleLimit &&
        item.top > visibleLimit - 80 &&
        item.effectiveBottom > visibleLimit,
    );

    if (sectionNearBottom) {
      breakAt = sectionNearBottom.top;
    } else {
      const spanning = normalizedItems.find(
        (item) => item.level !== "section" && item.lines && item.lines.length > 0 && item.top < visibleLimit && item.bottom > visibleLimit,
      );

      if (spanning && spanning.lines) {
        let lastFittingBottom = -1;
        for (const line of spanning.lines) {
          if (line.bottom <= visibleLimit && line.top >= currentOffset) {
            lastFittingBottom = Math.max(lastFittingBottom, line.bottom);
          }
        }
        if (lastFittingBottom > currentOffset) {
          breakAt = lastFittingBottom;
        } else {
          breakAt = spanning.top > currentOffset ? spanning.top : visibleLimit;
        }
      }
    }

    const minProgress = Math.max(1, Math.floor(capacity * 0.2));
    if (breakAt - currentOffset < minProgress) {
      breakAt = visibleLimit;
    }

    const visibleHeight = Math.min(capacity, breakAt - currentOffset);
    slices.push({ offset: currentOffset, inset, visibleHeight });
    currentOffset = currentOffset + visibleHeight;
    pageIndex += 1;
    guard += 1;
  }

  return slices;
}

function arePageSlicesEqual(current: PageSlice[], next: PageSlice[]) {
  if (current.length !== next.length) {
    return false;
  }

  return current.every(
    (slice, index) => slice.offset === next[index].offset && slice.inset === next[index].inset && slice.visibleHeight === next[index].visibleHeight,
  );
}

function renderTemplate(model: PreviewModel, sectionNodes: Record<ResumeSectionKey, ReactNode | null>, orderedKeys: ResumeSectionKey[]) {
  switch (model.template.layout) {
    case "two-column":
      return <ModernSplitPreview model={model} sectionNodes={sectionNodes} orderedKeys={orderedKeys} />;
    case "minimal":
      return <MinimalPreview model={model} sectionNodes={sectionNodes} orderedKeys={orderedKeys} />;
    case "editorial":
      return <EditorialPreview model={model} sectionNodes={sectionNodes} orderedKeys={orderedKeys} />;
    case "classic":
    default:
      return <ClassicPreview model={model} sectionNodes={sectionNodes} orderedKeys={orderedKeys} />;
  }
}

function IdentityBlock({ model }: { model: PreviewModel }) {
  return (
    <div className="resume-template__identity">
      <h1>{model.name}</h1>
      <p>{model.headline}</p>
    </div>
  );
}

function ResumeHeader({ model }: { model: PreviewModel }) {
  const avatarNode = <ProfileAvatar avatar={model.avatar} name={model.name} compact />;

  return (
    <header className="resume-template__masthead resume-template__masthead--classic resume-template__masthead--compact">
      <div className="resume-template__masthead-main resume-template__masthead-main--compact">
        <div className="resume-template__identity resume-template__identity--compact">
          <h1>{model.name}</h1>
          <p>{model.headline}</p>
        </div>
        <ContactList items={model.contact} inline />
      </div>
      <div className="resume-template__masthead-aside">{avatarNode}</div>
    </header>
  );
}

function ProfileAvatar({ avatar, name, compact = false, hero = false }: { avatar?: string; name: string; compact?: boolean; hero?: boolean }) {
  const source = (avatar ?? "").trim();

  if (!source) {
    return null;
  }

  return (
    <div className={["resume-template__avatar", compact ? "is-compact" : "", hero ? "is-hero" : ""].filter(Boolean).join(" ")}>
      <img src={source} alt={`${name} avatar`} loading="lazy" />
    </div>
  );
}

function ClassicPreview({
  model,
  sectionNodes,
  orderedKeys,
}: {
  model: PreviewModel;
  sectionNodes: Record<ResumeSectionKey, ReactNode | null>;
  orderedKeys: ResumeSectionKey[];
}) {
  return (
    <div className="resume-template resume-template--classic">
      <ResumeHeader model={model} />

      <main className="resume-template__content-column resume-template__content-column--classic">
        {renderSectionStack(orderedKeys, DEFAULT_RESUME_SECTION_ORDER, sectionNodes)}
      </main>
    </div>
  );
}

function ModernSplitPreview({
  model,
  sectionNodes,
  orderedKeys,
}: {
  model: PreviewModel;
  sectionNodes: Record<ResumeSectionKey, ReactNode | null>;
  orderedKeys: ResumeSectionKey[];
}) {
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

function MinimalPreview({
  model,
  sectionNodes,
  orderedKeys,
}: {
  model: PreviewModel;
  sectionNodes: Record<ResumeSectionKey, ReactNode | null>;
  orderedKeys: ResumeSectionKey[];
}) {
  return (
    <div className="resume-template resume-template--minimal">
      <ResumeHeader model={model} />

      <div className="resume-template__content-column resume-template__content-column--minimal">
        {renderSectionStack(orderedKeys, DEFAULT_RESUME_SECTION_ORDER, sectionNodes)}
      </div>
    </div>
  );
}

function EditorialPreview({
  model,
  sectionNodes,
  orderedKeys,
}: {
  model: PreviewModel;
  sectionNodes: Record<ResumeSectionKey, ReactNode | null>;
  orderedKeys: ResumeSectionKey[];
}) {
  const showSummary = Boolean(sectionNodes.summary);

  return (
    <div className="resume-template resume-template--editorial">
      <header className="resume-template__hero resume-template__hero--compact">
        <div className="resume-template__hero-main">
          <ResumeHeader model={model} />
        </div>
        <div className="resume-template__hero-panel">
          <h2>个人简介</h2>
          {showSummary ? (
            <p className="resume-template__paragraph">{model.summary}</p>
          ) : (
            <p className="resume-template__paragraph">让结构保持克制，把最强的经历和成果放到最前面。</p>
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

function ContactList({
  items,
  stacked = false,
  inline = false,
  card = false,
  dense = false,
  hideLabels = false,
}: {
  items: Array<{ label: string; value: string }>;
  stacked?: boolean;
  inline?: boolean;
  card?: boolean;
  dense?: boolean;
  hideLabels?: boolean;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul
      className={[
        "resume-template__contact-list",
        stacked ? "is-stacked" : "",
        inline ? "is-inline" : "",
        card ? "is-card" : "",
        dense ? "is-dense" : "",
        hideLabels ? "is-label-hidden" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {items.map((item) => (
        <li key={`${item.label}-${item.value}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </li>
      ))}
    </ul>
  );
}

function TimelineSection({
  title,
  items,
  compact = false,
  minimal = false,
  inlineSubtitle = false,
}: {
  title: string;
  items: TimelineEntry[];
  compact?: boolean;
  minimal?: boolean;
  inlineSubtitle?: boolean;
}) {
  return (
    <PreviewSection title={title} hidden={items.length === 0} compact={compact} minimal={minimal}>
      <div className={`resume-template__timeline${compact ? " is-compact" : ""}`}>
        {items.map((item, index) => (
          <article className="resume-template__entry" key={`${title}-${index}-${item.title}`} data-preview-page-item-child>
            <div className="resume-template__entry-topline">
              <div className={`resume-template__entry-head${inlineSubtitle ? " is-inline-subtitle" : ""}`}>
                <h3 data-preview-page-item-fragment>{item.title}</h3>
                {item.subtitle ? <p data-preview-page-item-fragment>{item.subtitle}</p> : null}
              </div>
              {item.meta ? <div className="resume-template__entry-meta">{item.meta}</div> : null}
            </div>
            {item.body ? (
              <p className="resume-template__paragraph" data-preview-page-item-fragment>
                {item.body}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </PreviewSection>
  );
}

function SkillSection({ title, items, tone }: { title: string; items: string[]; tone: "soft" | "bold" | "plain" | "editorial" }) {
  if (tone === "plain") {
    return (
      <PreviewSection title={title} hidden={items.length === 0}>
        <p className="resume-template__inline-list">{items.join(" / ")}</p>
      </PreviewSection>
    );
  }

  return (
    <PreviewSection title={title} hidden={items.length === 0}>
      <div className={`resume-template__skill-cloud resume-template__skill-cloud--${tone}`}>
        {items.map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </PreviewSection>
  );
}

function PreviewSection({
  title,
  hidden,
  compact = false,
  minimal = false,
  children,
}: {
  title: string;
  hidden: boolean;
  compact?: boolean;
  minimal?: boolean;
  children: ReactNode;
}) {
  if (hidden) {
    return null;
  }

  return (
    <section
      data-preview-page-item="section"
      className={["resume-template__section", compact ? "is-compact" : "", minimal ? "is-minimal" : ""].filter(Boolean).join(" ")}
    >
      <div className="resume-template__section-title" data-preview-keep-with-next="true">
        {title}
      </div>
      {children}
    </section>
  );
}

function createPreviewModel(
  resume: Pick<ResumeDetail, "title" | "templateKey" | "content" | "layout">,
  template: ResumeTemplateDefinition,
): PreviewModel {
  const { content } = resume;

  return {
    template,
    name: content.personalInfo.fullName || resume.title,
    headline: content.personalInfo.headline || "用结构化表达讲清你的职业价值。",
    summary: content.personalSummary.trim(),
    avatar: (content.personalInfo.avatar ?? "").trim(),
    contact: [
      { label: "电话", value: content.personalInfo.phone },
      { label: "邮箱", value: content.personalInfo.email },
      { label: "城市", value: content.personalInfo.city },
      { label: "链接", value: content.personalInfo.website },
      { label: "期望薪资", value: content.personalInfo.expectedSalary },
      { label: "年龄", value: formatAge(content.personalInfo.age) ?? "" },
    ].filter((item) => item.value.trim().length > 0),
    education: content.education.map((item) => ({
      title: item.school || "学校",
      subtitle: joinParts([item.degree, item.major]),
      meta: formatPeriod(item.startDate, item.endDate),
      body: item.description,
    })),
    work: content.workExperience.map((item) => ({
      title: item.company || "公司",
      subtitle: item.role || "职位",
      meta: formatPeriod(item.startDate, item.endDate),
      body: item.description,
    })),
    projects: content.projectExperience.map((item) => ({
      title: item.name || "项目",
      subtitle: item.role || "角色",
      meta: formatPeriod(item.startDate, item.endDate),
      body: item.description,
    })),
    honors: content.honors.map((item) => ({
      title: item.title || "荣誉奖项",
      subtitle: item.issuer,
      meta: item.awardedAt,
      body: item.description,
    })),
    certificates: content.certificates.map((item) => ({
      title: item.name || "证书",
      subtitle: item.issuer,
      meta: joinParts([item.issuedAt, item.credentialId]),
    })),
    skills: content.skills.map((item) => joinParts([item.name || "技能", item.level])),
  };
}

function createSectionNodes(model: PreviewModel, hiddenSections: Set<ResumeSectionKey>): Record<ResumeSectionKey, ReactNode | null> {
  return {
    summary: hiddenSections.has("summary") ? null : (
      <PreviewSection title="个人简介" hidden={!model.summary}>
        <p className="resume-template__paragraph">{model.summary}</p>
      </PreviewSection>
    ),
    workExperience: hiddenSections.has("workExperience") ? null : <TimelineSection title="工作经历" items={model.work} />,
    projectExperience: hiddenSections.has("projectExperience") ? null : <TimelineSection title="项目经历" items={model.projects} />,
    education: hiddenSections.has("education") ? null : <TimelineSection title="教育经历" items={model.education} inlineSubtitle />,
    skills: hiddenSections.has("skills") ? null : <SkillSection title="技能特长" items={model.skills} tone="plain" />,
    honors: hiddenSections.has("honors") ? null : <TimelineSection title="荣誉奖项" items={model.honors} compact />,
    certificates: hiddenSections.has("certificates") ? null : <TimelineSection title="资格证书" items={model.certificates} compact />,
  };
}

function renderSectionStack(
  orderedKeys: ResumeSectionKey[],
  supportedKeys: ResumeSectionKey[],
  sectionNodes: Record<ResumeSectionKey, ReactNode | null>,
) {
  return orderedKeys
    .filter((key) => supportedKeys.includes(key))
    .map((key) => sectionNodes[key])
    .filter(Boolean);
}

function joinParts(parts: Array<string | undefined>) {
  return parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" · ");
}

function formatPeriod(startDate?: string, endDate?: string) {
  const start = (startDate ?? "").trim();
  const end = (endDate ?? "").trim();

  if (!start && !end) {
    return "";
  }

  return `${start || "开始时间"} - ${end || "至今"}`;
}

function formatAge(age?: string): string | null {
  const trimmed = (age ?? "").trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(n)) return null;
  if (String(n) !== trimmed) return null;
  if (n < 1 || n > 150) return null;
  return `${n}岁`;
}

export function EmptyPreview() {
  return (
    <div className="glass-card">
      <div className="empty-state">
        <Empty description="创建或打开一份简历后，这里会实时显示预览。" />
      </div>
    </div>
  );
}
