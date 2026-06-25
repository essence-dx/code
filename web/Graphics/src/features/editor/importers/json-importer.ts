import type {
  EditorPluginApprovalRecord,
  EditorPluginPermission,
  EditorPluginRunHistoryEntry,
} from "@/features/editor/editor-plugin-api";
import type {
  DesignActivityEvent,
  DesignActivityKind,
  DesignAssetMetadata,
  DesignBranchMergeIntent,
  DesignBranchMetadata,
  DesignBranchStatus,
  DesignComment,
  DesignCommentNotificationDelivery,
  DesignCommentNotificationDeliveryStatus,
  DesignCommentNotificationKind,
  DesignCommentNotificationPreferences,
  DesignCommentReaction,
  DesignCommentReactionKind,
  DesignCommentReply,
  DesignCommentResolutionHistoryEntry,
  DesignAutoLayout,
  DesignCodeConnect,
  DesignComponent,
  DesignComponentPropertyDefinition,
  DesignComponentSlotType,
  DesignComponentVariant,
  DesignConstraints,
  DesignDevLink,
  DesignDocument,
  DesignEffectStyle,
  DesignCollaborationChatMessage,
  DesignCollaborationPresenceEvent,
  DesignCollaborationPresenceEventKind,
  DesignCollaborationRoomState,
  DesignCommandTelemetry,
  DesignExportPreset,
  DesignMergeReviewConflictFamily,
  DesignMergeReviewDecision,
  DesignMergeReviewRecord,
  DesignMergeReviewSectionDecision,
  DesignMergeReviewSectionId,
  DesignLayoutGrid,
  DesignLayoutSizing,
  DesignGroup,
  DesignGuide,
  DesignLayer,
  DesignLibraryComponentSource,
  DesignLibraryMetadata,
  DesignLayoutGridStyle,
  DesignLayoutPresetStyle,
  DesignPage,
  DesignPaint,
  DesignPaintStyle,
  DesignPerformanceBaselineMetrics,
  DesignPerformanceBaselineSnapshot,
  DesignPrototypeInteraction,
  DesignVariableCollection,
  DesignTextStyle,
  DesignVariableDefinition,
  DesignVariableMode,
  DesignWorkspaceSettings,
} from "@/features/editor/types";
import {
  ImportDiagnosticError,
  invalidDesignJsonReport,
} from "@/features/editor/importers/import-diagnostics";

type JsonRecord = Record<string, unknown>;

export function importDesignDocumentJson(source: string): DesignDocument {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch {
    throw new ImportDiagnosticError({
      title: "JSON could not be parsed",
      detectedKind: "json",
      issues: ["The file contains invalid JSON syntax."],
      hints: [
        "Re-export the design JSON from this editor.",
        "Check for trailing commas or truncated downloads.",
      ],
    });
  }

  if (!isDesignDocument(parsed)) {
    throw new ImportDiagnosticError(invalidDesignJsonReport(parsed));
  }

  return {
    ...parsed,
    updatedAt: new Date().toISOString(),
  };
}

function isDesignDocument(value: unknown): value is DesignDocument {
  if (!isRecord(value) || value.version !== 1) {
    return false;
  }

  if (
    !isString(value.activePageId) ||
    !Array.isArray(value.pages) ||
    !isStringMap(value.variables) ||
    (value.variableModes !== undefined &&
      !optionalArray(value.variableModes, isDesignVariableMode)) ||
    (value.activeVariableModeId !== undefined &&
      !isString(value.activeVariableModeId)) ||
    (value.variableDefinitions !== undefined &&
      !isVariableDefinitionMap(value.variableDefinitions)) ||
    (value.variableCollections !== undefined &&
      !isVariableCollectionMap(value.variableCollections)) ||
    !isComponentMap(value.components) ||
    (value.libraryMetadata !== undefined &&
      !isDesignLibraryMetadata(value.libraryMetadata)) ||
    (value.librarySubscriptions !== undefined &&
      !isLibraryMetadataMap(value.librarySubscriptions)) ||
    (value.pendingLibraryComponentUpdates !== undefined &&
      !isComponentMap(value.pendingLibraryComponentUpdates)) ||
    (value.layoutGridStyles !== undefined &&
      !isLayoutGridStyleMap(value.layoutGridStyles)) ||
    (value.paintStyles !== undefined && !isPaintStyleMap(value.paintStyles)) ||
    (value.textStyles !== undefined && !isTextStyleMap(value.textStyles)) ||
    (value.effectStyles !== undefined &&
      !isEffectStyleMap(value.effectStyles)) ||
    (value.layoutPresetStyles !== undefined &&
      !isLayoutPresetStyleMap(value.layoutPresetStyles)) ||
    (value.exportPresets !== undefined &&
      !isExportPresetMap(value.exportPresets)) ||
    (value.activityEvents !== undefined &&
      !optionalArray(value.activityEvents, isDesignActivityEvent)) ||
    (value.branchMetadata !== undefined &&
      !isDesignBranchMetadata(value.branchMetadata)) ||
    (value.mergeReviews !== undefined &&
      !optionalArray(value.mergeReviews, isDesignMergeReviewRecord)) ||
    (value.performanceBaselines !== undefined &&
      !optionalArray(
        value.performanceBaselines,
        isDesignPerformanceBaselineSnapshot,
      )) ||
    (value.collaborationRoom !== undefined &&
      !isDesignCollaborationRoomState(value.collaborationRoom)) ||
    (value.workspaceSettings !== undefined &&
      !isDesignWorkspaceSettings(value.workspaceSettings)) ||
    (value.commentNotificationPreferences !== undefined &&
      !isDesignCommentNotificationPreferences(
        value.commentNotificationPreferences,
      )) ||
    (value.notificationDeliveries !== undefined &&
      !optionalArray(
        value.notificationDeliveries,
        isDesignCommentNotificationDelivery,
      )) ||
    !isString(value.updatedAt)
  ) {
    return false;
  }

  return (
    value.pages.length > 0 &&
    value.pages.every(isDesignPage) &&
    value.pages.some((page) => page.id === value.activePageId)
  );
}

