"use client";

import { Mic2, RefreshCw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/features/audio/format";
import {
  ProviderJobOfflineBadge,
  useProviderJobActionGuard,
} from "./provider-job-action-guard";
import type {
  GeneratedVocalsBusyState,
  GeneratedVocalsJobView,
} from "@/features/ai/use-generated-vocals-job";

type GeneratedVocalsPanelProps = {
  busy: GeneratedVocalsBusyState;
  job?: GeneratedVocalsJobView;
  onRefresh: () => Promise<unknown>;
  onSave: () => Promise<unknown>;
};

export function GeneratedVocalsPanel({
  busy,
  job,
  onRefresh,
  onSave,
}: GeneratedVocalsPanelProps) {
  const actionGuard = useProviderJobActionGuard();

  if (!job?.id) {
    return null;
  }

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic2 className="size-4 text-emerald-200" />
            Generated vocals
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <ProviderJobOfflineBadge guard={actionGuard} />
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
              disabled={
                actionGuard.connectionDisabled ||
                busy === "save" ||
                !job.audio?.available
              }
              title={actionGuard.title("Save vocals")}
              onClick={() => {
                void onSave();
              }}
            >
              <Save className="size-4" />
              Save vocals
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium">{job.sourceTitle}</p>
          <p className="text-xs text-muted-foreground">
            {job.id} / {job.voiceProfile.name}
            {job.region
              ? ` / ${formatDuration(job.region.startMs)} - ${formatDuration(job.region.endMs)}`
              : ""}
          </p>
          {job.error ? <p className="mt-1 text-xs text-rose-200">{job.error}</p> : null}
        </div>
        {job.audio?.available && job.audio.audioUrl ? (
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{job.audio.title}</p>
              <Badge variant="secondary">{job.audio.mediaType || "audio"}</Badge>
            </div>
            <audio controls className="mt-3 w-full" src={job.audio.audioUrl} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Waiting for the configured voice provider to return a real vocal render.
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
