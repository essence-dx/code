import type { ProjectAssetManifest } from "@/features/assets/project-asset-manifest";

export type DesignPresetId =
  | "instagram-post"
  | "presentation"
  | "document"
  | "whiteboard"
  | "poster"
  | "infographic"
  | "resume"
  | "business-card"
  | "flyer"
  | "banner"
  | "spreadsheet"
  | "website"
  | "video"
  | "print-product"
  | "email-template"
  | "course"
  | "logo"
  | "custom";

export type ElementBase = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
  hidden?: boolean;
  groupId?: string;
  linkUrl?: string;
  workshopVotes?: number;
  workshopReactions?: WorkshopElementReactions;
  motionPreset?: LayerMotionPreset;
  motionStartSeconds?: number;
  motionDurationSeconds?: number;
  motionEasing?: LayerMotionEasing;
  motionKeyframes?: LayerMotionKeyframe[];
  motionGroupId?: string;
  motionPresetPackId?: LayerMotionPresetPackId;
};

export type FillStyleMode =
  | "solid"
  | "linear-gradient"
  | "radial-gradient"
  | "pattern"
  | "texture";

export type FillPatternKind = "diagonal-stripes" | "dot-grid" | "checker";

export type FillTextureKind = "paper" | "grain" | "linen";

export type FillStyleFields = {
  fillMode?: FillStyleMode;
  fillGradientFrom?: string;
  fillGradientTo?: string;
  fillGradientAngle?: number;
  fillPattern?: FillPatternKind;
  fillPatternColor?: string;
  fillPatternScale?: number;
  fillTexture?: FillTextureKind;
  fillTextureIntensity?: number;
};

export type LayerMotionPreset =
  | "none"
  | "fade"
  | "rise"
  | "slide-left"
  | "slide-right"
  | "zoom"
  | "pop";

export type LayerMotionEasing =
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out";

export type LayerMotionPresetPackId =
  | "soft-entrance"
  | "hero-pop"
  | "slide-story"
  | "focus-pulse"
  | "ken-burns";

export type LayerMotionKeyframe = {
  timeSeconds: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
};

export type TextElement = ElementBase & {
  type: "text";
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  color: string;
  textAlign: "left" | "center" | "right";
  letterSpacing: number;
  lineHeight: number;
  textCurveEnabled?: boolean;
  textCurveAmount?: number;
  textGradientEnabled?: boolean;
  textGradientFrom?: string;
  textGradientTo?: string;
  textGradientAngle?: number;
  textEffect?: "none" | "shadow" | "glow" | "outline";
  textEffectColor?: string;
  textEffectBlur?: number;
  textEffectOffsetX?: number;
  textEffectOffsetY?: number;
  textOutlineWidth?: number;
};

export type DocumentBlockKind =
  | "heading"
  | "subheading"
  | "paragraph"
  | "quote"
  | "page-break";

export type DocumentBlock = {
  id: string;
  kind: DocumentBlockKind;
  content: string;
  comment?: string;
};

export type DocumentElement = ElementBase & {
  type: "document";
  title: string;
  blocks: DocumentBlock[];
  columns: 1 | 2 | 3;
  columnGap: number;
  padding: number;
  fontFamily: string;
  textColor: string;
  headingColor: string;
  surfaceColor: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
  lineHeight: number;
};

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export type QrCodeElement = ElementBase & {
  type: "qr";
  qrValue: string;
  qrForeground: string;
  qrBackground: string;
  qrMargin: number;
  qrErrorCorrection: QrErrorCorrectionLevel;
};

