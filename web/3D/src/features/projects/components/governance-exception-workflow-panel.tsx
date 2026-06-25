"use client";

import { CheckCircle2, Clock3, FileWarning, ShieldCheck, ShieldQuestion, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GovernanceExceptionStatus, GovernanceExceptionWorkflowReport } from "@/features/projects/governance-exception-workflow";

const statusIcon: Record<GovernanceExceptionStatus, typeof ShieldQuestion> = {
  approved: CheckCircle2,
  expired: Clock3,
  pending: ShieldQuestion,
  rejected: TriangleAlert,
  "review-needed": FileWarning,
};

function statusVariant(status: GovernanceExceptionStatus) {
  if (status === "expired" || status === "rejected") {
    return "destructive" as const;
  }

  if (status === "pending" || status === "review-needed") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function expiryLabel(days: number | null) {
  if (days === null) {
    return "Needs expiry";
  }

  if (days < 0) {
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} expired`;
  }

  if (days === 0) {
    return "Expires today";
  }

  return `${days} day${days === 1 ? "" : "s"} left`;
}

export function GovernanceExceptionWorkflowPanel({ report }: { report: GovernanceExceptionWorkflowReport }) {
  const visibleRows = report.rows.slice(0, 12);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Governance exceptions
            </CardTitle>
            <CardDescription>Scoped approval workflow with expiry dates, owner notes, reviewer sign-off, and suggested exception candidates.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={report.summary.expiredCount + report.summary.rejectedCount > 0 ? "destructive" : "outline"}>
              {report.summary.expiredCount + report.summary.rejectedCount} blocked
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.workflowScore}/100 workflow
            </Badge>
            <Badge className="rounded-md" variant={report.summary.reviewNeededCount + report.summary.pendingCount > 0 ? "secondary" : "outline"}>
              {report.summary.reviewNeededCount + report.summary.pendingCount} review
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Exceptions</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.totalCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.approvedCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.pendingCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Needs request</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.reviewNeededCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Expiring soon</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.expiringSoonCount}</p>
          </div>
        </div>

        {visibleRows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Owner note</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Next action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => {
                const Icon = statusIcon[row.status];

                return (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[280px] whitespace-normal">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">{row.scopeLabel}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{row.riskLabel}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="rounded-md" variant={statusVariant(row.status)}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{expiryLabel(row.expiresInDays)}</p>
                      <p className="mt-1">{formatDate(row.expiresAt)}</p>
                    </TableCell>
                    <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
                      <p className="line-clamp-3">{row.ownerNote}</p>
                      <p className="mt-2">{row.requestedBy ?? row.ownerHint}</p>
                    </TableCell>
                    <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{row.signedOffBy ?? "No sign-off"}</p>
                      <p className="mt-1">{row.reviewerNote ?? row.evidence}</p>
                    </TableCell>
                    <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
                      <p className="line-clamp-3">{row.nextAction}</p>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" />
            No governance exceptions are needed for the current policy and timeline signals.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
