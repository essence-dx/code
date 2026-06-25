import type {
  PrototypeInteractionInspectorReport,
  PrototypeInteractionStatus,
} from "@/features/editor/prototype-interaction-inspector-types";
import type {
  DesignDocument,
  DesignLayer,
  DesignPrototypeScrollBehavior,
} from "@/features/editor/types";

export type AdvancedPrototypeTransitionAuthoringStatus =
  PrototypeInteractionStatus;

export type AdvancedPrototypeTransitionAuthoringRowCategory =
  | "overlay-transition"
  | "route-playback"
  | "scroll-behavior"
  | "smart-animate"
  | "variable-action";

export type AdvancedPrototypeTransitionAuthoringRow = {
  id: string;
  status: AdvancedPrototypeTransitionAuthoringStatus;
  category: AdvancedPrototypeTransitionAuthoringRowCategory;
  label: string;
  detail: string;
  evidence: string;
  recommendation: string;
  layerIds: string[];
  metric: number;
};

export type AdvancedPrototypeVariableAction = {
  id: string;
  status: AdvancedPrototypeTransitionAuthoringStatus;
  layerId: string;
  layerName: string;
  property: string;
  variableId: string;
  variableName: string;
  detail: string;
};

export type AdvancedPrototypeRoutePlaybackEvidence = {
  id: string;
  status: AdvancedPrototypeTransitionAuthoringStatus;
  label: string;
  detail: string;
  evidence: string;
};

export type AdvancedPrototypeTransitionAuthoringReport = {
  generatedAt: string;
  status: AdvancedPrototypeTransitionAuthoringStatus;
  score: number;
  hotspotCount: number;
  overlayTransitionCount: number;
  scrollBehaviorCount: number;
  smartAnimateReadinessCount: number;
  variableActionCount: number;
  routePlaybackEvidenceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  scrollBehaviors: DesignPrototypeScrollBehavior[];
  variableActions: AdvancedPrototypeVariableAction[];
  routePlayback: AdvancedPrototypeRoutePlaybackEvidence[];
  rows: AdvancedPrototypeTransitionAuthoringRow[];
};

const statusRank: Record<AdvancedPrototypeTransitionAuthoringStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getAdvancedPrototypeTransitionAuthoringReport({
  document,
  generatedAt = new Date().toISOString(),
  prototypeInteraction,
}: {
  document: DesignDocument;
  generatedAt?: string;
  prototypeInteraction: PrototypeInteractionInspectorReport;
}): AdvancedPrototypeTransitionAuthoringReport {
  const prototypeLayers = document.pages.flatMap((page) =>
    page.layers.filter(hasPrototype),
  );
  const overlayLayers = prototypeLayers.filter(
    (layer) => (layer.prototype.action ?? "navigate") === "overlay",
  );
  const scrollBehaviors = getScrollBehaviors(prototypeLayers);
  const smartAnimateLayers = prototypeLayers.filter(isReadySmartAnimateLayer);
  const variableActions = getVariableActions(document, prototypeLayers);
  const routePlayback = getRoutePlaybackEvidence(prototypeInteraction);
  const readyRoutePlaybackCount = routePlayback.filter(
    (item) => item.status === "ready",
  ).length;
  const rows = getRows({
    overlayLayers,
    prototypeInteraction,
    routePlayback,
    scrollBehaviors,
    smartAnimateLayers,
    variableActions,
  }).sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 16 - reviewCount * 5),
    hotspotCount: prototypeLayers.length,
    overlayTransitionCount: overlayLayers.length,
    scrollBehaviorCount: scrollBehaviors.length,
    smartAnimateReadinessCount: smartAnimateLayers.length,
    variableActionCount: variableActions.length,
    routePlaybackEvidenceCount: readyRoutePlaybackCount,
    readyCount,
    reviewCount,
    blockedCount,
    scrollBehaviors,
    variableActions,
    routePlayback,
    rows,
  };
}