export type TableElement = ElementBase & {
  type: "table";
  rows: number;
  columns: number;
  cells: string[];
  sheets?: TableSheet[];
  activeSheetId?: string;
  cellStyles?: Record<string, TableCellStyle>;
  dataSourceKind?: "csv-url" | "google-sheets" | "json-url";
  dataSourcePresetId?: string;
  dataSourceHeaderName?: string;
  dataSourceUrl?: string;
  dataSourceLastSyncedAt?: string;
  dataSourceStatus?: "synced" | "error";
  dataSourceMessage?: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  textColor: string;
  headerRow: boolean;
  headerFill: string;
  bodyFill: string;
  borderColor: string;
  borderWidth: number;
  cellPadding: number;
  filterQuery?: string;
  freezeHeaderRow?: boolean;
  sortColumnIndex?: number;
  sortDirection?: "asc" | "desc";
};

export type TableSheet = {
  id: string;
  name: string;
  rows: number;
  columns: number;
  cells: string[];
  cellStyles?: Record<string, TableCellStyle>;
  headerRow?: boolean;
  freezeHeaderRow?: boolean;
  filterQuery?: string;
  sortColumnIndex?: number;
  sortDirection?: "asc" | "desc";
};

export type TableCellStyle = {
  fill?: string;
  fontWeight?: number;
  textAlign?: "left" | "center" | "right";
  textColor?: string;
};

export type ChartType = "bar" | "line" | "donut";

export type ChartDataPoint = {
  label: string;
  value: number;
  color: string;
};

export type ChartElement = ElementBase & {
  type: "chart";
  chartType: ChartType;
  data: ChartDataPoint[];
  dataSourceTableId?: string;
  dataSourceLabelColumnIndex?: number;
  dataSourceValueColumnIndex?: number;
  dataSourceUseFilteredRows?: boolean;
  backgroundColor: string;
  textColor: string;
  axisColor: string;
  showAxis: boolean;
  showLabels: boolean;
  showValues: boolean;
  fontSize: number;
  strokeWidth: number;
  innerRadius: number;
};

export type FormFieldKind =
  | "input"
  | "textarea"
  | "checkbox"
  | "dropdown"
  | "button";

export type FormElement = ElementBase & {
  type: "form";
  fieldKind: FormFieldKind;
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  checked: boolean;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  textColor: string;
  surfaceColor: string;
  fieldColor: string;
  borderColor: string;
  accentColor: string;
  borderWidth: number;
  radius: number;
  padding: number;
};

export type EmbedMode = "card" | "iframe";

export type EmbedElement = ElementBase & {
  type: "embed";
  url: string;
  title: string;
  description: string;
  embedMode: EmbedMode;
  showUrl: boolean;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  textColor: string;
  surfaceColor: string;
  borderColor: string;
  accentColor: string;
  borderWidth: number;
  radius: number;
  padding: number;
};

export type TimerMode = "countdown" | "stopwatch";

export type TimerElement = ElementBase & {
  type: "timer";
  timerMode: TimerMode;
  label: string;
  durationSeconds: number;
  elapsedSeconds: number;
  running: boolean;
  startedAt: number | null;
  showLabel: boolean;
  showHours: boolean;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  textColor: string;
  surfaceColor: string;
  borderColor: string;
  accentColor: string;
  borderWidth: number;
  radius: number;
  padding: number;
};

export type ShapeElement = ElementBase &
  FillStyleFields & {
  type: "shape";
  shape: "rectangle" | "ellipse" | "line";
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
};

export type StickyNoteElement = ElementBase & {
  type: "sticky-note";
  content: string;
  fill: string;
  textColor: string;
  accentColor: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  radius: number;
};

export type ConnectorKind = "straight" | "elbow";
export type ConnectorMarker = "none" | "arrow" | "dot";
export type ConnectorStrokeStyle = "solid" | "dashed" | "dotted";
export type ConnectorLabelPosition = "start" | "center" | "end";
export type ConnectorLabelBackground = "none" | "paper" | "line";
export type ConnectorAnchor =
  | "auto"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "center";

export type ConnectorElement = ElementBase & {
  type: "connector";
  connectorKind: ConnectorKind;
  stroke: string;
  strokeWidth: number;
  strokeStyle: ConnectorStrokeStyle;
  startMarker: ConnectorMarker;
  endMarker: ConnectorMarker;
  label: string;
  labelColor: string;
  labelFontSize: number;
  labelPosition: ConnectorLabelPosition;
  labelBackground: ConnectorLabelBackground;
  startElementId?: string;
  endElementId?: string;
  startAnchor?: ConnectorAnchor;
  endAnchor?: ConnectorAnchor;
};

