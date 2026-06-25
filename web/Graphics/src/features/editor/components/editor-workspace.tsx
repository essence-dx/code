"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { nanoid } from "nanoid";
import {
  saveDesignFile,
  type DesignFileSummary,
  type DesignFileVersionSummary,
} from "@/features/files/actions";
import type {
  CanvasView,
  DesignActivityKind,
  DesignComment,
  DesignCommandTelemetry,
  DesignDocument,
  DesignLayer,
  EditorTool,
  LayerAlignment,
  LayerDistribution,
} from "@/features/editor/types";
import { useEditorDocument } from "@/features/editor/use-editor-document";
import { createActivityEvent } from "@/features/editor/activity-log";
import { createCommandTelemetry } from "@/features/editor/command-telemetry";
import { getMentionKeys } from "@/features/editor/comment-mentions";
import {
  getCommentNotificationPreferences,
  updateCommentNotificationPreferences,
} from "@/features/editor/comment-notifications";
import { CommandPalette } from "@/features/editor/components/command-palette";
import { EditorCanvas } from "@/features/editor/components/editor-canvas";
import { EditorToolbar } from "@/features/editor/components/editor-toolbar";
import { ExportSettingsDialog } from "@/features/editor/components/export-settings-dialog";
import { ImportDiagnosticsPanel } from "@/features/editor/components/import-diagnostics-panel";
import { OfflineMutationQueueDialog } from "@/features/editor/components/offline-mutation-queue-dialog";
import { PropertiesPanel } from "@/features/editor/components/properties-panel";
import { VersionHistoryMenu } from "@/features/editor/components/version-history-menu";
import { WorkspaceSidebar } from "@/features/editor/components/workspace-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Save, Search } from "lucide-react";
import {
  builtInPluginManifests,
  createPluginApprovalRecord,
  createPluginRunHistoryEntry,
  getPluginGrantsForApproval,
  type EditorPluginManifest,
  type EditorPluginRunHistoryEntry,
} from "@/features/editor/editor-plugin-api";
import { exportDocumentToSvg } from "@/features/editor/exporters/svg-exporter";
import { exportDocumentToPngBlob } from "@/features/editor/exporters/png-exporter";
import { exportDocumentToJpegBlob } from "@/features/editor/exporters/jpeg-exporter";
import { exportDocumentToPdfBlob } from "@/features/editor/exporters/pdf-exporter";
import { createEditorCommands } from "@/features/editor/editor-commands";
import {
  getExportFileEntries,
  getExportName,
  getExportSettingsSummary,
  getScopedExportDocument,
  type ExportSettings,
} from "@/features/editor/exporters/export-settings";
import { createExportManifest } from "@/features/editor/exporters/export-manifest";
import { getExportManifestImportDiagnostic } from "@/features/editor/exporters/export-manifest";
import {
  getSvgImportDiagnostic,
  importSvgLayers,
} from "@/features/editor/importers/svg-importer";
import { importMediaFile } from "@/features/editor/importers/image-importer";
import { importDesignDocumentJson } from "@/features/editor/importers/json-importer";
import {
  assertImportKind,
  errorToImportReport,
  getImportReportSummary,
  unsupportedPdfImportReport,
  type ImportDiagnosticReport,
} from "@/features/editor/importers/import-diagnostics";
import {
  createComponentLibraryManifest,
  getLocalLibraryStatus,
  parseComponentLibraryManifest,
} from "@/features/editor/component-library-manifest";
import {
  formatComponentUpdateReview,
  getComponentLibraryUpdateReview,
} from "@/features/editor/component-library-review";
import { createDesignSystemPackage } from "@/features/editor/design-system-package";
import { useLocalCollaborationPresence } from "@/features/editor/collaboration-presence";
import {
  defaultToolShortcutPreferences,
  getToolForShortcut,
  normalizeShortcutKey,
  type ToolShortcutPreferences,
} from "@/features/editor/shortcut-preferences";
import {
  createWorkspaceSettings,
  getWorkspaceSettingsState,
  readLocalWorkspaceSettings,
  writeLocalWorkspaceSettings,
} from "@/features/editor/workspace-settings";
import {
  appendPluginRunHistory,
  replayPluginApprovals,
} from "@/features/editor/plugin-sandbox-history";
import {
  cloneLayer,
  writeLayerClipboard,
} from "@/features/editor/layer-clipboard";
import {
  copyDesignJsonToClipboard,
  copyDesignPngToClipboard,
  copyDesignSvgToClipboard,
  readDesignClipboard,
} from "@/features/editor/editor-clipboard-actions";
import {
  clearLocalDesignBackup,
  clearLocalDesignSnapshots,
  readLocalDesignBackup,
  readLocalDesignBackupMeta,
  readLocalDesignSnapshots,
  readLocalDesignSnapshotMetas,
  writeLocalDesignBackup,
  writeLocalDesignSnapshot,
  type LocalDesignBackupMeta,
  type LocalDesignSnapshotMeta,
} from "@/features/editor/offline-backups";
import {
  clearSyncedOfflineSaveMutations,
  createOfflineSaveQueueEvidence,
  enqueueOfflineSaveMutation,
  getDesignDocumentSnapshotHash,
  getOfflineSaveQueueReport,
  markAllOfflineSaveMutationsSynced,
  markOfflineSaveMutationFailed,
  markOfflineSaveMutationRetrying,
  markOfflineSaveMutationSynced,
  readOfflineSaveMutations,
  removeOfflineSaveMutation,
  type OfflineSaveMutation,
} from "@/features/editor/offline-mutation-queue";
import {
  fitLayersToViewport,
  zoomView,
  type ViewportFitOptions,
  type ViewportSize,
} from "@/features/editor/viewport-utils";
import {
  createPerformanceBaselineSnapshot,
  getNextPerformanceBaselines,
  removePerformanceBaseline,
} from "@/features/editor/performance-baseline";

export type EditorWorkspaceProps = {
  fileId: string;
  fileName: string;
  files: DesignFileSummary[];
  versions: DesignFileVersionSummary[];
  initialDocument: DesignDocument;
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
};

const PAGE_FIT_OPTIONS = {
  preferPrimaryFrame: true,
  insets: {
    top: 24,
    bottom: 96,
  },
} satisfies ViewportFitOptions;

const SELECTION_FIT_OPTIONS = {
  insets: PAGE_FIT_OPTIONS.insets,
} satisfies ViewportFitOptions;

