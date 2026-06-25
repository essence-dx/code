"use client";

import type { ReactNode } from "react";
import {
  BellRing,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileJson2,
  Heart,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AdminCommentReactionWorkflowStatus,
  AdminCommentReactionWorkflowsReport,
} from "@/features/admin/admin-comment-reaction-workflows";
import {
  getAdminCommentReactionWorkflowsCsv,
  getAdminCommentReactionWorkflowsJson,
  getAdminCommentReactionWorkflowsMarkdown,
} from "@/features/admin/admin-comment-reaction-workflows";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminCommentReactionWorkflowsPanelProps = {
  report: AdminCommentReactionWorkflowsReport;
};

export function AdminCommentReactionWorkflowsPanel({
  report,
}: AdminCommentReactionWorkflowsPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminCommentReactionWorkflowsJson(report),
      filename: "admin-comment-reaction-workflows.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminCommentReactionWorkflowsCsv(report),
      filename: "admin-comment-reaction-workflows.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminCommentReactionWorkflowsMarkdown(report),
      filename: "admin-comment-reaction-workflows.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminCommentReactionWorkflowsMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Heart className="size-4" />
            Comment reaction workflows
          </CardTitle>
          <CardDescription>
            Persistent reactions, acknowledgements, notification routing, and
            moderation review for comment-heavy design reviews.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Button type="button" size="sm" variant="outline" onClick={exportJson}>
            <FileJson2 className="size-3.5" />
            JSON
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            <Download className="size-3.5" />
            CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={exportMarkdown}
          >
            <Download className="size-3.5" />
            MD
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={copyMarkdown}
          >
            <ClipboardCopy className="size-3.5" />
            Copy
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Comments" value={report.commentCount} />
          <Metric label="Reactions" value={report.reactionCount} />
          <Metric label="Ack" value={report.acknowledgementCount} />
          <Metric label="Unacked" value={report.unacknowledgedOpenCommentCount} />
          <Metric label="Routes" value={report.reactionNotificationRouteCount} />
          <Metric label="Moderation" value={report.moderationReviewCount} />
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {report.rows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{row.label}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.detail}
                  </p>
                </div>
                <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="outline">{row.value}</Badge>
                {row.target ? <Badge variant="outline">{row.target}</Badge> : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {row.recommendation}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {report.comments.slice(0, 8).map((comment) => (
            <div
              key={comment.id}
              className="rounded-md border border-border bg-background p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{comment.fileName}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {comment.textPreview}
                  </p>
                </div>
                <Badge variant={getStatusVariant(comment.status)}>
                  {comment.status}
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                <Info
                  icon={<Heart className="size-3.5" />}
                  label="Reactions"
                  value={`${comment.reactionCount}`}
                />
                <Info
                  icon={<CheckCircle2 className="size-3.5" />}
                  label="Ack"
                  value={`${comment.acknowledgementCount}`}
                />
                <Info
                  icon={<BellRing className="size-3.5" />}
                  label="Routes"
                  value={`${comment.reactionNotificationCount}`}
                />
                <Info
                  icon={<ShieldAlert className="size-3.5" />}
                  label="Moderation"
                  value={`${comment.moderationReviewCount}`}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {comment.recommendation}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-mono text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: AdminCommentReactionWorkflowStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
