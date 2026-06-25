"use client";

import { Archive, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ComposerSnapshotRetentionProps = {
  filtered: number;
  hidden: number;
  limit: number;
  onExport: () => void;
  pinned: number;
  selected: number;
  total: number;
};

export function ComposerSnapshotRetention({
  filtered,
  hidden,
  limit,
  onExport,
  pinned,
  selected,
  total,
}: ComposerSnapshotRetentionProps) {
  const unpinned = Math.max(0, total - pinned);
  const capReached = total >= limit;

  return (
    <div
      className="rounded-md border border-white/10 bg-slate-950/45 p-2"
      role="group"
      aria-label="Snapshot retention summary"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="bg-white/5">
          <Gauge className="mr-1 size-3" />
          {total}/{limit} saved
        </Badge>
        <Badge
          variant="secondary"
          className="bg-emerald-400/15 text-emerald-100"
        >
          {pinned} pinned
        </Badge>
        <Badge variant="secondary" className="bg-white/5">
          {unpinned} unpinned
        </Badge>
        <Badge variant="outline" className="border-white/10">
          {filtered} visible
        </Badge>
        {hidden > 0 ? (
          <Badge variant="outline" className="border-white/10">
            {hidden} hidden
          </Badge>
        ) : null}
      </div>

      <div className="mt-2 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          {capReached
            ? "Snapshot cap reached. Export before cleanup to keep an archive."
            : `${limit - total} local restore slots remaining.`}
        </p>
        {selected > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 shrink-0 gap-1"
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