function isDesignPage(value: unknown): value is DesignPage {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.background) &&
    (value.prototypeStart === undefined ||
      typeof value.prototypeStart === "boolean") &&
    (value.facilitation === undefined ||
      isDesignFacilitationState(value.facilitation)) &&
    Array.isArray(value.layers) &&
    value.layers.every(isDesignLayer) &&
    optionalArray(value.groups, isDesignGroup) &&
    optionalArray(value.guides, isDesignGuide) &&
    optionalArray(value.comments, isDesignComment)
  );
}

function isDesignFacilitationState(
  value: unknown,
): value is DesignPage["facilitation"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.votingSession === undefined ||
    isDesignVotingSession(value.votingSession)
  ) && (
    value.reviewTimer === undefined ||
    isDesignReviewTimer(value.reviewTimer)
  );
}

function isDesignVotingSession(
  value: unknown,
): value is NonNullable<DesignPage["facilitation"]>["votingSession"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isNumber(value.voteBudget) &&
    (value.status === "open" || value.status === "closed") &&
    isString(value.startedAt) &&
    (value.closedAt === undefined || isString(value.closedAt))
  );
}

function isDesignReviewTimer(
  value: unknown,
): value is NonNullable<DesignPage["facilitation"]>["reviewTimer"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isNumber(value.durationMinutes) &&
    (value.status === "idle" ||
      value.status === "running" ||
      value.status === "paused" ||
      value.status === "finished") &&
    (value.startedAt === undefined || isString(value.startedAt)) &&
    (value.finishedAt === undefined || isString(value.finishedAt))
  );
}

function isDesignLayer(value: unknown): value is DesignLayer {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isLayerType(value.type) &&
    isString(value.name) &&
    (value.parentId === undefined || isString(value.parentId)) &&
    (value.groupId === undefined || isString(value.groupId)) &&
    (value.componentId === undefined || isString(value.componentId)) &&
    (value.componentVariantId === undefined ||
      isString(value.componentVariantId)) &&
    (value.componentLayerId === undefined || isString(value.componentLayerId)) &&
    (value.componentProperties === undefined ||
      isStringMap(value.componentProperties)) &&
    (value.componentSlotName === undefined || isString(value.componentSlotName)) &&
    (value.componentSlotType === undefined ||
      isComponentSlotType(value.componentSlotType)) &&
    isNumber(value.x) &&
    isNumber(value.y) &&
    isNumber(value.width) &&
    isNumber(value.height) &&
    isNumber(value.rotation) &&
    isNumber(value.opacity) &&
    typeof value.visible === "boolean" &&
    typeof value.locked === "boolean" &&
    (value.absolutePositioned === undefined ||
      typeof value.absolutePositioned === "boolean") &&
    (value.variableBindings === undefined ||
      isDesignVariableBindings(value.variableBindings)) &&
    (value.devLinks === undefined ||
      (Array.isArray(value.devLinks) && value.devLinks.every(isDesignDevLink))) &&
    (value.codeConnect === undefined ||
      isDesignCodeConnect(value.codeConnect)) &&
    (value.prototype === undefined || isDesignPrototype(value.prototype)) &&
    (value.connector === undefined || isDesignConnector(value.connector)) &&
    (value.stamp === undefined || isDesignStamp(value.stamp)) &&
    (value.inkPreset === undefined || isDesignInkPreset(value.inkPreset)) &&
    (value.assetMetadata === undefined ||
      isDesignAssetMetadata(value.assetMetadata)) &&
    (value.mask === undefined || isDesignLayerMask(value.mask)) &&
    (value.maskSource === undefined || typeof value.maskSource === "boolean") &&
    (value.fillRule === undefined || isFillRule(value.fillRule)) &&
    (value.textResizeMode === undefined ||
      isTextResizeMode(value.textResizeMode)) &&
    optionalArray(value.fillPaints, isDesignPaint) &&
    optionalArray(value.strokePaints, isDesignPaint) &&
    (value.autoLayout === undefined || isDesignAutoLayout(value.autoLayout)) &&
    (value.layoutSizing === undefined ||
      isDesignLayoutSizing(value.layoutSizing)) &&
    optionalArray(value.layoutGrids, isDesignLayoutGrid) &&
    (value.constraints === undefined || isDesignConstraints(value.constraints)) &&
    isString(value.fill) &&
    isString(value.stroke) &&
    isNumber(value.strokeWidth) &&
    isNumber(value.cornerRadius)
  );
}

