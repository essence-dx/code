"use client";

import Link from "next/link";
import {
  Crop,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  FolderOpen,
  Globe2,
  Grid2x2,
  History,
  ListChecks,
  LockKeyhole,
  MessageSquare,
  MonitorPlay,
  PackageCheck,
  Palette,
  Redo2,
  Ruler,
  Save,
  Search,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EXPORT_QUALITY_OPTIONS,
  EXPORT_SCALE_OPTIONS,
  type ExportFormat,
  type ExportQuality,
  type ExportScale,
} from "@/features/editor/export-design";
import { DrawingToolMenu } from "@/features/editor/components/drawing-tool-menu";
import { PresenceIndicator } from "@/features/editor/components/presence-indicator";
import {
  editorLocales,
  getEditorToolbarCopy,
  type EditorLocale,
} from "@/features/editor/editor-localization";
import { sharePermissionLabels } from "@/features/projects/project-permissions";
import type {
  ProjectPresenceSummary,
  DrawTool,
  SharePermission,
} from "@/features/editor/types";

type TopToolbarProps = {
  projectName: string;
  embedded?: boolean;
  saveState: "dirty" | "saving" | "saved" | "error";
  autosaveState: "idle" | "saving" | "saved" | "error";
  templateSaveState: "idle" | "saving" | "saved" | "error";
  canUndo: boolean;
  canRedo: boolean;
  showGrid: boolean;
  showGuides: boolean;
  showPrintMarks: boolean;
  canManageSharing: boolean;
  canRestoreVersions: boolean;
  commentCount: number;
  presence: ProjectPresenceSummary[];
  exportQuality: ExportQuality;
  exportScale: ExportScale;
  activeExportProgress: number | null;
  failedExportJobCount: number;
  publicShareId: string | null;
  editShareId: string | null;
  editSharePermission: SharePermission;
  shareState: "idle" | "saving" | "copied" | "error";
  zoom: number;
  editorLocale: EditorLocale;
  activeDrawTool: DrawTool | null;
  onNameChange: (name: string) => void;
  onEditorLocaleChange: (locale: EditorLocale) => void;
  onActiveDrawToolChange: (tool: DrawTool | null) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onSaveAsTemplate: () => void;
  onSaveAsBrandTemplate: () => void;
  onSaveAsTeamTemplate: () => void;
  onOpenVersionHistory: () => void;
  onExport: (format: ExportFormat) => void;
  onOpenExportJobs: () => void;
  onExportQualityChange: (quality: ExportQuality) => void;
  onExportScaleChange: (scale: ExportScale) => void;
  onOpenCommandPalette: () => void;
  onOpenComments: () => void;
  onOpenDesktopFileBridge?: () => void;
  onOpenPrintProof: () => void;
  onOpenPresenterView?: () => void;
  onTogglePublicShare: (enabled: boolean) => void;
  onCopyPublicShareLink: () => void;
  onOpenPublicShareLink: () => void;
  onToggleEditShare: (enabled: boolean, permission?: SharePermission) => void;
  onCopyEditShareLink: () => void;
  onOpenEditShareLink: () => void;
  onToggleGuides: () => void;
  onToggleGrid: () => void;
  onTogglePrintMarks: () => void;
  onZoomChange: (zoom: number) => void;
};

