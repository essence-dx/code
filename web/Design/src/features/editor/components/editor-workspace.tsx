"use client";

import {
  type CSSProperties,
  type PointerEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import { DesktopFileBridgeDialog } from "@/features/desktop/components/desktop-file-bridge-dialog";
import { useDesktopFileBridge } from "@/features/desktop/use-desktop-file-bridge";
import type { DesktopDesignFile } from "@/features/desktop/desktop-file-bridge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AssetPanel } from "@/features/editor/components/asset-panel";
import { canCreateBooleanShape } from "@/features/editor/boolean-shapes";
import { applyEditorCommandMacro } from "@/features/editor/command-macros";
import { CanvasStage } from "@/features/editor/components/canvas-stage";
import { CollaborationSyncBanner } from "@/features/editor/components/collaboration-sync-banner";
import { CommentsSheet } from "@/features/editor/components/comments-sheet";
import { getConnectorAnchorCandidates } from "@/features/editor/connector-anchors";
import { DocumentExportSurfaces } from "@/features/editor/components/document-export-surfaces";
import { EditorAutosaveRecoveryBanner } from "@/features/editor/components/editor-autosave-recovery-banner";
import { EditorCommandPalette } from "@/features/editor/components/editor-command-palette";
import { ExportJobsSheet } from "@/features/editor/components/export-jobs-sheet";
import { LayersPanel } from "@/features/editor/components/layers-panel";
import { MediaTimelinePanel } from "@/features/editor/components/media-timeline-panel";
import { PagesPanel } from "@/features/editor/components/pages-panel";
import { PrintProofSheet } from "@/features/editor/components/print-proof-sheet";
import { PropertiesPanel } from "@/features/editor/components/properties-panel";
import { TopToolbar } from "@/features/editor/components/top-toolbar";
import { VersionHistorySheet } from "@/features/editor/components/version-history-sheet";
import { WorkshopPanel } from "@/features/editor/components/workshop-panel";
import {
  getActivePage,
  reorderElement,
  setActivePageBackground,
  updateActivePage,
  updateDocumentMetadata,
  updateElement,
} from "@/features/editor/editor-operations";
import { getPageDimensions } from "@/features/editor/page-dimensions";
import { useEditorExport } from "@/features/editor/use-editor-export";
import { useEditorHistory } from "@/features/editor/use-editor-history";
import { useEditorCollaboration } from "@/features/editor/use-editor-collaboration";
import { useEditorAutosave } from "@/features/editor/use-editor-autosave";
import { useEditorComments } from "@/features/editor/use-editor-comments";
import { useEditorDocumentActions } from "@/features/editor/use-editor-document-actions";
import { createDashboardDataStoryElements } from "@/features/editor/data-story-elements";
import { getEditorLocale } from "@/features/editor/editor-localization";
import {
  useEditorProjectPersistence,
  type SaveState,
} from "@/features/editor/use-editor-project-persistence";
import { useEditorKeyboardShortcuts } from "@/features/editor/use-editor-keyboard-shortcuts";
import { useEditorSharing } from "@/features/editor/use-editor-sharing";
import { useEditorCanvasInteractions } from "@/features/editor/use-editor-canvas-interactions";
import { useEditorPageActions } from "@/features/editor/use-editor-page-actions";
import { useEditorShellUi } from "@/features/editor/use-editor-shell-ui";
import {
  clampWorkspacePanelWidth,
  defaultWorkspacePanelWidths,
  type WorkspacePanelId,
} from "@/features/editor/workspace-panel-sizing";
import {
  createChartElement,
  createConnectorElement,
  createDocumentElement,
  createEmbedElement,
  createFormElement,
  createQrCodeElement,
  createShapeElement,
  createStickyNoteElement,
  createTableElement,
  createTextElement,
  createTimerElement,
  createVectorPathElement,
} from "@/features/editor/document-factory";
import { createFlowchartElements } from "@/features/editor/diagram-elements";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  DesignElement,
  EditorCommandMacroId,
  DrawTool,
  ProjectCommentSummary,
  ProjectDetail,
  ProjectPresenceSummary,
  ProjectVersionSummary,
  WorkshopSessionState,
} from "@/features/editor/types";
import type { UserAssetSummary } from "@/features/assets/types";
import { cn } from "@/lib/utils";

