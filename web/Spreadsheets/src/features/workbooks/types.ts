import type { ImportConnectorTransformStep } from "@/features/workbooks/import-connector-transform-types";

export type CellBorderStyle = {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
  color?: string;
};

export type CellFontFamily =
  | "arial"
  | "calibri"
  | "georgia"
  | "times"
  | "verdana"
  | "mono";

export type CellStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  textRotation?: number;
  verticalText?: boolean;
  shrinkToFit?: boolean;
  background?: string;
  foreground?: string;
  fontFamily?: CellFontFamily;
  fontSize?: number;
  indent?: number;
  numberFormat?:
    | "general"
    | "currency"
    | "accounting"
    | "percent"
    | "date"
    | "custom";
  customNumberFormat?: string;
  borders?: CellBorderStyle;
  locked?: boolean;
  formulaHidden?: boolean;
  indicator?: {
    direction: "up" | "flat" | "down";
    color: string;
  };
  wrap?: boolean;
};

export type CellRichTextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  foreground?: string;
  fontFamily?: CellFontFamily;
  fontSize?: number;
};

export type WorkbookThemeColorKey =
  | "accent1"
  | "accent2"
  | "accent3"
  | "accent4"
  | "danger"
  | "good"
  | "headerFill"
  | "headerText"
  | "neutral"
  | "primary"
  | "secondary"
  | "warning";

export type WorkbookThemeColors = Record<WorkbookThemeColorKey, string>;

export type WorkbookThemeFonts = {
  body: CellFontFamily;
  heading: CellFontFamily;
  mono: CellFontFamily;
};

export type WorkbookTheme = {
  id: string;
  name: string;
  colors: WorkbookThemeColors;
  fonts: WorkbookThemeFonts;
  updatedAt: string;
};

export type WorkbookCellStyleDefinition = {
  id: string;
  name: string;
  description?: string;
  style: CellStyle;
  builtIn?: boolean;
  updatedAt: string;
};

export type CellRecord = {
  raw: string;
  style?: CellStyle;
  richTextRuns?: CellRichTextRun[];
};

export type ChartRange = {
  startRowIndex: number;
  startColumnIndex: number;
  endRowIndex: number;
  endColumnIndex: number;
};

export type MergedCellRange = ChartRange & {
  id: string;
};

export type SheetOutlineGroup = {
  id: string;
  startIndex: number;
  endIndex: number;
  level: number;
  collapsed: boolean;
};

export type SheetScaleMode = "standard" | "excel";

export type SheetData = {
  id: string;
  name: string;
  tabColor?: string;
  scaleMode?: SheetScaleMode;
  rowCount: number;
  columnCount: number;
  columnWidths: Record<string, number>;
  hiddenRows: number[];
  hiddenColumns: number[];
  showGridlines: boolean;
  rowGroups: SheetOutlineGroup[];
  columnGroups: SheetOutlineGroup[];
  mergedCells: MergedCellRange[];
  cells: Record<string, CellRecord>;
};

export type ChartDefinition = {
  id: string;
  sheetId: string;
  title: string;
  anchor?: InsertedObjectAnchor;
  type:
    | "bar"
    | "line"
    | "area"
    | "pie"
    | "scatter"
    | "bubble"
    | "radar"
    | "combo"
    | "stock"
    | "stacked-bar"
    | "stacked-100-bar"
    | "waterfall"
    | "funnel"
    | "histogram"
    | "box-whisker"
    | "treemap"
    | "sunburst"
    | "surface"
    | "map";
  template?: "standard" | "presentation" | "mono";
  showDataLabels?: boolean;
  showAxes?: boolean;
  showLegend?: boolean;
  format?: ChartFormat;
  range: ChartRange;
  sourcePivotTableId?: string;
};