export function getAdvancedPrototypeTransitionAuthoringJson(
  report: AdvancedPrototypeTransitionAuthoringReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdvancedPrototypeTransitionAuthoringCsv(
  report: AdvancedPrototypeTransitionAuthoringReport,
) {
  return [
    [
      "id",
      "status",
      "category",
      "label",
      "metric",
      "layer_ids",
      "evidence",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.category,
        row.label,
        row.metric,
        row.layerIds.join(" "),
        row.evidence,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    "section,variableActions",
    ["layerId", "status", "property", "variableId", "detail"].join(","),
    ...report.variableActions.map((action) =>
      [
        action.layerId,
        action.status,
        action.property,
        action.variableId,
        action.detail,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    "section,routePlayback",
    ["id", "status", "label", "evidence", "detail"].join(","),
    ...report.routePlayback.map((item) =>
      [item.id, item.status, item.label, item.evidence, item.detail]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdvancedPrototypeTransitionAuthoringMarkdown(
  report: AdvancedPrototypeTransitionAuthoringReport,
) {
  return [
    "# Advanced Prototype Transition Authoring",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Hotspots: ${report.hotspotCount}`,
    `Overlays: ${report.overlayTransitionCount}`,
    `Scroll behaviors: ${report.scrollBehaviorCount}`,
    `Smart animate: ${report.smartAnimateReadinessCount}`,
    `Variable actions: ${report.variableActionCount}`,
    `Route playback evidence: ${report.routePlaybackEvidenceCount}`,
    "",
    "This packet covers overlays, scroll behaviors, smart-animate readiness, variable actions, and route playback evidence.",
    "",
    "## review rows",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${row.detail} Evidence: ${row.evidence}. ${row.recommendation}`,
    ),
    "",
    "## variable actions",
    "",
    ...(report.variableActions.length > 0
      ? report.variableActions.map(
          (action) =>
            `- [${action.status}] ${action.layerName} / ${action.property}: ${action.detail}`,
        )
      : ["- No prototype variable actions detected."]),
    "",
    "## route playback evidence",
    "",
    ...report.routePlayback.map(
      (item) =>
        `- [${item.status}] ${item.label}: ${item.detail} Evidence: ${item.evidence}.`,
    ),
  ].join("\n");
}

function getRows({
  overlayLayers,
  prototypeInteraction,
  routePlayback,
  scrollBehaviors,
  smartAnimateLayers,
  variableActions,
}: {
  overlayLayers: Array<DesignLayer & { prototype: NonNullable<DesignLayer["prototype"]> }>;
  prototypeInteraction: PrototypeInteractionInspectorReport;
  routePlayback: AdvancedPrototypeRoutePlaybackEvidence[];
  scrollBehaviors: DesignPrototypeScrollBehavior[];
  smartAnimateLayers: Array<DesignLayer & { prototype: NonNullable<DesignLayer["prototype"]> }>;
  variableActions: AdvancedPrototypeVariableAction[];
}): AdvancedPrototypeTransitionAuthoringRow[] {
  const overlayReviewCount = prototypeInteraction.rows.filter(
    (row) => row.category === "overlay" && row.status !== "ready",
  ).length;
  const scrollReviewCount = prototypeInteraction.rows.filter(
    (row) => row.category === "scroll" && row.status !== "ready",
  ).length;
  const smartAnimateReviewCount = prototypeInteraction.rows.filter(
    (row) =>
      row.category === "transition" &&
      row.label.toLowerCase().includes("smart animate"),
  ).length;
  const readyPlaybackCount = routePlayback.filter(
    (item) => item.status === "ready",
  ).length;

  return [
    {
      id: "overlay-transition:coverage",
      status:
        overlayLayers.length > 0 && overlayReviewCount === 0
          ? "ready"
          : overlayLayers.length > 0
            ? "review"
            : "blocked",
      category: "overlay-transition",
      label: "Overlay transition authoring",
      detail: `${overlayLayers.length} overlay transition${overlayLayers.length === 1 ? "" : "s"} are configured, with ${overlayReviewCount} overlay review issue${overlayReviewCount === 1 ? "" : "s"}.`,
      evidence:
        overlayLayers
          .map(
            (layer) =>
              `${layer.name}:${layer.prototype.overlayPosition ?? "center"}:${layer.prototype.transition}`,
          )
          .join(" | ") || "No overlay transitions",
      recommendation:
        "Use non-instant timing, intentional placement, and outside-close settings for overlay review.",
      layerIds: overlayLayers.map((layer) => layer.id),
      metric: overlayLayers.length,
    },
    {
      id: "scroll-behavior:coverage",
      status:
        scrollBehaviors.length >= 2 && scrollReviewCount === 0
          ? "ready"
          : scrollBehaviors.length > 0
            ? "review"
            : "blocked",
      category: "scroll-behavior",
      label: "Scroll behavior coverage",
      detail: `${scrollBehaviors.length} scroll behavior${scrollBehaviors.length === 1 ? "" : "s"} are represented across prototype hotspots, with ${scrollReviewCount} scroll review issue${scrollReviewCount === 1 ? "" : "s"}.`,
      evidence: scrollBehaviors.join(" | ") || "No scroll behaviors",
      recommendation:
        "Cover reset/preserve navigation and lock overlays before approving advanced prototype playback.",
      layerIds: [],
      metric: scrollBehaviors.length,
    },
    {
      id: "smart-animate:readiness",
      status:
        smartAnimateLayers.length > 0 && smartAnimateReviewCount === 0
          ? "ready"
          : smartAnimateLayers.length > 0
            ? "review"
            : "blocked",
      category: "smart-animate",
      label: "Smart-animate readiness",
      detail: `${smartAnimateLayers.length} smart-animate transition${smartAnimateLayers.length === 1 ? "" : "s"} have playback-safe timing, with ${smartAnimateReviewCount} timing review issue${smartAnimateReviewCount === 1 ? "" : "s"}.`,
      evidence:
        smartAnimateLayers
          .map((layer) => `${layer.name}:${layer.prototype.durationMs}ms`)
          .join(" | ") || "No smart-animate transitions",
      recommendation:
        "Keep smart-animate transitions above the minimum reviewable duration and attached to valid routes.",
      layerIds: smartAnimateLayers.map((layer) => layer.id),
      metric: smartAnimateLayers.length,
    },
    {
      id: "variable-action:coverage",
      status:
        variableActions.length >= 2
          ? "ready"
          : variableActions.length > 0
            ? "review"
            : "blocked",
      category: "variable-action",
      label: "Variable actions",
      detail: `${variableActions.length} prototype-scoped variable action${variableActions.length === 1 ? "" : "s"} are bound to interactive layers.`,
      evidence:
        variableActions
          .slice(0, 5)
          .map((action) => `${action.layerName}:${action.property}`)
          .join(" | ") || "No prototype variable bindings",
      recommendation:
        "Bind prototype state variables to interactive layer properties so reviewers can audit action-driven state.",
      layerIds: Array.from(new Set(variableActions.map((action) => action.layerId))),
      metric: variableActions.length,
    },
    {
      id: "route-playback:evidence",
      status:
        readyPlaybackCount >= 3
          ? "ready"
          : readyPlaybackCount > 0
            ? "review"
            : "blocked",
      category: "route-playback",
      label: "Route playback evidence",
      detail: `${readyPlaybackCount}/${routePlayback.length} route playback evidence item${routePlayback.length === 1 ? "" : "s"} are ready.`,
      evidence:
        routePlayback
          .map((item) => `${item.label}:${item.status}`)
          .join(" | ") || "No route playback evidence",
      recommendation:
        "Keep start page, hotspot, route-page, and issue-free playback evidence attached to prototype exports.",
      layerIds: [],
      metric: readyPlaybackCount,
    },
  ];
}

function getScrollBehaviors(
  prototypeLayers: Array<
    DesignLayer & { prototype: NonNullable<DesignLayer["prototype"]> }
  >,
) {
  return Array.from(
    new Set(
      prototypeLayers.map(
        (layer) =>
          layer.prototype.scrollBehavior ??
          (layer.prototype.preserveScroll ? "preserve" : "reset"),
      ),
    ),
  ).sort();
}

function getVariableActions(
  document: DesignDocument,
  prototypeLayers: Array<
    DesignLayer & { prototype: NonNullable<DesignLayer["prototype"]> }
  >,
): AdvancedPrototypeVariableAction[] {
  const collections = document.variableCollections ?? {};
  const definitions = document.variableDefinitions ?? {};

  return prototypeLayers.flatMap((layer) =>
    Object.entries(layer.variableBindings ?? {})
      .filter((entry): entry is [string, string] => {
        const [, variableId] = entry;
        const variable = definitions[variableId];
        const collection = variable?.collectionId
          ? collections[variable.collectionId]
          : null;

        return Boolean(variable && collection?.scope === "prototype");
      })
      .map(([property, variableId]) => {
        const variable = definitions[variableId];

        return {
          id: `variable-action:${layer.id}:${property}:${variableId}`,
          status: "ready" as const,
          layerId: layer.id,
          layerName: layer.name,
          property,
          variableId,
          variableName: variable?.name ?? variableId,
          detail: `${property} is driven by prototype variable ${variable?.name ?? variableId}.`,
        };
      }),
  );
}

function getRoutePlaybackEvidence(
  prototypeInteraction: PrototypeInteractionInspectorReport,
): AdvancedPrototypeRoutePlaybackEvidence[] {
  return [
    {
      id: "route-playback:start-page",
      status: prototypeInteraction.startPageCount > 0 ? "ready" : "blocked",
      label: "Start page",
      detail: `${prototypeInteraction.startPageCount} prototype start page${prototypeInteraction.startPageCount === 1 ? "" : "s"} configured.`,
      evidence: "Prototype preview chooses an explicit start page when available.",
    },
    {
      id: "route-playback:hotspots",
      status: prototypeInteraction.hotspotCount > 0 ? "ready" : "blocked",
      label: "Hotspot coverage",
      detail: `${prototypeInteraction.hotspotCount} hotspot${prototypeInteraction.hotspotCount === 1 ? "" : "s"} are available for playback.`,
      evidence: `${prototypeInteraction.readyCount} ready inspector row${prototypeInteraction.readyCount === 1 ? "" : "s"}.`,
    },
    {
      id: "route-playback:pages",
      status:
        prototypeInteraction.pageCount > 0 &&
        prototypeInteraction.routePageCount === prototypeInteraction.pageCount
          ? "ready"
          : "blocked",
      label: "Route page export",
      detail: `${prototypeInteraction.routePageCount}/${prototypeInteraction.pageCount} pages are exported into the prototype preview model.`,
      evidence: "Preview model page count is compared with the design document.",
    },
    {
      id: "route-playback:issues",
      status:
        prototypeInteraction.presentationRouteIssueCount === 0
          ? "ready"
          : "review",
      label: "Issue-free playback",
      detail: `${prototypeInteraction.presentationRouteIssueCount} presentation route issue${prototypeInteraction.presentationRouteIssueCount === 1 ? "" : "s"} remain.`,
      evidence: "Presentation route rows come from the interaction inspector.",
    },
  ];
}

function isReadySmartAnimateLayer(
  layer: DesignLayer & { prototype: NonNullable<DesignLayer["prototype"]> },
) {
  return (
    layer.prototype.smartAnimate === true &&
    layer.prototype.durationMs >= 150 &&
    layer.prototype.transition !== "instant"
  );
}

function hasPrototype(
  layer: DesignLayer,
): layer is DesignLayer & {
  prototype: NonNullable<DesignLayer["prototype"]>;
} {
  return Boolean(layer.visible && layer.prototype?.targetPageId);
}

function sortRows(
  first: AdvancedPrototypeTransitionAuthoringRow,
  second: AdvancedPrototypeTransitionAuthoringRow,
) {
  if (first.status !== second.status) {
    return statusRank[first.status] - statusRank[second.status];
  }

  if (first.category !== second.category) {
    return first.category.localeCompare(second.category);
  }

  return first.label.localeCompare(second.label);
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
