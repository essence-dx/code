"use client";

import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Download,
  Gauge,
  Network,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

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
  EnterpriseCampaignCapacityPlan,
  EnterpriseContentDependencyHeatmapCell,
  EnterpriseContentOperationsCalendarCenter,
  EnterpriseContentOperationsStatus,
  EnterpriseContentRecoveryPlaybook,
  EnterpriseContentStaffingSignal,
} from "@/features/content-planner/enterprise-content-operations-calendar";
import { cn } from "@/lib/utils";

type EnterpriseContentOperationsCalendarPanelProps = {
  center: EnterpriseContentOperationsCalendarCenter;
};

const statusLabels: Record<EnterpriseContentOperationsStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  EnterpriseContentOperationsStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

const blockerLabels = {
  approval: "Approval",
  schedule: "Schedule",
  tasks: "Tasks",
  capacity: "Capacity",
};

export function EnterpriseContentOperationsCalendarPanel({
  center,
}: EnterpriseContentOperationsCalendarPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Enterprise content operations calendar
            </CardTitle>
            <CardDescription>
              Campaign capacity planning, publishing dependency heatmaps,
              staffing signals, and recovery playbooks for production content
              launches.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.publicationGaps.toLocaleString()} gaps
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-9">
          <Metric label="Campaigns" value={center.totals.campaigns} />
          <Metric label="Deliverables" value={center.totals.deliverables} />
          <Metric label="Scheduled" value={center.totals.scheduledItems} />
          <Metric label="Gaps" value={center.totals.publicationGaps} />
          <Metric label="Capacity" value={center.totals.capacityPlans} />
          <Metric
            label="Heatmap"
            value={center.totals.dependencyHeatmapCells}
          />
          <Metric label="Staffing" value={center.totals.staffingSignals} />
          <Metric label="Playbooks" value={center.totals.recoveryPlaybooks} />
          <Metric label="Blocked" value={center.totals.blockedCampaigns} />
        </div>

        {center.capacityPlans.length ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="space-y-3">
              {center.capacityPlans.slice(0, 6).map((plan) => (
                <CapacityPlanCard key={plan.id} plan={plan} />
              ))}
            </section>

            <section className="space-y-3">
              <PanelBlock
                badge={`${center.dependencyHeatmap.length} cells`}
                icon={<Network className="h-4 w-4 text-muted-foreground" />}
                title="Dependency heatmap"
              >
                {center.dependencyHeatmap.length ? (
                  center.dependencyHeatmap
                    .slice(0, 8)
                    .map((cell) => <HeatmapCellRow cell={cell} key={cell.id} />)
                ) : (
                  <EmptyLine>
                    No publishing dependency gaps are active.
                  </EmptyLine>
                )}
              </PanelBlock>

              <PanelBlock
                badge={`${center.staffingSignals.length} signals`}
                icon={<UsersRound className="h-4 w-4 text-muted-foreground" />}
                title="Staffing signals"
              >
                {center.staffingSignals.length ? (
                  center.staffingSignals
                    .slice(0, 8)
                    .map((signal) => (
                      <StaffingSignalRow key={signal.id} signal={signal} />
                    ))
                ) : (
                  <EmptyLine>Content staffing is balanced.</EmptyLine>
                )}
              </PanelBlock>

              <PanelBlock
                badge={`${center.recoveryPlaybooks.length} playbooks`}
                icon={<Download className="h-4 w-4 text-muted-foreground" />}
                title="Recovery playbooks"
              >
                {center.recoveryPlaybooks.length ? (
                  center.recoveryPlaybooks
                    .slice(0, 6)
                    .map((playbook) => (
                      <RecoveryPlaybookRow
                        key={playbook.id}
                        playbook={playbook}
                      />
                    ))
                ) : (
                  <EmptyLine>No recovery playbook is needed.</EmptyLine>
                )}
              </PanelBlock>

              {center.nextActions.length ? (
                <PanelBlock
                  badge={`${center.nextActions.length} actions`}
                  icon={
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  }
                  title="Operations next actions"
                >
                  {center.nextActions.map((action) => (
                    <p
                      className="flex gap-2 text-xs text-muted-foreground"
                      key={action}
                    >
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{action}</span>
                    </p>
                  ))}
                </PanelBlock>
              ) : null}
            </section>
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            No active campaign boards are ready for enterprise content
            operations planning yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CapacityPlanCard({ plan }: { plan: EnterpriseCampaignCapacityPlan }) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={plan.status} />
            <h3 className="truncate text-sm font-semibold">
              {plan.campaignName}
            </h3>
            <Badge variant={statusVariants[plan.status]}>
              {plan.score}/100
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{plan.detail}</p>
        </div>
        <Badge variant="outline">{formatLaunchWindow(plan)}</Badge>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <MiniStat label="Deliverables" value={plan.deliverables} />
        <MiniStat label="Scheduled" value={plan.scheduledDeliverables} />
        <MiniStat label="Gaps" value={plan.unscheduledDeliverables} />
        <MiniStat label="Team" value={plan.availableTeamMembers} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <PanelBlock
          badge={`${plan.capacityUsedPercent}% used`}
          icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
          title="Capacity pressure"
        >
          <p className="text-xs text-muted-foreground">
            Needs {plan.requiredDailyThroughput.toLocaleString()} deliverable
            {plan.requiredDailyThroughput === 1 ? "" : "s"} per day before
            launch.
          </p>
        </PanelBlock>
        <PanelBlock
          badge={`${plan.unscheduledDeliverables} gaps`}
          icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
          title="Publishing coverage"
        >
          <p className="text-xs text-muted-foreground">
            {plan.scheduledDeliverables.toLocaleString()} of{" "}
            {plan.deliverables.toLocaleString()} deliverables are connected to
            the content planner.
          </p>
        </PanelBlock>
      </div>
    </article>
  );
}

