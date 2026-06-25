import type {
  EditorPluginApprovalRecord,
  EditorPluginRunHistoryEntry,
} from "@/features/editor/editor-plugin-api";

export type EditorTool =
  | "select"
  | "hand"
  | "pen"
  | "pencil"
  | "cutter"
  | "measure"
  | "frame"
  | "rectangle"
  | "ellipse"
  | "text"
  | "sticky"
  | "comment";

export type LayerType =
  | "frame"
  | "rectangle"
  | "ellipse"
  | "image"
  | "path"
  | "text"
  | "sticky";

export type DesignComponentSlotType =
  | "content"
  | "media"
  | "container"
  | "shape";

export type LayerAlignment =
  | "left"
  | "horizontal-center"
  | "right"
  | "top"
  | "vertical-center"
  | "bottom";

export type LayerDistribution = "horizontal" | "vertical";

export type StrokeLineCap = "butt" | "round" | "square";

export type StrokeLineJoin = "miter" | "round" | "bevel";

export type TextAlign = "left" | "center" | "right" | "justify";

export type DesignTextResizeMode = "fixed" | "auto-width" | "auto-height";

export type ImageFit = "cover" | "contain" | "fill";

export type FillRule = "nonzero" | "evenodd";

export type DesignAutoLayoutMode = "horizontal" | "vertical";

export type DesignAutoLayoutAlignment = "start" | "center" | "end" | "stretch";

export type DesignAutoLayoutWrap = "nowrap" | "wrap";

export type DesignLayoutSizingMode = "fixed" | "hug" | "fill";

export type DesignLayoutGridKind = "grid" | "columns" | "rows";

export type DesignLayoutGridAlignment = "stretch" | "start" | "center" | "end";

export type DesignHorizontalConstraint =
  | "left"
  | "right"
  | "left-right"
  | "center"
  | "scale";

export type DesignVerticalConstraint =
  | "top"
  | "bottom"
  | "top-bottom"
  | "center"
  | "scale";

export type DesignAutoLayout = {
  mode: DesignAutoLayoutMode;
  gap: number;
  paddingX: number;
  paddingY: number;
  align: DesignAutoLayoutAlignment;
  wrap?: DesignAutoLayoutWrap;
};

export type DesignLayoutSizing = {
  horizontal: DesignLayoutSizingMode;
  vertical: DesignLayoutSizingMode;
};

export type DesignLayoutGrid = {
  id: string;
  name: string;
  kind: DesignLayoutGridKind;
  visible: boolean;
  color: string;
  opacity: number;
  size: number;
  count: number;
  gutter: number;
  margin: number;
  alignment: DesignLayoutGridAlignment;
};

export type DesignLayoutGridStyle = {
  id: string;
  name: string;
  grid: Omit<DesignLayoutGrid, "id" | "visible">;
  createdAt: string;
  updatedAt: string;
};

export type DesignPaintStyle = {
  id: string;
  name: string;
  value: string;
  blendMode?: string;
  createdAt: string;
  updatedAt: string;
};

export type DesignPaint = {
  id: string;
  name?: string;
  value: string;
  visible: boolean;
  opacity: number;
  blendMode?: string;
};

export type DesignTextStyle = {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: TextAlign;
  textColor: string;
  createdAt: string;
  updatedAt: string;
};

