"use client";

import { MapPinned, RefreshCw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDuration } from "@/features/audio/format";
import {
  ProviderJobOfflineBadge,
  useProviderJobActionGuard,
} from "./provider-job-action-guard";
import type {
  WarpMarkerBusyState,
  WarpMarkerJobView,
} from "@/features/ai/use-warp-marker-job";

type WarpMarkerPanelProps = {
  busy: WarpMarkerBusyState;
  job?: WarpMarkerJobView;
  onApply: () => Promise<unknown>;
  onRefresh: () => Promise<unknown>;
};

export function WarpMarkerPanel({
  busy,
  job,
  onApply,
  onRefresh,
}: WarpMarkerPanelProps) {
  const actionGuard = useProviderJobActionGuard();

  if (!job?.id) {
    return null;
  }

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPinned className="size-4 text-emerald-200" />
            Warp markers
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <ProviderJobOfflineBadge guard={actionGuard} />
            <Badge variant="outline">{job.markers.length} markers</Badge>
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={actionGuard.connectionDisabled || busy === "refresh"}
              title={actionGuard.title("Check status")}
              onClick={() => {
                void onRefresh();
              }}
            >
              <RefreshCw className={busy === "refresh" ? "size-4 animate-spin" : "size-4"} />
              Check status
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={busy === "apply" || !job.markers.length}
              onClick={() => {
                void onApply();
              }}
            >
              <Save className="size-4" />
              Apply
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium">{job.sourceTitle}</p>
          <p className="text-xs text-muted-foreground">
            {job.sourceKind} / {job.analysisMode} / {job.targetGrid}
            {job.region
              ? ` / ${formatDuration(job.region.startMs)} - ${formatDuration(job.region.endMs)}`
              : ""}
          </p>
          {job.error ? <p className="mt-1 text-xs text-rose-200">{job.error}</p> : null}
        </div>
        {job.markers.length ? (
          <ScrollArea className="h-44 pr-3">
            <div className="space-y-2">
              {job.markers.slice(0, 24).map((marker, index) => (
                <div
                  key={`${marker.startMs}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-slate-950/50 p-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {marker.label || capitalize(marker.kind)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(marker.startMs)}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {marker.confidence === undefined
                      ? marker.kind
                      : `${marker.kind} ${Math.round(marker.confidence * 100)}%`}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">
            Waiting for the configured provider to return timing markers.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "succeeded"
      ? "bg-emerald-400/15 text-emerald-200"
      : status === "failed"
        ? "bg-rose-400/15 text-rose-200"
        : "";

  return (
    <Badge variant="secondary" className={className}>
      {status || "queued"}
    </Badge>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
