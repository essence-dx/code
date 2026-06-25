"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  FileWarning,
  GitCompareArrows,
  PackageCheck,
  Route,
  ShieldAlert,
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
  DesignSystemBreakingChangePreview,
  DesignSystemComponentAdoptionGate,
  DesignSystemDownstreamImpactPacket,
  DesignSystemReleaseGovernanceCenter,
  DesignSystemReleaseGovernanceStatus,
  DesignSystemTokenMigrationPlan,
} from "@/features/design-system/design-system-release-governance";
import { cn } from "@/lib/utils";

type DesignSystemReleaseGovernancePanelProps = {
  center: DesignSystemReleaseGovernanceCenter;
};

const statusLabels: Record<DesignSystemReleaseGovernanceStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  DesignSystemReleaseGovernanceStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function DesignSystemReleaseGovernancePanel({
  center,
}: DesignSystemReleaseGovernancePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5" />
              Design system release governance
            </CardTitle>
            <CardDescription>
              Token migration plans, component adoption gates, breaking-change
              previews, and downstream impact packets before stable rollout.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.affectedProjects.toLocaleString()} affected
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Plans" value={center.totals.tokenMigrationPlans} />
          <Metric label="Gates" value={center.totals.componentAdoptionGates} />
          <Metric
            label="Previews"
            value={center.totals.breakingChangePreviews}
          />
          <Metric
            label="Packets"
            value={center.totals.downstreamImpactPackets}
          />
          <Metric label="Affected" value={center.totals.affectedProjects} />
          <Metric label="Public" value={center.totals.publicSurfaces} />
          <Metric label="Blocked" value={center.totals.blockedGates} />
          <Metric label="Ready" value={center.totals.readyGates} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="space-y-4">
            <PanelBlock
              badge={`${center.componentAdoptionGates.length} gates`}
              icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
              title="Component adoption gates"
            >
              {center.componentAdoptionGates.length ? (
                center.componentAdoptionGates
                  .slice(0, 6)
                  .map((gate) => <GateCard gate={gate} key={gate.id} />)
              ) : (
                <EmptyLine>
                  Define design-system components before release governance.
                </EmptyLine>
              )}
            </PanelBlock>

            <PanelBlock
              badge={`${center.breakingChangePreviews.length} previews`}
              icon={
                <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
              }
              title="Breaking-change previews"
            >
              {center.breakingChangePreviews.length ? (
                center.breakingChangePreviews
                  .slice(0, 6)
                  .map((preview) => (
                    <PreviewRow key={preview.id} preview={preview} />
                  ))
              ) : (
                <EmptyLine>
                  No release-blocking change preview is active.
                </EmptyLine>
              )}
            </PanelBlock>
          </section>

          <section className="space-y-4">
            <PanelBlock
              badge={`${center.tokenMigrationPlans.length} plans`}
              icon={<Route className="h-4 w-4 text-muted-foreground" />}
              title="Token migration plans"
            >
              {center.tokenMigrationPlans.length ? (
                center.tokenMigrationPlans.map((plan) => (
                  <MigrationPlanRow key={plan.id} plan={plan} />
                ))
              ) : (
                <EmptyLine>Token migrations are clear for release.</EmptyLine>
              )}
            </PanelBlock>

            <PanelBlock
              badge={`${center.downstreamImpactPackets.length} packets`}
              icon={<Download className="h-4 w-4 text-muted-foreground" />}
              title="Downstream impact packets"
            >
              {center.downstreamImpactPackets.length ? (
                center.downstreamImpactPackets
                  .slice(0, 6)
                  .map((packet) => (
                    <PacketRow key={packet.id} packet={packet} />
                  ))
              ) : (
                <EmptyLine>No downstream impact packet is needed.</EmptyLine>
              )}
            </PanelBlock>

            {center.nextActions.length ? (
              <PanelBlock
                badge={`${center.nextActions.length} actions`}
                icon={<ArrowRight className="h-4 w-4 text-muted-foreground" />}
                title="Release next actions"
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

function GateCard({ gate }: { gate: DesignSystemComponentAdoptionGate }) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={gate.status} />
            <h3 className="truncate text-sm font-semibold">
              {gate.componentName}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {gate.nextAction}
          </p>
        </div>
        <Badge variant={statusVariants[gate.status]}>{gate.score}/100</Badge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <MiniStat label="Projects" value={gate.affectedProjectIds.length} />
        <MiniStat label="Public" value={gate.publicSurfaces} />
        <MiniStat label="Checks" value={gate.gateResults.length} />
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {gate.gateResults.slice(0, 6).map((result) => (
          <div
            className="rounded-md border border-border bg-background p-2"
            key={result.id}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">{result.label}</p>
              <StatusIcon status={result.status} />
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {result.detail}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function MigrationPlanRow({ plan }: { plan: DesignSystemTokenMigrationPlan }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{plan.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{plan.steps[0]}</p>
        </div>
        <Badge variant={statusVariants[plan.status]}>
          {plan.readinessScore}/100
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{plan.tokenKind}</Badge>
        <Badge variant="outline">
          {plan.affectedProjectIds.length} projects
        </Badge>
        <Badge variant="outline">{plan.blockerCount} blockers</Badge>
      </div>
    </div>
  );
}

function PreviewRow({
  preview,
}: {
  preview: DesignSystemBreakingChangePreview;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <FileWarning className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{preview.componentName}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{preview.detail}</p>
        </div>
        <Badge variant={statusVariants[preview.status]}>
          {preview.changes.length}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {preview.changes.slice(0, 4).map((change) => (
          <Badge key={change.id} variant={statusVariants[change.status]}>
            {humanize(change.kind)}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function PacketRow({ packet }: { packet: DesignSystemDownstreamImpactPacket }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{packet.componentName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {packet.affectedProjectIds.length} projects /{" "}
            {packet.publicSurfaces} public surfaces / {packet.restorePoints}{" "}
            restore points
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <a download={packet.fileName} href={packet.dataUrl}>
            <Download className="h-4 w-4" />
            Packet
          </a>
        </Button>
      </div>
    </div>
  );
}

function PanelBlock({
  title,
  badge,
  icon,
  children,
}: {
  title: string;
  badge?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
      </div>
      <div className="mt-3 grid gap-2">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function StatusIcon({
  status,
}: {
  status: DesignSystemReleaseGovernanceStatus;
}) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <ShieldAlert className={className} />;

  return <CircleAlert className={className} />;
}

function humanize(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