function HeatmapCellRow({
  cell,
}: {
  cell: EnterpriseContentDependencyHeatmapCell;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={cell.status} />
            <p className="truncate text-xs font-semibold">
              {cell.campaignName} / {cell.channel}
            </p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {cell.detail}
          </p>
        </div>
        <Badge variant={statusVariants[cell.status]}>
          {statusLabels[cell.status]}
        </Badge>
      </div>
      {cell.blockers.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cell.blockers.map((blocker) => (
            <Badge key={blocker} variant="outline">
              {blockerLabels[blocker]}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StaffingSignalRow({
  signal,
}: {
  signal: EnterpriseContentStaffingSignal;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={signal.status} />
            <p className="truncate text-xs font-semibold">{signal.ownerName}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {signal.detail}
          </p>
        </div>
        <Badge variant={statusVariants[signal.status]}>
          {signal.workloadScore}/100
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <MiniStat label="Tasks" value={signal.assignedTasks} />
        <MiniStat label="Overdue" value={signal.overdueTasks} />
        <MiniStat label="Campaigns" value={signal.campaignIds.length} />
      </div>
    </div>
  );
}

function RecoveryPlaybookRow({
  playbook,
}: {
  playbook: EnterpriseContentRecoveryPlaybook;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={playbook.status} />
            <p className="truncate text-xs font-semibold">
              {playbook.campaignName}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {playbook.steps[0] ?? "Review the campaign recovery packet."}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <a download={playbook.fileName} href={playbook.dataUrl}>
            <Download className="h-4 w-4" />
            Packet
          </a>
        </Button>
      </div>
    </div>
  );
}

function PanelBlock({
  badge,
  children,
  icon,
  title,
}: {
  badge: string;
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <Badge variant="outline">{badge}</Badge>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function StatusIcon({ status }: { status: EnterpriseContentOperationsStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }

  if (status === "blocked") {
    return <ShieldAlert className="h-4 w-4 text-destructive" />;
  }

  return (
    <CircleAlert
      className={cn("h-4 w-4", "text-amber-600 dark:text-amber-400")}
    />
  );
}

function formatLaunchWindow(plan: EnterpriseCampaignCapacityPlan) {
  if (plan.daysToLaunch === null) return "No launch date";
  if (plan.daysToLaunch === 0) return "Launch today";
  if (plan.daysToLaunch === 1) return "1 day";

  return `${plan.daysToLaunch.toLocaleString()} days`;
}
