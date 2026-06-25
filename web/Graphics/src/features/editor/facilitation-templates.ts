import { nanoid } from "nanoid";
import type { DesignPagePatch } from "@/features/editor/document-utils";
import type { DesignComment, DesignLayer, DesignPage } from "@/features/editor/types";

export type FacilitationTemplateKind =
  | "critique"
  | "planning"
  | "retro"
  | "design-qa";

export const facilitationTemplateOptions = [
  { value: "critique", label: "Critique" },
  { value: "planning", label: "Planning" },
  { value: "retro", label: "Retro" },
  { value: "design-qa", label: "Design QA" },
] satisfies Array<{ value: FacilitationTemplateKind; label: string }>;

type TemplateColumn = {
  title: string;
  fill: string;
  textColor: string;
};

const templateColumns: Record<FacilitationTemplateKind, TemplateColumn[]> = {
  critique: [
    { title: "What works", fill: "#dcfce7", textColor: "#14532d" },
    { title: "Questions", fill: "#dbeafe", textColor: "#1e3a8a" },
    { title: "Risks", fill: "#fee2e2", textColor: "#7f1d1d" },
    { title: "Next decisions", fill: "#fef3c7", textColor: "#78350f" },
  ],
  planning: [
    { title: "Goals", fill: "#e0f2fe", textColor: "#0c4a6e" },
    { title: "Scope", fill: "#ede9fe", textColor: "#4c1d95" },
    { title: "Owners", fill: "#dcfce7", textColor: "#14532d" },
    { title: "Risks", fill: "#fee2e2", textColor: "#7f1d1d" },
  ],
  retro: [
    { title: "Keep", fill: "#dcfce7", textColor: "#14532d" },
    { title: "Improve", fill: "#fef3c7", textColor: "#78350f" },
    { title: "Stop", fill: "#fee2e2", textColor: "#7f1d1d" },
    { title: "Try next", fill: "#dbeafe", textColor: "#1e3a8a" },
  ],
  "design-qa": [
    { title: "Accessibility", fill: "#e0f2fe", textColor: "#0c4a6e" },
    { title: "Content", fill: "#fef3c7", textColor: "#78350f" },
    { title: "Responsive", fill: "#dcfce7", textColor: "#14532d" },
    { title: "Handoff", fill: "#ede9fe", textColor: "#4c1d95" },
  ],
};

export function createFacilitationTemplatePatch(
  page: DesignPage,
  kind: FacilitationTemplateKind,
): DesignPagePatch {
  const columns = templateColumns[kind];
  const origin = getTemplateOrigin(page.layers);
  const layers = columns.flatMap((column, index) =>
    createTemplateColumnLayers(column, origin.x + index * 220, origin.y),
  );
  const comment = createTemplateComment(kind, origin.x, origin.y - 48);

  return {
    layers: [...page.layers, ...layers],
    comments: [...(page.comments ?? []), comment],
  };
}

function createTemplateColumnLayers(
  column: TemplateColumn,
  x: number,
  y: number,
): DesignLayer[] {
  return [
    createStickyLayer({
      name: column.title,
      text: column.title,
      x,
      y,
      width: 180,
      height: 72,
      fill: column.fill,
      textColor: column.textColor,
      fontSize: 18,
      fontWeight: 700,
    }),
    createStickyLayer({
      name: `${column.title} note`,
      text: "Add notes",
      x,
      y: y + 92,
      width: 180,
      height: 132,
      fill: "#ffffff",
      textColor: "#18181b",
      fontSize: 15,
      fontWeight: 500,
    }),
  ];
}

function createStickyLayer({
  name,
  text,
  x,
  y,
  width,
  height,
  fill,
  textColor,
  fontSize,
  fontWeight,
}: {
  name: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  textColor: string;
  fontSize: number;
  fontWeight: number;
}): DesignLayer {
  return {
    id: nanoid(),
    type: "sticky",
    name,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill,
    stroke: "transparent",
    strokeWidth: 0,
    cornerRadius: 8,
    text,
    fontFamily: "Inter, Arial, sans-serif",
    fontSize,
    fontWeight,
    lineHeight: 1.25,
    letterSpacing: 0,
    textAlign: "left",
    textColor,
    textResizeMode: "fixed",
  };
}

function createTemplateComment(
  kind: FacilitationTemplateKind,
  x: number,
  y: number,
): DesignComment {
  const now = new Date().toISOString();
  const label =
    facilitationTemplateOptions.find((option) => option.value === kind)?.label ??
    "Facilitation";

  return {
    id: nanoid(),
    x,
    y,
    text: `${label} template added. Assign owners and close decisions as the session progresses.`,
    mentions: [],
    replies: [],
    resolved: false,
    createdAt: now,
    updatedAt: now,
  };
}

function getTemplateOrigin(layers: DesignLayer[]) {
  if (layers.length === 0) {
    return { x: 120, y: 120 };
  }

  const maxBottom = Math.max(...layers.map((layer) => layer.y + layer.height));

  return { x: 120, y: Math.ceil(maxBottom + 120) };
}
