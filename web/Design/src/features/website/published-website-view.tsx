"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ElementRenderer } from "@/features/editor/components/element-renderer";
import type {
  DesignElement,
  FormElement,
  WebsiteModel,
  WebsiteSection,
} from "@/features/editor/types";
import { WebsiteNavigation } from "@/features/website/published-website-navigation";
import { usePublishedWebsiteAnalytics } from "@/features/website/use-published-website-analytics";

type PublishedWebsiteViewProps = {
  slug: string;
  model: WebsiteModel;
  submitted?: boolean;
};

export function PublishedWebsiteView({
  slug,
  model,
  submitted = false,
}: PublishedWebsiteViewProps) {
  usePublishedWebsiteAnalytics(slug);
  const navigationStyle = model.navigationStyle ?? "top";
  const sections = model.sections.map((section) => (
    <ResponsiveWebsiteSection key={section.id} slug={slug} section={section} />
  ));

  return (
    <main className="min-h-dvh bg-background text-foreground">
      {navigationStyle === "hidden" ? null : navigationStyle === "side" ? (
        <div className="lg:hidden">
          <WebsiteNavigation model={model} style="pills" />
        </div>
      ) : (
        <WebsiteNavigation model={model} style={navigationStyle} />
      )}

      {submitted ? (
        <div className="mx-auto mt-4 max-w-6xl px-4">
          <div className="rounded-md border border-border bg-card px-4 py-3 text-sm">
            Form submitted successfully.
          </div>
        </div>
      ) : null}

      {navigationStyle === "side" ? (
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <WebsiteNavigation model={model} style="side" />
          <div className="grid min-w-0 gap-8">{sections}</div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8">
          {sections}
        </div>
      )}
    </main>
  );
}

function ResponsiveWebsiteSection({
  slug,
  section,
}: {
  slug: string;
  section: WebsiteSection;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const sectionTitleId = `${section.anchorId}-title`;
  const sectionDescriptionId = `${section.anchorId}-description`;
  const formElements = useMemo(
    () => section.elements.filter(isFormElement),
    [section.elements],
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateScale = () => {
      setScale(Math.min(1, node.clientWidth / section.width));
    };
    const observer = new ResizeObserver(updateScale);

    updateScale();
    observer.observe(node);

    return () => observer.disconnect();
  }, [section.width]);

  return (
    <section
      id={section.anchorId}
      className="scroll-mt-20"
      data-website-section-id={section.id}
      aria-labelledby={sectionTitleId}
      aria-describedby={section.seoDescription ? sectionDescriptionId : undefined}
    >
      <h2 id={sectionTitleId} className="sr-only">
        {section.seoTitle}
      </h2>
      {section.seoDescription ? (
        <p id={sectionDescriptionId} className="sr-only">
          {section.seoDescription}
        </p>
      ) : null}
      <div
        ref={containerRef}
        className="relative mx-auto w-full overflow-hidden rounded-md bg-muted/20 shadow-sm"
        style={{
          maxWidth: section.width,
          height: Math.max(1, section.height * scale),
        }}
      >
        <div
          className="absolute left-0 top-0 overflow-hidden"
          style={{
            width: section.width,
            height: section.height,
            background: section.background,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {section.elements.map((element) =>
            element.hidden || element.type === "form" ? null : (
              <PositionedElement key={element.id} element={element}>
                <PublishedElement element={element} />
              </PositionedElement>
            ),
          )}

          {formElements.length ? (
            <form
              method="post"
              action={`/site/${slug}/submit`}
              className="pointer-events-none absolute inset-0"
            >
              <input type="hidden" name="sectionId" value={section.id} />
              {formElements.map((element) => (
                <PositionedElement key={element.id} element={element}>
                  <WebsiteFormControl element={element} />
                </PositionedElement>
              ))}
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PositionedElement({
  element,
  children,
}: {
  element: DesignElement;
  children: ReactNode;
}) {
  return (
    <div
      className="absolute"
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        transformOrigin: "center",
      }}
    >
      {children}
    </div>
  );
}

function PublishedElement({ element }: { element: DesignElement }) {
  const content = <ElementRenderer element={element} />;
  const href = getPublicElementLink(element.linkUrl);

  if (!href) {
    return content;
  }

  const isExternal = /^(https?:)?\/\//i.test(href);

  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      className="block h-full w-full cursor-pointer"
      aria-label={getLinkLabel(element)}
    >
      {content}
    </a>
  );
}

function WebsiteFormControl({ element }: { element: FormElement }) {
  const name = getFieldName(element);
  const baseStyle = {
    width: "100%",
    height: "100%",
    pointerEvents: "auto" as const,
    color: element.textColor,
    background:
      element.fieldKind === "button" ? element.accentColor : element.fieldColor,
    border: `${Math.max(0, element.borderWidth)}px solid ${element.borderColor}`,
    borderRadius: element.radius,
    padding: element.padding,
    fontFamily: element.fontFamily,
    fontSize: element.fontSize,
    fontWeight: element.fontWeight,
  };

  if (element.fieldKind === "button") {
    return (
      <button type="submit" style={baseStyle}>
        {element.label || element.value || "Submit"}
      </button>
    );
  }

  if (element.fieldKind === "textarea") {
    return (
      <textarea
        name={name}
        placeholder={element.placeholder}
        defaultValue={element.value}
        aria-label={element.label || element.placeholder || name}
        style={baseStyle}
      />
    );
  }

  if (element.fieldKind === "checkbox") {
    return (
      <label
        style={{
          ...baseStyle,
          display: "flex",
          alignItems: "center",
          gap: Math.max(8, element.padding * 0.55),
          background: element.surfaceColor,
        }}
      >
        <input name={name} type="checkbox" defaultChecked={element.checked} />
        <span>{element.label || "Checkbox"}</span>
      </label>
    );
  }

  if (element.fieldKind === "dropdown") {
    return (
      <select
        name={name}
        defaultValue={element.value || element.options[0] || ""}
        aria-label={element.label || name}
        style={baseStyle}
      >
        {element.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      name={name}
      placeholder={element.placeholder}
      defaultValue={element.value}
      aria-label={element.label || element.placeholder || name}
      style={baseStyle}
    />
  );
}

function isFormElement(element: DesignElement): element is FormElement {
  return element.type === "form";
}

function getFieldName(element: FormElement) {
  const label = (element.label || element.placeholder || element.fieldKind)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${label || "field"}_${element.id}`;
}

function getPublicElementLink(value: string | undefined) {
  const link = value?.trim();

  if (!link) {
    return null;
  }

  if (link.startsWith("#") || link.startsWith("/")) {
    return link;
  }

  if (/^(https?:|mailto:|tel:)/i.test(link)) {
    return link;
  }

  if (/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(link)) {
    return `https://${link}`;
  }

  return null;
}

function getLinkLabel(element: DesignElement) {
  if (element.type === "text") {
    return element.content.trim() || "Open linked content";
  }

  if (element.type === "embed") {
    return element.title || "Open embedded link";
  }

  return "Open linked content";
}
