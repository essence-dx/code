"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileJson2,
  GitPullRequestArrow,
  ShieldCheck,
  XCircle,
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
import { saveScopedPublicationApproval } from "@/features/admin/actions";
import type {
  ScopedPublicationApprovalReport,
  ScopedPublicationApprovalScope,
  ScopedPublicationStatus,
} from "@/features/admin/admin-scoped-publication-approvals";
import {
  getScopedPublicationApprovalCsv,
  getScopedPublicationApprovalJson,
  getScopedPublicationApprovalMarkdown,
} from "@/features/admin/admin-scoped-publication-approvals-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminScopedPublicationApprovalsPanelProps = {
  report: ScopedPublicationApprovalReport;
};

export function AdminScopedPublicationApprovalsPanel({
  report,
}: AdminScopedPublicationApprovalsPanelProps) {
  const router = useRouter();
  const [pendingScope, setPendingScope] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function exportJson() {
    downloadTextFile({
      content: getScopedPublicationApprovalJson(report),
      filename: "scoped-publication-approvals.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getScopedPublicationApprovalCsv(report),
      filename: "scoped-publication-approvals.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getScopedPublicationApprovalMarkdown(report),
      filename: "scoped-publication-approvals.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getScopedPublicationApprovalMarkdown(report),
    );
  }

  function runDecision(
    scope: ScopedPublicationApprovalScope,
    decision: "approved" | "changes-requested",
  ) {
    setPendingScope(`${scope.scopeKey}-${decision}`);
    setActionError(null);
    startTransition(() => {
      void saveScopedPublicationApproval({
        blockerCount: scope.blockers.length,
        channelCount: scope.channelCount,
        decision,
        evidenceDiffCount: scope.releaseEvidenceDiffCount,
        note:
          decision === "approved"
            ? `Approved ${scope.scopeKey} publication evidence.`
            : `Requested changes for ${scope.scopeKey} publication evidence.`,
        projectName: scope.projectName,
        rollbackAnchorCount: scope.rollbackAnchorCount,
        scopeKey: scope.scopeKey,
        slaDueAt: scope.slaDueAt,
        teamName: scope.teamName,
      })
        .then(() => router.refresh())
        .catch((error) => {
          setActionError(
            error instanceof Error
              ? error.message
              : "Scoped publication decision failed.",
          );
        })
        .finally(() => setPendingScope(null));
    });
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <GitPullRequestArrow className="size-4" />
            Scoped publication approvals
          </CardTitle>
          <CardDescription>
            Team/project ownership, SLA state, rollback anchors, and release
            evidence diffs before publication.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant="outline">
            <ShieldCheck className="size-3" />
            {report.approvedScopeCount}/{report.scopeCount} approved
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Scopes" value={report.scopeCount} />
          <Metric label="Approved" value={report.approvedScopeCount} />
          <Metric label="Missing" value={report.missingApprovalCount} />
          <Metric label="Stale" value={report.staleApprovalCount} />
          <Metric label="Overdue" value={report.overdueScopeCount} />
          <Metric label="Diffs" value={report.releaseEvidenceDiffCount} />
        </div>

        {actionError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {actionError}
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-2">
          {report.scopes.slice(0, 8).map((scope) => (
            <div
              key={scope.scopeKey}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{scope.scopeKey}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant={getStatusVariant(scope.status)}>
                      {scope.status}
                    </Badge>
                    <Badge variant="outline">{scope.approvalState}</Badge>
                    <Badge variant="outline">SLA {scope.slaStatus}</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-xs md:grid-cols-4">
                <Info label="Files" value={`${scope.fileCount}`} />
                <Info
                  label="Channels"
                  value={`${scope.readyChannelCount}/${scope.channelCount}`}
                />
                <Info label="Rollback" value={`${scope.rollbackAnchorCount}`} />
                <Info
                  label="Diffs"
                  value={`${scope.releaseEvidenceDiffCount}`}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {scope.reviewerSummary}
              </p>
              <p className="mt-2 text-xs">{scope.recommendation}</p>
              {scope.slaDueAt ? (
                <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                  Due {formatDate(scope.slaDueAt)}
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pendingScope !== null}
                  onClick={() => runDecision(scope, "approved")}
                >
                  <CheckCircle2 className="size-3.5" />
                  {pendingScope === `${scope.scopeKey}-approved`
                    ? "Saving"
                    : "Approve"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pendingScope !== null}
                  onClick={() => runDecision(scope, "changes-requested")}
                >
                  <XCircle className="size-3.5" />
                  {pendingScope === `${scope.scopeKey}-changes-requested`
                    ? "Saving"
                    : "Request changes"}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-4">
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-foreground">{value}</div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusVariant(status: ScopedPublicationStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
