import { nanoid } from "nanoid";

import {
  createConnectorElement,
  createShapeElement,
  createTextElement,
} from "@/features/editor/document-factory";
import type { DesignElement, DesignPage } from "@/features/editor/types";

type MermaidDirection = "LR" | "RL" | "TD" | "TB" | "BT";

type MermaidNode = {
  id: string;
  label: string;
};

type MermaidEdge = {
  from: string;
  to: string;
  label?: string;
};

type ParsedMermaidDiagram = {
  direction: MermaidDirection;
  nodes: MermaidNode[];
  edges: MermaidEdge[];
  warnings: string[];
};

export type MermaidImportResult = {
  elements: DesignElement[];
  warnings: string[];
};

const nodeWidth = 260;
const nodeHeight = 112;
const horizontalGap = 360;
const verticalGap = 172;

export const mermaidStarterDiagram = `flowchart LR
  brief["Campaign brief"]
  design["Design draft"]
  review{"Approved?"}
  publish["Publish"]

  brief --> design
  design --> review
  review -->|Yes| publish
  review -->|No| design`;

export function createMermaidDiagramElements(
  source: string,
): MermaidImportResult {
  const parsed = parseMermaidDiagram(source);
  const layout = layoutMermaidNodes(parsed);
  const elements: DesignElement[] = [];

  for (const node of parsed.nodes) {
    const point = layout.get(node.id);

    if (!point) continue;

    elements.push(...createMermaidNodeElements(node.label, point.x, point.y));
  }

  for (const edge of parsed.edges) {
    const from = layout.get(edge.from);
    const to = layout.get(edge.to);

    if (!from || !to) {
      parsed.warnings.push(`Skipped edge ${edge.from} to ${edge.to}.`);
      continue;
    }

    elements.push(createMermaidConnectorElement(from, to, edge.label));

    if (edge.label) {
      elements.push(createMermaidEdgeLabel(edge.label, from, to));
    }
  }

  return { elements, warnings: parsed.warnings };
}

export function exportPageToMermaid(page: DesignPage) {
  const nodes = getExportableNodes(page.elements);
  const nodeIds = new Map<string, string>();
  const lines = ["flowchart LR"];

  nodes.forEach((node, index) => {
    const nodeId = `N${index + 1}`;
    nodeIds.set(node.id, nodeId);
    lines.push(`  ${nodeId}["${escapeMermaidLabel(node.label)}"]`);
  });

  const connectors = page.elements.filter(
    (element): element is Extract<DesignElement, { type: "connector" }> =>
      element.type === "connector" && !element.hidden,
  );

  for (const connector of connectors) {
    const from = getNearestNodeId(nodes, connector.x, connector.y);
    const to = getNearestNodeId(
      nodes,
      connector.x + connector.width,
      connector.y + connector.height,
    );

    if (!from || !to || from === to) continue;

    const fromId = nodeIds.get(from);
    const toId = nodeIds.get(to);

    if (!fromId || !toId) continue;

    const label = connector.label?.trim();
    lines.push(
      label
        ? `  ${fromId} -->|${escapeMermaidLabel(label)}| ${toId}`
        : `  ${fromId} --> ${toId}`,
    );
  }

  return lines.join("\n");
}

function parseMermaidDiagram(source: string): ParsedMermaidDiagram {
  const nodes = new Map<string, MermaidNode>();
  const edges: MermaidEdge[] = [];
  const warnings: string[] = [];
  let direction: MermaidDirection = "LR";

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/;$/, "");

    if (!line || line.startsWith("%%")) continue;

    const header = line.match(/^(?:flowchart|graph)\s+(LR|RL|TD|TB|BT)$/i);

    if (header) {
      direction = header[1].toUpperCase() as MermaidDirection;
      continue;
    }

    const edge = parseMermaidEdge(line);

    if (edge) {
      nodes.set(edge.from.id, edge.from);
      nodes.set(edge.to.id, edge.to);
      edges.push({
        from: edge.from.id,
        to: edge.to.id,
        label: edge.label,
      });
      continue;
    }

    const node = parseMermaidNodeToken(line);

    if (node && node.label !== node.id) {
      nodes.set(node.id, node);
    } else {
      warnings.push(`Ignored unsupported Mermaid line: ${line}`);
    }
  }

  if (nodes.size === 0) {
    warnings.push("No Mermaid nodes were found.");
  }

  return {
    direction,
    nodes: [...nodes.values()],
    edges,
    warnings,
  };
}

function parseMermaidEdge(line: string) {
  const match = line.match(
    /^(.+?)\s*(-->|---|==>|-.->)\s*(?:\|([^|]+)\|\s*)?(.+)$/,
  );

  if (!match) return null;

  const from = parseMermaidNodeToken(match[1]);
  const to = parseMermaidNodeToken(match[4]);

  if (!from || !to) return null;

  return {
    from,
    to,
    label: stripMermaidQuotes(match[3] ?? ""),
  };
}

