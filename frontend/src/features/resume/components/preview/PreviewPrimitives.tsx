import type { ReactNode } from "react";
import { InlineMarkdown } from "./InlineMarkdown";
import type { PreviewModel, TimelineEntry } from "./previewTypes";

export function IdentityBlock({ model }: { model: PreviewModel }) {
  return (
    <div className="resume-template__identity">
      <h1>{model.name}</h1>
      <p>{model.headline}</p>
    </div>
  );
}

export function ResumeHeader({ model }: { model: PreviewModel }) {
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

export function ProfileAvatar({ avatar, name, compact = false, hero = false }: { avatar?: string; name: string; compact?: boolean; hero?: boolean }) {
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

export function ContactList({
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

export function TimelineSection({
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
                <InlineMarkdown text={item.body} />
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </PreviewSection>
  );
}

export function SkillSection({ title, items, tone }: { title: string; items: string[]; tone: "soft" | "bold" | "plain" | "editorial" }) {
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

export function PreviewSection({
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
