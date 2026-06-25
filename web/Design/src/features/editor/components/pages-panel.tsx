"use client";

import {
  ArrowDown,
  ArrowUp,
  Copy,
  FileDown,
  FilePlus2,
  FileSpreadsheet,
  FileUp,
  GripVertical,
  Languages,
  ListTree,
  Trash2,
} from "lucide-react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ElementRenderer } from "@/features/editor/components/element-renderer";
import { PageAudienceControls } from "@/features/editor/components/page-audience-controls";
import { downloadTextFile } from "@/features/editor/download-text-file";
import {
  createPresentationOutline,
  createSpeakerNotesMarkdown,
} from "@/features/editor/presentation-notes";
import type { EditorLocale } from "@/features/editor/editor-localization";
import { getEditorPagesPanelCopy } from "@/features/editor/editor-workflow-localization";
import { getPageDimensions } from "@/features/editor/page-dimensions";
import { createPanelWindow } from "@/features/editor/panel-list-window";
import { designPresets } from "@/features/editor/presets";
import { createTranslationPackJson } from "@/features/editor/translation-pack";
import type {
  AudienceInteraction,
  DesignDocument,
  DesignPage,
  DesignPresetId,
  PageTransition,
} from "@/features/editor/types";
import { cn } from "@/lib/utils";

type PagesPanelProps = {
  projectName: string;
  document: DesignDocument;
  editorLocale: EditorLocale;
  onAddPage: () => void;
  onBulkCreateFromCsv: (file: File) => Promise<PagePanelMessage>;
  onImportSpeakerNotes: (file: File) => Promise<PagePanelMessage>;
  onImportTranslationPack: (file: File) => Promise<PagePanelMessage>;
  onSelectPage: (pageId: string) => void;
  onRenamePage: (pageId: string, name: string) => void;
  onUpdatePageNotes: (pageId: string, notes: string) => void;
  onUpdatePageWebsiteSeo: (
    pageId: string,
    seo: { title?: string; description?: string },
  ) => void;
  onUpdatePageWebsiteNavigation: (
    pageId: string,
    navigation: { label?: string; group?: string; hidden?: boolean },
  ) => void;
  onUpdatePageTransition: (pageId: string, transition: PageTransition) => void;
  onUpdatePageFormat: (pageId: string, format: DesignPresetId) => void;
  onUpdatePageSize: (
    pageId: string,
    size: { width?: number; height?: number },
  ) => void;
  onUpdatePageAudienceInteraction: (
    pageId: string,
    interaction: AudienceInteraction | undefined,
  ) => void;
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onReorderPage: (pageId: string, direction: "up" | "down") => void;
};

type PagePanelMessage = {
  tone: "error" | "info";
  text: string;
};

