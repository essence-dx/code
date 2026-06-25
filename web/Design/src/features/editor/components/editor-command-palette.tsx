"use client";

import {
  Circle,
  ChartColumn,
  Clock3,
  Crop,
  Download,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Grid2x2,
  Group as GroupIcon,
  ListChecks,
  Link2,
  Minus,
  PenLine,
  QrCode,
  Redo2,
  Ruler,
  Save,
  Square,
  StickyNote,
  Table2,
  Trash2,
  Type,
  Undo2,
  Ungroup as UngroupIcon,
  ZoomIn,
  ZoomOut,
  Copy,
  Workflow,
} from "lucide-react";
import { useEffect } from "react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import type { EditorLocale } from "@/features/editor/editor-localization";
import { editorCommandMacroCatalog } from "@/features/editor/command-macros";
import { getEditorCommandPaletteCopy } from "@/features/editor/editor-workflow-localization";
import type { ExportFormat } from "@/features/editor/export-design";
import type {
  BooleanShapeOperation,
  EditorCommandMacroId,
} from "@/features/editor/types";

type EditorCommandPaletteProps = {
  open: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  hasGroupedSelection: boolean;
  canConnectSelection: boolean;
  canCreateBooleanShape: boolean;
  selectionCount: number;
  commandAutomationIssueCount: number;
  editorLocale: EditorLocale;
  onOpenChange: (open: boolean) => void;
  onAddText: () => void;
  onAddDocument: () => void;
  onAddRectangle: () => void;
  onAddEllipse: () => void;
  onAddLine: () => void;
  onAddStickyNote: () => void;
  onAddConnector: () => void;
  onAddVectorPath: () => void;
  onAddFlowchart: () => void;
  onAddQrCode: () => void;
  onAddTable: () => void;
  onAddChart: () => void;
  onAddDataStory: () => void;
  onAddForm: () => void;
  onAddEmbed: () => void;
  onAddTimer: () => void;
  onSave: () => void;
  onExport: (format: ExportFormat) => void;
  onDuplicateSelection: () => void;
  onDeleteSelection: () => void;
  onConnectSelection: () => void;
  onBooleanShapeOperation: (operation: BooleanShapeOperation) => void;
  onRunCommandMacro: (macroId: EditorCommandMacroId) => void;
  onDistributeHorizontally: () => void;
  onDistributeVertically: () => void;
  onGroupSelection: () => void;
  onUngroupSelection: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleGuides: () => void;
  onToggleGrid: () => void;
  onTogglePrintMarks: () => void;
};