export type DesignEffectStyle = {
  id: string;
  name: string;
  shadowEnabled: boolean;
  shadowColor?: string;
  shadowX?: number;
  shadowY?: number;
  shadowBlur?: number;
  shadowSpread?: number;
  layerBlur?: number;
  backgroundBlur?: number;
  effectsVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DesignLayoutPresetStyle = {
  id: string;
  name: string;
  autoLayout?: DesignAutoLayout;
  layoutSizing: DesignLayoutSizing;
  createdAt: string;
  updatedAt: string;
};

export type DesignExportFormat = "json" | "svg" | "png" | "jpg" | "pdf";

export type DesignExportScope = "page" | "selection";

export type DesignExportScale = 1 | 2 | 3;

export type DesignExportSettings = {
  formats: DesignExportFormat[];
  includeManifest: boolean;
  scope: DesignExportScope;
  scale: DesignExportScale;
};

export type DesignExportPreset = {
  id: string;
  name: string;
  settings: DesignExportSettings;
  createdAt: string;
  updatedAt: string;
};

export type DesignVariableType = "color" | "number" | "text";

export type DesignVariableScope =
  | "paint"
  | "text"
  | "layout"
  | "effect"
  | "component"
  | "prototype"
  | "dev";

export type DesignVariableMode = {
  id: string;
  name: string;
};

export type DesignVariableCollection = {
  id: string;
  name: string;
  scope: DesignVariableScope;
  createdAt: string;
  updatedAt: string;
};

export type DesignVariableDefinition = {
  id: string;
  name: string;
  type: DesignVariableType;
  collectionId?: string;
  values: Record<string, string>;
  aliasOf?: string;
  createdAt: string;
  updatedAt: string;
};

export type DesignVariableBindableProperty =
  | "fill"
  | "stroke"
  | "shadowColor"
  | "textColor"
  | "text"
  | "cornerRadius"
  | "strokeWidth"
  | "opacity"
  | "fontSize"
  | "lineHeight"
  | "letterSpacing"
  | "shadowX"
  | "shadowY"
  | "shadowBlur"
  | "shadowSpread"
  | "layerBlur"
  | "backgroundBlur"
  | "autoLayoutGap"
  | "autoLayoutPaddingX"
  | "autoLayoutPaddingY";

export type DesignVariableBindings = Partial<
  Record<DesignVariableBindableProperty, string>
>;

export type DesignConstraints = {
  horizontal: DesignHorizontalConstraint;
  vertical: DesignVerticalConstraint;
};

export type DesignDevLinkKind =
  | "storybook"
  | "github"
  | "jira"
  | "vscode"
  | "docs";

export type DesignDevLink = {
  kind: DesignDevLinkKind;
  url: string;
  label?: string;
};

export type DesignCodeConnect = {
  componentName: string;
  importPath: string;
  props?: string;
};

export type DesignPrototypeTrigger = "click" | "hover" | "drag" | "delay";

export type DesignPrototypeAction = "navigate" | "overlay";

export type DesignPrototypeTransition =
  | "instant"
  | "dissolve"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down";

export type DesignPrototypeOverlayPosition =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right";

export type DesignPrototypeScrollBehavior = "reset" | "preserve" | "lock";

export type DesignPrototypeDeviceFrame =
  | "none"
  | "phone"
  | "tablet"
  | "desktop";

export type DesignPrototypeInteraction = {
  targetPageId: string;
  trigger: DesignPrototypeTrigger;
  action?: DesignPrototypeAction;
  transition: DesignPrototypeTransition;
  durationMs: number;
  preserveScroll?: boolean;
  scrollBehavior?: DesignPrototypeScrollBehavior;
  overlayPosition?: DesignPrototypeOverlayPosition;
  closeOnOutside?: boolean;
  deviceFrame?: DesignPrototypeDeviceFrame;
  smartAnimate?: boolean;
};

export type DesignConnector = {
  sourceLayerId: string;
  targetLayerId: string;
  kind: "straight";
  arrow: "end" | "none";
};

export type DesignStampKind = "approved" | "question" | "risk" | "decision";

export type DesignStamp = {
  kind: DesignStampKind;
};

export type DesignInkPresetKind = "marker" | "highlighter";

export type DesignInkPreset = {
  kind: DesignInkPresetKind;
  color: string;
  width: number;
  opacity: number;
};

export type DesignLayerMask = {
  kind: "rectangle" | "ellipse" | "path";
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius?: number;
  pathData?: string;
  pathViewBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  sourceLayerId?: string;
  sourceName?: string;
};

export type DesignAssetMetadata = {
  libraryId?: string;
  sourceName?: string;
  sourceUrl?: string;
  license?: string;
  hash?: string;
  mimeType?: string;
  durationSeconds?: number;
  importedAt?: string;
  replacementOf?: string;
};

export type DesignLayer = {
  id: string;
  type: LayerType;
  name: string;
  parentId?: string;
  groupId?: string;
  componentId?: string;
  componentVariantId?: string;
  componentLayerId?: string;
  componentProperties?: Record<string, string>;
  componentSlotName?: string;
  componentSlotType?: DesignComponentSlotType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  readyForDev?: boolean;
  absolutePositioned?: boolean;
  variableBindings?: DesignVariableBindings;
  layoutSizing?: DesignLayoutSizing;
  layoutGrids?: DesignLayoutGrid[];
  constraints?: DesignConstraints;
  autoLayout?: DesignAutoLayout;
  devLinks?: DesignDevLink[];
  codeConnect?: DesignCodeConnect;
  prototype?: DesignPrototypeInteraction;
  connector?: DesignConnector;
  stamp?: DesignStamp;
  inkPreset?: DesignInkPreset;
  mask?: DesignLayerMask;
  maskSource?: boolean;
  clipContent?: boolean;
  blendMode?: string;
  fillPaints?: DesignPaint[];
  strokePaints?: DesignPaint[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDash?: string;
  strokeLineCap?: StrokeLineCap;
  strokeLineJoin?: StrokeLineJoin;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowX?: number;
  shadowY?: number;
  shadowBlur?: number;
  shadowSpread?: number;
  layerBlur?: number;
  backgroundBlur?: number;
  effectsVisible?: boolean;
  cornerRadius: number;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: TextAlign;
  textColor?: string;
  textResizeMode?: DesignTextResizeMode;
  imageSrc?: string;
  imageAlt?: string;
  imageFit?: ImageFit;
  assetMetadata?: DesignAssetMetadata;
  pathData?: string;
  fillRule?: FillRule;
  pathViewBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type DesignComponent = {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: DesignLayer[];
  librarySource?: DesignLibraryComponentSource;
  propertyDefinitions?: Record<string, DesignComponentPropertyDefinition>;
  variants?: DesignComponentVariant[];
  createdAt: string;
  updatedAt: string;
};

export type DesignLibraryMetadata = {
  id: string;
  name: string;
  teamName: string;
  description?: string;
  version: number;
  componentCount: number;
  componentSignatures?: Record<string, string>;
  publishedAt?: string;
  updatedAt: string;
};

export type DesignLibraryComponentSource = {
  libraryId: string;
  libraryName: string;
  teamName: string;
  remoteComponentId: string;
  version: number;
  signature: string;
  availableVersion?: number;
  availableSignature?: string;
  status: "synced" | "update-available" | "detached";
  reviewedAt?: string;
  updatedAt: string;
};

export type DesignComponentPropertyType =
  | "variant"
  | "text"
  | "boolean"
  | "number";

export type DesignComponentPropertyDefinition = {
  id: string;
  name: string;
  type: DesignComponentPropertyType;
  defaultValue: string;
  options?: string[];
  createdAt: string;
  updatedAt: string;
};

export type DesignComponentVariant = {
  id: string;
  name: string;
  properties: Record<string, string>;
  width: number;
  height: number;
  layers: DesignLayer[];
  createdAt: string;
  updatedAt: string;
};

export type DesignGroup = {
  id: string;
  name: string;
  layerIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type DesignGuide = {
  id: string;
  orientation: "vertical" | "horizontal";
  position: number;
  createdAt: string;
};

export type DesignVotingSession = {
  id: string;
  name: string;
  voteBudget: number;
  status: "open" | "closed";
  startedAt: string;
  closedAt?: string;
};

export type DesignReviewTimer = {
  id: string;
  name: string;
  durationMinutes: number;
  status: "idle" | "running" | "paused" | "finished";
  startedAt?: string;
  finishedAt?: string;
};

export type DesignFacilitationState = {
  votingSession?: DesignVotingSession;
  reviewTimer?: DesignReviewTimer;
};

export type DesignPage = {
  id: string;
  name: string;
  background: string;
  prototypeStart?: boolean;
  facilitation?: DesignFacilitationState;
  grid?: {
    visible: boolean;
    snap: boolean;
    objectSnap?: boolean;
    size: number;
  };
  layers: DesignLayer[];
  groups?: DesignGroup[];
  guides?: DesignGuide[];
  comments?: DesignComment[];
};

export type DesignComment = {
  id: string;
  x: number;
  y: number;
  text: string;
  mentions?: string[];
  reactions?: DesignCommentReaction[];
  assigneeName?: string;
  assigneeEmail?: string | null;
  dueDate?: string | null;
  resolutionHistory?: DesignCommentResolutionHistoryEntry[];
  replies?: DesignCommentReply[];
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DesignCommentResolutionHistoryEntry = {
  id: string;
  status: "resolved" | "reopened";
  actorName: string;
  actorEmail?: string | null;
  createdAt: string;
};

export type DesignCommentReactionKind =
  | "thumbs-up"
  | "heart"
  | "check"
  | "eyes";

export type DesignCommentReaction = {
  id: string;
  kind: DesignCommentReactionKind;
  actorName: string;
  actorEmail?: string | null;
  createdAt: string;
};

export type DesignCommentNotificationKind =
  | "new-comment"
  | "new-reply"
  | "assignment"
  | "mention"
  | "reaction"
  | "acknowledgement";

export type DesignCommentNotificationPreferences = {
  enabled: boolean;
  newComments: boolean;
  replies: boolean;
  assignments: boolean;
  mentions: boolean;
  reactions: boolean;
  acknowledgements: boolean;
  mutedEmails: string[];
  updatedAt: string;
};

export type DesignCommentNotificationDeliveryStatus =
  | "sent"
  | "failed";

export type DesignCommentNotificationDelivery = {
  id: string;
  eventId: string;
  kind: DesignCommentNotificationKind;
  recipientEmail: string;
  actorName: string;
  fileName: string;
  pageName: string;
  commentId: string;
  replyId?: string;
  status: DesignCommentNotificationDeliveryStatus;
  reason?: string;
  createdAt: string;
  deliveredAt?: string;
};

export type DesignCommentReply = {
  id: string;
  text: string;
  mentions?: string[];
  authorName?: string;
  createdAt: string;
  updatedAt: string;
};

export type DesignActivityKind =
  | "page"
  | "component"
  | "library"
  | "version"
  | "branch"
  | "comment"
  | "extension"
  | "export"
  | "import";

export type DesignCommandTelemetryArea =
  | "canvas"
  | "export"
  | "import"
  | "collaboration";

export type DesignCommandTelemetryStatus = "ok" | "failed";

export type DesignCommandTelemetry = {
  area: DesignCommandTelemetryArea;
  command: string;
  durationMs: number;
  thresholdMs: number;
  status: DesignCommandTelemetryStatus;
  itemCount?: number;
  detail?: string;
  capturedAt: string;
};

export type DesignActivityEvent = {
  id: string;
  kind: DesignActivityKind;
  actorName: string;
  actorEmail?: string | null;
  label: string;
  detail?: string;
  targetId?: string;
  telemetry?: DesignCommandTelemetry;
  createdAt: string;
};

export type DesignBranchMergeIntent =
  | "exploration"
  | "review"
  | "hotfix"
  | "release-candidate";

export type DesignBranchStatus = "active" | "merged" | "abandoned";

export type DesignBranchMetadata = {
  id: string;
  branchFileId: string;
  branchName: string;
  status: DesignBranchStatus;
  mergeIntent: DesignBranchMergeIntent;
  sourceFileId: string;
  sourceFileName: string;
  sourceVersionId: string;
  sourceVersionName: string;
  restorePointVersionId: string | null;
  restorePointName: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
  targetFileId?: string | null;
  targetFileName?: string | null;
  mergeNotes?: string | null;
};

export type DesignMergeReviewSectionId =
  | "pages"
  | "components"
  | "variables"
  | "styles"
  | "libraries";

export type DesignMergeReviewDecision = "accept-incoming" | "keep-current";

export type DesignMergeReviewConflictFamily =
  | "layout"
  | "design-system"
  | "handoff"
  | "library";

export type DesignMergeReviewSectionDecision = {
  sectionId: DesignMergeReviewSectionId;
  label: string;
  decision: DesignMergeReviewDecision;
  changed: boolean;
  currentCount: number;
  incomingCount: number;
};

export type DesignMergeReviewRecord = {
  id: string;
  sourceVersionId: string;
  sourceVersionName: string;
  reviewerName: string;
  reviewerEmail?: string | null;
  notes: string | null;
  decisions: DesignMergeReviewSectionDecision[];
  acceptedSectionIds: DesignMergeReviewSectionId[];
  keptSectionIds: DesignMergeReviewSectionId[];
  conflictFamilies: DesignMergeReviewConflictFamily[];
  rollbackVersionId: string | null;
  createdAt: string;
};

export type DesignPerformanceBaselineMetrics = {
  documentScore: number;
  pageCount: number;
  documentLayerCount: number;
  hiddenLayerCount: number;
  effectLayerCount: number;
  imageLayerCount: number;
  vectorLayerCount: number;
  indexedLayerCount: number;
  serializedBytes: number;
  activePageScore: number;
  activeVisibleLayerCount: number;
  activeSelectableLayerCount: number;
  activeRenderCost: number;
  activeEffectLayerCount: number;
  activeCompositedLayerCount: number;
  activeMaskedLayerCount: number;
  activeVectorCommandCount: number;
  activeLargeLayerCount: number;
  safeModeScore: number;
  safeModeHiddenLayerCount: number;
};

export type DesignPerformanceBaselineSnapshot = {
  id: string;
  name: string;
  activePageId: string;
  activePageName: string;
  documentHash: string;
  metrics: DesignPerformanceBaselineMetrics;
  createdAt: string;
  updatedAt: string;
};

export type DesignCollaborationChatMessage = {
  id: string;
  peerId: string;
  name: string;
  email?: string | null;
  color: string;
  text: string;
  createdAt: number;
};

export type DesignCollaborationPresenceEventKind =
  | "joined"
  | "left"
  | "chat"
  | "spotlight-on"
  | "spotlight-off"
  | "followed"
  | "unfollowed";

export type DesignCollaborationPresenceEvent = {
  id: string;
  kind: DesignCollaborationPresenceEventKind;
  peerId?: string;
  peerName: string;
  peerEmail?: string | null;
  color?: string;
  detail?: string;
  createdAt: number;
};

export type DesignCollaborationRoomState = {
  version: 1;
  chatMessages: DesignCollaborationChatMessage[];
  presenceEvents: DesignCollaborationPresenceEvent[];
  updatedAt: string;
};

export type DesignWorkspaceSettings = {
  version: 1;
  toolShortcuts?: Partial<Record<EditorTool, string>>;
  pluginGrants?: Record<string, boolean>;
  pluginApprovals?: Record<string, EditorPluginApprovalRecord>;
  pluginRunHistory?: EditorPluginRunHistoryEntry[];
  updatedAt: string;
  updatedBy?: string | null;
};

export type DesignDocument = {
  version: 1;
  activePageId: string;
  pages: DesignPage[];
  variables: Record<string, string>;
  variableModes?: DesignVariableMode[];
  activeVariableModeId?: string;
  variableDefinitions?: Record<string, DesignVariableDefinition>;
  variableCollections?: Record<string, DesignVariableCollection>;
  components: Record<string, DesignComponent>;
  libraryMetadata?: DesignLibraryMetadata;
  librarySubscriptions?: Record<string, DesignLibraryMetadata>;
  pendingLibraryComponentUpdates?: Record<string, DesignComponent>;
  layoutGridStyles?: Record<string, DesignLayoutGridStyle>;
  paintStyles?: Record<string, DesignPaintStyle>;
  textStyles?: Record<string, DesignTextStyle>;
  effectStyles?: Record<string, DesignEffectStyle>;
  layoutPresetStyles?: Record<string, DesignLayoutPresetStyle>;
  exportPresets?: Record<string, DesignExportPreset>;
  activityEvents?: DesignActivityEvent[];
  branchMetadata?: DesignBranchMetadata;
  mergeReviews?: DesignMergeReviewRecord[];
  performanceBaselines?: DesignPerformanceBaselineSnapshot[];
  collaborationRoom?: DesignCollaborationRoomState;
  workspaceSettings?: DesignWorkspaceSettings;
  commentNotificationPreferences?: DesignCommentNotificationPreferences;
  notificationDeliveries?: DesignCommentNotificationDelivery[];
  updatedAt: string;
};

export type CanvasView = {
  x: number;
  y: number;
  zoom: number;
};
