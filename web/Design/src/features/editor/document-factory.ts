import { nanoid } from "nanoid";

import { defaultChartData } from "@/features/editor/chart";
import {
  createDefaultDocumentBlocks,
  normalizeDocumentBlocks,
  normalizeDocumentColumns,
} from "@/features/editor/document-blocks";
import { createDefaultTableCells } from "@/features/editor/table";
import type {
  ChartElement,
  AudioElement,
  ConnectorElement,
  DesignDocument,
  DesignElement,
  DocumentElement,
  DesignPage,
  DesignPresetId,
  EmbedElement,
  FormElement,
  ImageElement,
  LottieElement,
  PdfElement,
  QrCodeElement,
  ShapeElement,
  StickyNoteElement,
  SvgElement,
  TableElement,
  TextElement,
  TimerElement,
  VectorPathElement,
  VectorPathPreset,
  VideoElement,
} from "@/features/editor/types";
import { createVectorPathGeometry } from "@/features/editor/vector-path";

export function createStarterDocument(args: {
  width: number;
  height: number;
  presetId?: DesignPresetId;
  name?: string;
}): DesignDocument {
  const page = createPage({
    name: args.name ?? "Page 1",
    background: "#f8fafc",
    format: args.presetId,
    width: args.width,
    height: args.height,
    elements: [
      createShapeElement({
        x: Math.round(args.width * 0.08),
        y: Math.round(args.height * 0.1),
        width: Math.round(args.width * 0.84),
        height: Math.round(args.height * 0.8),
        fill: "#ffffff",
        stroke: "#d4d4d8",
        radius: Math.max(12, Math.round(args.width * 0.015)),
      }),
      createTextElement({
        content: starterHeadline(args.presetId),
        x: Math.round(args.width * 0.16),
        y: Math.round(args.height * 0.22),
        width: Math.round(args.width * 0.68),
        height: Math.round(args.height * 0.24),
        fontSize: Math.max(36, Math.round(args.width * 0.05)),
        fontWeight: 800,
        color: "#111827",
        textAlign: "center",
      }),
      createTextElement({
        content: "Replace this text, add assets, export, and keep building.",
        x: Math.round(args.width * 0.22),
        y: Math.round(args.height * 0.5),
        width: Math.round(args.width * 0.56),
        height: Math.round(args.height * 0.1),
        fontSize: Math.max(18, Math.round(args.width * 0.024)),
        fontWeight: 500,
        color: "#52525b",
        textAlign: "center",
      }),
    ],
  });

  return {
    version: 1,
    width: args.width,
    height: args.height,
    pages: [page],
    activePageId: page.id,
    metadata:
      args.presetId === "whiteboard" ? { canvasMode: "whiteboard" } : undefined,
  };
}

export function createPage(args?: {
  name?: string;
  background?: string;
  format?: DesignPresetId;
  width?: number;
  height?: number;
  notes?: string;
  websiteSeoTitle?: string;
  websiteSeoDescription?: string;
  websiteNavLabel?: string;
  websiteNavGroup?: string;
  websiteHideFromNavigation?: boolean;
  elements?: DesignElement[];
}): DesignPage {
  return {
    id: nanoid(),
    name: args?.name ?? "Page",
    background: args?.background ?? "#ffffff",
    format: args?.format,
    width: args?.width,
    height: args?.height,
    notes: args?.notes ?? "",
    websiteSeoTitle: args?.websiteSeoTitle,
    websiteSeoDescription: args?.websiteSeoDescription,
    websiteNavLabel: args?.websiteNavLabel,
    websiteNavGroup: args?.websiteNavGroup,
    websiteHideFromNavigation: args?.websiteHideFromNavigation,
    elements: args?.elements ?? [],
  };
}

