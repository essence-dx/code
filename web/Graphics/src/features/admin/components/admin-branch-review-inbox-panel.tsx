"use client";

import {
  ClipboardCopy,
  Clock3,
  Download,
  FileJson2,
  GitPullRequest,
  ShieldAlert,
  UserCheck,
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
  AdminBranchReviewInboxReport,
  AdminBranchReviewInboxStatus,
} from "@/features/admin/admin-branch-review-inbox";
import {
  getAdminBranchReviewInboxCsv,
  getAdminBranchReviewInboxJson,
  getAdminBranchReviewInboxMarkdown,
} from "@/features/admin/admin-branch-review-inbox-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminBranchReviewInboxPanelProps = {
  report: AdminBranchReviewInboxReport;
};

export function AdminBranchReviewInboxPanel({
  report,
}: AdminBranchReviewInboxPanelProps) {
  function exportJson() {
    downloadTextFile({
      filename: "branch-review-inbox.json",
      content: getAdminBranchReviewInboxJson(report),
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      filename: "branch-review-inbox.csv",
      content: getAdminBranchReviewInboxCsv(report),
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      filename: "branch-review-inbox.md",
      content: getAdminBranchReviewInboxMarkdown(report),
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminBranchReviewInboxMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <GitPullRequest className="size-4" />
            Branch review inbox
          </CardTitle>
          <CardDescription>
            Reviewer ownership, SLA state, merge readiness, blockers, and
            release evidence for active design branches.
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
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Requests" value={report.requestCount} />
          <Metric label="Reviewers" value={report.reviewerCount} />
          <Metric label="Overdue" value={report.overdueCount} />
          <Metric label="Due soon" value={report.dueSoonCount} />
          <Metric label="Merge ready" value={report.mergeReadyCount} />
          <Metric label="Blockers" value={report.blockerCount} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {report.requests.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              No active branch review requests are loaded yet.
            </div>
          ) : (
            report.requests.slice(0, 8).map((request) => (
              <div
                key={request.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {request.branchName}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline">{request.mergeIntent}</Badge>
                      <Badge variant={getStatusVariant(request.status)}>
                        {request.status}
                      </Badge>
                      <Badge variant={getStatusVariant(request.mergeReadiness)}>
                        merge {request.mergeReadiness}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(toSlaStatus(request.slaStatus))}>
                    {request.slaStatus}
                  </Badge>
                </div>

                <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                  <Info
                    icon={UserCheck}
                    label="Reviewers"
                    value={request.reviewerSummary}
                  />
                  <Info
                    icon={Clock3}
                    label="Due"
                    value={request.dueDate ? formatDate(request.dueDate) : "None"}
                  />
                  <Info
                    icon={ShieldAlert}
                    label="Evidence"
                    value={`${request.releaseEvidenceCount} anchors`}
                  />
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  {request.openCommentCount} open comments,{" "}
                  {request.mergeReviewCount} merge reviews,{" "}
                  {request.blockerCount} blockers.
                </p>
                <p className="mt-2 text-xs">{request.recommendation}</p>
                {request.blockers.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {request.blockers.slice(0, 3).map((blocker) => (
                      <Badge key={blocker} variant="secondary">
                        {blocker}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function getStatusVariant(status: AdminBranchReviewInboxStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function toSlaStatus(status: string): AdminBranchReviewInboxStatus {
  if (status === "overdue" || status === "unassigned") {
    return "blocked";
  }

  return status === "clear" ? "ready" : "review";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}
