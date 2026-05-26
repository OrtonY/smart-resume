import type { ReactNode } from "react";
import type { ResumeTemplateDefinition } from "../../templateCatalog";
import type { ResumeSectionKey } from "../../types";

export interface TimelineEntry {
  title: string;
  subtitle?: string;
  meta?: string;
  body?: string;
}

export interface PreviewModel {
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

export type SectionNodeMap = Record<ResumeSectionKey, ReactNode | null>;

export interface TemplateRendererProps {
  model: PreviewModel;
  sectionNodes: SectionNodeMap;
  orderedKeys: ResumeSectionKey[];
}