export function createTextElement(
  overrides: Partial<TextElement> & Pick<Partial<TextElement>, "content"> = {},
): TextElement {
  return {
    id: nanoid(),
    type: "text",
    content: overrides.content ?? "Add text",
    x: overrides.x ?? 120,
    y: overrides.y ?? 120,
    width: overrides.width ?? 360,
    height: overrides.height ?? 96,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    fontSize: overrides.fontSize ?? 48,
    fontFamily: overrides.fontFamily ?? "Geist",
    fontWeight: overrides.fontWeight ?? 700,
    color: overrides.color ?? "#111827",
    textAlign: overrides.textAlign ?? "left",
    letterSpacing: overrides.letterSpacing ?? 0,
    lineHeight: overrides.lineHeight ?? 1.08,
    textCurveEnabled: overrides.textCurveEnabled ?? false,
    textCurveAmount: overrides.textCurveAmount ?? 50,
    textGradientEnabled: overrides.textGradientEnabled ?? false,
    textGradientFrom: overrides.textGradientFrom ?? "#0ea5e9",
    textGradientTo: overrides.textGradientTo ?? "#a855f7",
    textGradientAngle: overrides.textGradientAngle ?? 90,
    textEffect: overrides.textEffect ?? "none",
    textEffectColor: overrides.textEffectColor ?? "#0f172a",
    textEffectBlur: overrides.textEffectBlur ?? 8,
    textEffectOffsetX: overrides.textEffectOffsetX ?? 2,
    textEffectOffsetY: overrides.textEffectOffsetY ?? 2,
    textOutlineWidth: overrides.textOutlineWidth ?? 2,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
    groupId: overrides.groupId,
  };
}

export function createShapeElement(
  overrides: Partial<ShapeElement> = {},
): ShapeElement {
  return {
    id: nanoid(),
    type: "shape",
    shape: overrides.shape ?? "rectangle",
    x: overrides.x ?? 160,
    y: overrides.y ?? 160,
    width: overrides.width ?? 280,
    height: overrides.height ?? 180,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    fill: overrides.fill ?? "#0ea5e9",
    fillMode: overrides.fillMode ?? "solid",
    fillGradientFrom: overrides.fillGradientFrom ?? overrides.fill ?? "#0ea5e9",
    fillGradientTo: overrides.fillGradientTo ?? "#f97316",
    fillGradientAngle: overrides.fillGradientAngle ?? 90,
    fillPattern: overrides.fillPattern ?? "diagonal-stripes",
    fillPatternColor: overrides.fillPatternColor ?? "#0f172a",
    fillPatternScale: overrides.fillPatternScale ?? 16,
    fillTexture: overrides.fillTexture ?? "paper",
    fillTextureIntensity: overrides.fillTextureIntensity ?? 30,
    stroke: overrides.stroke ?? "transparent",
    strokeWidth: overrides.strokeWidth ?? 0,
    radius: overrides.radius ?? 16,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
    groupId: overrides.groupId,
  };
}

export function createStickyNoteElement(
  overrides: Partial<StickyNoteElement> = {},
): StickyNoteElement {
  return {
    id: nanoid(),
    type: "sticky-note",
    content: overrides.content ?? "Note",
    x: overrides.x ?? 180,
    y: overrides.y ?? 180,
    width: overrides.width ?? 260,
    height: overrides.height ?? 220,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    fill: overrides.fill ?? "#fef08a",
    textColor: overrides.textColor ?? "#422006",
    accentColor: overrides.accentColor ?? "#eab308",
    fontSize: overrides.fontSize ?? 24,
    fontFamily: overrides.fontFamily ?? "Geist",
    fontWeight: overrides.fontWeight ?? 700,
    radius: overrides.radius ?? 10,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
    groupId: overrides.groupId,
  };
}

export function createConnectorElement(
  overrides: Partial<ConnectorElement> = {},
): ConnectorElement {
  return {
    id: nanoid(),
    type: "connector",
    connectorKind: overrides.connectorKind ?? "straight",
    x: overrides.x ?? 220,
    y: overrides.y ?? 220,
    width: overrides.width ?? 320,
    height: overrides.height ?? 80,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    stroke: overrides.stroke ?? "#334155",
    strokeWidth: overrides.strokeWidth ?? 4,
    strokeStyle: overrides.strokeStyle ?? "solid",
    startMarker: overrides.startMarker ?? "none",
    endMarker: overrides.endMarker ?? "arrow",
    label: overrides.label ?? "",
    labelColor: overrides.labelColor ?? "#0f172a",
    labelFontSize: overrides.labelFontSize ?? 16,
    labelPosition: overrides.labelPosition ?? "center",
    labelBackground: overrides.labelBackground ?? "none",
    startElementId: overrides.startElementId,
    endElementId: overrides.endElementId,
    startAnchor: overrides.startAnchor,
    endAnchor: overrides.endAnchor,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
    groupId: overrides.groupId,
  };
}

