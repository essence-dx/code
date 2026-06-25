"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MediaFilter } from "@/features/editor/components/media-filters";
import type { MediaHealthReport } from "@/lib/media/media-health";

interface MediaHealthStripProps {
  report: MediaHealthReport;
  activeFilter: MediaFilter;
  impactSummary: string | null;
  onFilter: (filter: MediaFilter) => void;
}

export function MediaHealthStrip({ report, activeFilter, impactSummary, onFilter }: MediaHealthStripProps) {
  if (report.totalAssets === 0) return null;

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/60 p-2">
      <div className="grid grid-cols-3 gap-1">
        <HealthButton label="Ready" count={report.availableAssets} filter="available" activeFilter={activeFilter} onFilter={onFilter} />
        <HealthButton label="Missing" count={report.missingAssets + report.missingReferenceCount} filter="missing" activeFilter={activeFilter} onFilter={onFilter} />
        <HealthButton label="Recoverable" count={report.recoverableAssets} filter="recoverable" activeFilter={activeFilter} onFilter={onFilter} />
        <HealthButton label="Used" count={report.usedAssets} filter="used" activeFilter={activeFilter} onFilter={onFilter} />
        <HealthButton label="Unused" count={report.unusedAssets} filter="unused" activeFilter={activeFilter} onFilter={onFilter} />
        <HealthButton label="Fav" count={report.favoriteAssets} filter="favorites" activeFilter={activeFilter} onFilter={onFilter} />
      </div>
      {report.missingLayerCount > 0 ? (
        <div className="flex items-start gap-2 rounded-sm border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <div className="min-w-0 space-y-1">
            <div>
              <Badge variant="outline" className="mr-1 border-destructive/30 text-destructive">
                Impact
              </Badge>
              {report.missingLayerCount} {report.missingLayerCount === 1 ? "timeline layer" : "timeline layers"}
            </div>
            {impactSummary ? <div className="truncate text-destructive/80">{impactSummary}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HealthButton({
  label,
  count,
  filter,
  activeFilter,
  onFilter,
}: {
  label: string;
  count: number;
  filter: MediaFilter;
  activeFilter: MediaFilter;
  onFilter: (filter: MediaFilter) => void;
}) {
  return (
    <Button
      size="sm"
      variant={activeFilter === filter ? "default" : "outline"}
      className="h-10 min-w-0 flex-col gap-0 px-1 text-xs"
      onClick={() => onFilter(filter)}
    >
      <span className="font-medium leading-none">{count}</span>
      <span className="max-w-full truncate text-[10px] leading-tight text-current/80">{label}</span>
    </Button>
  );
}
