"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { nanoid } from "nanoid"
import {
  AlertTriangle,
  Bold,
  ClipboardList,
  Eraser,
  ExternalLink,
  FileDown,
  FileUp,
  ImagePlus,
  Italic,
  Play,
  Underline,
  Video,
  Volume2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { AccessibilityCheckerPanel } from "./accessibility-checker-panel"
import {
  ConnectorGeometryControls,
  connectorGeometryDefaultsPatch,
} from "./connector-geometry-controls"
import { ImageCorrectionControls } from "./image-correction-controls"
import { LayerList } from "./layer-list"
import { MasterLayoutPresetSection } from "./master-layout-preset-section"
import { MasterStylePresetPicker } from "./master-style-preset-picker"
import { MasterThemeSafeguardPanel } from "./master-theme-safeguard-panel"
import { MediaCaptionControls } from "./media-caption-controls"
import { MediaHandoffPanel } from "./media-handoff-panel"
import { MediaTrimControls } from "./media-trim-controls"
import { ProofingCheckerPanel } from "./proofing-checker-panel"
import { ReviewComments } from "./review-comments"
import { TableCellSelectionPanel } from "./table-cell-selection-panel"
import { TransitionPresetPicker } from "./transition-preset-picker"
import {
  clampAnimationDelay,
  clampAnimationDuration,
  clampAnimationMotionOffset,
  elementAnimationLabels,
  elementAnimationTriggerLabels,
} from "../animation-effects"
import { serializeActionButtonHandoffReport } from "../action-button-handoff"
import {
  chartDataFromSeries,
  chartDataFromTsv,
  chartSeriesFromTsv,
  chartSeriesToTsv,
  chartTypeLabels,
} from "../chart-formatting"
import { readImageFileAsDataUrl } from "../image-files"
import {
  customSlideLayoutsFileName,
  deleteCustomSlideLayout,
  importCustomSlideLayoutsFromText,
  readCustomSlideLayouts,
  saveCustomSlideLayout,
  serializeCustomSlideLayouts,
  type CustomSlideLayout,
} from "../custom-slide-layouts"
import { saveTextFileWithPicker } from "../browser-downloads"
import { fontFamilyLabels, fontFamilyOptions } from "../font-pairs"
import { elementImageMask, imageMaskLabels } from "../image-masks"
import {
  elementSlideTarget,
  elementSlideTargetDiagnostic,
  normalizeElementLinkUrl,
} from "../element-links"
import { iconOptions, iconStrokeWidth } from "../icon-library"
import { presentationSmokeTestIds } from "../presentation-smoke-test-ids"
import { readMediaFileAsDataUrl } from "../media-files"
import {
  isLinearShape,
  shapeArrowheadLabels,
  shapeArrowheadOptions,
  shapeEndArrowhead,
  shapeKindLabels,
  shapeStartArrowhead,
  shapeStrokeDash,
  shapeStrokeDashLabels,
  shapeStrokeDashOptions,
  shapeStrokeWidth,
} from "../shape-formatting"
import {
  applyRichTextRange,
  clearRichTextRange,
  normalizeTextSelection,
  richTextSelectionState,
  toggleRichTextRange,
  type TextSelectionRange,
} from "../rich-text"
import {
  clampLineHeight,
  clampTextColumns,
  elementLineHeight,
  elementListStyle,
  elementTextColumns,
  elementTextFit,
  elementTextAlign,
  textAlignLabels,
  textFitLabels,
  textListStyleLabels,
  textOverflowStatus,
} from "../text-formatting"
import {
  elementTableVerticalAlign,
  mergeTableCells,
  resizeTableCells,
  splitTableCells,
  tableCellMerges,
  tableCellsFromTsv,
  tableCellsToTsv,
  tableColumns,
  tableRows,
  elementTableStyle,
  tableStyleLabels,
  tableStyleOptions,
  tableVerticalAlignLabels,
  tableVerticalAlignOptions,
  type TableCellRange,
} from "../table-formatting"
import { slideLayoutLabels } from "../slide-layouts"
import { canvasPalette, textPalette } from "../themes"
import type {
  ChartType,
  ElementAnimation,
  ElementAnimationTrigger,
  FontFamily,
  IconName,
  ImageFit,
  ImageMask,
  PlaceholderRole,
  SlideLayout,
  TableStyle,
  TableVerticalAlign,
  TextAlign,
  TextFit,
  TextListStyle,
  RichTextRangeStyle,
  ShapeArrowhead,
  ShapeKind,
  ShapeStrokeDash,
} from "../types"
import { usePresentationStore } from "../use-presentation-store"
import { workspaceDensityConfig } from "../workspace-ergonomics"

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function clampDuration(value: number) {
  return Math.max(0, Math.min(3000, value))
}

function clampAdvance(value: number) {
  return Math.max(0, Math.min(3_600_000, value))
}

function clampRehearsal(value: number) {
  return Math.max(0, Math.min(86_400_000, value))
}

function clampMasterFontSize(value: number) {
  return Math.max(6, Math.min(24, value))
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  )
}

const placeholderRoleLabels: Record<PlaceholderRole, string> = {
  none: "None",
  title: "Title",
  body: "Body",
  media: "Media",
  caption: "Caption",
}

const customLayoutJsonPickerTypes = [
  {
    description: "Essence slide layouts",
    accept: {
      "application/json": [".json"],
    },
  },
]

type PropertiesPanelProps = {
  width?: number
}

