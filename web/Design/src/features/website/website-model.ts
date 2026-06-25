import type {
  DesignDocument,
  DesignPage,
  ProjectDetail,
  WebsiteModel,
  WebsiteNavigationStyle,
  WebsiteSection,
} from "@/features/editor/types";
import { getPageDimensions } from "@/features/editor/page-dimensions";

export const websiteNavigationStyles = [
  "top",
  "pills",
  "side",
  "hidden",
] as const satisfies readonly WebsiteNavigationStyle[];

export function createWebsiteModelFromProject(input: {
  project: ProjectDetail;
  title: string;
  seoTitle: string;
  seoDescription: string;
  navigationStyle: WebsiteNavigationStyle;
}): WebsiteModel {
  return {
    version: 1,
    sourceProjectId: input.project.id,
    title: input.title,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    navigationStyle: input.navigationStyle,
    sections: createWebsiteSections(input.project.document),
  };
}

export function parseWebsiteModel(value: unknown): WebsiteModel {
  if (isWebsiteModel(value)) {
    return normalizeWebsiteModel(value);
  }

  if (typeof value === "string") {
    const parsed = JSON.parse(value) as unknown;

    if (isWebsiteModel(parsed)) {
      return normalizeWebsiteModel(parsed);
    }
  }

  throw new Error("Invalid website model");
}

export function stringifyWebsiteModel(model: WebsiteModel) {
  return JSON.stringify(model);
}

export function normalizeWebsiteNavigationStyle(
  value: unknown,
): WebsiteNavigationStyle {
  return websiteNavigationStyles.includes(value as WebsiteNavigationStyle)
    ? (value as WebsiteNavigationStyle)
    : "top";
}

function createWebsiteSections(document: DesignDocument): WebsiteSection[] {
  const anchorIds = createSectionAnchorIds(document.pages);

  return document.pages.map((page, index) => {
    const dimensions = getPageDimensions(document, page);

    return {
      id: page.id,
      anchorId: anchorIds[index] ?? page.id,
      name: page.name,
      navigationLabel:
        normalizeText(page.websiteNavLabel, 80) ||
        normalizeText(page.name, 80) ||
        `Section ${index + 1}`,
      navigationGroup: normalizeText(page.websiteNavGroup, 80),
      showInNavigation: page.websiteHideFromNavigation !== true,
      seoTitle:
        normalizeText(page.websiteSeoTitle, 120) ||
        normalizeText(page.name, 120) ||
        `Section ${index + 1}`,
      seoDescription:
        normalizeText(page.websiteSeoDescription, 180) ||
        normalizeText(page.notes, 180),
      background: page.background,
      width: dimensions.width,
      height: dimensions.height,
      elements: page.elements,
    };
  });
}

function isWebsiteModel(value: unknown): value is WebsiteModel {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<WebsiteModel>;

  return (
    candidate.version === 1 &&
    typeof candidate.sourceProjectId === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.seoTitle === "string" &&
    typeof candidate.seoDescription === "string" &&
    Array.isArray(candidate.sections)
  );
}

function normalizeWebsiteModel(model: WebsiteModel): WebsiteModel {
  const anchorIds = createSectionAnchorIds(
    model.sections.map((section) => ({
      id: section.id,
      name: section.name,
      background: section.background,
      elements: section.elements,
    })),
  );

  return {
    ...model,
    sections: model.sections.map((section, index) => ({
      ...section,
      anchorId: section.anchorId || anchorIds[index] || section.id,
      navigationLabel:
        normalizeText(section.navigationLabel, 80) ||
        normalizeText(section.name, 80) ||
        `Section ${index + 1}`,
      navigationGroup: normalizeText(section.navigationGroup, 80),
      showInNavigation: section.showInNavigation !== false,
      seoTitle:
        normalizeText(section.seoTitle, 120) ||
        normalizeText(section.name, 120) ||
        `Section ${index + 1}`,
      seoDescription: normalizeText(section.seoDescription, 180),
    })),
    navigationStyle: normalizeWebsiteNavigationStyle(model.navigationStyle),
  };
}

function createSectionAnchorIds(
  sections: Array<Pick<DesignPage, "id" | "name">>,
) {
  const countsByBase = new Map<string, number>();

  return sections.map((section, index) => {
    const base = slugify(section.name) || `section-${index + 1}`;
    const count = countsByBase.get(base) ?? 0;

    countsByBase.set(base, count + 1);

    return count === 0 ? base : `${base}-${count + 1}`;
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}
