"use client";

import { useMemo } from "react";
import { Activity, Box, FileArchive, Gauge, ImageIcon, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { analyzeExportOptimization } from "../../utils/export-optimization";
import type { SceneDocument } from "../../types";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCount(value: number) {
  return value > 999 ? `${(value / 1000).toFixed(value > 9999 ? 0 : 1)}k` : String(value);
}

export function ExportOptimizationPanel({ document }: { document: SceneDocument }) {
  const report = useMemo(() => analyzeExportOptimization(document), [document]);
  const status = report.issues.some((issue) => issue.severity === "danger") ? "Heavy" : report.issues.length > 0 ? "Review" : "Clean";
  const metrics = [
    { icon: Activity, label: "Draw calls", value: formatCount(report.drawCalls) },
    { icon: Box, label: "Triangles", value: formatCount(report.triangles) },
    { icon: ImageIcon, label: "Textures", value: `${report.textureCount} / ${formatBytes(report.textureBytes)}` },
    { icon: FileArchive, label: "Scene weight", value: formatBytes(report.estimatedFileBytes) },
  ];

  return (
    <div className="space-y-3 rounded-md border border-border p-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <Gauge className="size-4 shrink-0" />
          <span className="truncate">Export optimization</span>
        </div>
        <Badge className="rounded-md text-[11px]" variant={status === "Heavy" ? "destructive" : "secondary"}>
          {status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div key={metric.label} className="rounded-md bg-muted/50 p-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{metric.label}</span>
              </div>
              <div className="mt-1 truncate text-sm font-medium">{metric.value}</div>
            </div>
          );
        })}
      </div>

      {report.issues.length > 0 ? (
        <div className="space-y-1">
          {report.issues.map((issue) => (
            <div key={issue.id} className="grid grid-cols-[16px_1fr] gap-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
              <TriangleAlert className={issue.severity === "danger" ? "mt-0.5 size-3.5 text-destructive" : "mt-0.5 size-3.5 text-amber-500"} />
              <span>{issue.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">No export bottlenecks detected in the current scene.</p>
      )}
    </div>
  );
}