function isDesignAssetMetadata(value: unknown): value is DesignAssetMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.libraryId === undefined || isString(value.libraryId)) &&
    (value.sourceName === undefined || isString(value.sourceName)) &&
    (value.sourceUrl === undefined || isString(value.sourceUrl)) &&
    (value.license === undefined || isString(value.license)) &&
    (value.hash === undefined || isString(value.hash)) &&
    (value.importedAt === undefined || isString(value.importedAt)) &&
    (value.replacementOf === undefined || isString(value.replacementOf))
  );
}

function isDesignLayerMask(value: unknown): value is DesignLayer["mask"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.kind === "rectangle" ||
      value.kind === "ellipse" ||
      value.kind === "path") &&
    isNumber(value.x) &&
    isNumber(value.y) &&
    isNumber(value.width) &&
    isNumber(value.height) &&
    (value.cornerRadius === undefined || isNumber(value.cornerRadius)) &&
    (value.pathData === undefined || isString(value.pathData)) &&
    (value.pathViewBox === undefined || isPathViewBox(value.pathViewBox)) &&
    (value.sourceLayerId === undefined || isString(value.sourceLayerId)) &&
    (value.sourceName === undefined || isString(value.sourceName))
  );
}

function isPathViewBox(value: unknown): value is NonNullable<DesignLayer["pathViewBox"]> {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumber(value.x) &&
    isNumber(value.y) &&
    isNumber(value.width) &&
    isNumber(value.height)
  );
}

function isDesignStamp(value: unknown): value is DesignLayer["stamp"] {
  if (!isRecord(value)) {
    return false;
  }

  return isStampKind(value.kind);
}

function isStampKind(value: unknown): value is NonNullable<DesignLayer["stamp"]>["kind"] {
  return (
    value === "approved" ||
    value === "question" ||
    value === "risk" ||
    value === "decision"
  );
}

function isDesignInkPreset(value: unknown): value is DesignLayer["inkPreset"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isInkPresetKind(value.kind) &&
    isString(value.color) &&
    isNumber(value.width) &&
    isNumber(value.opacity)
  );
}

function isInkPresetKind(
  value: unknown,
): value is NonNullable<DesignLayer["inkPreset"]>["kind"] {
  return value === "marker" || value === "highlighter";
}

function isDesignConnector(value: unknown): value is DesignLayer["connector"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.sourceLayerId) &&
    isString(value.targetLayerId) &&
    value.kind === "straight" &&
    (value.arrow === "end" || value.arrow === "none")
  );
}

function isDesignPaint(value: unknown): value is DesignPaint {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    (value.name === undefined || isString(value.name)) &&
    isString(value.value) &&
    typeof value.visible === "boolean" &&
    isNumber(value.opacity) &&
    (value.blendMode === undefined || isString(value.blendMode))
  );
}

function isDesignAutoLayout(value: unknown): value is DesignAutoLayout {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isAutoLayoutMode(value.mode) &&
    isNumber(value.gap) &&
    isNumber(value.paddingX) &&
    isNumber(value.paddingY) &&
    isAutoLayoutAlignment(value.align) &&
    (value.wrap === undefined || isAutoLayoutWrap(value.wrap))
  );
}

function isDesignLayoutSizing(value: unknown): value is DesignLayoutSizing {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isLayoutSizingMode(value.horizontal) &&
    isLayoutSizingMode(value.vertical)
  );
}

function isDesignLayoutGrid(value: unknown): value is DesignLayoutGrid {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isLayoutGridKind(value.kind) &&
    typeof value.visible === "boolean" &&
    isString(value.color) &&
    isNumber(value.opacity) &&
    isNumber(value.size) &&
    isNumber(value.count) &&
    isNumber(value.gutter) &&
    isNumber(value.margin) &&
    isLayoutGridAlignment(value.alignment)
  );
}

function isDesignLayoutGridStyle(
  value: unknown,
): value is DesignLayoutGridStyle {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isRecord(value.grid) &&
    isString(value.grid.name) &&
    isLayoutGridKind(value.grid.kind) &&
    isString(value.grid.color) &&
    isNumber(value.grid.opacity) &&
    isNumber(value.grid.size) &&
    isNumber(value.grid.count) &&
    isNumber(value.grid.gutter) &&
    isNumber(value.grid.margin) &&
    isLayoutGridAlignment(value.grid.alignment) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDesignPaintStyle(value: unknown): value is DesignPaintStyle {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.value) &&
    (value.blendMode === undefined || isString(value.blendMode)) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDesignTextStyle(value: unknown): value is DesignTextStyle {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.fontFamily) &&
    isNumber(value.fontSize) &&
    isNumber(value.fontWeight) &&
    isNumber(value.lineHeight) &&
    isNumber(value.letterSpacing) &&
    isTextAlign(value.textAlign) &&
    isString(value.textColor) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDesignEffectStyle(value: unknown): value is DesignEffectStyle {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    typeof value.shadowEnabled === "boolean" &&
    (value.shadowColor === undefined || isString(value.shadowColor)) &&
    (value.shadowX === undefined || isNumber(value.shadowX)) &&
    (value.shadowY === undefined || isNumber(value.shadowY)) &&
    (value.shadowBlur === undefined || isNumber(value.shadowBlur)) &&
    (value.shadowSpread === undefined || isNumber(value.shadowSpread)) &&
    (value.layerBlur === undefined || isNumber(value.layerBlur)) &&
    (value.backgroundBlur === undefined || isNumber(value.backgroundBlur)) &&
    typeof value.effectsVisible === "boolean" &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDesignLayoutPresetStyle(
  value: unknown,
): value is DesignLayoutPresetStyle {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    (value.autoLayout === undefined || isDesignAutoLayout(value.autoLayout)) &&
    isDesignLayoutSizing(value.layoutSizing) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDesignExportPreset(value: unknown): value is DesignExportPreset {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isDesignExportSettings(value.settings) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDesignExportSettings(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.formats) &&
    value.formats.every(isDesignExportFormat) &&
    typeof value.includeManifest === "boolean" &&
    isDesignExportScope(value.scope) &&
    isDesignExportScale(value.scale)
  );
}

function isDesignCollaborationRoomState(
  value: unknown,
): value is DesignCollaborationRoomState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === 1 &&
    Array.isArray(value.chatMessages) &&
    value.chatMessages.every(isDesignCollaborationChatMessage) &&
    Array.isArray(value.presenceEvents) &&
    value.presenceEvents.every(isDesignCollaborationPresenceEvent) &&
    isString(value.updatedAt)
  );
}