export type ImageMaskShape =
  | "rectangle"
  | "rounded"
  | "circle"
  | "diamond"
  | "arch";

export type ObjectRetouchTool = "erase" | "clone" | "heal";

export type PhotoSelectionMode =
  | "color-range"
  | "magic-brush"
  | "object-region";

export type PhotoSelectionPresetId =
  | "product-cutout"
  | "portrait-soft-mask"
  | "bright-subject"
  | "shadow-cleanup"
  | "web-ready";

export type ImageElement = ElementBase & {
  type: "image";
  src: string;
  alt: string;
  objectFit: "cover" | "contain";
  maskShape?: ImageMaskShape;
  maskRadius?: number;
  frameEnabled?: boolean;
  frameColor?: string;
  frameWidth?: number;
  cropEnabled?: boolean;
  cropScale?: number;
  cropX?: number;
  cropY?: number;
  filterBrightness?: number;
  filterContrast?: number;
  filterSaturation?: number;
  filterGrayscale?: number;
  filterBlur?: number;
  filterSharpen?: number;
  duotoneEnabled?: boolean;
  duotoneShadow?: string;
  duotoneHighlight?: string;
  duotoneIntensity?: number;
  photoSelectionMode?: PhotoSelectionMode;
  photoSelectionPresetId?: PhotoSelectionPresetId;
  photoSelectionBrushX?: number;
  photoSelectionBrushY?: number;
  photoSelectionBrushSize?: number;
  photoSelectionBrushRefine?: number;
  photoSelectionRegionX?: number;
  photoSelectionRegionY?: number;
  photoSelectionRegionWidth?: number;
  photoSelectionRegionHeight?: number;
  backgroundCutoutOriginalSrc?: string;
  backgroundCutoutEnabled?: boolean;
  backgroundCutoutColor?: string;
  backgroundCutoutTolerance?: number;
  backgroundCutoutFeather?: number;
  backgroundCutoutInvert?: boolean;
  objectRetouchOriginalSrc?: string;
  objectRetouchApplied?: boolean;
  objectRetouchTool?: ObjectRetouchTool;
  objectRetouchTargetX?: number;
  objectRetouchTargetY?: number;
  objectRetouchSourceX?: number;
  objectRetouchSourceY?: number;
  objectRetouchBrushSize?: number;
  objectRetouchSoftness?: number;
};

export type DrawTool = "pen" | "highlighter" | "eraser";

export type DrawPoint = {
  x: number;
  y: number;
};

export type DrawElement = ElementBase & {
  type: "draw";
  name: string;
  tool: DrawTool;
  points: DrawPoint[];
  stroke: string;
  strokeWidth: number;
  strokeOpacity: number;
};

export type VectorPathPreset = "curve" | "blob" | "wave";

export type BooleanShapeOperation =
  | "union"
  | "subtract"
  | "intersect"
  | "exclude";

export type SvgFillRule = "nonzero" | "evenodd";

export type VectorPathSegment = {
  id?: string;
  control1X: number;
  control1Y: number;
  control2X: number;
  control2Y: number;
  x: number;
  y: number;
};

export type VectorPathElement = ElementBase &
  FillStyleFields & {
  type: "path";
  name: string;
  pathPreset?: VectorPathPreset;
  startX: number;
  startY: number;
  segments: VectorPathSegment[];
  closed: boolean;
  fill: string;
  stroke: string;
  strokeWidth: number;
  customPathData?: string;
  fillRule?: SvgFillRule;
  booleanOperation?: BooleanShapeOperation;
  booleanSourceElementIds?: string[];
  booleanSourcePaths?: string[];
};

