"use client";

import {
  Clock3,
  Component,
  FileText,
  Layers3,
  MessageSquare,
  Puzzle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { countMentionedComments } from "@/features/editor/comment-mentions";
import { ActivityPanel } from "@/features/editor/components/activity-panel";
import { ComponentsPanel } from "@/features/editor/components/components-panel";
import type { CommandPaletteCommand } from "@/features/editor/components/command-palette";
import { FileBrowserPanel } from "@/features/editor/components/file-browser-panel";
import { ExtensionsPanel } from "@/features/editor/components/extensions-panel";
import { LayersPanel } from "@/features/editor/components/layers-panel";
import { CommentsPanel } from "@/features/editor/components/comments-panel";
import type {
  LocalLibraryStatus,
} from "@/features/editor/component-library-manifest";
import type {
  EditorPluginApprovalRecord,
  EditorPluginManifest,
  EditorPluginRunHistoryEntry,
} from "@/features/editor/editor-plugin-api";
import type {
  CanvasView,
  DesignActivityEvent,
  DesignComment,
  DesignCommentNotificationDelivery,
  DesignCommentNotificationPreferences,
  DesignCommentReactionKind,
  DesignComponent,
  DesignComponentPropertyType,
  DesignDocument,
  EditorTool,
  DesignLayer,
  DesignLibraryMetadata,
  DesignPage,
} from "@/features/editor/types";
import type {
  CollaborationPeer,
  CollaborationPresenceEvent,
} from "@/features/editor/collaboration-presence";
import type { ToolShortcutPreferences } from "@/features/editor/shortcut-preferences";
import type {
  ComponentPropertyDefinitionPatch,
  ComponentSlotPatch,
} from "@/features/editor/component-definition-document";
import type {
  LayerPatch,
} from "@/features/editor/document-utils";
import type {
  DesignFileSummary,
  DesignFileVersionSummary,
} from "@/features/files/actions";

type WorkspaceSidebarProps = {
  className?: string;
  activeFileId: string;
  files: DesignFileSummary[];
  versions: DesignFileVersionSummary[];
  document: DesignDocument;
  collaborationPresence: {
    followedPeerId: string | null;
    peers: CollaborationPeer[];
    presenceEvents: CollaborationPresenceEvent[];
    selfId: string;
    spotlight: boolean;
    view: CanvasView;
  };
  pages: DesignPage[];
  activePageId: string;
  layers: DesignLayer[];
  components: DesignComponent[];
  libraryMetadata?: DesignLibraryMetadata;
  libraryStatus: LocalLibraryStatus;
  pendingLibraryComponentUpdates: Record<string, DesignComponent>;
  comments: DesignComment[];
  mentionKeys: string[];
  currentUserName: string;
  currentUserEmail: string;
  notificationPreferences: DesignCommentNotificationPreferences;
  notificationDeliveries: DesignCommentNotificationDelivery[];
  selectedCommentId: string | null;
  canCreateVariant: boolean;
  toolShortcuts: ToolShortcutPreferences;
  commandPaletteCommands: CommandPaletteCommand[];
  pluginGrants: Record<string, boolean>;
  pluginApprovals: Record<string, EditorPluginApprovalRecord>;
  pluginRunHistory: EditorPluginRunHistoryEntry[];
  activityEvents: DesignActivityEvent[];
  selectedLayerId: string | null;
  selectedLayerIds: string[];
  onSelectPage: (pageId: string) => void;
  onRenamePage: (pageId: string, name: string) => void;
  onMovePage: (pageId: string, direction: "up" | "down") => void;
  onAddPage: () => void;
  onDuplicatePage: () => void;
  onDeletePage: () => void;
  onSelectLayer: (layerId: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
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
  onUpdateLibraryMetadata: (
    patch: Partial<Pick<DesignLibraryMetadata, "name" | "teamName">>,
  ) => void;
  onPublishLibrary: () => void;
  onExportLibrary: () => void;
  onExportDesignSystemPackage: () => void;
  onImportLibrary: (file: File) => void;
  onAcceptLibraryUpdate: (componentId: string) => void;
  onDetachLibraryComponent: (componentId: string) => void;
  onInsertComponent: (componentId: string, variantId?: string) => void;
  onCreateVariant: (componentId: string) => void;
  onRenameComponent: (componentId: string, name: string) => void;
  onRenameVariant: (
    componentId: string,
    variantId: string,
    name: string,
  ) => void;
  onAddPropertyDefinition: (
    componentId: string,
    type: DesignComponentPropertyType,
  ) => void;
  onUpdatePropertyDefinition: (
    componentId: string,
    definitionId: string,
    patch: ComponentPropertyDefinitionPatch,
  ) => void;
  onDeletePropertyDefinition: (
    componentId: string,
    definitionId: string,
  ) => void;
  onUpdateSlot: (
    componentId: string,
    sourceLayerId: string,
    patch: ComponentSlotPatch,
  ) => void;
  onDeleteComponent: (componentId: string) => void;
  onDeleteVariant: (componentId: string, variantId: string) => void;
  onRepairComponentReferences: (patches: LayerPatch[]) => void;
  onResetComponentInstance: (layerId: string) => void;
  onBindMatchingComponentVariables: (matchCount: number) => void;
  onRemoveStaleComponentVariableBindings: (issueCount: number) => void;
  onUpdateComment: (
    commentId: string,
    patch: Partial<
      Pick<DesignComment, "text" | "resolved" | "x" | "y" | "dueDate">
    >,
  ) => void;
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
  onRemoveComment: (commentId: string) => void;
  onToggleCommentReaction: (
    commentId: string,
    kind: DesignCommentReactionKind,
  ) => void;
  onAssignComment: (commentId: string) => void;
  onClearCommentAssignment: (commentId: string) => void;
  onSelectComment: (comment: DesignComment) => void;
  onAddCommentReply: (commentId: string, text: string) => void;
  onUpdateCommentReply: (
    commentId: string,
    replyId: string,
    text: string,
  ) => void;
  onRemoveCommentReply: (commentId: string, replyId: string) => void;
  onUpdateNotificationPreferences: (
    patch: Partial<
      Pick<
        DesignCommentNotificationPreferences,
        | "enabled"
        | "newComments"
        | "replies"
        | "assignments"
        | "mentions"
        | "reactions"
        | "acknowledgements"
        | "mutedEmails"
      >
    >,
  ) => void;
  onClearActivity: () => void;
  onRecordExtensionActivity: (label: string, detail?: string) => void;
};

export function WorkspaceSidebar({
  className,
  activeFileId,
  files,
  versions,
  document,
  collaborationPresence,
  pages,
  activePageId,
  layers,
  components,
  libraryMetadata,
  libraryStatus,
  pendingLibraryComponentUpdates,
  comments,
  mentionKeys,
  currentUserName,
  currentUserEmail,
  notificationPreferences,
  notificationDeliveries,
  selectedCommentId,
  canCreateVariant,
  toolShortcuts,
  commandPaletteCommands,
  pluginGrants,
  pluginApprovals,
  pluginRunHistory,
  activityEvents,
  selectedLayerId,
  selectedLayerIds,
  onSelectPage,
  onRenamePage,
  onMovePage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onSelectLayer,
  onSelectLayers,
  onUpdateLayer,
  onUpdateToolShortcut,
  onReplaceToolShortcuts,
  onReplacePluginGrants,
  onApprovePlugin,
  onRecordPluginRun,
  onReplayPluginApprovals,
  onUpdateLayers,
  onUpdateLibraryMetadata,
  onPublishLibrary,
  onExportLibrary,
  onExportDesignSystemPackage,
  onImportLibrary,
  onAcceptLibraryUpdate,
  onDetachLibraryComponent,
  onInsertComponent,
  onCreateVariant,
  onRenameComponent,
  onRenameVariant,
  onAddPropertyDefinition,
  onUpdatePropertyDefinition,
  onDeletePropertyDefinition,
  onUpdateSlot,
  onDeleteComponent,
  onDeleteVariant,
  onRepairComponentReferences,
  onResetComponentInstance,
  onBindMatchingComponentVariables,
  onRemoveStaleComponentVariableBindings,
  onUpdateComment,
  onUpdateComments,
  onSetPrototypeStartPage,
  onSavePerformanceBaseline,
  onRemovePerformanceBaseline,
  onUpdateVariableSystem,
  onRemoveComment,
  onToggleCommentReaction,
  onAssignComment,
  onClearCommentAssignment,
  onSelectComment,
  onAddCommentReply,
  onUpdateCommentReply,
  onRemoveCommentReply,
  onUpdateNotificationPreferences,
  onClearActivity,
  onRecordExtensionActivity,
}: WorkspaceSidebarProps) {
  const mentionCount = countMentionedComments(comments, mentionKeys);
  const activePage = pages.find((page) => page.id === activePageId) ?? {
    id: activePageId,
    name: "",
    background: "#ffffff",
    layers,
    comments,
  };

  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden border-b border-border bg-card md:border-r xl:border-b-0 [&_*]:min-w-0 [&_button]:max-w-full [&_button]:overflow-hidden [&_button]:text-ellipsis [&_input]:max-w-full [&_[data-slot=select-trigger]]:max-w-full",
        className,
      )}
    >
      <Tabs defaultValue="layers" className="flex h-full min-h-0 min-w-0 flex-col">
        <div className="flex h-11 items-center px-2">
          <TabsList className="grid h-9 w-full grid-cols-6 gap-1 rounded-lg p-1">
            <SidebarTabTrigger value="files" label="Files">
              <FileText className="size-4" />
            </SidebarTabTrigger>
            <SidebarTabTrigger value="layers" label="Layers">
              <Layers3 className="size-4" />
            </SidebarTabTrigger>
            <SidebarTabTrigger value="components" label="Assets">
              <Component className="size-4" />
            </SidebarTabTrigger>
            <SidebarTabTrigger value="comments" label="Notes">
              <MessageSquare className="size-4" />
              {mentionCount > 0 ? (
                <Badge
                  variant="secondary"
                  className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-[10px]"
                >
                  {mentionCount}
                </Badge>
              ) : null}
            </SidebarTabTrigger>
            <SidebarTabTrigger value="extensions" label="Extensions">
              <Puzzle className="size-4" />
            </SidebarTabTrigger>
            <SidebarTabTrigger value="activity" label="Activity">
              <Clock3 className="size-4" />
            </SidebarTabTrigger>
          </TabsList>
        </div>
        <Separator />

        <TabsContent value="files" className="m-0 min-h-0 min-w-0 flex-1 overflow-hidden">
          <FileBrowserPanel
            activeFileId={activeFileId}
            files={files}
            onRecordActivity={onRecordExtensionActivity}
          />
        </TabsContent>

        <TabsContent value="layers" className="m-0 min-h-0 min-w-0 flex-1 overflow-hidden">
          <LayersPanel
            pages={pages}
            activePageId={activePageId}
            layers={layers}
            selectedLayerId={selectedLayerId}
            selectedLayerIds={selectedLayerIds}
            onSelectPage={onSelectPage}
            onRenamePage={onRenamePage}
            onMovePage={onMovePage}
            onAddPage={onAddPage}
            onDuplicatePage={onDuplicatePage}
            onDeletePage={onDeletePage}
            onSelectLayer={onSelectLayer}
            onSelectLayers={onSelectLayers}
            onUpdateLayer={onUpdateLayer}
          />
        </TabsContent>

        <TabsContent value="components" className="m-0 min-h-0 min-w-0 flex-1 overflow-hidden">
          <ComponentsPanel
            document={document}
            components={components}
            pages={pages}
            libraryMetadata={libraryMetadata}
            libraryStatus={libraryStatus}
            pendingLibraryComponentUpdates={pendingLibraryComponentUpdates}
            canCreateVariant={canCreateVariant}
            onUpdateLibraryMetadata={onUpdateLibraryMetadata}
            onPublishLibrary={onPublishLibrary}
            onExportLibrary={onExportLibrary}
            onExportDesignSystemPackage={onExportDesignSystemPackage}
            onImportLibrary={onImportLibrary}
            onAcceptLibraryUpdate={onAcceptLibraryUpdate}
            onDetachLibraryComponent={onDetachLibraryComponent}
            onInsertComponent={onInsertComponent}
            onCreateVariant={onCreateVariant}
            onRenameComponent={onRenameComponent}
            onRenameVariant={onRenameVariant}
            onAddPropertyDefinition={onAddPropertyDefinition}
            onUpdatePropertyDefinition={onUpdatePropertyDefinition}
            onDeletePropertyDefinition={onDeletePropertyDefinition}
            onUpdateSlot={onUpdateSlot}
            onDeleteComponent={onDeleteComponent}
            onDeleteVariant={onDeleteVariant}
            onRepairComponentReferences={onRepairComponentReferences}
            onResetComponentInstance={onResetComponentInstance}
            onSelectLayers={onSelectLayers}
            onBindMatchingComponentVariables={onBindMatchingComponentVariables}
            onRemoveStaleComponentVariableBindings={
              onRemoveStaleComponentVariableBindings
            }
          />
        </TabsContent>

        <TabsContent value="comments" className="m-0 min-h-0 min-w-0 flex-1 overflow-hidden">
          <CommentsPanel
            comments={comments}
            mentionKeys={mentionKeys}
            currentUserName={currentUserName}
            currentUserEmail={currentUserEmail}
            notificationPreferences={notificationPreferences}
            notificationDeliveries={notificationDeliveries}
            selectedCommentId={selectedCommentId}
            onSelectComment={onSelectComment}
            onUpdateComment={onUpdateComment}
            onUpdateComments={onUpdateComments}
            onRemoveComment={onRemoveComment}
            onToggleCommentReaction={onToggleCommentReaction}
            onAssignComment={onAssignComment}
            onClearCommentAssignment={onClearCommentAssignment}
            onAddCommentReply={onAddCommentReply}
            onUpdateCommentReply={onUpdateCommentReply}
            onRemoveCommentReply={onRemoveCommentReply}
            onUpdateNotificationPreferences={onUpdateNotificationPreferences}
          />
        </TabsContent>

        <TabsContent value="extensions" className="m-0 min-h-0 min-w-0 flex-1 overflow-hidden">
          <ExtensionsPanel
            activeFileId={activeFileId}
            activeFileName={
              files.find((file) => file.id === activeFileId)?.name ??
              "Untitled design"
            }
            document={document}
            files={files}
            versions={versions}
            collaborationPresence={collaborationPresence}
            page={{ ...activePage, layers, comments }}
            selectedLayerIds={selectedLayerIds}
            toolShortcuts={toolShortcuts}
            commandPaletteCommands={commandPaletteCommands}
            pluginGrants={pluginGrants}
            pluginApprovals={pluginApprovals}
            pluginRunHistory={pluginRunHistory}
            onSelectLayers={onSelectLayers}
            onUpdateToolShortcut={onUpdateToolShortcut}
            onReplaceToolShortcuts={onReplaceToolShortcuts}
            onReplacePluginGrants={onReplacePluginGrants}
            onApprovePlugin={onApprovePlugin}
            onRecordPluginRun={onRecordPluginRun}
            onReplayPluginApprovals={onReplayPluginApprovals}
            onUpdateLayers={onUpdateLayers}
            onUpdateComments={onUpdateComments}
            onSetPrototypeStartPage={onSetPrototypeStartPage}
            onSavePerformanceBaseline={onSavePerformanceBaseline}
            onRemovePerformanceBaseline={onRemovePerformanceBaseline}
            onUpdateVariableSystem={onUpdateVariableSystem}
            onRecordActivity={onRecordExtensionActivity}
          />
        </TabsContent>

        <TabsContent value="activity" className="m-0 min-h-0 min-w-0 flex-1 overflow-hidden">
          <ActivityPanel
            events={activityEvents}
            onClearActivity={onClearActivity}
            onRecordActivity={onRecordExtensionActivity}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function SidebarTabTrigger({
  value,
  label,
  children,
}: {
  value: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TabsTrigger
          value={value}
          className="relative h-7 min-w-0 cursor-pointer rounded-md px-0"
          aria-label={label}
        >
          {children}
          <span className="sr-only">{label}</span>
        </TabsTrigger>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