function isDesignCollaborationChatMessage(
  value: unknown,
): value is DesignCollaborationChatMessage {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.peerId) &&
    isString(value.name) &&
    (value.email === undefined ||
      value.email === null ||
      isString(value.email)) &&
    isString(value.color) &&
    isString(value.text) &&
    isNumber(value.createdAt)
  );
}

function isDesignCollaborationPresenceEvent(
  value: unknown,
): value is DesignCollaborationPresenceEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isDesignCollaborationPresenceEventKind(value.kind) &&
    (value.peerId === undefined || isString(value.peerId)) &&
    isString(value.peerName) &&
    (value.peerEmail === undefined ||
      value.peerEmail === null ||
      isString(value.peerEmail)) &&
    (value.color === undefined || isString(value.color)) &&
    (value.detail === undefined || isString(value.detail)) &&
    isNumber(value.createdAt)
  );
}

function isDesignVariableMode(value: unknown): value is DesignVariableMode {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value.id) && isString(value.name);
}

function isDesignVariableDefinition(
  value: unknown,
): value is DesignVariableDefinition {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isVariableType(value.type) &&
    (value.collectionId === undefined || isString(value.collectionId)) &&
    isStringMap(value.values) &&
    (value.aliasOf === undefined || isString(value.aliasOf)) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDesignVariableCollection(
  value: unknown,
): value is DesignVariableCollection {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isVariableScope(value.scope) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDesignVariableBindings(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([property, variableId]) =>
      isVariableBindableProperty(property) && isString(variableId),
  );
}

function isDesignConstraints(value: unknown): value is DesignConstraints {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isHorizontalConstraint(value.horizontal) &&
    isVerticalConstraint(value.vertical)
  );
}

function isDesignPrototype(
  value: unknown,
): value is DesignPrototypeInteraction {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.targetPageId) &&
    isPrototypeTrigger(value.trigger) &&
    (value.action === undefined || isPrototypeAction(value.action)) &&
    isPrototypeTransition(value.transition) &&
    isNumber(value.durationMs) &&
    (value.preserveScroll === undefined ||
      typeof value.preserveScroll === "boolean") &&
    (value.scrollBehavior === undefined ||
      isPrototypeScrollBehavior(value.scrollBehavior)) &&
    (value.overlayPosition === undefined ||
      isPrototypeOverlayPosition(value.overlayPosition)) &&
    (value.closeOnOutside === undefined ||
      typeof value.closeOnOutside === "boolean") &&
    (value.deviceFrame === undefined ||
      isPrototypeDeviceFrame(value.deviceFrame)) &&
    (value.smartAnimate === undefined ||
      typeof value.smartAnimate === "boolean")
  );
}

function isDesignCodeConnect(value: unknown): value is DesignCodeConnect {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.componentName) &&
    isString(value.importPath) &&
    (value.props === undefined || isString(value.props))
  );
}

function isDesignDevLink(value: unknown): value is DesignDevLink {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isDesignDevLinkKind(value.kind) &&
    isString(value.url) &&
    (value.label === undefined || isString(value.label))
  );
}

function isDesignComponent(value: unknown): value is DesignComponent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isNumber(value.width) &&
    isNumber(value.height) &&
    Array.isArray(value.layers) &&
    value.layers.every(isDesignLayer) &&
    (value.librarySource === undefined ||
      isDesignLibraryComponentSource(value.librarySource)) &&
    (value.propertyDefinitions === undefined ||
      isComponentPropertyDefinitionMap(value.propertyDefinitions)) &&
    optionalArray(value.variants, isDesignComponentVariant) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDesignLibraryMetadata(
  value: unknown,
): value is DesignLibraryMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.teamName) &&
    (value.description === undefined || isString(value.description)) &&
    isNumber(value.version) &&
    isNumber(value.componentCount) &&
    (value.componentSignatures === undefined ||
      isStringMap(value.componentSignatures)) &&
    (value.publishedAt === undefined || isString(value.publishedAt)) &&
    isString(value.updatedAt)
  );
}

function isDesignLibraryComponentSource(
  value: unknown,
): value is DesignLibraryComponentSource {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.libraryId) &&
    isString(value.libraryName) &&
    isString(value.teamName) &&
    isString(value.remoteComponentId) &&
    isNumber(value.version) &&
    isString(value.signature) &&
    (value.availableVersion === undefined ||
      isNumber(value.availableVersion)) &&
    (value.availableSignature === undefined ||
      isString(value.availableSignature)) &&
    isLibrarySourceStatus(value.status) &&
    (value.reviewedAt === undefined || isString(value.reviewedAt)) &&
    isString(value.updatedAt)
  );
}

