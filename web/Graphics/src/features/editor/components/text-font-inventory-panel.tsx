"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getTextFontInventory,
  getTextFontInventoryCsv,
  getTextFontInventoryMarkdown,
} from "@/features/editor/text-font-inventory";
import type { DesignPage } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type TextFontInventoryPanelProps = {
  pages: DesignPage[];
};

export function TextFontInventoryPanel({ pages }: TextFontInventoryPanelProps) {
  const report = useMemo(() => getTextFontInventory(pages), [pages]);
  const previewFamilies = report.families.slice(0, 5);

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/50 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Font inventory
          </div>
          <div className="mt-1 text-muted-foreground">
            {report.textLayerCount} text layers / {report.fontFamilyCount} fonts
          </div>
        </div>
        <Badge
          variant={report.reviewFamilyCount > 0 ? "destructive" : "secondary"}
          className="shrink-0"
        >
          {report.reviewFamilyCount} review
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          onClick={() =>
            downloadTextFile({
              content: getTextFontInventoryCsv(report),
              filename: "text-font-inventory.csv",
              type: "text/csv;charset=utf-8",
            })
          }
        >
          <Download className="size-3.5" />
          CSV
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          onClick={() =>
            downloadTextFile({
              content: getTextFontInventoryMarkdown(report),
              filename: "text-font-inventory.md",
              type: "text/markdown;charset=utf-8",
            })
          }
        >
          <Download className="size-3.5" />
          Inspect
        </Button>
      </div>

      {previewFamilies.length > 0 ? (
        <div className="space-y-1.5">
          {previewFamilies.map((family) => (
            <div
              key={family.fontFamily}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-md border border-border bg-card px-2 py-1.5"
            >
              {family.status === "ready" ? (
                <CheckCircle2 className="mt-0.5 size-3.5 text-emerald-600" />
              ) : (
                <AlertTriangle className="mt-0.5 size-3.5 text-destructive" />
              )}
              <div className="min-w-0">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground">
                    {family.label}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-medium uppercase tracking-wide",
                      family.status === "ready" && "text-emerald-600",
                      family.status === "review" && "text-destructive",
                    )}
                  >
                    {family.status}
                  </span>
                </div>
                <div className="truncate text-muted-foreground">
                  {family.layerCount} layers / weights{" "}
                  {family.weights.join(", ")} / sizes {family.sizes.join(", ")}
                </div>
              </div>
            </div>
          ))}
          {report.families.length > previewFamilies.length ? (
            <div className="text-[11px] text-muted-foreground">
              {report.families.length - previewFamilies.length} more fonts in
              handoff
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card px-2 py-1.5 text-muted-foreground">
          No text layers in this document yet.
        </div>
      )}
    </div>
  );
}
