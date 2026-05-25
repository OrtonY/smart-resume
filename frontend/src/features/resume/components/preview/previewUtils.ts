import type { ReactNode } from "react";
import type { ResumeTemplateDefinition } from "../../templateCatalog";
import type { ResumeDetail, ResumeSectionKey } from "../../types";
import type { PreviewModel } from "./previewTypes";

export function createPreviewModel(
  resume: Pick<ResumeDetail, "title" | "templateKey" | "content" | "layout">,
  template: ResumeTemplateDefinition,
  t: (key: string, opts?: Record<string, unknown>) => string,
): PreviewModel {
  const { content } = resume;

  return {
    template,
    name: content.personalInfo.fullName || resume.title,
    headline: content.personalInfo.headline || t("preview.headlineFallback"),
    summary: content.personalSummary.trim(),
    avatar: (content.personalInfo.avatar ?? "").trim(),
    contact: [
      { label: t("preview.contact.phone"), value: content.personalInfo.phone },
      { label: t("preview.contact.email"), value: content.personalInfo.email },
      { label: t("preview.contact.city"), value: content.personalInfo.city },
      { label: t("preview.contact.website"), value: content.personalInfo.website },
      { label: t("preview.contact.expectedSalary"), value: content.personalInfo.expectedSalary },
      { label: t("preview.contact.age"), value: formatAge(content.personalInfo.age, t) ?? "" },
    ].filter((item) => item.value.trim().length > 0),
    education: content.education.map((item) => ({
      title: item.school || t("preview.fallback.school"),
      subtitle: joinParts([item.degree, item.major]),
      meta: formatPeriod(item.startDate, item.endDate, t),
      body: item.description,
    })),
    work: content.workExperience.map((item) => ({
      title: item.company || t("preview.fallback.company"),
      subtitle: item.role || t("preview.fallback.role"),
      meta: formatPeriod(item.startDate, item.endDate, t),
      body: item.description,
    })),
    projects: content.projectExperience.map((item) => ({
      title: item.name || t("preview.fallback.project"),
      subtitle: item.role || t("preview.fallback.projectRole"),
      meta: formatPeriod(item.startDate, item.endDate, t),
      body: item.description,
    })),
    honors: content.honors.map((item) => ({
      title: item.title || t("preview.fallback.honor"),
      subtitle: item.issuer,
      meta: item.awardedAt,
      body: item.description,
    })),
    certificates: content.certificates.map((item) => ({
      title: item.name || t("preview.fallback.certificate"),
      subtitle: item.issuer,
      meta: joinParts([item.issuedAt, item.credentialId]),
    })),
    skills: content.skills.map((item) => joinParts([item.name || t("preview.fallback.skill"), item.level])),
  };
}

export function renderSectionStack(
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

function formatPeriod(startDate: string | undefined, endDate: string | undefined, t: (key: string) => string) {
  const start = (startDate ?? "").trim();
  const end = (endDate ?? "").trim();

  if (!start && !end) {
    return "";
  }

  return `${start || t("preview.period.from")} - ${end || t("preview.period.until")}`;
}

function formatAge(age: string | undefined, t: (key: string) => string): string | null {
  const trimmed = (age ?? "").trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(n)) return null;
  if (String(n) !== trimmed) return null;
  if (n < 1 || n > 150) return null;
  return `${n}${t("preview.ageSuffix")}`;
}
