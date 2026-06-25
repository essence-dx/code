import type {
  DesignActivityEvent,
  DesignDocument,
  DesignPage,
} from "@/features/editor/types";
import type { InteractionHarnessRow } from "@/features/editor/interaction-test-harness-types";

export function getKeyboardHarnessRows(
  document: DesignDocument,
  activePage: DesignPage,
  selectedLayerIds: string[],
  activityEvents: DesignActivityEvent[],
) {
  const commandEvents = activityEvents.filter((event) => event.telemetry);
  const shortcutCount = Object.keys(
    document.workspaceSettings?.toolShortcuts ?? {},
  ).length;

  return [
    {
      id: "keyboard:shortcut-registry",
      category: "keyboard",
      status: shortcutCount > 0 ? "ready" : "review",
      pageId: activePage.id,
      pageName: activePage.name,
      layerIds: selectedLayerIds,
      label: "Shortcut registry",
      detail:
        shortcutCount > 0
          ? `${shortcutCount} custom shortcut bindings are persisted for keyboard coverage.`
          : "No customized shortcuts are persisted yet; default tool shortcuts still work but should be documented in a harness run.",
      evidence: `workspaceSettings.toolShortcuts=${shortcutCount}`,
      steps: [
        "Open Actions and verify at least one command is reachable by keyboard.",
        "Use a tool shortcut, then undo and redo the resulting command.",
      ],
    },
    {
      id: "keyboard:command-telemetry",
      category: "keyboard",
      status: commandEvents.length > 0 ? "ready" : "review",
      pageId: activePage.id,
      pageName: activePage.name,
      layerIds: selectedLayerIds,
      label: "Command telemetry",
      detail:
        commandEvents.length > 0
          ? `${commandEvents.length} command telemetry events are stored for replay evidence.`
          : "No command telemetry events are stored yet; run keyboard commands before release signoff.",
      evidence: getLatestEventEvidence(commandEvents),
      steps: [
        "Run select all, duplicate, nudge, and delete from the keyboard.",
        "Confirm Activity shows telemetry and no failed command rows.",
      ],
    },
  ] satisfies InteractionHarnessRow[];
}

export function getPrototypeHarnessRows(
  document: DesignDocument,
  activePage: DesignPage,
) {
  const startPages = document.pages.filter((page) => page.prototypeStart);
  const hotspotLayers = document.pages.flatMap((page) =>
    page.layers
      .filter((layer) => Boolean(layer.prototype))
      .map((layer) => ({ page, layer })),
  );
  const pageIds = new Set(document.pages.map((page) => page.id));
  const brokenHotspots = hotspotLayers.filter(
    ({ layer }) =>
      layer.prototype?.targetPageId &&
      !pageIds.has(layer.prototype.targetPageId),
  );
  const activeHotspots = hotspotLayers.filter(
    ({ page }) => page.id === activePage.id,
  );

  return [
    {
      id: "prototype:route",
      category: "prototype",
      status:
        brokenHotspots.length > 0
          ? "blocked"
          : startPages.length > 0 && hotspotLayers.length > 0
            ? "ready"
            : "review",
      pageId: activePage.id,
      pageName: activePage.name,
      layerIds: brokenHotspots
        .slice(0, 8)
        .map(({ layer }) => layer.id),
      label: "Prototype route flow",
      detail:
        brokenHotspots.length > 0
          ? `${brokenHotspots.length} prototype hotspot${brokenHotspots.length === 1 ? "" : "s"} point at missing pages.`
          : startPages.length > 0 && hotspotLayers.length > 0
            ? "Prototype start pages and hotspots are present for navigation testing."
            : "Mark a start page and add at least one hotspot before testing presentation navigation.",
      evidence: `starts=${startPages.length}; hotspots=${hotspotLayers.length}; broken=${brokenHotspots.length}`,
      steps: [
        "Open the prototype preview from a share link.",
        "Click each active-page hotspot and confirm the target page loads.",
      ],
    },
    {
      id: "prototype:active-page-hotspots",
      category: "prototype",
      status: activeHotspots.length > 0 ? "ready" : "review",
      pageId: activePage.id,
      pageName: activePage.name,
      layerIds: activeHotspots.slice(0, 8).map(({ layer }) => layer.id),
      label: "Active-page hotspots",
      detail:
        activeHotspots.length > 0
          ? `${activeHotspots.length} hotspot${activeHotspots.length === 1 ? "" : "s"} are available on the active page.`
          : "No active-page hotspot exists for immediate prototype pointer testing.",
      evidence: `activeHotspots=${activeHotspots.length}`,
      steps: [
        "Enable prototype hotspot overlays on the canvas.",
        "Click each overlay and compare the behavior with the prototype inspector.",
      ],
    },
  ] satisfies InteractionHarnessRow[];
}

export function getExportHarnessRows(
  activePage: DesignPage,
  selectedLayerIds: string[],
  activityEvents: DesignActivityEvent[],
) {
  const visibleLayers = activePage.layers.filter((layer) => layer.visible);
  const exportEvents = activityEvents.filter((event) => event.kind === "export");
  const unsupportedLayers = activePage.layers.filter(
    (layer) =>
      layer.visible &&
      ((layer.type === "image" && !layer.imageSrc?.trim()) ||
        (layer.type === "path" && !layer.pathData?.trim())),
  );

  return [
    {
      id: "export:targets",
      category: "export",
      status:
        visibleLayers.length === 0
          ? "blocked"
          : unsupportedLayers.length > 0
            ? "review"
            : "ready",
      pageId: activePage.id,
      pageName: activePage.name,
      layerIds: unsupportedLayers.slice(0, 8).map((layer) => layer.id),
      label: "Export command targets",
      detail:
        visibleLayers.length === 0
          ? "The active page has no visible layers for export commands."
          : unsupportedLayers.length > 0
            ? `${unsupportedLayers.length} visible layer${unsupportedLayers.length === 1 ? "" : "s"} need source data before export.`
            : "Visible active-page layers are present for JSON, SVG, PNG, JPG, and PDF command tests.",
      evidence: `visible=${visibleLayers.length}; selected=${selectedLayerIds.length}; unsupported=${unsupportedLayers.length}`,
      steps: [
        "Run JSON, SVG, PNG, JPG, and PDF export commands from the File menu.",
        "If layers are selected, run a selection export preset and confirm filenames are scoped.",
      ],
    },
    {
      id: "export:activity-evidence",
      category: "export",
      status: exportEvents.length > 0 ? "ready" : "review",
      pageId: activePage.id,
      pageName: activePage.name,
      layerIds: selectedLayerIds,
      label: "Export activity evidence",
      detail:
        exportEvents.length > 0
          ? `${exportEvents.length} export event${exportEvents.length === 1 ? "" : "s"} are stored for command-flow evidence.`
          : "No export activity event is stored yet for release evidence.",
      evidence: getLatestEventEvidence(exportEvents),
      steps: [
        "Run at least one export command.",
        "Confirm the Activity panel records the export with command telemetry.",
      ],
    },
  ] satisfies InteractionHarnessRow[];
}

function getLatestEventEvidence(events: DesignActivityEvent[]) {
  if (events.length === 0) {
    return "no stored events";
  }

  const latest = [...events].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )[0];

  return `${events.length} event${events.length === 1 ? "" : "s"}; latest=${latest.label} at ${latest.createdAt}`;
}