export function EditorWorkspace({
  fileId,
  fileName,
  files,
  versions,
  initialDocument,
  user,
}: EditorWorkspaceProps) {
  const editor = useEditorDocument(initialDocument);
  const [tool, setTool] = useState<EditorTool>("select");
  const [view, setView] = useState<CanvasView>({ x: 72, y: 48, zoom: 0.86 });
  const autoFitSignatureRef = useRef<string | null>(null);
  const [canvasViewportSize, setCanvasViewportSize] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });
  const [saveState, setSaveState] = useState<
    "saved" | "saving" | "dirty" | "queued"
  >("saved");
  const [clipboardLayers, setClipboardLayers] = useState<DesignLayer[]>([]);
  const [importReport, setImportReport] =
    useState<ImportDiagnosticReport | null>(null);
  const [localBackupMeta, setLocalBackupMeta] =
    useState<LocalDesignBackupMeta | null>(null);
  const [localSnapshotMetas, setLocalSnapshotMetas] = useState<
    LocalDesignSnapshotMeta[]
  >([]);
  const [offlineSaveQueue, setOfflineSaveQueue] = useState<
    OfflineSaveMutation[]
  >([]);
  const [offlineQueueOpen, setOfflineQueueOpen] = useState(false);
  const [activeOfflineMutationId, setActiveOfflineMutationId] = useState<
    string | null
  >(null);
  const [isBrowserOnline, setIsBrowserOnline] = useState(true);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null,
  );
  const followedPeerId: string | null = null;
  const [toolShortcuts, setToolShortcuts] = useState<ToolShortcutPreferences>(
    () => getWorkspaceSettingsState(initialDocument).toolShortcuts,
  );
  const [pluginGrants, setPluginGrants] = useState<Record<string, boolean>>(
    () => getWorkspaceSettingsState(initialDocument).pluginGrants,
  );
  const [pluginApprovals, setPluginApprovals] = useState(
    () => getWorkspaceSettingsState(initialDocument).pluginApprovals,
  );
  const [pluginRunHistory, setPluginRunHistory] = useState(
    () => getWorkspaceSettingsState(initialDocument).pluginRunHistory,
  );
  const [isExporting, setIsExporting] = useState(false);
  const svgInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const lastMediaInputSignatureRef = useRef<string | null>(null);
  const latestDocumentRef = useRef(editor.document);
  const [isPending, startTransition] = useTransition();
  const mentionKeys = useMemo(
    () => getMentionKeys({ email: user.email, name: user.name }),
    [user.email, user.name],
  );
  const notificationPreferences = useMemo(
    () => getCommentNotificationPreferences(editor.document),
    [editor.document],
  );
  const libraryStatus = useMemo(
    () => getLocalLibraryStatus(editor.document),
    [editor.document],
  );
  const offlineSaveQueueReport = useMemo(
    () => getOfflineSaveQueueReport(fileId, editor.document, offlineSaveQueue),
    [editor.document, fileId, offlineSaveQueue],
  );
  const presence = useLocalCollaborationPresence({
    fileId,
    user,
    activePageId: editor.document.activePageId,
    view,
    onCommandTelemetry: (telemetry) =>
      recordActivity(
        "extension",
        "Measured collaboration sync",
        telemetry.command,
        fileId,
        telemetry,
      ),
  });
  const savedExportPresets = useMemo(
    () =>
      Object.values(editor.document.exportPresets ?? {}).sort((first, second) =>
        first.name.localeCompare(second.name),
      ),
    [editor.document.exportPresets],
  );

  useEffect(() => {
    const documentSettings = getWorkspaceSettingsState(editor.document);
    const localSettings = editor.document.workspaceSettings
      ? null
      : readLocalWorkspaceSettings();
    const nextSettings = {
      toolShortcuts:
        localSettings?.toolShortcuts ?? documentSettings.toolShortcuts,
      pluginGrants:
        localSettings?.pluginGrants ?? documentSettings.pluginGrants,
      pluginApprovals:
        localSettings?.pluginApprovals ?? documentSettings.pluginApprovals,
      pluginRunHistory:
        localSettings?.pluginRunHistory ?? documentSettings.pluginRunHistory,
      updatedAt: localSettings?.updatedAt ?? documentSettings.updatedAt,
      updatedBy: localSettings?.updatedBy ?? documentSettings.updatedBy,
    };

    writeLocalWorkspaceSettings(nextSettings);

    return scheduleEffectStateSync(() => {
      setToolShortcuts(nextSettings.toolShortcuts);
      setPluginGrants(nextSettings.pluginGrants);
      setPluginApprovals(nextSettings.pluginApprovals);
      setPluginRunHistory(nextSettings.pluginRunHistory);
    });
  }, [editor.document, fileId]);

  useEffect(() => {
    latestDocumentRef.current = editor.document;
  }, [editor.document]);

  useEffect(() => {
    if (canvasViewportSize.width <= 0 || canvasViewportSize.height <= 0) {
      return;
    }

    const fitSignature = `${editor.activePage.id}:${canvasViewportSize.width}x${canvasViewportSize.height}`;

    if (autoFitSignatureRef.current === fitSignature) {
      return;
    }

    const nextView = fitLayersToViewport(
      editor.activePage.layers,
      canvasViewportSize,
      PAGE_FIT_OPTIONS,
    );

    if (!nextView) {
      return;
    }

    return scheduleEffectStateSync(() => {
      autoFitSignatureRef.current = fitSignature;
      setView(nextView);
    });
  }, [canvasViewportSize, editor.activePage.id, editor.activePage.layers]);

  useEffect(() => {
    return scheduleEffectStateSync(() => {
      setLocalBackupMeta(readLocalDesignBackupMeta(fileId));
      setLocalSnapshotMetas(readLocalDesignSnapshotMetas(fileId));
      setOfflineSaveQueue(readOfflineSaveMutations(fileId));
    });
  }, [fileId]);

  const save = useCallback(() => {
    const documentSnapshot = latestDocumentRef.current;
    const documentHash = getDesignDocumentSnapshotHash(documentSnapshot);

    setSaveState("saving");
    setLocalSnapshotMetas(
      writeLocalDesignSnapshot(
        fileId,
        fileName,
        documentSnapshot,
        "Before save",
      ),
    );
    startTransition(async () => {
      try {
        await saveDesignFile({
          fileId,
          name: fileName,
          document: documentSnapshot,
        });

        if (
          getDesignDocumentSnapshotHash(latestDocumentRef.current) ===
          documentHash
        ) {
          setOfflineSaveQueue(markAllOfflineSaveMutationsSynced(fileId));
          setSaveState("saved");
        } else {
          setSaveState("dirty");
        }
      } catch (error) {
        const nextQueue = enqueueOfflineSaveMutation({
          fileId,
          fileName,
          document: documentSnapshot,
          error: getErrorMessage(error),
        });

        setOfflineSaveQueue(nextQueue);
        setSaveState(
          getDesignDocumentSnapshotHash(latestDocumentRef.current) ===
            documentHash
            ? "queued"
            : "dirty",
        );
        setBackupMessage("Save queued locally.");
        window.setTimeout(() => setBackupMessage(null), 2400);
      }
    });
  }, [fileId, fileName, startTransition]);

  useEffect(() => {
    if (saveState !== "dirty") {
      return;
    }

    const timer = window.setTimeout(() => {
      setLocalBackupMeta(
        writeLocalDesignBackup(fileId, fileName, editor.document),
      );
    }, 800);

    return () => window.clearTimeout(timer);
  }, [editor.document, fileId, fileName, saveState]);

  useEffect(() => {
    function updateOnlineState() {
      setIsBrowserOnline(navigator.onLine);
    }

    updateOnlineState();
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  function updateToolShortcut(toolName: EditorTool, shortcut: string) {
    const normalizedShortcut = normalizeShortcutKey(shortcut);

    if (!normalizedShortcut) {
      return;
    }

    const next = {
      ...toolShortcuts,
      [toolName]: normalizedShortcut,
    };

    replaceToolShortcuts(next);
  }

  function replaceToolShortcuts(next: ToolShortcutPreferences) {
    setToolShortcuts(next);
    persistWorkspaceSettings({ toolShortcuts: next });
  }

  function replacePluginGrants(next: Record<string, boolean>) {
    setPluginGrants(next);
    persistWorkspaceSettings({ pluginGrants: next });
  }

  function approvePlugin(manifest: EditorPluginManifest) {
    const approval = createPluginApprovalRecord({
      actorEmail: user.email,
      manifest,
    });
    const nextApprovals = {
      ...pluginApprovals,
      [manifest.id]: approval,
    };
    const nextGrants = {
      ...pluginGrants,
      ...getPluginGrantsForApproval(approval),
    };
    const nextRunHistory = appendPluginRunHistory(
      pluginRunHistory,
      createPluginRunHistoryEntry({
        action: "approve",
        actorEmail: user.email,
        detail: `Pinned ${manifest.name} manifest ${manifest.version}.`,
        manifest,
        pinnedManifestVersion: manifest.version,
        status: "completed",
      }),
    );

    setPluginApprovals(nextApprovals);
    setPluginGrants(nextGrants);
    setPluginRunHistory(nextRunHistory);
    persistWorkspaceSettings({
      pluginApprovals: nextApprovals,
      pluginGrants: nextGrants,
      pluginRunHistory: nextRunHistory,
    });
  }

  function recordPluginRun(
    manifest: EditorPluginManifest,
    status: EditorPluginRunHistoryEntry["status"],
    detail: string,
  ) {
    const approval = pluginApprovals[manifest.id];
    const nextRunHistory = appendPluginRunHistory(
      pluginRunHistory,
      createPluginRunHistoryEntry({
        action: "run",
        actorEmail: user.email,
        detail,
        manifest,
        pinnedManifestVersion: approval?.manifestVersion ?? null,
        status,
      }),
    );

    setPluginRunHistory(nextRunHistory);
    persistWorkspaceSettings({ pluginRunHistory: nextRunHistory });
  }

  function replayWorkspacePluginApprovals() {
    const replay = replayPluginApprovals({
      actorEmail: user.email,
      approvals: pluginApprovals,
      manifests: builtInPluginManifests,
    });
    const nextRunHistory = appendPluginRunHistory(
      pluginRunHistory,
      replay.runHistoryEntries,
    );

    setPluginGrants(replay.grants);
    setPluginRunHistory(nextRunHistory);
    persistWorkspaceSettings({
      pluginGrants: replay.grants,
      pluginRunHistory: nextRunHistory,
    });
    recordActivity(
      "extension",
      "Replayed plugin approvals",
      `${replay.replayedCount} replayed / ${replay.blockedCount} blocked`,
      fileId,
    );
  }

  function persistWorkspaceSettings(
    patch: Parameters<typeof createWorkspaceSettings>[1],
  ) {
    const updatedAt = new Date().toISOString();
    const fullPatch = {
      toolShortcuts: patch.toolShortcuts ?? toolShortcuts,
      pluginGrants: patch.pluginGrants ?? pluginGrants,
      pluginApprovals: patch.pluginApprovals ?? pluginApprovals,
      pluginRunHistory: patch.pluginRunHistory ?? pluginRunHistory,
    };
    const settings = createWorkspaceSettings(
      editor.document.workspaceSettings,
      fullPatch,
      user.email,
      updatedAt,
    );
    const nextShortcuts = {
      ...defaultToolShortcutPreferences,
      ...(settings.toolShortcuts ?? {}),
    } satisfies ToolShortcutPreferences;
    const nextPluginGrants = settings.pluginGrants ?? {};

    editor.setDocument((current) => ({
      ...current,
      workspaceSettings: createWorkspaceSettings(
        current.workspaceSettings,
        fullPatch,
        user.email,
        updatedAt,
      ),
      updatedAt: settings.updatedAt,
    }));
    writeLocalWorkspaceSettings({
      toolShortcuts: nextShortcuts,
      pluginGrants: nextPluginGrants,
      pluginApprovals: settings.pluginApprovals ?? {},
      pluginRunHistory: settings.pluginRunHistory ?? [],
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy ?? null,
    });
    setSaveState("dirty");
  }

  function markDirty(action: () => void) {
    action();
    setSaveState("dirty");
  }

  function recordActivity(
    kind: DesignActivityKind,
    label: string,
    detail?: string,
    targetId?: string,
    telemetry?: DesignCommandTelemetry,
  ) {
    editor.recordActivity(
      createActivityEvent({
        kind,
        label,
        detail,
        targetId,
        telemetry,
        actorName: user.name || user.email,
        actorEmail: user.email,
      }),
    );
  }

  function markDirtyWithActivity(
    action: () => void,
    kind: DesignActivityKind,
    label: string,
    detail?: string,
    targetId?: string,
    telemetry?: DesignCommandTelemetry,
  ) {
    action();
    recordActivity(kind, label, detail, targetId, telemetry);
    setSaveState("dirty");
  }

  function runCanvasCommand(
    action: () => void,
    label: string,
    detail?: string,
    targetId?: string,
    itemCount?: number,
  ) {
    const startedAt = performance.now();

    try {
      action();
      recordActivity(
        "page",
        label,
        detail,
        targetId,
        createTimedTelemetry("canvas", label, startedAt, {
          detail,
          itemCount,
        }),
      );
      setSaveState("dirty");
    } catch (error) {
      recordActivity(
        "page",
        `${label} failed`,
        error instanceof Error ? error.message : "Unknown canvas error",
        targetId,
        createTimedTelemetry("canvas", label, startedAt, {
          status: "failed",
          detail,
          itemCount,
        }),
      );
      setSaveState("dirty");
      throw error;
    }
  }

  function createTimedTelemetry(
    area: DesignCommandTelemetry["area"],
    command: string,
    startedAt: number,
    input: Partial<
      Pick<DesignCommandTelemetry, "detail" | "itemCount" | "status">
    > = {},
  ) {
    return createCommandTelemetry({
      area,
      command,
      durationMs: performance.now() - startedAt,
      ...(input.detail !== undefined ? { detail: input.detail } : {}),
      ...(input.itemCount !== undefined ? { itemCount: input.itemCount } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    });
  }

  function focusComment(comment: DesignComment) {
    setSelectedCommentId(comment.id);
    editor.clearSelection();
    setView((current) => ({
      ...current,
      x: Math.round(canvasViewportSize.width / 2 - comment.x * current.zoom),
      y: Math.round(canvasViewportSize.height / 2 - comment.y * current.zoom),
    }));
  }

  const commandPaletteCommands = createEditorCommands({
    editor,
    markDirty,
    save,
    setTool,
    view,
    setView,
    viewportSize: canvasViewportSize,
    openExport: () => setExportDialogOpen(true),
    insertComponent,
    toolShortcuts,
  });

  useEffect(() => {
    if (
      selectedCommentId &&
      !editor.comments.some((comment) => comment.id === selectedCommentId)
    ) {
      return scheduleEffectStateSync(() => setSelectedCommentId(null));
    }
  }, [editor.comments, selectedCommentId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (modifier && key === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (modifier && key === "s") {
        event.preventDefault();
        save();
        return;
      }

      if (modifier && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        setView((current) => zoomView(current, 0.1));
        return;
      }

      if (modifier && event.key === "-") {
        event.preventDefault();
        setView((current) => zoomView(current, -0.1));
        return;
      }

      if (modifier && event.key === "0") {
        event.preventDefault();
        setView((current) => ({ ...current, zoom: 1 }));
        return;
      }

      if (event.shiftKey && event.code === "Digit1") {
        event.preventDefault();
        fitActivePageToView();
        return;
      }

      if (event.shiftKey && event.code === "Digit2") {
        event.preventDefault();
        fitSelectionToView();
        return;
      }

      if (event.shiftKey && key === "g") {
        event.preventDefault();
        markDirty(() =>
          editor.updateActivePage({
            grid: {
              ...getPageGrid(editor.activePage),
              visible: !getPageGrid(editor.activePage).visible,
            },
          }),
        );
        return;
      }

      if (event.shiftKey && key === "s") {
        event.preventDefault();
        markDirty(() =>
          editor.updateActivePage({
            grid: {
              ...getPageGrid(editor.activePage),
              snap: !getPageGrid(editor.activePage).snap,
            },
          }),
        );
        return;
      }

      if (event.shiftKey && key === "o") {
        event.preventDefault();
        markDirty(() =>
          editor.updateActivePage({
            grid: {
              ...getPageGrid(editor.activePage),
              objectSnap: !getPageGrid(editor.activePage).objectSnap,
            },
          }),
        );
        return;
      }

      if (modifier && key === "a") {
        event.preventDefault();
        editor.selectAllLayers();
        return;
      }

      if (modifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          markDirty(editor.redo);
        } else {
          markDirty(editor.undo);
        }
        return;
      }

      if (modifier && key === "y") {
        event.preventDefault();
        markDirty(editor.redo);
        return;
      }

      if (modifier && key === "d") {
        event.preventDefault();
        markDirty(editor.duplicateSelectedLayer);
        return;
      }

      if (modifier && key === "c") {
        event.preventDefault();
        copySelectedLayers();
        return;
      }

      if (modifier && key === "x") {
        event.preventDefault();
        cutSelectedLayers();
        return;
      }

      if (modifier && key === "v") {
        event.preventDefault();
        void pasteFromSystemClipboard();
        return;
      }

      if (
        modifier &&
        event.shiftKey &&
        key === "h" &&
        editor.selectedLayers.length > 0
      ) {
        event.preventDefault();
        markDirty(() =>
          editor.updateLayers(
            getSelectionVisibilityPatches(editor.selectedLayers),
          ),
        );
        return;
      }

      if (
        modifier &&
        event.shiftKey &&
        key === "l" &&
        editor.selectedLayers.length > 0
      ) {
        event.preventDefault();
        markDirty(() =>
          editor.updateLayers(getSelectionLockPatches(editor.selectedLayers)),
        );
        return;
      }

      if (modifier && key === "g") {
        event.preventDefault();
        if (event.shiftKey) {
          markDirty(editor.ungroupSelectedLayers);
        } else {
          markDirty(editor.groupSelectedLayers);
        }
        return;
      }

      if (modifier && event.code === "BracketRight") {
        event.preventDefault();
        markDirty(() =>
          editor.reorderSelectedLayer(event.shiftKey ? "front" : "forward"),
        );
        return;
      }

      if (modifier && event.code === "BracketLeft") {
        event.preventDefault();
        markDirty(() =>
          editor.reorderSelectedLayer(event.shiftKey ? "back" : "backward"),
        );
        return;
      }

      if (modifier) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        editor.clearSelection();
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        editor.selectAdjacentLayer(event.shiftKey ? "previous" : "next");
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        editor.selectEdgeLayer("back");
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        editor.selectEdgeLayer("front");
        return;
      }

      if (event.key.startsWith("Arrow") && editor.selectedLayers.length > 0) {
        event.preventDefault();
        const distance = getNudgeDistance(editor.activePage, event.shiftKey);
        const movement = getArrowMovement(event.key, distance);

        if (movement) {
          markDirty(() =>
            editor.updateLayers(
              getNudgedLayerPatches(
                editor.activePage,
                editor.selectedLayers,
                movement,
                event.shiftKey,
              ),
            ),
          );
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        markDirty(editor.deleteSelectedLayer);
        return;
      }

      const nextTool = getToolForShortcut(toolShortcuts, key);

      if (nextTool) {
        setTool(nextTool);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    if (saveState !== "dirty") {
      return;
    }

    const timer = window.setTimeout(() => {
      save();
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [editor.document, save, saveState]);

  async function retryOfflineSave(entryId: string) {
    const entry = offlineSaveQueue.find((item) => item.id === entryId);

    if (!entry || entry.status === "synced" || entry.status === "retrying") {
      return;
    }

    setActiveOfflineMutationId(entryId);
    setOfflineSaveQueue(markOfflineSaveMutationRetrying(fileId, entryId));

    try {
      await saveDesignFile({
        fileId,
        name: fileName,
        document: entry.document,
      });

      const isCurrentSnapshot =
        getDesignDocumentSnapshotHash(latestDocumentRef.current) ===
        entry.documentHash;
      const nextQueue = isCurrentSnapshot
        ? markAllOfflineSaveMutationsSynced(fileId)
        : markOfflineSaveMutationSynced(fileId, entryId);

      setOfflineSaveQueue(nextQueue);
      setSaveState(isCurrentSnapshot ? "saved" : "dirty");
      setBackupMessage("Offline save synced.");
      window.setTimeout(() => setBackupMessage(null), 1800);
    } catch (error) {
      setOfflineSaveQueue(
        markOfflineSaveMutationFailed(fileId, entryId, getErrorMessage(error)),
      );
      setSaveState("queued");
      setBackupMessage("Offline save still needs review.");
      window.setTimeout(() => setBackupMessage(null), 2400);
    } finally {
      setActiveOfflineMutationId(null);
    }
  }

  function retryLatestOfflineSave() {
    const entry = offlineSaveQueueReport.latestRetryableEntry;

    if (!entry) {
      return;
    }

    void retryOfflineSave(entry.id);
  }

  function restoreOfflineSaveSnapshot(entryId: string) {
    const entry = offlineSaveQueue.find((item) => item.id === entryId);

    if (!entry) {
      return;
    }

    editor.remember(editor.document);
    editor.setDocument({
      ...entry.document,
      updatedAt: new Date().toISOString(),
    });
    editor.setSelectedLayerIds([]);
    setSelectedCommentId(null);
    setImportReport(null);
    setSaveState("dirty");
    setBackupMessage("Offline snapshot restored.");
    window.setTimeout(() => setBackupMessage(null), 1800);
  }

  function removeOfflineSave(entryId: string) {
    setOfflineSaveQueue(removeOfflineSaveMutation(fileId, entryId));
    setBackupMessage("Offline snapshot removed.");
    window.setTimeout(() => setBackupMessage(null), 1800);
  }

  function clearSyncedOfflineSaves() {
    setOfflineSaveQueue(clearSyncedOfflineSaveMutations(fileId));
    setBackupMessage("Synced queue entries cleared.");
    window.setTimeout(() => setBackupMessage(null), 1800);
  }

  function exportOfflineSaveQueueEvidence() {
    const evidence = createOfflineSaveQueueEvidence({
      fileId,
      fileName,
      currentDocument: latestDocumentRef.current,
      entries: offlineSaveQueue,
    });
    const blob = new Blob([JSON.stringify(evidence, null, 2)], {
      type: "application/json",
    });

    downloadBlob(`${fileName}-offline-save-queue.json`, blob);
  }

  function saveLocalBackupNow() {
    setLocalBackupMeta(writeLocalDesignBackup(fileId, fileName, editor.document));
    setBackupMessage("Local backup saved.");
    window.setTimeout(() => setBackupMessage(null), 1800);
  }

  function saveLocalSnapshotNow() {
    setLocalSnapshotMetas(
      writeLocalDesignSnapshot(
        fileId,
        fileName,
        editor.document,
        "Manual checkpoint",
      ),
    );
    setBackupMessage("Local checkpoint saved.");
    window.setTimeout(() => setBackupMessage(null), 1800);
  }

  function restoreLocalBackup() {
    const backup = readLocalDesignBackup(fileId);

    if (!backup) {
      setBackupMessage("No local backup found.");
      window.setTimeout(() => setBackupMessage(null), 1800);
      return;
    }

    editor.remember(editor.document);
    editor.setDocument({
      ...backup.document,
      updatedAt: new Date().toISOString(),
    });
    editor.setSelectedLayerIds([]);
    setSelectedCommentId(null);
    setImportReport(null);
    setSaveState("dirty");
    setBackupMessage("Local backup restored.");
    window.setTimeout(() => setBackupMessage(null), 1800);
  }

  function clearLocalBackup() {
    clearLocalDesignBackup(fileId);
    setLocalBackupMeta(null);
    setBackupMessage("Local backup cleared.");
    window.setTimeout(() => setBackupMessage(null), 1800);
  }

  function restoreLatestLocalSnapshot() {
    const snapshot = readLocalDesignSnapshots(fileId)[0];

    if (!snapshot) {
      setBackupMessage("No local checkpoint found.");
      window.setTimeout(() => setBackupMessage(null), 1800);
      return;
    }

    editor.remember(editor.document);
    editor.setDocument({
      ...snapshot.document,
      updatedAt: new Date().toISOString(),
    });
    editor.setSelectedLayerIds([]);
    setSelectedCommentId(null);
    setImportReport(null);
    setSaveState("dirty");
    setBackupMessage(`Checkpoint restored: ${snapshot.reason}.`);
    window.setTimeout(() => setBackupMessage(null), 1800);
  }

  function clearLocalSnapshots() {
    clearLocalDesignSnapshots(fileId);
    setLocalSnapshotMetas([]);
    setBackupMessage("Local checkpoints cleared.");
    window.setTimeout(() => setBackupMessage(null), 1800);
  }

  function exportJson() {
    const startedAt = performance.now();
    const document = getScopedExportDocument(
      editor.document,
      editor.selectedLayerIds,
      "page",
    );

    downloadFile(
      `${fileName.toLowerCase().replace(/\s+/g, "-")}.json`,
      "application/json",
      JSON.stringify(document, null, 2),
    );
    recordActivity(
      "export",
      "Exported design JSON",
      fileName,
      fileId,
      createTimedTelemetry("export", "json export", startedAt, {
        detail: fileName,
        itemCount: 1,
      }),
    );
    setSaveState("dirty");
  }

  function exportComponentLibrary() {
    const startedAt = performance.now();
    const manifest = createComponentLibraryManifest(editor.document);

    downloadFile(
      `${manifest.library.name.toLowerCase().replace(/\s+/g, "-")}.library.json`,
      "application/json",
      JSON.stringify(manifest, null, 2),
    );
    recordActivity(
      "library",
      "Exported component library",
      `${manifest.library.name} v${manifest.library.version}`,
      manifest.library.id,
      createTimedTelemetry("export", "component library export", startedAt, {
        detail: manifest.library.name,
        itemCount: manifest.components.length,
      }),
    );
    setSaveState("dirty");
  }

  function exportDesignSystemPackage() {
    const startedAt = performance.now();
    const packageManifest = createDesignSystemPackage(editor.document);

    downloadFile(
      `${packageManifest.library.name.toLowerCase().replace(/\s+/g, "-")}.design-system.json`,
      "application/json",
      JSON.stringify(packageManifest, null, 2),
    );
    recordActivity(
      "library",
      "Exported design system package",
      `${packageManifest.summary.componentCount} components / ${packageManifest.summary.variableCount} variables`,
      packageManifest.library.id,
      createTimedTelemetry("export", "design system export", startedAt, {
        detail: packageManifest.library.name,
        itemCount: packageManifest.summary.componentCount,
      }),
    );
    setSaveState("dirty");
  }

  function exportSvg() {
    const startedAt = performance.now();
    const document = getScopedExportDocument(
      editor.document,
      editor.selectedLayerIds,
      "page",
    );

    downloadFile(
      `${fileName.toLowerCase().replace(/\s+/g, "-")}.svg`,
      "image/svg+xml",
      exportDocumentToSvg(document),
    );
    recordActivity(
      "export",
      "Exported SVG",
      fileName,
      fileId,
      createTimedTelemetry("export", "svg export", startedAt, {
        detail: fileName,
        itemCount: 1,
      }),
    );
    setSaveState("dirty");
  }

  async function exportPng() {
    const startedAt = performance.now();

    try {
      const document = getScopedExportDocument(
        editor.document,
        editor.selectedLayerIds,
        "page",
      );
      const blob = await exportDocumentToPngBlob(document);
      downloadBlob(`${fileName.toLowerCase().replace(/\s+/g, "-")}.png`, blob);
      recordActivity(
        "export",
        "Exported PNG",
        fileName,
        fileId,
        createTimedTelemetry("export", "png export", startedAt, {
          detail: fileName,
          itemCount: 1,
        }),
      );
      setSaveState("dirty");
    } catch (error) {
      recordActivity(
        "export",
        "PNG export failed",
        error instanceof Error ? error.message : "Unknown export error",
        fileId,
        createTimedTelemetry("export", "png export", startedAt, {
          status: "failed",
          detail: fileName,
        }),
      );
      setSaveState("dirty");
      throw error;
    }
  }

  async function exportJpg() {
    const startedAt = performance.now();

    try {
      const document = getScopedExportDocument(
        editor.document,
        editor.selectedLayerIds,
        "page",
      );
      const blob = await exportDocumentToJpegBlob(document);
      downloadBlob(`${fileName.toLowerCase().replace(/\s+/g, "-")}.jpg`, blob);
      recordActivity(
        "export",
        "Exported JPG",
        fileName,
        fileId,
        createTimedTelemetry("export", "jpg export", startedAt, {
          detail: fileName,
          itemCount: 1,
        }),
      );
      setSaveState("dirty");
    } catch (error) {
      recordActivity(
        "export",
        "JPG export failed",
        error instanceof Error ? error.message : "Unknown export error",
        fileId,
        createTimedTelemetry("export", "jpg export", startedAt, {
          status: "failed",
          detail: fileName,
        }),
      );
      setSaveState("dirty");
      throw error;
    }
  }

  async function exportPdf() {
    const startedAt = performance.now();

    try {
      const document = getScopedExportDocument(
        editor.document,
        editor.selectedLayerIds,
        "page",
      );
      const blob = await exportDocumentToPdfBlob(document);
      downloadBlob(`${fileName.toLowerCase().replace(/\s+/g, "-")}.pdf`, blob);
      recordActivity(
        "export",
        "Exported PDF",
        fileName,
        fileId,
        createTimedTelemetry("export", "pdf export", startedAt, {
          detail: fileName,
          itemCount: 1,
        }),
      );
      setSaveState("dirty");
    } catch (error) {
      recordActivity(
        "export",
        "PDF export failed",
        error instanceof Error ? error.message : "Unknown export error",
        fileId,
        createTimedTelemetry("export", "pdf export", startedAt, {
          status: "failed",
          detail: fileName,
        }),
      );
      setSaveState("dirty");
      throw error;
    }
  }

  async function copyJsonToClipboard() {
    const startedAt = performance.now();
    const copied = await copyDesignJsonToClipboard(
      editor.document,
      editor.selectedLayerIds,
    );

    setBackupMessage(copied ? "JSON copied to clipboard." : "Clipboard blocked.");
    window.setTimeout(() => setBackupMessage(null), 1800);
    if (copied) {
      recordActivity(
        "export",
        "Copied design JSON",
        fileName,
        fileId,
        createTimedTelemetry("export", "json clipboard export", startedAt, {
          detail: fileName,
          itemCount: 1,
        }),
      );
      setSaveState("dirty");
    }
  }

  async function copySvgToClipboard() {
    const startedAt = performance.now();
    const copied = await copyDesignSvgToClipboard(
      editor.document,
      editor.selectedLayerIds,
    );

    setBackupMessage(copied ? "SVG copied to clipboard." : "Clipboard blocked.");
    window.setTimeout(() => setBackupMessage(null), 1800);
    if (copied) {
      recordActivity(
        "export",
        "Copied SVG",
        fileName,
        fileId,
        createTimedTelemetry("export", "svg clipboard export", startedAt, {
          detail: fileName,
          itemCount: 1,
        }),
      );
      setSaveState("dirty");
    }
  }

  async function copyPngToClipboard() {
    const startedAt = performance.now();
    const copied = await copyDesignPngToClipboard(
      editor.document,
      editor.selectedLayerIds,
    );

    setBackupMessage(copied ? "PNG copied to clipboard." : "PNG clipboard unsupported.");
    window.setTimeout(() => setBackupMessage(null), 1800);
    if (copied) {
      recordActivity(
        "export",
        "Copied PNG",
        fileName,
        fileId,
        createTimedTelemetry("export", "png clipboard export", startedAt, {
          detail: fileName,
          itemCount: 1,
        }),
      );
      setSaveState("dirty");
    }
  }

  async function pasteFromSystemClipboard() {
    const startedAt = performance.now();

    try {
      const clipboard = await readDesignClipboard();

      if (clipboard.kind === "layers") {
        pasteLayerPayload(clipboard.layers, "Pasted layer payload", startedAt);
        return;
      }

      if (clipboard.kind === "media") {
        await importMediaFiles(clipboard.files, getDefaultImportPoint(view));
        return;
      }

      if (clipboard.kind === "svg") {
        editor.addLayers(clipboard.layers);
        recordActivity(
          "import",
          "Pasted SVG layers",
          `${clipboard.layers.length} editable layers`,
          fileId,
          createTimedTelemetry("import", "paste svg layers", startedAt, {
            itemCount: clipboard.layers.length,
          }),
        );
        setImportReport(null);
        setSaveState("dirty");
        return;
      }

      if (clipboard.kind === "json") {
        editor.remember(editor.document);
        editor.setDocument(clipboard.document);
        editor.setSelectedLayerIds([]);
        setSelectedCommentId(null);
        recordActivity(
          "import",
          "Pasted design JSON",
          "Clipboard",
          fileId,
          createTimedTelemetry("import", "paste design json", startedAt, {
            itemCount: clipboard.document.pages.length,
          }),
        );
        setImportReport(null);
        setSaveState("dirty");
        return;
      }

      if (clipboard.kind === "svg-empty" && clipboard.report) {
        setImportReport({ ...clipboard.report, fileName: "Clipboard SVG" });
        return;
      }

      if (clipboard.kind === "empty" && clipboardLayers.length > 0) {
        pasteLayerPayload(clipboardLayers, "Pasted copied layers", startedAt);
        return;
      }

      setBackupMessage(
        clipboard.kind === "empty"
          ? "Clipboard is empty."
          : "Clipboard does not contain Essence JSON or SVG.",
      );
      window.setTimeout(() => setBackupMessage(null), 1800);
    } catch (error) {
      recordActivity(
        "import",
        "Clipboard import failed",
        error instanceof Error ? error.message : "Unknown import error",
        fileId,
        createTimedTelemetry("import", "clipboard import", startedAt, {
          status: "failed",
        }),
      );
      setSaveState("dirty");
      setImportReport(errorToImportReport(error, "Clipboard import failed."));
    }
  }

  function pasteLayerPayload(
    layers: DesignLayer[],
    label: string,
    startedAt: number,
  ) {
    if (layers.length === 0) {
      return;
    }

    markDirty(() => editor.pasteLayers(layers.map(cloneLayer)));
    recordActivity(
      "import",
      label,
      `${layers.length} layer${layers.length === 1 ? "" : "s"}`,
      fileId,
      createTimedTelemetry("import", "paste layer payload", startedAt, {
        itemCount: layers.length,
      }),
    );
  }

  function saveExportPreset(name: string, settings: ExportSettings) {
    const normalizedName = name.trim();

    if (!normalizedName || settings.formats.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    const existingPreset = savedExportPresets.find(
      (preset) =>
        preset.name.trim().toLowerCase() === normalizedName.toLowerCase(),
    );
    const presetId = existingPreset?.id ?? nanoid();
    const preset = {
      id: presetId,
      name: normalizedName,
      settings: cloneExportSettings(settings),
      createdAt: existingPreset?.createdAt ?? now,
      updatedAt: now,
    };

    markDirtyWithActivity(
      () => {
        editor.remember(editor.document);
        editor.setDocument((current) => ({
          ...current,
          exportPresets: {
            ...(current.exportPresets ?? {}),
            [presetId]: preset,
          },
          updatedAt: now,
        }));
      },
      "export",
      existingPreset ? "Updated export preset" : "Saved export preset",
      `${normalizedName}: ${getExportSettingsSummary(settings)}`,
      presetId,
    );
  }

  function deleteExportPreset(presetId: string) {
    const preset = editor.document.exportPresets?.[presetId];

    if (!preset) {
      return;
    }

    const now = new Date().toISOString();

    markDirtyWithActivity(
      () => {
        editor.remember(editor.document);
        editor.setDocument((current) => {
          const remainingPresets = { ...(current.exportPresets ?? {}) };

          delete remainingPresets[presetId];

          return {
            ...current,
            exportPresets: remainingPresets,
            updatedAt: now,
          };
        });
      },
      "export",
      "Removed export preset",
      preset.name,
      presetId,
    );
  }

  function savePerformanceBaseline(name: string) {
    const snapshot = createPerformanceBaselineSnapshot({
      document: editor.document,
      activePage: editor.activePage,
      name,
    });

    markDirtyWithActivity(
      () => {
        editor.remember(editor.document);
        editor.setDocument((current) => ({
          ...current,
          performanceBaselines: getNextPerformanceBaselines(
            current.performanceBaselines,
            snapshot,
          ),
          updatedAt: new Date().toISOString(),
        }));
      },
      "extension",
      "Saved performance baseline",
      `${snapshot.name}: ${snapshot.metrics.documentLayerCount} layers / render ${snapshot.metrics.activeRenderCost}`,
      snapshot.id,
    );
  }

  function deletePerformanceBaseline(baselineId: string) {
    const baseline = editor.document.performanceBaselines?.find(
      (item) => item.id === baselineId,
    );

    if (!baseline) {
      return;
    }

    markDirtyWithActivity(
      () => {
        editor.remember(editor.document);
        editor.setDocument((current) => ({
          ...current,
          performanceBaselines: removePerformanceBaseline(
            current.performanceBaselines,
            baselineId,
          ),
          updatedAt: new Date().toISOString(),
        }));
      },
      "extension",
      "Removed performance baseline",
      baseline.name,
      baselineId,
    );
  }

  async function exportBatch(settings: ExportSettings) {
    const startedAt = performance.now();

    setIsExporting(true);

    try {
      const document = getScopedExportDocument(
        editor.document,
        editor.selectedLayerIds,
        settings.scope,
      );
      const exportName = getExportName(fileName, settings.scope);
      const scaleSuffix = settings.scale > 1 ? `@${settings.scale}x` : "";
      const manifest = createExportManifest({
        document,
        exportName,
        fileName,
        selectedLayerIds: editor.selectedLayerIds,
        settings,
      });

      for (const format of settings.formats) {
        if (format === "json") {
          downloadFile(
            `${exportName}.json`,
            "application/json",
            JSON.stringify(document, null, 2),
          );
        }

        if (format === "svg") {
          downloadFile(
            `${exportName}.svg`,
            "image/svg+xml",
            exportDocumentToSvg(document),
          );
        }

        if (format === "png") {
          downloadBlob(
            `${exportName}${scaleSuffix}.png`,
            await exportDocumentToPngBlob(document, settings.scale),
          );
        }

        if (format === "jpg") {
          downloadBlob(
            `${exportName}${scaleSuffix}.jpg`,
            await exportDocumentToJpegBlob(document, settings.scale),
          );
        }

        if (format === "pdf") {
          downloadBlob(
            `${exportName}${scaleSuffix}.pdf`,
            await exportDocumentToPdfBlob(document, settings.scale),
          );
        }
      }

      if (settings.includeManifest) {
        downloadFile(
          `${exportName}-export-manifest.json`,
          "application/json",
          JSON.stringify(manifest, null, 2),
        );
      }

      recordActivity(
        "export",
        "Ran batch export",
        `${getExportFileEntries(exportName, settings).length} files / ${settings.formats.join(", ")} at ${settings.scale}x`,
        fileId,
        createTimedTelemetry("export", "batch export", startedAt, {
          detail: getExportSettingsSummary(settings),
          itemCount: getExportFileEntries(exportName, settings).length,
        }),
      );
      setSaveState("dirty");
      setExportDialogOpen(false);
    } catch (error) {
      recordActivity(
        "export",
        "Batch export failed",
        error instanceof Error ? error.message : "Unknown export error",
        fileId,
        createTimedTelemetry("export", "batch export", startedAt, {
          status: "failed",
          detail: getExportSettingsSummary(settings),
          itemCount: settings.formats.length,
        }),
      );
      setSaveState("dirty");
      throw error;
    } finally {
      setIsExporting(false);
    }
  }

  async function importSvg(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    const startedAt = performance.now();

    try {
      assertImportKind(file, ["svg"], "SVG");
      const svg = await file.text();
      const layers = importSvgLayers(svg);

      if (layers.length === 0) {
        const report = getSvgImportDiagnostic(svg, layers.length);

        if (report) {
          setImportReport({ ...report, fileName: file.name });
          return;
        }
      }

      editor.addLayers(layers);
      recordActivity(
        "import",
        "Imported SVG layers",
        `${file.name}: ${layers.length} editable layers`,
        fileId,
        createTimedTelemetry("import", "svg import", startedAt, {
          detail: file.name,
          itemCount: layers.length,
        }),
      );
      setImportReport(null);
      setSaveState("dirty");
    } catch (error) {
      recordActivity(
        "import",
        "SVG import failed",
        error instanceof Error ? error.message : "Unknown import error",
        fileId,
        createTimedTelemetry("import", "svg import", startedAt, {
          status: "failed",
          detail: file.name,
        }),
      );
      setSaveState("dirty");
      setImportReport(errorToImportReport(error, "SVG import failed.", file));
    }
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    const startedAt = performance.now();

    try {
      assertImportKind(file, ["json"], "JSON");
      const json = await file.text();
      const exportManifestReport = getExportManifestImportDiagnostic(
        json,
        file.name,
      );

      if (exportManifestReport) {
        setImportReport(exportManifestReport);
        return;
      }

      const document = importDesignDocumentJson(json);
      editor.remember(editor.document);
      editor.setDocument(document);
      editor.setSelectedLayerIds([]);
      setSelectedCommentId(null);
      recordActivity(
        "import",
        "Imported design JSON",
        file.name,
        fileId,
        createTimedTelemetry("import", "design json import", startedAt, {
          detail: file.name,
          itemCount: document.pages.length,
        }),
      );
      setImportReport(null);
      setSaveState("dirty");
    } catch (error) {
      recordActivity(
        "import",
        "Design JSON import failed",
        error instanceof Error ? error.message : "Unknown import error",
        fileId,
        createTimedTelemetry("import", "design json import", startedAt, {
          status: "failed",
          detail: file.name,
        }),
      );
      setSaveState("dirty");
      setImportReport(
        errorToImportReport(error, "Could not import design JSON.", file),
      );
    }
  }

  async function importComponentLibrary(file: File) {
    const startedAt = performance.now();

    try {
      const manifest = parseComponentLibraryManifest(await file.text());

      editor.subscribeComponentLibrary(manifest);
      recordActivity(
        "library",
        "Imported component library",
        `${manifest.library.name} from ${manifest.library.teamName}`,
        manifest.library.id,
        createTimedTelemetry("import", "component library import", startedAt, {
          detail: manifest.library.name,
          itemCount: manifest.components.length,
        }),
      );
      setImportReport(null);
      setSaveState("dirty");
    } catch (error) {
      recordActivity(
        "import",
        "Component library import failed",
        error instanceof Error ? error.message : "Unknown import error",
        fileId,
        createTimedTelemetry("import", "component library import", startedAt, {
          status: "failed",
          detail: file.name,
        }),
      );
      setSaveState("dirty");
      setImportReport(
        errorToImportReport(error, "Could not import component library.", file),
      );
    }
  }

  async function importPdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    const startedAt = performance.now();

    recordActivity(
      "import",
      "PDF import unsupported",
      file.name,
      fileId,
      createTimedTelemetry("import", "pdf import", startedAt, {
        status: "failed",
        detail: file.name,
      }),
    );
    setSaveState("dirty");
    setImportReport(unsupportedPdfImportReport(file));
  }

  async function importMedia(
    event: ChangeEvent<HTMLInputElement> | FormEvent<HTMLInputElement>,
  ) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    const signature = getMediaInputSignature(files);

    if (!signature) {
      input.value = "";
      return;
    }

    if (lastMediaInputSignatureRef.current === signature) {
      input.value = "";
      return;
    }

    lastMediaInputSignatureRef.current = signature;
    input.value = "";

    await importMediaFiles(files, getDefaultImportPoint(view));
    window.setTimeout(() => {
      if (lastMediaInputSignatureRef.current === signature) {
        lastMediaInputSignatureRef.current = null;
      }
    }, 0);
  }

  async function importMediaFiles(
    files: File[],
    point: { x: number; y: number },
  ) {
    if (files.length === 0) {
      return;
    }

    const startedAt = performance.now();

    try {
      const layers = await Promise.all(
        files.map((file, index) =>
          importMediaFile(file, {
            x: point.x + index * 28,
            y: point.y + index * 28,
          }),
        ),
      );

      editor.addLayers(layers);
      const videoCount = layers.filter((layer) =>
        layer.assetMetadata?.mimeType?.startsWith("video/"),
      ).length;
      const imageCount = layers.length - videoCount;
      recordActivity(
        "import",
        "Imported media layers",
        getImportedMediaSummary(imageCount, videoCount),
        fileId,
        createTimedTelemetry("import", "media import", startedAt, {
          itemCount: files.length,
        }),
      );
      setImportReport(null);
      setSaveState("dirty");
    } catch (error) {
      recordActivity(
        "import",
        "Media import failed",
        error instanceof Error ? error.message : "Unknown import error",
        fileId,
        createTimedTelemetry("import", "media import", startedAt, {
          status: "failed",
          itemCount: files.length,
        }),
      );
      setSaveState("dirty");
      setImportReport(errorToImportReport(error, "Media import failed."));
    }
  }

  function copySelectedLayers() {
    if (editor.selectedLayers.length === 0) {
      return;
    }

    const layers = editor.selectedLayers.map(cloneLayer);
    setClipboardLayers(layers);
    void writeLayerClipboard(layers);
  }

  function cutSelectedLayers() {
    if (editor.selectedLayers.length === 0) {
      return;
    }

    copySelectedLayers();
    markDirty(editor.deleteSelectedLayer);
  }

  function insertComponent(componentId: string, variantId?: string) {
    const component = editor.document.components[componentId];
    const variant = component?.variants?.find((item) => item.id === variantId);

    editor.insertComponentInstance(
      componentId,
      getDefaultImportPoint(view),
      variantId,
    );
    recordActivity(
      "component",
      "Inserted component instance",
      variant ? `${component?.name} / ${variant.name}` : component?.name,
      componentId,
    );
    setSaveState("dirty");
  }

  function fitActivePageToView() {
    const nextView = fitLayersToViewport(
      editor.activePage.layers,
      canvasViewportSize,
      PAGE_FIT_OPTIONS,
    );

    if (nextView) {
      setView(nextView);
    }
  }

  function fitSelectionToView() {
    const nextView = fitLayersToViewport(
      editor.selectedLayers,
      canvasViewportSize,
      SELECTION_FIT_OPTIONS,
    );

    if (nextView) {
      setView(nextView);
    }
  }

  function setCanvasZoom(zoom: number) {
    setView((current) => ({ ...current, zoom }));
  }

  function updateActivePageGrid(patch: Partial<ReturnType<typeof getPageGrid>>) {
    markDirty(() =>
      editor.updateActivePage({
        grid: {
          ...getPageGrid(editor.activePage),
          ...patch,
        },
      }),
    );
  }

  function downloadFile(name: string, type: string, content: string) {
    const blob = new Blob([content], { type });
    downloadBlob(name, blob);
  }

  function downloadBlob(name: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  const activePageGrid = getPageGrid(editor.activePage);
  const zoomPercent = Math.round(view.zoom * 100);

  return (
    <main className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="hidden h-12 shrink-0 items-center gap-2 border-b border-border bg-card/95 px-2 lg:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="font-mono text-xs font-bold">EF</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{fileName}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{editor.activePage.name}</span>
              <Badge variant="secondary" className="h-5 rounded-sm px-1.5">
                {saveState}
              </Badge>
              {importReport ? (
                <span className="truncate text-destructive">
                  {getImportReportSummary(importReport)}
                </span>
              ) : null}
              {backupMessage ? (
                <span className="truncate text-emerald-400">{backupMessage}</span>
              ) : null}
              {localBackupMeta ? (
                <span className="truncate">
                  Backup {formatBackupTime(localBackupMeta.savedAt)}
                </span>
              ) : null}
              {localSnapshotMetas.length > 0 ? (
                <span className="truncate">
                  {localSnapshotMetas.length} local checkpoints
                </span>
              ) : null}
              {offlineSaveQueueReport.retryableCount > 0 ? (
                <span className="truncate text-amber-300">
                  {offlineSaveQueueReport.retryableCount} queued save
                  {offlineSaveQueueReport.retryableCount === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex max-w-full min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto lg:flex-none lg:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="secondary">
                <Download className="size-4" />
                File
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={save} disabled={isPending}>
                <Save className="size-4" />
                Save now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOfflineQueueOpen(true)}>
                Save queue
                {offlineSaveQueueReport.retryableCount > 0 ? (
                  <Badge className="ml-auto h-5 min-w-5 justify-center rounded-sm px-1 text-[10px]">
                    {offlineSaveQueueReport.retryableCount}
                  </Badge>
                ) : null}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Import</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  <DropdownMenuItem onClick={() => jsonInputRef.current?.click()}>
                    JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => svgInputRef.current?.click()}>
                    SVG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => mediaInputRef.current?.click()}>
                    Image or video
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => pdfInputRef.current?.click()}>
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Copy</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  <DropdownMenuItem onClick={() => void pasteFromSystemClipboard()}>
                    Paste clipboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void copyJsonToClipboard()}>
                    JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void copySvgToClipboard()}>
                    SVG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void copyPngToClipboard()}>
                    PNG
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Local history</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-52">
                  <DropdownMenuItem onClick={saveLocalBackupNow}>
                    Save backup
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={saveLocalSnapshotNow}>
                    Save checkpoint
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={!localBackupMeta}
                    onClick={restoreLocalBackup}
                  >
                    Restore backup
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={localSnapshotMetas.length === 0}
                    onClick={restoreLatestLocalSnapshot}
                  >
                    Restore checkpoint
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={!localBackupMeta}
                    onClick={clearLocalBackup}
                  >
                    Clear backup
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={localSnapshotMetas.length === 0}
                    onClick={clearLocalSnapshots}
                  >
                    Clear checkpoints
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Export</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
                    Export settings...
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportJson}>JSON</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportSvg}>SVG</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportPng}>PNG</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportJpg}>JPG</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportPdf}>PDF</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Search className="size-4" />
            Actions
          </Button>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={importJson}
          />
          <input
            ref={svgInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="hidden"
            onChange={importSvg}
          />
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov,.m4v"
            multiple
            className="hidden"
            onInput={importMedia}
            onChange={importMedia}
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={importPdf}
          />
          <ExportSettingsDialog
            open={exportDialogOpen}
            hasSelection={editor.selectedLayerIds.length > 0}
            isExporting={isExporting}
            savedPresets={savedExportPresets}
            onOpenChange={setExportDialogOpen}
            onDeletePreset={deleteExportPreset}
            onExport={(settings) => {
              void exportBatch(settings);
            }}
            onSavePreset={saveExportPreset}
          />
          <OfflineMutationQueueDialog
            open={offlineQueueOpen}
            fileName={fileName}
            online={isBrowserOnline}
            report={offlineSaveQueueReport}
            activeMutationId={activeOfflineMutationId}
            onOpenChange={setOfflineQueueOpen}
            onRetryLatest={retryLatestOfflineSave}
            onRetryMutation={(entryId) => void retryOfflineSave(entryId)}
            onRestoreMutation={restoreOfflineSaveSnapshot}
            onRemoveMutation={removeOfflineSave}
            onClearSynced={clearSyncedOfflineSaves}
            onExportEvidence={exportOfflineSaveQueueEvidence}
          />
          <CommandPalette
            open={commandPaletteOpen}
            commands={commandPaletteCommands}
            onOpenChange={setCommandPaletteOpen}
          />
          <VersionHistoryMenu
            fileId={fileId}
            document={editor.document}
            currentUser={user}
            versions={versions}
            onRecordActivity={(label, detail) =>
              recordActivity("version", label, detail, fileId)
            }
            onMergeVersion={(document, version) => {
              editor.remember(editor.document);
              editor.setDocument(document);
              editor.setSelectedLayerIds([]);
              setSelectedCommentId(null);
              recordActivity(
                "version",
                "Merged named version",
                version.name,
                version.id,
              );
              setSaveState("dirty");
            }}
          />
        </div>
      </header>

      {importReport ? (
        <ImportDiagnosticsPanel
          report={importReport}
          onDismiss={() => setImportReport(null)}
        />
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(7rem,18dvh)_minmax(0,1fr)_minmax(10rem,28dvh)] md:grid-cols-[minmax(13rem,17rem)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_minmax(11rem,30dvh)] lg:grid-cols-[minmax(0,clamp(220px,18vw,280px))_minmax(0,1fr)_minmax(0,clamp(260px,22vw,340px))] lg:grid-rows-1">
        <WorkspaceSidebar
          className="md:col-start-1 md:row-span-2 md:row-start-1 lg:col-start-1 lg:row-span-1 lg:row-start-1"
          activeFileId={fileId}
          files={files}
          versions={versions}
          document={editor.document}
          collaborationPresence={{
            followedPeerId,
            peers: presence.peers,
            presenceEvents: presence.presenceEvents,
            selfId: presence.selfId,
            spotlight: presence.spotlight,
            view,
          }}
          pages={editor.pages}
          activePageId={editor.document.activePageId}
          layers={editor.activePage.layers}
          components={editor.components}
          libraryMetadata={editor.document.libraryMetadata}
          libraryStatus={libraryStatus}
          pendingLibraryComponentUpdates={
            editor.document.pendingLibraryComponentUpdates ?? {}
          }
          comments={editor.comments}
          mentionKeys={mentionKeys}
          currentUserName={user.name || user.email}
          currentUserEmail={user.email}
          notificationPreferences={notificationPreferences}
          notificationDeliveries={editor.document.notificationDeliveries ?? []}
          selectedCommentId={selectedCommentId}
          canCreateVariant={editor.selectedLayerIds.length > 0}
          toolShortcuts={toolShortcuts}
          commandPaletteCommands={commandPaletteCommands}
          pluginGrants={pluginGrants}
          pluginApprovals={pluginApprovals}
          pluginRunHistory={pluginRunHistory}
          activityEvents={editor.document.activityEvents ?? []}
          selectedLayerId={editor.selectedLayerId}
          selectedLayerIds={editor.selectedLayerIds}
          onSelectPage={(pageId) => {
            editor.setActivePage(pageId);
            setSaveState("dirty");
          }}
          onRenamePage={(pageId, name) => {
            editor.updatePage(pageId, { name });
            recordActivity("page", "Renamed page", name, pageId);
            setSaveState("dirty");
          }}
          onMovePage={(pageId, direction) => {
            editor.reorderPage(pageId, direction);
            recordActivity(
              "page",
              "Reordered page",
              direction === "up" ? "Moved up" : "Moved down",
              pageId,
            );
            setSaveState("dirty");
          }}
          onAddPage={() => {
            editor.addPage();
            recordActivity("page", "Added page", fileName, fileId);
            setSaveState("dirty");
          }}
          onDuplicatePage={() => {
            const pageName = editor.activePage.name;
            editor.duplicateActivePage();
            recordActivity("page", "Duplicated page", pageName, editor.activePage.id);
            setSaveState("dirty");
          }}
          onDeletePage={() => {
            const pageName = editor.activePage.name;
            const pageId = editor.activePage.id;
            editor.deleteActivePage();
            recordActivity("page", "Deleted page", pageName, pageId);
            setSaveState("dirty");
          }}
          onSelectLayer={editor.setSelectedLayerId}
          onSelectLayers={editor.setSelectedLayerIds}
          onUpdateLayer={(layerId, patch) => {
            editor.updateLayer(layerId, patch);
            setSaveState("dirty");
          }}
          onUpdateToolShortcut={updateToolShortcut}
          onReplaceToolShortcuts={replaceToolShortcuts}
          onReplacePluginGrants={replacePluginGrants}
          onApprovePlugin={approvePlugin}
          onRecordPluginRun={recordPluginRun}
          onReplayPluginApprovals={replayWorkspacePluginApprovals}
          onUpdateLayers={(patches) => {
            editor.updateLayers(patches);
            setSaveState("dirty");
          }}
          onUpdateLibraryMetadata={(patch) => {
            editor.updateLibraryMetadata(patch);
            recordActivity(
              "library",
              "Updated library metadata",
              [patch.name, patch.teamName].filter(Boolean).join(" / "),
            );
            setSaveState("dirty");
          }}
          onPublishLibrary={() => {
            editor.publishComponentLibrary();
            recordActivity("library", "Published component library", fileName, fileId);
            setSaveState("dirty");
          }}
          onExportLibrary={exportComponentLibrary}
          onExportDesignSystemPackage={exportDesignSystemPackage}
          onImportLibrary={(file) => {
            void importComponentLibrary(file);
          }}
          onAcceptLibraryUpdate={(componentId) => {
            const component = editor.document.pendingLibraryComponentUpdates?.[
              componentId
            ];
            const review = component
              ? getComponentLibraryUpdateReview(
                  editor.document.components[componentId],
                  component,
                )
              : null;
            editor.acceptLibraryComponentUpdate(componentId);
            recordActivity(
              "library",
              "Accepted library component update",
              review
                ? `${component?.name}: ${formatComponentUpdateReview(review)}`
                : component?.name,
              componentId,
            );
            setSaveState("dirty");
          }}
          onDetachLibraryComponent={(componentId) => {
            const component = editor.document.components[componentId];
            editor.detachLibraryComponent(componentId);
            recordActivity(
              "library",
              "Detached library component",
              component?.name,
              componentId,
            );
            setSaveState("dirty");
          }}
          onInsertComponent={(componentId, variantId) => {
            insertComponent(componentId, variantId);
          }}
          onCreateVariant={(componentId) => {
            const component = editor.document.components[componentId];
            editor.createComponentVariantFromSelection(componentId);
            recordActivity(
              "component",
              "Created component variant",
              component?.name,
              componentId,
            );
            setSaveState("dirty");
          }}
          onRenameComponent={(componentId, name) => {
            if (!name.trim()) {
              return;
            }

            editor.renameComponent(componentId, name);
            recordActivity("component", "Renamed component", name, componentId);
            setSaveState("dirty");
          }}
          onRenameVariant={(componentId, variantId, name) => {
            if (!name.trim()) {
              return;
            }

            editor.renameComponentVariant(componentId, variantId, name);
            recordActivity(
              "component",
              "Renamed component variant",
              name,
              variantId,
            );
            setSaveState("dirty");
          }}
          onAddPropertyDefinition={(componentId, type) => {
            const component = editor.document.components[componentId];
            editor.addComponentPropertyDefinition(componentId, type);
            recordActivity(
              "component",
              "Added component property",
              `${component?.name ?? "Component"} / ${type}`,
              componentId,
            );
            setSaveState("dirty");
          }}
          onUpdatePropertyDefinition={(componentId, definitionId, patch) => {
            const component = editor.document.components[componentId];
            editor.updateComponentPropertyDefinition(
              componentId,
              definitionId,
              patch,
            );
            recordActivity(
              "component",
              "Updated component property",
              component?.name,
              definitionId,
            );
            setSaveState("dirty");
          }}
          onDeletePropertyDefinition={(componentId, definitionId) => {
            const component = editor.document.components[componentId];
            editor.deleteComponentPropertyDefinition(componentId, definitionId);
            recordActivity(
              "component",
              "Deleted component property",
              component?.name,
              definitionId,
            );
            setSaveState("dirty");
          }}
          onUpdateSlot={(componentId, sourceLayerId, patch) => {
            const component = editor.document.components[componentId];
            editor.updateComponentSlot(componentId, sourceLayerId, patch);
            recordActivity(
              "component",
              "Updated component slot",
              component?.name,
              sourceLayerId,
            );
            setSaveState("dirty");
          }}
          onDeleteComponent={(componentId) => {
            const component = editor.document.components[componentId];
            editor.deleteComponent(componentId);
            recordActivity(
              "component",
              "Deleted component",
              component?.name,
              componentId,
            );
            setSaveState("dirty");
          }}
          onDeleteVariant={(componentId, variantId) => {
            const variant = editor.document.components[
              componentId
            ]?.variants?.find((item) => item.id === variantId);
            editor.deleteComponentVariant(componentId, variantId);
            recordActivity(
              "component",
              "Deleted component variant",
              variant?.name,
              variantId,
            );
            setSaveState("dirty");
          }}
          onRepairComponentReferences={(patches) => {
            if (patches.length === 0) {
              return;
            }

            editor.updateLayers(patches);
            recordActivity(
              "component",
              "Repaired component references",
              `${patches.length} active-page layer${
                patches.length === 1 ? "" : "s"
              }`,
            );
            setSaveState("dirty");
          }}
          onResetComponentInstance={(layerId) => {
            editor.resetComponentInstance(layerId);
            recordActivity(
              "component",
              "Reset component instance",
              "Applied override review reset",
              layerId,
            );
            setSaveState("dirty");
          }}
          onBindMatchingComponentVariables={(matchCount) => {
            if (matchCount === 0) {
              return;
            }

            editor.bindMatchingComponentVariables();
            recordActivity(
              "component",
              "Bound matching component variables",
              `${matchCount} source propert${matchCount === 1 ? "y" : "ies"}`,
            );
            setSaveState("dirty");
          }}
          onRemoveStaleComponentVariableBindings={(issueCount) => {
            if (issueCount === 0) {
              return;
            }

            editor.removeStaleComponentVariableBindings();
            recordActivity(
              "component",
              "Removed stale component variable bindings",
              `${issueCount} stale binding${issueCount === 1 ? "" : "s"}`,
            );
            setSaveState("dirty");
          }}
          onUpdateComment={(commentId, patch) => {
            editor.updateComment(commentId, patch, {
              actorEmail: user.email,
              actorName: user.name || user.email,
            });
            if (patch.resolved !== undefined) {
              recordActivity(
                "comment",
                patch.resolved ? "Resolved comment" : "Reopened comment",
                editor.comments.find((comment) => comment.id === commentId)
                  ?.text,
                commentId,
              );
            }
            if (patch.dueDate !== undefined) {
              recordActivity(
                "comment",
                patch.dueDate ? "Set comment due date" : "Cleared comment due date",
                patch.dueDate ?? undefined,
                commentId,
              );
            }
            setSaveState("dirty");
          }}
          onUpdateComments={(commentIds, patch) => {
            editor.updateComments(commentIds, patch, {
              actorEmail: user.email,
              actorName: user.name || user.email,
            });
            if (patch.resolved !== undefined) {
              recordActivity(
                "comment",
                patch.resolved
                  ? "Bulk resolved comments"
                  : "Bulk reopened comments",
                `${commentIds.length} comment${
                  commentIds.length === 1 ? "" : "s"
                }`,
              );
            }
            if (patch.assigneeName !== undefined || patch.assigneeEmail !== undefined) {
              recordActivity(
                "comment",
                "Bulk assigned review comments",
                `${commentIds.length} comment${
                  commentIds.length === 1 ? "" : "s"
                } assigned to ${patch.assigneeName || patch.assigneeEmail || "Reviewer"}`,
              );
            }
            if (patch.dueDate !== undefined) {
              recordActivity(
                "comment",
                patch.dueDate
                  ? "Bulk set review due date"
                  : "Bulk cleared review due date",
                `${commentIds.length} comment${
                  commentIds.length === 1 ? "" : "s"
                }`,
              );
            }
            setSaveState("dirty");
          }}
          onSetPrototypeStartPage={(pageId) => {
            for (const page of editor.pages) {
              editor.updatePage(page.id, {
                prototypeStart: page.id === pageId,
              });
            }
            recordActivity("extension", "Set prototype start page", undefined, pageId);
            setSaveState("dirty");
          }}
          onSavePerformanceBaseline={savePerformanceBaseline}
          onRemovePerformanceBaseline={deletePerformanceBaseline}
          onUpdateVariableSystem={(patch, applyBindings) => {
            editor.updateVariableSystem(patch, applyBindings);
            recordActivity(
              "extension",
              "Updated variable governance",
              "Applied token mode or alias maintenance",
              fileId,
            );
            setSaveState("dirty");
          }}
          onRemoveComment={(commentId) => {
            const comment = editor.comments.find((item) => item.id === commentId);
            editor.removeComment(commentId);
            recordActivity("comment", "Deleted comment", comment?.text, commentId);
            setSaveState("dirty");
          }}
          onToggleCommentReaction={(commentId, kind) => {
            editor.toggleCommentReaction(
              commentId,
              kind,
              user.name || user.email,
              user.email,
            );
            recordActivity("comment", "Updated comment reaction", kind, commentId);
            setSaveState("dirty");
          }}
          onAssignComment={(commentId) => {
            editor.assignComment(commentId, user.name || user.email, user.email);
            recordActivity(
              "comment",
              "Assigned comment",
              user.name || user.email,
              commentId,
            );
            setSaveState("dirty");
          }}
          onClearCommentAssignment={(commentId) => {
            editor.clearCommentAssignment(commentId);
            recordActivity("comment", "Cleared comment assignment", undefined, commentId);
            setSaveState("dirty");
          }}
          onSelectComment={focusComment}
          onAddCommentReply={(commentId, text) => {
            editor.addCommentReply(commentId, text, user.name || user.email);
            recordActivity("comment", "Replied to comment", text, commentId);
            setSaveState("dirty");
          }}
          onUpdateCommentReply={(commentId, replyId, text) => {
            editor.updateCommentReply(commentId, replyId, text);
            setSaveState("dirty");
          }}
          onRemoveCommentReply={(commentId, replyId) => {
            editor.removeCommentReply(commentId, replyId);
            recordActivity("comment", "Deleted comment reply", undefined, replyId);
            setSaveState("dirty");
          }}
          onUpdateNotificationPreferences={(patch) => {
            markDirtyWithActivity(
              () => {
                editor.remember(editor.document);
                editor.setDocument(
                  updateCommentNotificationPreferences(editor.document, patch),
                );
              },
              "comment",
              "Updated notification preferences",
              undefined,
              fileId,
            );
          }}
          onClearActivity={() => {
            editor.clearActivity();
            setSaveState("dirty");
          }}
          onRecordExtensionActivity={(label, detail) =>
            recordActivity("extension", label, detail, fileId)
          }
        />
        <div className="relative min-h-0 overflow-hidden md:col-start-2 md:row-start-1 lg:col-start-2 lg:row-start-1">
          <EditorCanvas
            document={editor.document}
            page={editor.activePage}
            tool={tool}
            view={view}
            guides={editor.guides}
            selectedLayerId={editor.selectedLayerId}
            selectedLayerIds={editor.selectedLayerIds}
            selectedCommentId={selectedCommentId}
            onToolChange={setTool}
            onViewChange={setView}
            onViewportSizeChange={setCanvasViewportSize}
            onSelectLayer={editor.setSelectedLayerId}
            onSelectLayers={editor.setSelectedLayerIds}
            onSelectComment={focusComment}
            onUpdateComment={(commentId, patch) => {
              editor.updateCommentTransient(commentId, patch);
              setSaveState("dirty");
            }}
            onAddLayer={(layer) => {
              runCanvasCommand(
                () => editor.addLayer(layer),
                "Added layer",
                layer.name,
                layer.id,
                1,
              );
            }}
            onAddLayers={(layers) => {
              runCanvasCommand(
                () => editor.addLayers(layers),
                "Added layers",
                `${layers.length} layer${layers.length === 1 ? "" : "s"}`,
                fileId,
                layers.length,
              );
            }}
            onImportMediaFiles={(files, point) => {
              void importMediaFiles(files, point);
            }}
            onAddComment={(comment) => {
              const startedAt = performance.now();

              editor.addComment(comment);
              setSelectedCommentId(comment.id);
              recordActivity(
                "comment",
                "Added comment",
                comment.text,
                comment.id,
                createTimedTelemetry("canvas", "Added comment", startedAt, {
                  detail: comment.text,
                  itemCount: 1,
                }),
              );
              setSaveState("dirty");
            }}
            onAddGuide={(orientation, position) => {
              runCanvasCommand(
                () => editor.addGuide(orientation, position),
                "Added guide",
                `${orientation} at ${Math.round(position)}`,
                fileId,
                1,
              );
            }}
            onUpdateGuide={(guideId, position) => {
              editor.updateGuideTransient(guideId, position);
              setSaveState("dirty");
            }}
            onRemoveGuide={(guideId) => {
              runCanvasCommand(
                () => editor.removeGuide(guideId),
                "Removed guide",
                undefined,
                guideId,
                1,
              );
            }}
            onRemember={editor.remember}
            onUpdateLayer={(id, patch) => {
              editor.updateLayerTransient(id, patch);
              setSaveState("dirty");
            }}
            onUpdateLayers={(patches) => {
              editor.updateLayersTransient(patches);
              setSaveState("dirty");
            }}
            onDuplicateLayers={(layerIds) => {
              runCanvasCommand(
                () => editor.duplicateLayers(layerIds),
                "Duplicated layers",
                `${layerIds.length} layer${layerIds.length === 1 ? "" : "s"}`,
                fileId,
                layerIds.length,
              );
            }}
            onReplaceLayers={(layerIds, replacementLayers) => {
              runCanvasCommand(
                () => editor.replaceLayers(layerIds, replacementLayers),
                "Replaced layers",
                `${replacementLayers.length} layer${
                  replacementLayers.length === 1 ? "" : "s"
                }`,
                fileId,
                replacementLayers.length,
              );
            }}
            onReorderLayer={(layerId, direction) => {
              runCanvasCommand(
                () => editor.reorderLayer(layerId, direction),
                "Reordered layer",
                direction,
                layerId,
                1,
              );
            }}
            onDeleteLayers={(layerIds) => {
              runCanvasCommand(
                () => editor.deleteLayers(layerIds),
                "Deleted layers",
                `${layerIds.length} layer${layerIds.length === 1 ? "" : "s"}`,
                fileId,
                layerIds.length,
              );
            }}
            presencePeers={presence.peers}
            onPresenceCursorMove={presence.publishCursor}
          />
          <EditorToolbar
            tool={tool}
            onToolChange={setTool}
            canUndo={editor.canUndo}
            canRedo={editor.canRedo}
            onUndo={editor.undo}
            onRedo={editor.redo}
            canPaste={true}
            hasSelection={editor.selectedLayerIds.length > 0}
            onCopy={copySelectedLayers}
            onCut={cutSelectedLayers}
            onPaste={() => void pasteFromSystemClipboard()}
            canAlign={editor.selectedLayerIds.length > 1}
            onAlign={(alignment: LayerAlignment) =>
              markDirty(() => editor.alignSelectedLayers(alignment))
            }
            canDistribute={editor.selectedLayerIds.length > 2}
            onDistribute={(distribution: LayerDistribution) =>
              markDirty(() => editor.distributeSelectedLayers(distribution))
            }
            canGroup={editor.selectedLayerIds.length > 1}
            canUngroup={editor.selectedLayers.some((layer) => layer.groupId)}
            canCreateComponent={editor.selectedLayerIds.length > 0}
            onGroup={() =>
              markDirtyWithActivity(
                editor.groupSelectedLayers,
                "page",
                "Grouped layers",
                `${editor.selectedLayerIds.length} selected layers`,
              )
            }
            onUngroup={() =>
              markDirtyWithActivity(
                editor.ungroupSelectedLayers,
                "page",
                "Ungrouped layers",
                `${editor.selectedLayerIds.length} selected layers`,
              )
            }
            onCreateComponent={() =>
              markDirtyWithActivity(
                editor.createComponentFromSelection,
                "component",
                "Created component from selection",
                `${editor.selectedLayerIds.length} selected layer${
                  editor.selectedLayerIds.length === 1 ? "" : "s"
                }`,
              )
            }
            onDelete={() =>
              markDirtyWithActivity(
                editor.deleteSelectedLayer,
                "page",
                "Deleted selected layers",
                `${editor.selectedLayerIds.length} selected layer${
                  editor.selectedLayerIds.length === 1 ? "" : "s"
                }`,
              )
            }
            onDuplicate={() =>
              markDirtyWithActivity(
                editor.duplicateSelectedLayer,
                "page",
                "Duplicated selected layers",
                `${editor.selectedLayerIds.length} selected layer${
                  editor.selectedLayerIds.length === 1 ? "" : "s"
                }`,
              )
            }
            onBringForward={() =>
              markDirtyWithActivity(
                () => editor.reorderSelectedLayer("forward"),
                "page",
                "Brought layer forward",
              )
            }
            onSendBackward={() =>
              markDirtyWithActivity(
                () => editor.reorderSelectedLayer("backward"),
                "page",
                "Sent layer backward",
              )
            }
            onBringToFront={() =>
              markDirtyWithActivity(
                () => editor.reorderSelectedLayer("front"),
                "page",
                "Brought layer to front",
              )
            }
            onSendToBack={() =>
              markDirtyWithActivity(
                () => editor.reorderSelectedLayer("back"),
                "page",
                "Sent layer to back",
              )
            }
          />
          <div className="pointer-events-none absolute bottom-16 right-3 z-40 rounded-lg border border-border bg-card/95 p-1 shadow-lg backdrop-blur">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="pointer-events-auto h-8 min-w-20 px-2 font-mono text-xs"
                >
                  {zoomPercent}% View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56">
                <DropdownMenuItem onClick={() => setView((current) => zoomView(current, -0.1))}>
                  Zoom out
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView((current) => zoomView(current, 0.1))}>
                  Zoom in
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Zoom presets</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-36">
                    <DropdownMenuItem onClick={() => setCanvasZoom(0.5)}>
                      50%
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCanvasZoom(1)}>
                      100%
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCanvasZoom(2)}>
                      200%
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Fit</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-44">
                    <DropdownMenuItem onClick={fitActivePageToView}>
                      Fit page
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={editor.selectedLayerIds.length === 0}
                      onClick={fitSelectionToView}
                    >
                      Fit selection
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={fitActivePageToView}>
                      Center page
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Grid and snap</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-52">
                    <DropdownMenuItem
                      onClick={() =>
                        updateActivePageGrid({ visible: !activePageGrid.visible })
                      }
                    >
                      {activePageGrid.visible ? "Hide grid" : "Show grid"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        updateActivePageGrid({ snap: !activePageGrid.snap })
                      }
                    >
                      {activePageGrid.snap ? "Disable grid snap" : "Enable grid snap"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        updateActivePageGrid({
                          objectSnap: !activePageGrid.objectSnap,
                        })
                      }
                    >
                      {activePageGrid.objectSnap
                        ? "Disable object snap"
                        : "Enable object snap"}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <PropertiesPanel
          className="md:col-start-2 md:row-start-2 lg:col-start-3 lg:row-start-1"
          layer={editor.selectedLayer}
          selectedLayers={editor.selectedLayers}
          page={editor.activePage}
          pages={editor.pages}
          components={editor.components}
          variables={editor.document.variables}
          variableModes={editor.document.variableModes ?? []}
          activeVariableModeId={editor.document.activeVariableModeId}
          variableDefinitions={editor.document.variableDefinitions ?? {}}
          variableCollections={editor.document.variableCollections ?? {}}
          layoutGridStyles={editor.document.layoutGridStyles ?? {}}
          paintStyles={editor.document.paintStyles ?? {}}
          textStyles={editor.document.textStyles ?? {}}
          effectStyles={editor.document.effectStyles ?? {}}
          layoutPresetStyles={editor.document.layoutPresetStyles ?? {}}
          onUpdatePage={(patch) => {
            editor.updateActivePage(patch);
            setSaveState("dirty");
          }}
          onUpdateLayer={(layerId, patch) => {
            editor.updateLayer(layerId, patch);
            setSaveState("dirty");
          }}
          onUpdateLayers={(patches) => {
            editor.updateLayers(patches);
            setSaveState("dirty");
          }}
          onUpdateLayoutGridStyles={(styles) => {
            editor.updateLayoutGridStyles(styles);
            setSaveState("dirty");
          }}
          onUpdatePaintStyles={(styles) => {
            editor.updatePaintStyles(styles);
            setSaveState("dirty");
          }}
          onUpdateTextStyles={(styles) => {
            editor.updateTextStyles(styles);
            setSaveState("dirty");
          }}
          onUpdateEffectStyles={(styles) => {
            editor.updateEffectStyles(styles);
            setSaveState("dirty");
          }}
          onUpdateLayoutPresetStyles={(styles) => {
            editor.updateLayoutPresetStyles(styles);
            setSaveState("dirty");
          }}
          onUpdateVariableSystem={(patch, applyBindings) => {
            editor.updateVariableSystem(patch, applyBindings);
            setSaveState("dirty");
          }}
          onSelectLayer={editor.setSelectedLayerId}
          onResetComponentInstance={(layerId) => {
            editor.resetComponentInstance(layerId);
            setSaveState("dirty");
          }}
          onDetachComponentInstance={(layerId) => {
            editor.detachComponentInstance(layerId);
            setSaveState("dirty");
          }}
          onUpdateComponentInstanceProperties={(layerId, properties) => {
            editor.updateComponentInstanceProperties(layerId, properties);
            setSaveState("dirty");
          }}
          onSwitchComponentInstanceVariant={(layerId, variantId) => {
            editor.switchComponentInstanceVariant(layerId, variantId);
            setSaveState("dirty");
          }}
        />
      </div>
    </main>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