export function createImageElement(
  overrides: Pick<ImageElement, "src"> & Partial<ImageElement>,
): ImageElement {
  return {
    id: nanoid(),
    type: "image",
    src: overrides.src,
    alt: overrides.alt ?? "Uploaded design asset",
    x: overrides.x ?? 180,
    y: overrides.y ?? 180,
    width: overrides.width ?? 360,
    height: overrides.height ?? 240,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    objectFit: overrides.objectFit ?? "cover",
    maskShape: overrides.maskShape ?? "rectangle",
    maskRadius: overrides.maskRadius ?? 0,
    frameEnabled: overrides.frameEnabled ?? false,
    frameColor: overrides.frameColor ?? "#ffffff",
    frameWidth: overrides.frameWidth ?? 0,
    cropEnabled: overrides.cropEnabled ?? false,
    cropScale: overrides.cropScale ?? 100,
    cropX: overrides.cropX ?? 0,
    cropY: overrides.cropY ?? 0,
    filterBrightness: overrides.filterBrightness ?? 100,
    filterContrast: overrides.filterContrast ?? 100,
    filterSaturation: overrides.filterSaturation ?? 100,
    filterGrayscale: overrides.filterGrayscale ?? 0,
    filterBlur: overrides.filterBlur ?? 0,
    filterSharpen: overrides.filterSharpen ?? 0,
    duotoneEnabled: overrides.duotoneEnabled ?? false,
    duotoneShadow: overrides.duotoneShadow ?? "#172554",
    duotoneHighlight: overrides.duotoneHighlight ?? "#f8fafc",
    duotoneIntensity: overrides.duotoneIntensity ?? 100,
    backgroundCutoutOriginalSrc: overrides.backgroundCutoutOriginalSrc,
    backgroundCutoutEnabled: overrides.backgroundCutoutEnabled ?? false,
    backgroundCutoutColor: overrides.backgroundCutoutColor ?? "#ffffff",
    backgroundCutoutTolerance: overrides.backgroundCutoutTolerance ?? 24,
    backgroundCutoutFeather: overrides.backgroundCutoutFeather ?? 4,
    backgroundCutoutInvert: overrides.backgroundCutoutInvert ?? false,
    objectRetouchOriginalSrc: overrides.objectRetouchOriginalSrc,
    objectRetouchApplied: overrides.objectRetouchApplied ?? false,
    objectRetouchTool: overrides.objectRetouchTool ?? "erase",
    objectRetouchTargetX: overrides.objectRetouchTargetX ?? 50,
    objectRetouchTargetY: overrides.objectRetouchTargetY ?? 50,
    objectRetouchSourceX: overrides.objectRetouchSourceX ?? 25,
    objectRetouchSourceY: overrides.objectRetouchSourceY ?? 50,
    objectRetouchBrushSize: overrides.objectRetouchBrushSize ?? 18,
    objectRetouchSoftness: overrides.objectRetouchSoftness ?? 25,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
  };
}

export function createDocumentElement(
  overrides: Partial<DocumentElement> = {},
): DocumentElement {
  return {
    id: nanoid(),
    type: "document",
    title: overrides.title ?? "Document",
    x: overrides.x ?? 150,
    y: overrides.y ?? 120,
    width: overrides.width ?? 640,
    height: overrides.height ?? 760,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    blocks: overrides.blocks
      ? normalizeDocumentBlocks(overrides.blocks)
      : createDefaultDocumentBlocks(),
    columns: normalizeDocumentColumns(overrides.columns),
    columnGap: overrides.columnGap ?? 32,
    padding: overrides.padding ?? 36,
    fontFamily: overrides.fontFamily ?? "Geist, Arial, sans-serif",
    textColor: overrides.textColor ?? "#334155",
    headingColor: overrides.headingColor ?? "#0f172a",
    surfaceColor: overrides.surfaceColor ?? "#ffffff",
    borderColor: overrides.borderColor ?? "#e2e8f0",
    borderWidth: overrides.borderWidth ?? 1,
    radius: overrides.radius ?? 18,
    lineHeight: overrides.lineHeight ?? 1.55,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
    groupId: overrides.groupId,
  };
}