export function PagesPanel({
  projectName,
  document,
  editorLocale,
  onAddPage,
  onBulkCreateFromCsv,
  onImportSpeakerNotes,
  onImportTranslationPack,
  onSelectPage,
  onRenamePage,
  onUpdatePageNotes,
  onUpdatePageWebsiteSeo,
  onUpdatePageWebsiteNavigation,
  onUpdatePageTransition,
  onUpdatePageFormat,
  onUpdatePageSize,
  onUpdatePageAudienceInteraction,
  onDuplicatePage,
  onDeletePage,
  onReorderPage,
}: PagesPanelProps) {
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const notesInputRef = useRef<HTMLInputElement | null>(null);
  const translationInputRef = useRef<HTMLInputElement | null>(null);
  const [bulkCreateMessage, setBulkCreateMessage] =
    useState<PagePanelMessage | null>(null);
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [isImportingNotes, setIsImportingNotes] = useState(false);
  const [isImportingTranslation, setIsImportingTranslation] = useState(false);
  const [showAllPages, setShowAllPages] = useState(false);
  const activePage =
    document.pages.find((page) => page.id === document.activePageId) ??
    document.pages[0];
  const outline = createPresentationOutline(document);
  const copy = getEditorPagesPanelCopy(editorLocale);
  const activePageSize = activePage
    ? getPageDimensions(document, activePage)
    : { width: document.width, height: document.height };
  const activePageFormat = activePage?.format ?? "custom";
  const pageWindow = useMemo(
    () =>
      showAllPages
        ? {
            items: document.pages,
            hiddenCount: 0,
            isWindowed: false,
          }
        : createPanelWindow(document.pages, {
            activeIds: [document.activePageId],
            limit: 18,
          }),
    [document.activePageId, document.pages, showAllPages],
  );

  async function handleBulkCreate(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";
    setIsBulkCreating(true);
    setBulkCreateMessage(null);

    try {
      setBulkCreateMessage(await onBulkCreateFromCsv(file));
    } catch {
      setBulkCreateMessage({
        tone: "error",
        text: copy.csvReadError,
      });
    } finally {
      setIsBulkCreating(false);
    }
  }

  async function handleNotesImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";
    setIsImportingNotes(true);
    setBulkCreateMessage(null);

    try {
      setBulkCreateMessage(await onImportSpeakerNotes(file));
    } catch {
      setBulkCreateMessage({
        tone: "error",
        text: copy.notesImportError,
      });
    } finally {
      setIsImportingNotes(false);
    }
  }

  async function handleTranslationImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";
    setIsImportingTranslation(true);
    setBulkCreateMessage(null);

    try {
      setBulkCreateMessage(await onImportTranslationPack(file));
    } catch {
      setBulkCreateMessage({
        tone: "error",
        text: copy.translationImportError,
      });
    } finally {
      setIsImportingTranslation(false);
    }
  }

  function exportSpeakerNotes() {
    downloadTextFile({
      fileName: `${projectName}-speaker-notes.md`,
      text: createSpeakerNotesMarkdown({ projectName, document }),
      type: "text/markdown;charset=utf-8",
    });
  }

  function exportTranslationPack() {
    downloadTextFile({
      fileName: `${projectName}-translation-pack.json`,
      text: createTranslationPackJson({ document, projectName }),
      type: "application/json;charset=utf-8",
    });
  }

  return (
    <section className="border-t border-border">
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-sm font-semibold">{copy.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.description}
          </p>
        </div>
        <div className="flex max-w-40 flex-wrap justify-end gap-2">
          <input
            ref={csvInputRef}
            className="hidden"
            type="file"
            accept="text/csv,.csv,application/vnd.ms-excel"
            onChange={handleBulkCreate}
          />
          <input
            ref={notesInputRef}
            className="hidden"
            type="file"
            accept="text/markdown,text/plain,.md,.txt"
            onChange={handleNotesImport}
          />
          <input
            ref={translationInputRef}
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={handleTranslationImport}
          />
          <Button
            size="icon"
            variant="outline"
            onClick={exportSpeakerNotes}
            aria-label={copy.exportSpeakerNotes}
          >
            <FileDown className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            disabled={isImportingNotes}
            onClick={() => notesInputRef.current?.click()}
            aria-label={copy.importSpeakerNotes}
          >
            <FileUp className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={exportTranslationPack}
            aria-label={copy.exportTranslationPack}
          >
            <Languages className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            disabled={isImportingTranslation}
            onClick={() => translationInputRef.current?.click()}
            aria-label={copy.importTranslationPack}
          >
            <FileUp className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            disabled={isBulkCreating}
            onClick={() => csvInputRef.current?.click()}
            aria-label={copy.bulkCreateCsv}
          >
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={onAddPage}
            aria-label={copy.addPage}
          >
            <FilePlus2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {bulkCreateMessage ? (
        <p
          className={
            bulkCreateMessage.tone === "error"
              ? "px-4 pb-3 text-xs text-destructive"
              : "px-4 pb-3 text-xs text-muted-foreground"
          }
        >
          {bulkCreateMessage.text}
        </p>
      ) : null}
      <Separator />
      <ScrollArea className="max-h-80">
        <div className="flex flex-col gap-2 p-2">
          {pageWindow.items.map((page) => {
            const index = document.pages.findIndex(
              (item) => item.id === page.id,
            );

            return (
              <div
                key={page.id}
                className={cn(
                  "rounded-md border border-border p-2",
                  page.id === document.activePageId && "bg-secondary",
                )}
              >
                <div className="flex gap-3">
                  <PageThumbnail
                    document={document}
                    page={page}
                    pageNumber={index + 1}
                    isActive={page.id === document.activePageId}
                    onSelect={() => onSelectPage(page.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSelectPage(page.id)}
                        aria-label={copy.selectPage(index + 1)}
                      >
                        <GripVertical className="h-4 w-4" />
                      </Button>
                      <Input
                        value={page.name}
                        onChange={(event) =>
                          onRenamePage(page.id, event.target.value)
                        }
                        aria-label={copy.pageName(index + 1)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {index + 1} / {document.pages.length}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onReorderPage(page.id, "up")}
                          disabled={index === 0}
                          aria-label={copy.movePageUp}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onReorderPage(page.id, "down")}
                          disabled={index === document.pages.length - 1}
                          aria-label={copy.movePageDown}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDuplicatePage(page.id)}
                          aria-label={copy.duplicatePage}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeletePage(page.id)}
                          disabled={document.pages.length <= 1}
                          aria-label={copy.deletePage}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {pageWindow.isWindowed || showAllPages ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAllPages((current) => !current)}
            >
              {showAllPages
                ? "Collapse pages"
                : `Show ${pageWindow.hiddenCount} more pages`}
            </Button>
          ) : null}
        </div>
      </ScrollArea>
      {activePage ? (
        <>
          <Separator />
          <div className="space-y-3 p-4">
            <h3 className="text-xs font-semibold text-muted-foreground">
              {copy.pageSize ?? "Page size"}
            </h3>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {copy.pageFormat ?? "Format"}
              </span>
              <Select
                value={activePageFormat}
                onValueChange={(format) =>
                  onUpdatePageFormat(activePage.id, format as DesignPresetId)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageFormatOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                      {option.width && option.height
                        ? ` (${option.width} x ${option.height})`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  {copy.pageWidth ?? "Width"}
                </span>
                <Input
                  type="number"
                  min={64}
                  max={8000}
                  value={activePageSize.width}
                  onChange={(event) =>
                    onUpdatePageSize(activePage.id, {
                      width: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  {copy.pageHeight ?? "Height"}
                </span>
                <Input
                  type="number"
                  min={64}
                  max={8000}
                  value={activePageSize.height}
                  onChange={(event) =>
                    onUpdatePageSize(activePage.id, {
                      height: Number(event.target.value),
                    })
                  }
                />
              </label>
            </div>
          </div>
          <Separator />
          <div className="space-y-2 p-4">
            <div className="flex items-center gap-2">
              <ListTree className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-muted-foreground">
                {copy.slideOutline}
              </h3>
            </div>
            <ScrollArea className="max-h-56">
              <div className="flex flex-col gap-2">
                {outline.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "w-full rounded-md border border-border p-2 text-left transition hover:bg-accent",
                      item.id === activePage.id &&
                        "border-primary bg-primary/5",
                    )}
                    onClick={() => onSelectPage(item.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold">
                        {item.number}. {item.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {copy.layerCount(item.elementCount)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.notesPreview}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
          <Separator />
          {activePageFormat === "website" ? (
            <>
              <div className="space-y-3 p-4">
                <h3 className="text-xs font-semibold text-muted-foreground">
                  {copy.websiteNavigation ?? "Website navigation"}
                </h3>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {copy.websiteNavigationLabel ?? "Navigation label"}
                  </span>
                  <Input
                    value={activePage.websiteNavLabel ?? ""}
                    maxLength={80}
                    placeholder={activePage.name}
                    onChange={(event) =>
                      onUpdatePageWebsiteNavigation(activePage.id, {
                        label: event.target.value,
                      })
                    }
                    aria-label={
                      copy.websiteNavigationLabelFor?.(activePage.name) ??
                      `${activePage.name} website navigation label`
                    }
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {copy.websiteNavigationGroup ?? "Menu group"}
                  </span>
                  <Input
                    value={activePage.websiteNavGroup ?? ""}
                    maxLength={80}
                    placeholder={
                      copy.websiteNavigationGroupPlaceholder ?? "Optional group"
                    }
                    onChange={(event) =>
                      onUpdatePageWebsiteNavigation(activePage.id, {
                        group: event.target.value,
                      })
                    }
                    aria-label={
                      copy.websiteNavigationGroupFor?.(activePage.name) ??
                      `${activePage.name} website menu group`
                    }
                  />
                </label>
                <label className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-foreground">
                      {copy.websiteShowInNavigation ?? "Show in navigation"}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {copy.websiteShowInNavigationDescription ??
                        "Keep this section in hosted website navigation."}
                    </span>
                  </span>
                  <Switch
                    size="sm"
                    checked={activePage.websiteHideFromNavigation !== true}
                    onCheckedChange={(checked) =>
                      onUpdatePageWebsiteNavigation(activePage.id, {
                        hidden: !checked,
                      })
                    }
                    aria-label={
                      copy.websiteShowInNavigationFor?.(activePage.name) ??
                      `Show ${activePage.name} in website navigation`
                    }
                  />
                </label>
              </div>
              <Separator />
              <div className="space-y-3 p-4">
                <h3 className="text-xs font-semibold text-muted-foreground">
                  {copy.websiteSeo ?? "Website SEO"}
                </h3>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {copy.websiteSeoTitle ?? "Section SEO title"}
                  </span>
                  <Input
                    value={activePage.websiteSeoTitle ?? ""}
                    maxLength={120}
                    placeholder={activePage.name}
                    onChange={(event) =>
                      onUpdatePageWebsiteSeo(activePage.id, {
                        title: event.target.value,
                      })
                    }
                    aria-label={
                      copy.websiteSeoTitleFor?.(activePage.name) ??
                      `${activePage.name} website SEO title`
                    }
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {copy.websiteSeoDescription ?? "Section SEO description"}
                  </span>
                  <Textarea
                    value={activePage.websiteSeoDescription ?? ""}
                    maxLength={180}
                    placeholder={
                      activePage.notes || "Short search and share description"
                    }
                    spellCheck
                    onChange={(event) =>
                      onUpdatePageWebsiteSeo(activePage.id, {
                        description: event.target.value,
                      })
                    }
                    aria-label={
                      copy.websiteSeoDescriptionFor?.(activePage.name) ??
                      `${activePage.name} website SEO description`
                    }
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  {copy.websiteSeoDescriptionHelp ??
                    "Used for hosted website sections when this page is published."}
                </p>
              </div>
              <Separator />
            </>
          ) : null}
          <div className="space-y-2 p-4">
            <h3 className="text-xs font-semibold text-muted-foreground">
              {copy.speakerNotes}
            </h3>
            <Textarea
              value={activePage.notes ?? ""}
              spellCheck
              onChange={(event) =>
                onUpdatePageNotes(activePage.id, event.target.value)
              }
              aria-label={copy.speakerNotesFor(activePage.name)}
            />
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">
                {copy.transition}
              </span>
              <Select
                value={activePage.transition ?? "none"}
                onValueChange={(transition) =>
                  onUpdatePageTransition(
                    activePage.id,
                    transition as PageTransition,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{copy.transitions.none}</SelectItem>
                  <SelectItem value="fade">{copy.transitions.fade}</SelectItem>
                  <SelectItem value="slide">
                    {copy.transitions.slide}
                  </SelectItem>
                  <SelectItem value="zoom">{copy.transitions.zoom}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <PageAudienceControls
              interaction={activePage.audienceInteraction}
              onChange={(interaction) =>
                onUpdatePageAudienceInteraction(activePage.id, interaction)
              }
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

const pageFormatOptions: Array<{
  id: DesignPresetId;
  name: string;
  width?: number;
  height?: number;
}> = [
  { id: "custom", name: "Custom size" },
  ...designPresets.map((preset) => ({
    id: preset.id,
    name: preset.name,
    width: preset.width,
    height: preset.height,
  })),
];

function PageThumbnail({
  document,
  page,
  pageNumber,
  isActive,
  onSelect,
}: {
  document: DesignDocument;
  page: DesignPage;
  pageNumber: number;
  isActive: boolean;
  onSelect: () => void;
}) {
  const previewWidth = 72;
  const pageSize = getPageDimensions(document, page);
  const scale = previewWidth / pageSize.width;
  const previewHeight = Math.round(pageSize.height * scale);

  return (
    <button
      type="button"
      className={cn(
        "shrink-0 overflow-hidden rounded-sm border bg-background shadow-sm",
        isActive ? "border-primary" : "border-border",
      )}
      style={{ width: previewWidth, height: previewHeight }}
      onClick={onSelect}
      aria-label={`Select page ${pageNumber} thumbnail`}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: pageSize.width,
          height: pageSize.height,
          background: page.background,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {page.elements.map((element) =>
          element.hidden ? null : (
            <div
              key={element.id}
              className="absolute"
              style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                transform: `rotate(${element.rotation}deg)`,
                transformOrigin: "center",
              }}
            >
              <ElementRenderer element={element} pageElements={page.elements} />
            </div>
          ),
        )}
      </div>
    </button>
  );
}