function getArrowMovement(key: string, distance: number) {
  if (key === "ArrowUp") {
    return { x: 0, y: -distance };
  }

  if (key === "ArrowDown") {
    return { x: 0, y: distance };
  }

  if (key === "ArrowLeft") {
    return { x: -distance, y: 0 };
  }

  if (key === "ArrowRight") {
    return { x: distance, y: 0 };
  }

  return null;
}

function getNudgeDistance(
  page: DesignDocument["pages"][number],
  shiftKey: boolean,
) {
  const grid = getPageGrid(page);

  if (grid.snap) {
    return grid.size * (shiftKey ? 10 : 1);
  }

  return shiftKey ? 10 : 1;
}

function cloneExportSettings(settings: ExportSettings): ExportSettings {
  return {
    ...settings,
    formats: [...settings.formats],
  };
}

function getNudgedLayerPatches(
  page: DesignDocument["pages"][number],
  layers: DesignLayer[],
  movement: { x: number; y: number },
  shiftKey: boolean,
) {
  const grid = getPageGrid(page);

  if (!grid.snap) {
    return layers.map((layer) => ({
      layerId: layer.id,
      patch: {
        x: layer.x + movement.x,
        y: layer.y + movement.y,
      },
    }));
  }

  const left = Math.min(...layers.map((layer) => layer.x));
  const top = Math.min(...layers.map((layer) => layer.y));
  const steps = shiftKey ? 10 : 1;
  const deltaX = getGridNudgeDelta(left, grid.size, Math.sign(movement.x), steps);
  const deltaY = getGridNudgeDelta(top, grid.size, Math.sign(movement.y), steps);

  return layers.map((layer) => ({
    layerId: layer.id,
    patch: {
      x: layer.x + deltaX,
      y: layer.y + deltaY,
    },
  }));
}

