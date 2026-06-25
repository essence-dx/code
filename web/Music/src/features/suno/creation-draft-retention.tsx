"use client";

import { Archive, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CreationDraftRetentionProps = {
  cleanupCandidates: number;
  filtered: number;
  limit: number;
  noted: number;
  onExport: () => void;
  pinned: number;
  selected: number;
  total: number;
  weak: number;
};

export function CreationDraftRetention({
  cleanupCandidates,
  filtered,
  limit,
  noted,
  onExport,
  pinned,
  selected,
  total,
  weak,
}: CreationDraftRetentionProps) {
  const closeToFull = total >= Math.floor(limit * 0.85);

  return (
    <div
      className="rounded-md border border-white/10 bg-black/20 p-2"
      role="group"
      aria-label="Creation draft retention summary"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="bg-white/5">
          <Gauge className="mr-1 size-3" />
          {total}/{limit} saved
        </Badge>
        <Badge variant="secondary" className="bg-white/5">
          {filtered} filtered
        </Badge>
        <Badge variant="secondary" className="bg-amber-400/15 text-amber-100">
          {pinned} pinned
        </Badge>
        <Badge variant="secondary" className="bg-white/5">
          {selected} selected
        </Badge>
        <Badge variant="secondary" className="bg-white/5">
          {noted} noted
        </Badge>
        <Badge
          variant="secondary"
          className={
            weak
              ? "bg-amber-400/15 text-amber-100"
              : "bg-emerald-400/15 text-emerald-100"
          }
        >
          {weak} weak
        </Badge>
        {cleanupCandidates > 0 ? (
          <Badge variant="outline" className="border-white/10">
            {cleanupCandidates} cleanup candidates
          </Badge>
        ) : null}
      </div>

      <div className="mt-2 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          {closeToFull
            ? "Draft vault is close to full. Export before weak-draft cleanup to keep an archive."
            : `${limit - total} local draft slots remaining.`}
        </p>
        {cleanupCandidates > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 shrink-0 gap-1"
            title="Export creation drafts before cleanup"
            onClick={onExport}
          >
            <Archive className="size-3" />
            Export before cleanup
          </Button>
        ) : null}
      </div>
    </div>
  );
}
