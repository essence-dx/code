"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { Download, Monitor, MonitorCheck, RotateCw, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  desktopVerificationUpdatedEvent,
  type DesktopVerificationUpdatedEventDetail,
} from "@/features/settings/components/desktop-proof-autopilot";
import { Input } from "@/components/ui/input";
import { createDesktopLaunchProofSummary, type DesktopLaunchProofStatus } from "@/lib/desktop/desktop-launch-proof";
import { createDesktopLaunchPreflight } from "@/lib/desktop/desktop-launch-preflight";
import { createDesktopProofFreshnessReminder, type DesktopProofFreshnessStatus } from "@/lib/desktop/desktop-proof-freshness";
import { createDesktopReadinessReport } from "@/lib/desktop/desktop-readiness";
import { auditDesktopVerificationEvidencePacket } from "@/lib/desktop/desktop-evidence-audit";
import {
  downloadDesktopVerificationEvidence,
  importDesktopVerificationEvidencePacket,
  loadDesktopVerificationHistory,
  readDesktopVerificationEvidenceEntries,
  saveDesktopVerificationReport,
  type DesktopVerificationHistoryEntry,
} from "@/lib/desktop/desktop-verification-history";
import { runDesktopVerification, type DesktopVerificationReport } from "@/lib/desktop/desktop-verification";
import type { DesktopDiagnosticStatus } from "@/lib/desktop/desktop-diagnostics";
import { useHasClientApiRuntime, useIsDesktopRuntime } from "@/lib/runtime/client-api";