function getSelectionVisibilityPatches(layers: DesignLayer[]) {
  const nextVisible = layers.some((layer) => !layer.visible);

  return layers.map((layer) => ({
    layerId: layer.id,
    patch: {
      visible: nextVisible,
    },
  }));
}

function getSelectionLockPatches(layers: DesignLayer[]) {
  const nextLocked = layers.some((layer) => !layer.locked);

  return layers.map((layer) => ({
    layerId: layer.id,
    patch: {
      locked: nextLocked,
    },
  }));
}

function getGridNudgeDelta(
  value: number,
  gridSize: number,
  direction: number,
  steps: number,
) {
  if (direction === 0) {
    return 0;
  }

  const aligned = Math.abs(value % gridSize) < 0.001;
  const firstGridLine =
    direction > 0
      ? Math.ceil(value / gridSize) * gridSize
      : Math.floor(value / gridSize) * gridSize;
  const extraSteps = aligned ? steps : Math.max(0, steps - 1);
  const target = firstGridLine + direction * gridSize * extraSteps;

  return target - value;
}

function getDefaultImportPoint(view: CanvasView) {
  return {
    x: Math.round((180 - view.x) / view.zoom),
    y: Math.round((140 - view.y) / view.zoom),
  };
}

function getImportedMediaSummary(imageCount: number, videoCount: number) {
  const parts = [];

  if (imageCount > 0) {
    parts.push(`${imageCount} image${imageCount === 1 ? "" : "s"}`);
  }

  if (videoCount > 0) {
    parts.push(`${videoCount} video${videoCount === 1 ? "" : "s"}`);
  }

  return parts.length > 0 ? parts.join(", ") : "No media imported";
}

function getMediaInputSignature(files: File[]) {
  if (files.length === 0) {
    return null;
  }

  return files
    .map((file) => [file.name, file.type, file.size, file.lastModified].join(":"))
    .join("|");
}

function scheduleEffectStateSync(action: () => void) {
  const timer = window.setTimeout(action, 0);

  return () => window.clearTimeout(timer);
}

function formatBackupTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Save failed before reaching the server.";
}

function getPageGrid(page: DesignDocument["pages"][number]) {
  return {
    visible: page.grid?.visible ?? true,
    snap: page.grid?.snap ?? false,
    objectSnap: page.grid?.objectSnap ?? true,
    size: Math.max(4, page.grid?.size ?? 24),
  };
}
