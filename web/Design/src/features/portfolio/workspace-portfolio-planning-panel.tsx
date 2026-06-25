"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleAlert,
  GitBranch,
  ShieldAlert,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  WorkspacePortfolioDependencyMap,
  WorkspacePortfolioGoal,
  WorkspacePortfolioOutcomeTrack,
  WorkspacePortfolioOwnerLane,
  WorkspacePortfolioPlanningCenter,
  WorkspacePortfolioPlanningStatus,
} from "@/features/portfolio/workspace-portfolio-planning";
import { cn } from "@/lib/utils";

type WorkspacePortfolioPlanningPanelProps = {
  center: WorkspacePortfolioPlanningCenter;
};

const statusLabels: Record<WorkspacePortfolioPlanningStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  WorkspacePortfolioPlanningStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function WorkspacePortfolioPlanningPanel({
  center,
}: WorkspacePortfolioPlanningPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5" />
              Workspace portfolio planning
            </CardTitle>
            <CardDescription>
              Goals, owners, health scoring, dependency maps, and
              campaign/project outcome tracking for the production portfolio.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.blockedGoals.toLocaleString()} blocked
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-10">
          <Metric label="Goals" value={center.totals.goals} />
          <Metric label="Owners" value={center.totals.ownerLanes} />
          <Metric label="Maps" value={center.totals.dependencyMaps} />
          <Metric label="Outcomes" value={center.totals.outcomeTracks} />
          <Metric label="Blocked" value={center.totals.blockedGoals} />
          <Metric label="Review" value={center.totals.reviewGoals} />
          <Metric label="Campaigns" value={center.totals.activeCampaigns} />
          <Metric label="Projects" value={center.totals.activeProjects} />
          <Metric label="Risks" value={center.totals.dependencyRisks} />
          <Metric label="Overdue" value={center.totals.overdueTasks} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="space-y-3">
            {center.goals.length ? (
              center.goals
                .slice(0, 8)
                .map((goal) => <GoalCard goal={goal} key={goal.id} />)
            ) : (
              <EmptyLine>
                Create campaigns or projects to build a portfolio.
              </EmptyLine>
            )}
          </section>

          <section className="space-y-3">
            <PanelBlock
              badge={`${center.ownerLanes.length} lanes`}
              icon={<UsersRound className="h-4 w-4 text-muted-foreground" />}
              title="Owner lanes"
            >
              {center.ownerLanes.length ? (
                center.ownerLanes
                  .slice(0, 8)
                  .map((lane) => <OwnerLaneRow key={lane.id} lane={lane} />)
              ) : (
                <EmptyLine>No portfolio owner lane is active.</EmptyLine>
              )}
            </PanelBlock>

            <PanelBlock
              badge={`${center.dependencyMaps.length} maps`}
              icon={<GitBranch className="h-4 w-4 text-muted-foreground" />}
              title="Dependency maps"
            >
              {center.dependencyMaps.length ? (
                center.dependencyMaps
                  .slice(0, 8)
                  .map((map) => <DependencyMapRow key={map.id} map={map} />)
              ) : (
                <EmptyLine>No portfolio dependencies are mapped.</EmptyLine>
              )}
            </PanelBlock>

            <PanelBlock
              badge={`${center.outcomeTracks.length} tracks`}
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
              title="Outcome tracking"
            >
              {center.outcomeTracks.length ? (
                center.outcomeTracks
                  .slice(0, 8)
                  .map((track) => (
                    <OutcomeTrackRow key={track.id} track={track} />
                  ))
              ) : (
                <EmptyLine>No portfolio outcome track is active.</EmptyLine>
              )}
            </PanelBlock>

            {center.nextActions.length ? (
              <PanelBlock
                badge={`${center.nextActions.length} actions`}
                icon={<ArrowRight className="h-4 w-4 text-muted-foreground" />}
                title="Portfolio next actions"
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
      </CardContent>
    </Card>
  );
}

function GoalCard({ goal }: { goal: WorkspacePortfolioGoal }) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={goal.status} />
            <h3 className="truncate text-sm font-semibold">{goal.title}</h3>
            <Badge variant="outline">{goal.kind}</Badge>
          </div>
          <p className="mt-1 text-xs font-medium">{goal.objective}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {goal.detail}
          </p>
        </div>
        <Badge variant={statusVariants[goal.status]}>
          {goal.healthScore}/100
        </Badge>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <MiniStat label="Projects" value={goal.metrics.projects} />
        <MiniStat label="Approved" value={goal.metrics.approvedDeliverables} />
        <MiniStat
          label="Scheduled"
          value={goal.metrics.scheduledDeliverables}
        />
        <MiniStat label="Risks" value={goal.metrics.dependencyRisks} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline">Owner: {goal.ownerName}</Badge>
        {goal.targetAt ? (
          <Badge variant="outline">Target: {formatDate(goal.targetAt)}</Badge>
        ) : null}
      </div>
    </article>
  );
}

function OwnerLaneRow({ lane }: { lane: WorkspacePortfolioOwnerLane }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={lane.status} />
            <p className="truncate text-xs font-semibold">{lane.ownerName}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {lane.detail}
          </p>
        </div>
        <Badge variant={statusVariants[lane.status]}>{lane.score}/100</Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <MiniStat label="Goals" value={lane.goalIds.length} />
        <MiniStat label="Tasks" value={lane.openTasks} />
        <MiniStat label="Overdue" value={lane.overdueTasks} />
      </div>
    </div>
  );
}

function DependencyMapRow({ map }: { map: WorkspacePortfolioDependencyMap }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={map.status} />
            <p className="truncate text-xs font-semibold">{map.title}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {map.dependencySummary}
          </p>
        </div>
        <Badge variant={statusVariants[map.status]}>
          {map.riskCount} risks
        </Badge>
      </div>
      {map.blockedRiskTitles.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {map.blockedRiskTitles.slice(0, 3).map((risk) => (
            <Badge key={risk} variant="outline">
              {risk}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OutcomeTrackRow({ track }: { track: WorkspacePortfolioOutcomeTrack }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={track.status} />
            <p className="truncate text-xs font-semibold">{track.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {track.actualLabel} / {track.targetLabel}
          </p>
        </div>
        <Badge variant={statusVariants[track.status]}>
          {track.progressPercent}%
        </Badge>
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

function StatusIcon({ status }: { status: WorkspacePortfolioPlanningStatus }) {
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}