export type ChartFormat = {
  axisBounds?: {
    categoryMax?: number;
    categoryMin?: number;
    secondaryValueMax?: number;
    secondaryValueMin?: number;
    valueMax?: number;
    valueMin?: number;
  };
  axisTitles?: {
    category?: string;
    secondaryValue?: string;
    value?: string;
  };
  dataLabelPosition?: "inside" | "outside";
  dataTable?: {
    enabled: boolean;
    showLegendKeys?: boolean;
  };
  errorBars?: {
    enabled: boolean;
    type?: "fixed" | "percentage";
    value?: number;
  };
  legendPosition?: "bottom" | "right";
  lineStyle?: "solid" | "dashed";
  markerStyle?: "circle" | "square" | "none";
  primaryColor?: string;
  secondaryAxis?: boolean;
  secondaryColor?: string;
  series?: Array<{
    axis?: "primary" | "secondary";
    chartType?: "area" | "bar" | "line";
    color?: string;
    hidden?: boolean;
    id: string;
    name?: string;
  }>;
  showErrorBars?: boolean;
  showGridlines?: boolean;
  showTrendline?: boolean;
  threeDimensional?: {
    enabled: boolean;
    depthPercent?: number;
    perspective?: number;
    rightAngleAxes?: boolean;
    rotationX?: number;
    rotationY?: number;
  };
  trendline?: {
    displayEquation?: boolean;
    enabled: boolean;
    type?: "linear";
  };
};

export type SparklineDefinition = {
  id: string;
  sheetId: string;
  targetCellKey: string;
  type: "line";
  range: ChartRange;
};

export type InsertedObjectAnchor = {
  columnIndex: number;
  height: number;
  offsetX: number;
  offsetY: number;
  rowIndex: number;
  width: number;
};

export type InsertedObjectFormat = {
  fillColor?: string;
  fontSize?: number;
  opacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  textColor?: string;
};

export type InsertedObjectDefinition = {
  id: string;
  sheetId: string;
  name: string;
  kind: "image" | "shape" | "textBox";
  anchor: InsertedObjectAnchor;
  altText?: string;
  format: InsertedObjectFormat;
  locked: boolean;
  metadata: {
    createdAt: string;
    fileName?: string;
    mimeType?: string;
    originalSizeBytes?: number;
    updatedAt: string;
  };
  shapeType?:
    | "rectangle"
    | "roundedRectangle"
    | "ellipse"
    | "diamond"
    | "connector";
  source?: {
    dataUrl: string;
  };
  text?: string;
  zIndex: number;
};

