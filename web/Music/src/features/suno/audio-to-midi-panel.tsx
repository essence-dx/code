"use client";

import { Download, FileMusic, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/features/audio/format";
import {
  ProviderJobOfflineBadge,
  useProviderJobActionGuard,
} from "./provider-job-action-guard";
import type {
  AudioToMidiBusyState,
  AudioToMidiJobView,
} from "@/features/ai/use-audio-to-midi-job";

type AudioToMidiPanelProps = {
  busy: AudioToMidiBusyState;
  job?: AudioToMidiJobView;
  onDownload: () => Promise<unknown>;
  onRefresh: () => Promise<unknown>;
};

export function AudioToMidiPanel({
  busy,
  job,
  onDownload,
  onRefresh,
}: AudioToMidiPanelProps) {
  const actionGuard = useProviderJobActionGuard();

  if (!job?.id) {
    return null;
  }

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileMusic className="size-4 text-emerald-200" />
            Audio to MIDI
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
                busy === "download" ||
                !job.midi?.available
              }
              title={actionGuard.title("Download MIDI")}
              onClick={() => {
                void onDownload();
              }}
            >
              <Download className="size-4" />
              Download MIDI
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium">{job.sourceTitle}</p>
          <p className="text-xs text-muted-foreground">
            {job.id} / {job.sourceKind}
            {job.region
              ? ` / ${formatDuration(job.region.startMs)} - ${formatDuration(job.region.endMs)}`
              : ""}
          </p>
          {job.error ? <p className="mt-1 text-xs text-rose-200">{job.error}</p> : null}
        </div>
        {job.midi?.available ? (
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{job.midi.title}</p>
              <Badge variant="secondary">{job.midi.mediaType || "audio/midi"}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              MIDI is ready for download and import into a DAW.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Waiting for the configured provider to return a real MIDI file.
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
