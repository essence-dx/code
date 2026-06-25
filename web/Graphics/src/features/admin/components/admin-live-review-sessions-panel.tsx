"use client";

import type { ReactNode } from "react";
import {
  CalendarCheck2,
  ClipboardCopy,
  Download,
  FileJson2,
  GitPullRequest,
  ListChecks,
  MessagesSquare,
  Share2,
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
  AdminLiveReviewSessionsReport,
  AdminLiveReviewSessionStatus,
} from "@/features/admin/admin-live-review-sessions";
import {
  getAdminLiveReviewSessionsCsv,
  getAdminLiveReviewSessionsJson,
  getAdminLiveReviewSessionsMarkdown,
} from "@/features/admin/admin-live-review-sessions";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminLiveReviewSessionsPanelProps = {
  report: AdminLiveReviewSessionsReport;
};

export function AdminLiveReviewSessionsPanel({
  report,
}: AdminLiveReviewSessionsPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminLiveReviewSessionsJson(report),
      filename: "admin-live-review-sessions.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminLiveReviewSessionsCsv(report),
      filename: "admin-live-review-sessions.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminLiveReviewSessionsMarkdown(report),
      filename: "admin-live-review-sessions.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminLiveReviewSessionsMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck2 className="size-4" />
            Live review sessions
          </CardTitle>
          <CardDescription>
            Agendas, minutes, branch links, comments, approvals, public shares,
            owners, and action items for production design reviews.
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
          <Metric label="Sessions" value={report.sessionCount} />
          <Metric label="Agenda" value={report.agendaItemCount} />
          <Metric label="Minutes" value={report.minutesItemCount} />
          <Metric label="Actions" value={report.actionItemCount} />
          <Metric label="Owners" value={report.missingOwnerCount} />
          <Metric label="Shares" value={report.linkedPublicShareCount} />
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
          {report.sessions.slice(0, 8).map((session) => (
            <div
              key={session.id}
              className="rounded-md border border-border bg-background p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{session.fileName}</div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {session.branchName}
                  </p>
                </div>
                <Badge variant={getStatusVariant(session.status)}>
                  {session.status}
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                <Info
                  icon={<GitPullRequest className="size-3.5" />}
                  label="Comments"
                  value={`${session.openCommentCount}`}
                />
                <Info
                  icon={<MessagesSquare className="size-3.5" />}
                  label="Agenda"
                  value={`${session.agendaItemCount}`}
                />
                <Info
                  icon={<ListChecks className="size-3.5" />}
                  label="Actions"
                  value={`${session.actionItemCount}`}
                />
                <Info
                  icon={<Share2 className="size-3.5" />}
                  label="Shares"
                  value={`${session.publicShareCount}`}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {session.recommendation}
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

function getStatusVariant(status: AdminLiveReviewSessionStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
