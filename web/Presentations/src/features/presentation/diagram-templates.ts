import type { PresentationElement } from "./types"

export type DiagramTemplateId =
  | "process"
  | "cycle"
  | "hierarchy"
  | "matrix"
  | "pyramid"
  | "relationship"

export type DiagramTemplate = {
  id: DiagramTemplateId
  label: string
  description: string
  officeLayout: string
  textSlotCount: number
  shapeSlotCount: number
}

export type DiagramElementSpec = {
  type: PresentationElement["type"]
  patch: Partial<Omit<PresentationElement, "id" | "type">>
}

export const diagramTemplates: DiagramTemplate[] = [
  {
    id: "process",
    label: "Process",
    description: "Three-step horizontal process",
    officeLayout: "basicProcess",
    textSlotCount: 3,
    shapeSlotCount: 5,
  },
  {
    id: "cycle",
    label: "Cycle",
    description: "Four-stage loop with arrows",
    officeLayout: "basicCycle",
    textSlotCount: 4,
    shapeSlotCount: 8,
  },
  {
    id: "hierarchy",
    label: "Hierarchy",
    description: "One parent with two child nodes",
    officeLayout: "orgChart",
    textSlotCount: 3,
    shapeSlotCount: 6,
  },
  {
    id: "matrix",
    label: "Matrix",
    description: "Four editable quadrants",
    officeLayout: "basicMatrix",
    textSlotCount: 5,
    shapeSlotCount: 5,
  },
  {
    id: "pyramid",
    label: "Pyramid",
    description: "Three stacked priority levels",
    officeLayout: "basicPyramid",
    textSlotCount: 3,
    shapeSlotCount: 3,
  },
  {
    id: "relationship",
    label: "Relationship",
    description: "Two overlapping concept areas",
    officeLayout: "basicVenn",
    textSlotCount: 3,
    shapeSlotCount: 2,
  },
]

export const diagramGroupIdPrefix = "diagram:"

export const diagramTemplateIds = new Set<DiagramTemplateId>(
  diagramTemplates.map((template) => template.id),
)

export function diagramTemplateById(templateId: DiagramTemplateId) {
  return diagramTemplates.find((template) => template.id === templateId)
}

export function diagramGroupIdForTemplate(
  templateId: DiagramTemplateId,
  uniqueId: string,
) {
  return `${diagramGroupIdPrefix}${templateId}:${uniqueId}`
}

export function diagramTemplateIdFromGroupId(groupId: string) {
  if (!groupId.startsWith(diagramGroupIdPrefix)) return null

  const [templateId] = groupId.slice(diagramGroupIdPrefix.length).split(":")

  return diagramTemplateIds.has(templateId as DiagramTemplateId)
    ? (templateId as DiagramTemplateId)
    : null
}

function roundedNode(
  content: string,
  x: number,
  y: number,
  width = 18,
): DiagramElementSpec[] {
  return [
    {
      type: "shape",
      patch: {
        x,
        y,
        width,
        height: 12,
        background: "#eef2ff",
        radius: 10,
        shapeKind: "rounded",
        shapeStrokeColor: "#4f46e5",
        shapeStrokeWidth: 2,
      },
    },
    {
      type: "text",
      patch: {
        x: x + 1,
        y: y + 3.2,
        width: width - 2,
        height: 6,
        background: "transparent",
        color: "#312e81",
        content,
        fontSize: 18,
        fontWeight: 700,
        lineHeight: 1,
        textAlign: "center",
      },
    },
  ]
}

function arrow(
  x: number,
  y: number,
  width: number,
  rotation = 0,
): DiagramElementSpec {
  return {
    type: "shape",
    patch: {
      x,
      y,
      width,
      height: 8,
      background: "transparent",
      radius: 0,
      rotation,
      shapeKind: "arrow",
      shapeStrokeColor: "#64748b",
      shapeStrokeWidth: 3,
    },
  }
}

function matrixCell(
  content: string,
  x: number,
  y: number,
  background: string,
  color: string,
): DiagramElementSpec[] {
  return [
    {
      type: "shape",
      patch: {
        x,
        y,
        width: 22,
        height: 16,
        background,
        radius: 8,
        shapeKind: "rounded",
        shapeStrokeColor: "#475569",
        shapeStrokeWidth: 1.5,
      },
    },
    {
      type: "text",
      patch: {
        x: x + 2,
        y: y + 5,
        width: 18,
        height: 6,
        background: "transparent",
        color,
        content,
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 1,
        textAlign: "center",
      },
    },
  ]
}

