"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getAccessibilityAudit,
  getAccessibilityQuickFixPatches,
  getDocumentAccessibilityAudit,
  getSelectedAccessibilityAudit,
} from "@/features/editor/accessibility-audit";
import {
  builtInPluginManifests,
  getPluginPermissionGrantKey,
  isPluginApprovalCurrent,
  pluginPermissionLabels,
  type EditorPluginApprovalRecord,
  type EditorPluginManifest,
  type EditorPluginRunHistoryEntry,
} from "@/features/editor/editor-plugin-api";
import type {
  CanvasView,
  DesignComment,
  DesignDocument,
  DesignLayer,
  DesignPage,
  EditorTool,
} from "@/features/editor/types";
import type { ToolShortcutPreferences } from "@/features/editor/shortcut-preferences";
import type { LayerPatch } from "@/features/editor/document-utils";
import { AccessibilityKeyboardAuthoringReviewPanel } from "@/features/editor/components/accessibility-keyboard-authoring-review-panel";
import { AccessibilityAuditPanel } from "@/features/editor/components/accessibility-audit-panel";
import { AdvancedPrototypeTransitionAuthoringPanel } from "@/features/editor/components/advanced-prototype-transition-authoring-panel";
import { AdvancedPaintStyleAuthoringPanel } from "@/features/editor/components/advanced-paint-style-authoring-panel";
import { AssetLibraryManagementPanel } from "@/features/editor/components/asset-library-management-panel";
import { AssetMediaGovernancePanel } from "@/features/editor/components/asset-media-governance-panel";
import { AutoLayoutProductionReviewPanel } from "@/features/editor/components/auto-layout-production-review-panel";
import { BranchCompareMergeWorkbenchPanel } from "@/features/editor/components/branch-compare-merge-workbench-panel";
import { CanvasInteractionProfilerPanel } from "@/features/editor/components/canvas-interaction-profiler-panel";
import { CanvasRenderBudgetPanel } from "@/features/editor/components/canvas-render-budget-panel";
import { CanvasViewportIntelligencePanel } from "@/features/editor/components/canvas-viewport-intelligence-panel";
import { CollaborationSyncReplayPanel } from "@/features/editor/components/collaboration-sync-replay-panel";
import { CommandAutomationRecordingPanel } from "@/features/editor/components/command-automation-recording-panel";
import { DesktopCollaborationRecoveryBridgePanel } from "@/features/editor/components/desktop-collaboration-recovery-bridge-panel";
import { DesktopCrashPerformanceSupportBundlePanel } from "@/features/editor/components/desktop-crash-performance-support-bundle-panel";
import { DesktopUpdateCohortObservabilityPanel } from "@/features/editor/components/desktop-update-cohort-observability-panel";
import { EnterpriseDesktopReleaseOperationsSynthesisPanel } from "@/features/editor/components/enterprise-desktop-release-operations-synthesis-panel";
import { getDocumentHealthReport } from "@/features/editor/document-health";
import { DocumentHealthPanel } from "@/features/editor/components/document-health-panel";
import { DocumentPerformanceReviewPanel } from "@/features/editor/components/document-performance-review-panel";
import { DocumentTextReviewPanel } from "@/features/editor/components/document-text-review-panel";
import { DesignReviewApprovalPanel } from "@/features/editor/components/design-review-approval-panel";
import { EditorSettingsPanel } from "@/features/editor/components/editor-settings-panel";
import { FigJamFacilitationDepthPanel } from "@/features/editor/components/figjam-facilitation-depth-panel";
import { InteractionTestHarnessPanel } from "@/features/editor/components/interaction-test-harness-panel";
import { LayerIndexReviewPanel } from "@/features/editor/components/layer-index-review-panel";
import { LargeCanvasRenderSchedulerPanel } from "@/features/editor/components/large-canvas-render-scheduler-panel";
import { LargeDocumentSafeModePanel } from "@/features/editor/components/large-document-safe-mode-panel";
import { MediaAssetPipelineReviewPanel } from "@/features/editor/components/media-asset-pipeline-review-panel";
import { MultiplayerFollowSpotlightPanel } from "@/features/editor/components/multiplayer-follow-spotlight-panel";
import { NativePluginSandboxOperationsPanel } from "@/features/editor/components/native-plugin-sandbox-operations-panel";
import { NativeDesktopShipSynthesisPanel } from "@/features/editor/components/native-desktop-ship-synthesis-panel";
import { OfflineWorkspaceHealthMonitorPanel } from "@/features/editor/components/offline-workspace-health-monitor-panel";
import { WorkspaceFileOperationsReviewPanel } from "@/features/editor/components/workspace-file-operations-review-panel";
import { WorkspaceRestoreDrillsPanel } from "@/features/editor/components/workspace-restore-drills-panel";
import { PerformanceBaselinePanel } from "@/features/editor/components/performance-baseline-panel";
import { PerformanceRegressionExportPanel } from "@/features/editor/components/performance-regression-export-panel";
import { ProductionDeploySmokePanel } from "@/features/editor/components/production-deploy-smoke-panel";
import { ProductionReadinessSynthesisPanel } from "@/features/editor/components/production-readiness-synthesis-panel";
import { ReleaseReadinessDashboardPanel } from "@/features/editor/components/release-readiness-dashboard-panel";
import { SlidesSitesSurfaceAuthoringParityPanel } from "@/features/editor/components/slides-sites-surface-authoring-parity-panel";
import { SitesContentMapPublishQueuePanel } from "@/features/editor/components/sites-content-map-publish-queue-panel";
import { SitesResponsivePublishingPreflightPanel } from "@/features/editor/components/sites-responsive-publishing-preflight-panel";
import { TauriDesktopPackagingReadinessPanel } from "@/features/editor/components/tauri-desktop-packaging-readiness-panel";
import { DesignTokenDriftReviewPanel } from "@/features/editor/components/design-token-drift-review-panel";
import { DevModeIntegrationReviewPanel } from "@/features/editor/components/dev-mode-integration-review-panel";
import { DevModeInspectionPanel } from "@/features/editor/components/dev-mode-inspection-panel";
import { DevModeReviewPanel } from "@/features/editor/components/dev-mode-review-panel";
import { ExportPreflightPanel } from "@/features/editor/components/export-preflight-panel";
import { PluginDeveloperOperationsPanel } from "@/features/editor/components/plugin-developer-operations-panel";
import { PluginGovernancePanel } from "@/features/editor/components/plugin-governance-panel";
import { PluginPackageImportPanel } from "@/features/editor/components/plugin-package-import-panel";
import { PluginSandboxHistoryPanel } from "@/features/editor/components/plugin-sandbox-history-panel";
import { PluginWidgetRuntimeTelemetryDigestPanel } from "@/features/editor/components/plugin-widget-runtime-telemetry-digest-panel";
import { PluginWidgetRuntimeOperationsPanel } from "@/features/editor/components/plugin-widget-runtime-operations-panel";
import { PresentationPresenterControlsPanel } from "@/features/editor/components/presentation-presenter-controls-panel";
import { PrototypeFlowMap } from "@/features/editor/components/prototype-flow-map";
import { PrototypeInteractionInspectorPanel } from "@/features/editor/components/prototype-interaction-inspector-panel";
import { ResponsiveConstraintsReviewPanel } from "@/features/editor/components/responsive-constraints-review-panel";
import { VariableGovernanceReviewPanel } from "@/features/editor/components/variable-governance-review-panel";
import { VectorDrawAuthoringReviewPanel } from "@/features/editor/components/vector-draw-authoring-review-panel";
import { VariableUsageAuditPanel } from "@/features/editor/components/variable-usage-audit-panel";
import { VectorPathReviewPanel } from "@/features/editor/components/vector-path-review-panel";
import { getDesignTokenDriftReview } from "@/features/editor/design-token-drift-review";
import { getDevModeIntegrationReviewReport } from "@/features/editor/dev-mode-integration-review";
import { getDevModeInspection } from "@/features/editor/dev-mode-inspection";
import { getDevModeReview } from "@/features/editor/dev-mode-review";
import { getAccessibilityKeyboardAuthoringReviewReport } from "@/features/editor/accessibility-keyboard-authoring-review";
import { getAdvancedPaintStyleAuthoringReport } from "@/features/editor/advanced-paint-style-authoring";
import { getAdvancedPrototypeTransitionAuthoringReport } from "@/features/editor/advanced-prototype-transition-authoring";
import { getDesignReviewApprovalReport } from "@/features/editor/design-review-approval";
import { getDesignReviewApprovalGates } from "@/features/editor/design-review-approval-gates";
import { getDocumentTextReview } from "@/features/editor/document-text-review";
import { getDocumentPerformanceReview } from "@/features/editor/document-performance-review";
import { getExportPreflightReview } from "@/features/editor/export-preflight-review";
import { getFigJamFacilitationDepthReport } from "@/features/editor/figjam-facilitation-depth";
import { getLayerIndexReview } from "@/features/editor/layer-index";
import { getCanvasInteractionProfilerReport } from "@/features/editor/canvas-interaction-profiler";
import { getCanvasRenderBudgetTelemetry } from "@/features/editor/canvas-render-budget";
import { getCanvasViewportIntelligence } from "@/features/editor/canvas-viewport-intelligence";
import { getCollaborationSyncReplayReport } from "@/features/editor/collaboration-sync-replay";
import { getCommandAutomationRecordingReport } from "@/features/editor/command-automation-recording";
import { getComponentUsageAnalytics } from "@/features/editor/component-analytics";
import { getComponentUsageIntelligenceReport } from "@/features/editor/component-usage-intelligence";
import { getDesktopCollaborationRecoveryBridgeReport } from "@/features/editor/desktop-collaboration-recovery-bridge";
import { getDesktopCrashPerformanceSupportBundleReport } from "@/features/editor/desktop-crash-performance-support-bundle";
import { getDesktopUpdateCohortObservabilityReport } from "@/features/editor/desktop-update-cohort-observability";
import { getEnterpriseDesktopReleaseOperationsSynthesisReport } from "@/features/editor/enterprise-desktop-release-operations-synthesis";
import { getInteractionTestHarnessReport } from "@/features/editor/interaction-test-harness";
import { getLargeCanvasRenderSchedulerReport } from "@/features/editor/large-canvas-render-scheduler";
import { getLargeDocumentSafeModeReport } from "@/features/editor/large-document-safe-mode";
import { getMediaAssetPipelineReviewReport } from "@/features/editor/media-asset-pipeline-review";
import { getMultiplayerFollowSpotlightReport } from "@/features/editor/multiplayer-follow-spotlight";
import { getNativePluginSandboxOperationsReport } from "@/features/editor/native-plugin-sandbox-operations";
import { getNativeDesktopShipSynthesisReport } from "@/features/editor/native-desktop-ship-synthesis";
import {
  readLocalDesignBackupMeta,
  readLocalDesignSnapshotMetas,
} from "@/features/editor/offline-backups";
import {
  getOfflineSaveQueueReport,
  readOfflineSaveMutations,
} from "@/features/editor/offline-mutation-queue";
import { getOfflineWorkspaceHealthMonitorReport } from "@/features/editor/offline-workspace-health-monitor";
import { getPerformanceRegressionExport } from "@/features/editor/performance-regression-export";
import { getWorkspaceRestoreDrillsReport } from "@/features/editor/workspace-restore-drills";
import { getPerformanceBaselineReport } from "@/features/editor/performance-baseline";
import { getPluginDeveloperOpsReport } from "@/features/editor/plugin-developer-operations";
import { getPluginWidgetRuntimeTelemetryDigestReport } from "@/features/editor/plugin-widget-runtime-telemetry-digest";
import { getPluginWidgetRuntimeOperationsReport } from "@/features/editor/plugin-widget-runtime-operations";
import { getPresentationPresenterControlsReport } from "@/features/editor/presentation-presenter-controls";
import { getPrototypeInteractionInspector } from "@/features/editor/prototype-interaction-inspector";
import { getPrototypeFlowDiagnostics } from "@/features/editor/prototype-flow-diagnostics";
import { getProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";
import { getProductionReadinessSynthesisPacket } from "@/features/editor/production-readiness-synthesis";
import { getReleaseReadinessDashboard } from "@/features/editor/release-readiness-dashboard";
import { getSlidesSitesSurfaceAuthoringParityReport } from "@/features/editor/slides-sites-surface-authoring-parity";
import { getSitesContentMapPublishQueueReport } from "@/features/editor/sites-content-map-publish-queue";
import { getSitesResponsivePublishingPreflightReport } from "@/features/editor/sites-responsive-publishing-preflight";
import { getTauriDesktopPackagingReadinessReport } from "@/features/editor/tauri-desktop-packaging-readiness";
import { getVariableUsageAudit } from "@/features/editor/variable-usage-audit";
import { getVectorPathReview } from "@/features/editor/vector-path-review";
import { getWorkspaceFileOperationsReviewReport } from "@/features/editor/workspace-file-operations-review";
import { getAssetLibraryManagementReport } from "@/features/editor/asset-library-management";
import { getAssetMediaGovernanceReport } from "@/features/editor/asset-media-governance";
import { getAutoLayoutProductionReview } from "@/features/editor/auto-layout-production-review";
import { getBranchCompareMergeWorkbenchReport } from "@/features/editor/branch-compare-merge-workbench";
import { getResponsiveConstraintsReview } from "@/features/editor/responsive-constraints-review";
import { getVariableGovernanceReview } from "@/features/editor/variable-governance-review";
import { getVectorDrawAuthoringReviewReport } from "@/features/editor/vector-draw-authoring-review";
import type { CommandPaletteCommand } from "@/features/editor/components/command-palette";
import type {
  CollaborationPeer,
  CollaborationPresenceEvent,
} from "@/features/editor/collaboration-presence";
import type {
  DesignFileSummary,
  DesignFileVersionSummary,
} from "@/features/files/actions";

type ExtensionsPanelProps = {
  activeFileId: string;
  activeFileName: string;
  document: DesignDocument;
  files: DesignFileSummary[];
  page: DesignPage;
  versions: DesignFileVersionSummary[];
  collaborationPresence: {
    followedPeerId: string | null;
    peers: CollaborationPeer[];
    presenceEvents: CollaborationPresenceEvent[];
    selfId: string;
    spotlight: boolean;
    view: CanvasView;
  };
  selectedLayerIds: string[];
  toolShortcuts: ToolShortcutPreferences;
  commandPaletteCommands: CommandPaletteCommand[];
  pluginGrants: Record<string, boolean>;
  pluginApprovals: Record<string, EditorPluginApprovalRecord>;
  pluginRunHistory: EditorPluginRunHistoryEntry[];
  onSelectLayers: (layerIds: string[]) => void;
  onUpdateToolShortcut: (tool: EditorTool, shortcut: string) => void;
  onReplaceToolShortcuts: (shortcuts: ToolShortcutPreferences) => void;
  onReplacePluginGrants: (grants: Record<string, boolean>) => void;
  onApprovePlugin: (manifest: EditorPluginManifest) => void;
  onRecordPluginRun: (
    manifest: EditorPluginManifest,
    status: EditorPluginRunHistoryEntry["status"],
    detail: string,
  ) => void;
  onReplayPluginApprovals: () => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
  onUpdateComments: (
    commentIds: string[],
    patch: Partial<
      Pick<
        DesignComment,
        "resolved" | "assigneeName" | "assigneeEmail" | "dueDate"
      >
    >,
  ) => void;
  onSetPrototypeStartPage: (pageId: string) => void;
  onSavePerformanceBaseline: (name: string) => void;
  onRemovePerformanceBaseline: (baselineId: string) => void;
  onRecordActivity: (label: string, detail?: string) => void;
  onUpdateVariableSystem: (
    patch: Partial<
      Pick<
        DesignDocument,
        | "variables"
        | "variableModes"
        | "activeVariableModeId"
        | "variableDefinitions"
        | "variableCollections"
      >
    >,
    applyBindings?: boolean,
  ) => void;
};

export function ExtensionsPanel({
  activeFileId,
  activeFileName,
  document,
  files,
  page,
  versions,
  collaborationPresence,
  selectedLayerIds,
  toolShortcuts,
  commandPaletteCommands,
  pluginGrants,
  pluginApprovals,
  pluginRunHistory,
  onSelectLayers,
  onUpdateToolShortcut,
  onReplaceToolShortcuts,
  onReplacePluginGrants,
  onApprovePlugin,
  onRecordPluginRun,
  onReplayPluginApprovals,
  onUpdateLayers,
  onUpdateComments,
  onSetPrototypeStartPage,
  onSavePerformanceBaseline,
  onRemovePerformanceBaseline,
  onRecordActivity,
  onUpdateVariableSystem,
}: ExtensionsPanelProps) {
  const audit = useMemo(() => getAccessibilityAudit(page), [page]);
  const documentAudit = useMemo(
    () => getDocumentAccessibilityAudit(document.pages),
    [document.pages],
  );
  const pageQuickFixes = useMemo(
    () => getAccessibilityQuickFixPatches(page, audit),
    [audit, page],
  );
  const healthReport = useMemo(
    () => getDocumentHealthReport(document),
    [document],
  );
  const components = useMemo(
    () => Object.values(document.components),
    [document.components],
  );
  const componentAnalytics = useMemo(
    () => getComponentUsageAnalytics(components, document.pages),
    [components, document.pages],
  );
  const componentUsageIntelligence = useMemo(
    () =>
      getComponentUsageIntelligenceReport({
        activityEvents: document.activityEvents ?? [],
        analyticsByComponentId: componentAnalytics,
        components,
        pages: document.pages,
        pendingUpdates: document.pendingLibraryComponentUpdates,
      }),
    [
      componentAnalytics,
      components,
      document.activityEvents,
      document.pages,
      document.pendingLibraryComponentUpdates,
    ],
  );
  const performanceReview = useMemo(
    () => getDocumentPerformanceReview(document),
    [document],
  );
  const assetMediaGovernance = useMemo(
    () => getAssetMediaGovernanceReport(document),
    [document],
  );
  const mediaAssetPipelineReview = useMemo(
    () => getMediaAssetPipelineReviewReport({ document }),
    [document],
  );
  const commandAutomationRecording = useMemo(
    () =>
      getCommandAutomationRecordingReport({
        commandPaletteCommands,
        document,
      }),
    [commandPaletteCommands, document],
  );
  const assetLibraryManagement = useMemo(
    () => getAssetLibraryManagementReport(document),
    [document],
  );
  const layerIndexReview = useMemo(
    () => getLayerIndexReview(document),
    [document],
  );
  const canvasRenderBudget = useMemo(
    () => getCanvasRenderBudgetTelemetry(page),
    [page],
  );
  const canvasInteractionProfiler = useMemo(
    () =>
      getCanvasInteractionProfilerReport({
        page,
        selectedLayerIds,
      }),
    [page, selectedLayerIds],
  );
  const largeCanvasRenderScheduler = useMemo(
    () =>
      getLargeCanvasRenderSchedulerReport({
        page,
        selectedLayerIds,
      }),
    [page, selectedLayerIds],
  );
  const canvasViewportIntelligence = useMemo(
    () => getCanvasViewportIntelligence(document),
    [document],
  );
  const safeModeReport = useMemo(
    () => getLargeDocumentSafeModeReport(document, page),
    [document, page],
  );
  const performanceRegressionExport = useMemo(
    () => getPerformanceRegressionExport({ document, activePage: page }),
    [document, page],
  );
  const performanceBaseline = useMemo(
    () => getPerformanceBaselineReport(document, page),
    [document, page],
  );
  const collaborationSyncReplay = useMemo(
    () => getCollaborationSyncReplayReport(document),
    [document],
  );
  const multiplayerFollowSpotlight = useMemo(
    () =>
      getMultiplayerFollowSpotlightReport({
        activePageId: page.id,
        currentView: collaborationPresence.view,
        followedPeerId: collaborationPresence.followedPeerId,
        peers: collaborationPresence.peers,
        presenceEvents: collaborationPresence.presenceEvents,
        selfId: collaborationPresence.selfId,
        selfSpotlight: collaborationPresence.spotlight,
      }),
    [
      collaborationPresence.followedPeerId,
      collaborationPresence.peers,
      collaborationPresence.presenceEvents,
      collaborationPresence.selfId,
      collaborationPresence.spotlight,
      collaborationPresence.view,
      page.id,
    ],
  );
  const branchCompareMergeWorkbench = useMemo(
    () =>
      getBranchCompareMergeWorkbenchReport({
        currentDocument: document,
        selectedVersionId:
          document.branchMetadata?.sourceVersionId ??
          document.branchMetadata?.restorePointVersionId ??
          null,
        versions,
      }),
    [document, versions],
  );
  const productionDeploySmoke = useMemo(
    () => getProductionDeploySmokeReport({ document, activePage: page }),
    [document, page],
  );
  const accessibilityKeyboardAuthoringReview = useMemo(
    () =>
      getAccessibilityKeyboardAuthoringReviewReport({
        activePage: page,
        commandPaletteCommands,
        document,
        productionDeploySmoke,
        toolShortcuts,
      }),
    [
      commandPaletteCommands,
      document,
      page,
      productionDeploySmoke,
      toolShortcuts,
    ],
  );
  const advancedPaintStyleAuthoring = useMemo(
    () =>
      getAdvancedPaintStyleAuthoringReport({
        activePage: page,
        document,
      }),
    [document, page],
  );
  const sitesResponsivePublishingPreflight = useMemo(
    () =>
      getSitesResponsivePublishingPreflightReport({
        activePage: page,
        document,
        productionDeploySmoke,
      }),
    [document, page, productionDeploySmoke],
  );
  const sitesContentMapPublishQueue = useMemo(
    () =>
      getSitesContentMapPublishQueueReport({
        activePage: page,
        document,
        productionDeploySmoke,
        sitesPreflight: sitesResponsivePublishingPreflight,
      }),
    [document, page, productionDeploySmoke, sitesResponsivePublishingPreflight],
  );
  const pluginDeveloperOps = useMemo(
    () =>
      getPluginDeveloperOpsReport({
        approvals: pluginApprovals,
        grants: pluginGrants,
        manifests: builtInPluginManifests,
        runHistory: pluginRunHistory,
      }),
    [pluginApprovals, pluginGrants, pluginRunHistory],
  );
  const pluginWidgetRuntimeOperations = useMemo(
    () =>
      getPluginWidgetRuntimeOperationsReport({
        approvals: pluginApprovals,
        grants: pluginGrants,
        manifests: builtInPluginManifests,
        runHistory: pluginRunHistory,
      }),
    [pluginApprovals, pluginGrants, pluginRunHistory],
  );
  const nativePluginSandboxOperations = useMemo(
    () =>
      getNativePluginSandboxOperationsReport({
        approvals: pluginApprovals,
        grants: pluginGrants,
        manifests: builtInPluginManifests,
        runHistory: pluginRunHistory,
      }),
    [pluginApprovals, pluginGrants, pluginRunHistory],
  );
  const pluginWidgetRuntimeTelemetryDigest = useMemo(
    () =>
      getPluginWidgetRuntimeTelemetryDigestReport({
        nativePluginSandbox: nativePluginSandboxOperations,
        pluginWidgetRuntimeOperations,
      }),
    [nativePluginSandboxOperations, pluginWidgetRuntimeOperations],
  );
  const prototypeFlow = useMemo(
    () => getPrototypeFlowDiagnostics(document),
    [document],
  );
  const prototypeInteraction = useMemo(
    () => getPrototypeInteractionInspector(document),
    [document],
  );
  const advancedPrototypeTransitionAuthoring = useMemo(
    () =>
      getAdvancedPrototypeTransitionAuthoringReport({
        document,
        prototypeInteraction,
      }),
    [document, prototypeInteraction],
  );
  const presentationPresenterControls = useMemo(
    () =>
      getPresentationPresenterControlsReport({
        document,
      }),
    [document],
  );
  const slidesSitesSurfaceAuthoring = useMemo(
    () =>
      getSlidesSitesSurfaceAuthoringParityReport({
        activePage: page,
        document,
        productionDeploySmoke,
        prototypeInteraction,
        sitesPreflight: sitesResponsivePublishingPreflight,
      }),
    [
      document,
      page,
      productionDeploySmoke,
      prototypeInteraction,
      sitesResponsivePublishingPreflight,
    ],
  );
  const devModeReview = useMemo(() => getDevModeReview(document), [document]);
  const devModeInspection = useMemo(
    () => getDevModeInspection(document),
    [document],
  );
  const devModeIntegrationReview = useMemo(
    () => getDevModeIntegrationReviewReport({ document }),
    [document],
  );
  const textReview = useMemo(
    () => getDocumentTextReview(document),
    [document],
  );
  const exportPreflight = useMemo(
    () =>
      getExportPreflightReview({
        document,
        selectedLayerIds,
      }),
    [document, selectedLayerIds],
  );
  const figJamFacilitationDepth = useMemo(
    () =>
      getFigJamFacilitationDepthReport({
        activePageId: page.id,
        document,
      }),
    [document, page.id],
  );
  const vectorPathReview = useMemo(
    () =>
      getVectorPathReview({
        document,
        selectedLayerIds,
      }),
    [document, selectedLayerIds],
  );
  const vectorDrawAuthoringReview = useMemo(
    () =>
      getVectorDrawAuthoringReviewReport({
        activePage: page,
        commandPaletteCommands,
        document,
        selectedLayerIds,
      }),
    [commandPaletteCommands, document, page, selectedLayerIds],
  );
  const autoLayoutProductionReview = useMemo(
    () => getAutoLayoutProductionReview(document),
    [document],
  );
  const responsiveConstraintsReview = useMemo(
    () => getResponsiveConstraintsReview(document),
    [document],
  );
  const variableGovernanceReview = useMemo(
    () => getVariableGovernanceReview(document),
    [document],
  );
  const designReviewApproval = useMemo(
    () =>
      getDesignReviewApprovalReport({
        activePageId: document.activePageId,
        document,
        gates: getDesignReviewApprovalGates({
          assetLibrary: assetLibraryManagement,
          assetMedia: assetMediaGovernance,
          componentUsage: componentUsageIntelligence,
          performanceRegression: performanceRegressionExport,
          pluginDeveloperOps,
          productionDeploySmoke,
          responsiveConstraints: responsiveConstraintsReview,
          variableGovernance: variableGovernanceReview,
        }),
      }),
    [
      assetLibraryManagement,
      assetMediaGovernance,
      componentUsageIntelligence,
      document,
      performanceRegressionExport,
      pluginDeveloperOps,
      productionDeploySmoke,
      responsiveConstraintsReview,
      variableGovernanceReview,
    ],
  );
  const releaseReadiness = useMemo(
    () =>
      getReleaseReadinessDashboard({
        assetMedia: assetMediaGovernance,
        componentUsage: componentUsageIntelligence,
        designReviewApproval,
        performanceRegression: performanceRegressionExport,
        pluginDeveloperOps,
        productionDeploySmoke,
        responsiveConstraints: responsiveConstraintsReview,
        variableGovernance: variableGovernanceReview,
      }),
    [
      assetMediaGovernance,
      componentUsageIntelligence,
      designReviewApproval,
      performanceRegressionExport,
      pluginDeveloperOps,
      productionDeploySmoke,
      responsiveConstraintsReview,
      variableGovernanceReview,
    ],
  );
  const productionReadinessSynthesis = useMemo(
    () =>
      getProductionReadinessSynthesisPacket({
        canvasInteraction: canvasInteractionProfiler,
        collaboration: multiplayerFollowSpotlight,
        devModeIntegration: devModeIntegrationReview,
        releaseReadiness,
      }),
    [
      canvasInteractionProfiler,
      devModeIntegrationReview,
      multiplayerFollowSpotlight,
      releaseReadiness,
    ],
  );
  const tauriDesktopPackagingReadiness = useMemo(
    () => getTauriDesktopPackagingReadinessReport(),
    [],
  );
  const nativeDesktopShipSynthesis = useMemo(
    () =>
      getNativeDesktopShipSynthesisReport({
        commandAutomation: commandAutomationRecording,
        largeCanvasScheduler: largeCanvasRenderScheduler,
        mediaAssetPipeline: mediaAssetPipelineReview,
        productionReadiness: productionReadinessSynthesis,
        tauriDesktopPackaging: tauriDesktopPackagingReadiness,
      }),
    [
      commandAutomationRecording,
      largeCanvasRenderScheduler,
      mediaAssetPipelineReview,
      productionReadinessSynthesis,
      tauriDesktopPackagingReadiness,
    ],
  );
  const localRestoreSnapshots = useMemo(
    () => readLocalDesignSnapshotMetas(activeFileId),
    [activeFileId],
  );
  const workspaceFileLocalArtifacts = useMemo(
    () =>
      files.map((file) => {
        const backup = readLocalDesignBackupMeta(file.id);
        const snapshots = readLocalDesignSnapshotMetas(file.id);
        const latestSnapshotAt =
          snapshots
            .map((snapshot) => snapshot.savedAt)
            .sort()
            .at(-1) ?? null;
        const mutations = readOfflineSaveMutations(file.id);

        return {
          fileId: file.id,
          fileName: file.name,
          backupSavedAt: backup?.savedAt ?? null,
          latestSnapshotAt,
          snapshotCount: snapshots.length,
          queuedSaveCount: mutations.filter(
            (mutation) =>
              mutation.status === "queued" ||
              mutation.status === "retrying",
          ).length,
          retryableSaveCount: mutations.filter(
            (mutation) => mutation.status !== "synced",
          ).length,
          failedSaveCount: mutations.filter(
            (mutation) => mutation.status === "failed",
          ).length,
          syncedSaveCount: mutations.filter(
            (mutation) => mutation.status === "synced",
          ).length,
        };
      }),
    [files],
  );
  const offlineSaveQueue = useMemo(
    () =>
      getOfflineSaveQueueReport(
        activeFileId,
        document,
        readOfflineSaveMutations(activeFileId),
      ),
    [activeFileId, document],
  );
  const workspaceRestoreDrills = useMemo(
    () =>
      getWorkspaceRestoreDrillsReport({
        fileId: activeFileId,
        fileName: activeFileName,
        localSnapshots: localRestoreSnapshots,
        offlineQueue: offlineSaveQueue,
        versions,
        workspaceDocument: document,
      }),
    [
      activeFileId,
      activeFileName,
      document,
      localRestoreSnapshots,
      offlineSaveQueue,
      versions,
    ],
  );
  const workspaceFileOperationsReview = useMemo(
    () =>
      getWorkspaceFileOperationsReviewReport({
        files,
        localArtifacts: workspaceFileLocalArtifacts,
      }),
    [files, workspaceFileLocalArtifacts],
  );
  const offlineWorkspaceHealthMonitor = useMemo(
    () =>
      getOfflineWorkspaceHealthMonitorReport({
        mediaAssetPipeline: mediaAssetPipelineReview,
        workspaceFileOperations: workspaceFileOperationsReview,
        workspaceRestoreDrills,
      }),
    [
      mediaAssetPipelineReview,
      workspaceFileOperationsReview,
      workspaceRestoreDrills,
    ],
  );
  const desktopCollaborationRecoveryBridge = useMemo(
    () =>
      getDesktopCollaborationRecoveryBridgeReport({
        activeFileId,
        activeFileName,
        activePageId: page.id,
        collaborationPresence,
        collaborationSyncReplay,
        multiplayerFollowSpotlight,
        offlineQueue: offlineSaveQueue,
      }),
    [
      activeFileId,
      activeFileName,
      collaborationPresence,
      collaborationSyncReplay,
      multiplayerFollowSpotlight,
      offlineSaveQueue,
      page.id,
    ],
  );
  const enterpriseDesktopReleaseOperationsSynthesis = useMemo(
    () =>
      getEnterpriseDesktopReleaseOperationsSynthesisReport({
        desktopCollaborationRecovery: desktopCollaborationRecoveryBridge,
        nativePluginSandbox: nativePluginSandboxOperations,
        productionReadiness: productionReadinessSynthesis,
        workspaceFileOperations: workspaceFileOperationsReview,
        workspaceRestoreDrills,
      }),
    [
      desktopCollaborationRecoveryBridge,
      nativePluginSandboxOperations,
      productionReadinessSynthesis,
      workspaceFileOperationsReview,
      workspaceRestoreDrills,
    ],
  );
  const desktopUpdateCohortObservability = useMemo(
    () =>
      getDesktopUpdateCohortObservabilityReport({
        enterpriseReleaseOperations: enterpriseDesktopReleaseOperationsSynthesis,
        tauriDesktopPackaging: tauriDesktopPackagingReadiness,
      }),
    [enterpriseDesktopReleaseOperationsSynthesis, tauriDesktopPackagingReadiness],
  );
  const desktopCrashPerformanceSupportBundle = useMemo(
    () =>
      getDesktopCrashPerformanceSupportBundleReport({
        nativePluginSandbox: nativePluginSandboxOperations,
        performanceRegression: performanceRegressionExport,
      }),
    [nativePluginSandboxOperations, performanceRegressionExport],
  );
  const interactionTestHarness = useMemo(
    () =>
      getInteractionTestHarnessReport({
        activePageId: document.activePageId,
        document,
        selectedLayerIds,
      }),
    [document, selectedLayerIds],
  );
  const variableUsage = useMemo(
    () => getVariableUsageAudit(document),
    [document],
  );
  const tokenDrift = useMemo(
    () => getDesignTokenDriftReview(document),
    [document],
  );
  const selectedAudit = useMemo(
    () => getSelectedAccessibilityAudit(page, selectedLayerIds),
    [page, selectedLayerIds],
  );
  function grantPlugin(manifest: EditorPluginManifest) {
    onApprovePlugin(manifest);
    onRecordActivity?.(
      `Granted ${manifest.name} permissions`,
      `Pinned ${manifest.version}: ${manifest.permissions
        .map((permission) => pluginPermissionLabels[permission])
        .join(", ")}`,
    );
  }

  function replacePluginGrants(next: Record<string, boolean>) {
    onReplacePluginGrants(next);
  }

  function hasGrant(manifest: EditorPluginManifest) {
    return (
      isPluginApprovalCurrent(manifest, pluginApprovals[manifest.id]) &&
      manifest.permissions.every(
        (permission) =>
          pluginGrants[getPluginPermissionGrantKey(manifest.id, permission)],
      )
    );
  }

  function runPlugin(manifest: EditorPluginManifest) {
    if (!hasGrant(manifest)) {
      onRecordPluginRun(
        manifest,
        "blocked",
        "Plugin run blocked because current version-pinned approval is missing.",
      );
      return;
    }

    if (manifest.id === "accessibility-auditor") {
      const layerIds = audit.issues
        .map((issue) => issue.layerId)
        .filter((layerId): layerId is string => Boolean(layerId));

      onSelectLayers(Array.from(new Set(layerIds)));
      onRecordActivity?.(
        `Ran ${manifest.name}`,
        `${layerIds.length} accessibility issue layer${
          layerIds.length === 1 ? "" : "s"
        } selected`,
      );
      onRecordPluginRun(
        manifest,
        "completed",
        `${layerIds.length} accessibility issue layer${
          layerIds.length === 1 ? "" : "s"
        } selected.`,
      );
    }

    if (manifest.id === "ready-for-dev-marker") {
      onUpdateLayers(
        selectedLayerIds.map((layerId) => ({
          layerId,
          patch: { readyForDev: true } satisfies Partial<DesignLayer>,
        })),
      );
      onRecordActivity?.(
        `Ran ${manifest.name}`,
        `${selectedLayerIds.length} selected layer${
          selectedLayerIds.length === 1 ? "" : "s"
        } marked ready for Dev Mode`,
      );
      onRecordPluginRun(
        manifest,
        "completed",
        `${selectedLayerIds.length} selected layer${
          selectedLayerIds.length === 1 ? "" : "s"
        } marked ready for Dev Mode.`,
      );
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-11 items-center px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Extensions
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-2">
          <DocumentHealthPanel
            report={healthReport}
            onSelectLayers={onSelectLayers}
            onMarkReadyLayers={(layerIds) =>
              onUpdateLayers(
                layerIds.map((layerId) => ({
                  layerId,
                  patch: { readyForDev: true } satisfies Partial<DesignLayer>,
                })),
              )
            }
            onClearPrototypeLinks={(layerIds) =>
              onUpdateLayers(
                layerIds.map((layerId) => ({
                  layerId,
                  patch: {
                    prototype: undefined,
                  } satisfies Partial<DesignLayer>,
                })),
              )
            }
            onResolveComments={(commentIds) =>
              onUpdateComments(commentIds, { resolved: true })
            }
          />

          <ReleaseReadinessDashboardPanel
            report={releaseReadiness}
            onRecordActivity={onRecordActivity}
          />

          <ProductionReadinessSynthesisPanel
            report={productionReadinessSynthesis}
            onRecordActivity={onRecordActivity}
          />

          <TauriDesktopPackagingReadinessPanel
            report={tauriDesktopPackagingReadiness}
            onRecordActivity={onRecordActivity}
          />

          <NativeDesktopShipSynthesisPanel
            report={nativeDesktopShipSynthesis}
            onRecordActivity={onRecordActivity}
          />

          <WorkspaceRestoreDrillsPanel
            report={workspaceRestoreDrills}
            onRecordActivity={onRecordActivity}
          />

          <WorkspaceFileOperationsReviewPanel
            report={workspaceFileOperationsReview}
            onRecordActivity={onRecordActivity}
          />

          <OfflineWorkspaceHealthMonitorPanel
            report={offlineWorkspaceHealthMonitor}
            onRecordActivity={onRecordActivity}
          />

          <DesktopCollaborationRecoveryBridgePanel
            report={desktopCollaborationRecoveryBridge}
            onRecordActivity={onRecordActivity}
          />

          <EnterpriseDesktopReleaseOperationsSynthesisPanel
            report={enterpriseDesktopReleaseOperationsSynthesis}
            onRecordActivity={onRecordActivity}
          />

          <DesktopUpdateCohortObservabilityPanel
            report={desktopUpdateCohortObservability}
            onRecordActivity={onRecordActivity}
          />

          <DesktopCrashPerformanceSupportBundlePanel
            report={desktopCrashPerformanceSupportBundle}
            onRecordActivity={onRecordActivity}
          />

          <DesignReviewApprovalPanel
            report={designReviewApproval}
            onSelectLayers={onSelectLayers}
            onUpdateComments={onUpdateComments}
            onUpdateLayers={onUpdateLayers}
            onRecordActivity={onRecordActivity}
          />

          <InteractionTestHarnessPanel
            report={interactionTestHarness}
            activePageId={document.activePageId}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <FigJamFacilitationDepthPanel
            report={figJamFacilitationDepth}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <DocumentPerformanceReviewPanel
            report={performanceReview}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <AssetMediaGovernancePanel
            report={assetMediaGovernance}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <MediaAssetPipelineReviewPanel
            report={mediaAssetPipelineReview}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <CommandAutomationRecordingPanel
            report={commandAutomationRecording}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <AssetLibraryManagementPanel
            report={assetLibraryManagement}
            onSelectLayers={onSelectLayers}
            onUpdateLayers={onUpdateLayers}
            onRecordActivity={onRecordActivity}
          />

          <LayerIndexReviewPanel
            report={layerIndexReview}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <CanvasRenderBudgetPanel
            report={canvasRenderBudget}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <CanvasInteractionProfilerPanel
            report={canvasInteractionProfiler}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <LargeCanvasRenderSchedulerPanel
            report={largeCanvasRenderScheduler}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <CanvasViewportIntelligencePanel
            report={canvasViewportIntelligence}
            document={document}
            activePage={page}
            activePageId={document.activePageId}
            onSelectLayers={onSelectLayers}
            onUpdateLayers={onUpdateLayers}
            onRecordActivity={onRecordActivity}
          />

          <LargeDocumentSafeModePanel
            report={safeModeReport}
            onSelectLayers={onSelectLayers}
            onUpdateLayers={onUpdateLayers}
            onRecordActivity={onRecordActivity}
          />

          <PerformanceBaselinePanel
            report={performanceBaseline}
            onSaveBaseline={onSavePerformanceBaseline}
            onRemoveBaseline={onRemovePerformanceBaseline}
            onRecordActivity={onRecordActivity}
          />

          <PerformanceRegressionExportPanel
            report={performanceRegressionExport}
            onRecordActivity={onRecordActivity}
          />

          <CollaborationSyncReplayPanel
            report={collaborationSyncReplay}
            onRecordActivity={onRecordActivity}
          />

          <MultiplayerFollowSpotlightPanel
            report={multiplayerFollowSpotlight}
            onRecordActivity={onRecordActivity}
          />

          <BranchCompareMergeWorkbenchPanel
            report={branchCompareMergeWorkbench}
            onRecordActivity={onRecordActivity}
          />

          <ProductionDeploySmokePanel
            report={productionDeploySmoke}
            onRecordActivity={onRecordActivity}
          />

          <SitesResponsivePublishingPreflightPanel
            report={sitesResponsivePublishingPreflight}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <SitesContentMapPublishQueuePanel
            report={sitesContentMapPublishQueue}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <SlidesSitesSurfaceAuthoringParityPanel
            report={slidesSitesSurfaceAuthoring}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <PrototypeFlowMap
            report={prototypeFlow}
            activePageId={document.activePageId}
            onSelectLayers={onSelectLayers}
            onClearPrototypeLinks={(layerIds) =>
              onUpdateLayers(
                layerIds.map((layerId) => ({
                  layerId,
                  patch: {
                    prototype: undefined,
                  } satisfies Partial<DesignLayer>,
                })),
              )
            }
            onSetPrototypeStartPage={onSetPrototypeStartPage}
            onRecordActivity={onRecordActivity}
          />

          <AdvancedPrototypeTransitionAuthoringPanel
            report={advancedPrototypeTransitionAuthoring}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <PresentationPresenterControlsPanel
            report={presentationPresenterControls}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <PrototypeInteractionInspectorPanel
            report={prototypeInteraction}
            activePage={page}
            activePageId={document.activePageId}
            onSelectLayers={onSelectLayers}
            onUpdateLayers={onUpdateLayers}
            onSetPrototypeStartPage={onSetPrototypeStartPage}
            onRecordActivity={onRecordActivity}
          />

          <DevModeReviewPanel
            report={devModeReview}
            activePageId={document.activePageId}
            onSelectLayers={onSelectLayers}
            onMarkReadyLayers={(layerIds) =>
              onUpdateLayers(
                layerIds.map((layerId) => ({
                  layerId,
                  patch: { readyForDev: true } satisfies Partial<DesignLayer>,
                })),
              )
            }
            onRecordActivity={onRecordActivity}
          />

          <DevModeInspectionPanel
            report={devModeInspection}
            document={document}
            activePage={page}
            activePageId={document.activePageId}
            onSelectLayers={onSelectLayers}
            onUpdateLayers={onUpdateLayers}
            onRecordActivity={onRecordActivity}
          />

          <DevModeIntegrationReviewPanel
            report={devModeIntegrationReview}
            onRecordActivity={onRecordActivity}
          />

          <DocumentTextReviewPanel
            report={textReview}
            activePageId={document.activePageId}
            activePageLayers={page.layers}
            onSelectLayers={onSelectLayers}
            onUpdateLayers={onUpdateLayers}
            onRecordActivity={onRecordActivity}
          />

          <ExportPreflightPanel
            report={exportPreflight}
            activePageId={document.activePageId}
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <VectorPathReviewPanel
            report={vectorPathReview}
            document={document}
            activePageId={document.activePageId}
            onSelectLayers={onSelectLayers}
            onUpdateLayers={onUpdateLayers}
            onRecordActivity={onRecordActivity}
          />

          <VectorDrawAuthoringReviewPanel
            report={vectorDrawAuthoringReview}
            onRecordActivity={onRecordActivity}
          />

          <AutoLayoutProductionReviewPanel
            report={autoLayoutProductionReview}
            activePage={page}
            activePageId={document.activePageId}
            onSelectLayers={onSelectLayers}
            onUpdateLayers={onUpdateLayers}
            onRecordActivity={onRecordActivity}
          />

          <ResponsiveConstraintsReviewPanel
            report={responsiveConstraintsReview}
            activePage={page}
            activePageId={document.activePageId}
            onSelectLayers={onSelectLayers}
            onUpdateLayers={onUpdateLayers}
            onRecordActivity={onRecordActivity}
          />

          <VariableUsageAuditPanel
            report={variableUsage}
            activePageId={document.activePageId}
            onSelectLayers={onSelectLayers}
          />

          <VariableGovernanceReviewPanel
            document={document}
            report={variableGovernanceReview}
            onUpdateVariableSystem={onUpdateVariableSystem}
            onRecordActivity={onRecordActivity}
          />

          <DesignTokenDriftReviewPanel report={tokenDrift} />

          <AccessibilityAuditPanel
            title="Document accessibility"
            audit={documentAudit}
            emptyLabel="No accessibility issues found in this document."
            exportName="document-accessibility-audit"
            onSelectLayers={onSelectLayers}
            onRecordActivity={onRecordActivity}
          />

          <AccessibilityKeyboardAuthoringReviewPanel
            report={accessibilityKeyboardAuthoringReview}
            onRecordActivity={onRecordActivity}
          />

          <AdvancedPaintStyleAuthoringPanel
            report={advancedPaintStyleAuthoring}
            onRecordActivity={onRecordActivity}
          />

          <AccessibilityAuditPanel
            title="Page accessibility"
            audit={audit}
            emptyLabel="No accessibility issues found on this page."
            exportName="page-accessibility-audit"
            quickFixPatches={pageQuickFixes}
            onSelectLayers={onSelectLayers}
            onApplyQuickFixes={onUpdateLayers}
            onRecordActivity={onRecordActivity}
          />

          {selectedLayerIds.length > 0 ? (
            <AccessibilityAuditPanel
              title="Selected accessibility"
              audit={selectedAudit}
              emptyLabel="No accessibility issues found in the selection."
              exportName="selected-accessibility-audit"
              onSelectLayers={onSelectLayers}
              onRecordActivity={onRecordActivity}
            />
          ) : null}

          <div className="space-y-2">
            {builtInPluginManifests.map((manifest) => {
              const granted = hasGrant(manifest);
              const disabled =
                manifest.id === "ready-for-dev-marker" &&
                selectedLayerIds.length === 0;

              return (
                <div
                  key={manifest.id}
                  className="rounded-md border border-border bg-background p-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {manifest.name}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        v{manifest.version} / {manifest.description}
                      </div>
                    </div>
                    {granted ? (
                      <Check className="mt-0.5 size-4 text-emerald-400" />
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {manifest.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {pluginPermissionLabels[permission]}
                      </span>
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={granted ? "secondary" : "outline"}
                    className="mt-2 h-8 w-full"
                    disabled={granted && disabled}
                    onClick={() =>
                      granted ? runPlugin(manifest) : grantPlugin(manifest)
                    }
                  >
                    {granted ? "Run" : "Grant permissions"}
                  </Button>
                </div>
              );
            })}
          </div>

          <PluginGovernancePanel
            grants={pluginGrants}
            onReplacePluginGrants={replacePluginGrants}
            onRecordActivity={onRecordActivity}
          />

          <PluginPackageImportPanel
            installedManifests={builtInPluginManifests}
            onRecordActivity={onRecordActivity}
          />

          <PluginDeveloperOperationsPanel
            approvals={pluginApprovals}
            grants={pluginGrants}
            manifests={builtInPluginManifests}
            runHistory={pluginRunHistory}
            onReplayApprovals={onReplayPluginApprovals}
            onRecordActivity={onRecordActivity}
          />

          <PluginSandboxHistoryPanel
            approvals={pluginApprovals}
            grants={pluginGrants}
            manifests={builtInPluginManifests}
            runHistory={pluginRunHistory}
            onReplayApprovals={onReplayPluginApprovals}
            onRecordActivity={onRecordActivity}
          />

          <PluginWidgetRuntimeOperationsPanel
            report={pluginWidgetRuntimeOperations}
            onRecordActivity={onRecordActivity}
          />

          <PluginWidgetRuntimeTelemetryDigestPanel
            report={pluginWidgetRuntimeTelemetryDigest}
            onRecordActivity={onRecordActivity}
          />

          <NativePluginSandboxOperationsPanel
            report={nativePluginSandboxOperations}
            onRecordActivity={onRecordActivity}
          />

          <EditorSettingsPanel
            shortcuts={toolShortcuts}
            commandPaletteCommands={commandPaletteCommands}
            pluginGrants={pluginGrants}
            onUpdateToolShortcut={onUpdateToolShortcut}
            onReplaceToolShortcuts={onReplaceToolShortcuts}
            onReplacePluginGrants={replacePluginGrants}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
