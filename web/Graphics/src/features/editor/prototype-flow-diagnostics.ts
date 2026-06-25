import type { DesignDocument } from "@/features/editor/types";

export type PrototypeFlowPageNode = {
  pageId: string;
  pageName: string;
  prototypeStart: boolean;
  outgoingCount: number;
  incomingCount: number;
  brokenCount: number;
};

export type PrototypeFlowIssue = {
  id: string;
  severity: "high" | "medium" | "low";
  pageId: string;
  pageName: string;
  layerId?: string;
  layerName?: string;
  targetPageId?: string;
  label: string;
  detail: string;
};

export type PrototypeFlowDiagnostics = {
  pageCount: number;
  startPageCount: number;
  hotspotCount: number;
  brokenCount: number;
  warningCount: number;
  deadEndCount: number;
  unreachableCount: number;
  pages: PrototypeFlowPageNode[];
  issues: PrototypeFlowIssue[];
};

export function getPrototypeFlowDiagnostics(
  document: DesignDocument,
): PrototypeFlowDiagnostics {
  const pagesById = new Map(document.pages.map((page) => [page.id, page]));
  const nodes = new Map<string, PrototypeFlowPageNode>(
    document.pages.map((page) => [
      page.id,
      {
        pageId: page.id,
        pageName: page.name,
        prototypeStart: Boolean(page.prototypeStart),
        outgoingCount: 0,
        incomingCount: 0,
        brokenCount: 0,
      },
    ]),
  );
  const issues: PrototypeFlowIssue[] = [];
  let hotspotCount = 0;

  for (const page of document.pages) {
    const node = nodes.get(page.id);

    for (const layer of page.layers) {
      if (!layer.prototype) {
        continue;
      }

      hotspotCount += 1;

      if (node) {
        node.outgoingCount += 1;
      }

      const targetPage = pagesById.get(layer.prototype.targetPageId);

      if (targetPage) {
        const targetNode = nodes.get(targetPage.id);

        if (targetNode) {
          targetNode.incomingCount += 1;
        }
        continue;
      }

      if (node) {
        node.brokenCount += 1;
      }

      issues.push({
        id: `${page.id}:${layer.id}`,
        severity: "high",
        pageId: page.id,
        pageName: page.name,
        layerId: layer.id,
        layerName: layer.name,
        targetPageId: layer.prototype.targetPageId,
        label: "Broken hotspot target",
        detail: `${layer.name} targets missing page ${layer.prototype.targetPageId}.`,
      });
    }
  }

  const pageNodes = Array.from(nodes.values());

  if (hotspotCount > 0 && document.pages.every((page) => !page.prototypeStart)) {
    const firstPage = document.pages[0];

    if (firstPage) {
      issues.push({
        id: `${firstPage.id}:missing-start`,
        severity: "high",
        pageId: firstPage.id,
        pageName: firstPage.name,
        label: "Missing start page",
        detail: "Prototype has hotspots but no page is marked as a starting point.",
      });
    }
  }

  if (document.pages.filter((page) => page.prototypeStart).length > 1) {
    for (const page of document.pages.filter((item) => item.prototypeStart)) {
      issues.push({
        id: `${page.id}:multiple-starts`,
        severity: "medium",
        pageId: page.id,
        pageName: page.name,
        label: "Multiple start pages",
        detail: "This file has more than one prototype start page.",
      });
    }
  }

  for (const page of pageNodes) {
    if (!page.prototypeStart && page.incomingCount === 0 && page.outgoingCount > 0) {
      issues.push({
        id: `${page.pageId}:unreachable`,
        severity: "medium",
        pageId: page.pageId,
        pageName: page.pageName,
        label: "Unreachable prototype page",
        detail: "Page has outgoing hotspots but no incoming path from another page.",
      });
    }

    if (page.incomingCount > 0 && page.outgoingCount === 0) {
      issues.push({
        id: `${page.pageId}:dead-end`,
        severity: "low",
        pageId: page.pageId,
        pageName: page.pageName,
        label: "Prototype dead end",
        detail: "Page can be reached but has no outgoing hotspot.",
      });
    }
  }

  return {
    pageCount: document.pages.length,
    startPageCount: document.pages.filter((page) => page.prototypeStart).length,
    hotspotCount,
    brokenCount: issues.filter((issue) => issue.label === "Broken hotspot target")
      .length,
    warningCount: issues.length,
    deadEndCount: issues.filter((issue) => issue.label === "Prototype dead end")
      .length,
    unreachableCount: issues.filter(
      (issue) => issue.label === "Unreachable prototype page",
    ).length,
    pages: pageNodes,
    issues: issues.sort((left, right) => {
      if (left.severity !== right.severity) {
        return getSeverityRank(left.severity) - getSeverityRank(right.severity);
      }

      return left.pageName.localeCompare(right.pageName);
    }),
  };
}

export function getPrototypeFlowDiagnosticsCsv(
  report: PrototypeFlowDiagnostics,
) {
  return [
    ["severity", "page", "layer", "label", "detail", "targetPageId"],
    ...report.issues.map((issue) => [
      issue.severity,
      issue.pageName,
      issue.layerName ?? "",
      issue.label,
      issue.detail,
      issue.targetPageId ?? "",
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getPrototypeFlowDiagnosticsMarkdown(
  report: PrototypeFlowDiagnostics,
) {
  const lines = [
    "# Prototype Flow Review",
    "",
    `Pages: ${report.pageCount}`,
    `Start pages: ${report.startPageCount}`,
    `Hotspots: ${report.hotspotCount}`,
    `Broken targets: ${report.brokenCount}`,
    `Unreachable pages: ${report.unreachableCount}`,
    `Dead ends: ${report.deadEndCount}`,
    "",
    "## Issues",
    "",
  ];

  if (report.issues.length === 0) {
    lines.push("- No prototype flow issues found.");
  }

  for (const issue of report.issues) {
    const layer = issue.layerName ? ` / ${issue.layerName}` : "";
    lines.push(
      `- ${issue.severity.toUpperCase()} - ${issue.pageName}${layer}: ${issue.label}. ${issue.detail}`,
    );
  }

  lines.push("", "## Pages", "");

  for (const page of report.pages) {
    lines.push(
      `- ${page.pageName}${page.prototypeStart ? " (start)" : ""}: out ${page.outgoingCount}, in ${page.incomingCount}, broken ${page.brokenCount}`,
    );
  }

  return lines.join("\n");
}

export function getRecommendedPrototypeStartPageId(
  report: PrototypeFlowDiagnostics,
) {
  if (report.startPageCount === 1) {
    return null;
  }

  return (
    report.pages.find(
      (page) => page.prototypeStart && page.outgoingCount > 0,
    )?.pageId ??
    report.pages.find((page) => page.outgoingCount > 0 && page.incomingCount === 0)
      ?.pageId ??
    report.pages.find((page) => page.outgoingCount > 0)?.pageId ??
    report.pages[0]?.pageId ??
    null
  );
}

function getSeverityRank(severity: PrototypeFlowIssue["severity"]) {
  if (severity === "high") {
    return 0;
  }

  if (severity === "medium") {
    return 1;
  }

  return 2;
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
