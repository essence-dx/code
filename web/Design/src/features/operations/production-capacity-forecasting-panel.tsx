"use client";

import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  FileClock,
  Gauge,
  Rocket,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  ProductionCampaignCapacityForecast,
  ProductionCapacityForecastingCenter,
  ProductionCapacityForecastingStatus,
  ProductionCapacityQueueForecast,
  ProductionCapacityScenarioRecoveryPlan,
  ProductionTeamCapacityForecast,
} from "@/features/operations/production-capacity-forecasting";
import { cn } from "@/lib/utils";

type ProductionCapacityForecastingPanelProps = {
  center: ProductionCapacityForecastingCenter;
};

const statusLabels: Record<ProductionCapacityForecastingStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ProductionCapacityForecastingStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function ProductionCapacityForecastingPanel({
  center,
}: ProductionCapacityForecastingPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Production capacity forecasting
            </CardTitle>
            <CardDescription>
              Team load, campaign deadlines, export queues, publishing queues,
              and scenario recovery plans for production launches.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.scenarioRecoveryPlans.toLocaleString()} scenarios
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-9">
          <Metric label="Campaigns" value={center.totals.campaigns} />
          <Metric label="Team" value={center.totals.teamMembers} />
          <Metric label="Invites" value={center.totals.pendingInvites} />
          <Metric label="Tasks" value={center.totals.reviewTasks} />
          <Metric label="Exports" value={center.totals.exportQueueItems} />
          <Metric
            label="Publishing"
            value={center.totals.publishingQueueItems}
          />
          <Metric
            label="Blocked campaigns"
            value={center.totals.blockedCampaigns}
          />
          <Metric label="Blocked queues" value={center.totals.blockedQueues} />
          <Metric
            label="Recovery"
            value={center.totals.scenarioRecoveryPlans}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
          <PanelBlock
            title="Campaign forecasts"
            badge={`${center.campaignForecasts.length} campaigns`}
            icon={<Rocket className="h-4 w-4 text-muted-foreground" />}
          >
            {center.campaignForecasts.length ? (
              <ScrollArea className="h-[390px]">
                <div className="grid gap-2 pr-3">
                  {center.campaignForecasts.map((forecast) => (
                    <CampaignForecastCard
                      key={forecast.id}
                      forecast={forecast}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyLine>
                No active campaigns need capacity forecasting.
              </EmptyLine>
            )}
          </PanelBlock>

          <div className="space-y-4">
            <PanelBlock
              title="Queue forecasts"
              badge={`${center.queueForecasts.length} queues`}
              icon={<FileClock className="h-4 w-4 text-muted-foreground" />}
            >
              {center.queueForecasts.map((forecast) => (
                <QueueForecastCard key={forecast.id} forecast={forecast} />
              ))}
            </PanelBlock>

            <PanelBlock
              title="Team load"
              badge={`${center.teamForecasts.length} owners`}
              icon={<UsersRound className="h-4 w-4 text-muted-foreground" />}
            >
              {center.teamForecasts.length ? (
                center.teamForecasts
                  .slice(0, 7)
                  .map((forecast) => (
                    <TeamForecastRow key={forecast.id} forecast={forecast} />
                  ))
              ) : (
                <EmptyLine>
                  No active production task load is assigned.
                </EmptyLine>
              )}
            </PanelBlock>
          </div>
        </div>

        <PanelBlock
          title="Scenario recovery plans"
          badge={`${center.scenarioRecoveryPlans.length} plans`}
          icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
        >
          {center.scenarioRecoveryPlans.length ? (
            <div className="grid gap-2 xl:grid-cols-3">
              {center.scenarioRecoveryPlans.map((plan) => (
                <RecoveryPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          ) : (
            <EmptyLine>No scenario recovery plan is needed.</EmptyLine>
          )}
        </PanelBlock>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Capacity next actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p
                  key={action}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{action}</span>
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CampaignForecastCard({
  forecast,
}: {
  forecast: ProductionCampaignCapacityForecast;
}) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={forecast.status} />
            <h3 className="truncate text-sm font-semibold">
              {forecast.campaignName}
            </h3>
            <Badge variant={statusVariants[forecast.status]}>
              {forecast.score}/100
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {forecast.detail}
          </p>
        </div>
        <Badge variant="outline">{formatLaunchWindow(forecast)}</Badge>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-5">
        <MiniStat label="Remaining" value={forecast.remainingDeliverables} />
        <MiniStat
          label="Unscheduled"
          value={forecast.unscheduledDeliverables}
        />
        <MiniStat label="Approvals" value={forecast.approvalBlockers} />
        <MiniStat label="Tasks" value={forecast.openTasks} />
        <MiniStat label="Exports" value={forecast.exportQueueItems} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <PressureBlock
          label="Capacity pressure"
          percent={forecast.capacityUsedPercent}
          status={forecast.status}
        />
        <div className="rounded-md border border-border bg-background p-3">
          <p className="text-xs font-medium">Daily requirement</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {forecast.requiredDailyCapacity.toLocaleString()} of{" "}
            {forecast.availableDailyCapacity.toLocaleString()} available units.
          </p>
        </div>
      </div>
    </article>
  );
}

function QueueForecastCard({
  forecast,
}: {
  forecast: ProductionCapacityQueueForecast;
}) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={forecast.status} />
            <h3 className="truncate text-sm font-semibold">{forecast.label}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {forecast.detail}
          </p>
        </div>
        <Badge variant={statusVariants[forecast.status]}>
          {forecast.pressurePercent}%
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <MiniStat label="Active" value={forecast.activeItems} />
        <MiniStat label="Blocked" value={forecast.blockedItems} />
        <MiniStat label="Hours" value={forecast.estimatedClearHours} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {forecast.channels.slice(0, 5).map((channel) => (
          <Badge key={channel} variant="outline">
            {channel}
          </Badge>
        ))}
      </div>
      {forecast.recoverySteps[0] ? (
        <p className="mt-3 flex gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{forecast.recoverySteps[0]}</span>
        </p>
      ) : null}
    </article>
  );
}

function TeamForecastRow({
  forecast,
}: {
  forecast: ProductionTeamCapacityForecast;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={forecast.status} />
            <p className="truncate text-xs font-semibold">
              {forecast.ownerName}
            </p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {forecast.detail}
          </p>
        </div>
        <Badge variant={statusVariants[forecast.status]}>
          {forecast.pressurePercent}%
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <MiniStat label="Tasks" value={forecast.assignedTasks} />
        <MiniStat label="Overdue" value={forecast.overdueTasks} />
        <MiniStat label="Units" value={forecast.forecastUnits} />
      </div>
    </div>
  );
}

function RecoveryPlanCard({
  plan,
}: {
  plan: ProductionCapacityScenarioRecoveryPlan;
}) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={plan.status} />
            <h3 className="truncate text-sm font-semibold">{plan.title}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.steps[0] ?? "Review the recovery packet."}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <a download={plan.fileName} href={plan.dataUrl}>
            <Download className="h-4 w-4" />
            Packet
          </a>
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{plan.scenario}</Badge>
        <Badge variant="outline">
          {plan.affectedCampaignIds.length} campaigns
        </Badge>
        <Badge variant="outline">{plan.auditEvidenceIds.length} evidence</Badge>
      </div>
    </article>
  );
}