export function EditorCommandPalette({
  open,
  canUndo,
  canRedo,
  hasSelection,
  hasGroupedSelection,
  canConnectSelection,
  canCreateBooleanShape,
  selectionCount,
  commandAutomationIssueCount,
  editorLocale,
  onOpenChange,
  onAddText,
  onAddDocument,
  onAddRectangle,
  onAddEllipse,
  onAddLine,
  onAddStickyNote,
  onAddConnector,
  onAddVectorPath,
  onAddFlowchart,
  onAddQrCode,
  onAddTable,
  onAddChart,
  onAddDataStory,
  onAddForm,
  onAddEmbed,
  onAddTimer,
  onSave,
  onExport,
  onDuplicateSelection,
  onDeleteSelection,
  onConnectSelection,
  onBooleanShapeOperation,
  onRunCommandMacro,
  onDistributeHorizontally,
  onDistributeVertically,
  onGroupSelection,
  onUngroupSelection,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onToggleGuides,
  onToggleGrid,
  onTogglePrintMarks,
}: EditorCommandPaletteProps) {
  const copy = getEditorCommandPaletteCopy(editorLocale);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  function runCommand(action: () => void) {
    action();
    onOpenChange(false);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      description={copy.description}
      className="sm:max-w-xl"
    >
      <Command>
        <CommandInput placeholder={copy.search} />
        <CommandList>
          <CommandEmpty>{copy.empty}</CommandEmpty>
          <CommandGroup heading={copy.create}>
            <CommandItem onSelect={() => runCommand(onAddText)}>
              <Type className="h-4 w-4" />
              {copy.addText}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddDocument)}>
              <FileText className="h-4 w-4" />
              {copy.addDocument ?? "Add document"}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddRectangle)}>
              <Square className="h-4 w-4" />
              {copy.addRectangle}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddEllipse)}>
              <Circle className="h-4 w-4" />
              {copy.addEllipse}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddLine)}>
              <Minus className="h-4 w-4" />
              {copy.addLine}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddStickyNote)}>
              <StickyNote className="h-4 w-4" />
              {copy.addStickyNote}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddConnector)}>
              <GitBranch className="h-4 w-4" />
              {copy.addConnector}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddVectorPath)}>
              <PenLine className="h-4 w-4" />
              {copy.addVectorPath ?? "Add Bezier path"}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddFlowchart)}>
              <Workflow className="h-4 w-4" />
              {copy.addFlowchart}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddQrCode)}>
              <QrCode className="h-4 w-4" />
              {copy.addQrCode}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddTable)}>
              <Table2 className="h-4 w-4" />
              {copy.addTable}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddChart)}>
              <ChartColumn className="h-4 w-4" />
              {copy.addChart}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddDataStory)}>
              <FileSpreadsheet className="h-4 w-4" />
              {copy.addDataStory}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddForm)}>
              <ListChecks className="h-4 w-4" />
              {copy.addForm}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddEmbed)}>
              <Link2 className="h-4 w-4" />
              {copy.addEmbed}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onAddTimer)}>
              <Clock3 className="h-4 w-4" />
              {copy.addTimer}
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={copy.edit}>
            <CommandItem
              disabled={!canUndo}
              onSelect={() => runCommand(onUndo)}
            >
              <Undo2 className="h-4 w-4" />
              {copy.undo}
              <CommandShortcut>Ctrl Z</CommandShortcut>
            </CommandItem>
            <CommandItem
              disabled={!canRedo}
              onSelect={() => runCommand(onRedo)}
            >
              <Redo2 className="h-4 w-4" />
              {copy.redo}
              <CommandShortcut>Ctrl Y</CommandShortcut>
            </CommandItem>
            <CommandItem
              disabled={!hasSelection}
              onSelect={() => runCommand(onDuplicateSelection)}
            >
              <Copy className="h-4 w-4" />
              {copy.duplicateSelection}
              <CommandShortcut>Ctrl D</CommandShortcut>
            </CommandItem>
            <CommandItem
              disabled={!hasSelection}
              onSelect={() => runCommand(onDeleteSelection)}
            >
              <Trash2 className="h-4 w-4" />
              {copy.deleteSelection}
            </CommandItem>
            <CommandItem
              disabled={!canConnectSelection}
              onSelect={() => runCommand(onConnectSelection)}
            >
              <GitBranch className="h-4 w-4" />
              {copy.connectSelection}
            </CommandItem>
            <CommandItem
              disabled={!canCreateBooleanShape}
              onSelect={() => runCommand(() => onBooleanShapeOperation("union"))}
            >
              <GroupIcon className="h-4 w-4" />
              {copy.booleanUnion ?? "Union selected shapes"}
            </CommandItem>
            <CommandItem
              disabled={!canCreateBooleanShape}
              onSelect={() =>
                runCommand(() => onBooleanShapeOperation("subtract"))
              }
            >
              <Minus className="h-4 w-4" />
              {copy.booleanSubtract ?? "Subtract selected shapes"}
            </CommandItem>
            <CommandItem
              disabled={!canCreateBooleanShape}
              onSelect={() =>
                runCommand(() => onBooleanShapeOperation("intersect"))
              }
            >
              <Grid2x2 className="h-4 w-4" />
              {copy.booleanIntersect ?? "Intersect selected shapes"}
            </CommandItem>
            <CommandItem
              disabled={!canCreateBooleanShape}
              onSelect={() =>
                runCommand(() => onBooleanShapeOperation("exclude"))
              }
            >
              <UngroupIcon className="h-4 w-4" />
              {copy.booleanExclude ?? "Exclude selected shapes"}
            </CommandItem>
            <CommandItem
              disabled={selectionCount < 3}
              onSelect={() => runCommand(onDistributeHorizontally)}
            >
              <Grid2x2 className="h-4 w-4" />
              {copy.distributeHorizontal}
            </CommandItem>
            <CommandItem
              disabled={selectionCount < 3}
              onSelect={() => runCommand(onDistributeVertically)}
            >
              <Grid2x2 className="h-4 w-4" />
              {copy.distributeVertical}
            </CommandItem>
            <CommandItem
              disabled={selectionCount < 2}
              onSelect={() => runCommand(onGroupSelection)}
            >
              <GroupIcon className="h-4 w-4" />
              {copy.groupSelection}
              <CommandShortcut>Ctrl G</CommandShortcut>
            </CommandItem>
            <CommandItem
              disabled={!hasGroupedSelection}
              onSelect={() => runCommand(onUngroupSelection)}
            >
              <UngroupIcon className="h-4 w-4" />
              {copy.ungroupSelection}
              <CommandShortcut>Ctrl Shift G</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={copy.automation ?? "Automation"}>
            {editorCommandMacroCatalog.map((macro) => (
              <CommandItem
                key={macro.id}
                onSelect={() => runCommand(() => onRunCommandMacro(macro.id))}
              >
                {macro.category === "batch" ? (
                  <Grid2x2 className="h-4 w-4" />
                ) : macro.category === "export" ? (
                  <Download className="h-4 w-4" />
                ) : macro.category === "publishing" ? (
                  <Workflow className="h-4 w-4" />
                ) : (
                  <ListChecks className="h-4 w-4" />
                )}
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span>{macro.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {macro.description}
                  </span>
                </span>
              </CommandItem>
            ))}
            {commandAutomationIssueCount > 0 ? (
              <CommandItem disabled>
                <ListChecks className="h-4 w-4" />
                {commandAutomationIssueCount} QA issue
                {commandAutomationIssueCount === 1 ? "" : "s"} from last run
              </CommandItem>
            ) : null}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={copy.view}>
            <CommandItem onSelect={() => runCommand(onZoomOut)}>
              <ZoomOut className="h-4 w-4" />
              {copy.zoomOut}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onZoomIn)}>
              <ZoomIn className="h-4 w-4" />
              {copy.zoomIn}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onToggleGrid)}>
              <Grid2x2 className="h-4 w-4" />
              {copy.toggleGrid}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onToggleGuides)}>
              <Ruler className="h-4 w-4" />
              {copy.toggleGuides}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(onTogglePrintMarks)}>
              <Crop className="h-4 w-4" />
              {copy.togglePrintMarks}
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={copy.file}>
            <CommandItem onSelect={() => runCommand(onSave)}>
              <Save className="h-4 w-4" />
              {copy.saveDesign}
              <CommandShortcut>Ctrl S</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onExport("png"))}>
              <Download className="h-4 w-4" />
              {copy.exportPng}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onExport("jpg"))}>
              <Download className="h-4 w-4" />
              {copy.exportJpg}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onExport("webp"))}>
              <Download className="h-4 w-4" />
              {copy.exportWebp}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onExport("gif"))}>
              <Download className="h-4 w-4" />
              {copy.exportGif}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onExport("mp4"))}>
              <Download className="h-4 w-4" />
              {copy.exportMp4}
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => onExport("media-sequence"))}
            >
              <Download className="h-4 w-4" />
              {copy.exportMediaSequence}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onExport("pdf"))}>
              <FileText className="h-4 w-4" />
              {copy.exportPdf}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onExport("docx"))}>
              <FileText className="h-4 w-4" />
              {copy.exportDocx}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onExport("xlsx"))}>
              <FileSpreadsheet className="h-4 w-4" />
              {copy.exportXlsx}
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => onExport("multipage-pdf"))}
            >
              <FileText className="h-4 w-4" />
              {copy.exportAllPagesPdf}
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => onExport("print-pdf"))}
            >
              <FileText className="h-4 w-4" />
              {copy.exportPrintPdf}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onExport("html"))}>
              <Download className="h-4 w-4" />
              {copy.exportHtml}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
