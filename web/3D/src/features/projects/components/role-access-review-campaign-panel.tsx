"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCircle2, Download, FileCheck2, History, Loader2, Save, ShieldCheck, TriangleAlert, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RoleAccessReviewAttestationStatus, RoleAccessReviewCampaignReport, RoleAccessReviewCampaignStatus } from "@/features/projects/role-access-review-campaigns";
import type {
  RoleAccessReviewHistoryReport,
  RoleAccessReviewHistoryRowAttestationStatus,
  RoleAccessReviewHistoryRowReminderStatus,
  RoleAccessReviewHistoryStatus,
} from "@/features/projects/role-access-review-history";

type StatusLike =
  | RoleAccessReviewAttestationStatus
  | RoleAccessReviewCampaignStatus
  | RoleAccessReviewHistoryRowAttestationStatus
  | RoleAccessReviewHistoryRowReminderStatus
  | RoleAccessReviewHistoryStatus;

function statusVariant(status: StatusLike) {
  if (status === "blocked" || status === "failed" || status === "rejected" || status === "reminder-due") {
    return "destructive" as const;
  }

  return status === "needs-review" || status === "not-sent" || status === "pending" || status === "queued" || status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: StatusLike }) {
  if (status === "approved" || status === "not-needed" || status === "ready" || status === "sent") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "failed" || status === "rejected" || status === "blocked" || status === "reminder-due" ? <TriangleAlert className="size-3.5" /> : <Bell className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No timestamp";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function downloadTextFile(fileName: string, body: string, mimeType: string) {
  const blob = new Blob([body], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function SummaryTile({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function RoleAccessReviewCampaignPanel({
  canPersist,
  history,
  report,
  workspaceId,
}: {
  canPersist?: boolean;
  history?: RoleAccessReviewHistoryReport | null;
  report: RoleAccessReviewCampaignReport;
  workspaceId: string;
}) {
  const [historyReport, setHistoryReport] = useState(history ?? null);
  const [pendingAction, setPendingAction] = useState<"attestations" | "reminders" | null>(null);
  const visibleRows = report.rows.slice(0, 8);
  const historyRowByMemberId = useMemo(() => new Map((historyReport?.rows ?? []).map((row) => [row.memberId, row])), [historyReport]);

  async function postHistoryAction(kind: "attestations" | "reminders") {
    if (!canPersist || pendingAction) {
      return;
    }

    setPendingAction(kind);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/role-access-review-history/${kind}`, {
        body: JSON.stringify({
          campaign: report,
          note: kind === "attestations" ? "Workspace owner/admin attested the current role-access campaign." : undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { createdCount?: number; error?: string; history?: RoleAccessReviewHistoryReport; savedCount?: number } | null;

      if (!response.ok || !payload?.history) {
        throw new Error(payload?.error ?? "Role-access review history could not be saved.");
      }

      setHistoryReport(payload.history);
      toast.success(kind === "attestations" ? `${payload.savedCount ?? 0} attestations saved` : `${payload.createdCount ?? 0} reminders queued`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Role-access review history could not be saved.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Role-access review campaign
            </CardTitle>
            <CardDescription>Member attestations, project grants, folder grants, reminder state, and persisted review evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.worstStatus)}>
              <StatusIcon status={report.summary.worstStatus} />
              {report.summary.worstStatus}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.campaignScore}/100 campaign
            </Badge>
            {historyReport ? (
              <Badge className="gap-1 rounded-md" variant={statusVariant(historyReport.summary.status)}>
                <StatusIcon status={historyReport.summary.status} />
                {historyReport.summary.status} history
              </Badge>
            ) : null}
            <a className={buttonVariants({ className: "gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download data-icon="inline-start" />
              CSV
            </a>
            {historyReport ? (
              <Button onClick={() => downloadTextFile(`${report.workspace.id}-role-access-review-history.csv`, historyReport.csvContent, "text/csv;charset=utf-8")} size="sm" type="button" variant="outline">
                <History data-icon="inline-start" />
                History CSV
              </Button>
            ) : null}
            {canPersist ? (
              <>
                <Button disabled={Boolean(pendingAction)} onClick={() => postHistoryAction("attestations")} size="sm" type="button" variant="secondary">
                  {pendingAction === "attestations" ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
                  Save attestations
                </Button>
                <Button disabled={Boolean(pendingAction) || report.reminders.length === 0} onClick={() => postHistoryAction("reminders")} size="sm" type="button" variant="outline">
                  {pendingAction === "reminders" ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Bell data-icon="inline-start" />}
                  Queue reminders
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <SummaryTile detail={`${report.summary.reviewedCount} auto-approved`} label="Members" value={`${report.summary.memberCount}`} />
          <SummaryTile detail={`${historyReport?.summary.persistedAttestationCount ?? 0} persisted`} label="Attestations" value={`${report.summary.attestationRequiredCount}`} />
          <SummaryTile detail={`${historyReport?.summary.reminderDeliveryCount ?? 0} history rows`} label="Reminders" value={`${report.summary.reminderDueCount}`} />
          <SummaryTile detail={`${report.summary.privilegedGrantCount} admin grants`} label="Grants" value={`${report.summary.totalGrantCount}`} />
          <SummaryTile detail={report.campaignId} label="Campaign" value={historyReport ? `${historyReport.summary.historyScore}/100` : "Unsaved"} />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Reminder</TableHead>
              <TableHead>History</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => {
              const historyRow = historyRowByMemberId.get(row.memberId);

              return (
                <TableRow key={row.memberId}>
                  <TableCell className="max-w-[260px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Users2 className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{row.memberName}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.memberEmail}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={statusVariant(row.attestationStatus)}>
                      <StatusIcon status={row.attestationStatus} />
                      {row.attestationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{row.workspaceRole}</p>
                    <p className="mt-1 line-clamp-2">{row.grantEvidence}</p>
                  </TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Bell className="size-3.5" />
                      <span>{row.reminderLabel}</span>
                    </div>
                    <p className="mt-1">{row.activeSessionCount} active sessions</p>
                  </TableCell>
                  <TableCell className="max-w-[240px] whitespace-normal">
                    <div className="flex flex-wrap gap-1">
                      <Badge className="gap-1 rounded-md" variant={statusVariant(historyRow?.latestAttestationStatus ?? (row.attestationStatus === "approved" ? "approved" : "pending"))}>
                        <FileCheck2 className="size-3.5" />
                        {historyRow?.latestAttestationStatus ?? (row.attestationStatus === "approved" ? "approved" : "pending")}
                      </Badge>
                      <Badge className="gap-1 rounded-md" variant={statusVariant(historyRow?.latestReminderStatus ?? (row.attestationStatus === "reminder-due" ? "not-sent" : "not-needed"))}>
                        <Bell className="size-3.5" />
                        {historyRow?.latestReminderStatus ?? (row.attestationStatus === "reminder-due" ? "not-sent" : "not-needed")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(historyRow?.latestAttestationAt ?? historyRow?.latestReminderAt ?? null)}</p>
                  </TableCell>
                  <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{historyRow?.nextAction ?? row.nextAction}</p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {historyReport ? (
          <div className="grid gap-3 rounded-md border bg-background p-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <History className="size-4" />
                  Persisted campaign history
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {historyReport.summary.persistedAttestationCount} attestations, {historyReport.summary.reminderDeliveryCount} reminders, last reminder{" "}
                  {formatDate(historyReport.summary.latestReminderAt)}.
                </p>
              </div>
              <Badge className="max-w-full rounded-md font-mono" variant="outline">
                <span className="truncate">{historyReport.campaign.scopeHash}</span>
              </Badge>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
