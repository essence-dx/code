export type SlideLayout =
  | "title"
  | "title-body"
  | "section"
  | "blank"
  | "two-content"
  | "comparison"
  | "quote"
  | "picture-caption"

export type SlideTransition = "none" | "fade" | "push" | "zoom"

export type ElementAnimation =
  | "none"
  | "fade"
  | "rise"
  | "zoom"
  | "wipe"
  | "flyLeft"
  | "flyRight"
  | "pulse"
  | "spin"
  | "growShrink"
  | "teeter"
  | "fadeOut"
  | "fadeOutDown"
  | "motionLeft"
  | "motionRight"
  | "motionCustom"

export type ElementAnimationTrigger =
  | "afterPrevious"
  | "onClick"
  | "withPrevious"

export type SlideElementType =
  | "title"
  | "text"
  | "shape"
  | "icon"
  | "image"
  | "video"
  | "audio"
  | "table"
  | "chart"

export type ImageFit = "contain" | "cover" | "fill"

export type ImageMask = "rectangle" | "rounded" | "circle" | "diamond"

export type ThemeName = "studio" | "midnight" | "paper" | "signal"

export type TextAlign = "left" | "center" | "right"

export type TextListStyle = "none" | "bullet" | "number"

export type TextFit = "clip" | "shrink"

export type FontFamily = "geist" | "system" | "serif" | "mono"

export type PlaceholderRole = "none" | "title" | "body" | "media" | "caption"

export type ShapeKind =
  | "rectangle"
  | "rounded"
  | "ellipse"
  | "diamond"
  | "triangle"
  | "pentagon"
  | "hexagon"
  | "parallelogram"
  | "trapezoid"
  | "rightArrow"
  | "chevron"
  | "plus"
  | "star"
  | "speechBubble"
  | "line"
  | "arrow"
  | "doubleArrow"
  | "elbowConnector"
  | "curvedConnector"

export type ShapeStrokeDash = "solid" | "dash" | "dot" | "dashDot"

export type ShapeArrowhead = "none" | "triangle" | "diamond" | "oval"

export type ChartType = "bar" | "horizontalBar" | "line" | "area" | "pie" | "donut"

export type TableStyle =
  | "plain"
  | "accent"
  | "dark"
  | "minimal"
  | "grid"
  | "executive"

export type TableVerticalAlign = "top" | "middle" | "bottom"

export type TableCellMerge = {
  id: string
  row: number
  column: number
  rowSpan: number
  columnSpan: number
}

export type TableCellStyle = {
  id: string
  row: number
  column: number
  rowSpan: number
  columnSpan: number
  background?: string
  borderColor?: string
  borderBottomColor?: string
  borderLeftColor?: string
  borderRightColor?: string
  borderTopColor?: string
  color?: string
  fontWeight?: 400 | 500 | 600 | 700
}

export type MediaCaptionCue = {
  id: string
  startSeconds: number
  endSeconds: number
  text: string
}

export type IconName =
  | "sparkle"
  | "check"
  | "bolt"
  | "heart"
  | "star"
  | "home"
  | "search"
  | "lock"
  | "cloud"
  | "chart"
  | "user"
  | "link"

export type ChartDatum = {
  label: string
  value: number
  color: string
}

export type ChartSeriesDatum = {
  label: string
  value: number
}

export type ChartSeries = {
  id: string
  name: string
  color: string
  data: ChartSeriesDatum[]
}

export type DeckAssetType = "image"
export type DeckAssetStorage = "inline" | "remote"

export type DeckAsset = {
  id: string
  type: DeckAssetType
  name: string
  mimeType: string
  dataUrl: string
  storage: DeckAssetStorage
  remoteUrl: string
  sizeBytes: number
  createdAt: string
}

export type DeckLayoutPresetId = `deck-layout:${string}`

export type DeckLayoutPresetSlot = {
  type: SlideElementType
  placeholderRole: PlaceholderRole
  x: number
  y: number
  width: number
  height: number
  content: string
  fontSize: number
  fontFamily: FontFamily
  fontWeight: 400 | 500 | 600 | 700
  textAlign: TextAlign
  lineHeight: number
  listStyle: TextListStyle
  textFit: TextFit
  textColumns: number
  color: string
  background: string
  radius: number
  fit: ImageFit
  alt: string
}

export type DeckLayoutPreset = {
  id: DeckLayoutPresetId
  label: string
  description: string
  createdAt: string
  lastUsedAt?: string
  slots: DeckLayoutPresetSlot[]
  useCount?: number
}

