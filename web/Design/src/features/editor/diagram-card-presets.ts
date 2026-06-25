import { nanoid } from "nanoid";

import {
  createConnectorElement,
  createShapeElement,
  createStickyNoteElement,
  createTextElement,
} from "@/features/editor/document-factory";
import type { DesignElement } from "@/features/editor/types";

export function createMindMapElements(): DesignElement[] {
  const center = createMindMapNode({
    x: 720,
    y: 310,
    width: 360,
    height: 132,
    label: "Launch plan",
    fill: "#eef2ff",
    accent: "#4f46e5",
  });
  const centerAnchorId = center[0].id;
  const branches = [
    {
      x: 260,
      y: 120,
      label: "Audience",
      note: "Who needs this?",
      fill: "#ecfeff",
      accent: "#0891b2",
    },
    {
      x: 1190,
      y: 120,
      label: "Channels",
      note: "Where it ships",
      fill: "#f0fdf4",
      accent: "#16a34a",
    },
    {
      x: 240,
      y: 540,
      label: "Assets",
      note: "Creative checklist",
      fill: "#fff7ed",
      accent: "#ea580c",
    },
    {
      x: 1180,
      y: 540,
      label: "Risks",
      note: "What can break",
      fill: "#fef2f2",
      accent: "#dc2626",
    },
  ];

  return [
    ...center,
    ...branches.flatMap((branch) => {
      const branchNode = createMindMapNode({
        x: branch.x,
        y: branch.y,
        label: branch.label,
        fill: branch.fill,
        accent: branch.accent,
      });

      return [
        createConnectorElement({
          x: Math.min(900, branch.x + 150),
          y: Math.min(376, branch.y + 80),
          width: Math.abs(branch.x + 150 - 900),
          height: Math.abs(branch.y + 80 - 376) + 36,
          stroke: branch.accent,
          strokeWidth: 4,
          endMarker: "none",
          startElementId: centerAnchorId,
          endElementId: branchNode[0].id,
          startAnchor: "auto",
          endAnchor: "auto",
        }),
        ...branchNode,
        createStickyNoteElement({
          x: branch.x + 18,
          y: branch.y + 126,
          width: 264,
          height: 104,
          content: branch.note,
          fill: "#ffffff",
          textColor: "#334155",
          accentColor: branch.accent,
          fontSize: 18,
        }),
      ];
    }),
  ];
}

export function createCardBoardElements(): DesignElement[] {
  const columns = [
    {
      title: "Backlog",
      x: 120,
      accent: "#64748b",
      cards: ["Collect references", "Write campaign brief"],
    },
    {
      title: "In progress",
      x: 460,
      accent: "#0284c7",
      cards: ["Design hero set", "Build launch page"],
    },
    {
      title: "Review",
      x: 800,
      accent: "#ca8a04",
      cards: ["Check copy", "Approve exports"],
    },
    {
      title: "Done",
      x: 1140,
      accent: "#16a34a",
      cards: ["Publish package", "Archive source"],
    },
  ];

  const columnElements = columns.map((column) =>
    createCardBoardColumn(column.title, column.x, column.accent, column.cards),
  );
  const elements: DesignElement[] = columnElements.flatMap(
    (column) => column.elements,
  );

  elements.push(
    createConnectorElement({
      x: 358,
      y: 408,
      width: 128,
      height: 42,
      stroke: "#64748b",
      strokeWidth: 3,
      label: "prioritize",
      startElementId: columnElements[0].anchorElementId,
      endElementId: columnElements[1].anchorElementId,
      startAnchor: "right",
      endAnchor: "left",
    }),
    createConnectorElement({
      x: 696,
      y: 408,
      width: 128,
      height: 42,
      stroke: "#0284c7",
      strokeWidth: 3,
      label: "review",
      startElementId: columnElements[1].anchorElementId,
      endElementId: columnElements[2].anchorElementId,
      startAnchor: "right",
      endAnchor: "left",
    }),
    createConnectorElement({
      x: 1036,
      y: 408,
      width: 128,
      height: 42,
      stroke: "#16a34a",
      strokeWidth: 3,
      label: "ship",
      startElementId: columnElements[2].anchorElementId,
      endElementId: columnElements[3].anchorElementId,
      startAnchor: "right",
      endAnchor: "left",
    }),
  );

  return elements;
}

function createMindMapNode(args: {
  x: number;
  y: number;
  label: string;
  fill: string;
  accent: string;
  width?: number;
  height?: number;
}) {
  const groupId = nanoid();
  const width = args.width ?? 300;
  const height = args.height ?? 108;

  return [
    createShapeElement({
      x: args.x,
      y: args.y,
      width,
      height,
      fill: args.fill,
      stroke: args.accent,
      strokeWidth: 3,
      radius: 999,
      groupId,
    }),
    createTextElement({
      x: args.x + 26,
      y: args.y + 34,
      width: width - 52,
      height: height - 56,
      content: args.label,
      color: "#111827",
      fontSize: 26,
      fontWeight: 800,
      textAlign: "center",
      groupId,
    }),
  ];
}

function createCardBoardColumn(
  title: string,
  x: number,
  accent: string,
  cards: string[],
): { elements: DesignElement[]; anchorElementId: string } {
  const groupId = nanoid();
  const columnWidth = 280;
  const columnShape = createShapeElement({
    x,
    y: 120,
    width: columnWidth,
    height: 520,
    fill: "#f8fafc",
    stroke: accent,
    strokeWidth: 3,
    radius: 22,
    groupId,
  });

  return {
    anchorElementId: columnShape.id,
    elements: [
      columnShape,
      createTextElement({
        x: x + 24,
        y: 148,
        width: columnWidth - 48,
        height: 42,
        content: title,
        color: "#0f172a",
        fontSize: 24,
        fontWeight: 900,
        textAlign: "center",
        groupId,
      }),
      ...cards.map((card, index) =>
        createStickyNoteElement({
          x: x + 24,
          y: 230 + index * 158,
          width: columnWidth - 48,
          height: 118,
          content: card,
          fill: "#ffffff",
          textColor: "#0f172a",
          accentColor: accent,
          fontSize: 20,
          fontWeight: 800,
        }),
      ),
    ],
  };
}