const embeddedCanvasFitZoom = 0.38;

type EditorWorkspaceProps = {
  project: ProjectDetail;
  assets: UserAssetSummary[];
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
  versions: ProjectVersionSummary[];
  comments: ProjectCommentSummary[];
  presence: ProjectPresenceSummary[];
  canManageSharing?: boolean;
  canRestoreVersions?: boolean;
  sharedEditShareId?: string | null;
  embedded?: boolean;
};

export function EditorWorkspace({
  project,
  assets,
  brandColors: initialBrandColors,
  brandFonts: initialBrandFonts,
  brandLogos,
  versions: initialVersions,
  comments: initialComments,
  presence: initialPresence,
  canManageSharing = true,
  canRestoreVersions = true,
  sharedEditShareId = null,
  embedded = false,
}: EditorWorkspaceProps) {
  const isEmbedded = embedded || project.id === "embedded-canva-project";
  const {
    document,
    canUndo,
    canRedo,
    commit,
    commitWithBase,
    replacePresent,
    undo,
    redo,
  } = useEditorHistory(project.document);
  const [projectName, setProjectName] = useState(project.name);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [activeDrawTool, setActiveDrawTool] = useState<DrawTool | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [isDesktopFileBridgeOpen, setIsDesktopFileBridgeOpen] = useState(false);
  const [changeRevision, setChangeRevision] = useState(0);
  const [workspacePanelWidths, setWorkspacePanelWidths] = useState(
    defaultWorkspacePanelWidths,
  );
  const [resizingPanelId, setResizingPanelId] =
    useState<WorkspacePanelId | null>(null);
  const changeRevisionRef = useRef(0);
  const shellUi = useEditorShellUi({ initialZoom: isEmbedded ? 0.38 : 0.55 });
  const canvasZoom = isEmbedded
    ? Math.min(shellUi.zoom, embeddedCanvasFitZoom)
    : shellUi.zoom;
  const setShellZoom = shellUi.setZoom;
  const setCanvasZoom = useCallback(
    (nextZoom: number) => {
      setShellZoom(
        isEmbedded ? Math.min(nextZoom, embeddedCanvasFitZoom) : nextZoom,
      );
    },
    [isEmbedded, setShellZoom],
  );

  const page = getActivePage(document);
  const pageSize = getPageDimensions(document, page);
  const editorLocale = getEditorLocale(document.metadata?.editorLocale);
  const selectedElements = useMemo(() => {
    const idSet = new Set(selectedElementIds);

    return page.elements.filter((element) => idSet.has(element.id));
  }, [page.elements, selectedElementIds]);
  const selectedElement =
    selectedElements.length === 1 ? selectedElements[0] : null;
  const selectedConnectorAnchors = useMemo(
    () => getConnectorAnchorCandidates(page.elements, selectedElementIds),
    [page.elements, selectedElementIds],
  );
  const canCreateBooleanShapeSelection = useMemo(
    () => canCreateBooleanShape(page.elements, selectedElementIds),
    [page.elements, selectedElementIds],
  );
  const hasGroupedSelection = selectedElements.some(
    (element) => element.groupId,
  );
  const commandAutomationIssueCount =
    document.metadata?.commandAutomation?.qaIssues.length ?? 0;
  const {
    canvasRef,
    activeExportJob,
    exportJobs,
    failedExportJobCount,
    exportQuality,
    exportPlaybackTimeSeconds,
    exportScale,
    isRenderingOutput,
    setExportQuality,
    setExportScale,
    setExportPageNode,
    setPrintExportPageNode,
    captureCurrentThumbnail,
    exportImage,
    retryExportJob,
    clearExportJobs,
  } = useEditorExport({
    projectId: project.id,
    document,
    projectName,
  });

  const {
    presence,
    updatePresenceCursor,
    collaborationSyncStatus,
    pendingCollaborationProject,
    lastSyncedAt,
    markProjectSynced,
    applyPendingCollaborationProject,
  } = useEditorCollaboration({
    projectId: project.id,
    initialUpdatedAt: project.updatedAt,
    editShareId: sharedEditShareId,
    enabled: !isEmbedded,
    projectName,
    document,
    saveState,
    changeRevision,
    changeRevisionRef,
    pageId: page.id,
    initialPresence,
    replacePresent,
    setProjectName,
    setSelectedElementIds,
    setSaveState,
  });
  const {
    brandColors,
    brandFonts,
    versions,
    restoringVersionId,
    templateSaveState,
    saveProject,
    restoreVersion,
    createBrandColor,
    saveBrandFont,
    saveAsTemplate,
  } = useEditorProjectPersistence({
    projectId: project.id,
    initialBrandColors,
    initialBrandFonts,
    initialVersions,
    canRestoreVersions,
    document,
    projectName,
    sharedEditShareId,
    changeRevisionRef,
    captureCurrentThumbnail,
    replacePresent,
    markProjectSynced,
    setProjectName,
    setSelectedElementIds,
    setSaveState,
  });
  const {
    autosaveState,
    recoverableSnapshot,
    recoverableSnapshotConflictStatus,
    clearAutosaveSnapshot,
    restoreAutosaveSnapshot,
  } = useEditorAutosave({
    projectId: project.id,
    projectName,
    baseUpdatedAt: lastSyncedAt,
    document,
    saveState,
    replacePresent,
    setProjectName,
    setSelectedElementIds,
    setSaveState,
  });
  const saveProjectWithAutosaveClear = useCallback(async () => {
    if (isEmbedded) {
      setSaveState("saved");
      clearAutosaveSnapshot();
      return true;
    }

    const saved = await saveProject();

    if (saved) {
      clearAutosaveSnapshot();
    }

    return saved;
  }, [clearAutosaveSnapshot, isEmbedded, saveProject]);
  const applyPendingCollaborationProjectWithAutosaveClear = useCallback(() => {
    applyPendingCollaborationProject();
    clearAutosaveSnapshot();
  }, [applyPendingCollaborationProject, clearAutosaveSnapshot]);
  const restoreLocalAutosaveSnapshot = useCallback(() => {
    if (!recoverableSnapshot) return;

    restoreAutosaveSnapshot();
    changeRevisionRef.current += 1;
    setChangeRevision(changeRevisionRef.current);
  }, [recoverableSnapshot, restoreAutosaveSnapshot]);
  const openDesktopDesignFile = useCallback(
    (file: DesktopDesignFile) => {
      replacePresent(file.document);
      setProjectName(file.projectName);
      setSelectedElementIds([]);
      setSaveState("dirty");
      changeRevisionRef.current += 1;
      setChangeRevision(changeRevisionRef.current);
    },
    [replacePresent],
  );
  const desktopFileBridge = useDesktopFileBridge({
    projectId: project.id,
    projectName,
    document,
    onOpenDesignFile: openDesktopDesignFile,
  });
  const {
    publicShareId,
    editShareId,
    editSharePermission,
    shareState,
    copyPublicShareLink,
    openPublicShareLink,
    togglePublicShare,
    copyEditShareLink,
    openEditShareLink,
    toggleEditShare,
  } = useEditorSharing({
    projectId: project.id,
    initialPublicShareId: project.publicShareId,
    initialEditShareId: project.editShareId,
    initialEditSharePermission: project.editSharePermission,
    saveProject: saveProjectWithAutosaveClear,
  });
  const {
    comments,
    commentState,
    openCommentCount,
    createComment,
    resolveComment,
    toggleCommentReaction,
  } = useEditorComments({
    projectId: project.id,
    initialComments,
    sharedEditShareId,
  });
  const {
    markDirty,
    commitDocument,
    addCreatedElement,
    addCreatedElements,
    connectSelectedElements,
    applyBooleanShapeOperation,
    addWorkshopTimer,
    addImportedPages,
    applyStylePreset,
    applyBrandKit,
    updateEditorLocale,
    duplicateSelectedElement,
    deleteSelectedElement,
    distributeSelectedElements,
    groupSelectedElements,
    ungroupSelectedElements,
    selectElement,
    undoDocument,
    redoDocument,
    openPresenterView,
  } = useEditorDocumentActions({
    page,
    pageWidth: pageSize.width,
    projectId: project.id,
    selectedElementIds,
    selectedElements,
    selectedConnectorAnchors,
    brandColors,
    brandFonts,
    saveState,
    saveProject: saveProjectWithAutosaveClear,
    commit,
    undo,
    redo,
    setSelectedElementIds,
    setSaveState,
    setChangeRevision,
    changeRevisionRef,
  });
  const {
    updateElementById,
    updateElements,
    beginElementEdit,
    previewElement,
    commitElement,
    splitElement,
    beginCanvasDrag,
    moveCanvasDrag,
    endCanvasDrag,
  } = useEditorCanvasInteractions({
    document,
    commitDocument,
    commitWithBase,
    replacePresent,
    markDirty,
    setSelectedElementIds,
  });
  const {
    addBlankPage,
    bulkCreateFromCsv,
    importSpeakerNotes,
    importTranslationPack,
    selectPage,
    renamePageById,
    updatePageNotesById,
    updatePageWebsiteSeoById,
    updatePageWebsiteNavigationById,
    updatePageTransitionById,
    updatePageFormatById,
    updatePageSizeById,
    updatePageAudienceInteractionById,
    duplicatePageById,
    deletePageById,
    reorderPageById,
  } = useEditorPageActions({
    document,
    editorLocale,
    commitDocument,
    setSelectedElementIds,
  });
  const updateWorkshopSession = (updates: Partial<WorkshopSessionState>) => {
    commitDocument((current) =>
      updateActivePage(current, (activePage) => ({
        ...activePage,
        workshopSession: {
          ...activePage.workshopSession,
          ...updates,
        },
      })),
    );
  };
  const applyWorkshopPack = (
    elements: DesignElement[],
    sessionUpdates: Partial<WorkshopSessionState>,
  ) => {
    commitDocument((current) =>
      updateActivePage(current, (activePage) => ({
        ...activePage,
        elements: [...activePage.elements, ...elements],
        workshopSession: {
          ...activePage.workshopSession,
          ...sessionUpdates,
        },
      })),
    );
  };
  const runEditorCommandMacro = useCallback(
    (macroId: EditorCommandMacroId) => {
      const result = applyEditorCommandMacro(document, macroId, {
        selectedElementIds,
        projectName,
      });

      setSelectedElementIds(result.selectedElementIds ?? selectedElementIds);
      commitDocument(result.document);
    },
    [commitDocument, document, projectName, selectedElementIds],
  );

  useEditorKeyboardShortcuts({
    pageElements: page.elements,
    selectedElements,
    selectedElementIds,
    commitDocument,
    markDirty,
    saveProject: saveProjectWithAutosaveClear,
    selectElement,
    setSelectedElementIds,
    duplicateSelectedElement,
    groupSelectedElements,
    ungroupSelectedElements,
    redo,
    undo,
  });

  const setWorkspacePanelWidth = useCallback(
    (panelId: WorkspacePanelId, width: number) => {
      setWorkspacePanelWidths((current) => ({
        ...current,
        [panelId]: clampWorkspacePanelWidth(panelId, width),
      }));
    },
    [],
  );

  const startPanelResize = useCallback(
    (event: PointerEvent<HTMLButtonElement>, panelId: WorkspacePanelId) => {
      event.preventDefault();
      event.stopPropagation();

      if (typeof window === "undefined") return;

      const startX = event.clientX;
      const startWidth = workspacePanelWidths[panelId];
      const direction = panelId === "assets" ? 1 : -1;
      const body = window.document.body;
      const previousCursor = body.style.cursor;
      const previousUserSelect = body.style.userSelect;

      setResizingPanelId(panelId);
      body.style.cursor = "col-resize";
      body.style.userSelect = "none";

      const finishResize = () => {
        setResizingPanelId(null);
        body.style.cursor = previousCursor;
        body.style.userSelect = previousUserSelect;
        window.removeEventListener("pointermove", resizePanel);
        window.removeEventListener("pointerup", finishResize);
        window.removeEventListener("pointercancel", finishResize);
      };

      const resizePanel = (pointerEvent: globalThis.PointerEvent) => {
        setWorkspacePanelWidth(
          panelId,
          startWidth + (pointerEvent.clientX - startX) * direction,
        );
      };

      window.addEventListener("pointermove", resizePanel);
      window.addEventListener("pointerup", finishResize, { once: true });
      window.addEventListener("pointercancel", finishResize, { once: true });
    },
    [setWorkspacePanelWidth, workspacePanelWidths],
  );

  const workspaceGridStyle = {
    "--editor-left-panel-width": `${workspacePanelWidths.assets}px`,
    "--editor-right-panel-width": `${workspacePanelWidths.properties}px`,
  } as CSSProperties;

  return (
    <main
      className="flex h-dvh flex-col overflow-hidden bg-background text-foreground"
      data-canvas-zoom={canvasZoom}
      data-editor-mode={isEmbedded ? "embedded" : "full"}
    >
      <DocumentExportSurfaces
        document={document}
        renderTimeSeconds={exportPlaybackTimeSeconds ?? undefined}
        onPageNode={setExportPageNode}
      />
      <DocumentExportSurfaces
        document={document}
        showPrintMarks
        onPageNode={setPrintExportPageNode}
      />
      <TopToolbar
        embedded={isEmbedded}
        projectName={projectName}
        saveState={saveState}
        autosaveState={autosaveState}
        templateSaveState={templateSaveState}
        canUndo={canUndo}
        canRedo={canRedo}
        showGrid={shellUi.showGrid}
        showGuides={shellUi.showGuides}
        showPrintMarks={shellUi.showPrintMarks}
        exportQuality={exportQuality}
        exportScale={exportScale}
        activeExportProgress={activeExportJob?.progress ?? null}
        failedExportJobCount={failedExportJobCount}
        canManageSharing={canManageSharing}
        canRestoreVersions={canRestoreVersions}
        commentCount={openCommentCount}
        presence={presence}
        publicShareId={publicShareId}
        editShareId={editShareId}
        editSharePermission={editSharePermission}
        shareState={shareState}
        zoom={canvasZoom}
        editorLocale={editorLocale}
        activeDrawTool={activeDrawTool}
        onNameChange={(name) => {
          setProjectName(name);
          markDirty();
        }}
        onEditorLocaleChange={updateEditorLocale}
        onActiveDrawToolChange={setActiveDrawTool}
        onUndo={() => {
          undoDocument();
        }}
        onRedo={() => {
          redoDocument();
        }}
        onSave={saveProjectWithAutosaveClear}
        onSaveAsTemplate={() => void saveAsTemplate("standard")}
        onSaveAsBrandTemplate={() => void saveAsTemplate("brand")}
        onSaveAsTeamTemplate={() => void saveAsTemplate("team")}
        onOpenVersionHistory={shellUi.openVersionHistory}
        onExport={exportImage}
        onOpenExportJobs={shellUi.openExportJobs}
        onExportQualityChange={setExportQuality}
        onExportScaleChange={setExportScale}
        onOpenCommandPalette={shellUi.openCommandPalette}
        onOpenComments={shellUi.openComments}
        onOpenDesktopFileBridge={
          desktopFileBridge.isAvailable
            ? () => setIsDesktopFileBridgeOpen(true)
            : undefined
        }
        onOpenPrintProof={shellUi.openPrintProof}
        onOpenPresenterView={canManageSharing ? openPresenterView : undefined}
        onTogglePublicShare={(enabled) => void togglePublicShare(enabled)}
        onCopyPublicShareLink={() => void copyPublicShareLink()}
        onOpenPublicShareLink={openPublicShareLink}
        onToggleEditShare={(enabled, permission) =>
          void toggleEditShare(enabled, permission)
        }
        onCopyEditShareLink={() => void copyEditShareLink()}
        onOpenEditShareLink={openEditShareLink}
        onToggleGuides={shellUi.toggleGuides}
        onToggleGrid={shellUi.toggleGrid}
        onTogglePrintMarks={shellUi.togglePrintMarks}
        onZoomChange={setCanvasZoom}
      />
      {!isEmbedded ? (
        <CollaborationSyncBanner
          status={collaborationSyncStatus}
          pendingProjectName={pendingCollaborationProject?.name ?? null}
          pendingUpdatedAt={pendingCollaborationProject?.updatedAt ?? null}
          onApplyRemote={applyPendingCollaborationProjectWithAutosaveClear}
        />
      ) : null}
      {!isEmbedded ? (
        <EditorAutosaveRecoveryBanner
          snapshot={recoverableSnapshot}
          conflictStatus={recoverableSnapshotConflictStatus}
          onRestore={restoreLocalAutosaveSnapshot}
          onDiscard={clearAutosaveSnapshot}
        />
      ) : null}
      <DesktopFileBridgeDialog
        open={isDesktopFileBridgeOpen}
        onOpenChange={setIsDesktopFileBridgeOpen}
        bridge={desktopFileBridge}
      />
      <EditorCommandPalette
        open={shellUi.isCommandPaletteOpen}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={selectedElementIds.length > 0}
        hasGroupedSelection={hasGroupedSelection}
        canConnectSelection={selectedConnectorAnchors.length === 2}
        canCreateBooleanShape={canCreateBooleanShapeSelection}
        selectionCount={selectedElementIds.length}
        commandAutomationIssueCount={commandAutomationIssueCount}
        editorLocale={editorLocale}
        onOpenChange={shellUi.setIsCommandPaletteOpen}
        onAddText={() => addCreatedElement(createTextElement())}
        onAddDocument={() => addCreatedElement(createDocumentElement())}
        onAddRectangle={() =>
          addCreatedElement(createShapeElement({ shape: "rectangle" }))
        }
        onAddEllipse={() =>
          addCreatedElement(
            createShapeElement({ shape: "ellipse", fill: "#22c55e" }),
          )
        }
        onAddLine={() =>
          addCreatedElement(
            createShapeElement({
              shape: "line",
              fill: "transparent",
              stroke: "#111827",
              strokeWidth: 8,
              height: 24,
            }),
          )
        }
        onAddStickyNote={() => addCreatedElement(createStickyNoteElement())}
        onAddConnector={() => addCreatedElement(createConnectorElement())}
        onAddVectorPath={() => addCreatedElement(createVectorPathElement())}
        onAddFlowchart={() => addCreatedElements(createFlowchartElements())}
        onAddQrCode={() => addCreatedElement(createQrCodeElement())}
        onAddTable={() => addCreatedElement(createTableElement())}
        onAddChart={() => addCreatedElement(createChartElement())}
        onAddDataStory={() =>
          addCreatedElements(createDashboardDataStoryElements(document.width))
        }
        onAddForm={() => addCreatedElement(createFormElement())}
        onAddEmbed={() => addCreatedElement(createEmbedElement())}
        onAddTimer={() => addCreatedElement(createTimerElement())}
        onSave={() => void saveProjectWithAutosaveClear()}
        onExport={(format) => void exportImage(format)}
        onDuplicateSelection={duplicateSelectedElement}
        onDeleteSelection={deleteSelectedElement}
        onConnectSelection={connectSelectedElements}
        onBooleanShapeOperation={applyBooleanShapeOperation}
        onRunCommandMacro={runEditorCommandMacro}
        onDistributeHorizontally={() =>
          distributeSelectedElements("horizontal")
        }
        onDistributeVertically={() => distributeSelectedElements("vertical")}
        onGroupSelection={groupSelectedElements}
        onUngroupSelection={ungroupSelectedElements}
        onUndo={undoDocument}
        onRedo={redoDocument}
        onZoomIn={shellUi.zoomIn}
        onZoomOut={shellUi.zoomOut}
        onToggleGuides={shellUi.toggleGuides}
        onToggleGrid={shellUi.toggleGrid}
        onTogglePrintMarks={shellUi.togglePrintMarks}
      />
      {canRestoreVersions ? (
        <VersionHistorySheet
          open={shellUi.isVersionHistoryOpen}
          versions={versions}
          restoringVersionId={restoringVersionId}
          onOpenChange={shellUi.setIsVersionHistoryOpen}
          onRestoreVersion={(versionId) => void restoreVersion(versionId)}
        />
      ) : null}
      <ExportJobsSheet
        open={shellUi.isExportJobsOpen}
        jobs={exportJobs}
        onOpenChange={shellUi.setIsExportJobsOpen}
        onRetryJob={retryExportJob}
        onClearJobs={clearExportJobs}
      />
      {!isEmbedded ? (
        <CommentsSheet
          open={shellUi.isCommentsOpen}
          comments={comments}
          activePageId={page.id}
          activePageName={page.name}
          selectedElement={selectedElement}
          commentState={commentState}
          onOpenChange={shellUi.setIsCommentsOpen}
          onCreateComment={createComment}
          onToggleReaction={(commentId, reaction) =>
            void toggleCommentReaction(commentId, reaction)
          }
          onResolveComment={(commentId) => void resolveComment(commentId)}
        />
      ) : null}
      <PrintProofSheet
        open={shellUi.isPrintProofOpen}
        document={document}
        page={page}
        onOpenChange={shellUi.setIsPrintProofOpen}
      />
      <div
        className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(9rem,22dvh)_minmax(0,1fr)_minmax(11rem,26dvh)] overflow-hidden md:grid-cols-[var(--editor-left-panel-width)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_minmax(12rem,28dvh)] lg:grid-cols-[var(--editor-left-panel-width)_minmax(0,1fr)_var(--editor-right-panel-width)] lg:grid-rows-1"
        style={workspaceGridStyle}
      >
        <div className="relative min-h-0 min-w-0 overflow-hidden border-b border-border bg-card md:col-start-1 md:row-span-2 md:border-b-0 md:border-r lg:row-span-1">
          <ScrollArea className="h-full" viewportClassName="min-w-0">
            <div className="flex min-w-0 flex-col">
              <AssetPanel
                assets={assets}
                projectName={projectName}
                document={document}
                brandColors={brandColors}
                brandFonts={brandFonts}
                brandLogos={brandLogos}
                onAddElement={addCreatedElement}
                onAddElements={addCreatedElements}
                onAddPages={addImportedPages}
                onApplyStyle={applyStylePreset}
                onApplyBrandKit={applyBrandKit}
                onUpdateMetadata={(updates) =>
                  commitDocument((current) =>
                    updateDocumentMetadata(current, updates),
                  )
                }
              />
              <PagesPanel
                projectName={projectName}
                document={document}
                editorLocale={editorLocale}
                onAddPage={addBlankPage}
                onBulkCreateFromCsv={bulkCreateFromCsv}
                onImportSpeakerNotes={importSpeakerNotes}
                onImportTranslationPack={importTranslationPack}
                onSelectPage={selectPage}
                onRenamePage={renamePageById}
                onUpdatePageNotes={updatePageNotesById}
                onUpdatePageWebsiteSeo={updatePageWebsiteSeoById}
                onUpdatePageWebsiteNavigation={updatePageWebsiteNavigationById}
                onUpdatePageTransition={updatePageTransitionById}
                onUpdatePageFormat={updatePageFormatById}
                onUpdatePageSize={updatePageSizeById}
                onUpdatePageAudienceInteraction={
                  updatePageAudienceInteractionById
                }
                onDuplicatePage={duplicatePageById}
                onDeletePage={deletePageById}
                onReorderPage={reorderPageById}
              />
              <LayersPanel
                page={page}
                selectedElementIds={selectedElementIds}
                onSelectElement={selectElement}
                onToggleVisibility={(elementId) =>
                  commitDocument((current) => {
                    const element = page.elements.find(
                      (item) => item.id === elementId,
                    );

                    if (!element) return current;

                    return updateElement(current, elementId, {
                      hidden: !element.hidden,
                    } as Partial<DesignElement>);
                  })
                }
                onReorderElement={(elementId, direction) =>
                  commitDocument((current) =>
                    reorderElement(current, elementId, direction),
                  )
                }
              />
              <WorkshopPanel
                page={page}
                selectedElementIds={selectedElementIds}
                onSelectElement={selectElement}
                onAddWorkshopTimer={addWorkshopTimer}
                onUpdateElement={updateElementById}
                onUpdateElements={updateElements}
                onApplyWorkshopPack={applyWorkshopPack}
                onUpdateWorkshopSession={updateWorkshopSession}
              />
              <MediaTimelinePanel
                page={page}
                selectedElementIds={selectedElementIds}
                onSelectElement={selectElement}
                onUpdateElement={updateElementById}
                onUpdateElements={updateElements}
                onBeginElementEdit={beginElementEdit}
                onPreviewElement={previewElement}
                onCommitElement={commitElement}
                onSplitElement={splitElement}
              />
            </div>
          </ScrollArea>
          <WorkspacePanelResizeHandle
            active={resizingPanelId === "assets"}
            label="Resize asset and page panels"
            side="right"
            onPointerDown={(event) => startPanelResize(event, "assets")}
          />
        </div>
        <section className="min-h-0 min-w-0 overflow-hidden md:col-start-2 md:row-start-1 lg:col-start-2">
          <CanvasStage
            document={document}
            page={page}
            selectedElementIds={selectedElementIds}
            showGrid={shellUi.showGrid && !isRenderingOutput}
            showGuides={shellUi.showGuides && !isRenderingOutput}
            showPrintMarks={shellUi.showPrintMarks && !isRenderingOutput}
            showSelection={!isRenderingOutput}
            presence={presence}
            zoom={canvasZoom}
            canvasRef={canvasRef}
            activeDrawTool={activeDrawTool}
            onCreateDrawElement={addCreatedElement}
            onSelectElement={selectElement}
            onClearSelection={() => setSelectedElementIds([])}
            onPointerPositionChange={updatePresenceCursor}
            onDragStart={beginCanvasDrag}
            onDragMove={moveCanvasDrag}
            onDragEnd={endCanvasDrag}
          />
        </section>
        <div className="relative min-h-0 min-w-0 overflow-hidden border-t border-border md:col-start-2 md:row-start-2 lg:col-start-3 lg:row-start-1 lg:border-l lg:border-t-0">
          <WorkspacePanelResizeHandle
            active={resizingPanelId === "properties"}
            label="Resize properties panel"
            side="left"
            onPointerDown={(event) => startPanelResize(event, "properties")}
          />
          <PropertiesPanel
            className="border-0"
            selectedElement={selectedElement}
            pageElements={page.elements}
            brandColors={brandColors}
            brandFonts={brandFonts}
            canvasSize={pageSize}
            pageBackground={page.background}
            onUpdateElement={(updates) => {
              if (!selectedElement) return;
              updateElementById(selectedElement.id, updates);
            }}
            onDuplicateElement={() => {
              duplicateSelectedElement();
            }}
            onDeleteElement={() => {
              deleteSelectedElement();
            }}
            onBackgroundChange={(color) =>
              commitDocument((current) =>
                setActivePageBackground(current, color),
              )
            }
            onCreateBrandColor={(color) => {
              if (!isEmbedded) void createBrandColor(color);
            }}
            onSaveBrandFont={(font) => {
              if (!isEmbedded) void saveBrandFont(font);
            }}
          />
        </div>
      </div>
    </main>
  );
}

function WorkspacePanelResizeHandle({
  active,
  label,
  side,
  onPointerDown,
}: {
  active: boolean;
  label: string;
  side: "left" | "right";
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "absolute top-0 z-20 hidden h-full w-2 cursor-col-resize items-center justify-center outline-none transition-colors md:flex",
        side === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
        active ? "bg-primary/15" : "bg-transparent hover:bg-primary/10",
      )}
      onPointerDown={onPointerDown}
    >
      <span
        className={cn(
          "h-10 w-0.5 rounded-full transition-colors",
          active ? "bg-primary" : "bg-border",
        )}
      />
    </button>
  );
}