export function TopToolbar({
  projectName,
  embedded = false,
  saveState,
  autosaveState,
  templateSaveState,
  canUndo,
  canRedo,
  showGrid,
  showGuides,
  showPrintMarks,
  canManageSharing,
  canRestoreVersions,
  commentCount,
  presence,
  exportQuality,
  exportScale,
  activeExportProgress,
  failedExportJobCount,
  publicShareId,
  editShareId,
  editSharePermission,
  shareState,
  zoom,
  editorLocale,
  activeDrawTool,
  onNameChange,
  onEditorLocaleChange,
  onActiveDrawToolChange,
  onUndo,
  onRedo,
  onSave,
  onSaveAsTemplate,
  onSaveAsBrandTemplate,
  onSaveAsTeamTemplate,
  onOpenVersionHistory,
  onExport,
  onOpenExportJobs,
  onExportQualityChange,
  onExportScaleChange,
  onOpenCommandPalette,
  onOpenComments,
  onOpenDesktopFileBridge,
  onOpenPrintProof,
  onOpenPresenterView,
  onTogglePublicShare,
  onCopyPublicShareLink,
  onOpenPublicShareLink,
  onToggleEditShare,
  onCopyEditShareLink,
  onOpenEditShareLink,
  onToggleGuides,
  onToggleGrid,
  onTogglePrintMarks,
  onZoomChange,
}: TopToolbarProps) {
  const copy = getEditorToolbarCopy(editorLocale);
  const templateLabel = copy.templateState[templateSaveState];

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 overflow-hidden border-b border-border bg-card px-2 py-1 [&_button]:h-8 [&_button]:gap-1.5 [&_[role=combobox]]:h-8">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {!embedded ? (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/designs">{copy.projects}</Link>
          </Button>
        ) : null}
        <Input
          className={
            embedded
              ? "h-8 min-w-0 max-w-[44vw] flex-1 sm:max-w-56"
              : "h-8 min-w-0 max-w-[34vw] flex-1 sm:max-w-64"
          }
          value={projectName}
          onChange={(event) => onNameChange(event.target.value)}
          aria-label={copy.projectName}
        />
        {!embedded ? (
          <Badge
            variant={saveState === "error" ? "destructive" : "secondary"}
            className="hidden shrink-0 sm:inline-flex"
          >
            {copy.saveState[saveState]}
          </Badge>
        ) : null}
        {!embedded && saveState !== "saved" && autosaveState !== "idle" ? (
          <Badge
            variant={autosaveState === "error" ? "destructive" : "outline"}
            className="hidden shrink-0 lg:inline-flex"
          >
            {copy.autosaveState[autosaveState]}
          </Badge>
        ) : null}
        {!embedded ? (
          <PresenceIndicator presence={presence} />
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={onOpenCommandPalette}
          aria-label={copy.commands}
        >
          <Search className="h-4 w-4" />
          <span className="hidden md:inline">{copy.commands}</span>
        </Button>
        <div className="shrink-0">
          <DrawingToolMenu
            activeTool={activeDrawTool}
            onActiveToolChange={onActiveDrawToolChange}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={copy.undo}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label={copy.redo}
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Workspace</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Workspace</DropdownMenuLabel>
            <div className="px-2 pb-2">
              <Select
                value={editorLocale}
                onValueChange={(value) =>
                  onEditorLocaleChange(value as EditorLocale)
                }
              >
                <SelectTrigger className="w-full" aria-label={copy.language}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editorLocales.map((locale) => (
                    <SelectItem key={locale.id} value={locale.id}>
                      {locale.shortLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!embedded ? (
              <>
                <DropdownMenuItem onClick={onOpenComments}>
                  <MessageSquare className="h-4 w-4" />
                  {copy.comments}
                  {commentCount > 0 ? (
                    <Badge variant="outline">{commentCount}</Badge>
                  ) : null}
                </DropdownMenuItem>
                {onOpenPresenterView ? (
                  <DropdownMenuItem
                    onClick={() => void onOpenPresenterView()}
                  >
                    <MonitorPlay className="h-4 w-4" />
                    {copy.present}
                  </DropdownMenuItem>
                ) : null}
                {onOpenDesktopFileBridge ? (
                  <DropdownMenuItem onClick={onOpenDesktopFileBridge}>
                    <FolderOpen className="h-4 w-4" />
                    Desktop files
                  </DropdownMenuItem>
                ) : null}
                {canRestoreVersions ? (
                  <DropdownMenuItem onClick={onOpenVersionHistory}>
                    <History className="h-4 w-4" />
                    {copy.versionHistory}
                  </DropdownMenuItem>
                ) : null}
              </>
            ) : null}
            {!embedded && canManageSharing ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{copy.share[shareState]}</DropdownMenuLabel>
                {publicShareId ? (
                  <>
                    <DropdownMenuItem onClick={onCopyPublicShareLink}>
                      <Copy className="h-4 w-4" />
                      Copy public link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onOpenPublicShareLink}>
                      <ExternalLink className="h-4 w-4" />
                      Open public view
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onTogglePublicShare(false)}
                    >
                      <Globe2 className="h-4 w-4" />
                      Disable public link
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => onTogglePublicShare(true)}>
                    <Globe2 className="h-4 w-4" />
                    Create public view link
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {editShareId ? (
                  <>
                    <DropdownMenuItem onClick={onCopyEditShareLink}>
                      <Copy className="h-4 w-4" />
                      Copy private link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onOpenEditShareLink}>
                      <ExternalLink className="h-4 w-4" />
                      Open private link
                    </DropdownMenuItem>
                    <DropdownMenuRadioGroup
                      value={editSharePermission}
                      onValueChange={(value) =>
                        onToggleEditShare(true, value as SharePermission)
                      }
                    >
                      <DropdownMenuRadioItem value="view">
                        {sharePermissionLabels.view}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="comment">
                        {sharePermissionLabels.comment}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="edit">
                        {sharePermissionLabels.edit}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuItem onClick={() => onToggleEditShare(false)}>
                      <LockKeyhole className="h-4 w-4" />
                      Disable private link
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => onToggleEditShare(true, "view")}
                    >
                      <LockKeyhole className="h-4 w-4" />
                      Create private view link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onToggleEditShare(true, "comment")}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Create private comment link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onToggleEditShare(true, "edit")}
                    >
                      <LockKeyhole className="h-4 w-4" />
                      Create private edit link
                    </DropdownMenuItem>
                  </>
                )}
              </>
            ) : null}
            {!embedded ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onSaveAsTemplate}
                  disabled={templateSaveState === "saving"}
                >
                  <FilePlus2 className="h-4 w-4" />
                  {templateLabel}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveAsBrandTemplate}>
                  <Palette className="h-4 w-4" />
                  Save as brand template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveAsTeamTemplate}>
                  <FilePlus2 className="h-4 w-4" />
                  Save as team template
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Ruler className="h-4 w-4" />
              <span className="hidden sm:inline">View</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Canvas view</DropdownMenuLabel>
            <div className="flex items-center gap-2 px-2 pb-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onZoomChange(Math.max(0.2, zoom - 0.1))}
                aria-label={copy.zoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Badge variant="outline" className="flex-1 justify-center">
                {Math.round(zoom * 100)}%
              </Badge>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
                aria-label={copy.zoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleGrid}>
              <Grid2x2 className="h-4 w-4" />
              {showGrid ? copy.hideGrid : copy.showGrid}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleGuides}>
              <Ruler className="h-4 w-4" />
              {showGuides ? copy.hideGuides : copy.showGuides}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onTogglePrintMarks}>
              <Crop className="h-4 w-4" />
              {showPrintMarks ? copy.hidePrintMarks : copy.showPrintMarks}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenPrintProof}>
              <PackageCheck className="h-4 w-4" />
              Print proof
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={activeExportProgress !== null ? "secondary" : "outline"}
              size="sm"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{copy.export}</span>
              {failedExportJobCount > 0 && activeExportProgress === null ? (
                <Badge variant="destructive">{failedExportJobCount}</Badge>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              {activeExportProgress !== null
                ? `Exporting ${activeExportProgress}%`
                : copy.export}
            </DropdownMenuLabel>
            <div className="grid grid-cols-2 gap-2 px-2 pb-2">
              <Select
                value={String(exportScale)}
                onValueChange={(value) =>
                  onExportScaleChange(Number(value) as ExportScale)
                }
              >
                <SelectTrigger className="w-full" aria-label={copy.exportScale}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPORT_SCALE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(exportQuality)}
                onValueChange={(value) =>
                  onExportQualityChange(Number(value) as ExportQuality)
                }
              >
                <SelectTrigger
                  className="w-full"
                  aria-label={copy.exportQuality}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPORT_QUALITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DropdownMenuItem onClick={onOpenExportJobs}>
              <ListChecks className="h-4 w-4" />
              Export jobs
              {failedExportJobCount > 0 ? (
                <Badge variant="destructive">{failedExportJobCount}</Badge>
              ) : null}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onExport("png")}>
              PNG image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("transparent-png")}>
              PNG transparent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("jpg")}>
              JPG image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("webp")}>
              WebP image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("gif")}>
              GIF animation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("svg")}>
              SVG vector
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("pdf")}>
              PDF document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("docx")}>
              DOCX document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("xlsx")}>
              XLSX spreadsheet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("multipage-pdf")}>
              PDF all pages
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("print-pdf")}>
              PDF print ready
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("mp4")}>
              MP4 video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("media-sequence")}>
              Media sequence JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("html")}>
              Website HTML
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!embedded ? (
          <Button size="sm" onClick={onSave}>
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">{copy.save}</span>
          </Button>
        ) : null}
      </div>
    </header>
  );
}
