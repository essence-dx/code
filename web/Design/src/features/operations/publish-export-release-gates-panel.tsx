"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  FileCheck2,
  GitPullRequestArrow,
  ShieldAlert,
  UploadCloud,
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
  PublishExportApprovalEvidence,
  PublishExportOverrideRequest,
  PublishExportReleaseGate,
  PublishExportReleaseGateCenter,
  PublishExportReleaseGateItem,
  PublishExportReleaseStatus,
} from "@/features/operations/publish-export-release-gates";
import { cn } from "@/lib/utils";

type ServerAction = (formData: FormData) => Promise<void> | void;

type PublishExportReleaseGatesPanelProps = {
  center: PublishExportReleaseGateCenter;
  requestOverrideAction: ServerAction;
};

const statusLabels: Record<PublishExportReleaseStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  PublishExportReleaseStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function PublishExportReleaseGatesPanel({
  center,
  requestOverrideAction,
}: PublishExportReleaseGatesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5" />
              Publish and export release gates
            </CardTitle>
            <CardDescription>
              Policy decisions, export artifacts, publishing readiness, override
              requests, and approval evidence in one release packet.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.policyExceptions.toLocaleString()} exceptions
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                href={center.releasePacket.dataUrl}
                download={center.releasePacket.fileName}
              >
                <Download className="h-4 w-4" />
                Packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Gates" value={center.totals.gates} />
          <Metric label="Blocked" value={center.totals.blockedGates} />
          <Metric label="Exports" value={center.totals.completedExports} />
          <Metric label="Failed" value={center.totals.failedExports} />
          <Metric label="Published" value={center.totals.publishedSurfaces} />
          <Metric label="Approvals" value={center.totals.auditableApprovals} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {center.gates.map((gate) => (
            <GateCard key={gate.id} gate={gate} />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <PanelBlock
            title="Override requests"
            badge={`${center.overrideRequests.length} requests`}
          >
            {center.overrideRequests.length ? (
              center.overrideRequests
                .slice(0, 6)
                .map((request) => (
                  <OverrideRequestCard
                    key={request.id}
                    request={request}
                    requestOverrideAction={requestOverrideAction}
                  />
                ))
            ) : (
              <EmptyLine>No release overrides are needed.</EmptyLine>
            )}
          </PanelBlock>

          <PanelBlock
            title="Approval evidence"
            badge={`${center.approvalEvidence.length} records`}
          >
            {center.approvalEvidence.length ? (
              center.approvalEvidence
                .slice(0, 6)
                .map((evidence) => (
                  <ApprovalEvidenceCard key={evidence.id} evidence={evidence} />
                ))
            ) : (
              <EmptyLine>
                No release candidate approval records found.
              </EmptyLine>
            )}
          </PanelBlock>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <GitPullRequestArrow className="h-4 w-4 text-muted-foreground" />
              Release gate actions
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

function GateCard({ gate }: { gate: PublishExportReleaseGate }) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <StatusIcon status={gate.status} />
            <span className="truncate">{gate.title}</span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {gate.description}
          </p>
        </div>
        <Badge variant={statusVariants[gate.status]}>{gate.score}/100</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">
          {gate.metricValue} {gate.metricLabel}
        </Badge>
        <Badge variant={statusVariants[gate.status]}>
          {statusLabels[gate.status]}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {gate.items.slice(0, 3).map((item) => (
          <GateItem key={`${gate.id}-${item.id}`} item={item} />
        ))}
      </div>
    </section>
  );
}

function GateItem({ item }: { item: PublishExportReleaseGateItem }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <StatusIcon status={item.status} />
            <span className="truncate">{item.title}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {item.detail}
          </p>
        </div>
        <Badge variant={statusVariants[item.status]} className="shrink-0">
          {item.badge}
        </Badge>
      </div>
      {item.meta.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.meta.slice(0, 3).map((meta) => (
            <Badge key={meta} variant="outline">
              {meta}
            </Badge>
          ))}
        </div>
      ) : null}
      {item.href ? (
        <Button asChild size="sm" variant="ghost" className="mt-2 px-0">
          <a href={item.href}>
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function OverrideRequestCard({
  request,
  requestOverrideAction,
}: {
  request: PublishExportOverrideRequest;
  requestOverrideAction: ServerAction;
}) {
  const status =
    request.status === "approved"
      ? "ready"
      : request.status === "requested"
        ? "review"
        : request.severity;

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={status} />
            <p className="truncate text-sm font-medium">{request.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{request.detail}</p>
        </div>
        <Badge variant={statusVariants[status]}>{request.status}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline">{request.sourcePolicyDomain}</Badge>
        <Badge variant="outline">{request.affectedItemKind}</Badge>
        <Badge variant="outline">{request.auditLogIds.length} audit logs</Badge>
      </div>
      {request.status === "needed" ? (
        <form action={requestOverrideAction} className="mt-3">
          <input
            type="hidden"
            name="targetType"
            value={request.form.targetType}
          />
          <input type="hidden" name="targetId" value={request.form.targetId} />
          <input type="hidden" name="gateId" value={request.form.gateId} />
          <input
            type="hidden"
            name="policyDomain"
            value={request.form.policyDomain}
          />
          <input type="hidden" name="summary" value={request.form.summary} />
          <Button size="sm" variant="outline">
            <GitPullRequestArrow className="h-4 w-4" />
            Request override
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function ApprovalEvidenceCard({
  evidence,
}: {
  evidence: PublishExportApprovalEvidence;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={evidence.status} />
            <p className="truncate text-sm font-medium">{evidence.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {evidence.summary}
          </p>
        </div>
        <Badge variant={statusVariants[evidence.status]}>
          {evidence.auditLogId ? "Audited" : "Missing"}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {evidence.meta.map((item) => (
          <Badge key={item} variant="outline">
            {item}
          </Badge>
        ))}
      </div>
      {evidence.href ? (
        <Button asChild size="sm" variant="ghost" className="mt-2 px-0">
          <a href={evidence.href}>
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function PanelBlock({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="outline">{badge}</Badge>
      </div>
      <div className="mt-3 grid gap-2">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileCheck2 className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function StatusIcon({ status }: { status: PublishExportReleaseStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}