function isDesignComponentPropertyDefinition(
  value: unknown,
): value is DesignComponentPropertyDefinition {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isComponentPropertyType(value.type) &&
    isString(value.defaultValue) &&
    optionalArray(value.options, isString) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDesignComponentVariant(
  value: unknown,
): value is DesignComponentVariant {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isStringMap(value.properties) &&
    isNumber(value.width) &&
    isNumber(value.height) &&
    Array.isArray(value.layers) &&
    value.layers.every(isDesignLayer) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDesignGroup(value: unknown): value is DesignGroup {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    Array.isArray(value.layerIds) &&
    value.layerIds.every(isString) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDesignGuide(value: unknown): value is DesignGuide {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    (value.orientation === "vertical" || value.orientation === "horizontal") &&
    isNumber(value.position) &&
    isString(value.createdAt)
  );
}

function isDesignComment(value: unknown): value is DesignComment {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isNumber(value.x) &&
    isNumber(value.y) &&
    isString(value.text) &&
    optionalArray(value.mentions, isString) &&
    optionalArray(value.reactions, isDesignCommentReaction) &&
    (value.assigneeName === undefined || isString(value.assigneeName)) &&
    (value.assigneeEmail === undefined ||
      value.assigneeEmail === null ||
      isString(value.assigneeEmail)) &&
    (value.dueDate === undefined ||
      value.dueDate === null ||
      isString(value.dueDate)) &&
    optionalArray(
      value.resolutionHistory,
      isDesignCommentResolutionHistoryEntry,
    ) &&
    typeof value.resolved === "boolean" &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    optionalArray(value.replies, isDesignCommentReply)
  );
}

function isDesignCommentResolutionHistoryEntry(
  value: unknown,
): value is DesignCommentResolutionHistoryEntry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    (value.status === "resolved" || value.status === "reopened") &&
    isString(value.actorName) &&
    (value.actorEmail === undefined ||
      value.actorEmail === null ||
      isString(value.actorEmail)) &&
    isString(value.createdAt)
  );
}

function isDesignCommentReaction(
  value: unknown,
): value is DesignCommentReaction {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isDesignCommentReactionKind(value.kind) &&
    isString(value.actorName) &&
    (value.actorEmail === undefined ||
      value.actorEmail === null ||
      isString(value.actorEmail)) &&
    isString(value.createdAt)
  );
}

function isDesignCommentReply(value: unknown): value is DesignCommentReply {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.text) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDesignActivityEvent(value: unknown): value is DesignActivityEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isDesignActivityKind(value.kind) &&
    isString(value.actorName) &&
    (value.actorEmail === undefined ||
      value.actorEmail === null ||
      isString(value.actorEmail)) &&
    isString(value.label) &&
    (value.detail === undefined || isString(value.detail)) &&
    (value.targetId === undefined || isString(value.targetId)) &&
    (value.telemetry === undefined ||
      isDesignCommandTelemetry(value.telemetry)) &&
    isString(value.createdAt)
  );
}

function isDesignCommandTelemetry(
  value: unknown,
): value is DesignCommandTelemetry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isDesignCommandTelemetryArea(value.area) &&
    isString(value.command) &&
    isNumber(value.durationMs) &&
    isNumber(value.thresholdMs) &&
    isDesignCommandTelemetryStatus(value.status) &&
    (value.itemCount === undefined || isNumber(value.itemCount)) &&
    (value.detail === undefined || isString(value.detail)) &&
    isString(value.capturedAt)
  );
}

function isDesignCommandTelemetryArea(
  value: unknown,
): value is DesignCommandTelemetry["area"] {
  return (
    value === "canvas" ||
    value === "export" ||
    value === "import" ||
    value === "collaboration"
  );
}

function isDesignCommandTelemetryStatus(
  value: unknown,
): value is DesignCommandTelemetry["status"] {
  return value === "ok" || value === "failed";
}

function isDesignBranchMetadata(
  value: unknown,
): value is DesignBranchMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.branchFileId) &&
    isString(value.branchName) &&
    isDesignBranchStatus(value.status) &&
    isDesignBranchMergeIntent(value.mergeIntent) &&
    isString(value.sourceFileId) &&
    isString(value.sourceFileName) &&
    isString(value.sourceVersionId) &&
    isString(value.sourceVersionName) &&
    (value.restorePointVersionId === null ||
      isString(value.restorePointVersionId)) &&
    isString(value.restorePointName) &&
    isString(value.createdByName) &&
    isString(value.createdByEmail) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    (value.targetFileId === undefined ||
      value.targetFileId === null ||
      isString(value.targetFileId)) &&
    (value.targetFileName === undefined ||
      value.targetFileName === null ||
      isString(value.targetFileName)) &&
    (value.mergeNotes === undefined ||
      value.mergeNotes === null ||
      isString(value.mergeNotes))
  );
}

function isDesignBranchStatus(value: unknown): value is DesignBranchStatus {
  return value === "active" || value === "merged" || value === "abandoned";
}

function isDesignBranchMergeIntent(
  value: unknown,
): value is DesignBranchMergeIntent {
  return (
    value === "exploration" ||
    value === "review" ||
    value === "hotfix" ||
    value === "release-candidate"
  );
}