export function createVectorPathElement(
  overrides: Partial<VectorPathElement> & {
    pathPreset?: VectorPathPreset;
  } = {},
): VectorPathElement {
  const width = overrides.width ?? 360;
  const height = overrides.height ?? 220;
  const pathPreset = overrides.pathPreset ?? "curve";
  const geometry = createVectorPathGeometry({
    preset: pathPreset,
    width,
    height,
  });

  return {
    id: nanoid(),
    type: "path",
    name: overrides.name ?? "Bezier path",
    pathPreset,
    x: overrides.x ?? 180,
    y: overrides.y ?? 180,
    width,
    height,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    startX: overrides.startX ?? geometry.startX,
    startY: overrides.startY ?? geometry.startY,
    segments: overrides.segments ?? geometry.segments,
    closed: overrides.closed ?? geometry.closed,
    fill: overrides.fill ?? "#38bdf8",
    fillMode: overrides.fillMode ?? "solid",
    fillGradientFrom: overrides.fillGradientFrom ?? overrides.fill ?? "#38bdf8",
    fillGradientTo: overrides.fillGradientTo ?? "#f97316",
    fillGradientAngle: overrides.fillGradientAngle ?? 90,
    fillPattern: overrides.fillPattern ?? "diagonal-stripes",
    fillPatternColor: overrides.fillPatternColor ?? "#0f172a",
    fillPatternScale: overrides.fillPatternScale ?? 16,
    fillTexture: overrides.fillTexture ?? "paper",
    fillTextureIntensity: overrides.fillTextureIntensity ?? 30,
    stroke: overrides.stroke ?? "#0f172a",
    strokeWidth: overrides.strokeWidth ?? 6,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
    groupId: overrides.groupId,
  };
}

export function createVideoElement(
  overrides: Pick<VideoElement, "src" | "mimeType"> & Partial<VideoElement>,
): VideoElement {
  return {
    id: nanoid(),
    type: "video",
    src: overrides.src,
    title: overrides.title ?? "Video asset",
    mimeType: overrides.mimeType,
    x: overrides.x ?? 160,
    y: overrides.y ?? 160,
    width: overrides.width ?? 520,
    height: overrides.height ?? 292,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    objectFit: overrides.objectFit ?? "cover",
    showControls: overrides.showControls ?? true,
    muted: overrides.muted ?? false,
    loop: overrides.loop ?? false,
    autoplay: overrides.autoplay ?? false,
    timelineStartSeconds: overrides.timelineStartSeconds ?? 0,
    timelineDurationSeconds: overrides.timelineDurationSeconds ?? 10,
    trimStartSeconds: overrides.trimStartSeconds ?? 0,
    trimEndSeconds: overrides.trimEndSeconds ?? null,
    volume: overrides.volume ?? 1,
    subtitleCues: overrides.subtitleCues ?? [],
    transitionIn: overrides.transitionIn ?? "none",
    transitionOut: overrides.transitionOut ?? "none",
    transitionDurationSeconds: overrides.transitionDurationSeconds ?? 0.5,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
  };
}

export function createAudioElement(
  overrides: Pick<AudioElement, "src" | "mimeType"> & Partial<AudioElement>,
): AudioElement {
  return {
    id: nanoid(),
    type: "audio",
    src: overrides.src,
    title: overrides.title ?? "Audio asset",
    mimeType: overrides.mimeType,
    x: overrides.x ?? 160,
    y: overrides.y ?? 160,
    width: overrides.width ?? 440,
    height: overrides.height ?? 172,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    showControls: overrides.showControls ?? true,
    loop: overrides.loop ?? false,
    timelineStartSeconds: overrides.timelineStartSeconds ?? 0,
    timelineDurationSeconds: overrides.timelineDurationSeconds ?? 10,
    trimStartSeconds: overrides.trimStartSeconds ?? 0,
    trimEndSeconds: overrides.trimEndSeconds ?? null,
    volume: overrides.volume ?? 1,
    fadeInSeconds: overrides.fadeInSeconds ?? 0,
    fadeOutSeconds: overrides.fadeOutSeconds ?? 0,
    volumeKeyframes: overrides.volumeKeyframes ?? [],
    beatMarkers: overrides.beatMarkers ?? [],
    beatSyncSuggestions: overrides.beatSyncSuggestions ?? [],
    surfaceColor: overrides.surfaceColor ?? "#ffffff",
    textColor: overrides.textColor ?? "#111827",
    accentColor: overrides.accentColor ?? "#0ea5e9",
    borderColor: overrides.borderColor ?? "#94a3b8",
    borderWidth: overrides.borderWidth ?? 1,
    radius: overrides.radius ?? 18,
    padding: overrides.padding ?? 18,
    sourceProvider: overrides.sourceProvider ?? null,
    sourceUrl: overrides.sourceUrl ?? null,
    authorName: overrides.authorName ?? null,
    licenseName: overrides.licenseName ?? null,
    licenseUrl: overrides.licenseUrl ?? null,
    sourceBpm: overrides.sourceBpm ?? null,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
  };
}

