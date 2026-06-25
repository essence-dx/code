"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type { DesignPagePatch } from "@/features/editor/document-utils";
import {
  createReviewTimerPagePatch,
  createVotingSessionPagePatch,
  getFacilitationReview,
  getFacilitationReviewCsv,
  getFacilitationReviewMarkdown,
  updateReviewTimerPagePatch,
  updateVotingSessionPagePatch,
  type FacilitationReviewStatus,
} from "@/features/editor/facilitation-review";
import {
  createFacilitationTemplatePatch,
  facilitationTemplateOptions,
} from "@/features/editor/facilitation-templates";
import type { DesignPage } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type FacilitationReviewPanelProps = {
  page: DesignPage;
  onUpdatePage: (patch: DesignPagePatch) => void;
};

export function FacilitationReviewPanel({
  page,
  onUpdatePage,
}: FacilitationReviewPanelProps) {
  const report = useMemo(() => getFacilitationReview(page), [page]);
  const previewRows = report.rows.slice(0, 5);
  const votingSession = page.facilitation?.votingSession;
  const reviewTimer = page.facilitation?.reviewTimer;

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/50 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Facilitation review
          </div>
          <div className="mt-1 text-muted-foreground">
            {report.openCount} open / {report.voteCount} votes /{" "}
            {report.assignedCount} assigned
          </div>
        </div>
        <Badge
          variant={report.blockerCount > 0 ? "destructive" : "secondary"}
          className="shrink-0"
        >
          {report.blockerCount} blocked
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          onClick={() =>
            downloadTextFile({
              content: getFacilitationReviewCsv(report),
              filename: "facilitation-review.csv",
              type: "text/csv;charset=utf-8",
            })
          }
        >
          <Download className="size-3.5" />
          CSV
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px]"
          onClick={() =>
            downloadTextFile({
              content: getFacilitationReviewMarkdown(report),
              filename: "facilitation-review.md",
              type: "text/markdown;charset=utf-8",
            })
          }
        >
          <Download className="size-3.5" />
          Inspect
        </Button>
      </div>

      <div className="space-y-2 rounded-md border border-border bg-card p-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Voting session
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {votingSession
                ? `${votingSession.status} / ${votingSession.voteBudget} votes`
                : "No session"}
            </div>
          </div>
          {votingSession ? (
            <Button
              type="button"
              variant={votingSession.status === "open" ? "secondary" : "outline"}
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() =>
                onUpdatePage(
                  updateVotingSessionPagePatch(page, {
                    status:
                      votingSession.status === "open" ? "closed" : "open",
                  }),
                )
              }
            >
              {votingSession.status === "open" ? "Close" : "Reopen"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => onUpdatePage(createVotingSessionPagePatch(page))}
            >
              Start vote
            </Button>
          )}
        </div>

        {votingSession ? (
          <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-1.5">
            <Input
              value={votingSession.name}
              className="h-8 text-xs"
              onChange={(event) =>
                onUpdatePage(
                  updateVotingSessionPagePatch(page, {
                    name: event.target.value,
                  }),
                )
              }
            />
            <NumberInput
              value={votingSession.voteBudget}
              min={1}
              max={20}
              onChange={(voteBudget) =>
                onUpdatePage(
                  updateVotingSessionPagePatch(page, { voteBudget }),
                )
              }
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-2 rounded-md border border-border bg-card p-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Review timer
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {reviewTimer
                ? `${reviewTimer.status} / ${reviewTimer.durationMinutes} min`
                : "No timer"}
            </div>
          </div>
          {reviewTimer ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() =>
                  onUpdatePage(
                    updateReviewTimerPagePatch(page, {
                      status:
                        reviewTimer.status === "running" ? "paused" : "running",
                    }),
                  )
                }
              >
                {reviewTimer.status === "running" ? "Pause" : "Start"}
              </Button>
              <Button
                type="button"
                variant={reviewTimer.status === "finished" ? "secondary" : "outline"}
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() =>
                  onUpdatePage(
                    updateReviewTimerPagePatch(page, { status: "finished" }),
                  )
                }
              >
                Finish
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => onUpdatePage(createReviewTimerPagePatch(page))}
            >
              Add timer
            </Button>
          )}
        </div>

        {reviewTimer ? (
          <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-1.5">
            <Input
              value={reviewTimer.name}
              className="h-8 text-xs"
              onChange={(event) =>
                onUpdatePage(
                  updateReviewTimerPagePatch(page, {
                    name: event.target.value,
                  }),
                )
              }
            />
            <NumberInput
              value={reviewTimer.durationMinutes}
              min={1}
              max={240}
              onChange={(durationMinutes) =>
                onUpdatePage(
                  updateReviewTimerPagePatch(page, { durationMinutes }),
                )
              }
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-2 rounded-md border border-border bg-card p-2">
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Templates
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {facilitationTemplateOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 text-[11px]"
              onClick={() =>
                onUpdatePage(createFacilitationTemplatePatch(page, option.value))
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {previewRows.length > 0 ? (
        <div className="space-y-1.5">
          {previewRows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-md border border-border bg-card px-2 py-1.5"
            >
              <StatusIcon status={row.status} />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground">
                    {row.label}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-medium uppercase tracking-wide",
                      row.status === "ready" && "text-emerald-600",
                      row.status === "review" && "text-amber-600",
                      row.status === "blocked" && "text-destructive",
                    )}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="truncate text-muted-foreground">
                  {row.text} / {row.votes} votes / {row.assignee}
                </div>
              </div>
            </div>
          ))}
          {report.rows.length > previewRows.length ? (
            <div className="text-[11px] text-muted-foreground">
              {report.rows.length - previewRows.length} more review rows in
              handoff
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card px-2 py-1.5 text-muted-foreground">
          No comments to facilitate on this page yet.
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: FacilitationReviewStatus }) {
  const className = cn(
    "mt-0.5 size-3.5",
    status === "ready" && "text-emerald-600",
    status === "review" && "text-amber-600",
    status === "blocked" && "text-destructive",
  );

  if (status === "ready") {
    return <CheckCircle2 className={className} />;
  }

  if (status === "blocked") {
    return <AlertTriangle className={className} />;
  }

  return <CircleDashed className={className} />;
}