export function DesktopReadinessCard() {
  const isDesktopRuntime = useIsDesktopRuntime();
  const hasOnlineActions = useHasClientApiRuntime();
  const [verification, setVerification] = useState<DesktopVerificationReport | null>(null);
  const [history, setHistory] = useState<DesktopVerificationHistoryEntry[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [evidenceImportMessage, setEvidenceImportMessage] = useState("");
  const report = createDesktopReadinessReport({ isDesktopRuntime, hasOnlineActions });
  const launchProof = createDesktopLaunchProofSummary(history[0] ?? null);
  const launchPreflight = createDesktopLaunchPreflight(launchProof);
  const evidenceAudit = useMemo(() => auditDesktopVerificationEvidencePacket(history), [history]);
  const freshnessReminder = useMemo(() => createDesktopProofFreshnessReminder(history), [history]);
  const Icon = report.status === "ready" ? MonitorCheck : Monitor;

  useEffect(() => {
    setHistory(loadDesktopVerificationHistory());

    function handleDesktopVerificationUpdate(event: Event) {
      const detail = (event as CustomEvent<DesktopVerificationUpdatedEventDetail>).detail;
      setHistory(loadDesktopVerificationHistory());

      if (detail?.evidenceFile) {
        setEvidenceImportMessage(`Desktop evidence saved to ${detail.evidenceFile.path}.`);
      }
    }

    window.addEventListener(desktopVerificationUpdatedEvent, handleDesktopVerificationUpdate);
    return () => window.removeEventListener(desktopVerificationUpdatedEvent, handleDesktopVerificationUpdate);
  }, []);

  async function handleRunVerification() {
    setIsChecking(true);
    try {
      const nextVerification = await runDesktopVerification();
      setVerification(nextVerification);
      setHistory(saveDesktopVerificationReport(nextVerification));
    } finally {
      setIsChecking(false);
    }
  }

  function handleExportEvidence() {
    downloadDesktopVerificationEvidence(history);
  }

  async function handleImportEvidence(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const entries = readDesktopVerificationEvidenceEntries(parsed);

      if (!entries.length) {
        setEvidenceImportMessage("No desktop checks were found in that evidence packet.");
        return;
      }

      const nextHistory = importDesktopVerificationEvidencePacket(entries);
      setHistory(nextHistory);
      setEvidenceImportMessage(`Imported ${entries.length} desktop ${entries.length === 1 ? "check" : "checks"}.`);
    } catch {
      setEvidenceImportMessage("That desktop evidence packet could not be read.");
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-lg">
          <span className="flex min-w-0 items-center gap-2">
            <Icon className="size-4 shrink-0" />
            Desktop app
          </span>
          <Badge variant={report.status === "ready" ? "default" : "secondary"}>{report.runtimeLabel}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm text-muted-foreground">{report.summary}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleRunVerification} disabled={isChecking}>
              <RotateCw className={`size-3.5 ${isChecking ? "animate-spin" : ""}`} />
              {isChecking ? "Checking" : "Run checks"}
            </Button>
            <div className="relative">
              <Upload className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 max-w-64 pl-8 text-xs"
                type="file"
                accept="application/json,.json"
                aria-label="Import desktop evidence packet"
                onChange={handleImportEvidence}
              />
            </div>
          </div>
        </div>
        {evidenceImportMessage ? <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">{evidenceImportMessage}</div> : null}
        <div className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Evidence verifier</div>
              <div className="text-xs text-muted-foreground">{evidenceAudit.summary}</div>
            </div>
            <Badge variant={evidenceAudit.status === "ready" ? "default" : "secondary"}>{evidenceAudit.status === "ready" ? "Ready" : "Blocked"}</Badge>
          </div>
          {evidenceAudit.status !== "ready" ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {evidenceAudit.errors.map((error) => (
                <div key={error} className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                  {error}
                </div>
              ))}
              {evidenceAudit.missingRequirements.map((requirement) => (
                <div key={requirement.id} className="rounded-md bg-muted/40 p-2">
                  <div className="text-xs font-medium">Missing {requirement.label}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{requirement.detail}</p>
                </div>
              ))}
              {evidenceAudit.limitedRequirements.map((requirement) => (
                <div key={requirement.id} className="rounded-md bg-muted/40 p-2">
                  <div className="text-xs font-medium">Limited {requirement.label}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{requirement.detail}</p>
                </div>
              ))}
              {evidenceAudit.failedRequirements.map((requirement) => (
                <div key={requirement.id} className="rounded-md bg-muted/40 p-2">
                  <div className="text-xs font-medium">Failed {requirement.label}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{requirement.detail}</p>
                </div>
              ))}
            </div>
            ) : null}
        </div>
        <div className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Proof freshness</div>
              <div className="text-xs text-muted-foreground">{freshnessReminder.detail}</div>
            </div>
            <Badge variant={freshnessBadgeVariant(freshnessReminder.status)}>{freshnessLabel(freshnessReminder.status)}</Badge>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
              {freshnessReminder.checkedAt
                ? `Latest ready proof is ${freshnessReminder.ageDays ?? 0} days old with ${freshnessReminder.daysUntilStale ?? 0} days left.`
                : "No ready desktop proof has been captured yet."}
            </div>
            <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
              Refresh without rebuilding: <span className="font-medium text-foreground">{freshnessReminder.command}</span>
            </div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {report.capabilities.map((capability) => (
            <div key={capability.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 truncate text-sm font-medium">{capability.label}</div>
                <Badge variant={capability.status === "ready" ? "default" : "secondary"}>
                  {capability.status === "ready" ? "Ready" : "Limited"}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{capability.detail}</p>
            </div>
          ))}
        </div>
        {verification ? (
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">Last check</div>
                <div className="text-xs text-muted-foreground">{formatDiagnosticTime(verification.checkedAt)}</div>
              </div>
              <Badge variant={diagnosticBadgeVariant(verification.status)}>{diagnosticLabel(verification.status)}</Badge>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {verification.steps.map((step) => (
                <div key={step.id} className="rounded-md bg-muted/40 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-xs font-medium">{step.label}</div>
                    <Badge variant={diagnosticBadgeVariant(step.status)}>{diagnosticLabel(step.status)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {history.length ? (
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Saved evidence</div>
              <Button size="sm" variant="outline" onClick={handleExportEvidence}>
                <Download className="size-3.5" />
                Export
              </Button>
            </div>
            <div className="mt-3 grid gap-2">
              {history.slice(0, 3).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-2">
                  <div className="min-w-0">
                    <div className="text-xs font-medium">{formatDiagnosticTime(entry.checkedAt)}</div>
                    <div className="text-xs text-muted-foreground">
                      {entry.readyCount} ready, {entry.limitedCount} limited, {entry.failedCount} failed
                    </div>
                  </div>
                  <Badge variant={diagnosticBadgeVariant(entry.status)}>{diagnosticLabel(entry.status)}</Badge>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {history.length ? (
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Desktop launch proof</div>
                <div className="text-xs text-muted-foreground">
                  {launchProof.readyCount} of {launchProof.total} required checks ready
                </div>
              </div>
              <Badge variant={proofBadgeVariant(launchProof.status)}>{proofStatusLabel(launchProof.status)}</Badge>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {launchProof.requirements.map((requirement) => (
                <div key={requirement.id} className="rounded-md bg-muted/40 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-xs font-medium">{requirement.label}</div>
                    <Badge variant={proofBadgeVariant(requirement.status)}>{proofStatusLabel(requirement.status)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{requirement.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {launchProof.status !== "ready" ? (
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Launch preflight</div>
                <div className="text-xs text-muted-foreground">{launchPreflight.summary}</div>
              </div>
              <Badge variant={proofBadgeVariant(launchPreflight.status)}>{proofStatusLabel(launchPreflight.status)}</Badge>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {launchPreflight.steps.map((step) => (
                <div key={step.id} className="rounded-md bg-muted/40 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-xs font-medium">{step.label}</div>
                    <Badge variant={proofBadgeVariant(step.status)}>{proofStatusLabel(step.status)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function diagnosticBadgeVariant(status: DesktopDiagnosticStatus) {
  if (status === "ready") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

function diagnosticLabel(status: DesktopDiagnosticStatus) {
  if (status === "ready") return "Ready";
  if (status === "failed") return "Failed";
  return "Limited";
}

function proofBadgeVariant(status: DesktopLaunchProofStatus) {
  if (status === "ready") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

function proofStatusLabel(status: DesktopLaunchProofStatus) {
  if (status === "ready") return "Ready";
  if (status === "failed") return "Failed";
  if (status === "missing") return "Missing";
  return "Limited";
}

function freshnessBadgeVariant(status: DesktopProofFreshnessStatus) {
  if (status === "ready") return "default";
  if (status === "stale" || status === "blocked") return "destructive";
  return "secondary";
}

function freshnessLabel(status: DesktopProofFreshnessStatus) {
  if (status === "ready") return "Ready";
  if (status === "renew-soon") return "Renew soon";
  if (status === "stale") return "Stale";
  if (status === "blocked") return "Blocked";
  return "Missing";
}

function formatDiagnosticTime(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
