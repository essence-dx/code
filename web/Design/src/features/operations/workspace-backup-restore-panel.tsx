"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  FileJson,
  RotateCcw,
  ShieldAlert,
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
import type {
  WorkspaceBackupIntegrityCheck,
  WorkspaceBackupRestoreCenter,
  WorkspaceBackupRestoreStatus,
  WorkspaceRestoreProjectDryRun,
  WorkspaceRollbackPlaybook,
} from "@/features/operations/workspace-backup-restore";
import { cn } from "@/lib/utils";

type WorkspaceBackupRestorePanelProps = {
  center: WorkspaceBackupRestoreCenter;
};

const statusLabels: Record<WorkspaceBackupRestoreStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  WorkspaceBackupRestoreStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function WorkspaceBackupRestorePanel({
  center,
}: WorkspaceBackupRestorePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Workspace backup and restore
            </CardTitle>
            <CardDescription>
              Export manifest, integrity checks, dry-run restore report, and
              rollback playbooks for production workspace recovery.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                href={center.manifestDownload.href}
                download={center.manifestDownload.fileName}
              >
                <Download className="h-4 w-4" />
                Manifest
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Projects" value={center.totals.activeProjects} />
          <Metric label="Snapshots" value={center.totals.projectSnapshots} />
          <Metric label="Exports" value={center.totals.completedExports} />
          <Metric label="Restorable" value={center.totals.restorableProjects} />
          <Metric label="Blocked checks" value={center.totals.blockedChecks} />
          <Metric label="Playbooks" value={center.totals.rollbackPlaybooks} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Integrity checks</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Snapshot, export, website, campaign, asset, and audit
                  coverage.
                </p>
              </div>
              <ReadinessIcon status={center.status} />
            </div>
            <div className="mt-3 grid gap-2">
              {center.integrityChecks.map((check) => (
                <IntegrityCheckRow key={check.id} check={check} />
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Dry-run restore</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Restore order and blockers before touching production records.
                </p>
              </div>
              <Badge variant={statusVariants[center.dryRun.status]}>
                {center.dryRun.score}/100
              </Badge>
            </div>
            <div className="mt-3 grid gap-2">
              {center.dryRun.projects.slice(0, 4).map((project) => (
                <DryRunProjectRow key={project.projectId} project={project} />
              ))}
            </div>
            <div className="mt-3 grid gap-2 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground sm:grid-cols-3">
              <span>{center.dryRun.summary.restorableTemplates} templates</span>
              <span>{center.dryRun.summary.restorableWebsites} websites</span>
              <span>{center.dryRun.summary.restorableCampaigns} campaigns</span>
            </div>
          </section>
        </div>

        <section className="rounded-md border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            Rollback playbooks
          </div>
          <div className="mt-3 grid gap-2 xl:grid-cols-2">
            {center.rollbackPlaybooks.map((playbook) => (
              <RollbackPlaybookRow key={playbook.id} playbook={playbook} />
            ))}
          </div>
        </section>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Recovery next actions
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

function IntegrityCheckRow({
  check,
}: {
  check: WorkspaceBackupIntegrityCheck;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{check.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {check.detail}
          </p>
        </div>
        <Badge variant={statusVariants[check.status]} className="shrink-0">
          {check.affectedCount}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline">{check.scope}</Badge>
        <Badge variant={statusVariants[check.status]}>
          {statusLabels[check.status]}
        </Badge>
      </div>
    </div>
  );
}

function DryRunProjectRow({
  project,
}: {
  project: WorkspaceRestoreProjectDryRun;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {project.restoreOrder}. {project.name}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {project.reason}
          </p>
        </div>
        <Badge variant={statusVariants[project.status]} className="shrink-0">
          {statusLabels[project.status]}
        </Badge>
      </div>
    </div>
  );
}

function RollbackPlaybookRow({
  playbook,
}: {
  playbook: WorkspaceRollbackPlaybook;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{playbook.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {playbook.detail}
          </p>
        </div>
        <Badge variant={statusVariants[playbook.status]} className="shrink-0">
          {playbook.targets}
        </Badge>
      </div>
      <div className="mt-2 grid gap-1">
        {playbook.steps.slice(0, 2).map((step) => (
          <p key={step} className="flex gap-1.5 text-xs text-muted-foreground">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{step}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileJson className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function ReadinessIcon({ status }: { status: WorkspaceBackupRestoreStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}
