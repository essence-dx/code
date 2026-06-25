"use client";

import { useMemo } from "react";
import { Activity, Box, Cpu, Gauge, ImageIcon, MousePointerClick, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { profileScenePerformance, type ScenePerformanceBudgetRow, type ScenePerformanceHotSpot } from "../../utils/scene-performance-profiler";
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

function formatBudgetValue(row: ScenePerformanceBudgetRow) {
  return row.unit === "bytes" ? formatBytes(row.value) : formatCount(row.value);
}

function getStatusVariant(status: string) {
  return status === "Heavy" ? "destructive" : "secondary";
}

function getSeverityClass(row: ScenePerformanceBudgetRow) {
  if (row.severity === "danger") {
    return "bg-destructive";
  }

  if (row.severity === "warning") {
    return "bg-amber-500";
  }

  return "bg-emerald-500";
}

function budgetPercent(row: ScenePerformanceBudgetRow) {
  return Math.min(100, Math.round((row.value / row.dangerAt) * 100));
}

function getCategoryLabel(category: ScenePerformanceHotSpot["category"]) {
  if (category === "draw-call") {
    return "Draw";
  }

  if (category === "geometry") {
    return "Geometry";
  }

  if (category === "texture") {
    return "Texture";
  }

  return "Runtime";
}

export function ScenePerformanceProfilerPanel({ document }: { document: SceneDocument }) {
  const profile = useMemo(() => profileScenePerformance(document), [document]);
  const metrics = [
    { icon: Activity, label: "Draw calls", value: formatCount(profile.metrics.drawCalls) },
    { icon: Box, label: "Triangles", value: formatCount(profile.metrics.triangles) },
    { icon: ImageIcon, label: "Texture load", value: `${profile.metrics.textureCount} / ${formatBytes(profile.metrics.textureBytes)}` },
    { icon: MousePointerClick, label: "Runtime hooks", value: formatCount(profile.metrics.interactionHooks) },
  ];

  return (
    <div className="space-y-3 rounded-md border border-border p-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <Gauge className="size-4 shrink-0" />
          <span className="truncate">Scene profiler</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge className="rounded-md text-[11px]" variant="secondary">
            {profile.score}/100
          </Badge>
          <Badge className="rounded-md text-[11px]" variant={getStatusVariant(profile.status)}>
            {profile.status}
          </Badge>
        </div>
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

      <div className="space-y-1">
        {profile.budgetRows.map((row) => (
          <div key={row.id} className="rounded-md bg-muted/50 p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{row.label}</span>
              <span className="font-mono text-muted-foreground">{formatBudgetValue(row)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
              <div className={`h-full rounded-full ${getSeverityClass(row)}`} style={{ width: `${budgetPercent(row)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {profile.hotSpots.length > 0 ? (
        <div className="space-y-1">
          {profile.hotSpots.slice(0, 5).map((hotSpot) => (
            <div key={`${hotSpot.objectId}:${hotSpot.category}`} className="grid grid-cols-[16px_1fr] gap-2 rounded-md bg-muted/50 p-2 text-xs">
              <TriangleAlert className={hotSpot.severity === "danger" ? "mt-0.5 size-3.5 text-destructive" : "mt-0.5 size-3.5 text-amber-500"} />
              <div className="min-w-0 space-y-1">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate font-medium">{hotSpot.objectName}</span>
                  <Badge className="rounded-md text-[10px]" variant="secondary">
                    {getCategoryLabel(hotSpot.category)}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{hotSpot.detail}</p>
                <p className="text-muted-foreground">{hotSpot.recommendation}</p>
              </div>
            </div>
          ))}
          {profile.hotSpots.length > 5 ? <p className="px-2 text-xs text-muted-foreground">{profile.hotSpots.length - 5} more profiler hot spots.</p> : null}
        </div>
      ) : (
        <div className="grid grid-cols-[16px_1fr] gap-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          <Cpu className="mt-0.5 size-3.5 text-emerald-500" />
          <span>No scene performance hot spots detected.</span>
        </div>
      )}
    </div>
  );
}
