"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  FileWarning,
  RotateCcw,
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
import type {
  ImportRepairEvidencePacket,
  ImportRepairOperation,
  ImportRepairOperationsCenter,
  ImportRepairStatus,
} from "@/features/import-repair/import-repair-operations";
import { cn } from "@/lib/utils";

type ImportRepairOperationsPanelProps = {
  center: ImportRepairOperationsCenter;
};

const statusLabels: Record<ImportRepairStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ImportRepairStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function ImportRepairOperationsPanel({
  center,
}: ImportRepairOperationsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5" />
              Import repair operations
            </CardTitle>
            <CardDescription>
              Mapping diffs, retry strategies, and conversion evidence packets
              for production import workflows.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Formats" value={center.totals.formats} />
          <Metric label="Ready" value={center.totals.readyFormats} />
          <Metric label="Blocked" value={center.totals.blockedFormats} />
          <Metric label="Diffs" value={center.totals.mappingDiffs} />
          <Metric label="Packets" value={center.totals.evidencePackets} />
          <Metric label="Projects" value={center.totals.projectsWithEvidence} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {center.operations.map((operation) => (
            <ImportRepairOperationCard
              key={operation.format}
              operation={operation}
            />
          ))}
        </div>

        <section className="rounded-md border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            Next repair actions
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

function ImportRepairOperationCard({
  operation,
}: {
  operation: ImportRepairOperation;
}) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={operation.status} />
            <h3 className="truncate text-sm font-semibold">
              {operation.label}
            </h3>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {operation.capabilitySummary[0]}
          </p>
        </div>
        <Badge variant={statusVariants[operation.status]}>
          {operation.score}/100
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {operation.sourceLimits.map((limit) => (
          <Badge key={limit} variant="outline">
            {limit}
          </Badge>
        ))}
        <Badge variant="outline">
          {operation.evidenceProjects.length} evidence projects
        </Badge>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          <SectionLabel icon={<Wrench className="h-3.5 w-3.5" />}>
            Mapping diffs
          </SectionLabel>
          {operation.mappingDiffs.slice(0, 3).map((diff) => (
            <div
              key={diff.id}
              className="rounded-md border border-border bg-background p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium">{diff.source}</p>
                <Badge variant={severityVariant(diff.severity)}>
                  {diff.severity}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {diff.repair}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <SectionLabel icon={<RotateCcw className="h-3.5 w-3.5" />}>
            Retry plan
          </SectionLabel>
          <div className="rounded-md border border-border bg-background p-2">
            <p className="text-xs font-medium">
              {operation.retryStrategy.title}
            </p>
            <ol className="mt-2 space-y-1">
              {operation.retryStrategy.steps.slice(0, 3).map((step) => (
                <li
                  key={step}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {operation.evidenceProjects.length ? (
          operation.evidenceProjects.slice(0, 3).map((project) => (
            <a
              key={project.projectId}
              href={project.href}
              className="rounded-md border border-border bg-background p-2 text-xs transition hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{project.projectName}</span>
                <Badge variant={statusVariants[project.status]}>
                  {project.readinessScore}/100
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5 text-muted-foreground">
                <span>{project.pageCount} pages</span>
                <span>{project.hasVersion ? "Snapshot" : "No snapshot"}</span>
                <span>{project.auditLogCount} audit events</span>
              </div>
            </a>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
            No workspace conversion evidence is linked to this format yet.
          </p>
        )}
      </div>

      <Button asChild size="sm" variant="outline" className="mt-3">
        <a
          href={createEvidencePacketHref(operation.evidencePacket)}
          download={`${operation.format}-conversion-evidence.json`}
        >
          <Download className="h-3.5 w-3.5" />
          Evidence packet
        </a>
      </Button>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileWarning className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function SectionLabel({
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

function StatusIcon({ status }: { status: ImportRepairStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}

function severityVariant(
  severity: ImportRepairOperation["mappingDiffs"][number]["severity"],
): "secondary" | "outline" | "destructive" {
  if (severity === "blocked") return "destructive";
  if (severity === "review") return "outline";

  return "secondary";
}

function createEvidencePacketHref(packet: ImportRepairEvidencePacket) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(packet.downloadJson)}`;
}
