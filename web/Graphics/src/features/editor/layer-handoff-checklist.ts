import {
  getLayerAnnotationReport,
  getLayerAssetReport,
  getLayerCodeConnectReport,
  getLayerDevLinkReport,
  getLayerPrototypeReport,
  getLayerVariableReport,
} from "@/features/editor/layer-codegen";
import { getSelectedAccessibilityAudit } from "@/features/editor/accessibility-audit";
import type {
  DesignComment,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export type LayerHandoffChecklistStatus = "pass" | "review" | "missing";

export type LayerHandoffChecklistItem = {
  id: string;
  label: string;
  detail: string;
  status: LayerHandoffChecklistStatus;
};

export type LayerHandoffChecklist = {
  items: LayerHandoffChecklistItem[];
  passCount: number;
  reviewCount: number;
  missingCount: number;
  score: number;
  label: string;
};

type LayerHandoffChecklistInput = {
  layer: DesignLayer;
  pages: DesignPage[];
  variables: Record<string, string>;
  comments: DesignComment[];
};

export function getLayerHandoffChecklist({
  layer,
  pages,
  variables,
  comments,
}: LayerHandoffChecklistInput): LayerHandoffChecklist {
  const asset = getLayerAssetReport(layer);
  const prototype = getLayerPrototypeReport(layer, pages);
  const prototypeTargetExists = Boolean(
    layer.prototype?.targetPageId &&
      pages.some((page) => page.id === layer.prototype?.targetPageId),
  );
  const annotations = getLayerAnnotationReport(layer, comments);
  const openAnnotations = annotations.filter(
    (annotation) => annotation.status === "open",
  );
  const devLinks = getLayerDevLinkReport(layer);
  const codeConnect = getLayerCodeConnectReport(layer);
  const variableMatches = getLayerVariableReport(layer, variables);
  const layerPage = pages.find((page) =>
    page.layers.some((item) => item.id === layer.id),
  );
  const accessibility = layerPage
    ? getSelectedAccessibilityAudit(layerPage, [layer.id])
    : null;

  const items: LayerHandoffChecklistItem[] = [
    {
      id: "ready",
      label: "Ready flag",
      detail: layer.readyForDev
        ? "Marked ready for engineering handoff"
        : "Mark this layer ready when review is complete",
      status: layer.readyForDev ? "pass" : "missing",
    },
    {
      id: "asset",
      label: "Export asset",
      detail: asset.exportable
        ? `${asset.kind} exports as ${asset.recommendedFormat}`
        : asset.notes[0] ?? "Asset export needs source data",
      status: asset.exportable ? "pass" : "missing",
    },
    {
      id: "prototype",
      label: "Prototype link",
      detail: prototype
        ? prototypeTargetExists
          ? `${prototype.trigger} ${prototype.action} to ${prototype.targetPageName}`
          : "Prototype target page is missing"
        : "No prototype hotspot attached",
      status: prototype
        ? prototypeTargetExists
          ? "pass"
          : "missing"
        : "review",
    },
    {
      id: "code-connect",
      label: "Code Connect",
      detail: codeConnect
        ? `${codeConnect.componentName} from ${codeConnect.importPath}`
        : "Add a component mapping before implementation review",
      status: codeConnect ? "pass" : "review",
    },
    {
      id: "dev-links",
      label: "Dev resources",
      detail:
        devLinks.length > 0
          ? `${devLinks.length} Storybook, repo, issue, or docs link attached`
          : "Attach Storybook, repo, issue, or docs links when available",
      status: devLinks.length > 0 ? "pass" : "review",
    },
    {
      id: "tokens",
      label: "Design tokens",
      detail:
        variableMatches.length > 0
          ? `${variableMatches.length} matching token reference${variableMatches.length === 1 ? "" : "s"}`
          : "No matching document variable references",
      status: variableMatches.length > 0 ? "pass" : "review",
    },
    {
      id: "accessibility",
      label: "Accessibility",
      detail: accessibility
        ? accessibility.issues.length > 0
          ? `${accessibility.highCount} high, ${accessibility.mediumCount} medium, ${accessibility.lowCount} low issues`
          : "No accessibility issues on this layer"
        : "Layer page could not be found for accessibility review",
      status: accessibility
        ? accessibility.highCount > 0
          ? "missing"
          : accessibility.mediumCount > 0 || accessibility.lowCount > 0
            ? "review"
            : "pass"
        : "review",
    },
    {
      id: "annotations",
      label: "Review notes",
      detail:
        openAnnotations.length > 0
          ? `${openAnnotations.length} open annotation${openAnnotations.length === 1 ? "" : "s"} inside this layer`
          : annotations.length > 0
            ? "All layer annotations are resolved"
            : "No comment pins inside this layer",
      status: openAnnotations.length > 0 ? "missing" : "pass",
    },
  ];

  const passCount = items.filter((item) => item.status === "pass").length;
  const reviewCount = items.filter((item) => item.status === "review").length;
  const missingCount = items.filter((item) => item.status === "missing").length;
  const score = Math.round(
    ((passCount + reviewCount * 0.5) / items.length) * 100,
  );

  return {
    items,
    passCount,
    reviewCount,
    missingCount,
    score,
    label: getChecklistLabel(missingCount, reviewCount),
  };
}

function getChecklistLabel(missingCount: number, reviewCount: number) {
  if (missingCount > 0) {
    return "Blocked";
  }

  if (reviewCount > 0) {
    return "Needs review";
  }

  return "Handoff ready";
}