function isDesignMergeReviewRecord(
  value: unknown,
): value is DesignMergeReviewRecord {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.sourceVersionId) &&
    isString(value.sourceVersionName) &&
    isString(value.reviewerName) &&
    (value.reviewerEmail === undefined ||
      value.reviewerEmail === null ||
      isString(value.reviewerEmail)) &&
    (value.notes === null || isString(value.notes)) &&
    Array.isArray(value.decisions) &&
    value.decisions.every(isDesignMergeReviewSectionDecision) &&
    Array.isArray(value.acceptedSectionIds) &&
    value.acceptedSectionIds.every(isDesignMergeReviewSectionId) &&
    Array.isArray(value.keptSectionIds) &&
    value.keptSectionIds.every(isDesignMergeReviewSectionId) &&
    Array.isArray(value.conflictFamilies) &&
    value.conflictFamilies.every(isDesignMergeReviewConflictFamily) &&
    (value.rollbackVersionId === null || isString(value.rollbackVersionId)) &&
    isString(value.createdAt)
  );
}

function isDesignMergeReviewSectionDecision(
  value: unknown,
): value is DesignMergeReviewSectionDecision {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isDesignMergeReviewSectionId(value.sectionId) &&
    isString(value.label) &&
    isDesignMergeReviewDecision(value.decision) &&
    typeof value.changed === "boolean" &&
    isNumber(value.currentCount) &&
    isNumber(value.incomingCount)
  );
}

function isDesignMergeReviewSectionId(
  value: unknown,
): value is DesignMergeReviewSectionId {
  return (
    value === "pages" ||
    value === "components" ||
    value === "variables" ||
    value === "styles" ||
    value === "libraries"
  );
}

function isDesignMergeReviewDecision(
  value: unknown,
): value is DesignMergeReviewDecision {
  return value === "accept-incoming" || value === "keep-current";
}

function isDesignMergeReviewConflictFamily(
  value: unknown,
): value is DesignMergeReviewConflictFamily {
  return (
    value === "layout" ||
    value === "design-system" ||
    value === "handoff" ||
    value === "library"
  );
}

function isDesignPerformanceBaselineSnapshot(
  value: unknown,
): value is DesignPerformanceBaselineSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.activePageId) &&
    isString(value.activePageName) &&
    isString(value.documentHash) &&
    isDesignPerformanceBaselineMetrics(value.metrics) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDesignPerformanceBaselineMetrics(
  value: unknown,
): value is DesignPerformanceBaselineMetrics {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumber(value.documentScore) &&
    isNumber(value.pageCount) &&
    isNumber(value.documentLayerCount) &&
    isNumber(value.hiddenLayerCount) &&
    isNumber(value.effectLayerCount) &&
    isNumber(value.imageLayerCount) &&
    isNumber(value.vectorLayerCount) &&
    isNumber(value.indexedLayerCount) &&
    isNumber(value.serializedBytes) &&
    isNumber(value.activePageScore) &&
    isNumber(value.activeVisibleLayerCount) &&
    isNumber(value.activeSelectableLayerCount) &&
    isNumber(value.activeRenderCost) &&
    isNumber(value.activeEffectLayerCount) &&
    isNumber(value.activeCompositedLayerCount) &&
    isNumber(value.activeMaskedLayerCount) &&
    isNumber(value.activeVectorCommandCount) &&
    isNumber(value.activeLargeLayerCount) &&
    isNumber(value.safeModeScore) &&
    isNumber(value.safeModeHiddenLayerCount)
  );
}

function isDesignCommentNotificationPreferences(
  value: unknown,
): value is DesignCommentNotificationPreferences {
  return (
    isRecord(value) &&
    typeof value.enabled === "boolean" &&
    typeof value.newComments === "boolean" &&
    typeof value.replies === "boolean" &&
    typeof value.assignments === "boolean" &&
    typeof value.mentions === "boolean" &&
    typeof value.reactions === "boolean" &&
    typeof value.acknowledgements === "boolean" &&
    optionalArray(value.mutedEmails, isString) &&
    isString(value.updatedAt)
  );
}

function isDesignWorkspaceSettings(
  value: unknown,
): value is DesignWorkspaceSettings {
  return (
    isRecord(value) &&
    value.version === 1 &&
    (value.toolShortcuts === undefined || isStringMap(value.toolShortcuts)) &&
    (value.pluginGrants === undefined || isBooleanMap(value.pluginGrants)) &&
    (value.pluginApprovals === undefined ||
      isPluginApprovalRecordMap(value.pluginApprovals)) &&
    (value.pluginRunHistory === undefined ||
      optionalArray(value.pluginRunHistory, isPluginRunHistoryEntry)) &&
    isString(value.updatedAt) &&
    (value.updatedBy === undefined ||
      value.updatedBy === null ||
      isString(value.updatedBy))
  );
}

function isDesignCommentNotificationDelivery(
  value: unknown,
): value is DesignCommentNotificationDelivery {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.eventId) &&
    isDesignCommentNotificationKind(value.kind) &&
    isString(value.recipientEmail) &&
    isString(value.actorName) &&
    isString(value.fileName) &&
    isString(value.pageName) &&
    isString(value.commentId) &&
    (value.replyId === undefined || isString(value.replyId)) &&
    isDesignCommentNotificationDeliveryStatus(value.status) &&
    (value.reason === undefined || isString(value.reason)) &&
    isString(value.createdAt) &&
    (value.deliveredAt === undefined || isString(value.deliveredAt))
  );
}

