"use client";

import { FileMusic, Layers3, RefreshCw, Save, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ProviderJobOfflineBadge,
  useProviderJobActionGuard,
} from "./provider-job-action-guard";
import type {
  StemAssetView,
  StemBusyState,
  StemJobView,
} from "@/features/ai/use-stem-extraction";

type StemExtractionPanelProps = {
  busy: StemBusyState;
  job?: StemJobView;
  midiBusy?: boolean;
  midiReady?: boolean;
  onExtractMidi?: (stem: StemAssetView, job: StemJobView) => Promise<unknown>;
  onRefresh: () => Promise<unknown>;
  onSave: () => Promise<unknown>;
  onCreateVariation?: (stem: StemAssetView, job: StemJobView) => Promise<unknown>;
  variationBusy?: boolean;
  variationReady?: boolean;
};

export function StemExtractionPanel({
  busy,
  job,
  midiBusy,
  midiReady,
  onExtractMidi,
  onCreateVariation,
  onRefresh,
  onSave,
  variationBusy,
  variationReady,
}: StemExtractionPanelProps) {
  const actionGuard = useProviderJobActionGuard();

  if (!job?.id) {
    return null;
  }

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers3 className="size-4 text-emerald-200" />
            Stem extraction
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
                !job.stems.length
              }
              title={actionGuard.title("Save stems")}
              onClick={() => {
                void onSave();
              }}
            >
              <Save className="size-4" />
              Save stems
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium">{job.sourceTitle}</p>
          <p className="text-xs text-muted-foreground">{job.id}</p>
          {job.error ? <p className="mt-1 text-xs text-rose-200">{job.error}</p> : null}
        </div>
        {job.stems.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {job.stems.map((stem) => (
              <div
                key={stem.id}
                className="rounded-md border border-white/10 bg-slate-950/50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{stem.title}</p>
                  <Badge variant="secondary">{stem.stemType}</Badge>
                </div>
                <audio controls className="mt-3 w-full" src={stem.audioUrl} />
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3 gap-2"
                  disabled={
                    actionGuard.connectionDisabled ||
                    !midiReady ||
                    midiBusy ||
                    !onExtractMidi
                  }
                  title={actionGuard.title(
                    midiReady
                      ? "Extract MIDI from this stem"
                      : "Audio-to-MIDI extraction is not connected",
                  )}
                  onClick={() => {
                    if (onExtractMidi) {
                      void onExtractMidi(stem, job);
                    }
                  }}
                >
                  <FileMusic className="size-4" />
                  MIDI
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3 ml-2 gap-2"
                  disabled={
                    actionGuard.connectionDisabled ||
                    !variationReady ||
                    variationBusy ||
                    !onCreateVariation
                  }
                  title={actionGuard.title(
                    variationReady
                      ? "Create a variation from this stem"
                      : "Stem variation is not connected",
                  )}
                  onClick={() => {
                    if (onCreateVariation) {
                      void onCreateVariation(stem, job);
                    }
                  }}
                >
                  <Sparkles className="size-4" />
                  Variation
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Waiting for the configured provider to return real stem files.
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