function pyramidLevel(
  content: string,
  x: number,
  y: number,
  width: number,
  background: string,
  color: string,
): DiagramElementSpec[] {
  return [
    {
      type: "shape",
      patch: {
        x,
        y,
        width,
        height: 12,
        background,
        radius: 0,
        shapeKind: "trapezoid",
        shapeStrokeColor: "#334155",
        shapeStrokeWidth: 1.5,
      },
    },
    {
      type: "text",
      patch: {
        x: x + 2,
        y: y + 3.5,
        width: width - 4,
        height: 5,
        background: "transparent",
        color,
        content,
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 1,
        textAlign: "center",
      },
    },
  ]
}

export function diagramElementSpecs(
  templateId: DiagramTemplateId,
): DiagramElementSpec[] {
  if (templateId === "relationship") {
    return [
      {
        type: "shape",
        patch: {
          x: 25,
          y: 30,
          width: 28,
          height: 32,
          background: "#dbeafe",
          radius: 999,
          shapeKind: "ellipse",
          shapeStrokeColor: "#2563eb",
          shapeStrokeWidth: 2,
        },
      },
      {
        type: "shape",
        patch: {
          x: 47,
          y: 30,
          width: 28,
          height: 32,
          background: "#ede9fe",
          radius: 999,
          shapeKind: "ellipse",
          shapeStrokeColor: "#7c3aed",
          shapeStrokeWidth: 2,
        },
      },
      {
        type: "text",
        patch: {
          x: 28,
          y: 43,
          width: 16,
          height: 8,
          background: "transparent",
          color: "#1e3a8a",
          content: "A",
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1,
          textAlign: "center",
        },
      },
      {
        type: "text",
        patch: {
          x: 42,
          y: 43,
          width: 16,
          height: 8,
          background: "transparent",
          color: "#312e81",
          content: "Shared",
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1,
          textAlign: "center",
        },
      },
      {
        type: "text",
        patch: {
          x: 56,
          y: 43,
          width: 16,
          height: 8,
          background: "transparent",
          color: "#581c87",
          content: "B",
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1,
          textAlign: "center",
        },
      },
    ]
  }

  if (templateId === "cycle") {
    return [
      ...roundedNode("Plan", 31, 20, 18),
      arrow(52, 22, 14),
      ...roundedNode("Build", 64, 36, 18),
      arrow(66, 54, 14, 90),
      ...roundedNode("Review", 31, 52, 20),
      arrow(16, 54, 14, 180),
      ...roundedNode("Improve", 13, 36, 20),
      arrow(16, 28, 14, -90),
    ]
  }

  if (templateId === "hierarchy") {
    return [
      ...roundedNode("Owner", 39, 18, 22),
      arrow(43, 32, 14, 90),
      arrow(32, 42, 18),
      arrow(52, 42, 18, 180),
      ...roundedNode("Team A", 22, 50, 20),
      ...roundedNode("Team B", 58, 50, 20),
    ]
  }

  if (templateId === "matrix") {
    return [
      {
        type: "shape",
        patch: {
          x: 28,
          y: 22,
          width: 44,
          height: 36,
          background: "transparent",
          radius: 10,
          shapeKind: "rounded",
          shapeStrokeColor: "#0f172a",
          shapeStrokeWidth: 2,
        },
      },
      ...matrixCell("Value", 29, 23, "#dcfce7", "#14532d"),
      ...matrixCell("Risk", 49, 23, "#fee2e2", "#7f1d1d"),
      ...matrixCell("Cost", 29, 41, "#fef3c7", "#78350f"),
      ...matrixCell("Reach", 49, 41, "#dbeafe", "#1e3a8a"),
      {
        type: "text",
        patch: {
          x: 37,
          y: 59,
          width: 26,
          height: 6,
          background: "transparent",
          color: "#475569",
          content: "Decision matrix",
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1,
          textAlign: "center",
        },
      },
    ]
  }

  if (templateId === "pyramid") {
    return [
      ...pyramidLevel("Focus", 41, 18, 18, "#fef3c7", "#78350f"),
      ...pyramidLevel("Capability", 32, 34, 36, "#dbeafe", "#1e3a8a"),
      ...pyramidLevel("Foundation", 22, 50, 56, "#e0e7ff", "#312e81"),
    ]
  }

  return [
    ...roundedNode("Step 1", 12, 36, 18),
    arrow(31, 38, 12),
    ...roundedNode("Step 2", 43, 36, 18),
    arrow(62, 38, 12),
    ...roundedNode("Step 3", 74, 36, 18),
  ]
}
