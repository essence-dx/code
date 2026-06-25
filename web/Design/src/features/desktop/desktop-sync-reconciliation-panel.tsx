"use client";

import {
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileWarning,
  GitCompareArrows,
  History,
  RefreshCcw,
  ShieldAlert,
  Wrench,
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
import { formatAssetBytes } from "@/features/assets/asset-library-audit";
import type {
  DesktopSyncAuditTrailItem,
  DesktopSyncConflictDiff,
  DesktopSyncRecoveryChoice,
  DesktopSyncReconciliationCenter,
  DesktopSyncReconciliationStatus,
  DesktopSyncStaleAssetRepair,
} from "@/features/desktop/desktop-sync-reconciliation";

type DesktopSyncReconciliationPanelProps = {
  center: DesktopSyncReconciliationCenter;
};

const statusLabels: Record<DesktopSyncReconciliationStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  DesktopSyncReconciliationStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function DesktopSyncReconciliationPanel({
  center,
}: DesktopSyncReconciliationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5" />
              Desktop sync reconciliation
            </CardTitle>
            <CardDescription>
              Conflict diffs, local/cloud recovery choices, stale asset repair,
              audit evidence, and a downloadable reconciliation packet.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a href={center.packet.dataUrl} download={center.packet.fileName}>
                <Download className="h-4 w-4" />
                Packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Projects" value={center.totals.activeProjects} />
          <Metric label="Diffs" value={center.totals.conflictDiffs} />
          <Metric label="Choices" value={center.totals.recoveryChoices} />
          <Metric
            label="Asset repairs"
            value={center.totals.staleAssetRepairs}
          />
          <Metric label="Failed exports" value={center.totals.failedExports} />
          <Metric label="No versions" value={center.totals.missingVersions} />
          <Metric label="No exports" value={center.totals.missingExports} />
          <Metric label="Audits" value={center.totals.auditTrail} />
        </div>

        <PanelBlock
          title="Local/cloud conflict diffs"
          badge={`${center.conflictDiffs.length} diffs`}
          icon={<GitCompareArrows className="h-4 w-4 text-muted-foreground" />}
        >
          {center.conflictDiffs.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {center.conflictDiffs.map((diff) => (
                <ConflictDiffCard key={diff.id} diff={diff} />
              ))}
            </div>
          ) : (
            <EmptyLine>No desktop/cloud conflict diffs are pending.</EmptyLine>
          )}
        </PanelBlock>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <PanelBlock
            title="Recovery choices"
            badge={`${center.recoveryChoices.length} choices`}
            icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
          >
            {center.recoveryChoices.length ? (
              <div className="grid gap-2">
                {center.recoveryChoices.map((choice) => (
                  <RecoveryChoiceRow key={choice.id} choice={choice} />
                ))}
              </div>
            ) : (
              <EmptyLine>Local and cloud recovery choices are clear.</EmptyLine>
            )}
          </PanelBlock>

          <PanelBlock
            title="Stale asset repair"
            badge={`${center.staleAssetRepairs.length} repairs`}
            icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
          >
            {center.staleAssetRepairs.length ? (
              <ScrollArea className="h-[330px]">
                <div className="grid gap-2 pr-3">
                  {center.staleAssetRepairs.map((repair) => (
                    <AssetRepairRow key={repair.id} repair={repair} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyLine>Project asset manifests are current.</EmptyLine>
            )}
          </PanelBlock>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <PanelBlock
            title="Sync audit trail"
            badge={`${center.auditTrail.length} events`}
            icon={<History className="h-4 w-4 text-muted-foreground" />}
          >
            {center.auditTrail.length ? (
              <ScrollArea className="h-[260px]">
                <div className="grid gap-2 pr-3">
                  {center.auditTrail.map((item) => (
                    <AuditTrailRow key={item.id} item={item} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyLine>
                No reconciliation audit events are available.
              </EmptyLine>
            )}
          </PanelBlock>

          <PanelBlock
            title="Next actions"
            badge={`${center.nextActions.length} actions`}
            icon={<ArrowRight className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-2">
              {center.nextActions.map((action) => (
                <p
                  key={action}
                  className="flex gap-2 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground"
                >
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{action}</span>
                </p>
              ))}
            </div>
          </PanelBlock>
        </div>
      </CardContent>
    </Card>
  );
}

function ConflictDiffCard({ diff }: { diff: DesktopSyncConflictDiff }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={diff.status} />
            <p className="truncate text-sm font-medium">{diff.projectName}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {diff.diffSummary}
          </p>
        </div>
        <Badge variant={statusVariants[diff.status]}>
          {statusLabels[diff.status]}
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
        <SignalBlock label="Local" value={diff.localSignal} />
        <SignalBlock label="Cloud" value={diff.cloudSignal} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{diff.recommendedChoice}</Badge>
        <Badge variant="outline">{formatPanelTime(diff.updatedAt)}</Badge>
        <Button asChild size="sm" variant="outline">
          <a href={diff.href}>
            <ExternalLink className="h-4 w-4" />
            Open
          </a>
        </Button>
      </div>
    </div>
  );
}

function RecoveryChoiceRow({ choice }: { choice: DesktopSyncRecoveryChoice }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {choice.kind === "retry-export" ? (
              <RefreshCcw className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            )}
            <p className="truncate text-sm font-medium">{choice.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{choice.detail}</p>
        </div>
        <Badge variant={statusVariants[choice.status]}>
          {choice.riskLevel}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{choice.kind}</Badge>
        <Badge variant="outline">{choice.projectIds.length} projects</Badge>
        <Badge variant={statusVariants[choice.status]}>
          {choice.commandLabel}
        </Badge>
      </div>
      {choice.evidence.length ? (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          {choice.evidence[0]}
        </p>
      ) : null}
    </div>
  );
}

function AssetRepairRow({ repair }: { repair: DesktopSyncStaleAssetRepair }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <p className="truncate text-sm font-medium">{repair.projectName}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {repair.detail}
          </p>
        </div>
        <Badge variant={statusVariants[repair.status]}>
          {statusLabels[repair.status]}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{formatAssetBytes(repair.assetBytes)}</Badge>
        <Badge variant="outline">{repair.referenceCount} refs</Badge>
        <Badge variant="outline">{repair.skippedReferences} skipped</Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {repair.repairAction}
      </p>
    </div>
  );
}

function AuditTrailRow({ item }: { item: DesktopSyncAuditTrailItem }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.summary}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.relevance}</p>
        </div>
        <Badge variant="outline">{item.action}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline">{item.targetType}</Badge>
        <Badge variant="outline">{formatPanelTime(item.createdAt)}</Badge>
        {item.actorEmail ? (
          <Badge variant="outline">{item.actorEmail}</Badge>
        ) : null}
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
  badge: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </div>
        <Badge variant="outline">{badge}</Badge>
      </div>
      {children}
    </section>
  );
}

function SignalBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <p className="font-medium text-foreground">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function StatusIcon({ status }: { status: DesktopSyncReconciliationStatus }) {
  if (status === "ready") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "review") return <FileWarning className="h-4 w-4" />;

  return <ShieldAlert className="h-4 w-4" />;
}

function formatPanelTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Now";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
