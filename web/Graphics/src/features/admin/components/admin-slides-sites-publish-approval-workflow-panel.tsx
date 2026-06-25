"use client";

import {
  ClipboardCheck,
  ClipboardCopy,
  Download,
  FileJson2,
  GitBranch,
  Route,
  ShieldCheck,
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
import {
  getAdminSlidesSitesPublishApprovalWorkflowCsv,
  getAdminSlidesSitesPublishApprovalWorkflowJson,
  getAdminSlidesSitesPublishApprovalWorkflowMarkdown,
  type AdminSlidesSitesPublishApprovalWorkflowReport,
  type AdminSlidesSitesPublishApprovalWorkflowStatus,
} from "@/features/admin/admin-slides-sites-publish-approval-workflow";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminSlidesSitesPublishApprovalWorkflowPanelProps = {
  report: AdminSlidesSitesPublishApprovalWorkflowReport;
};

export function AdminSlidesSitesPublishApprovalWorkflowPanel({
  report,
}: AdminSlidesSitesPublishApprovalWorkflowPanelProps) {
  function exportJson() {
    downloadTextFile({
      filename: "slides-sites-publish-approval-workflow.json",
      content: getAdminSlidesSitesPublishApprovalWorkflowJson(report),
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      filename: "slides-sites-publish-approval-workflow.csv",
      content: getAdminSlidesSitesPublishApprovalWorkflowCsv(report),
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      filename: "slides-sites-publish-approval-workflow.md",
      content: getAdminSlidesSitesPublishApprovalWorkflowMarkdown(report),
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminSlidesSitesPublishApprovalWorkflowMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-4" />
            Slides/Sites publish approval
          </CardTitle>
          <CardDescription>
            Reviewer assignments, version anchors, route smoke signoff,
            rollback bundles, and approval queues for public Slides/Sites
            publication.
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
          <Metric label="Approvals" value={report.publishApprovalCount} />
          <Metric label="Reviewers" value={report.reviewerAssignmentCount} />
          <Metric label="Versions" value={report.versionAnchorCount} />
          <Metric label="Smoke" value={report.routeSmokeSignoffCount} />
          <Metric label="Rollback" value={report.rollbackBundleCount} />
          <Metric label="Analytics" value={report.analyticsEvidenceCount} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3">
            {report.publishApprovals.slice(0, 8).map((approval) => (
              <div
                key={approval.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{approval.label}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant={getStatusVariant(approval.status)}>
                        {approval.status}
                      </Badge>
                      <Badge variant="outline">{approval.channelKind}</Badge>
                      <Badge variant="outline">{approval.approvalState}</Badge>
                    </div>
                  </div>
                  <Badge
                    variant={
                      approval.rollbackState === "linked"
                        ? "outline"
                        : "secondary"
                    }
                  >
                    <GitBranch className="size-3" />
                    {approval.rollbackState}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                  <Info
                    label="Reviewer"
                    value={approval.reviewerEmail ?? "Unassigned"}
                  />
                  <Info label="Scope" value={approval.scopeKey ?? "Release"} />
                  <Info label="Smoke" value={approval.routeSmokeStatus} />
                </div>
                <div className="mt-3 truncate font-mono text-[11px] text-muted-foreground">
                  {approval.targetUrl}
                </div>
                <p className="mt-2 text-xs">{approval.recommendation}</p>
              </div>
            ))}
          </div>

          <div className="grid content-start gap-3">
            {report.rows.slice(0, 12).map((row) => (
              <div
                key={row.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-sm font-medium">
                    {row.label}
                  </div>
                  <Badge variant={getStatusVariant(row.status)}>
                    {row.status}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline">{row.category}</Badge>
                  <Badge variant="secondary">{row.count}</Badge>
                  {row.category === "route-smoke-signoff" ? (
                    <Badge variant="outline">
                      <Route className="size-3" />
                      smoke
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {row.detail}
                </p>
                <p className="mt-2 text-xs">{row.recommendation}</p>
              </div>
            ))}
          </div>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function getStatusVariant(
  status: AdminSlidesSitesPublishApprovalWorkflowStatus,
) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