export type OfficeThemeColor = {
  key: string
  color: string
}

export type OfficeThemeMetadata = {
  source: "manual" | "pptx"
  name: string
  colorSchemeName: string
  colors: OfficeThemeColor[]
  majorFont: string
  minorFont: string
  slideMasterCount: number
  slideLayoutCount: number
  placeholderDefaultCount: number
  importedAt: string
}

export type DeckMaster = {
  showFooter: boolean
  footerText: string
  showDate: boolean
  showSlideNumbers: boolean
  color: string
  fontSize: number
  fontFamily: FontFamily
  layoutPresets: DeckLayoutPreset[]
  officeTheme?: OfficeThemeMetadata | null
}

export type RichTextRange = {
  id: string
  start: number
  end: number
  fontWeight?: 400 | 500 | 600 | 700
  italic?: boolean
  underline?: boolean
  color?: string
}

export type RichTextRangeStyle = Pick<
  RichTextRange,
  "fontWeight" | "italic" | "underline" | "color"
>

export type SlideComment = {
  id: string
  body: string
  authorName: string
  targetElementId: string
  mentions: string[]
  resolved: boolean
  createdAt: string
  updatedAt: string
  source?: "manual" | "pptx"
  sourceAnchor?: {
    x: number
    y: number
  }
  sourceCommentId?: string
  sourceParentCommentId?: string
  sourceReplyDepth?: number
  sourceReplyToAuthorName?: string
  sourceThreadId?: string
}

export type PresentationElement = {
  id: string
  type: SlideElementType
  x: number
  y: number
  width: number
  height: number
  content: string
  fontSize: number
  fontFamily: FontFamily
  fontWeight: 400 | 500 | 600 | 700
  textAlign: TextAlign
  lineHeight: number
  listStyle: TextListStyle
  textColumns: number
  textFit: TextFit
  textRanges: RichTextRange[]
  tableRows: number
  tableColumns: number
  tableCells: string[]
  tableCellMerges: TableCellMerge[]
  tableCellStyles: TableCellStyle[]
  tableHeaderRow: boolean
  tableTotalRow: boolean
  tableBorderColor: string
  tableOfficeStyleId: string
  tableOfficeStyleName: string
  tableStyle: TableStyle
  tableBandedRows: boolean
  tableBandedColumns: boolean
  tableFirstColumn: boolean
  tableLastColumn: boolean
  tableVerticalAlign: TableVerticalAlign
  chartType: ChartType
  chartData: ChartDatum[]
  chartSeries: ChartSeries[]
  chartShowLegend: boolean
  chartShowValues: boolean
  chartAxisColor: string
  color: string
  background: string
  radius: number
  shapeKind: ShapeKind
  shapeConnectorControlX: number
  shapeConnectorControlY: number
  shapeConnectorEndX: number
  shapeConnectorEndY: number
  shapeConnectorStartX: number
  shapeConnectorStartY: number
  shapeStrokeColor: string
  shapeStrokeWidth: number
  shapeStrokeDash: ShapeStrokeDash
  shapeStartArrowhead: ShapeArrowhead
  shapeEndArrowhead: ShapeArrowhead
  iconName: IconName
  rotation: number
  animation: ElementAnimation
  animationDurationMs: number
  animationDelayMs: number
  animationMotionX: number
  animationMotionY: number
  animationTrigger: ElementAnimationTrigger
  linkUrl: string
  linkSlideId: string
  hidden: boolean
  locked: boolean
  groupId: string
  placeholderRole: PlaceholderRole
  assetId: string
  src: string
  alt: string
  fit: ImageFit
  mediaStartSeconds: number
  mediaEndSeconds: number
  mediaCaption: string
  mediaCaptionCues: MediaCaptionCue[]
  mediaAutoplay: boolean
  imageMask: ImageMask
  imagePositionX: number
  imagePositionY: number
  imageOpacity: number
  imageBrightness: number
  imageContrast: number
  imageSaturation: number
}

export type Slide = {
  id: string
  title: string
  sectionTitle: string
  layout: SlideLayout
  background: string
  transition: SlideTransition
  transitionDurationMs: number
  autoAdvanceAfterMs: number
  rehearsalDurationMs: number
  notes: string
  comments: SlideComment[]
  elements: PresentationElement[]
}

export type Deck = {
  id: string
  title: string
  theme: ThemeName
  master: DeckMaster
  assets: DeckAsset[]
  slides: Slide[]
  updatedAt: string
}

export type ExportedDeck = {
  version: 1
  deck: Deck
}
