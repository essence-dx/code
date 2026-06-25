"use client";

import { useEffect, useState } from "react";
import { ArchiveRestore, CheckCircle2, Download, FileJson, Loader2, MessageSquareWarning, Save, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getProjectDataRetentionPurgeManifest,
  getProjectDataRetentionReport,
  saveProjectDataRetentionPolicy,
  updateProjectDataRetentionPurgeReview,
} from "@/features/projects/project-api";
import type {
  ProjectDataRetentionPolicySettings,
  ProjectDataRetentionPurgeManifest,
  ProjectDataRetentionPurgeReviewStatus,
  ProjectDataRetentionReport,
} from "@/features/projects/project-data-retention";

interface ProjectDataRetentionControlsProps {
  projectId: string;
  projectName: string;
}

type LoadState = "idle" | "loading" | "ready" | "error";

const fields: Array<{
  description: string;
  key: keyof ProjectDataRetentionPolicySettings;
  label: string;
}> = [
  {
    description: "Immutable project mutation history.",
    key: "auditLogDays",
    label: "Audit logs",
  },
  {
    description: "Open, resolved, and deleted comment source windows.",
    key: "commentDays",
    label: "Comments",
  },
  {
    description: "Saved scene snapshots and restore points.",
    key: "versionDays",
    label: "Versions",
  },
  {
    description: "Deleted external asset metadata kept for review.",
    key: "deletedAssetTombstoneDays",
    label: "Asset tombstones",
  },
];

