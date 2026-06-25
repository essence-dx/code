import { nanoid } from "nanoid";

import {
  createConnectorElement,
  createShapeElement,
  createStickyNoteElement,
  createTextElement,
} from "@/features/editor/document-factory";
import {
  createCardBoardElements,
  createMindMapElements,
} from "@/features/editor/diagram-card-presets";
import type { DesignElement } from "@/features/editor/types";

export type DiagramPresetId =
  | "flowchart"
  | "org-chart"
  | "mind-map"
  | "card-board";

export type DiagramPreset = {
  id: DiagramPresetId;
  name: string;
  description: string;
  createElements: () => DesignElement[];
};

export const diagramPresets: DiagramPreset[] = [
  {
    id: "flowchart",
    name: "Flowchart",
    description: "Process boxes with connector arrows.",
    createElements: createFlowchartElements,
  },
  {
    id: "org-chart",
    name: "Org chart",
    description: "Role cards connected to a lead node.",
    createElements: createOrgChartElements,
  },
  {
    id: "mind-map",
    name: "Mind map",
    description: "Central idea with editable branches and notes.",
    createElements: createMindMapElements,
  },
  {
    id: "card-board",
    name: "Card board",
    description: "Workflow cards arranged in editable columns.",
    createElements: createCardBoardElements,
  },
];

export function createFlowchartElements(): DesignElement[] {
  return [
    ...createDiagramNode({
      x: 120,
      y: 180,
      label: "Start",
      fill: "#e0f2fe",
      accent: "#0284c7",
    }),
    createConnectorElement({
      x: 400,
      y: 220,
      width: 220,
      height: 48,
      stroke: "#0284c7",
      strokeWidth: 4,
    }),
    ...createDiagramNode({
      x: 620,
      y: 180,
      label: "Draft",
      fill: "#fef9c3",
      accent: "#ca8a04",
    }),
    createConnectorElement({
      x: 900,
      y: 220,
      width: 220,
      height: 48,
      stroke: "#ca8a04",
      strokeWidth: 4,
    }),
    ...createDiagramNode({
      x: 1120,
      y: 180,
      label: "Review",
      fill: "#dcfce7",
      accent: "#16a34a",
    }),
    createConnectorElement({
      connectorKind: "elbow",
      x: 1260,
      y: 300,
      width: 110,
      height: 210,
      stroke: "#16a34a",
      strokeWidth: 4,
    }),
    ...createDiagramNode({
      x: 1120,
      y: 510,
      label: "Ship",
      fill: "#ede9fe",
      accent: "#7c3aed",
    }),
    createStickyNoteElement({
      x: 620,
      y: 470,
      width: 280,
      height: 170,
      content: "Add assumptions, owners, and risk notes here.",
      fill: "#fff7ed",
      textColor: "#431407",
      accentColor: "#f97316",
      fontSize: 22,
    }),
  ];
}

export function createOrgChartElements(): DesignElement[] {
  return [
    ...createDiagramNode({
      x: 540,
      y: 120,
      width: 360,
      label: "Lead",
      fill: "#eef2ff",
      accent: "#4f46e5",
    }),
    createConnectorElement({
      connectorKind: "elbow",
      x: 310,
      y: 300,
      width: 410,
      height: 160,
      stroke: "#4f46e5",
      strokeWidth: 4,
    }),
    createConnectorElement({
      x: 670,
      y: 300,
      width: 120,
      height: 170,
      stroke: "#4f46e5",
      strokeWidth: 4,
    }),
    createConnectorElement({
      connectorKind: "elbow",
      x: 720,
      y: 300,
      width: 420,
      height: 160,
      stroke: "#4f46e5",
      strokeWidth: 4,
    }),
    ...createDiagramNode({
      x: 160,
      y: 470,
      width: 300,
      label: "Design",
      fill: "#ecfeff",
      accent: "#0891b2",
    }),
    ...createDiagramNode({
      x: 570,
      y: 470,
      width: 300,
      label: "Build",
      fill: "#f0fdf4",
      accent: "#16a34a",
    }),
    ...createDiagramNode({
      x: 980,
      y: 470,
      width: 300,
      label: "Launch",
      fill: "#fff7ed",
      accent: "#ea580c",
    }),
  ];
}

function createDiagramNode(args: {
  x: number;
  y: number;
  label: string;
  fill: string;
  accent: string;
  width?: number;
  height?: number;
}): DesignElement[] {
  const groupId = nanoid();
  const width = args.width ?? 280;
  const height = args.height ?? 120;

  return [
    createShapeElement({
      x: args.x,
      y: args.y,
      width,
      height,
      fill: args.fill,
      stroke: args.accent,
      strokeWidth: 3,
      radius: 18,
      groupId,
    }),
    createTextElement({
      x: args.x + 24,
      y: args.y + 34,
      width: width - 48,
      height: height - 48,
      content: args.label,
      color: "#111827",
      fontSize: 28,
      fontWeight: 800,
      textAlign: "center",
      groupId,
    }),
  ];
}
