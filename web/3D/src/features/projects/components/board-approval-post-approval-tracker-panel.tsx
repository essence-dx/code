"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BellRing, CalendarClock, CheckCircle2, Download, History, ListChecks, Loader2, MailCheck, NotebookTabs, Rocket, Save, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BoardApprovalPostApprovalActionHistoryReport, BoardApprovalPostApprovalActionRecord } from "@/features/projects/board-approval-post-approval-history";
import type { BoardApprovalPostApprovalPromotionReport } from "@/features/projects/board-approval-post-approval-promotion";
import type {
  BoardApprovalPostApprovalAction,
  BoardApprovalPostApprovalActionStatus,
  BoardApprovalPostApprovalTrackerReport,
} from "@/features/projects/board-approval-post-approval-tracker";
import type { BoardApprovalSlaReminderNotification, BoardApprovalSlaReminderReport, BoardApprovalSlaReminderSeverity } from "@/features/projects/board-approval-sla-reminders";
import type { WorkspaceNotificationEmailDeliveryReport } from "@/features/workspaces/notification-email-delivery";

function statusVariant(status: BoardApprovalPostApprovalActionStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function severityVariant(severity: BoardApprovalSlaReminderSeverity) {
  if (severity === "critical") {
    return "destructive" as const;
  }

  return severity === "warning" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardApprovalPostApprovalActionStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "watch" ? <CalendarClock className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
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

function ActionRow({ action }: { action: BoardApprovalPostApprovalAction }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ListChecks className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{action.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{action.action}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(action.status)}>
          <StatusIcon status={action.status} />
          {action.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p className="font-medium">{action.ownerName}</p>
        <p className="truncate text-xs text-muted-foreground">{action.ownerEmail ?? "No email"}</p>
      </TableCell>
      <TableCell className="text-sm">{formatDate(action.dueAt)}</TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-1">{action.runbookSourceKey}</p>
        <p className="line-clamp-1">{action.calendarSourceKey}</p>
      </TableCell>
    </TableRow>
  );
}

function HistoryRow({ record }: { record: BoardApprovalPostApprovalActionRecord }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <p className="font-medium">{record.title}</p>
        <p className="line-clamp-1 font-mono text-xs text-muted-foreground">{record.sourceKey}</p>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(record.status)}>
          <StatusIcon status={record.status} />
          {record.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{record.refreshCount} refreshes</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p className="font-medium">{record.updatedBy.name ?? "Unknown actor"}</p>
        <p className="truncate text-xs text-muted-foreground">{record.updatedBy.email ?? "No email snapshot"}</p>
      </TableCell>
      <TableCell className="text-sm">{formatDate(record.updatedAt)}</TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{record.action}</p>
      </TableCell>
    </TableRow>
  );
}

function SlaReminderRow({ reminder }: { reminder: BoardApprovalSlaReminderNotification }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <BellRing className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{reminder.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{reminder.message}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={severityVariant(reminder.severity)}>
          {reminder.severity}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{reminder.slaStatus}</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p className="font-medium">{reminder.ownerName}</p>
        <p className="truncate text-xs text-muted-foreground">{reminder.ownerEmail ?? "No email"}</p>
      </TableCell>
      <TableCell className="text-sm">{formatDate(reminder.dueAt)}</TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-1">{reminder.sourceKey}</p>
        <p className="line-clamp-1">{reminder.actionLabel}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardApprovalPostApprovalTrackerPanel({
  canPersist,
  emailDelivery,
  history,
  report,
  slaReminders,
  workspaceId,
}: {
  canPersist?: boolean;
  emailDelivery?: WorkspaceNotificationEmailDeliveryReport | null;
  history?: BoardApprovalPostApprovalActionHistoryReport | null;
  report: BoardApprovalPostApprovalTrackerReport;
  slaReminders?: BoardApprovalSlaReminderReport | null;
  workspaceId?: string;
}) {
  const [actionHistory, setActionHistory] = useState(history ?? null);
  const [promotion, setPromotion] = useState<BoardApprovalPostApprovalPromotionReport | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function saveActions() {
    if (!canPersist || !workspaceId || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/board-post-approval-actions`, {
        body: JSON.stringify({ tracker: report }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; history?: BoardApprovalPostApprovalActionHistoryReport } | null;

      if (!response.ok || !payload?.history) {
        throw new Error(payload?.error ?? "Board post-approval actions could not be saved.");
      }

      setActionHistory(payload.history);
      toast.success("Board post-approval actions saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Board post-approval actions could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function promoteActions() {
    if (!canPersist || !workspaceId || isPromoting || report.actions.length === 0) {
      return;
    }

    setIsPromoting(true);

    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/board-post-approval-actions/promote`, {
        body: JSON.stringify({ tracker: report }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; promotion?: BoardApprovalPostApprovalPromotionReport } | null;

      if (!response.ok || !payload?.promotion) {
        throw new Error(payload?.error ?? "Board post-approval actions could not be promoted.");
      }

      setPromotion(payload.promotion);
      toast.success(
        `Promoted ${payload.promotion.summary.runbookRecordCount} runbook row${payload.promotion.summary.runbookRecordCount === 1 ? "" : "s"} and ${payload.promotion.summary.calendarMilestoneCount} calendar milestone${payload.promotion.summary.calendarMilestoneCount === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Board post-approval actions could not be promoted.");
    } finally {
      setIsPromoting(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <NotebookTabs className="size-4" />
              Post-approval action tracker
            </CardTitle>
            <CardDescription>Converts board sign-off gaps into release runbook records and release calendar milestones.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.runbookRecordCount} runbook rows
            </Badge>
            {slaReminders ? (
              <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={slaReminders.csvFileName} href={slaReminders.csvDataUri}>
                <BellRing className="size-4" />
                SLA CSV
              </a>
            ) : null}
            {actionHistory ? (
              <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={actionHistory.csvFileName} href={actionHistory.csvDataUri}>
                <History className="size-4" />
                History CSV
              </a>
            ) : null}
            {promotion ? (
              <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={promotion.csvFileName} href={promotion.csvDataUri}>
                <Rocket className="size-4" />
                Promotion CSV
              </a>
            ) : null}
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            {canPersist && workspaceId ? (
              <>
                <Button className="h-8 gap-2" disabled={isPromoting || report.actions.length === 0} onClick={promoteActions} size="sm" type="button" variant="default">
                  {isPromoting ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                  Promote
                </Button>
                <Button className="h-8 gap-2" disabled={isSaving} onClick={saveActions} size="sm" type="button" variant="outline">
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save actions
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="board gaps" label="Actions" value={`${report.summary.totalActionCount}`} />
          <SummaryTile detail="must close first" label="Blocked" value={`${report.summary.blockedActionCount}`} />
          <SummaryTile detail="needs attention" label="Watch" value={`${report.summary.watchActionCount}`} />
          <SummaryTile detail="generated records" label="Runbook" value={`${report.summary.runbookRecordCount}`} />
          <SummaryTile detail="generated milestones" label="Calendar" value={`${report.summary.calendarMilestoneCount}`} />
          <SummaryTile detail="already linked records" label="Existing" value={`${report.summary.existingRunbookRecordCount + report.summary.existingCalendarMilestoneCount}`} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryTile detail="saved source keys" label="Saved actions" value={`${actionHistory?.summary.totalCount ?? 0}`} />
          <SummaryTile detail="deduplicated by source" label="Unique keys" value={`${actionHistory?.summary.dedupedSourceKeyCount ?? 0}`} />
          <SummaryTile detail="audited refreshes" label="Refreshes" value={`${actionHistory?.summary.refreshCount ?? 0}`} />
        </div>
        {promotion ? (
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryTile detail="saved to release runbook" label="Promoted runbook" value={`${promotion.summary.runbookRecordCount}`} />
            <SummaryTile detail="saved to release calendar" label="Promoted calendar" value={`${promotion.summary.calendarMilestoneCount}`} />
            <SummaryTile detail="deduplicated source keys" label="Promotion keys" value={`${promotion.summary.uniqueSourceKeyCount}`} />
          </div>
        ) : null}
        {slaReminders ? (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <SummaryTile detail="visible reminder rows" label="SLA reminders" value={`${slaReminders.summary.totalCount}`} />
            <SummaryTile detail="past due" label="Overdue" value={`${slaReminders.summary.overdueCount}`} />
            <SummaryTile detail="inside reminder window" label="Due soon" value={`${slaReminders.summary.dueSoonCount}`} />
            <SummaryTile detail="highest severity" label="SLA state" value={slaReminders.summary.status} />
            <SummaryTile detail="owner emails present" label="Email candidates" value={`${slaReminders.summary.emailCandidateCount}`} />
            <SummaryTile detail="Brevo-ready queued rows" label="Email jobs" value={`${emailDelivery?.jobs.filter((job) => job.source === "board-approval-sla").length ?? 0}`} />
          </div>
        ) : null}

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Tracker next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{slaReminders?.summary.nextAction ?? promotion?.summary.nextAction ?? report.summary.nextAction}</p>
        </div>

        {slaReminders ? (
          <div className="grid gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                <MailCheck className="size-4" />
                Board SLA reminders
              </p>
              <p className="mt-1 text-sm text-muted-foreground">In-app reminder rows stay visible for unresolved board sign-off gaps and can feed the existing Brevo email delivery queue.</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reminder</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slaReminders.notifications.length > 0 ? (
                  slaReminders.notifications.slice(0, 6).map((reminder) => <SlaReminderRow key={reminder.id} reminder={reminder} />)
                ) : (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={5}>
                      No board SLA reminders are active.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Generated keys</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.actions.length > 0 ? (
              report.actions.map((action) => <ActionRow action={action} key={action.id} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No post-approval sign-off gaps need runbook or calendar follow-up.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="grid gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <History className="size-4" />
              Saved action history
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Persisted rows are deduplicated by source key and keep actor snapshots plus refresh audit entries.</p>
          </div>
          {actionHistory ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Saved action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Next action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionHistory.records.length > 0 ? (
                  actionHistory.records.slice(0, 6).map((record) => <HistoryRow key={record.id} record={record} />)
                ) : (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={5}>
                      No board post-approval actions are saved yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-md border bg-background p-3">
              <p className="text-sm font-medium">No saved action history</p>
              <p className="mt-1 text-sm text-muted-foreground">Save the tracker after board review to start a deduplicated action audit trail.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