function isPluginApprovalRecordMap(value: unknown) {
  return isRecord(value) && Object.values(value).every(isPluginApprovalRecord);
}

function isPluginApprovalRecord(
  value: unknown,
): value is EditorPluginApprovalRecord {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.pluginId) &&
    isString(value.pluginName) &&
    isString(value.manifestVersion) &&
    Array.isArray(value.permissions) &&
    value.permissions.every(isEditorPluginPermission) &&
    Array.isArray(value.grantKeys) &&
    value.grantKeys.every(isString) &&
    isString(value.approvedAt) &&
    isString(value.approvedBy)
  );
}

function isPluginRunHistoryEntry(
  value: unknown,
): value is EditorPluginRunHistoryEntry {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.pluginId) &&
    isString(value.pluginName) &&
    isString(value.manifestVersion) &&
    (isString(value.pinnedManifestVersion) ||
      value.pinnedManifestVersion === null) &&
    (value.action === "approve" ||
      value.action === "replay" ||
      value.action === "run") &&
    (value.status === "completed" ||
      value.status === "blocked" ||
      value.status === "version-mismatch") &&
    isString(value.detail) &&
    isString(value.actorEmail) &&
    isString(value.createdAt)
  );
}

function isEditorPluginPermission(
  value: unknown,
): value is EditorPluginPermission {
  return (
    value === "inspect-document" ||
    value === "select-layers" ||
    value === "write-layer-state"
  );
}

function isDesignCommentNotificationKind(
  value: unknown,
): value is DesignCommentNotificationKind {
  return (
    value === "new-comment" ||
    value === "new-reply" ||
    value === "assignment" ||
    value === "mention" ||
    value === "reaction" ||
    value === "acknowledgement"
  );
}

function isDesignCommentNotificationDeliveryStatus(
  value: unknown,
): value is DesignCommentNotificationDeliveryStatus {
  return value === "sent" || value === "failed";
}

function isComponentMap(value: unknown) {
  return isRecord(value) && Object.values(value).every(isDesignComponent);
}

function isLibraryMetadataMap(value: unknown) {
  return (
    isRecord(value) && Object.values(value).every(isDesignLibraryMetadata)
  );
}

function isComponentPropertyDefinitionMap(value: unknown) {
  return (
    isRecord(value) &&
    Object.values(value).every(isDesignComponentPropertyDefinition)
  );
}

function isLayoutGridStyleMap(value: unknown) {
  return (
    isRecord(value) && Object.values(value).every(isDesignLayoutGridStyle)
  );
}

function isPaintStyleMap(value: unknown) {
  return isRecord(value) && Object.values(value).every(isDesignPaintStyle);
}

function isTextStyleMap(value: unknown) {
  return isRecord(value) && Object.values(value).every(isDesignTextStyle);
}

function isEffectStyleMap(value: unknown) {
  return isRecord(value) && Object.values(value).every(isDesignEffectStyle);
}

function isLayoutPresetStyleMap(value: unknown) {
  return (
    isRecord(value) && Object.values(value).every(isDesignLayoutPresetStyle)
  );
}

function isExportPresetMap(value: unknown) {
  return isRecord(value) && Object.values(value).every(isDesignExportPreset);
}

function isVariableDefinitionMap(value: unknown) {
  return (
    isRecord(value) && Object.values(value).every(isDesignVariableDefinition)
  );
}

function isVariableCollectionMap(value: unknown) {
  return (
    isRecord(value) && Object.values(value).every(isDesignVariableCollection)
  );
}

function isStringMap(value: unknown) {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

function isBooleanMap(value: unknown) {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "boolean")
  );
}

function optionalArray<T>(
  value: unknown,
  predicate: (item: unknown) => item is T,
) {
  return value === undefined || (Array.isArray(value) && value.every(predicate));
}

function isLayerType(value: unknown): value is DesignLayer["type"] {
  return (
    value === "frame" ||
    value === "rectangle" ||
    value === "ellipse" ||
    value === "image" ||
    value === "path" ||
    value === "text" ||
    value === "sticky"
  );
}

function isDesignActivityKind(value: unknown): value is DesignActivityKind {
  return (
    value === "page" ||
    value === "component" ||
    value === "library" ||
    value === "version" ||
    value === "branch" ||
    value === "comment" ||
    value === "extension" ||
    value === "export" ||
    value === "import"
  );
}

function isDesignExportFormat(value: unknown) {
  return (
    value === "json" ||
    value === "svg" ||
    value === "png" ||
    value === "jpg" ||
    value === "pdf"
  );
}

function isDesignExportScope(value: unknown) {
  return value === "page" || value === "selection";
}

function isDesignExportScale(value: unknown) {
  return value === 1 || value === 2 || value === 3;
}

function isDesignCollaborationPresenceEventKind(
  value: unknown,
): value is DesignCollaborationPresenceEventKind {
  return (
    value === "joined" ||
    value === "left" ||
    value === "chat" ||
    value === "spotlight-on" ||
    value === "spotlight-off" ||
    value === "followed" ||
    value === "unfollowed"
  );
}

function isDesignCommentReactionKind(
  value: unknown,
): value is DesignCommentReactionKind {
  return (
    value === "thumbs-up" ||
    value === "heart" ||
    value === "check" ||
    value === "eyes"
  );
}

