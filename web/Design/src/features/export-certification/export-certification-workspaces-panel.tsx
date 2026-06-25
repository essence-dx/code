"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Download,
  FileCheck2,
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
  ExportCertificationCenter,
  ExportCertificationCheck,
  ExportCertificationStatus,
  ExportCertificationWorkspace,
} from "@/features/export-certification/export-certification-workspaces";
import { cn } from "@/lib/utils";

type ExportCertificationWorkspacesPanelProps = {
  center: ExportCertificationCenter;
};

const statusLabels: Record<ExportCertificationStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ExportCertificationStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function ExportCertificationWorkspacesPanel({
  center,
}: ExportCertificationWorkspacesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5" />
              Export certification workspaces
            </CardTitle>
            <CardDescription>
              QA matrices, stakeholder signoff, and certification packets for
              PDF, video, email, website, and print delivery.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Artifacts" value={center.totals.artifacts} />
          <Metric label="Ready" value={center.totals.readyWorkspaces} />
          <Metric label="Blocked" value={center.totals.blockedWorkspaces} />
          <Metric label="QA checks" value={center.totals.qaChecks} />
          <Metric label="Approvals" value={center.totals.signoffApprovals} />
          <Metric label="Projects" value={center.totals.certifiedProjects} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {center.workspaces.map((workspace) => (
            <CertificationWorkspaceCard
              key={workspace.artifact}
              workspace={workspace}
            />
          ))}
        </div>

        <section className="rounded-md border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            Next certification actions
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
      </CardContent>
    </Card>
  );
}

function CertificationWorkspaceCard({
  workspace,
}: {
  workspace: ExportCertificationWorkspace;
}) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={workspace.status} />
            <h3 className="truncate text-sm font-semibold">
              {workspace.label}
            </h3>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {workspace.description}
          </p>
        </div>
        <Badge variant={statusVariants[workspace.status]}>
          {workspace.score}/100
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{workspace.projectIds.length} projects</Badge>
        <Badge variant="outline">
          {workspace.exportJobs.length + workspace.websitePublishes.length}{" "}
          artifacts
        </Badge>
        <Badge variant="outline">
          {workspace.qaMatrix.passedChecks}/{workspace.qaMatrix.checks.length}{" "}
          QA
        </Badge>
        <Badge variant="outline">
          {workspace.stakeholderSignoff.approvedProjects}/
          {workspace.stakeholderSignoff.totalProjects} approved
        </Badge>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          <SectionHeader icon={<ClipboardCheck className="h-3.5 w-3.5" />}>
            QA matrix
          </SectionHeader>
          {workspace.qaMatrix.checks.slice(0, 4).map((check) => (
            <QaCheckRow key={check.id} check={check} />
          ))}
        </div>

        <div className="space-y-2">
          <SectionHeader icon={<UsersRound className="h-3.5 w-3.5" />}>
            Stakeholder signoff
          </SectionHeader>
          <div className="rounded-md border border-border bg-background p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium">
                {workspace.stakeholderSignoff.summary}
              </p>
              <Badge
                variant={statusVariants[workspace.stakeholderSignoff.status]}
              >
                {workspace.stakeholderSignoff.score}/100
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline">
                {workspace.stakeholderSignoff.openTasks} open
              </Badge>
              <Badge variant="outline">
                {workspace.stakeholderSignoff.overdueTasks} overdue
              </Badge>
              <Badge variant="outline">
                {workspace.stakeholderSignoff.approvalEvents.length} events
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 flex gap-2 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{workspace.nextAction}</span>
      </p>

      <Button asChild size="sm" variant="outline" className="mt-3">
        <a
          href={createCertificationPacketHref(workspace)}
          download={`${workspace.artifact}-certification-packet.json`}
        >
          <Download className="h-3.5 w-3.5" />
          Certification packet
        </a>
      </Button>
    </section>
  );
}

function QaCheckRow({ check }: { check: ExportCertificationCheck }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium">{check.label}</p>
        <Badge variant={statusVariants[check.status]}>{check.score}/100</Badge>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {check.detail}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileCheck2 className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function SectionHeader({
  children,
  icon,
}: {
  children: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold">
      {icon}
      {children}
    </div>
  );
}

function StatusIcon({ status }: { status: ExportCertificationStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}

function createCertificationPacketHref(
  workspace: ExportCertificationWorkspace,
) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(
    workspace.certificationPacket.downloadJson,
  )}`;
}
