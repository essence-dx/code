"use client";

import { useMemo, useState } from "react";
import { Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  assetExportPresets,
  createLayerAssetBundle,
  getAssetSlug,
  type AssetExportPresetId,
} from "@/features/editor/asset-export-bundle";
import { getLayerAssetReport } from "@/features/editor/layer-codegen";
import type {
  DesignComment,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

type LayerAssetExportSectionProps = {
  layer: DesignLayer;
  layers: DesignLayer[];
  pages: DesignPage[];
  variables: Record<string, string>;
  comments: DesignComment[];
};

export function LayerAssetExportSection({
  layer,
  layers,
  pages,
  variables,
  comments,
}: LayerAssetExportSectionProps) {
  const [downloadedPreset, setDownloadedPreset] =
    useState<AssetExportPresetId | null>(null);
  const assetReport = useMemo(() => getLayerAssetReport(layer), [layer]);

  function downloadBundle(presetId: AssetExportPresetId) {
    const bundle = createLayerAssetBundle({
      layer,
      layers,
      pages,
      variables,
      comments,
      presetId,
    });
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${getAssetSlug(layer)}-${presetId}-asset-bundle.json`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadedPreset(presetId);
    window.setTimeout(() => setDownloadedPreset(null), 1400);
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/50 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Asset export
        </div>
        <div className="text-muted-foreground">
          {assetReport.exportable ? "Ready" : "Needs review"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <AssetMetric label="Asset" value={assetReport.kind} />
        <AssetMetric label="Format" value={assetReport.recommendedFormat} />
        <AssetMetric
          label="Size"
          value={`${formatNumber(layer.width)} x ${formatNumber(layer.height)}`}
        />
        <AssetMetric
          label="State"
          value={assetReport.exportable ? "Exportable" : "Needs repair"}
        />
      </div>
      {assetReport.notes.length > 0 ? (
        <div className="space-y-1">
          {assetReport.notes.map((note) => (
            <div key={note} className="truncate text-muted-foreground">
              {note}
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-1.5">
        {assetExportPresets.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 px-2 text-xs"
            onClick={() => downloadBundle(preset.id)}
          >
            {downloadedPreset === preset.id ? (
              <Check className="size-3.5" />
            ) : (
              <Download className="size-3.5" />
            )}
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function AssetMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="truncate font-medium text-foreground">{value}</div>
    </div>
  );
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
