"use client";

import {
  Activity,
  Clipboard,
  Download,
  FileText,
  Layers3,
  Music2,
  RefreshCw,
  Save,
} from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { saveCreationDraft } from "@/features/ai/creation-drafts";
import { useAiJobs, type AiJobListItem } from "@/features/ai/use-ai-jobs";
import { serializeJobProvenance } from "@/lib/ai/job-provenance";

const providerBackedJobKinds = new Set([
  "audio",
  "cover-remix",
  "extend",
  "instrumental",
  "replace-section",
  "sample",
  "vocals",
]);

export function AiJobsPanel() {
  const { canRefresh, jobs, loading, refresh, refreshDisabledReason, summary } =
    useAiJobs();
  const audioJobs = jobs.filter((job) => job.kind === "audio");
  const provenanceJobs = jobs.filter((job) =>
    providerBackedJobKinds.has(job.kind),
  );
  const writingJobs = jobs.filter(
    (job) => job.kind !== "audio" && !providerBackedJobKinds.has(job.kind),
  );
  const groups = useMemo(() => groupAudioJobs(audioJobs), [audioJobs]);
  const refreshDisabled = loading || !canRefresh;

  return (
    <Card className="border-white/10 bg-white/[0.04] lg:col-span-2">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-emerald-200" />
            Creation queue
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(summary).map(([status, count]) => (
              <Badge key={status} variant="secondary">
                {status}: {count}
              </Badge>
            ))}
            {!canRefresh ? (
              <Badge variant="outline">{refreshDisabledReason}</Badge>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={refreshDisabled}
              title={
                canRefresh ? "Refresh creation queue" : refreshDisabledReason
              }
              onClick={() => {
                void refresh();
              }}
            >
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80 pr-3">
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="space-y-3 rounded-md border border-white/10 bg-slate-950/50 p-3"
              >
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Music2 className="size-4 text-emerald-200" />
                      <p className="font-medium">{group.title}</p>
                      <Badge variant="outline">
                        {group.jobs.length}/{group.variantCount} takes
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {group.prompt || "Provider-backed music generation"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    {Object.entries(group.summary).map(([status, count]) => (
                      <StatusBadge key={status} status={`${status}: ${count}`} />
                    ))}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-2"
                      onClick={() => saveGroupDraft(group)}
                    >
                      <Save className="size-4" />
                      Save draft
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {group.jobs.map((job) => (
                    <AudioJobRow key={job.id} job={job} />
                  ))}
                </div>
              </div>
            ))}
            {provenanceJobs.length ? (
              <ProvenanceReview jobs={provenanceJobs.slice(0, 8)} />
            ) : null}
            {!jobs.length ? (
              <div className="rounded-md border border-white/10 bg-slate-950/50 p-8 text-center text-sm text-muted-foreground">
                Composer requests will appear here after creation actions run.
              </div>
            ) : null}
            {writingJobs.length ? (
              <div className="space-y-2 rounded-md border border-white/10 bg-slate-950/50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Layers3 className="size-4 text-emerald-200" />
                  Writing and media activity
                </div>
                {writingJobs.slice(0, 6).map((job) => (
                  <div
                    key={job.id}
                    className="grid gap-2 rounded-md bg-black/20 p-2 md:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{jobLabel(job.kind)}</p>
                        <StatusBadge status={job.status} />
                      </div>
                      {job.error ? (
                        <p className="mt-1 text-xs text-rose-200">{job.error}</p>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ProvenanceReview({ jobs }: { jobs: AiJobListItem[] }) {
  return (
    <div className="space-y-3 rounded-md border border-white/10 bg-slate-950/50 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText className="size-4 text-emerald-200" />
        Provenance review
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {jobs.map((job) => (
          <ProvenanceCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}

function ProvenanceCard({ job }: { job: AiJobListItem }) {
  const provenance = job.provenance;
  const requestFields = provenance?.request.slice(0, 5) ?? [];
  const assetCount = provenance?.assets.length ?? 0;
  const firstAsset = provenance?.assets[0];
  const assetFields = firstAsset?.metadata.slice(0, 3) ?? [];
  const contract = provenance?.contract;
  const replayDraft = job.replayDraft;

  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{jobLabel(job.kind)}</p>
            <StatusBadge status={job.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(job.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 gap-2"
            disabled={!replayDraft}
            onClick={() => saveReplayDraft(job)}
          >
            <Save className="size-4" />
            Replay draft
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Copy provenance for ${jobLabel(job.kind)}`}
            onClick={() => {
              void copyJobProvenance(job);
            }}
          >
            <Clipboard className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Export provenance for ${jobLabel(job.kind)}`}
            onClick={() => exportJobProvenance(job)}
          >
            <Download className="size-4" />
          </Button>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {requestFields.map((field) => (
          <div
            key={`${field.label}:${field.value}`}
            className="grid gap-1 text-xs md:grid-cols-[104px_1fr]"
          >
            <span className="text-muted-foreground">{field.label}</span>
            <span className="line-clamp-2 text-slate-200">{field.value}</span>
          </div>
        ))}
        {!requestFields.length ? (
          <p className="text-xs text-muted-foreground">
            No saved request context yet.
          </p>
        ) : null}
      </div>
      {firstAsset ? (
        <div className="mt-3 rounded-md border border-white/10 bg-slate-950/50 p-2">
          <p className="truncate text-xs font-medium">{firstAsset.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {firstAsset.type} / {firstAsset.mediaType}
          </p>
          {assetFields.map((field) => (
            <p
              key={`${field.label}:${field.value}`}
              className="mt-1 line-clamp-1 text-xs text-muted-foreground"
            >
              {field.label}: {field.value}
            </p>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {contract ? (
          <Badge variant="secondary" className="bg-white/5">
            Support {contract.ready}/{contract.total}
          </Badge>
        ) : null}
        <Badge variant="secondary" className="bg-white/5">
          Assets {assetCount}
        </Badge>
        <Badge variant="secondary" className="bg-white/5">
          {replayDraft ? "Replay ready" : "Replay unavailable"}
        </Badge>
        {provenance?.output.length ? (
          <Badge variant="secondary" className="bg-white/5">
            Provider output
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function jobLabel(kind: string) {
  const labels: Record<string, string> = {
    audio: "Music generation",
    brief: "Song brief",
    captions: "Hook captions",
    chat: "Composer chat",
    "cover-remix": "Cover/remix",
    cover: "Cover art",
    extend: "Song extension",
    instrumental: "Generated instrumental",
    lyrics: "Lyrics",
    metadata: "Metadata",
    midi: "Audio to MIDI",
    "model-training": "Custom model training",
    persona: "Persona generation",
    playlist: "Playlist ideas",
    remaster: "Remaster",
    "remove-fx": "Remove FX",
    "replace-section": "Replace section",
    sample: "Sample generation",
    stem: "Stem extraction",
    "stem-variation": "Stem variation",
    style: "Style expansion",
    transcription: "Transcription",
    vocals: "Generated vocals",
    "warp-marker": "Warp markers",
  };

  return labels[kind] || "Composer request";
}

function StatusBadge({ status }: { status: string }) {
  const readyClass =
    status.startsWith("succeeded")
      ? "bg-emerald-400/15 text-emerald-200"
      : status.startsWith("failed") || status.startsWith("disabled")
        ? "bg-rose-400/15 text-rose-200"
        : "";

  return (
    <Badge variant="secondary" className={readyClass}>
      {status}
    </Badge>
  );
}

async function copyJobProvenance(job: AiJobListItem) {
  if (!navigator.clipboard) {
    toast.error("Clipboard is not available.");
    return;
  }

  await navigator.clipboard.writeText(serializeJobProvenance(job));
  toast.success("Provenance copied.");
}

function exportJobProvenance(job: AiJobListItem) {
  const blob = new Blob([serializeJobProvenance(job)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(jobLabel(job.kind))}-${job.id}-provenance.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function saveReplayDraft(job: AiJobListItem) {
  if (!job.replayDraft) {
    toast.error("This job does not have enough saved context for a replay draft.");
    return;
  }

  const draft = saveCreationDraft(job.replayDraft);
  toast.success(`${draft.title} saved as a creation draft.`);
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function AudioJobRow({ job }: { job: AiJobListItem }) {
  const queue = job.queue;
  const audioUrl =
    queue?.audioAvailable && job.status === "succeeded"
      ? `/api/ai/audio-jobs/${job.id}/audio`
      : "";

  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-sm font-medium">
            Take {queue?.variantIndex ?? 1}
          </p>
          <StatusBadge status={job.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(job.createdAt).toLocaleString()}
        </p>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
        {queue?.style || job.model || job.provider}
      </p>
      {queue?.voiceProfile ? (
        <p className="mt-2 text-xs text-emerald-200">
          Voice: {queue.voiceProfile.name}
        </p>
      ) : null}
      {job.error ? <p className="mt-2 text-xs text-rose-200">{job.error}</p> : null}
      {audioUrl ? (
        <audio controls className="mt-3 w-full" src={audioUrl} />
      ) : null}
    </div>
  );
}

function groupAudioJobs(jobs: AiJobListItem[]) {
  const groups = new Map<
    string,
    {
      id: string;
      jobs: AiJobListItem[];
      lyrics: string;
      prompt: string;
      replayDraft: AiJobListItem["replayDraft"];
      style: string;
      summary: Record<string, number>;
      title: string;
      variantCount: number;
    }
  >();

  for (const job of jobs) {
    const queue = job.queue;
    const id = queue?.variantGroupId || job.id;
    const current =
      groups.get(id) ??
      {
        id,
        jobs: [],
        lyrics: queue?.lyrics ?? "",
        prompt: queue?.prompt ?? "",
        replayDraft: job.replayDraft,
        style: queue?.style ?? "",
        summary: {},
        title: queue?.title ?? "Music generation",
        variantCount: queue?.variantCount ?? 1,
      };

    current.jobs.push(job);
    current.summary[job.status] = (current.summary[job.status] ?? 0) + 1;
    current.replayDraft = current.replayDraft ?? job.replayDraft;
    current.variantCount = Math.max(
      current.variantCount,
      queue?.variantCount ?? 1,
      current.jobs.length,
    );
    groups.set(id, current);
  }

  return Array.from(groups.values());
}

function saveGroupDraft(group: ReturnType<typeof groupAudioJobs>[number]) {
  saveCreationDraft({
    audioPrompt: group.prompt,
    coverPrompt: "",
    creativeControls: group.replayDraft?.creativeControls,
    lyrics: group.lyrics,
    persona: group.replayDraft?.persona ?? null,
    source: {
      detail: `${group.jobs.length}/${group.variantCount} takes`,
      label: "Variant",
      type: "variant",
    },
    styleIdea: group.style,
    theme: `Variant set with ${group.jobs.length} queued take${
      group.jobs.length === 1 ? "" : "s"
    }`,
    title: `${group.title} variant set`,
    voiceProfile: group.replayDraft?.voiceProfile ?? null,
  });
  toast.success("Variant set saved as a creation draft.");
}
