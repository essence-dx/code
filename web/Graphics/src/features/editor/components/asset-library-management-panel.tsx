"use client";

import { useMemo, useState } from "react";
import {
  Download,
  FileJson2,
  MousePointer2,
  PackageCheck,
  Replace,
  Tags,
  Type,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type AssetLibraryManagementReport,
} from "@/features/editor/asset-library-management";
import {
  AssetLibraryFilterButton,
  AssetLibraryMetric,
  AssetLibraryRow,
  assetLibraryFilters,
  getAssetLibraryStatusVariant,
  getVisibleAssetLibraryRows,
  type AssetLibraryFilter,
} from "@/features/editor/components/asset-library-management-panel-utils";
import {
  getAssetLibraryFontReplacementPatches,
  getAssetLibraryMetadataPatches,
  getAssetLibraryReplacementPatches,
} from "@/features/editor/asset-library-management-patches";
import {
  getAssetLibraryManagementBundleJson,
  getAssetLibraryManagementCsv,
  getAssetLibraryManagementMarkdown,
} from "@/features/editor/asset-library-management-export";
import type { LayerPatch } from "@/features/editor/document-utils";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AssetLibraryManagementPanelProps = {
  report: AssetLibraryManagementReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
};

export function AssetLibraryManagementPanel({
  report,
  onRecordActivity,
  onSelectLayers,
  onUpdateLayers,
}: AssetLibraryManagementPanelProps) {
  const [filter, setFilter] = useState<AssetLibraryFilter>("all");
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [license, setLicense] = useState("");
  const [libraryId, setLibraryId] = useState("");
  const [replacementSource, setReplacementSource] = useState("");
  const [fontFamily, setFontFamily] = useState("Inter, Arial, sans-serif");
  const visibleRows = useMemo(
    () => getVisibleAssetLibraryRows(report.rows, filter),
    [filter, report.rows],
  );
  const activeRow =
    report.rows.find((row) => row.id === activeRowId) ?? visibleRows[0] ?? null;
  const activeAsset = activeRow?.mediaAssetId
    ? report.mediaAssets.find((asset) => asset.id === activeRow.mediaAssetId)
    : undefined;
  const selectableLayerIds = useMemo(
    () =>
      Array.from(
        new Set(visibleRows.flatMap((row) => row.layerIds).filter(Boolean)),
      ),
    [visibleRows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getAssetLibraryManagementCsv(report, visibleRows),
      filename: `asset-library-management-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported asset library CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAssetLibraryManagementMarkdown(report, visibleRows),
      filename: `asset-library-management-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported asset library handoff",
      `${visibleRows.length} rows`,
    );
  }

  function exportJson() {
    downloadTextFile({
      content: getAssetLibraryManagementBundleJson(report, visibleRows),
      filename: `asset-library-management-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported asset library bundle",
      `${visibleRows.length} rows`,
    );
  }

  function selectRows() {
    onSelectLayers(selectableLayerIds);
    onRecordActivity?.(
      "Selected asset library queue",
      `${selectableLayerIds.length} layers`,
    );
  }

  function applyMetadata() {
    if (!activeRow) {
      return;
    }

    const patches = getAssetLibraryMetadataPatches({
      asset: activeAsset,
      row: activeRow,
      values: { libraryId, license, sourceName, sourceUrl },
    });

    if (patches.length === 0) {
      return;
    }

    onUpdateLayers(patches);
    onRecordActivity?.(
      "Updated asset source metadata",
      `${patches.length} layer${patches.length === 1 ? "" : "s"}`,
    );
  }

  function replaceMediaSource() {
    if (!activeRow) {
      return;
    }

    const patches = getAssetLibraryReplacementPatches({
      asset: activeAsset,
      replacementSource,
      row: activeRow,
      values: { libraryId, license, sourceName, sourceUrl },
    });

    if (patches.length === 0) {
      return;
    }

    onUpdateLayers(patches);
    setReplacementSource("");
    onRecordActivity?.(
      "Replaced asset source",
      `${patches.length} layer${patches.length === 1 ? "" : "s"}`,
    );
  }

  function replaceFont() {
    if (!activeRow) {
      return;
    }

    const patches = getAssetLibraryFontReplacementPatches({
      fontFamily,
      row: activeRow,
    });

    if (patches.length === 0) {
      return;
    }

    onUpdateLayers(patches);
    onRecordActivity?.(
      "Replaced asset library font",
      `${patches.length} layer${patches.length === 1 ? "" : "s"}`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <PackageCheck className="size-3.5" />
            Asset library management
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Reusable media, source and license metadata, dedupe, replacement
            queues, and font registry repair.
          </div>
        </div>
        <Badge variant={getAssetLibraryStatusVariant(report.status)}>
          {report.score}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <AssetLibraryMetric label="Media" value={report.mediaAssetCount} />
        <AssetLibraryMetric label="Reuse" value={report.reusableMediaCount} />
        <AssetLibraryMetric label="Dedupe" value={report.duplicateSourceCount} />
        <AssetLibraryMetric label="Replace" value={report.replacementQueueCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <AssetLibraryMetric label="Metadata" value={report.missingMetadataCount} />
        <AssetLibraryMetric label="Fonts" value={report.fontFamilyCount} />
        <AssetLibraryMetric label="Unsafe" value={report.unsafeFontCount} />
        <AssetLibraryMetric label="Review" value={report.reviewCount} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {assetLibraryFilters.map((item) => (
          <AssetLibraryFilterButton
            key={item.id}
            active={filter === item.id}
            label={item.label}
            onClick={() => setFilter(item.id)}
          />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportCsv}
        >
          <Download className="size-3" />
          CSV
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportMarkdown}
        >
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportJson}
        >
          <FileJson2 className="size-3" />
          JSON
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={selectableLayerIds.length === 0}
          onClick={selectRows}
        >
          <MousePointer2 className="size-3" />
          Select
        </Button>
      </div>

      <div className="mt-2 space-y-1">
        {visibleRows.slice(0, 6).map((row) => (
          <AssetLibraryRow
            key={row.id}
            active={activeRow?.id === row.id}
            row={row}
            onClick={() => setActiveRowId(row.id)}
          />
        ))}
        {visibleRows.length > 6 ? (
          <div className="rounded-sm bg-muted px-2 py-1 text-[10px] text-muted-foreground">
            {visibleRows.length - 6} more asset library item
            {visibleRows.length - 6 === 1 ? "" : "s"}
          </div>
        ) : null}
      </div>

      {activeRow ? (
        <div className="mt-2 rounded-sm border border-dashed border-border p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium">
                {activeRow.label}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                {activeAsset?.sourcePreview ??
                  activeRow.fontFamily ??
                  "Document queue"}
              </div>
            </div>
            <Badge variant={getAssetLibraryStatusVariant(activeRow.status)}>
              {activeRow.category}
            </Badge>
          </div>

          {activeRow.assetKind === "media" ? (
            <div className="mt-2 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  className="h-8 text-[11px]"
                  placeholder={activeAsset?.sourceName ?? "Source name"}
                  value={sourceName}
                  onChange={(event) => setSourceName(event.target.value)}
                />
                <Input
                  className="h-8 text-[11px]"
                  placeholder={activeAsset?.license ?? "License"}
                  value={license}
                  onChange={(event) => setLicense(event.target.value)}
                />
              </div>
              <Input
                className="h-8 text-[11px]"
                placeholder={activeAsset?.sourceUrl ?? "Source URL or vendor reference"}
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
              />
              <Input
                className="h-8 text-[11px]"
                placeholder={activeAsset?.libraryIds[0] ?? activeAsset?.sourceHash ?? "Registry key"}
                value={libraryId}
                onChange={(event) => setLibraryId(event.target.value)}
              />
              <Input
                className="h-8 text-[11px]"
                placeholder="Replacement image URL or data URI"
                value={replacementSource}
                onChange={(event) => setReplacementSource(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-[11px]"
                  onClick={applyMetadata}
                >
                  <Tags className="size-3" />
                  Metadata
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-[11px]"
                  disabled={!replacementSource.trim()}
                  onClick={replaceMediaSource}
                >
                  <Replace className="size-3" />
                  Replace
                </Button>
              </div>
            </div>
          ) : null}

          {activeRow.assetKind === "font" ? (
            <div className="mt-2 grid grid-cols-[1fr_auto] gap-1.5">
              <Input
                className="h-8 text-[11px]"
                value={fontFamily}
                onChange={(event) => setFontFamily(event.target.value)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2 text-[11px]"
                onClick={replaceFont}
              >
                <Type className="size-3" />
                Apply
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