export type VideoElement = ElementBase & {
  type: "video";
  src: string;
  title: string;
  mimeType: string;
  objectFit: "cover" | "contain";
  showControls: boolean;
  muted: boolean;
  loop: boolean;
  autoplay: boolean;
  timelineStartSeconds: number;
  timelineDurationSeconds: number;
  trimStartSeconds: number;
  trimEndSeconds: number | null;
  volume: number;
  subtitleCues: MediaSubtitleCue[];
  transitionIn: VideoClipTransition;
  transitionOut: VideoClipTransition;
  transitionDurationSeconds: number;
};

export type VideoClipTransition = "none" | "fade" | "slide" | "zoom";

export type MediaSubtitleCue = {
  id?: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export type AudioElement = ElementBase & {
  type: "audio";
  src: string;
  title: string;
  mimeType: string;
  showControls: boolean;
  loop: boolean;
  timelineStartSeconds: number;
  timelineDurationSeconds: number;
  trimStartSeconds: number;
  trimEndSeconds: number | null;
  volume: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
  volumeKeyframes: MediaVolumeKeyframe[];
  beatMarkers: MediaBeatMarker[];
  beatSyncSuggestions: MediaBeatSyncSuggestion[];
  surfaceColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
  padding: number;
  sourceProvider?: string | null;
  sourceUrl?: string | null;
  authorName?: string | null;
  licenseName?: string | null;
  licenseUrl?: string | null;
  sourceBpm?: number | null;
};

export type MediaVolumeKeyframe = {
  timeSeconds: number;
  volume: number;
};

export type MediaBeatMarker = {
  timeSeconds: number;
  label?: string;
};

export type MediaBeatSyncSuggestion = {
  timeSeconds: number;
  label: string;
  confidence: number;
};

export type PdfElement = ElementBase & {
  type: "pdf";
  src: string;
  title: string;
  mimeType: string;
  pageNumber: number;
  showToolbar: boolean;
  surfaceColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
  padding: number;
};

export type SvgElement = ElementBase & {
  type: "svg";
  name: string;
  svgText: string;
  preserveColors: boolean;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
};

export type LottieElement = ElementBase & {
  type: "lottie";
  name: string;
  lottieJson: string;
  loop: boolean;
  autoplay: boolean;
  playbackSpeed: number;
  backgroundColor: string;
};

export type DesignElement =
  | TextElement
  | DocumentElement
  | ShapeElement
  | StickyNoteElement
  | ConnectorElement
  | ImageElement
  | DrawElement
  | VectorPathElement
  | VideoElement
  | AudioElement
  | PdfElement
  | SvgElement
  | LottieElement
  | QrCodeElement
  | TableElement
  | ChartElement
  | FormElement
  | EmbedElement
  | TimerElement;

export type DesignPage = {
  id: string;
  name: string;
  background: string;
  format?: DesignPresetId;
  width?: number;
  height?: number;
  notes?: string;
  websiteSeoTitle?: string;
  websiteSeoDescription?: string;
  websiteNavLabel?: string;
  websiteNavGroup?: string;
  websiteHideFromNavigation?: boolean;
  workshopSession?: WorkshopSessionState;
  transition?: PageTransition;
  audienceInteraction?: AudienceInteraction;
  elements: DesignElement[];
};

export type PageTransition = "none" | "fade" | "slide" | "zoom";

export type AudienceInteractionKind = "poll" | "quiz" | "qa";

export type AudienceInteraction = {
  id: string;
  kind: AudienceInteractionKind;
  enabled: boolean;
  prompt: string;
  options: string[];
  correctOptionIndex?: number;
};

export type WorkshopReactionKind = "insight" | "question" | "concern";

export type WorkshopElementReactions = Partial<
  Record<WorkshopReactionKind, number>
>;

export type WorkshopSessionStage = "planning" | "live" | "paused" | "recap";

export type WorkshopFacilitationPackId =
  | "design-sprint"
  | "retro"
  | "decision-room"
  | "content-planning";

export type WorkshopAgendaBlock = {
  id: string;
  title: string;
  minutes: number;
  prompt: string;
};

export type WorkshopBreakoutSection = {
  id: string;
  title: string;
  prompt: string;
  targetElementIds: string[];
};

export type WorkshopSessionState = {
  stage?: WorkshopSessionStage;
  votingOpen?: boolean;
  reactionsOpen?: boolean;
  participantCount?: number;
  facilitatorNote?: string;
  spotlightElementId?: string | null;
  facilitationPackId?: WorkshopFacilitationPackId;
  facilitatorScript?: string;
  agendaBlocks?: WorkshopAgendaBlock[];
  activeAgendaBlockId?: string | null;
  breakoutSections?: WorkshopBreakoutSection[];
  recapSummary?: string;
  appliedPackAt?: string;
};

export type DesignDocument = {
  version: 1;
  width: number;
  height: number;
  pages: DesignPage[];
  activePageId: string;
  metadata?: DesignDocumentMetadata;
};

export type DesignDocumentMetadata = {
  canvasMode?: "page" | "whiteboard";
  editorLocale?: "en" | "bn" | "es" | "fr" | "hi";
  projectAssetManifest?: ProjectAssetManifest;
  projectKnowledgePack?: ProjectKnowledgePack;
  commandAutomation?: EditorCommandAutomationState;
  templateSourceId?: string;
  templateSourceName?: string;
  templateLockAppliedAt?: string;
  templateLockSummary?: TemplateLockSummary;
  templateRemixProfileId?: string;
  templateRemixThemeId?: string;
  templateRemixContentPackId?: string;
  templateRemixCreatedAt?: string;
  sourceProjectId?: string;
  sourceProjectName?: string;
  variantProfileId?: string;
  variantName?: string;
  variantCreatedAt?: string;
  sourceWidth?: number;
  sourceHeight?: number;
};

export type EditorCommandMacroId =
  | "tidy-selected-layers"
  | "prepare-export"
  | "setup-publishing"
  | "run-qa-checks";

export type EditorCommandMacroCategory =
  | "batch"
  | "export"
  | "publishing"
  | "qa";

export type EditorCommandAutomationIssueSeverity =
  | "info"
  | "review"
  | "blocked";

export type EditorCommandAutomationIssue = {
  id: string;
  macroId: EditorCommandMacroId;
  severity: EditorCommandAutomationIssueSeverity;
  pageId?: string;
  pageName?: string;
  elementId?: string;
  message: string;
  fix: string;
};

export type EditorCommandAutomationRun = {
  id: string;
  macroId: EditorCommandMacroId;
  title: string;
  category: EditorCommandMacroCategory;
  ranAt: string;
  summary: string;
  changedElementIds: string[];
  issueCount: number;
};

export type EditorCommandAutomationState = {
  lastRunAt: string;
  runs: EditorCommandAutomationRun[];
  qaIssues: EditorCommandAutomationIssue[];
};

export type ProjectKnowledgeBrief = {
  title: string;
  goal: string;
  audiencePromise: string;
  successMetric: string;
  owner: string;
  dueDate: string;
};

export type ProjectKnowledgeAudienceProfile = {
  id: string;
  name: string;
  segment: string;
  need: string;
  objection: string;
  desiredAction: string;
};

export type ProjectKnowledgeConstraintKind =
  | "brand"
  | "legal"
  | "format"
  | "timeline"
  | "accessibility"
  | "custom";

export type ProjectKnowledgeConstraint = {
  id: string;
  label: string;
  kind: ProjectKnowledgeConstraintKind;
  detail: string;
  required: boolean;
};

export type ProjectKnowledgeReferenceKind =
  | "inspiration"
  | "source"
  | "competitor"
  | "asset"
  | "research"
  | "custom";

export type ProjectKnowledgeReference = {
  id: string;
  label: string;
  kind: ProjectKnowledgeReferenceKind;
  url: string;
  note: string;
};

export type ProjectKnowledgeDecisionLog = {
  id: string;
  title: string;
  decision: string;
  rationale: string;
  owner: string;
  decidedAt: string;
};

export type ProjectKnowledgePack = {
  brief: ProjectKnowledgeBrief;
  audienceProfiles: ProjectKnowledgeAudienceProfile[];
  constraints: ProjectKnowledgeConstraint[];
  references: ProjectKnowledgeReference[];
  decisionLogs: ProjectKnowledgeDecisionLog[];
  updatedAt: string;
};

export type TemplateLockSummary = {
  lockedElementCount: number;
  editableElementCount: number;
  rules: string[];
};

export type WebsiteSection = {
  id: string;
  anchorId: string;
  name: string;
  navigationLabel: string;
  navigationGroup: string;
  showInNavigation: boolean;
  seoTitle: string;
  seoDescription: string;
  background: string;
  width: number;
  height: number;
  elements: DesignElement[];
};

export type WebsiteNavigationStyle = "top" | "pills" | "side" | "hidden";

export type WebsiteModel = {
  version: 1;
  sourceProjectId: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  navigationStyle: WebsiteNavigationStyle;
  sections: WebsiteSection[];
};

export type ProjectSummary = {
  id: string;
  name: string;
  width: number;
  height: number;
  folderId: string | null;
  sourceProjectId: string | null;
  variantProfileId: string | null;
  variantName: string | null;
  thumbnail: string | null;
  publicShareId: string | null;
  editShareId: string | null;
  editSharePermission: SharePermission;
  approvalStatus: ApprovalStatus;
  starred: boolean;
  deletedAt: string | null;
  updatedAt: string;
  createdAt: string;
};

export type SharePermission = "view" | "comment" | "edit";

export type ProjectDetail = ProjectSummary & {
  document: DesignDocument;
};

export type ProjectVersionSummary = {
  id: string;
  projectId: string;
  name: string;
  thumbnail: string | null;
  createdAt: string;
};

export type ProjectCommentSummary = {
  id: string;
  projectId: string;
  userId: string;
  pageId: string;
  elementId: string | null;
  authorName: string;
  body: string;
  mentions: string[];
  reactions: ProjectCommentReactionSummary[];
  resolved: boolean;
  taskStatus: ReviewTaskStatus;
  taskAssigneeName: string | null;
  taskDueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommentReactionKind = "like" | "agree" | "love";

export type ReviewTaskStatus = "none" | "todo" | "in-progress" | "done";

export type ApprovalStatus =
  | "draft"
  | "in-review"
  | "changes-requested"
  | "approved";

export type TemplateMarketplaceStatus =
  | "draft"
  | "review"
  | "published"
  | "archived";

export type ProjectCommentReactionSummary = {
  kind: CommentReactionKind;
  count: number;
  reactedByMe: boolean;
};

export type ProjectPresenceSummary = {
  userId: string;
  userName: string;
  color: string;
  pageId: string;
  cursorX: number | null;
  cursorY: number | null;
  lastSeenAt: string;
};

export type ProjectFolderSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type DesignTemplateSummary = {
  id: string;
  name: string;
  creatorName: string | null;
  creatorEmail: string | null;
  width: number;
  height: number;
  thumbnail: string | null;
  isBrandTemplate: boolean;
  isTeamTemplate: boolean;
  approvalStatus: ApprovalStatus;
  marketplaceStatus: TemplateMarketplaceStatus;
  marketplaceCollection: string | null;
  marketplaceSeason: string | null;
  marketplaceReviewNote: string;
  marketplacePublishedAt: string | null;
  marketplaceUseCount: number;
  marketplaceViewCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DesignTemplateDetail = DesignTemplateSummary & {
  document: DesignDocument;
};

export type BrandColorSummary = {
  id: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type BrandLogoSummary = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  updatedAt: string;
};

export type BrandFontRole = "heading" | "subheading" | "body" | "caption";

export type BrandFontSummary = {
  id: string;
  role: BrandFontRole;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  createdAt: string;
  updatedAt: string;
};
