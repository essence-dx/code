"use client";

import { type FormEvent, type ReactNode, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCopy,
  Download,
  ExternalLink,
  FileJson2,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { createAdminReleaseApprovalSnapshot } from "@/features/admin/actions";
import type { DeployEnvironmentPreflightReport } from "@/features/admin/deploy-environment-preflight";
import type { AdminOperationalIncidentReport } from "@/features/admin/admin-operational-incidents";
import type {
  AdminReleaseApprovalDefaults,
  AdminReleaseApprovalSnapshot,
  AdminReleaseApprovalSnapshotStatus,
} from "@/features/admin/admin-release-approval-snapshots";
import {
  getAdminReleaseApprovalSnapshotsCsv,
  getAdminReleaseApprovalSnapshotsJson,
  getAdminReleaseApprovalSnapshotsMarkdown,
} from "@/features/admin/admin-release-approval-snapshots-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminReleaseApprovalSnapshotsPanelProps = {
  defaults: AdminReleaseApprovalDefaults;
  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;
  operationalIncidentReview: AdminOperationalIncidentReport;
  snapshots: AdminReleaseApprovalSnapshot[];
};

export function AdminReleaseApprovalSnapshotsPanel({
  defaults,
  deployEnvironmentPreflight,
  operationalIncidentReview,
  snapshots,
}: AdminReleaseApprovalSnapshotsPanelProps) {
  const router = useRouter();
  const [releaseLabel, setReleaseLabel] = useState("");
  const [commitSha, setCommitSha] = useState(defaults.commitSha);
  const [deploymentUrl, setDeploymentUrl] = useState(defaults.deploymentUrl);
  const [smokeArtifactsText, setSmokeArtifactsText] = useState("");
  const [rollbackNotes, setRollbackNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const latestSnapshot = snapshots[0];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await createAdminReleaseApprovalSnapshot({
          releaseLabel,
          commitSha,
          deploymentUrl,
          smokeArtifactsText,
          rollbackNotes,
          preflightStatus: deployEnvironmentPreflight.status,
          preflightScore: deployEnvironmentPreflight.score,
          incidentStatus: operationalIncidentReview.status,
          incidentScore: operationalIncidentReview.score,
        });

        setMessage(`Release approval snapshot saved: ${result.snapshotId}`);
        setSmokeArtifactsText("");
        setRollbackNotes("");
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Release approval snapshot failed.",
        );
      }
    });
  }

  function exportJson() {
    downloadTextFile({
      content: getAdminReleaseApprovalSnapshotsJson(snapshots),
      filename: "release-approval-snapshots.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminReleaseApprovalSnapshotsCsv(snapshots),
      filename: "release-approval-snapshots.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminReleaseApprovalSnapshotsMarkdown(snapshots),
      filename: "release-approval-snapshots.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminReleaseApprovalSnapshotsMarkdown(snapshots),
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="size-4" />
                Release approval
              </CardTitle>
              <CardDescription>
                Durable approval evidence for production deploy decisions.
              </CardDescription>
            </div>
            <Badge variant={latestSnapshot ? "secondary" : "outline"}>
              {snapshots.length} snapshots
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field id="release-label" label="Release label">
                <Input
                  id="release-label"
                  value={releaseLabel}
                  onChange={(event) => setReleaseLabel(event.target.value)}
                  placeholder="Production release"
                />
              </Field>
              <Field id="release-commit" label="Commit">
                <Input
                  id="release-commit"
                  value={commitSha}
                  onChange={(event) => setCommitSha(event.target.value)}
                  placeholder="git commit sha"
                  required
                />
              </Field>
            </div>
            <Field id="release-deployment-url" label="Deployment URL">
              <Input
                id="release-deployment-url"
                value={deploymentUrl}
                onChange={(event) => setDeploymentUrl(event.target.value)}
                placeholder="https://..."
                required
              />
            </Field>
            <Field id="release-smoke-artifacts" label="Smoke artifacts">
              <Textarea
                id="release-smoke-artifacts"
                value={smokeArtifactsText}
                onChange={(event) => setSmokeArtifactsText(event.target.value)}
                placeholder="One report path or URL per line"
                required
              />
            </Field>
            <Field id="release-rollback-notes" label="Rollback notes">
              <Textarea
                id="release-rollback-notes"
                value={rollbackNotes}
                onChange={(event) => setRollbackNotes(event.target.value)}
                placeholder="Rollback command, previous deployment, and recovery owner"
                required
              />
            </Field>

            <div className="grid gap-2 text-xs md:grid-cols-2">
              <StatusMetric
                label="Deploy preflight"
                status={deployEnvironmentPreflight.status}
                score={deployEnvironmentPreflight.score}
              />
              <StatusMetric
                label="Incident review"
                status={operationalIncidentReview.status}
                score={operationalIncidentReview.score}
              />
            </div>

            {message ? (
              <Alert>
                <ShieldCheck className="size-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" disabled={isPending}>
              <ShieldCheck className="size-4" />
              {isPending ? "Saving snapshot..." : "Save approval snapshot"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Approval history</CardTitle>
            <CardDescription>
              Reviewer, commit, deployment, smoke evidence, and rollback notes.
            </CardDescription>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Button type="button" size="sm" variant="outline" onClick={exportJson}>
              <FileJson2 className="size-3.5" />
              JSON
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
              <Download className="size-3.5" />
              CSV
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={exportMarkdown}
            >
              <Download className="size-3.5" />
              MD
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copyMarkdown}
            >
              <ClipboardCopy className="size-3.5" />
              Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              No release approval snapshots have been recorded.
            </div>
          ) : (
            <div className="grid gap-2">
              {snapshots.slice(0, 6).map((snapshot) => (
                <SnapshotRow key={snapshot.id} snapshot={snapshot} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function StatusMetric({
  label,
  status,
  score,
}: {
  label: string;
  status: AdminReleaseApprovalSnapshotStatus;
  score: number;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <Badge variant={getStatusVariant(status)}>{status}</Badge>
        <span className="font-mono text-sm">{score}</span>
      </div>
    </div>
  );
}

function SnapshotRow({ snapshot }: { snapshot: AdminReleaseApprovalSnapshot }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{snapshot.releaseLabel}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {snapshot.reviewerEmail} at {formatDate(snapshot.createdAt)}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant={getStatusVariant(snapshot.preflightStatus)}>
            preflight {snapshot.preflightScore}
          </Badge>
          <Badge variant={getStatusVariant(snapshot.incidentStatus)}>
            incidents {snapshot.incidentScore}
          </Badge>
        </div>
      </div>
      <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
        <div className="truncate font-mono text-muted-foreground">
          {snapshot.commitSha}
        </div>
        <Button
          asChild
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 justify-start px-1.5"
        >
          <a href={snapshot.deploymentUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="size-3.5" />
            Deployment
          </a>
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline">
          {snapshot.smokeArtifacts.length} smoke artifacts
        </Badge>
        <Badge variant="outline">rollback captured</Badge>
      </div>
    </div>
  );
}

function getStatusVariant(status: AdminReleaseApprovalSnapshotStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