function parseMermaidNodeToken(token: string): MermaidNode | null {
  const trimmed = token.trim();
  const match = trimmed.match(
    /^([A-Za-z][\w-]*)(?:\s*(?:\[\[?(.+?)\]?\]|\(\(?(.+?)\)?\)|\{(.+?)\}))?$/,
  );

  if (!match) return null;

  const id = match[1];
  const rawLabel = match[2] ?? match[3] ?? match[4] ?? id;

  return {
    id,
    label: stripMermaidQuotes(rawLabel),
  };
}

function layoutMermaidNodes(parsed: ParsedMermaidDiagram) {
  const ranks = new Map(parsed.nodes.map((node) => [node.id, 0]));
  const rowsByRank = new Map<number, number>();
  const layout = new Map<string, { x: number; y: number }>();
  const isHorizontal = parsed.direction === "LR" || parsed.direction === "RL";

  for (let pass = 0; pass < parsed.nodes.length; pass += 1) {
    for (const edge of parsed.edges) {
      const fromRank = ranks.get(edge.from) ?? 0;
      const toRank = ranks.get(edge.to) ?? 0;

      if (toRank <= fromRank) {
        ranks.set(edge.to, fromRank + 1);
      }
    }
  }

  for (const node of parsed.nodes) {
    const rank = ranks.get(node.id) ?? 0;
    const row = rowsByRank.get(rank) ?? 0;
    rowsByRank.set(rank, row + 1);

    layout.set(node.id, {
      x: isHorizontal ? 140 + rank * horizontalGap : 160 + row * horizontalGap,
      y: isHorizontal ? 160 + row * verticalGap : 130 + rank * verticalGap,
    });
  }

  return layout;
}

function createMermaidNodeElements(label: string, x: number, y: number) {
  const groupId = nanoid();

  return [
    createShapeElement({
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      fill: "#eef2ff",
      stroke: "#4f46e5",
      strokeWidth: 3,
      radius: 18,
      groupId,
    }),
    createTextElement({
      x: x + 22,
      y: y + 32,
      width: nodeWidth - 44,
      height: nodeHeight - 56,
      content: label,
      color: "#111827",
      fontSize: 24,
      fontWeight: 800,
      textAlign: "center",
      groupId,
    }),
  ];
}

function createMermaidConnectorElement(
  from: { x: number; y: number },
  to: { x: number; y: number },
  label?: string,
) {
  const fromCenter = {
    x: from.x + nodeWidth,
    y: from.y + nodeHeight / 2,
  };
  const toCenter = {
    x: to.x,
    y: to.y + nodeHeight / 2,
  };

  return createConnectorElement({
    x: Math.min(fromCenter.x, toCenter.x),
    y: Math.min(fromCenter.y, toCenter.y) - 20,
    width: Math.max(72, Math.abs(toCenter.x - fromCenter.x)),
    height: Math.max(40, Math.abs(toCenter.y - fromCenter.y) + 40),
    stroke: "#4f46e5",
    strokeWidth: 4,
    label: label ?? "",
  });
}

function createMermaidEdgeLabel(
  label: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  return createTextElement({
    x: Math.round((from.x + to.x) / 2 + nodeWidth / 2 - 70),
    y: Math.round((from.y + to.y) / 2 + nodeHeight / 2 - 38),
    width: 140,
    height: 32,
    content: label,
    color: "#312e81",
    fontSize: 16,
    fontWeight: 700,
    textAlign: "center",
  });
}

function getExportableNodes(elements: DesignElement[]) {
  const groups = new Map<
    string,
    {
      id: string;
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  >();
  const nodes: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];

  for (const element of elements) {
    if (element.hidden || element.type === "connector") continue;

    if (element.groupId) {
      const current = groups.get(element.groupId);
      const label = getElementNodeLabel(element);

      groups.set(element.groupId, {
        id: element.groupId,
        label: label || current?.label || "Node",
        x: Math.min(current?.x ?? element.x, element.x),
        y: Math.min(current?.y ?? element.y, element.y),
        width: Math.max(current?.width ?? element.width, element.width),
        height: Math.max(current?.height ?? element.height, element.height),
      });
      continue;
    }

    const label = getElementNodeLabel(element);

    if (!label) continue;

    nodes.push({
      id: element.id,
      label,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    });
  }

  return [...groups.values(), ...nodes].sort((first, second) =>
    first.y === second.y ? first.x - second.x : first.y - second.y,
  );
}

function getElementNodeLabel(element: DesignElement) {
  if (element.type === "text") return element.content.trim();
  if (element.type === "sticky-note") return element.content.trim();
  if (element.type === "shape") return element.shape;

  return "";
}

function getNearestNodeId(
  nodes: ReturnType<typeof getExportableNodes>,
  x: number,
  y: number,
) {
  let nearest: { id: string; distance: number } | null = null;

  for (const node of nodes) {
    const centerX = node.x + node.width / 2;
    const centerY = node.y + node.height / 2;
    const distance = Math.hypot(centerX - x, centerY - y);

    if (!nearest || distance < nearest.distance) {
      nearest = { id: node.id, distance };
    }
  }

  return nearest?.id ?? null;
}

function escapeMermaidLabel(label: string) {
  return label.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function stripMermaidQuotes(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}