export function createPdfElement(
  overrides: Pick<PdfElement, "src" | "mimeType"> & Partial<PdfElement>,
): PdfElement {
  return {
    id: nanoid(),
    type: "pdf",
    src: overrides.src,
    title: overrides.title ?? "PDF document",
    mimeType: overrides.mimeType,
    pageNumber: overrides.pageNumber ?? 1,
    showToolbar: overrides.showToolbar ?? true,
    x: overrides.x ?? 160,
    y: overrides.y ?? 160,
    width: overrides.width ?? 520,
    height: overrides.height ?? 680,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    surfaceColor: overrides.surfaceColor ?? "#ffffff",
    textColor: overrides.textColor ?? "#111827",
    accentColor: overrides.accentColor ?? "#0ea5e9",
    borderColor: overrides.borderColor ?? "#94a3b8",
    borderWidth: overrides.borderWidth ?? 1,
    radius: overrides.radius ?? 18,
    padding: overrides.padding ?? 12,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
  };
}

export function createSvgElement(
  overrides: Pick<SvgElement, "svgText"> & Partial<SvgElement>,
): SvgElement {
  return {
    id: nanoid(),
    type: "svg",
    name: overrides.name ?? "SVG asset",
    svgText: overrides.svgText,
    preserveColors: overrides.preserveColors ?? true,
    fillColor: overrides.fillColor ?? "#111827",
    strokeColor: overrides.strokeColor ?? "#111827",
    strokeWidth: overrides.strokeWidth ?? 1.5,
    x: overrides.x ?? 180,
    y: overrides.y ?? 180,
    width: overrides.width ?? 320,
    height: overrides.height ?? 240,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
  };
}

export function createLottieElement(
  overrides: Pick<LottieElement, "lottieJson"> & Partial<LottieElement>,
): LottieElement {
  return {
    id: nanoid(),
    type: "lottie",
    name: overrides.name ?? "Lottie animation",
    lottieJson: overrides.lottieJson,
    loop: overrides.loop ?? true,
    autoplay: overrides.autoplay ?? true,
    playbackSpeed: overrides.playbackSpeed ?? 1,
    backgroundColor: overrides.backgroundColor ?? "#ffffff",
    x: overrides.x ?? 180,
    y: overrides.y ?? 180,
    width: overrides.width ?? 360,
    height: overrides.height ?? 360,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
  };
}

export function createQrCodeElement(
  overrides: Partial<QrCodeElement> = {},
): QrCodeElement {
  return {
    id: nanoid(),
    type: "qr",
    qrValue: overrides.qrValue ?? "https://essence.local",
    qrForeground: overrides.qrForeground ?? "#111827",
    qrBackground: overrides.qrBackground ?? "#ffffff",
    qrMargin: overrides.qrMargin ?? 4,
    qrErrorCorrection: overrides.qrErrorCorrection ?? "M",
    x: overrides.x ?? 180,
    y: overrides.y ?? 180,
    width: overrides.width ?? 220,
    height: overrides.height ?? 220,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
  };
}

