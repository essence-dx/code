import { getContrastReport } from "@/features/editor/color-contrast";
import type { LayerPatch } from "@/features/editor/document-utils";
import type { DesignLayer, DesignPage } from "@/features/editor/types";

export type AccessibilityIssueSeverity = "high" | "medium" | "low";

export type AccessibilityIssue = {
  id: string;
  pageId?: string;
  pageName?: string;
  layerId?: string;
  severity: AccessibilityIssueSeverity;
  label: string;
  detail: string;
  fixable?: boolean;
};

export type AccessibilityAudit = {
  score: number;
  issues: AccessibilityIssue[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
  checkedLayerCount: number;
  textLayerCount: number;
  interactiveLayerCount: number;
};

export function getAccessibilityAudit(page: DesignPage): AccessibilityAudit {
  return getAuditForLayers(page, page.layers);
}

export function getDocumentAccessibilityAudit(
  pages: DesignPage[],
): AccessibilityAudit {
  const audits = pages.map(getAccessibilityAudit);
  const issues = audits.flatMap((audit) => audit.issues);
  const highCount = issues.filter((issue) => issue.severity === "high").length;
  const mediumCount = issues.filter(
    (issue) => issue.severity === "medium",
  ).length;
  const lowCount = issues.filter((issue) => issue.severity === "low").length;

  return {
    score: Math.max(0, 100 - highCount * 18 - mediumCount * 8 - lowCount * 3),
    issues,
    highCount,
    mediumCount,
    lowCount,
    checkedLayerCount: audits.reduce(
      (total, audit) => total + audit.checkedLayerCount,
      0,
    ),
    textLayerCount: audits.reduce(
      (total, audit) => total + audit.textLayerCount,
      0,
    ),
    interactiveLayerCount: audits.reduce(
      (total, audit) => total + audit.interactiveLayerCount,
      0,
    ),
  };
}

export function getSelectedAccessibilityAudit(
  page: DesignPage,
  selectedLayerIds: string[],
): AccessibilityAudit {
  const selected = new Set(selectedLayerIds);

  return getAuditForLayers(
    page,
    page.layers.filter((layer) => selected.has(layer.id)),
  );
}

export function getAccessibilityAuditCsv(audit: AccessibilityAudit) {
  return [
    ["severity", "page", "layerId", "label", "detail", "fixable"],
    ...audit.issues.map((issue) => [
      issue.severity,
      issue.pageName ?? "",
      issue.layerId ?? "",
      issue.label,
      issue.detail,
      issue.fixable ? "yes" : "no",
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getAccessibilityAuditMarkdown(
  audit: AccessibilityAudit,
  title = "Accessibility Audit",
) {
  const lines = [
    `# ${title}`,
    "",
    `Score: ${audit.score}`,
    `High issues: ${audit.highCount}`,
    `Medium issues: ${audit.mediumCount}`,
    `Low issues: ${audit.lowCount}`,
    `Checked layers: ${audit.checkedLayerCount}`,
    `Text layers: ${audit.textLayerCount}`,
    `Interactive layers: ${audit.interactiveLayerCount}`,
    "",
    "## Issues",
    "",
  ];

  if (audit.issues.length === 0) {
    lines.push("- No accessibility issues found.");
  }

  for (const issue of audit.issues) {
    const scope = issue.pageName ? `${issue.pageName}: ` : "";
    lines.push(
      `- ${issue.severity.toUpperCase()} - ${scope}${issue.label}. ${issue.detail}`,
    );
  }

  return lines.join("\n");
}

export function getAccessibilityQuickFixPatches(
  page: DesignPage,
  audit: AccessibilityAudit = getAccessibilityAudit(page),
): LayerPatch[] {
  const layerById = new Map(page.layers.map((layer) => [layer.id, layer]));
  const patchByLayerId = new Map<string, Partial<DesignLayer>>();

  for (const issue of audit.issues) {
    if (!issue.layerId || issue.pageId !== page.id) {
      continue;
    }

    const layer = layerById.get(issue.layerId);
    const patch = layer ? getQuickFixPatch(layer, issue, page.layers) : null;

    if (!layer || !patch) {
      continue;
    }

    patchByLayerId.set(layer.id, {
      ...patchByLayerId.get(layer.id),
      ...patch,
    });
  }

  return Array.from(patchByLayerId.entries()).map(([layerId, patch]) => ({
    layerId,
    patch,
  }));
}

function getAuditForLayers(
  page: DesignPage,
  layers: DesignLayer[],
): AccessibilityAudit {
  const visibleLayers = layers.filter((layer) => layer.visible);
  const issues = visibleLayers.flatMap((layer) =>
    getLayerIssues(layer, page).map((issue) => ({
      ...issue,
      id: `${page.id}:${issue.id}`,
      pageId: page.id,
      pageName: page.name,
    })),
  );
  const highCount = issues.filter((issue) => issue.severity === "high").length;
  const mediumCount = issues.filter(
    (issue) => issue.severity === "medium",
  ).length;
  const lowCount = issues.filter((issue) => issue.severity === "low").length;

  return {
    score: Math.max(0, 100 - highCount * 18 - mediumCount * 8 - lowCount * 3),
    issues,
    highCount,
    mediumCount,
    lowCount,
    checkedLayerCount: visibleLayers.length,
    textLayerCount: visibleLayers.filter((layer) => layer.text !== undefined)
      .length,
    interactiveLayerCount: visibleLayers.filter((layer) =>
      Boolean(layer.prototype),
    ).length,
  };
}

function getLayerIssues(layer: DesignLayer, page: DesignPage) {
  const issues: AccessibilityIssue[] = [];

  if (!layer.visible) {
    return issues;
  }

  if (layer.type === "image" && !layer.imageAlt?.trim()) {
    issues.push({
      id: `${layer.id}:image-alt`,
      layerId: layer.id,
      severity: "high",
      label: "Missing image alt text",
      detail: `${layer.name} needs a concise image description.`,
      fixable: true,
    });
  }

  if (layer.text !== undefined) {
    const background = getTextBackground(layer, page);
    const contrast = getContrastReport(layer.textColor ?? "#111111", background);

    if (contrast?.label === "Low") {
      issues.push({
        id: `${layer.id}:contrast`,
        layerId: layer.id,
        severity: "high",
        label: "Low text contrast",
        detail: `${layer.name} is ${contrast.ratio.toFixed(2)}:1 against ${background}.`,
      });
    } else if (!contrast && !isTransparentColor(background)) {
      issues.push({
        id: `${layer.id}:contrast-unknown`,
        layerId: layer.id,
        severity: "medium",
        label: "Manual contrast review",
        detail: `${layer.name} sits on a non-solid background that needs visual contrast review.`,
      });
    }

    if ((layer.fontSize ?? 16) < 12) {
      issues.push({
        id: `${layer.id}:font-size`,
        layerId: layer.id,
        severity: "medium",
        label: "Small text",
        detail: `${layer.name} is below 12px.`,
        fixable: true,
      });
    }
  }

  if (
    layer.prototype &&
    (Math.min(layer.width, layer.height) < 44 || layer.opacity < 0.4)
  ) {
    issues.push({
      id: `${layer.id}:target-size`,
      layerId: layer.id,
      severity: "medium",
      label: "Small prototype target",
      detail: `${layer.name} may be hard to activate in preview.`,
    });
  }

  if (layer.prototype && !getAccessibleLayerLabel(layer)) {
    issues.push({
      id: `${layer.id}:keyboard-label`,
      layerId: layer.id,
      severity: "high",
      label: "Missing keyboard label",
      detail:
        "Interactive prototype layers need visible text, alt text, or a meaningful layer name.",
      fixable: true,
    });
  }

  if (layer.prototype?.trigger && layer.prototype.trigger !== "click") {
    issues.push({
      id: `${layer.id}:keyboard-trigger`,
      layerId: layer.id,
      severity: "medium",
      label: "Keyboard fallback needed",
      detail: `${layer.name} uses a ${layer.prototype.trigger} trigger, so add a click fallback before handoff.`,
    });
  }

  if (hasGenericLayerName(layer)) {
    issues.push({
      id: `${layer.id}:name`,
      layerId: layer.id,
      severity: "low",
      label: "Generic layer name",
      detail: "Rename the layer for cleaner handoff and screen-reader context.",
      fixable: true,
    });
  }

  return issues;
}

function getTextBackground(layer: DesignLayer, page: DesignPage) {
  const parent = page.layers.find((candidate) => candidate.id === layer.parentId);

  return parent?.fill && parent.fill !== "transparent"
    ? parent.fill
    : page.background;
}

function getAccessibleLayerLabel(layer: DesignLayer) {
  const text = layer.text?.replace(/\s+/g, " ").trim();

  if (text) {
    return text;
  }

  const imageAlt = layer.imageAlt?.trim();

  if (imageAlt) {
    return imageAlt;
  }

  return hasGenericLayerName(layer) ? "" : layer.name.trim();
}

function hasGenericLayerName(layer: DesignLayer) {
  return !layer.name.trim() || /^layer\s*\d*$/i.test(layer.name.trim());
}

function isTransparentColor(value: string) {
  return value === "transparent" || value === "rgba(0,0,0,0)";
}

function getQuickFixPatch(
  layer: DesignLayer,
  issue: AccessibilityIssue,
  layers: DesignLayer[],
): Partial<DesignLayer> | null {
  if (issue.label === "Missing image alt text" && layer.type === "image") {
    return { imageAlt: getSafeAccessibleName(layer, layers) };
  }

  if (issue.label === "Missing keyboard label") {
    return layer.type === "image"
      ? { imageAlt: getSafeAccessibleName(layer, layers) }
      : { name: getSafeAccessibleName(layer, layers) };
  }

  if (issue.label === "Generic layer name") {
    return { name: getSafeAccessibleName(layer, layers) };
  }

  if (issue.label === "Small text" && layer.text !== undefined) {
    return { fontSize: Math.max(12, layer.fontSize ?? 16) };
  }

  return null;
}

function getSafeAccessibleName(layer: DesignLayer, layers: DesignLayer[]) {
  const currentName = layer.name.trim();

  if (currentName && !hasGenericLayerName(layer)) {
    return currentName;
  }

  const sameTypeIndex =
    layers.filter((candidate) => candidate.type === layer.type).findIndex(
      (candidate) => candidate.id === layer.id,
    ) + 1;

  return `${toDisplayType(layer.type)} ${Math.max(1, sameTypeIndex)}`;
}

function toDisplayType(type: DesignLayer["type"]) {
  return type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