function PressureBlock({
  label,
  percent,
  status,
}: {
  label: string;
  percent: number;
  status: ProductionCapacityForecastingStatus;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium">{label}</p>
        <Badge variant={statusVariants[status]}>{percent}%</Badge>
      </div>
      <div className="mt-3 h-2 rounded-full bg-muted">
        <div
          className={cn("h-2 rounded-full", {
            "bg-emerald-600": status === "ready",
            "bg-amber-500": status === "review",
            "bg-destructive": status === "blocked",
          })}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
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
    <section className="space-y-3 rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <Badge variant="outline">{badge}</Badge>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
      {children}
    </p>
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

function StatusIcon({
  status,
}: {
  status: ProductionCapacityForecastingStatus;
}) {
  const className = "h-4 w-4 shrink-0";

  if (status === "ready") {
    return <CheckCircle2 className={`${className} text-emerald-600`} />;
  }

  if (status === "blocked") {
    return <ShieldAlert className={`${className} text-destructive`} />;
  }

  return (
    <CalendarClock
      className={cn(className, "text-amber-600 dark:text-amber-400")}
    />
  );
}

function formatLaunchWindow(forecast: ProductionCampaignCapacityForecast) {
  if (forecast.daysToLaunch === null) return "No launch date";
  if (forecast.daysToLaunch === 0) return "Launch today";
  if (forecast.daysToLaunch === 1) return "1 day";

  return `${forecast.daysToLaunch.toLocaleString()} days`;
}