export function createTableElement(
  overrides: Partial<TableElement> = {},
): TableElement {
  const rows = overrides.rows ?? 3;
  const columns = overrides.columns ?? 3;

  return {
    id: nanoid(),
    type: "table",
    rows,
    columns,
    cells: overrides.cells ?? createDefaultTableCells(rows, columns),
    sheets: overrides.sheets,
    activeSheetId: overrides.activeSheetId ?? overrides.sheets?.[0]?.id,
    cellStyles: overrides.cellStyles,
    dataSourceKind: overrides.dataSourceKind,
    dataSourcePresetId: overrides.dataSourcePresetId,
    dataSourceHeaderName: overrides.dataSourceHeaderName,
    dataSourceUrl: overrides.dataSourceUrl,
    dataSourceLastSyncedAt: overrides.dataSourceLastSyncedAt,
    dataSourceStatus: overrides.dataSourceStatus,
    dataSourceMessage: overrides.dataSourceMessage,
    x: overrides.x ?? 140,
    y: overrides.y ?? 160,
    width: overrides.width ?? 520,
    height: overrides.height ?? 240,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    fontSize: overrides.fontSize ?? 18,
    fontFamily: overrides.fontFamily ?? "Geist",
    fontWeight: overrides.fontWeight ?? 500,
    textColor: overrides.textColor ?? "#111827",
    headerRow: overrides.headerRow ?? true,
    headerFill: overrides.headerFill ?? "#e0f2fe",
    bodyFill: overrides.bodyFill ?? "#ffffff",
    borderColor: overrides.borderColor ?? "#94a3b8",
    borderWidth: overrides.borderWidth ?? 1,
    cellPadding: overrides.cellPadding ?? 12,
    filterQuery: overrides.filterQuery ?? "",
    freezeHeaderRow: overrides.freezeHeaderRow ?? true,
    sortColumnIndex: overrides.sortColumnIndex,
    sortDirection: overrides.sortDirection ?? "asc",
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
  };
}

export function createChartElement(
  overrides: Partial<ChartElement> = {},
): ChartElement {
  return {
    id: nanoid(),
    type: "chart",
    chartType: overrides.chartType ?? "bar",
    data: overrides.data ?? defaultChartData,
    dataSourceTableId: overrides.dataSourceTableId,
    dataSourceLabelColumnIndex: overrides.dataSourceLabelColumnIndex ?? 0,
    dataSourceValueColumnIndex: overrides.dataSourceValueColumnIndex ?? 1,
    dataSourceUseFilteredRows: overrides.dataSourceUseFilteredRows ?? true,
    x: overrides.x ?? 140,
    y: overrides.y ?? 160,
    width: overrides.width ?? 520,
    height: overrides.height ?? 300,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    backgroundColor: overrides.backgroundColor ?? "#ffffff",
    textColor: overrides.textColor ?? "#111827",
    axisColor: overrides.axisColor ?? "#94a3b8",
    showAxis: overrides.showAxis ?? true,
    showLabels: overrides.showLabels ?? true,
    showValues: overrides.showValues ?? true,
    fontSize: overrides.fontSize ?? 14,
    strokeWidth: overrides.strokeWidth ?? 3,
    innerRadius: overrides.innerRadius ?? 58,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
  };
}

export function createFormElement(
  overrides: Partial<FormElement> = {},
): FormElement {
  const fieldKind = overrides.fieldKind ?? "input";

  return {
    id: nanoid(),
    type: "form",
    fieldKind,
    label: overrides.label ?? defaultFormLabel(fieldKind),
    value: overrides.value ?? defaultFormValue(fieldKind),
    placeholder: overrides.placeholder ?? defaultFormPlaceholder(fieldKind),
    options: overrides.options ?? ["Small", "Medium", "Large"],
    checked: overrides.checked ?? true,
    x: overrides.x ?? 160,
    y: overrides.y ?? 160,
    width: overrides.width ?? (fieldKind === "button" ? 240 : 380),
    height: overrides.height ?? (fieldKind === "textarea" ? 160 : 112),
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    fontSize: overrides.fontSize ?? 18,
    fontFamily: overrides.fontFamily ?? "Geist",
    fontWeight: overrides.fontWeight ?? 600,
    textColor:
      overrides.textColor ?? (fieldKind === "button" ? "#ffffff" : "#111827"),
    surfaceColor: overrides.surfaceColor ?? "#ffffff",
    fieldColor: overrides.fieldColor ?? "#f8fafc",
    borderColor: overrides.borderColor ?? "#94a3b8",
    accentColor: overrides.accentColor ?? "#0ea5e9",
    borderWidth: overrides.borderWidth ?? 1,
    radius: overrides.radius ?? 14,
    padding: overrides.padding ?? 14,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
  };
}