export function PropertiesPanel({ width }: PropertiesPanelProps) {
  const customLayoutImportInputRef = useRef<HTMLInputElement | null>(null)
  const replaceImageInputRef = useRef<HTMLInputElement | null>(null)
  const replaceAudioInputRef = useRef<HTMLInputElement | null>(null)
  const replaceVideoInputRef = useRef<HTMLInputElement | null>(null)
  const [textSelection, setTextSelection] = useState<
    (TextSelectionRange & { elementId: string }) | null
  >(null)
  const [customLayoutName, setCustomLayoutName] = useState("")
  const [customLayoutMessage, setCustomLayoutMessage] = useState("")
  const [actionHandoffCopyState, setActionHandoffCopyState] = useState<
    "idle" | "copied" | "error"
  >("idle")
  const [customLayouts, setCustomLayouts] = useState<CustomSlideLayout[]>([])
  const [tableCellSelections, setTableCellSelections] = useState<
    Record<string, TableCellRange>
  >({})
  const deck = usePresentationStore((state) => state.deck)
  const workspaceDensity = usePresentationStore(
    (state) => state.workspaceDensity,
  )
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const selectedSlideIds = usePresentationStore((state) => state.selectedSlideIds)
  const selectedElementId = usePresentationStore(
    (state) => state.selectedElementId,
  )
  const updateSlide = usePresentationStore((state) => state.updateSlide)
  const applySlideLayout = usePresentationStore((state) => state.applySlideLayout)
  const applyCustomSlideLayoutToSelection = usePresentationStore(
    (state) => state.applyCustomSlideLayout,
  )
  const updateDeckMaster = usePresentationStore(
    (state) => state.updateDeckMaster,
  )
  const updateElement = usePresentationStore((state) => state.updateElement)
  const replaceImageElement = usePresentationStore(
    (state) => state.replaceImageElement,
  )
  const replaceAudioElement = usePresentationStore(
    (state) => state.replaceAudioElement,
  )
  const replaceVideoElement = usePresentationStore(
    (state) => state.replaceVideoElement,
  )
  const previewSlideTransition = usePresentationStore(
    (state) => state.previewSlideTransition,
  )
  const previewElementAnimation = usePresentationStore(
    (state) => state.previewElementAnimation,
  )
  const slide = deck.slides.find((item) => item.id === selectedSlideId)
  const element = slide?.elements.find((item) => item.id === selectedElementId)
  const densityConfig = workspaceDensityConfig(workspaceDensity)
  const activeTableMerges =
    element?.type === "table" ? tableCellMerges(element) : []
  const normalizedElementLinkUrl = normalizeElementLinkUrl(element?.linkUrl)
  const normalizedElementSlideTarget = element
    ? elementSlideTarget(element, deck.slides)
    : ""
  const slideTargetDiagnostic = element
    ? elementSlideTargetDiagnostic(element, deck.slides, selectedSlideId)
    : null
  const textStatus =
    element && (element.type === "title" || element.type === "text")
      ? textOverflowStatus(element)
      : null
  const activeTextSelection =
    element &&
    (element.type === "title" || element.type === "text") &&
    textSelection?.elementId === element.id
      ? normalizeTextSelection(
          element.content.length,
          textSelection.start,
          textSelection.end,
        )
      : null
  const activeRichTextState =
    element && (element.type === "title" || element.type === "text")
      ? richTextSelectionState(element, activeTextSelection)
      : null

  useEffect(() => {
    setCustomLayouts(readCustomSlideLayouts())
  }, [])

  async function copyActionHandoffReport() {
    if (!navigator.clipboard) {
      setActionHandoffCopyState("error")
      return
    }

    try {
      await navigator.clipboard.writeText(serializeActionButtonHandoffReport(deck))
      setActionHandoffCopyState("copied")
    } catch {
      setActionHandoffCopyState("error")
    }
  }

  if (!slide) {
    return null
  }

  const taggedPlaceholderCount = slide.elements.filter(
    (item) => item.placeholderRole !== "none",
  ).length
  const selectedLayoutSlideIds = selectedSlideIds.length
    ? selectedSlideIds
    : [slide.id]
  const selectedLayoutSlideCount = selectedLayoutSlideIds.length

  async function replaceImage(file: File | undefined) {
    if (!file || !element || element.type !== "image") return
    const src = await readImageFileAsDataUrl(file)
    replaceImageElement(element.id, {
      src,
      alt: element.alt || file.name,
    })
  }

  async function replaceAudio(file: File | undefined) {
    if (!file || !element || element.type !== "audio") return
    const src = await readMediaFileAsDataUrl(file)
    replaceAudioElement(element.id, {
      src,
      alt: element.alt || file.name,
    })
  }

  async function replaceVideo(file: File | undefined) {
    if (!file || !element || element.type !== "video") return
    const src = await readMediaFileAsDataUrl(file)
    replaceVideoElement(element.id, {
      src,
      alt: element.alt || file.name,
    })
  }

  function applySelectedTextRange(style: RichTextRangeStyle) {
    if (!element || !activeTextSelection) return
    updateElement(element.id, {
      textRanges: applyRichTextRange(
        element,
        activeTextSelection,
        style,
        nanoid(),
      ),
    })
  }

  function toggleSelectedTextRange(style: RichTextRangeStyle) {
    if (!element || !activeTextSelection) return
    updateElement(element.id, {
      textRanges: toggleRichTextRange(
        element,
        activeTextSelection,
        style,
        nanoid(),
      ),
    })
  }

  function clearSelectedTextRange() {
    if (!element || !activeTextSelection) return
    updateElement(element.id, {
      textRanges: clearRichTextRange(element, activeTextSelection),
    })
  }

  function resizeSelectedTable(rows: number, columns: number) {
    if (!element || element.type !== "table") return

    updateElement(element.id, resizeTableCells(element, rows, columns))
  }

  function updateSelectedTableCells(value: string) {
    if (!element || element.type !== "table") return
    const rows = tableRows(element)
    const columns = tableColumns(element)

    updateElement(element.id, {
      tableCells: tableCellsFromTsv(value, rows, columns),
    })
  }

  function mergeSelectedTableHeaderRow() {
    if (!element || element.type !== "table") return
    const columns = tableColumns(element)
    if (columns <= 1) return

    updateElement(
      element.id,
      mergeTableCells(element, {
        row: 0,
        column: 0,
        rowSpan: 1,
        columnSpan: columns,
      }),
    )
  }

  function splitSelectedTableCells() {
    if (!element || element.type !== "table") return
    updateElement(element.id, splitTableCells(element))
  }

  function updateSelectedTableSelection(selection: TableCellRange) {
    if (!element || element.type !== "table") return
    setTableCellSelections((current) => ({
      ...current,
      [element.id]: selection,
    }))
  }

  function updateSelectedChartData(value: string) {
    if (!element || element.type !== "chart") return
    const chartSeries = chartSeriesFromTsv(value, element.chartSeries)

    updateElement(element.id, {
      chartData: value.includes("\t")
        ? chartDataFromSeries(chartSeries)
        : chartDataFromTsv(value),
      chartSeries,
    })
  }

  function saveCurrentCustomLayout() {
    if (!slide) return
    const result = saveCustomSlideLayout(slide, customLayoutName)
    setCustomLayouts(result.layouts)
    setCustomLayoutMessage(
      result.saved
        ? "Saved custom layout."
        : "Tag title, body, media, or caption placeholders first.",
    )
    if (result.saved) {
      setCustomLayoutName("")
    }
  }

  function applySavedCustomLayout(
    layout: CustomSlideLayout,
    slideIds = [selectedSlideId],
  ) {
    applyCustomSlideLayoutToSelection({ layout, slideIds })
    setCustomLayoutMessage(
      slideIds.length > 1
        ? `Applied ${layout.label} to ${slideIds.length} slides.`
        : `Applied ${layout.label}.`,
    )
  }

  function removeSavedCustomLayout(layoutId: string) {
    setCustomLayouts(deleteCustomSlideLayout(layoutId))
    setCustomLayoutMessage("Deleted custom layout.")
  }

  async function exportCustomLayouts() {
    if (!customLayouts.length) {
      setCustomLayoutMessage("No saved custom layouts to export.")
      return
    }

    await saveTextFileWithPicker(
      customSlideLayoutsFileName,
      serializeCustomSlideLayouts(customLayouts),
      "application/json",
      customLayoutJsonPickerTypes,
    )
    setCustomLayoutMessage(
      `Exported ${customLayouts.length} custom layout${
        customLayouts.length === 1 ? "" : "s"
      }.`,
    )
  }

  async function importCustomLayoutFile(file: File | undefined) {
    if (!file) return

    const result = importCustomSlideLayoutsFromText(await file.text())
    setCustomLayouts(result.layouts)
    setCustomLayoutMessage(
      result.added
        ? `Imported ${result.added} custom layout${
            result.added === 1 ? "" : "s"
          }.`
        : "No new custom layouts found.",
    )

    if (customLayoutImportInputRef.current) {
      customLayoutImportInputRef.current.value = ""
    }
  }

  return (
    <aside
      role="region"
      aria-label="Properties and review panels"
      className={cn(
        "hidden min-h-0 shrink-0 flex-col border-l bg-background lg:flex",
        width ? "" : densityConfig.propertiesClassName,
      )}
      style={width ? ({ width } as CSSProperties) : undefined}
      data-testid={presentationSmokeTestIds.workspacePropertiesPanel}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b",
          densityConfig.panelHeaderClassName,
        )}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Format
        </span>
        <Badge variant="outline">{element ? "Object" : "Slide"}</Badge>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 p-3">
          <section className="grid gap-3">
            <div className="text-sm font-semibold">Slide</div>
            <Field label="Title">
              <Input
                value={slide.title}
                onChange={(event) =>
                  updateSlide(slide.id, { title: event.currentTarget.value })
                }
              />
            </Field>
            <Field label="Section">
              <Input
                value={slide.sectionTitle ?? ""}
                placeholder="No section break"
                onChange={(event) =>
                  updateSlide(slide.id, {
                    sectionTitle: event.currentTarget.value,
                  })
                }
              />
            </Field>
            <Field label="Layout">
              <select
                className="h-8 rounded-md border bg-background px-2 text-sm"
                value={slide.layout}
                onChange={(event) =>
                  updateSlide(slide.id, {
                    layout: event.currentTarget.value as SlideLayout,
                  })
                }
              >
                {Object.entries(slideLayoutLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={slide.layout === "blank"}
              onClick={() => applySlideLayout(slide.id, slide.layout)}
            >
              Apply layout placeholders
            </Button>
            <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
              <input
                ref={customLayoutImportInputRef}
                className="hidden"
                type="file"
                accept="application/json"
                onChange={(event) =>
                  void importCustomLayoutFile(event.currentTarget.files?.[0])
                }
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Custom layouts
                </span>
                <Badge variant="outline">{taggedPlaceholderCount} tagged</Badge>
              </div>
              <div className="flex gap-2">
                <Input
                  value={customLayoutName}
                  placeholder="Layout name"
                  onChange={(event) =>
                    setCustomLayoutName(event.currentTarget.value)
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={saveCurrentCustomLayout}
                >
                  Save
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => customLayoutImportInputRef.current?.click()}
                >
                  <FileUp className="size-4" />
                  Import
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => void exportCustomLayouts()}
                >
                  <FileDown className="size-4" />
                  Export
                </Button>
              </div>
              {customLayouts.length ? (
                <div className="grid gap-2">
                  {customLayouts.map((layout) => (
                    <div
                      key={layout.id}
                      className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">
                          {layout.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {layout.description}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => applySavedCustomLayout(layout)}
                        >
                          Current
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={selectedLayoutSlideCount < 2}
                          onClick={() =>
                            applySavedCustomLayout(
                              layout,
                              selectedLayoutSlideIds,
                            )
                          }
                        >
                          {selectedLayoutSlideCount > 1
                            ? `${selectedLayoutSlideCount} slides`
                            : "Selected"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSavedCustomLayout(layout.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {customLayoutMessage ? (
                <span className="text-xs text-muted-foreground">
                  {customLayoutMessage}
                </span>
              ) : null}
            </div>
            <MasterLayoutPresetSection
              master={deck.master}
              slide={slide}
              selectedSlideIds={selectedLayoutSlideIds}
              selectedSlideCount={selectedLayoutSlideCount}
              onApplyPreset={(layout, slideIds) =>
                applyCustomSlideLayoutToSelection({ layout, slideIds })
              }
              onUpdateMaster={updateDeckMaster}
            />
            <div className="grid gap-3">
              <Field label="Transition">
                <TransitionPresetPicker
                  value={slide.transition ?? "none"}
                  onChange={(transition) =>
                    updateSlide(slide.id, {
                      transition,
                    })
                  }
                />
              </Field>
              <Field label="Duration ms">
                <Input
                  type="number"
                  min={0}
                  max={3000}
                  step={50}
                  value={slide.transitionDurationMs ?? 350}
                  onChange={(event) =>
                    updateSlide(slide.id, {
                      transitionDurationMs: clampDuration(
                        Number(event.currentTarget.value),
                      ),
                    })
                  }
                />
              </Field>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={(slide.transition ?? "none") === "none"}
              onClick={previewSlideTransition}
            >
              <Play className="size-4" />
              Preview transition
            </Button>
            <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="auto-advance"
                  className="text-xs text-muted-foreground"
                >
                  Auto advance
                </Label>
                <Switch
                  id="auto-advance"
                  size="sm"
                  checked={(slide.autoAdvanceAfterMs ?? 0) > 0}
                  onCheckedChange={(checked) =>
                    updateSlide(slide.id, {
                      autoAdvanceAfterMs: checked ? 8000 : 0,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="After ms">
                  <Input
                    type="number"
                    min={0}
                    max={3_600_000}
                    step={250}
                    disabled={(slide.autoAdvanceAfterMs ?? 0) === 0}
                    value={slide.autoAdvanceAfterMs ?? 0}
                    onChange={(event) =>
                      updateSlide(slide.id, {
                        autoAdvanceAfterMs: clampAdvance(
                          Number(event.currentTarget.value),
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="Rehearsed ms">
                  <Input
                    type="number"
                    min={0}
                    max={86_400_000}
                    step={250}
                    value={slide.rehearsalDurationMs ?? 0}
                    onChange={(event) =>
                      updateSlide(slide.id, {
                        rehearsalDurationMs: clampRehearsal(
                          Number(event.currentTarget.value),
                        ),
                      })
                    }
                  />
                </Field>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">
                Background
              </Label>
              <div className="flex flex-wrap gap-2">
                {canvasPalette.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Set background ${color}`}
                    className="size-7 rounded-md border shadow-sm"
                    style={{ background: color }}
                    onClick={() => updateSlide(slide.id, { background: color })}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Master
              </div>
              <MasterStylePresetPicker
                master={deck.master}
                onChange={updateDeckMaster}
              />
              <MasterThemeSafeguardPanel deck={deck} />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-2">
                  <Label
                    htmlFor="master-footer"
                    className="text-xs text-muted-foreground"
                  >
                    Footer
                  </Label>
                  <Switch
                    id="master-footer"
                    size="sm"
                    checked={deck.master.showFooter}
                    onCheckedChange={(checked) =>
                      updateDeckMaster({ showFooter: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-2">
                  <Label
                    htmlFor="master-date"
                    className="text-xs text-muted-foreground"
                  >
                    Date
                  </Label>
                  <Switch
                    id="master-date"
                    size="sm"
                    checked={deck.master.showDate}
                    onCheckedChange={(checked) =>
                      updateDeckMaster({ showDate: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-2">
                  <Label
                    htmlFor="master-number"
                    className="text-xs text-muted-foreground"
                  >
                    Number
                  </Label>
                  <Switch
                    id="master-number"
                    size="sm"
                    checked={deck.master.showSlideNumbers}
                    onCheckedChange={(checked) =>
                      updateDeckMaster({ showSlideNumbers: checked })
                    }
                  />
                </div>
              </div>
              <Field label="Footer text">
                <Input
                  value={deck.master.footerText}
                  onChange={(event) =>
                    updateDeckMaster({ footerText: event.currentTarget.value })
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Master color">
                  <Input
                    value={deck.master.color}
                    onChange={(event) =>
                      updateDeckMaster({ color: event.currentTarget.value })
                    }
                  />
                </Field>
                <Field label="Master font">
                  <Input
                    type="number"
                    min={6}
                    max={24}
                    value={deck.master.fontSize}
                    onChange={(event) =>
                      updateDeckMaster({
                        fontSize: clampMasterFontSize(
                          Number(event.currentTarget.value),
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="Master family">
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                    value={deck.master.fontFamily}
                    onChange={(event) =>
                      updateDeckMaster({
                        fontFamily: event.currentTarget.value as FontFamily,
                      })
                    }
                  >
                    {fontFamilyOptions.map((value) => (
                      <option key={value} value={value}>
                        {fontFamilyLabels[value]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </section>

          <Separator />

          <LayerList slide={slide} />

          <Separator />

          <ReviewComments />

          <Separator />

          <AccessibilityCheckerPanel />

          <Separator />

          <ProofingCheckerPanel />

          <Separator />

          {element ? (
            <section className="grid gap-3">
              <div className="text-sm font-semibold">Object</div>
              {element.locked ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  This layer is locked. Unlock it from Layers to edit position,
                  size, text, and styling.
                </div>
              ) : null}
              <fieldset
                className="grid gap-3 disabled:opacity-60"
                disabled={element.locked}
              >
              {element.type === "title" || element.type === "text" ? (
                <div className="grid gap-2">
                  <Field label="Text">
                    <Textarea
                      spellCheck
                      value={element.content}
                      onChange={(event) =>
                        updateElement(element.id, {
                          content: event.currentTarget.value,
                        })
                      }
                      onSelect={(event) => {
                        setTextSelection({
                          elementId: element.id,
                          start: event.currentTarget.selectionStart,
                          end: event.currentTarget.selectionEnd,
                        })
                      }}
                    />
                  </Field>
                  <div className="grid gap-2 rounded-md border bg-muted/30 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Range
                      </span>
                      <Badge variant="outline">
                        {activeTextSelection
                          ? `${activeTextSelection.end - activeTextSelection.start} chars`
                          : "Select text"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={activeRichTextState?.bold ? "secondary" : "outline"}
                        size="icon-sm"
                        aria-label="Bold selected text"
                        aria-pressed={activeRichTextState?.bold ?? false}
                        disabled={!activeTextSelection}
                        onClick={() =>
                          toggleSelectedTextRange({ fontWeight: 700 })
                        }
                      >
                        <Bold className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={
                          activeRichTextState?.italic ? "secondary" : "outline"
                        }
                        size="icon-sm"
                        aria-label="Italic selected text"
                        aria-pressed={activeRichTextState?.italic ?? false}
                        disabled={!activeTextSelection}
                        onClick={() => toggleSelectedTextRange({ italic: true })}
                      >
                        <Italic className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={
                          activeRichTextState?.underline
                            ? "secondary"
                            : "outline"
                        }
                        size="icon-sm"
                        aria-label="Underline selected text"
                        aria-pressed={activeRichTextState?.underline ?? false}
                        disabled={!activeTextSelection}
                        onClick={() =>
                          toggleSelectedTextRange({ underline: true })
                        }
                      >
                        <Underline className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label="Clear selected text formatting"
                        disabled={!activeTextSelection}
                        onClick={clearSelectedTextRange}
                      >
                        <Eraser className="size-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {textPalette.map((color) => (
                        <button
                          key={`range-${color}`}
                          type="button"
                          aria-label={`Set selected text ${color}`}
                          disabled={!activeTextSelection}
                          className="size-6 rounded-md border shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                          style={{ background: color }}
                          onClick={() => applySelectedTextRange({ color })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
              {textStatus?.clipped ? (
                <div className="grid gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="size-4" />
                    Text overflow
                  </div>
                  <div>
                    Some text is likely clipped in this box. Increase the box
                    size, reduce font size, add columns, or shrink to fit.
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateElement(element.id, { textFit: "shrink" })
                    }
                  >
                    Shrink to fit
                  </Button>
                </div>
              ) : null}
              {textStatus?.shrunk ? (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Shrink to fit is using approximately{" "}
                  {textStatus.effectiveFontSize}px text for this box.
                </div>
              ) : null}
              {element.type === "image" ? (
                <>
                  <input
                    ref={replaceImageInputRef}
                    className="hidden"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    onChange={(event) => {
                      void replaceImage(event.currentTarget.files?.[0])
                      event.currentTarget.value = ""
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => replaceImageInputRef.current?.click()}
                  >
                    <ImagePlus className="size-4" />
                    Replace image
                  </Button>
                  <Field label="Alt text">
                    <Input
                      value={element.alt}
                      onChange={(event) =>
                        updateElement(element.id, {
                          alt: event.currentTarget.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Fit">
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={element.fit}
                      onChange={(event) =>
                        updateElement(element.id, {
                          fit: event.currentTarget.value as ImageFit,
                        })
                      }
                    >
                      <option value="cover">Crop to fill</option>
                      <option value="contain">Fit inside</option>
                      <option value="fill">Stretch</option>
                    </select>
                  </Field>
                  <Field label="Mask">
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={elementImageMask(element)}
                      onChange={(event) =>
                        updateElement(element.id, {
                          imageMask: event.currentTarget.value as ImageMask,
                        })
                      }
                    >
                      {Object.entries(imageMaskLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {element.fit !== "fill" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Crop X">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={element.imagePositionX}
                          onChange={(event) =>
                            updateElement(element.id, {
                              imagePositionX: clampPercent(
                                Number(event.currentTarget.value),
                              ),
                            })
                          }
                        />
                      </Field>
                      <Field label="Crop Y">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={element.imagePositionY}
                          onChange={(event) =>
                            updateElement(element.id, {
                              imagePositionY: clampPercent(
                                Number(event.currentTarget.value),
                              ),
                            })
                          }
                        />
                      </Field>
                    </div>
                  ) : null}
                  <ImageCorrectionControls
                    opacity={element.imageOpacity}
                    brightness={element.imageBrightness}
                    contrast={element.imageContrast}
                    saturation={element.imageSaturation}
                    onChange={(patch) => updateElement(element.id, patch)}
                  />
                </>
              ) : null}
              {element.type === "audio" ? (
                <>
                  <input
                    ref={replaceAudioInputRef}
                    className="hidden"
                    type="file"
                    accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm"
                    onChange={(event) => {
                      void replaceAudio(event.currentTarget.files?.[0])
                      event.currentTarget.value = ""
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => replaceAudioInputRef.current?.click()}
                  >
                    <Volume2 className="size-4" />
                    Replace audio
                  </Button>
                  <Field label="Audio title">
                    <Input
                      value={element.alt}
                      onChange={(event) =>
                        updateElement(element.id, {
                          alt: event.currentTarget.value,
                        })
                      }
                    />
                  </Field>
                  <MediaCaptionControls
                    element={element}
                    onChange={(patch) => updateElement(element.id, patch)}
                  />
                  <MediaHandoffPanel element={element} />
                  <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
                    <Label
                      htmlFor="audio-autoplay"
                      className="text-xs text-muted-foreground"
                    >
                      Autoplay in slideshow
                    </Label>
                    <Switch
                      id="audio-autoplay"
                      size="sm"
                      checked={element.mediaAutoplay}
                      onCheckedChange={(checked) =>
                        updateElement(element.id, {
                          mediaAutoplay: checked,
                        })
                      }
                    />
                  </div>
                  <MediaTrimControls
                    start={element.mediaStartSeconds}
                    end={element.mediaEndSeconds}
                    onChange={(patch) => updateElement(element.id, patch)}
                  />
                </>
              ) : null}
              {element.type === "video" ? (
                <>
                  <input
                    ref={replaceVideoInputRef}
                    className="hidden"
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    onChange={(event) => {
                      void replaceVideo(event.currentTarget.files?.[0])
                      event.currentTarget.value = ""
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => replaceVideoInputRef.current?.click()}
                  >
                    <Video className="size-4" />
                    Replace video
                  </Button>
                  <Field label="Video title">
                    <Input
                      value={element.alt}
                      onChange={(event) =>
                        updateElement(element.id, {
                          alt: event.currentTarget.value,
                        })
                      }
                    />
                  </Field>
                  <MediaCaptionControls
                    element={element}
                    onChange={(patch) => updateElement(element.id, patch)}
                  />
                  <MediaHandoffPanel element={element} />
                  <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
                    <Label
                      htmlFor="video-autoplay"
                      className="text-xs text-muted-foreground"
                    >
                      Autoplay in slideshow
                    </Label>
                    <Switch
                      id="video-autoplay"
                      size="sm"
                      checked={element.mediaAutoplay}
                      onCheckedChange={(checked) =>
                        updateElement(element.id, {
                          mediaAutoplay: checked,
                        })
                      }
                    />
                  </div>
                  <Field label="Fit">
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={element.fit}
                      onChange={(event) =>
                        updateElement(element.id, {
                          fit: event.currentTarget.value as ImageFit,
                        })
                      }
                    >
                      <option value="contain">Fit inside</option>
                      <option value="cover">Crop to fill</option>
                      <option value="fill">Stretch</option>
                    </select>
                  </Field>
                  <MediaTrimControls
                    start={element.mediaStartSeconds}
                    end={element.mediaEndSeconds}
                    onChange={(patch) => updateElement(element.id, patch)}
                  />
                </>
              ) : null}
              {element.type === "table" ? (
                <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Table
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Rows">
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={tableRows(element)}
                        onChange={(event) =>
                          resizeSelectedTable(
                            Number(event.currentTarget.value),
                            tableColumns(element),
                          )
                        }
                      />
                    </Field>
                    <Field label="Columns">
                      <Input
                        type="number"
                        min={1}
                        max={8}
                        value={tableColumns(element)}
                        onChange={(event) =>
                          resizeSelectedTable(
                            tableRows(element),
                            Number(event.currentTarget.value),
                          )
                        }
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={tableRows(element) <= 1}
                      onClick={() =>
                        resizeSelectedTable(
                          tableRows(element) - 1,
                          tableColumns(element),
                        )
                      }
                    >
                      Remove row
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={tableRows(element) >= 12}
                      onClick={() =>
                        resizeSelectedTable(
                          tableRows(element) + 1,
                          tableColumns(element),
                        )
                      }
                    >
                      Add row
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={tableColumns(element) <= 1}
                      onClick={() =>
                        resizeSelectedTable(
                          tableRows(element),
                          tableColumns(element) - 1,
                        )
                      }
                    >
                      Remove column
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={tableColumns(element) >= 8}
                      onClick={() =>
                        resizeSelectedTable(
                          tableRows(element),
                          tableColumns(element) + 1,
                        )
                      }
                    >
                      Add column
                    </Button>
                  </div>
                  <div className="grid gap-2 rounded-md border bg-background p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Cell merges
                      </span>
                      <Badge variant="outline">
                        {activeTableMerges.length
                          ? `${activeTableMerges.length} active`
                          : "None"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={tableColumns(element) <= 1}
                        onClick={mergeSelectedTableHeaderRow}
                      >
                        Merge header
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!activeTableMerges.length}
                        onClick={splitSelectedTableCells}
                      >
                        Split all
                      </Button>
                    </div>
                  </div>
                  <TableCellSelectionPanel
                    element={element}
                    selection={tableCellSelections[element.id]}
                    onSelectionChange={updateSelectedTableSelection}
                    onChange={(patch) => updateElement(element.id, patch)}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      htmlFor="table-header-row"
                      className="text-xs text-muted-foreground"
                    >
                      Header row
                    </Label>
                    <Switch
                      id="table-header-row"
                      size="sm"
                      checked={element.tableHeaderRow}
                      onCheckedChange={(checked) =>
                        updateElement(element.id, { tableHeaderRow: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      htmlFor="table-total-row"
                      className="text-xs text-muted-foreground"
                    >
                      Total row
                    </Label>
                    <Switch
                      id="table-total-row"
                      size="sm"
                      checked={element.tableTotalRow}
                      onCheckedChange={(checked) =>
                        updateElement(element.id, { tableTotalRow: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      htmlFor="table-banded-rows"
                      className="text-xs text-muted-foreground"
                    >
                      Banded rows
                    </Label>
                    <Switch
                      id="table-banded-rows"
                      size="sm"
                      checked={element.tableBandedRows}
                      onCheckedChange={(checked) =>
                        updateElement(element.id, { tableBandedRows: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      htmlFor="table-banded-columns"
                      className="text-xs text-muted-foreground"
                    >
                      Banded columns
                    </Label>
                    <Switch
                      id="table-banded-columns"
                      size="sm"
                      checked={element.tableBandedColumns}
                      onCheckedChange={(checked) =>
                        updateElement(element.id, {
                          tableBandedColumns: checked,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
                      <Label
                        htmlFor="table-first-column"
                        className="text-xs text-muted-foreground"
                      >
                        First column
                      </Label>
                      <Switch
                        id="table-first-column"
                        size="sm"
                        checked={element.tableFirstColumn}
                        onCheckedChange={(checked) =>
                          updateElement(element.id, {
                            tableFirstColumn: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
                      <Label
                        htmlFor="table-last-column"
                        className="text-xs text-muted-foreground"
                      >
                        Last column
                      </Label>
                      <Switch
                        id="table-last-column"
                        size="sm"
                        checked={element.tableLastColumn}
                        onCheckedChange={(checked) =>
                          updateElement(element.id, {
                            tableLastColumn: checked,
                          })
                        }
                      />
                    </div>
                  </div>
                  <Field label="Style">
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={elementTableStyle(element)}
                      onChange={(event) =>
                        updateElement(element.id, {
                          tableStyle: event.currentTarget.value as TableStyle,
                        })
                      }
                    >
                      {tableStyleOptions.map((value) => (
                        <option key={value} value={value}>
                          {tableStyleLabels[value]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {element.tableOfficeStyleId || element.tableOfficeStyleName ? (
                    <div className="grid gap-1 rounded-md border bg-background px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Office table style
                        </span>
                        <Badge variant="outline">Imported</Badge>
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {element.tableOfficeStyleName ||
                          element.tableOfficeStyleId}
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Text align">
                      <select
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                        value={elementTextAlign(element)}
                        onChange={(event) =>
                          updateElement(element.id, {
                            textAlign: event.currentTarget.value as TextAlign,
                          })
                        }
                      >
                        {Object.entries(textAlignLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Vertical">
                      <select
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                        value={elementTableVerticalAlign(element)}
                        onChange={(event) =>
                          updateElement(element.id, {
                            tableVerticalAlign: event.currentTarget
                              .value as TableVerticalAlign,
                          })
                        }
                      >
                        {tableVerticalAlignOptions.map((value) => (
                          <option key={value} value={value}>
                            {tableVerticalAlignLabels[value]}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Cells">
                    <Textarea
                      value={tableCellsToTsv(element)}
                      className="min-h-28 font-mono text-xs"
                      onChange={(event) =>
                        updateSelectedTableCells(event.currentTarget.value)
                      }
                    />
                  </Field>
                  <Field label="Border">
                    <Input
                      value={element.tableBorderColor}
                      onChange={(event) =>
                        updateElement(element.id, {
                          tableBorderColor: event.currentTarget.value,
                        })
                      }
                    />
                  </Field>
                </div>
              ) : null}
              {element.type === "chart" ? (
                <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Chart
                  </div>
                  <Field label="Type">
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={element.chartType}
                      onChange={(event) =>
                        updateElement(element.id, {
                          chartType: event.currentTarget.value as ChartType,
                        })
                      }
                    >
                      {Object.entries(chartTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Series data">
                    <Textarea
                      value={chartSeriesToTsv(element)}
                      className="min-h-28 font-mono text-xs"
                      placeholder={"Category\tRevenue\tMargin\nColor\t#2563eb\t#16a34a\nQ1\t42\t18"}
                      onChange={(event) =>
                        updateSelectedChartData(event.currentTarget.value)
                      }
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
                      <Label
                        htmlFor="chart-legend"
                        className="text-xs text-muted-foreground"
                      >
                        Legend
                      </Label>
                      <Switch
                        id="chart-legend"
                        size="sm"
                        checked={element.chartShowLegend}
                        onCheckedChange={(checked) =>
                          updateElement(element.id, {
                            chartShowLegend: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
                      <Label
                        htmlFor="chart-values"
                        className="text-xs text-muted-foreground"
                      >
                        Values
                      </Label>
                      <Switch
                        id="chart-values"
                        size="sm"
                        checked={element.chartShowValues}
                        onCheckedChange={(checked) =>
                          updateElement(element.id, {
                            chartShowValues: checked,
                          })
                        }
                      />
                    </div>
                  </div>
                  <Field label="Axis">
                    <Input
                      value={element.chartAxisColor}
                      onChange={(event) =>
                        updateElement(element.id, {
                          chartAxisColor: event.currentTarget.value,
                        })
                      }
                    />
                  </Field>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <Field label="X">
                  <Input
                    type="number"
                    value={element.x}
                    onChange={(event) =>
                      updateElement(element.id, {
                        x: clampPercent(Number(event.currentTarget.value)),
                      })
                    }
                  />
                </Field>
                <Field label="Y">
                  <Input
                    type="number"
                    value={element.y}
                    onChange={(event) =>
                      updateElement(element.id, {
                        y: clampPercent(Number(event.currentTarget.value)),
                      })
                    }
                  />
                </Field>
                <Field label="W">
                  <Input
                    type="number"
                    value={element.width}
                    onChange={(event) =>
                      updateElement(element.id, {
                        width: clampPercent(Number(event.currentTarget.value)),
                      })
                    }
                  />
                </Field>
                <Field label="H">
                  <Input
                    type="number"
                    value={element.height}
                    onChange={(event) =>
                      updateElement(element.id, {
                        height: clampPercent(Number(event.currentTarget.value)),
                      })
                    }
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {element.type === "title" ||
                element.type === "text" ||
                element.type === "table" ||
                element.type === "chart" ? (
                  <Field label="Font size">
                    <Input
                      type="number"
                      value={element.fontSize}
                      onChange={(event) =>
                        updateElement(element.id, {
                          fontSize: Number(event.currentTarget.value),
                        })
                      }
                    />
                  </Field>
                ) : null}
                {element.type === "title" ||
                element.type === "text" ||
                element.type === "table" ||
                element.type === "chart" ? (
                  <Field label="Font family">
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={element.fontFamily}
                      onChange={(event) =>
                        updateElement(element.id, {
                          fontFamily: event.currentTarget.value as FontFamily,
                        })
                      }
                    >
                      {fontFamilyOptions.map((value) => (
                        <option key={value} value={value}>
                          {fontFamilyLabels[value]}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
                <Field label="Radius">
                  <Input
                    type="number"
                    value={element.radius}
                    onChange={(event) =>
                      updateElement(element.id, {
                        radius: Number(event.currentTarget.value),
                      })
                    }
                  />
                </Field>
              </div>
              <Field label="Rotation">
                <Input
                  type="number"
                  value={element.rotation ?? 0}
                  onChange={(event) =>
                    updateElement(element.id, {
                      rotation: Number(event.currentTarget.value),
                    })
                  }
                />
              </Field>
              <Field label="Placeholder role">
                <select
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={element.placeholderRole}
                  onChange={(event) =>
                    updateElement(element.id, {
                      placeholderRole: event.currentTarget
                        .value as PlaceholderRole,
                    })
                  }
                >
                  {Object.entries(placeholderRoleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Animation
                </div>
                <Field label="Effect">
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                    value={element.animation ?? "none"}
                    onChange={(event) =>
                      updateElement(element.id, {
                        animation: event.currentTarget
                          .value as ElementAnimation,
                      })
                    }
                  >
                    {Object.entries(elementAnimationLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
                <Field label="Start">
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                    disabled={(element.animation ?? "none") === "none"}
                    value={element.animationTrigger ?? "onClick"}
                    onChange={(event) =>
                      updateElement(element.id, {
                        animationTrigger: event.currentTarget
                          .value as ElementAnimationTrigger,
                      })
                    }
                  >
                    {Object.entries(elementAnimationTriggerLabels).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Duration ms">
                    <Input
                      type="number"
                      min={50}
                      max={5000}
                      step={50}
                      disabled={(element.animation ?? "none") === "none"}
                      value={element.animationDurationMs ?? 500}
                      onChange={(event) =>
                        updateElement(element.id, {
                          animationDurationMs: clampAnimationDuration(
                            Number(event.currentTarget.value),
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label="Delay ms">
                    <Input
                      type="number"
                      min={0}
                      max={10000}
                      step={50}
                      disabled={(element.animation ?? "none") === "none"}
                      value={element.animationDelayMs ?? 0}
                      onChange={(event) =>
                        updateElement(element.id, {
                          animationDelayMs: clampAnimationDelay(
                            Number(event.currentTarget.value),
                          ),
                        })
                      }
                    />
                  </Field>
                </div>
                {element.animation === "motionCustom" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Motion X %">
                      <Input
                        type="number"
                        min={-100}
                        max={100}
                        step={1}
                        value={element.animationMotionX ?? 16}
                        onChange={(event) =>
                          updateElement(element.id, {
                            animationMotionX: clampAnimationMotionOffset(
                              Number(event.currentTarget.value),
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label="Motion Y %">
                      <Input
                        type="number"
                        min={-100}
                        max={100}
                        step={1}
                        value={element.animationMotionY ?? 0}
                        onChange={(event) =>
                          updateElement(element.id, {
                            animationMotionY: clampAnimationMotionOffset(
                              Number(event.currentTarget.value),
                            ),
                          })
                        }
                      />
                    </Field>
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={(element.animation ?? "none") === "none"}
                  onClick={() => previewElementAnimation(element.id)}
                >
                  <Play className="size-4" />
                  Preview animation
                </Button>
              </div>
              <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Action link
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyActionHandoffReport()}
                  >
                    <ClipboardList className="size-4" />
                    Copy PPTX actions
                  </Button>
                  {actionHandoffCopyState !== "idle" ? (
                    <span className="text-xs text-muted-foreground">
                      {actionHandoffCopyState === "copied"
                        ? "Action report copied."
                        : "Could not copy action report."}
                    </span>
                  ) : null}
                </div>
                <Field label="URL">
                  <Input
                    placeholder="https://example.com"
                    value={element.linkUrl ?? ""}
                    onChange={(event) =>
                      updateElement(element.id, {
                        linkUrl: event.currentTarget.value,
                      })
                    }
                  />
                </Field>
                <Field label="Slide jump">
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                    value={element.linkSlideId ?? ""}
                    onChange={(event) =>
                      updateElement(element.id, {
                        linkSlideId: event.currentTarget.value,
                      })
                    }
                  >
                    <option value="">None</option>
                    {deck.slides.map((item, index) => (
                      <option key={item.id} value={item.id}>
                        {index + 1}. {item.title || "Untitled slide"}
                      </option>
                    ))}
                  </select>
                </Field>
                {slideTargetDiagnostic &&
                slideTargetDiagnostic.status !== "empty" ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background p-2">
                    <Badge
                      variant={
                        slideTargetDiagnostic.status === "ready"
                          ? "outline"
                          : "secondary"
                      }
                    >
                      {slideTargetDiagnostic.status === "ready"
                        ? "Slide jump ready"
                        : "Review slide jump"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {slideTargetDiagnostic.label} -{" "}
                      {slideTargetDiagnostic.detail}
                    </span>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!normalizedElementLinkUrl}
                    onClick={() =>
                      window.open(
                        normalizedElementLinkUrl,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    <ExternalLink className="size-4" />
                    Open link
                  </Button>
                  {element.linkUrl?.trim() && !normalizedElementLinkUrl ? (
                    <span className="text-xs text-destructive">
                      Use http, https, mailto, or tel.
                    </span>
                  ) : null}
                  {element.linkSlideId?.trim() && !normalizedElementSlideTarget ? (
                    <span className="text-xs text-destructive">
                      Pick an existing slide.
                    </span>
                  ) : null}
                </div>
              </div>
              {element.type === "icon" ? (
                <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Icon
                  </div>
                  <Field label="Glyph">
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={element.iconName}
                      onChange={(event) =>
                        updateElement(element.id, {
                          iconName: event.currentTarget.value as IconName,
                        })
                      }
                    >
                      {iconOptions.map((icon) => (
                        <option key={icon.name} value={icon.name}>
                          {icon.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Title">
                      <Input
                        value={element.alt}
                        onChange={(event) =>
                          updateElement(element.id, {
                            alt: event.currentTarget.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Stroke px">
                      <Input
                        type="number"
                        min={1}
                        max={6}
                        step={0.2}
                        value={iconStrokeWidth(element)}
                        onChange={(event) =>
                          updateElement(element.id, {
                            shapeStrokeWidth: Number(event.currentTarget.value),
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">
                      Color
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {textPalette.map((color) => (
                        <button
                          key={`icon-${color}`}
                          type="button"
                          aria-label={`Set icon ${color}`}
                          className="size-7 rounded-md border shadow-sm"
                          style={{ background: color }}
                          onClick={() => updateElement(element.id, { color })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
              {element.type === "shape" ? (
                <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Shape
                  </div>
                  <Field label="Kind">
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={element.shapeKind}
                      onChange={(event) =>
                        updateElement(element.id, {
                          shapeKind: event.currentTarget.value as ShapeKind,
                          ...connectorGeometryDefaultsPatch(
                            event.currentTarget.value as ShapeKind,
                          ),
                        })
                      }
                    >
                      {Object.entries(shapeKindLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Stroke">
                      <Input
                        value={element.shapeStrokeColor}
                        onChange={(event) =>
                          updateElement(element.id, {
                            shapeStrokeColor: event.currentTarget.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Stroke style">
                      <select
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                        value={shapeStrokeDash(element)}
                        onChange={(event) =>
                          updateElement(element.id, {
                            shapeStrokeDash: event.currentTarget
                              .value as ShapeStrokeDash,
                          })
                        }
                      >
                        {shapeStrokeDashOptions.map((value) => (
                          <option key={value} value={value}>
                            {shapeStrokeDashLabels[value]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Stroke px">
                      <Input
                        type="number"
                        min={1}
                        max={24}
                        value={shapeStrokeWidth(element)}
                        onChange={(event) =>
                          updateElement(element.id, {
                            shapeStrokeWidth: Number(event.currentTarget.value),
                          })
                        }
                      />
                    </Field>
                  </div>
                  {isLinearShape(element) ? (
                    <div className="grid gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Start arrow">
                          <select
                            className="h-8 rounded-md border bg-background px-2 text-sm"
                            value={shapeStartArrowhead(element)}
                            onChange={(event) =>
                              updateElement(element.id, {
                                shapeStartArrowhead: event.currentTarget
                                  .value as ShapeArrowhead,
                              })
                            }
                          >
                            {shapeArrowheadOptions.map((value) => (
                              <option key={value} value={value}>
                                {shapeArrowheadLabels[value]}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="End arrow">
                          <select
                            className="h-8 rounded-md border bg-background px-2 text-sm"
                            value={shapeEndArrowhead(element)}
                            onChange={(event) =>
                              updateElement(element.id, {
                                shapeEndArrowhead: event.currentTarget
                                  .value as ShapeArrowhead,
                              })
                            }
                          >
                            {shapeArrowheadOptions.map((value) => (
                              <option key={value} value={value}>
                                {shapeArrowheadLabels[value]}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <ConnectorGeometryControls
                        element={element}
                        onChange={(patch) => updateElement(element.id, patch)}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {element.type === "title" || element.type === "text" ? (
                <>
                  <Field label="Weight">
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={element.fontWeight}
                      onChange={(event) =>
                        updateElement(element.id, {
                          fontWeight: Number(event.currentTarget.value) as
                            | 400
                            | 500
                            | 600
                            | 700,
                        })
                      }
                    >
                      <option value={400}>Regular</option>
                      <option value={500}>Medium</option>
                      <option value={600}>Semibold</option>
                      <option value={700}>Bold</option>
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Align">
                      <select
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                        value={elementTextAlign(element)}
                        onChange={(event) =>
                          updateElement(element.id, {
                            textAlign: event.currentTarget.value as TextAlign,
                          })
                        }
                      >
                        {Object.entries(textAlignLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                    <Field label="List">
                      <select
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                        value={elementListStyle(element)}
                        onChange={(event) =>
                          updateElement(element.id, {
                            listStyle: event.currentTarget
                              .value as TextListStyle,
                          })
                        }
                      >
                        {Object.entries(textListStyleLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                  </div>
                  <Field label="Line height">
                    <Input
                      type="number"
                      min={0.8}
                      max={2.5}
                      step={0.05}
                      value={elementLineHeight(element)}
                      onChange={(event) =>
                        updateElement(element.id, {
                          lineHeight: clampLineHeight(
                            Number(event.currentTarget.value),
                          ),
                        })
                      }
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Columns">
                      <Input
                        type="number"
                        min={1}
                        max={3}
                        step={1}
                        value={elementTextColumns(element)}
                        onChange={(event) =>
                          updateElement(element.id, {
                            textColumns: clampTextColumns(
                              Number(event.currentTarget.value),
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label="Overflow">
                      <select
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                        value={elementTextFit(element)}
                        onChange={(event) =>
                          updateElement(element.id, {
                            textFit: event.currentTarget.value as TextFit,
                          })
                        }
                      >
                        {Object.entries(textFitLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">Text</Label>
                    <div className="flex flex-wrap gap-2">
                      {textPalette.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Set text ${color}`}
                          className="size-7 rounded-md border shadow-sm"
                          style={{ background: color }}
                          onClick={() => updateElement(element.id, { color })}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
              {element.type === "table" || element.type === "chart" ? (
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">Text</Label>
                  <div className="flex flex-wrap gap-2">
                    {textPalette.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Set object text ${color}`}
                        className="size-7 rounded-md border shadow-sm"
                        style={{ background: color }}
                        onClick={() => updateElement(element.id, { color })}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <Field label="Fill">
                <Input
                  value={element.background}
                  onChange={(event) =>
                    updateElement(element.id, {
                      background: event.currentTarget.value,
                    })
                  }
                />
              </Field>
              </fieldset>
            </section>
          ) : (
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              Select an object on the slide to edit text, position, size, and
              colors.
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
