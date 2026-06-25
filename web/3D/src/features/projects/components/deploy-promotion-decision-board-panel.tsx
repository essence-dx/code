import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, Clock3, ExternalLink, Gauge, Radar, Rocket, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DeployPromotionDecision, DeployPromotionDecisionBoard, DeployPromotionSignal, DeployPromotionSignalSource, DeployPromotionSignalStatus } from "@/features/projects/deploy-promotion-decision-board";
import type { WorkspaceReleaseRunbookRecord } from "@/features/workspaces/release-runbook";
import type { WorkspaceReleaseCalendarMilestone } from "@/features/workspaces/workspace-release-calendar";

function decisionVariant(decision: DeployPromotionDecision) {
  if (decision === "blocked") {
    return "destructive" as const;
  }

  return decision === "ready" ? "default" : "secondary";
}

function signalVariant(status: DeployPromotionSignalStatus) {
  if (status === "blocked" || status === "missing") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function signalIcon(status: DeployPromotionSignalStatus) {
  if (status === "clear") {
    return <CheckCircle2 className="size-3.5" />;
  }

  if (status === "watch") {
    return <Clock3 className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
}

function sourceLabel(source: DeployPromotionSignalSource) {
  switch (source) {
    case "post-deploy":
      return "Post-deploy";
    case "release-calendar":
      return "Release calendar";
    case "risk":
      return "Risk";
    case "runbook":
      return "Runbook";
  }
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function SignalRow({ signal }: { signal: DeployPromotionSignal }) {
  return (
    <TableRow>
      <TableCell className="max-w-[430px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{signalIcon(signal.status)}</span>
          <div className="min-w-0">
            <p className="font-medium">{signal.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{signal.detail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant="outline">
          {sourceLabel(signal.source)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={signalVariant(signal.status)}>
          {signalIcon(signal.status)}
          {signal.status}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">{signal.value}</TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">{signal.actionLabel}</TableCell>
    </TableRow>
  );
}

function MilestoneRow({ milestone }: { milestone: WorkspaceReleaseCalendarMilestone }) {
  return (
    <TableRow>
      <TableCell className="max-w-[380px] whitespace-normal">
        <p className="font-medium">{milestone.title}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{milestone.detail}</p>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={signalVariant(milestone.status === "blocked" ? "blocked" : milestone.status === "due" ? "watch" : "clear")}>
          {milestone.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDateTime(milestone.dueAt)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{milestone.actionLabel}</TableCell>
    </TableRow>
  );
}

function RunbookRecordRow({ record }: { record: WorkspaceReleaseRunbookRecord }) {
  return (
    <TableRow>
      <TableCell className="max-w-[380px] whitespace-normal">
        <p className="font-medium">{record.title}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{record.checklistEvidence[0] ?? record.detail}</p>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={signalVariant(record.status === "blocked" ? "blocked" : record.status === "complete" ? "clear" : "watch")}>
          {record.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{record.ownerName}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDateTime(record.completedAt ?? record.dueAt)}</TableCell>
    </TableRow>
  );
}

export function DeployPromotionDecisionBoardPanel({ report }: { report: DeployPromotionDecisionBoard }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="size-4" />
              Deploy promotion board
            </CardTitle>
            <CardDescription>Promotion decision from risk score, post-deploy smoke history, release milestones, and runbook completion.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={decisionVariant(report.decision)}>
              {report.decision === "ready" ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
              {report.decisionLabel}
            </Badge>
            <Badge className="gap-1 rounded-md" variant="outline">
              <Gauge className="size-3.5" />
              {report.promotionScore}/100
            </Badge>
            <Badge className="rounded-md" variant={report.blockerCount > 0 ? "destructive" : "outline"}>
              {report.blockerCount} blockers
            </Badge>
            <Link className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href="/projects/release-operations">
              Release Ops
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile icon={<Gauge className="size-4" />} label="Risk score" value={`${report.summary.riskScore}/100`} detail={report.nextAction.title} />
          <SummaryTile
            icon={<Radar className="size-4" />}
            label="Post-deploy smoke"
            value={`${report.summary.postDeployPassStreak} pass streak`}
            detail={`${report.summary.postDeployHistoryCount} reports`}
          />
          <SummaryTile
            icon={<Rocket className="size-4" />}
            label="Milestones"
            value={`${report.summary.calendarBlockedCount} blocked`}
            detail={`${report.summary.calendarDueCount} due, next ${formatDateTime(report.summary.calendarNextMilestoneAt)}`}
          />
          <SummaryTile
            icon={<CheckCircle2 className="size-4" />}
            label="Runbook"
            value={`${report.runbookCompletionPercent}% complete`}
            detail={`${report.summary.runbookCompleteCount}/${report.summary.runbookTotalCount} records`}
          />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.nextAction.actionLabel}</p>
          <p className="mt-2 text-xs text-muted-foreground">{report.nextAction.detail}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Signal</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.signals.map((signal) => <SignalRow key={signal.id} signal={signal} />)}</TableBody>
        </Table>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="grid gap-3">
            <div>
              <p className="text-sm font-medium">Milestone focus</p>
              <p className="text-xs text-muted-foreground">Open release calendar items ordered by blocker and due state.</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.milestoneFocus.length > 0 ? (
                  report.milestoneFocus.map((milestone) => <MilestoneRow key={milestone.id} milestone={milestone} />)
                ) : (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={4}>
                      No open release milestones.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3">
            <div>
              <p className="text-sm font-medium">Runbook focus</p>
              <p className="text-xs text-muted-foreground">Execution records still needed before promotion.</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.runbookFocus.length > 0 ? (
                  report.runbookFocus.map((record) => <RunbookRecordRow key={record.sourceKey} record={record} />)
                ) : (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={4}>
                      No open runbook records.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {report.smokeIssueRows.length > 0 ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-destructive">
              <TriangleAlert className="size-4" />
              Post-deploy failures
            </p>
            <div className="mt-2 grid gap-2">
              {report.smokeIssueRows.slice(0, 4).map((check) => (
                <div className="grid gap-1 text-xs text-destructive/90 sm:grid-cols-[1fr_auto]" key={check.key}>
                  <span className="truncate">{check.label}</span>
                  <span>{check.httpStatus ?? "no response"}</span>
                  <span className="line-clamp-2 text-destructive/80 sm:col-span-2">{check.issues.join(" ")}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SummaryTile({ detail, icon, label, value }: { detail: string; icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-xl font-semibold">{value}</p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{icon}</span>
      </div>
      <p className="mt-2 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