function formatDate(value: string | null) {
  if (!value) {
    return "None";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function initialPolicy(): ProjectDataRetentionPolicySettings {
  return {
    auditLogDays: 730,
    commentDays: 365,
    deletedAssetTombstoneDays: 730,
    versionDays: 180,
  };
}

function policyFromReport(report: ProjectDataRetentionReport): ProjectDataRetentionPolicySettings {
  return {
    auditLogDays: report.policy.auditLogDays,
    commentDays: report.policy.commentDays,
    deletedAssetTombstoneDays: report.policy.deletedAssetTombstoneDays,
    versionDays: report.policy.versionDays,
  };
}

function purgeStatusLabel(status: ProjectDataRetentionPurgeReviewStatus) {
  if (status === "approved") {
    return "Approved";
  }

  if (status === "changesRequested") {
    return "Changes";
  }

  if (status === "requested") {
    return "In review";
  }

  return "Draft";
}

function purgeStatusVariant(status: ProjectDataRetentionPurgeReviewStatus) {
  if (status === "approved") {
    return "default" as const;
  }

  if (status === "changesRequested") {
    return "destructive" as const;
  }

  return "secondary" as const;
}

function clampInputDays(value: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return 7;
  }

  return Math.min(3650, Math.max(7, parsed));
}

export function ProjectDataRetentionControls({ projectId, projectName }: ProjectDataRetentionControlsProps) {
  const [open, setOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [manifest, setManifest] = useState<ProjectDataRetentionPurgeManifest | null>(null);
  const [report, setReport] = useState<ProjectDataRetentionReport | null>(null);
  const [policy, setPolicy] = useState<ProjectDataRetentionPolicySettings>(() => initialPolicy());
  const [reviewPending, setReviewPending] = useState<ProjectDataRetentionPurgeReviewStatus | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || report || loadState !== "idle") {
      return;
    }

    let cancelled = false;

    async function loadReport() {
      setLoadState("loading");

      try {
        const [response, manifestResponse] = await Promise.all([getProjectDataRetentionReport(projectId), getProjectDataRetentionPurgeManifest(projectId)]);

        if (!cancelled) {
          setReport(response.report);
          setManifest(manifestResponse.manifest);
          setPolicy(policyFromReport(response.report));
          setLoadState("ready");
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Retention controls failed to load");
          setLoadState("error");
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [loadState, open, projectId, report]);

  function retry() {
    setReport(null);
    setLoadState("idle");
  }

  function updatePolicy(key: keyof ProjectDataRetentionPolicySettings, value: string) {
    setPolicy((current) => ({
      ...current,
      [key]: clampInputDays(value),
    }));
  }

  async function savePolicy() {
    setSaving(true);

    try {
      const response = await saveProjectDataRetentionPolicy(projectId, policy);
      const manifestResponse = await getProjectDataRetentionPurgeManifest(projectId);

      setReport(response.report);
      setManifest(manifestResponse.manifest);
      setPolicy(policyFromReport(response.report));
      toast.success("Retention controls saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Retention controls failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function setPurgeReviewStatus(status: ProjectDataRetentionPurgeReviewStatus) {
    setReviewPending(status);

    try {
      const response = await updateProjectDataRetentionPurgeReview(projectId, { status });

      setManifest(response.manifest);
      toast.success(`Purge dry run marked ${purgeStatusLabel(status).toLowerCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Purge review failed");
    } finally {
      setReviewPending(null);
    }
  }

  return (
    <>
      <Button className="w-full justify-start gap-2" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <ArchiveRestore className="size-4" />
        Retention controls
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Data retention controls</SheetTitle>
            <SheetDescription>{projectName}</SheetDescription>
          </SheetHeader>

          {loadState === "loading" ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading retention controls
            </div>
          ) : null}

          {loadState === "error" ? (
            <div className="mx-4 space-y-3 rounded-md border border-border p-4 text-sm">
              <p className="text-muted-foreground">Retention controls could not be loaded.</p>
              <Button className="w-full" variant="secondary" onClick={retry}>
                Retry
              </Button>
            </div>
          ) : null}

          {report ? (
            <ScrollArea className="min-h-0 flex-1 px-4">
              <div className="space-y-4 pb-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Tracked records</p>
                    <p className="mt-1 text-2xl font-semibold">{report.summary.totalCount}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Ready for review</p>
                    <p className="mt-1 text-2xl font-semibold">{report.summary.expiredCount}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Next review</p>
                    <p className="mt-1 text-sm font-medium">{formatDate(report.summary.nextReviewAt)}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {fields.map((field) => (
                    <div key={field.key} className="rounded-md border border-border bg-card p-3">
                      <Label className="text-xs font-medium" htmlFor={`${projectId}-${field.key}`}>
                        {field.label}
                      </Label>
                      <p className="mt-1 min-h-9 text-xs leading-5 text-muted-foreground">{field.description}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Input
                          id={`${projectId}-${field.key}`}
                          max={3650}
                          min={7}
                          type="number"
                          value={policy[field.key]}
                          onChange={(event) => updatePolicy(field.key, event.target.value)}
                        />
                        <span className="text-xs text-muted-foreground">days</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Cutoff</TableHead>
                        <TableHead className="text-right">Retained</TableHead>
                        <TableHead className="text-right">Review</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.rows.map((row) => (
                        <TableRow key={row.subject}>
                          <TableCell>
                            <div className="font-medium">{row.title}</div>
                            <div className="text-xs text-muted-foreground">{row.retentionDays} day policy</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDate(row.cutoffAt)}</div>
                            <div className="text-xs text-muted-foreground">Oldest retained: {formatDate(row.oldestRetainedAt)}</div>
                          </TableCell>
                          <TableCell className="text-right">{row.retainedCount}</TableCell>
                          <TableCell className="text-right">
                            <Badge className="rounded-md" variant={row.expiredCount > 0 ? "secondary" : "outline"}>
                              {row.expiredCount}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Button className="w-full gap-2" disabled={saving} onClick={() => void savePolicy()}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save retention policy
                </Button>

                {manifest ? (
                  <div className="space-y-3 rounded-md border border-border bg-card p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FileJson className="size-4" />
                          Purge dry-run manifest
                        </div>
                        <p className="mt-1 break-all text-xs text-muted-foreground">{manifest.id}</p>
                      </div>
                      <Badge className="rounded-md" variant={purgeStatusVariant(manifest.approvalGate.status)}>
                        {purgeStatusLabel(manifest.approvalGate.status)}
                      </Badge>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-4">
                      <div className="rounded-md border border-border bg-muted/30 p-2">
                        <p className="text-[11px] text-muted-foreground">Items</p>
                        <p className="text-lg font-semibold">{manifest.summary.totalItemCount}</p>
                      </div>
                      <div className="rounded-md border border-border bg-muted/30 p-2">
                        <p className="text-[11px] text-muted-foreground">Comments</p>
                        <p className="text-lg font-semibold">{manifest.summary.commentDeleteCount}</p>
                      </div>
                      <div className="rounded-md border border-border bg-muted/30 p-2">
                        <p className="text-[11px] text-muted-foreground">Versions</p>
                        <p className="text-lg font-semibold">{manifest.summary.versionDeleteCount}</p>
                      </div>
                      <div className="rounded-md border border-border bg-muted/30 p-2">
                        <p className="text-[11px] text-muted-foreground">Tombstones</p>
                        <p className="text-lg font-semibold">{manifest.summary.tombstoneRedactionCount}</p>
                      </div>
                    </div>
                    {manifest.approvalGate.blocker ? <p className="text-xs leading-5 text-muted-foreground">{manifest.approvalGate.blocker}</p> : null}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        className="gap-2"
                        disabled={reviewPending !== null || manifest.approvalGate.status === "requested"}
                        variant="secondary"
                        onClick={() => void setPurgeReviewStatus("requested")}
                      >
                        {reviewPending === "requested" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        Request review
                      </Button>
                      <Button
                        className="gap-2"
                        disabled={reviewPending !== null || manifest.approvalGate.status === "approved"}
                        onClick={() => void setPurgeReviewStatus("approved")}
                      >
                        {reviewPending === "approved" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                        Approve dry run
                      </Button>
                      <Button
                        className="gap-2"
                        disabled={reviewPending !== null || manifest.approvalGate.status === "changesRequested"}
                        variant="outline"
                        onClick={() => void setPurgeReviewStatus("changesRequested")}
                      >
                        {reviewPending === "changesRequested" ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareWarning className="size-4" />}
                        Request changes
                      </Button>
                      <Button
                        className="gap-2"
                        render={<a href={`/api/projects/${projectId}/retention/purge?download=1`} />}
                        variant="outline"
                      >
                        <Download className="size-4" />
                        Download manifest
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                  Retention manifests are dry runs. Destructive cleanup stays blocked unless the exported manifest has an approved review gate.
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
