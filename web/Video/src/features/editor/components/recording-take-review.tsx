"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { recordingTimelinePresets, type RecordingTimelinePreset } from "@/lib/editor/recording-layouts";
import { formatTime } from "@/lib/editor/factory";
import type { MediaAsset } from "@/lib/editor/types";

type RecordingTakeReviewProps = {
  takes: MediaAsset[];
  isImporting: boolean;
  onPromoteTake: (asset: MediaAsset, preset: RecordingTimelinePreset) => void;
};

const reviewLayoutPresets = recordingTimelinePresets.filter((preset) => preset.id !== "save-only");

export function RecordingTakeReview({ takes, isImporting, onPromoteTake }: RecordingTakeReviewProps) {
  const playableTakes = useMemo(() => takes.filter((take) => take.type === "video" || take.type === "audio"), [takes]);
  const [primaryTakeId, setPrimaryTakeId] = useState("");
  const [comparisonTakeId, setComparisonTakeId] = useState("");
  const [layoutPreset, setLayoutPreset] = useState<RecordingTimelinePreset>("full-frame");
  const primaryTake = playableTakes.find((take) => take.id === primaryTakeId) ?? playableTakes[0];
  const comparisonTake =
    playableTakes.find((take) => take.id === comparisonTakeId && take.id !== primaryTake?.id) ??
    playableTakes.find((take) => take.id !== primaryTake?.id) ??
    null;
  const canPromotePrimary = Boolean(primaryTake?.objectUrl) && !isImporting;
  const canPromoteComparison = Boolean(comparisonTake?.objectUrl) && !isImporting;

  if (!playableTakes.length) {
    return (
      <div className="rounded-md border border-border bg-background/70 p-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium uppercase">Takes</span>
          <Badge variant="outline">0</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/70 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
          <GitCompareArrows className="size-3.5" />
          Takes
        </div>
        <Badge variant="outline">
          {playableTakes.length} {playableTakes.length === 1 ? "take" : "takes"}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TakeSelect label="A" value={primaryTake?.id ?? ""} takes={playableTakes} onChange={setPrimaryTakeId} />
        <TakeSelect
          label="B"
          value={comparisonTake?.id ?? ""}
          takes={playableTakes.filter((take) => take.id !== primaryTake?.id)}
          onChange={setComparisonTakeId}
          disabled={playableTakes.length < 2}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TakePreview label="A" take={primaryTake ?? null} />
        <TakePreview label="B" take={comparisonTake} />
      </div>
      {primaryTake?.type === "video" || comparisonTake?.type === "video" ? (
        <div className="grid grid-cols-4 gap-1">
          {reviewLayoutPresets.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant={layoutPreset === preset.id ? "secondary" : "outline"}
              className="px-1 text-xs"
              onClick={() => setLayoutPreset(preset.id)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" size="sm" variant="outline" disabled={!canPromotePrimary} onClick={() => primaryTake && onPromoteTake(primaryTake, layoutPreset)}>
          <CheckCircle2 className="size-4" />
          Best A
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canPromoteComparison}
          onClick={() => comparisonTake && onPromoteTake(comparisonTake, layoutPreset)}
        >
          <CheckCircle2 className="size-4" />
          Best B
        </Button>
      </div>
    </div>
  );
}

function TakeSelect({
  label,
  value,
  takes,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  takes: MediaAsset[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange} disabled={disabled || takes.length === 0}>
        <SelectTrigger size="sm" className="w-full">
          <SelectValue placeholder="Take" />
        </SelectTrigger>
        <SelectContent>
          {takes.map((take) => (
            <SelectItem key={take.id} value={take.id}>
              {take.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TakePreview({ label, take }: { label: string; take: MediaAsset | null }) {
  if (!take) {
    return <div className="grid min-h-24 place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground">{label}</div>;
  }

  return (
    <div className="space-y-1 rounded-md border border-border bg-card/50 p-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium">{label}</span>
        <span className="text-muted-foreground">{formatTime(take.duration)}</span>
      </div>
      {take.objectUrl && take.type === "video" ? (
        <video src={take.objectUrl} controls className="aspect-video w-full rounded-sm bg-muted object-contain" />
      ) : null}
      {take.objectUrl && take.type === "audio" ? <audio src={take.objectUrl} controls className="w-full" /> : null}
      {!take.objectUrl ? (
        <div className="grid min-h-20 place-items-center rounded-sm bg-muted/40 text-xs text-muted-foreground">Reconnect</div>
      ) : null}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="capitalize">
          {take.type}
        </Badge>
        <span>{formatFileSize(take.size)}</span>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number) {
  const safeBytes = Math.max(0, bytes);
  if (safeBytes < 1024 * 1024) return `${Math.round(safeBytes / 1024)} KB`;
  return `${(safeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