export type TableDefinition = {
  id: string;
  sheetId: string;
  name: string;
  range: ChartRange;
  style: "blue" | "green" | "slate";
  showHeaderRow: boolean;
  showFilterButtons: boolean;
  showTotalsRow: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkbookDataModelRelationship = {
  id: string;
  name: string;
  fromTableId: string;
  fromColumnIndex: number;
  toTableId: string;
  toColumnIndex: number;
  cardinality: "manyToOne" | "oneToOne";
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkbookDataModelHierarchyLevel = {
  columnIndex: number;
  name: string;
};

export type WorkbookDataModelHierarchy = {
  id: string;
  tableId: string;
  name: string;
  levels: WorkbookDataModelHierarchyLevel[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkbookDataModelKpi = {
  id: string;
  tableId: string;
  name: string;
  valueColumnIndex: number;
  target: number;
  direction: "higherIsBetter" | "lowerIsBetter";
  warningThreshold: number;
  goodThreshold: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkbookDataModelPerspectiveField = {
  columnIndex: number;
  tableId: string;
};

export type WorkbookDataModelPerspective = {
  id: string;
  name: string;
  tableIds: string[];
  fields: WorkbookDataModelPerspectiveField[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkbookDataModelStorageSettings = {
  maxRows: number;
  mode: "automatic" | "columnar";
  segmentRowCount: number;
};

export type TableSlicer = {
  id: string;
  sheetId: string;
  tableId: string;
  columnIndex: number;
  name: string;
  selectedValues: string[];
  createdAt: string;
  updatedAt: string;
};

export type TableTimelineMode = "year" | "quarter" | "month";

export type TableTimeline = {
  id: string;
  sheetId: string;
  tableId: string;
  columnIndex: number;
  name: string;
  mode: TableTimelineMode;
  selectedPeriods: string[];
  createdAt: string;
  updatedAt: string;
};

export type PivotTableAggregation = "sum" | "count" | "average" | "min" | "max";

export type PivotTableValueField = {
  aggregation: PivotTableAggregation;
  fieldId: string;
  label: string;
};

export type PivotTableCalculatedFieldOperator =
  | "add"
  | "subtract"
  | "multiply"
  | "divide";

export type PivotTableCalculatedField = {
  id: string;
  name: string;
  leftFieldId: string;
  operator: PivotTableCalculatedFieldOperator;
  rightFieldId: string;
};

export type PivotTableCalculatedItem = {
  id: string;
  fieldId: string;
  name: string;
  leftItem: string;
  operator: PivotTableCalculatedFieldOperator;
  rightItem: string;
};

export type PivotTableMeasure = {
  id: string;
  name: string;
  leftValueLabel: string;
  operator: PivotTableCalculatedFieldOperator;
  rightValueLabel: string;
};

export type PivotTableFieldGroupingMode =
  | "dateYear"
  | "dateQuarter"
  | "dateMonth"
  | "numberBucket10"
  | "numberBucket100";

export type PivotTableFieldGrouping = {
  fieldId: string;
  mode: PivotTableFieldGroupingMode;
};

export type PivotTableTimelineFilter = {
  fieldId: string;
  mode: TableTimelineMode;
  selectedPeriods: string[];
};

export type PivotTableDefinition = {
  id: string;
  sheetId: string;
  name: string;
  sourceRange: ChartRange;
  sourceTableId?: string;
  outputRange: ChartRange;
  rowFieldIds: string[];
  columnFieldIds: string[];
  filterFieldIds: string[];
  filterSelections: Record<string, string[]>;
  calculatedFields: PivotTableCalculatedField[];
  calculatedItems: PivotTableCalculatedItem[];
  measures: PivotTableMeasure[];
  fieldGroupings: PivotTableFieldGrouping[];
  timelineFilters: PivotTableTimelineFilter[];
  valueFields: PivotTableValueField[];
  createdAt: string;
  updatedAt: string;
};

export type ConditionalFormatOperator =
  | "greaterThan"
  | "lessThan"
  | "contains"
  | "notEmpty"
  | "duplicate"
  | "topValues"
  | "bottomValues"
  | "colorScale"
  | "dataBar"
  | "iconSet"
  | "formula";

export type ConditionalFormatStyle = Pick<
  CellStyle,
  "background" | "foreground" | "bold" | "italic"
> & {
  scale?: {
    minColor: string;
    maxColor: string;
    thresholds?: {
      low: number;
      high: number;
    };
  };
};

export type PivotTableConditionalFormatScope = "all" | "labels" | "values";

export type ConditionalFormatRule = {
  id: string;
  sheetId: string;
  range: ChartRange;
  operator: ConditionalFormatOperator;
  value: string;
  style: ConditionalFormatStyle;
  sourcePivotTableId?: string;
  pivotTableScope?: PivotTableConditionalFormatScope;
};

export type DataValidationRuleType =
  | "list"
  | "numberGreaterThan"
  | "numberLessThan"
  | "dateAfter"
  | "dateBefore"
  | "textContains"
  | "notEmpty"
  | "customFormula";

export type DataValidationListSource = "inline" | "range" | "dependent";

export type DataValidationErrorStyle = "stop" | "warning" | "information";

export type DataValidationRule = {
  id: string;
  sheetId: string;
  range: ChartRange;
  type: DataValidationRuleType;
  value: string;
  listSource?: DataValidationListSource;
  dependentCell?: string;
  inputMessage?: string;
  errorMessage?: string;
  showInputMessage?: boolean;
  showErrorAlert?: boolean;
  errorStyle?: DataValidationErrorStyle;
  ignoreBlank?: boolean;
  circleInvalid?: boolean;
};

export type SheetFilterRuleType =
  | "equals"
  | "notEquals"
  | "contains"
  | "doesNotContain"
  | "oneOf"
  | "cellColor"
  | "fontColor"
  | "icon"
  | "startsWith"
  | "endsWith"
  | "empty"
  | "notEmpty"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual";

export type SheetFilterCondition = {
  type: SheetFilterRuleType;
  value: string;
  values?: string[];
};

export type SheetFilterCriteriaCondition = SheetFilterCondition & {
  columnIndex: number;
  headerName?: string;
};

export type SheetFilterCriteriaGroup = {
  conditions: SheetFilterCriteriaCondition[];
};

export type SheetFilterRule = {
  id: string;
  sheetId: string;
  range: ChartRange;
  columnIndex: number;
  headerName?: string;
  type: SheetFilterRuleType;
  value: string;
  values?: string[];
  joiner?: "and" | "or";
  conditions?: SheetFilterCondition[];
  criteriaGroups?: SheetFilterCriteriaGroup[];
};

export type SheetFilterPreset = {
  id: string;
  sheetId: string;
  name: string;
  filters: SheetFilterRule[];
  createdAt: string;
  updatedAt: string;
};

export type CellNote = {
  id: string;
  sheetId: string;
  cellKey: string;
  text: string;
  authorName: string;
  authorEmail: string;
  mentions: CellCommentMention[];
  status: CellCommentStatus;
  replies: CellCommentReply[];
  resolvedAt?: string;
  resolvedByName?: string;
  resolvedByEmail?: string;
  createdAt: string;
  updatedAt: string;
};

export type CellCommentStatus = "open" | "resolved";

export type CellCommentMention = {
  email: string;
  label: string;
};

export type CellCommentReply = {
  id: string;
  text: string;
  authorName: string;
  authorEmail: string;
  mentions: CellCommentMention[];
  createdAt: string;
  updatedAt: string;
};

export type WorkbookCommentNotification = {
  id: string;
  sheetId: string;
  cellKey: string;
  noteId: string;
  replyId?: string;
  mentionEmail: string;
  authorName: string;
  authorEmail: string;
  text: string;
  createdAt: string;
  readAt?: string;
};

export type CellLink = {
  id: string;
  sheetId: string;
  cellKey: string;
  url: string;
  label: string;
  createdAt: string;
  updatedAt: string;
};

export type NamedRange = {
  id: string;
  sheetId: string;
  name: string;
  range: ChartRange;
  ranges?: ChartRange[];
  createdAt: string;
  updatedAt: string;
};

export type SheetProtection = {
  sheetId: string;
  protectedAt: string;
};

export type WorkbookProtection = {
  protectedAt: string;
  algorithmName?: string;
  hashValue?: string;
  importedFrom?: "xlsx" | "xlsm" | "xltx" | "xltm" | "xls" | "ods";
  legacyPasswordHash?: string;
  lockStructure?: boolean;
  lockWindows?: boolean;
  saltValue?: string;
  source?: "manual" | "imported-ooxml" | "encrypted-package";
  spinCount?: number;
};

export type SheetPrintSettings = {
  sheetId: string;
  orientation: "portrait" | "landscape";
  scale: number;
  margins: "normal" | "narrow" | "wide";
  printArea?: ChartRange;
  rowPageBreaks: number[];
  columnPageBreaks: number[];
  repeatHeaderRows: boolean;
  repeatFirstColumn: boolean;
  printGridlines: boolean;
  headerText: string;
  footerText: string;
  updatedAt: string;
};

export type WorkbookMetadata = {
  description: string;
  favorite: boolean;
  folderName: string;
  isTemplate: boolean;
  lastOpenedAt: string;
  tags: string[];
  updatedAt: string;
};

export type WorkbookVersionSnapshot = {
  id: string;
  label: string;
  createdAt: string;
  sheetCount: number;
  cellCount: number;
  documentJson: string;
};

export type WorkbookVersionRestore = {
  id: string;
  versionId: string;
  label: string;
  restoredAt: string;
  sheetCount: number;
  cellCount: number;
};

export type WorkbookProtectedRange = {
  id: string;
  sheetId: string;
  name: string;
  range: ChartRange;
  allowedEmails: string[];
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkbookTrackedChangeStatus = "pending" | "accepted" | "rejected";

export type WorkbookTrackedChange = {
  id: string;
  sheetId: string;
  sheetName: string;
  cellKey: string;
  summary: string;
  beforeCell?: CellRecord;
  afterCell?: CellRecord;
  actorName: string;
  actorEmail: string;
  createdAt: string;
  status: WorkbookTrackedChangeStatus;
  reviewedAt?: string;
  reviewedByName?: string;
  reviewedByEmail?: string;
};

export type SheetViewMode = "normal" | "pageLayout" | "pageBreakPreview";

export type SheetSplitPaneMode = "none" | "vertical" | "horizontal" | "quad";

export type WorkbookCustomView = {
  id: string;
  sheetId: string;
  name: string;
  viewMode: SheetViewMode;
  zoomPercent: number;
  frozenColumnCount: number;
  frozenRowCount: number;
  splitPaneMode: SheetSplitPaneMode;
  rightToLeft: boolean;
  showPageBreaks: boolean;
  selectedRange: ChartRange;
  hiddenRows: number[];
  hiddenColumns: number[];
  createdAt: string;
  updatedAt: string;
};

export type FormulaWatch = {
  id: string;
  sheetId: string;
  cellKey: string;
  createdAt: string;
};

export type WhatIfScenarioValue = {
  cellKey: string;
  value: string;
};

export type WhatIfScenario = {
  id: string;
  sheetId: string;
  name: string;
  values: WhatIfScenarioValue[];
  createdAt: string;
  updatedAt: string;
};

export type WorkbookQueryFormat = "auto" | "csv" | "tsv" | "json" | "html";

export type WorkbookQueryCredentialStatus =
  | "notRequired"
  | "required"
  | "environment"
  | "invalid";

export type WorkbookQueryCredentialMetadata = {
  kind: "none" | "manual" | "environment";
  label: string;
  hasStoredSecret: false;
  status: WorkbookQueryCredentialStatus;
  updatedAt: string;
};

export type WorkbookQueryRefreshDiagnosticCode =
  | "auth"
  | "blocked"
  | "network"
  | "parse"
  | "rateLimit"
  | "server"
  | "tooLarge"
  | "unknown";

export type WorkbookQuerySource =
  | {
      type: "url";
      displayUrl: string;
      refreshUrl?: string;
      credential: WorkbookQueryCredentialMetadata;
    }
  | {
      type: "database";
      connectionName: string;
      credential: WorkbookQueryCredentialMetadata;
    };

export type WorkbookQueryRefreshHistoryEntry = {
  attempt: number;
  diagnosticCode?: WorkbookQueryRefreshDiagnosticCode;
  id: string;
  nextRetryAt?: string;
  refreshedAt: string;
  retryable: boolean;
  status: "success" | "error";
  message: string;
  rowCount: number;
  columnCount: number;
  durationMs: number;
};

export type WorkbookQueryDefinition = {
  id: string;
  name: string;
  sheetId: string;
  sourceName: string;
  source: WorkbookQuerySource;
  format: WorkbookQueryFormat;
  transformSteps: ImportConnectorTransformStep[];
  refreshMode: "url" | "manual";
  lastRefreshAt?: string;
  lastRefreshStatus?: "success" | "error";
  lastRefreshMessage?: string;
  lastRefreshDiagnosticCode?: WorkbookQueryRefreshDiagnosticCode;
  nextRetryAt?: string;
  refreshHistory: WorkbookQueryRefreshHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type WorkbookMacroProject = {
  id: string;
  name: string;
  sourceFormat: "xlsm" | "xls";
  importedAt: string;
  disabled: true;
  disabledReason: string;
  binarySize: number;
  vbaProjectBase64: string;
  sheetCodeNames: Array<{
    sheetName: string;
    codeName: string;
    hiddenState: "visible" | "hidden" | "veryHidden";
  }>;
};

export type WorkbookUnsupportedPartKind =
  | "custom-xml"
  | "external-link"
  | "workbook-connection"
  | "embedded-object"
  | "form-control"
  | "activex-control"
  | "macro-sheet"
  | "chart"
  | "drawing"
  | "media"
  | "printer-setting"
  | "content-type"
  | "package-relationship"
  | "workbook-markup"
  | "worksheet-markup"
  | "unsupported-package-part";

export type WorkbookUnsupportedPart = {
  id: string;
  path: string;
  kind: WorkbookUnsupportedPartKind;
  sourceFormat: "xlsx" | "xlsm";
  importedAt: string;
  binarySize: number;
  contentType?: string;
  relationshipType?: string;
  dataBase64: string;
};

export type WorkbookNativeObjectKind =
  | "chart"
  | "connector"
  | "icon"
  | "image"
  | "oleObject"
  | "formControl"
  | "shape"
  | "drawing";

export type WorkbookNativeObjectAnchor = {
  fromColumnIndex?: number;
  fromRowIndex?: number;
  toColumnIndex?: number;
  toRowIndex?: number;
};

export type WorkbookNativeChartMetadata = {
  chartType?: string;
  hasDataTable?: boolean;
  threeDimensional?: {
    enabled: true;
    depthPercent?: number;
    perspective?: number;
    rightAngleAxes?: boolean;
    rotationX?: number;
    rotationY?: number;
  };
};

export type WorkbookNativeObject = {
  id: string;
  kind: WorkbookNativeObjectKind;
  name: string;
  importedAt: string;
  packagePaths: string[];
  sheetId?: string;
  sheetName?: string;
  sourcePath?: string;
  relationshipId?: string;
  relationshipType?: string;
  targetPath?: string;
  anchor?: WorkbookNativeObjectAnchor;
  chart?: WorkbookNativeChartMetadata;
  contentType?: string;
  description?: string;
};

export type WorkbookAutomationStep = {
  id: string;
  recordedAt: string;
  command: string;
  label: string;
  targetSheetId?: string;
  targetRange?: ChartRange;
  valuePreview?: string;
};

export type WorkbookAutomationPermission =
  | "readWorkbook"
  | "writeCells"
  | "formatCells"
  | "manageStructure"
  | "sortAndClean"
  | "registerExtensions";

export type WorkbookAutomationRunStatus = "succeeded" | "failed";

export type WorkbookAutomationScript = {
  id: string;
  name: string;
  source: "recorder";
  status: "recording" | "ready" | "disabled";
  disabledReason: string;
  createdAt: string;
  updatedAt: string;
  permissions: WorkbookAutomationPermission[];
  lastRunAt?: string;
  lastRunStatus?: WorkbookAutomationRunStatus;
  lastRunMessage?: string;
  steps: WorkbookAutomationStep[];
};

export type WorkbookCustomFunction = {
  id: string;
  name: string;
  description: string;
  expression: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkbookAddInSignatureStatus =
  | "verified"
  | "invalid"
  | "unsigned";

export type WorkbookAddInSignature = {
  algorithm: "essence-package-digest-v1";
  signer: string;
  signedAt: string;
  value: string;
};

export type WorkbookAddInSandboxCommand =
  | {
      id: string;
      kind: "workbook.summary";
      label: string;
      permission: "readWorkbook";
    }
  | {
      id: string;
      kind: "cell.setValue";
      label: string;
      permission: "writeCells";
      targetSheetId?: string;
      targetRange?: ChartRange;
      value: string;
    }
  | {
      color: string;
      id: string;
      kind: "range.fill";
      label: string;
      permission: "formatCells";
      targetSheetId?: string;
      targetRange?: ChartRange;
    }
  | {
      id: string;
      kind: "data.removeDuplicates";
      label: string;
      permission: "sortAndClean";
      targetSheetId?: string;
      targetRange?: ChartRange;
    };

export type WorkbookAddInManifest = {
  id: string;
  name: string;
  provider: string;
  version: string;
  description: string;
  homepageUrl?: string;
  permissions: WorkbookAutomationPermission[];
  packageDigest: string;
  signature?: WorkbookAddInSignature;
  signatureStatus: WorkbookAddInSignatureStatus;
  sandboxCommands: WorkbookAddInSandboxCommand[];
  enabled: boolean;
  enabledAt?: string;
  disabledReason?: string;
  installedAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastRunStatus?: WorkbookAutomationRunStatus;
  lastRunMessage?: string;
};

export type WorkbookCalendarSystem =
  | "gregorian"
  | "gregorian-1904"
  | "hijri"
  | "buddhist";

export type WorkbookCalculationSettings = {
  calendarSystem: WorkbookCalendarSystem;
  iterativeCalculation: {
    enabled: boolean;
    maxChange: number;
    maxIterations: number;
  };
};

export type WorkbookDocument = {
  version: 1;
  metadata: WorkbookMetadata;
  calculationSettings?: WorkbookCalculationSettings;
  activeSheetId: string;
  versionHistory: WorkbookVersionSnapshot[];
  versionRestores: WorkbookVersionRestore[];
  protectedRanges?: WorkbookProtectedRange[];
  trackedChanges?: WorkbookTrackedChange[];
  customViews: WorkbookCustomView[];
  formulaWatches: FormulaWatch[];
  whatIfScenarios: WhatIfScenario[];
  theme: WorkbookTheme;
  cellStyles: WorkbookCellStyleDefinition[];
  queries: WorkbookQueryDefinition[];
  macroProjects: WorkbookMacroProject[];
  unsupportedParts: WorkbookUnsupportedPart[];
  nativeObjects: WorkbookNativeObject[];
  automationScripts: WorkbookAutomationScript[];
  customFunctions?: WorkbookCustomFunction[];
  addIns?: WorkbookAddInManifest[];
  workbookProtection: WorkbookProtection | null;
  sheets: SheetData[];
  charts: ChartDefinition[];
  sparklines: SparklineDefinition[];
  insertedObjects: InsertedObjectDefinition[];
  tables: TableDefinition[];
  dataModelRelationships?: WorkbookDataModelRelationship[];
  dataModelHierarchies?: WorkbookDataModelHierarchy[];
  dataModelKpis?: WorkbookDataModelKpi[];
  dataModelPerspectives?: WorkbookDataModelPerspective[];
  dataModelStorage?: WorkbookDataModelStorageSettings;
  tableSlicers: TableSlicer[];
  tableTimelines: TableTimeline[];
  pivotTables: PivotTableDefinition[];
  conditionalFormats: ConditionalFormatRule[];
  dataValidations: DataValidationRule[];
  filters: SheetFilterRule[];
  filterPresets: SheetFilterPreset[];
  cellNotes: CellNote[];
  commentNotifications: WorkbookCommentNotification[];
  cellLinks: CellLink[];
  namedRanges: NamedRange[];
  sheetProtections: SheetProtection[];
  sheetPrintSettings: SheetPrintSettings[];
};

export type WorkbookSummary = {
  id: string;
  name: string;
  accessRole: WorkbookRole;
  ownerEmail: string;
  isFavorite: boolean;
  isTemplate: boolean;
  folderName: string;
  description: string;
  tags: string[];
  lastOpenedAt: Date | null;
  sharing?: WorkbookSharingSummary;
  updatedAt: Date;
  createdAt: Date;
};

export type PersistedWorkbook = WorkbookSummary & {
  document: WorkbookDocument;
};

export type WorkbookRole = "owner" | "editor" | "commenter" | "viewer";

export type WorkbookCollaboratorStatus = "pending" | "accepted";

export type WorkbookCollaboratorSummary = {
  id: string;
  email: string;
  name: string | null;
  role: Exclude<WorkbookRole, "owner">;
  status: WorkbookCollaboratorStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkbookShareLinkSummary = {
  id: string;
  token: string;
  role: Exclude<WorkbookRole, "owner">;
  active: boolean;
  expiresAt: Date | null;
  createdAt: Date;
};

export type WorkbookSharingSummary = {
  collaborators: WorkbookCollaboratorSummary[];
  links: WorkbookShareLinkSummary[];
};
