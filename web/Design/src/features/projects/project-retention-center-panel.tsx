"use client";

import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  CircleAlert,
  Download,
  FileWarning,
  Gavel,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import {
  restoreDesignAction,
  setProjectLegalHoldAction,
} from "@/app/designs/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ProjectArchiveCandidate,
  ProjectDeletionPacket,
  ProjectLegalHold,
  ProjectRestorePreview,
  ProjectRetentionCenter,
  ProjectRetentionStatus,
} from "@/features/projects/project-retention-center";
import { cn } from "@/lib/utils";

type ProjectRetentionCenterPanelProps = {
  center: ProjectRetentionCenter;
};

const statusLabels: Record<ProjectRetentionStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ProjectRetentionStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function ProjectRetentionCenterPanel({
  center,
}: ProjectRetentionCenterPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Project retention and legal hold
            </CardTitle>
            <CardDescription>
              Archive candidates, restore previews, legal holds, and
              compliance-safe permanent deletion packets.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-7">
          <Metric label="Projects" value={center.totals.projects} />
          <Metric label="Active" value={center.totals.activeProjects} />
          <Metric label="Trashed" value={center.totals.trashedProjects} />
          <Metric label="Archive" value={center.totals.archiveCandidates} />
          <Metric label="Holds" value={center.totals.legalHolds} />
          <Metric label="Restore" value={center.totals.restorePreviews} />
          <Metric
            label="Blocked"
            value={center.totals.blockedDeletionPackets}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <ArchiveCandidates candidates={center.archiveCandidates} />
            <RestorePreviews previews={center.restorePreviews} />
          </section>
          <section className="space-y-4">
            <LegalHolds holds={center.legalHolds} />
            <DeletionPackets packets={center.deletionPackets} />
          </section>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CircleAlert className="h-4 w-4 text-muted-foreground" />
              Next retention actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p key={action} className="text-xs text-muted-foreground">
                  {action}
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ArchiveCandidates({
  candidates,
}: {
  candidates: ProjectArchiveCandidate[];
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Archive review</h3>
        <Badge variant="outline">{candidates.length} candidates</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {candidates.length ? (
          candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {candidate.projectName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {candidate.reason}
                  </p>
                </div>
                <Badge variant="outline">
                  {candidate.inactiveDays.toLocaleString()}d
                </Badge>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <Metric
                  label="Exports"
                  value={candidate.completedExportCount}
                  compact
                />
                <Metric
                  label="Restore point"
                  value={candidate.latestVersionId ? "Yes" : "No"}
                  compact
                />
                <Metric
                  label="Updated"
                  value={formatDate(candidate.lastUpdatedAt)}
                  compact
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {candidate.recommendedAction}
              </p>
              <LegalHoldForm
                className="mt-3"
                projectId={candidate.projectId}
                mode="enable"
              />
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            No active projects are past the archive review window.
          </p>
        )}
      </div>
    </section>
  );
}

function RestorePreviews({ previews }: { previews: ProjectRestorePreview[] }) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Restore previews</h3>
        <Badge variant="outline">{previews.length} previews</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {previews.length ? (
          previews.map((preview) => (
            <div
              key={preview.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ReadinessIcon
                      status={preview.legalHold ? "blocked" : "review"}
                    />
                    <p className="truncate text-sm font-medium">
                      {preview.projectName}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {preview.summary}
                  </p>
                </div>
                <Badge variant={preview.legalHold ? "destructive" : "outline"}>
                  {preview.legalHold ? "Legal hold" : "Restorable"}
                </Badge>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <Metric
                  label="Since trash"
                  value={`${preview.daysSinceDeleted}d`}
                  compact
                />
                <Metric
                  label="Retention"
                  value={`${preview.daysUntilRetentionExpires}d`}
                  compact
                />
                <Metric
                  label="Surfaces"
                  value={preview.publicSurfaceCount}
                  compact
                />
                <Metric
                  label="Tasks"
                  value={preview.openReviewTaskCount}
                  compact
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={restoreDesignAction}>
                  <input
                    type="hidden"
                    name="projectId"
                    value={preview.projectId}
                  />
                  <Button type="submit" size="sm">
                    <ArchiveRestore className="h-4 w-4" />
                    Restore
                  </Button>
                </form>
                {preview.legalHold ? (
                  <LegalHoldForm
                    projectId={preview.projectId}
                    mode="release"
                    hold={preview.legalHold}
                  />
                ) : (
                  <LegalHoldForm projectId={preview.projectId} mode="enable" />
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            No trashed projects need restore preview review.
          </p>
        )}
      </div>
    </section>
  );
}

function LegalHolds({ holds }: { holds: ProjectLegalHold[] }) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Legal holds</h3>
        <Badge variant={holds.length ? "destructive" : "secondary"}>
          {holds.length} active
        </Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {holds.length ? (
          holds.map((hold) => (
            <div
              key={hold.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {hold.projectName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hold.reason}
                  </p>
                </div>
                <Badge variant="destructive">{hold.caseId ?? "Hold"}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">
                  {hold.ownerEmail ?? "Workspace"}
                </Badge>
                <Badge variant="outline">{formatDate(hold.enabledAt)}</Badge>
              </div>
              <LegalHoldForm
                className="mt-3"
                projectId={hold.projectId}
                mode="release"
                hold={hold}
              />
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            No active legal holds are blocking project retention work.
          </p>
        )}
      </div>
    </section>
  );
}

function DeletionPackets({ packets }: { packets: ProjectDeletionPacket[] }) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Deletion packets</h3>
        <Badge variant="outline">{packets.length} packets</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {packets.length ? (
          packets.map((packet) => (
            <div
              key={packet.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ReadinessIcon status={packet.status} />
                    <p className="truncate text-sm font-medium">
                      {packet.projectName}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Retention expires {formatDate(packet.retentionExpiresAt)}.
                  </p>
                </div>
                <Badge variant={statusVariants[packet.status]}>
                  {statusLabels[packet.status]}
                </Badge>
              </div>
              {packet.reasons.length ? (
                <div className="mt-2 grid gap-1">
                  {packet.reasons.slice(0, 3).map((reason) => (
                    <p key={reason} className="text-xs text-muted-foreground">
                      {reason}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  This packet is ready for a final human deletion review.
                </p>
              )}
              <Button asChild size="sm" variant="outline" className="mt-3">
                <a
                  href={packet.download.href}
                  download={packet.download.fileName}
                >
                  <Download className="h-4 w-4" />
                  Packet
                </a>
              </Button>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            Move a project to trash before deletion packets are generated.
          </p>
        )}
      </div>
    </section>
  );
}

function LegalHoldForm({
  projectId,
  mode,
  hold,
  className,
}: {
  projectId: string;
  mode: "enable" | "release";
  hold?: ProjectLegalHold;
  className?: string;
}) {
  const isRelease = mode === "release";

  return (
    <form
      action={setProjectLegalHoldAction}
      className={cn("grid gap-2 sm:grid-cols-[1fr_1fr_auto]", className)}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="mode" value={mode} />
      {isRelease ? (
        <input type="hidden" name="caseId" value={hold?.caseId ?? ""} />
      ) : null}
      <div className="space-y-1">
        <Label htmlFor={`${projectId}-${mode}-case`} className="text-xs">
          Case
        </Label>
        <Input
          id={`${projectId}-${mode}-case`}
          name="caseId"
          defaultValue={hold?.caseId ?? ""}
          placeholder="CASE-001"
          disabled={isRelease}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${projectId}-${mode}-reason`} className="text-xs">
          {isRelease ? "Release note" : "Reason"}
        </Label>
        <Input
          id={`${projectId}-${mode}-reason`}
          name="reason"
          placeholder={isRelease ? "Resolved" : "Legal review"}
        />
        <input type="hidden" name="ownerEmail" value={hold?.ownerEmail ?? ""} />
      </div>
      <Button
        type="submit"
        size="sm"
        variant={isRelease ? "outline" : "secondary"}
        className="self-end"
      >
        <Gavel className="h-4 w-4" />
        {isRelease ? "Release" : "Hold"}
      </Button>
    </form>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileWarning className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={cn("mt-1 font-semibold", compact ? "text-sm" : "text-lg")}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function ReadinessIcon({ status }: { status: ProjectRetentionStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <ShieldAlert className={className} />;

  return <Trash2 className={className} />;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