export function createEmbedElement(
  overrides: Partial<EmbedElement> = {},
): EmbedElement {
  const url = overrides.url ?? "https://example.com";

  return {
    id: nanoid(),
    type: "embed",
    url,
    title: overrides.title ?? "Linked resource",
    description:
      overrides.description ??
      "Add a public URL, preview it, and keep it with the design.",
    embedMode: overrides.embedMode ?? "card",
    showUrl: overrides.showUrl ?? true,
    x: overrides.x ?? 160,
    y: overrides.y ?? 160,
    width: overrides.width ?? 460,
    height: overrides.height ?? 260,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    fontSize: overrides.fontSize ?? 18,
    fontFamily: overrides.fontFamily ?? "Geist",
    fontWeight: overrides.fontWeight ?? 700,
    textColor: overrides.textColor ?? "#111827",
    surfaceColor: overrides.surfaceColor ?? "#ffffff",
    borderColor: overrides.borderColor ?? "#94a3b8",
    accentColor: overrides.accentColor ?? "#0ea5e9",
    borderWidth: overrides.borderWidth ?? 1,
    radius: overrides.radius ?? 18,
    padding: overrides.padding ?? 18,
    linkUrl: overrides.linkUrl ?? url,
    locked: overrides.locked,
  };
}

export function createTimerElement(
  overrides: Partial<TimerElement> = {},
): TimerElement {
  return {
    id: nanoid(),
    type: "timer",
    timerMode: overrides.timerMode ?? "countdown",
    label: overrides.label ?? "Break timer",
    durationSeconds: overrides.durationSeconds ?? 300,
    elapsedSeconds: overrides.elapsedSeconds ?? 0,
    running: overrides.running ?? false,
    startedAt: overrides.startedAt ?? null,
    showLabel: overrides.showLabel ?? true,
    showHours: overrides.showHours ?? false,
    x: overrides.x ?? 160,
    y: overrides.y ?? 160,
    width: overrides.width ?? 360,
    height: overrides.height ?? 180,
    rotation: overrides.rotation ?? 0,
    opacity: overrides.opacity ?? 1,
    fontSize: overrides.fontSize ?? 48,
    fontFamily: overrides.fontFamily ?? "Geist",
    fontWeight: overrides.fontWeight ?? 800,
    textColor: overrides.textColor ?? "#111827",
    surfaceColor: overrides.surfaceColor ?? "#ffffff",
    borderColor: overrides.borderColor ?? "#94a3b8",
    accentColor: overrides.accentColor ?? "#0ea5e9",
    borderWidth: overrides.borderWidth ?? 1,
    radius: overrides.radius ?? 20,
    padding: overrides.padding ?? 18,
    linkUrl: overrides.linkUrl,
    locked: overrides.locked,
  };
}

function starterHeadline(presetId?: DesignPresetId) {
  if (presetId === "presentation") return "Pitch something worth noticing";
  if (presetId === "document") return "A clear idea, ready to read";
  if (presetId === "whiteboard") return "Map the work before it moves";
  if (presetId === "poster") return "Make the message impossible to miss";
  if (presetId === "infographic") return "Turn facts into a path";
  if (presetId === "resume") return "Your work, sharply framed";
  if (presetId === "business-card") return "Name, role, signal";
  if (presetId === "flyer") return "Put the offer where eyes land";
  if (presetId === "banner") return "Lead with the thing that matters";
  if (presetId === "spreadsheet") return "Rows that explain the work";
  if (presetId === "website") return "A page people can actually use";
  if (presetId === "video") return "Frame the motion before it moves";
  if (presetId === "print-product") return "Print it clean, cut it right";
  if (presetId === "email-template") return "Send the message clearly";
  if (presetId === "course") return "Teach the path one step at a time";
  if (presetId === "logo") return "Brand mark";

  return "Design without the rent";
}

function defaultFormLabel(fieldKind: FormElement["fieldKind"]) {
  if (fieldKind === "checkbox") return "I agree";
  if (fieldKind === "dropdown") return "Plan";
  if (fieldKind === "button") return "";
  if (fieldKind === "textarea") return "Message";

  return "Email";
}

function defaultFormValue(fieldKind: FormElement["fieldKind"]) {
  if (fieldKind === "button") return "Submit";
  if (fieldKind === "dropdown") return "Medium";

  return "";
}

function defaultFormPlaceholder(fieldKind: FormElement["fieldKind"]) {
  if (fieldKind === "textarea") return "Write a message";
  if (fieldKind === "dropdown") return "Choose an option";
  if (fieldKind === "button" || fieldKind === "checkbox") return "";

  return "name@example.com";
}