function isComponentSlotType(value: unknown): value is DesignComponentSlotType {
  return (
    value === "content" ||
    value === "media" ||
    value === "container" ||
    value === "shape"
  );
}

function isDesignDevLinkKind(value: unknown): value is DesignDevLink["kind"] {
  return (
    value === "storybook" ||
    value === "github" ||
    value === "jira" ||
    value === "vscode" ||
    value === "docs"
  );
}

function isAutoLayoutMode(value: unknown): value is DesignAutoLayout["mode"] {
  return value === "horizontal" || value === "vertical";
}

function isAutoLayoutAlignment(
  value: unknown,
): value is DesignAutoLayout["align"] {
  return (
    value === "start" ||
    value === "center" ||
    value === "end" ||
    value === "stretch"
  );
}

function isAutoLayoutWrap(
  value: unknown,
): value is NonNullable<DesignAutoLayout["wrap"]> {
  return value === "nowrap" || value === "wrap";
}

function isLayoutSizingMode(
  value: unknown,
): value is DesignLayoutSizing["horizontal"] {
  return value === "fixed" || value === "hug" || value === "fill";
}

function isLayoutGridKind(value: unknown): value is DesignLayoutGrid["kind"] {
  return value === "grid" || value === "columns" || value === "rows";
}

function isLayoutGridAlignment(
  value: unknown,
): value is DesignLayoutGrid["alignment"] {
  return (
    value === "stretch" ||
    value === "start" ||
    value === "center" ||
    value === "end"
  );
}

function isTextAlign(value: unknown): value is DesignTextStyle["textAlign"] {
  return (
    value === "left" ||
    value === "center" ||
    value === "right" ||
    value === "justify"
  );
}

function isTextResizeMode(
  value: unknown,
): value is DesignLayer["textResizeMode"] {
  return value === "fixed" || value === "auto-width" || value === "auto-height";
}

function isFillRule(value: unknown): value is DesignLayer["fillRule"] {
  return value === "nonzero" || value === "evenodd";
}

function isVariableType(
  value: unknown,
): value is DesignVariableDefinition["type"] {
  return value === "color" || value === "number" || value === "text";
}

function isComponentPropertyType(
  value: unknown,
): value is DesignComponentPropertyDefinition["type"] {
  return (
    value === "variant" ||
    value === "text" ||
    value === "boolean" ||
    value === "number"
  );
}

function isVariableScope(value: unknown): value is DesignVariableCollection["scope"] {
  return (
    value === "paint" ||
    value === "text" ||
    value === "layout" ||
    value === "effect" ||
    value === "component" ||
    value === "prototype" ||
    value === "dev"
  );
}

function isVariableBindableProperty(value: string) {
  return (
    value === "fill" ||
    value === "stroke" ||
    value === "shadowColor" ||
    value === "textColor" ||
    value === "text" ||
    value === "cornerRadius" ||
    value === "strokeWidth" ||
    value === "opacity" ||
    value === "fontSize" ||
    value === "lineHeight" ||
    value === "letterSpacing" ||
    value === "shadowX" ||
    value === "shadowY" ||
    value === "shadowBlur" ||
    value === "shadowSpread" ||
    value === "layerBlur" ||
    value === "backgroundBlur" ||
    value === "autoLayoutGap" ||
    value === "autoLayoutPaddingX" ||
    value === "autoLayoutPaddingY"
  );
}

function isHorizontalConstraint(
  value: unknown,
): value is DesignConstraints["horizontal"] {
  return (
    value === "left" ||
    value === "right" ||
    value === "left-right" ||
    value === "center" ||
    value === "scale"
  );
}

function isVerticalConstraint(
  value: unknown,
): value is DesignConstraints["vertical"] {
  return (
    value === "top" ||
    value === "bottom" ||
    value === "top-bottom" ||
    value === "center" ||
    value === "scale"
  );
}

function isPrototypeTrigger(
  value: unknown,
): value is DesignPrototypeInteraction["trigger"] {
  return (
    value === "click" ||
    value === "hover" ||
    value === "drag" ||
    value === "delay"
  );
}

function isPrototypeTransition(
  value: unknown,
): value is DesignPrototypeInteraction["transition"] {
  return (
    value === "instant" ||
    value === "dissolve" ||
    value === "slide-left" ||
    value === "slide-right" ||
    value === "slide-up" ||
    value === "slide-down"
  );
}

function isPrototypeAction(
  value: unknown,
): value is DesignPrototypeInteraction["action"] {
  return value === "navigate" || value === "overlay";
}

function isPrototypeOverlayPosition(
  value: unknown,
): value is DesignPrototypeInteraction["overlayPosition"] {
  return (
    value === "center" ||
    value === "top" ||
    value === "bottom" ||
    value === "left" ||
    value === "right"
  );
}

function isPrototypeScrollBehavior(
  value: unknown,
): value is DesignPrototypeInteraction["scrollBehavior"] {
  return value === "reset" || value === "preserve" || value === "lock";
}

function isPrototypeDeviceFrame(
  value: unknown,
): value is DesignPrototypeInteraction["deviceFrame"] {
  return (
    value === "none" ||
    value === "phone" ||
    value === "tablet" ||
    value === "desktop"
  );
}

function isLibrarySourceStatus(
  value: unknown,
): value is DesignLibraryComponentSource["status"] {
  return (
    value === "synced" ||
    value === "update-available" ||
    value === "detached"
  );
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
