"use client";

import {
  CheckSquare2,
  GitCompareArrows,
  RotateCcw,
  Square,
  Star,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getDraftQuality,
  getDraftSourceBadges,
  type DraftSourceBadge,
} from "@/features/ai/creation-draft-quality";
import type { CreationDraft } from "@/features/ai/creation-drafts";
import { CreationDraftNote } from "./creation-draft-note";

type CreationDraftCardProps = {
  draft: CreationDraft;
  onApply: (draft: CreationDraft) => void;
  onCompare: (draft: CreationDraft) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onToggleSelect: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  selected: boolean;
};

export function CreationDraftCard({
  draft,
  onApply,
  onCompare,
  onDelete,
  onTogglePin,
  onToggleSelect,
  onUpdateNote,
  selected,
}: CreationDraftCardProps) {
  const quality = getDraftQuality(draft);
  const badges = getDraftSourceBadges(draft);

  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{draft.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {draft.theme || draft.styleIdea || "No direction"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant={selected ? "secondary" : "ghost"}
            title={`${selected ? "Deselect" : "Select"} ${draft.title}`}
            aria-label={`${selected ? "Deselect" : "Select"} ${draft.title}`}
            aria-pressed={selected}
            onClick={() => onToggleSelect(draft.id)}
          >
            {selected ? (
              <CheckSquare2 className="size-4" />
            ) : (
              <Square className="size-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant={draft.pinned ? "secondary" : "ghost"}
            title={draft.pinned ? "Unpin draft" : "Pin draft"}
            aria-label={`${draft.pinned ? "Unpin" : "Pin"} ${draft.title}`}
            onClick={() => onTogglePin(draft.id, !draft.pinned)}
          >
            <Star
              className={
                draft.pinned
                  ? "size-4 fill-amber-300 text-amber-300"
                  : "size-4"
              }
            />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title={`Compare ${draft.title}`}
            aria-label={`Compare ${draft.title}`}
            onClick={() => onCompare(draft)}
          >
            <GitCompareArrows className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title={`Apply ${draft.title}`}
            aria-label={`Apply ${draft.title}`}
            onClick={() => onApply(draft)}
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title={`Delete ${draft.title}`}
            aria-label={`Delete ${draft.title}`}
            onClick={() => onDelete(draft.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {badges.map((badge) => (
          <SourceBadge key={badge.label} badge={badge} />
        ))}
      </div>
      <CreationDraftNote draft={draft} onUpdateNote={onUpdateNote} />
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Draft context</span>
          <span
            className={
              quality.score >= 80 ? "text-emerald-200" : "text-amber-200"
            }
          >
            {quality.score}%
          </span>
        </div>
        <Progress value={quality.score} />
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {quality.missing.length
            ? `Missing ${quality.missing.join(", ")}`
            : "Ready with full context"}
        </p>
      </div>
    </div>
  );
}

function SourceBadge({ badge }: { badge: DraftSourceBadge }) {
  const className =
    badge.tone === "good"
      ? "bg-emerald-400/15 text-emerald-200"
      : badge.tone === "warn"
        ? "bg-amber-400/15 text-amber-100"
        : "bg-white/5";

  return (
    <Badge variant="secondary" className={className}>
      {badge.label}
    </Badge>
  );
}
