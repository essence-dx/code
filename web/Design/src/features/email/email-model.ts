import type {
  DesignElement,
  DesignPage,
  ImageElement,
  ProjectDetail,
  ShapeElement,
  TextElement,
} from "@/features/editor/types";
import { createProjectAssetUrlForDataUrl } from "@/features/assets/project-asset-manifest";
import {
  createReusableEmailSection,
  normalizeEmailBlockPackId,
  type EmailBlockPackId,
} from "@/features/email/email-block-library";

export type EmailBlock =
  | {
      id: string;
      type: "text";
      content: string;
      align: "left" | "center" | "right";
      color: string;
      fontFamily: string;
      fontSize: number;
      fontWeight: number;
      lineHeight: number;
      backgroundColor: string;
      padding: number;
    }
  | {
      id: string;
      type: "image";
      src: string;
      sourceKind: "hosted" | "remote" | "embedded" | "unsafe";
      alt: string;
      href: string | null;
      width: number;
      height: number;
      padding: number;
    }
  | {
      id: string;
      type: "button";
      label: string;
      href: string;
      backgroundColor: string;
      color: string;
      align: "left" | "center" | "right";
      padding: number;
    }
  | {
      id: string;
      type: "divider";
      color: string;
      height: number;
      padding: number;
    }
  | {
      id: string;
      type: "spacer";
      height: number;
    };

export type EmailSection = {
  id: string;
  name: string;
  background: string;
  blocks: EmailBlock[];
};

export type EmailModel = {
  version: 1;
  sourceProjectId: string;
  subject: string;
  previewText: string;
  blockPackId: EmailBlockPackId;
  width: number;
  sections: EmailSection[];
};

export function createEmailModelFromProject(input: {
  project: ProjectDetail;
  subject?: string;
  previewText?: string;
  assetBaseUrl?: string;
  blockPackId?: string | null;
}): EmailModel {
  const blockPackId = normalizeEmailBlockPackId(input.blockPackId);
  const designSections = input.project.document.pages.map((page) =>
    createEmailSection({
      page,
      projectId: input.project.id,
      assetBaseUrl: input.assetBaseUrl,
    }),
  );
  const reusableSection = createReusableEmailSection(blockPackId);

  return {
    version: 1,
    sourceProjectId: input.project.id,
    subject: normalizeText(input.subject, 120) || input.project.name,
    previewText: normalizeText(input.previewText, 180),
    blockPackId,
    width: 600,
    sections: reusableSection ? [...designSections, reusableSection] : designSections,
  };
}

function createEmailSection({
  page,
  projectId,
  assetBaseUrl,
}: {
  page: DesignPage;
  projectId: string;
  assetBaseUrl?: string;
}): EmailSection {
  const visibleElements = page.elements
    .filter((element) => !element.hidden)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const blocks = visibleElements.flatMap((element) =>
    createEmailBlocksFromElement({ element, projectId, assetBaseUrl }),
  );

  return {
    id: page.id,
    name: page.name,
    background: page.background,
    blocks: blocks.length
      ? blocks
      : [
          {
            id: `${page.id}-empty`,
            type: "spacer",
            height: 32,
          },
        ],
  };
}

function createEmailBlocksFromElement({
  element,
  projectId,
  assetBaseUrl,
}: {
  element: DesignElement;
  projectId: string;
  assetBaseUrl?: string;
}): EmailBlock[] {
  if (element.type === "text") {
    return [createTextBlock(element)];
  }

  if (element.type === "image") {
    return [createImageBlock({ element, projectId, assetBaseUrl })];
  }

  if (element.type === "shape") {
    return createShapeBlocks(element);
  }

  if (element.type === "form" && element.fieldKind === "button") {
    return [
      {
        id: element.id,
        type: "button",
        label: normalizeText(element.label || element.value, 80) || "Open",
        href: normalizeHref(element.linkUrl) || "#",
        backgroundColor: element.accentColor,
        color: element.textColor,
        align: "center",
        padding: Math.max(12, Math.min(32, element.padding)),
      },
    ];
  }

  return [];
}

function createTextBlock(element: TextElement): EmailBlock {
  return {
    id: element.id,
    type: "text",
    content: element.content,
    align: element.textAlign,
    color: element.color,
    fontFamily: element.fontFamily,
    fontSize: Math.max(12, Math.min(42, element.fontSize)),
    fontWeight: element.fontWeight,
    lineHeight: Math.max(1, Math.min(1.8, element.lineHeight)),
    backgroundColor: "transparent",
    padding: 16,
  };
}

function createImageBlock({
  element,
  projectId,
  assetBaseUrl,
}: {
  element: ImageElement;
  projectId: string;
  assetBaseUrl?: string;
}): EmailBlock {
  const hosted = createHostedImageSource({
    src: element.src,
    projectId,
    elementId: element.id,
    assetBaseUrl,
  });

  return {
    id: element.id,
    type: "image",
    src: hosted.src,
    sourceKind: hosted.sourceKind,
    alt: element.alt,
    href: normalizeHref(element.linkUrl),
    width: Math.min(600, Math.max(160, Math.round(element.width))),
    height: Math.max(1, Math.round(element.height)),
    padding: 16,
  };
}

function createHostedImageSource(input: {
  src: string;
  projectId: string;
  elementId: string;
  assetBaseUrl?: string;
}): Pick<Extract<EmailBlock, { type: "image" }>, "src" | "sourceKind"> {
  if (input.src.startsWith("http://") || input.src.startsWith("https://")) {
    return { src: input.src, sourceKind: "remote" };
  }

  if (input.src.startsWith("data:image/") && input.assetBaseUrl) {
    return {
      src: createProjectAssetUrlForDataUrl({
        projectId: input.projectId,
        dataUrl: input.src,
        assetBaseUrl: input.assetBaseUrl,
      }),
      sourceKind: "hosted",
    };
  }

  if (input.src.startsWith("data:image/")) {
    return { src: input.src, sourceKind: "embedded" };
  }

  return { src: input.src, sourceKind: "unsafe" };
}

function createShapeBlocks(element: ShapeElement): EmailBlock[] {
  if (element.shape === "line") {
    return [
      {
        id: element.id,
        type: "divider",
        color: element.stroke || element.fill,
        height: Math.max(1, Math.round(element.strokeWidth || element.height)),
        padding: 16,
      },
    ];
  }

  if (element.linkUrl) {
    return [
      {
        id: element.id,
        type: "button",
        label: "Open link",
        href: normalizeHref(element.linkUrl) || "#",
        backgroundColor: element.fill,
        color: readableTextColor(element.fill),
        align: "center",
        padding: 16,
      },
    ];
  }

  return [{ id: element.id, type: "spacer", height: Math.max(8, element.height) }];
}

function normalizeHref(value: string | undefined) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("mailto:")) return value;

  return null;
}

function readableTextColor(background: string) {
  const match = background.match(/^#([0-9a-f]{6})$/i);
  if (!match) return "#ffffff";

  const value = match[1];
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#111827" : "#ffffff";
}

function normalizeText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}
