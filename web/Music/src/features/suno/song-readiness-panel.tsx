"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSongReadiness } from "@/features/library/song-readiness";
import type { LocalSong } from "@/features/library/types";

export function SongReadinessPanel({ song }: { song: LocalSong }) {
  const readiness = getSongReadiness(song);

  return (
    <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">Track readiness</p>
          <p className="text-xs text-muted-foreground">
            {readiness.ready}/{readiness.total} checks ready
          </p>
        </div>
        <Badge
          className={
            readiness.score === 100
              ? "bg-emerald-400/15 text-emerald-200"
              : "bg-amber-400/15 text-amber-100"
          }
        >
          {readiness.score}/100
        </Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {readiness.checks.map((check) => {
          const ready = check.state === "ready";
          const Icon = ready ? CheckCircle2 : CircleAlert;

          return (
            <div key={check.id} className="flex gap-2 text-sm">
              <Icon
                className={
                  ready
                    ? "mt-0.5 size-4 shrink-0 text-emerald-200"
                    : "mt-0.5 size-4 shrink-0 text-amber-200"
                }
              />
              <div className="min-w-0">
                <p className="font-medium">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
