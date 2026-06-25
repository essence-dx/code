"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Pin, RefreshCw, Rocket, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ReleasePacketImportPreview } from "@/features/settings/components/release-packet-import-preview";
import { productCapabilities } from "@/lib/product/capability-registry";
import { createProductReadinessReport } from "@/lib/product/capability-summary";
import { importDesktopVerificationHistoryEntry, loadDesktopVerificationHistory, type DesktopVerificationHistoryEntry } from "@/lib/desktop/desktop-verification-history";
import {
  createSelfHostedUploadEvidencePacket,
  importSelfHostedUploadEvidencePacket,
  loadSelfHostedUploadHistory,
  type SelfHostedUploadEvidencePacket,
} from "@/lib/media/self-hosted-upload-history";
import {
  createSelfHostedUploadProfileReadinessEvidencePacket,
  importSelfHostedUploadProfileReadinessEvidencePacket,
  loadSelfHostedUploadProfileReadinessHistory,
  type SelfHostedUploadProfileReadinessEvidencePacket,
} from "@/lib/media/self-hosted-upload-profile-readiness";
import {
  clearReleaseEvidence,
  createReleaseDesktopProof,
  createReleaseEvidencePacketPayload,
  createReleaseEvidenceSummary,
  downloadReleaseEvidencePacket,
  getReleaseScreenshotProof,
  hasReleaseDeploymentProof,
  hasReleaseDesktopProof,
  isReleaseEvidenceRequirementReady,
  isReleaseEvidenceUrl,
  isReleaseScreenshotProof,
  isReleaseScreenshotUrl,
  loadReleaseEvidence,
  saveReleaseEvidence,
  selectProfileReadinessEvidenceFromPacket,
  selectReleaseEvidenceFromPacket,
  selectReadyDesktopVerificationEntry,
  selectUploadEvidenceFromPacket,
  type ReleaseEvidence,
  type ReleaseEvidencePacket,
} from "@/lib/product/release-evidence";
import { auditReleaseEvidencePacket } from "@/lib/product/release-evidence-audit";
import { createReleasePacketImportConflictPreview, type ReleasePacketImportConflictPreview } from "@/lib/product/release-packet-import-conflicts";
import {
  filterReleaseEvidenceHistory,
  loadPinnedReleaseEvidenceHistoryId,
  loadReleaseEvidenceHistory,
  pinReleaseEvidenceHistoryEntry,
  releaseEvidenceHistoryLabel,
  saveCurrentReleaseEvidenceHistoryEntry,
  saveReleaseEvidenceHistoryEntry,
  type ReleaseEvidenceHistoryEntry,
  type ReleaseEvidenceHistoryFilter,
} from "@/lib/product/release-evidence-history";
import { createDeploymentReleasePreflight } from "@/lib/product/deployment-release-preflight";
import { createReleaseReadinessReport, type ReleaseGateStatus } from "@/lib/product/release-readiness";

interface ReleaseReadinessCardProps {
  textAiConfigured: boolean;
  imageGenerationConfigured: boolean;
  databaseConfigured: boolean;
  vercelLinked: boolean;
  deploymentUrlCaptured: boolean;
  deploymentScreenshotCaptured: boolean;
  desktopLaunchVerified: boolean;
}

interface PendingReleaseImport {
  evidence: ReleaseEvidence;
  desktopVerification: DesktopVerificationHistoryEntry | null;
  uploadEvidence: SelfHostedUploadEvidencePacket | null;
  profileReadinessEvidence: SelfHostedUploadProfileReadinessEvidencePacket | null;
  packet: ReleaseEvidencePacket | null;
  preview: ReleasePacketImportConflictPreview;
}

export function ReleaseReadinessCard(props: ReleaseReadinessCardProps) {
  const [evidence, setEvidence] = useState<ReleaseEvidence>({
    deploymentUrl: "",
    deploymentScreenshotUrl: "",
    deploymentScreenshotArtifact: "",
    desktopLaunchVerified: false,
    desktopVerificationId: "",
    desktopVerificationCheckedAt: null,
    desktopVerificationStepCount: 0,
    updatedAt: null,
  });
  const [latestDesktopVerification, setLatestDesktopVerification] = useState<DesktopVerificationHistoryEntry | null>(null);
  const [deploymentUrl, setDeploymentUrl] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploadEvidence, setUploadEvidence] = useState<SelfHostedUploadEvidencePacket | null>(null);
  const [profileReadinessEvidence, setProfileReadinessEvidence] = useState<SelfHostedUploadProfileReadinessEvidencePacket | null>(null);
  const [releaseImportMessage, setReleaseImportMessage] = useState("");
  const [desktopImportMessage, setDesktopImportMessage] = useState("");
  const [pendingReleaseImport, setPendingReleaseImport] = useState<PendingReleaseImport | null>(null);
  const [releaseEvidenceHistory, setReleaseEvidenceHistory] = useState<ReleaseEvidenceHistoryEntry[]>([]);
  const [releaseEvidenceHistoryFilter, setReleaseEvidenceHistoryFilter] = useState<ReleaseEvidenceHistoryFilter>("all");
  const [pinnedReleaseEvidenceId, setPinnedReleaseEvidenceId] = useState("");
  const localDeploymentProof = hasReleaseDeploymentProof(evidence);
  const evidenceSummary = useMemo(() => createReleaseEvidenceSummary(evidence), [evidence]);
  const latestDesktopEvidenceSummary = useMemo(
    () =>
      latestDesktopVerification
        ? createReleaseEvidenceSummary({
            deploymentUrl: "",
            deploymentScreenshotUrl: "",
            deploymentScreenshotArtifact: "",
            desktopLaunchVerified: false,
            desktopVerificationId: "",
            desktopVerificationCheckedAt: null,
            desktopVerificationStepCount: 0,
            updatedAt: null,
            ...createReleaseDesktopProof(latestDesktopVerification),
          })
        : null,
    [latestDesktopVerification],
  );
  const freshDeploymentUrlCaptured = isReleaseEvidenceRequirementReady(evidenceSummary, "deployment-url");
  const freshDeploymentScreenshotCaptured = isReleaseEvidenceRequirementReady(evidenceSummary, "deployment-screenshot");
  const freshDesktopProofCaptured = isReleaseEvidenceRequirementReady(evidenceSummary, "desktop-proof");
  const freshLatestDesktopVerification =
    latestDesktopVerification?.status === "ready" && isReleaseEvidenceRequirementReady(latestDesktopEvidenceSummary, "desktop-proof");
  const desktopVerified = props.desktopLaunchVerified || freshDesktopProofCaptured || freshLatestDesktopVerification;
  const deploymentPreflight = useMemo(
    () =>
      createDeploymentReleasePreflight({
        vercelLinked: props.vercelLinked,
        deploymentUrlCaptured: props.deploymentUrlCaptured || freshDeploymentUrlCaptured,
        deploymentScreenshotCaptured: props.deploymentScreenshotCaptured || freshDeploymentScreenshotCaptured,
        evidenceSummary,
      }),
    [
      evidenceSummary,
      freshDeploymentScreenshotCaptured,
      freshDeploymentUrlCaptured,
      props.deploymentScreenshotCaptured,
      props.deploymentUrlCaptured,
      props.vercelLinked,
    ],
  );
  const report = useMemo(
    () =>
      createReleaseReadinessReport({
        productReport: createProductReadinessReport(productCapabilities),
        ...props,
        deploymentUrlCaptured: props.deploymentUrlCaptured || freshDeploymentUrlCaptured,
        deploymentScreenshotCaptured: props.deploymentScreenshotCaptured || freshDeploymentScreenshotCaptured,
        desktopLaunchVerified: desktopVerified,
      }),
    [desktopVerified, freshDeploymentScreenshotCaptured, freshDeploymentUrlCaptured, props],
  );
  const releaseAudit = useMemo(
    () =>
      auditReleaseEvidencePacket(
        createReleaseEvidencePacketPayload(report, evidence, {
          desktopVerification: latestDesktopVerification,
          profileReadinessEvidence,
          uploadEvidence,
        }),
      ),
    [evidence, latestDesktopVerification, profileReadinessEvidence, report, uploadEvidence],
  );
  const Icon = report.status === "ready" ? ShieldCheck : Rocket;
  const canSaveDeploymentUrl = isReleaseEvidenceUrl(deploymentUrl);
  const canSaveScreenshot = isReleaseScreenshotProof(screenshotUrl);
  const savedScreenshotProof = getReleaseScreenshotProof(evidence);
  const filteredReleaseEvidenceHistory = useMemo(
    () => filterReleaseEvidenceHistory(releaseEvidenceHistory, releaseEvidenceHistoryFilter),
    [releaseEvidenceHistory, releaseEvidenceHistoryFilter],
  );
  const pinnedReleaseEvidence = useMemo(
    () => releaseEvidenceHistory.find((entry) => entry.id === pinnedReleaseEvidenceId) ?? releaseEvidenceHistory[0] ?? null,
    [pinnedReleaseEvidenceId, releaseEvidenceHistory],
  );

  useEffect(() => {
    const stored = loadReleaseEvidence();
    const latestDesktopEntry = loadDesktopVerificationHistory()[0] ?? null;
    setEvidence(stored);
    setLatestDesktopVerification(latestDesktopEntry);
    setUploadEvidence(createSelfHostedUploadEvidencePacket(loadSelfHostedUploadHistory()));
    setProfileReadinessEvidence(createSelfHostedUploadProfileReadinessEvidencePacket(loadSelfHostedUploadProfileReadinessHistory()));
    setDeploymentUrl(stored.deploymentUrl);
    setScreenshotUrl(getReleaseScreenshotProof(stored));
    setReleaseEvidenceHistory(loadReleaseEvidenceHistory());
    setPinnedReleaseEvidenceId(loadPinnedReleaseEvidenceHistoryId());
  }, []);

  function handleSaveDeploymentUrl() {
    if (!canSaveDeploymentUrl) return;
    setEvidence(saveReleaseEvidence({ deploymentUrl: deploymentUrl.trim() }));
  }

  function handleSaveScreenshotProof() {
    if (!canSaveScreenshot) return;
    const proof = screenshotUrl.trim();
    setEvidence(
      saveReleaseEvidence(
        isReleaseScreenshotUrl(proof)
          ? { deploymentScreenshotUrl: proof, deploymentScreenshotArtifact: "" }
          : { deploymentScreenshotUrl: "", deploymentScreenshotArtifact: proof },
      ),
    );
  }

  function handleUseDesktopVerification() {
    if (latestDesktopVerification?.status !== "ready") return;
    setEvidence(saveReleaseEvidence(createReleaseDesktopProof(latestDesktopVerification)));
    setDesktopImportMessage(`Using desktop check from ${formatEvidenceTime(latestDesktopVerification.checkedAt)}.`);
  }

  async function handleImportDesktopEvidence(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const entry = selectReadyDesktopVerificationEntry(JSON.parse(await file.text()));

      if (!entry) {
        setDesktopImportMessage("No ready desktop check was found in that evidence packet.");
        return;
      }

      const restoredEntry = importDesktopVerificationHistoryEntry(entry).find((historyEntry) => historyEntry.id === entry.id) ?? entry;
      setLatestDesktopVerification(restoredEntry);
      setEvidence(saveReleaseEvidence(createReleaseDesktopProof(restoredEntry)));
      setDesktopImportMessage(`Imported desktop check from ${formatEvidenceTime(restoredEntry.checkedAt)}.`);
    } catch {
      setDesktopImportMessage("That evidence packet could not be read.");
    }
  }

  async function handleImportReleaseEvidence(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const pendingImport = createPendingReleaseImport(parsed);
      if (!pendingImport) {
        setReleaseImportMessage("No release proof was found in that packet.");
        return;
      }

      if (pendingImport.preview.status === "conflict") {
        setPendingReleaseImport(pendingImport);
        setReleaseImportMessage("Review the release proof import conflicts before overwriting local evidence.");
        return;
      }

      applyReleaseEvidenceImport(pendingImport);
    } catch {
      setReleaseImportMessage("That release proof packet could not be read.");
    }
  }

  function createPendingReleaseImport(parsed: unknown): PendingReleaseImport | null {
    const importedEvidence = selectReleaseEvidenceFromPacket(parsed);
    if (!importedEvidence) return null;

    const importedDesktopVerification = selectReadyDesktopVerificationEntry(parsed);
    const importedUploadEvidence = selectUploadEvidenceFromPacket(parsed);
    const importedProfileReadinessEvidence = selectProfileReadinessEvidenceFromPacket(parsed);

    return {
      evidence: importedEvidence,
      desktopVerification: importedDesktopVerification,
      uploadEvidence: importedUploadEvidence,
      profileReadinessEvidence: importedProfileReadinessEvidence,
      packet: isReleaseEvidencePacket(parsed) ? parsed : null,
      preview: createReleasePacketImportConflictPreview({
        currentEvidence: evidence,
        incomingEvidence: importedEvidence,
        currentDesktopVerification: latestDesktopVerification,
        incomingDesktopVerification: importedDesktopVerification,
        currentUploadEvidence: uploadEvidence,
        incomingUploadEvidence: importedUploadEvidence,
        currentProfileReadinessEvidence: profileReadinessEvidence,
        incomingProfileReadinessEvidence: importedProfileReadinessEvidence,
      }),
    };
  }

  function applyReleaseEvidenceImport(pendingImport: PendingReleaseImport) {
    const nextEvidence = saveReleaseEvidence({
      ...pendingImport.evidence,
      ...(pendingImport.desktopVerification ? createReleaseDesktopProof(pendingImport.desktopVerification) : {}),
    });
    const importDetails: string[] = [];
    setPendingReleaseImport(null);
    setEvidence(nextEvidence);
    setDeploymentUrl(nextEvidence.deploymentUrl);
    setScreenshotUrl(getReleaseScreenshotProof(nextEvidence));

    const importedDesktopVerification = pendingImport.desktopVerification;
    if (importedDesktopVerification) {
      const restoredDesktopVerification =
        importDesktopVerificationHistoryEntry(importedDesktopVerification).find((historyEntry) => historyEntry.id === importedDesktopVerification.id) ??
        importedDesktopVerification;
      setLatestDesktopVerification(restoredDesktopVerification);
      importDetails.push(`desktop check from ${formatEvidenceTime(restoredDesktopVerification.checkedAt)}`);
    }

    if (pendingImport.uploadEvidence) {
      const nextUploadHistory = importSelfHostedUploadEvidencePacket(pendingImport.uploadEvidence);
      const nextUploadEvidence = createSelfHostedUploadEvidencePacket(nextUploadHistory);
      setUploadEvidence(nextUploadEvidence);
      importDetails.push(`${nextUploadEvidence.entryCount} upload checks`);
    }

    if (pendingImport.profileReadinessEvidence) {
      const nextProfileReadinessHistory = importSelfHostedUploadProfileReadinessEvidencePacket(pendingImport.profileReadinessEvidence);
      const nextProfileReadinessEvidence = createSelfHostedUploadProfileReadinessEvidencePacket(nextProfileReadinessHistory);
      setProfileReadinessEvidence(nextProfileReadinessEvidence);
      importDetails.push(`${nextProfileReadinessEvidence.reportCount} profile readiness checks`);
    }

    if (pendingImport.packet) {
      const nextHistory = saveReleaseEvidenceHistoryEntry(pendingImport.packet);
      setReleaseEvidenceHistory(nextHistory);
      setPinnedReleaseEvidenceId(loadPinnedReleaseEvidenceHistoryId());
      importDetails.push("saved release history");
    }

    setReleaseImportMessage(importDetails.length > 0 ? `Imported release proof packet with ${importDetails.join(" and ")}.` : "Imported release proof packet.");
  }

  function handleSaveReleaseEvidenceSnapshot() {
    const nextHistory = saveCurrentReleaseEvidenceHistoryEntry(report, evidence, {
      desktopVerification: latestDesktopVerification,
      profileReadinessEvidence,
      uploadEvidence,
    });

    setReleaseEvidenceHistory(nextHistory);
    setPinnedReleaseEvidenceId(loadPinnedReleaseEvidenceHistoryId());
    setReleaseImportMessage("Saved release proof snapshot.");
  }

  function handlePinReleaseEvidence(entry: ReleaseEvidenceHistoryEntry) {
    setPinnedReleaseEvidenceId(pinReleaseEvidenceHistoryEntry(entry.id));
  }

  function handleReverifyReleaseEvidence(entry: ReleaseEvidenceHistoryEntry) {
    const nextHistory = saveReleaseEvidenceHistoryEntry(entry.packet);
    setReleaseEvidenceHistory(nextHistory);
    setPinnedReleaseEvidenceId(loadPinnedReleaseEvidenceHistoryId());
    setReleaseImportMessage(`Re-verified ${releaseEvidenceHistoryLabel(nextHistory[0] ?? entry).toLowerCase()} release proof.`);
  }

  function handleClearEvidence() {
    const next = clearReleaseEvidence();
    setEvidence(next);
    setDeploymentUrl("");
    setScreenshotUrl("");
    setReleaseImportMessage("");
    setDesktopImportMessage("");
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-lg">
          <span className="flex min-w-0 items-center gap-2">
            <Icon className="size-4 shrink-0" />
            Release readiness
          </span>
          <Badge variant={releaseBadgeVariant(report.status)}>{report.score}/100</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress value={report.score} />
          <p className="text-sm text-muted-foreground">{report.summary}</p>
        </div>
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Release evidence</div>
              <div className="text-xs text-muted-foreground">
                {evidence.updatedAt ? `Saved ${formatEvidenceTime(evidence.updatedAt)}` : "No saved proof yet"} / {evidenceSummary.readyCount} of {evidenceSummary.total} ready
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              aria-label="Export release evidence packet"
              onClick={() =>
                downloadReleaseEvidencePacket(report, evidence, {
                  desktopVerification: latestDesktopVerification,
                  profileReadinessEvidence,
                  uploadEvidence,
                })
              }
            >
              <Download className="size-3.5" />
              {releaseAudit.status === "ready" ? "Export ready proof" : "Export draft proof"}
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {evidenceSummary.requirements.map((requirement) => (
              <div key={requirement.id} className="rounded-md bg-muted/40 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-xs font-medium">{requirement.label}</div>
                  <Badge variant={releaseEvidenceBadgeVariant(requirement.status)}>{releaseEvidenceStatusLabel(requirement.status)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{requirement.detail}</p>
              </div>
            ))}
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Evidence verifier</div>
                <div className="text-xs text-muted-foreground">{releaseAudit.summary}</div>
              </div>
              <Badge variant={releaseAudit.status === "ready" ? "default" : "secondary"}>{releaseAudit.status === "ready" ? "Ready" : "Blocked"}</Badge>
            </div>
            {releaseAudit.status !== "ready" ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {releaseAudit.errors.map((error) => (
                  <div key={error} className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                    {error}
                  </div>
                ))}
                {releaseAudit.missingRequirements.map((requirement) => (
                  <div key={requirement.id} className="rounded-md bg-muted/40 p-2">
                    <div className="text-xs font-medium">Missing {requirement.label}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{requirement.detail}</p>
                  </div>
                ))}
                {releaseAudit.staleRequirements.map((requirement) => (
                  <div key={requirement.id} className="rounded-md bg-muted/40 p-2">
                    <div className="text-xs font-medium">Refresh {requirement.label}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{requirement.detail}</p>
                  </div>
                ))}
                {releaseAudit.blockedGates.map((gate) => (
                  <div key={gate.id} className="rounded-md bg-muted/40 p-2">
                    <div className="text-xs font-medium">{gate.label}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{gate.nextStep}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <Input className="max-w-72" type="file" accept="application/json,.json" aria-label="Import release evidence packet" onChange={handleImportReleaseEvidence} />
          {pendingReleaseImport ? (
            <ReleasePacketImportPreview
              preview={pendingReleaseImport.preview}
              onCancel={() => {
                setPendingReleaseImport(null);
                setReleaseImportMessage("Release proof import cancelled.");
              }}
              onConfirm={() => applyReleaseEvidenceImport(pendingReleaseImport)}
            />
          ) : null}
          {releaseImportMessage ? <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">{releaseImportMessage}</div> : null}
          <div className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Release evidence history</div>
                <div className="text-xs text-muted-foreground">
                  {pinnedReleaseEvidence
                    ? `Pinned ${releaseEvidenceHistoryLabel(pinnedReleaseEvidence).toLowerCase()} proof from ${formatEvidenceTime(pinnedReleaseEvidence.savedAt)}`
                    : "No saved release snapshots yet"}
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleSaveReleaseEvidenceSnapshot} aria-label="Save release evidence snapshot">
                <Download className="size-3.5" />
                Save snapshot
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["all", "ready", "draft", "stale"] as const).map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  size="sm"
                  variant={releaseEvidenceHistoryFilter === filter ? "default" : "outline"}
                  aria-label={`Show ${releaseEvidenceFilterLabel(filter).toLowerCase()} release evidence`}
                  aria-pressed={releaseEvidenceHistoryFilter === filter}
                  onClick={() => setReleaseEvidenceHistoryFilter(filter)}
                >
                  {releaseEvidenceFilterLabel(filter)}
                </Button>
              ))}
            </div>
            <div className="mt-3 grid gap-2">
              {filteredReleaseEvidenceHistory.length > 0 ? (
                filteredReleaseEvidenceHistory.slice(0, 4).map((entry) => (
                  <div key={entry.id} className="rounded-md bg-muted/40 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={releaseHistoryBadgeVariant(entry)}>{releaseEvidenceHistoryLabel(entry)}</Badge>
                          {pinnedReleaseEvidenceId === entry.id ? <Badge variant="outline">Pinned</Badge> : null}
                          <span className="text-xs text-muted-foreground">{formatEvidenceTime(entry.savedAt)}</span>
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          Release {entry.releaseScore}/100 / proof {entry.evidenceScore}/100
                          {entry.deploymentUrl ? ` / ${entry.deploymentUrl}` : ""}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePinReleaseEvidence(entry)}
                          aria-label={`Pin release evidence from ${formatEvidenceTime(entry.savedAt)}`}
                        >
                          <Pin className="size-3.5" />
                          Pin
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReverifyReleaseEvidence(entry)}
                          aria-label={`Re-verify release evidence from ${formatEvidenceTime(entry.savedAt)}`}
                        >
                          <RefreshCw className="size-3.5" />
                          Re-verify
                        </Button>
                      </div>
                    </div>
                    {entry.missingCount + entry.staleCount + entry.blockerCount + entry.warningCount > 0 ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {entry.missingCount} missing / {entry.staleCount} stale / {entry.blockerCount} blocked / {entry.warningCount} warnings
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">No snapshots match this filter.</div>
              )}
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Upload evidence</div>
                <div className="text-xs text-muted-foreground">
                  {uploadEvidence && uploadEvidence.entryCount > 0
                    ? `${uploadEvidence.verifiedCount} verified, ${uploadEvidence.limitedCount} limited, ${uploadEvidence.failedCount} failed`
                    : "No creator storage upload checks saved yet"}
                </div>
              </div>
              <Badge variant={uploadEvidence && uploadEvidence.verifiedCount > 0 ? "default" : "outline"}>
                {uploadEvidence?.entryCount ?? 0} checks
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Upload evidence is included in the release packet so self-hosted media handoff proof travels with deployment and desktop proof.
            </p>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Profile readiness evidence</div>
                <div className="text-xs text-muted-foreground">
                  {profileReadinessEvidence && profileReadinessEvidence.reportCount > 0
                    ? `${profileReadinessEvidence.readyCount} ready, ${profileReadinessEvidence.limitedCount} limited, ${profileReadinessEvidence.failedCount} failed`
                    : "No storage profile readiness checks saved yet"}
                </div>
              </div>
              <Badge variant={profileReadinessEvidence && profileReadinessEvidence.readyCount > 0 ? "default" : "outline"}>
                {profileReadinessEvidence?.reportCount ?? 0} checks
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Profile readiness evidence is included in the release packet so storage setup validation travels with upload handoff proof.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={deploymentUrl}
              onChange={(event) => setDeploymentUrl(event.target.value)}
              placeholder="https://essence-studio.vercel.app"
              aria-label="Deployed app URL"
            />
            <Button type="button" variant="outline" onClick={handleSaveDeploymentUrl} disabled={!canSaveDeploymentUrl} aria-label="Save deployed app URL">
              <CheckCircle2 className="size-3.5" />
              Save URL
            </Button>
            <Input
              value={screenshotUrl}
              onChange={(event) => setScreenshotUrl(event.target.value)}
              placeholder="https://deployment-screenshot-url or local screenshot path"
              aria-label="Deployed screenshot proof"
            />
            <Button type="button" variant="outline" onClick={handleSaveScreenshotProof} disabled={!canSaveScreenshot} aria-label="Save deployed screenshot proof">
              <CheckCircle2 className="size-3.5" />
              Save proof
            </Button>
          </div>
          {evidence.deploymentUrl ? (
            <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
              Deployment:{" "}
              <a className="font-medium text-foreground underline-offset-4 hover:underline" href={evidence.deploymentUrl} rel="noreferrer" target="_blank">
                {evidence.deploymentUrl}
              </a>
            </div>
          ) : null}
          {localDeploymentProof ? (
            <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
              Deployment evidence saved: URL and screenshot are present. Freshness is shown above.
            </div>
          ) : null}
          {savedScreenshotProof ? (
            <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
              Screenshot proof:{" "}
              {evidence.deploymentScreenshotUrl ? (
                <a className="font-medium text-foreground underline-offset-4 hover:underline" href={evidence.deploymentScreenshotUrl} rel="noreferrer" target="_blank">
                  {evidence.deploymentScreenshotUrl}
                </a>
              ) : (
                <span className="font-medium text-foreground">{evidence.deploymentScreenshotArtifact}</span>
              )}
            </div>
          ) : null}
          {deploymentPreflight.status !== "ready" ? (
            <div className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Deployment preflight</div>
                  <div className="text-xs text-muted-foreground">{deploymentPreflight.summary}</div>
                </div>
                <Badge variant={releaseEvidenceBadgeVariant(deploymentPreflight.status)}>{releaseEvidenceStatusLabel(deploymentPreflight.status)}</Badge>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {deploymentPreflight.steps.map((step) => (
                  <div key={step.id} className="rounded-md bg-muted/40 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 truncate text-xs font-medium">{step.label}</div>
                      <Badge variant={releaseEvidenceBadgeVariant(step.status)}>{releaseEvidenceStatusLabel(step.status)}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleUseDesktopVerification}
              disabled={latestDesktopVerification?.status !== "ready"}
              aria-label="Use ready desktop verification"
            >
              <CheckCircle2 className="size-3.5" />
              Use ready desktop check
            </Button>
            <Input className="max-w-72" type="file" accept="application/json,.json" aria-label="Import desktop evidence packet" onChange={handleImportDesktopEvidence} />
            <Button type="button" size="sm" variant="ghost" onClick={handleClearEvidence} aria-label="Clear release proof">
              <Trash2 className="size-3.5" />
              Clear proof
            </Button>
          </div>
          {desktopImportMessage ? <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">{desktopImportMessage}</div> : null}
          {latestDesktopVerification ? (
            <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
              Latest desktop check: {releaseStatusLabel(latestDesktopVerification.status === "ready" ? "ready" : "warning")} on{" "}
              {formatEvidenceTime(latestDesktopVerification.checkedAt)}
            </div>
          ) : null}
          {hasReleaseDesktopProof(evidence) ? (
            <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
              Desktop evidence saved: {evidence.desktopVerificationStepCount} checks from{" "}
              {formatEvidenceTime(evidence.desktopVerificationCheckedAt ?? evidence.updatedAt ?? Date.now())}. Freshness is shown above.
            </div>
          ) : null}
        </div>
        <div className="grid gap-2">
          {report.gates.map((gate) => (
            <div key={gate.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 truncate text-sm font-medium">{gate.label}</div>
                <Badge variant={releaseBadgeVariant(gate.status)}>{releaseStatusLabel(gate.status)}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{gate.detail}</p>
              {gate.status !== "ready" ? <p className="mt-2 text-xs">{gate.nextStep}</p> : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function releaseBadgeVariant(status: ReleaseGateStatus) {
  if (status === "ready") return "default";
  if (status === "blocked") return "destructive";
  return "secondary";
}

function releaseStatusLabel(status: ReleaseGateStatus) {
  if (status === "ready") return "Ready";
  if (status === "blocked") return "Blocked";
  return "Warning";
}

function releaseEvidenceBadgeVariant(status: "ready" | "missing" | "stale") {
  if (status === "ready") return "default";
  if (status === "stale") return "outline";
  return "secondary";
}

function releaseEvidenceStatusLabel(status: "ready" | "missing" | "stale") {
  if (status === "ready") return "Ready";
  if (status === "stale") return "Stale";
  return "Missing";
}

function releaseEvidenceFilterLabel(filter: ReleaseEvidenceHistoryFilter) {
  if (filter === "all") return "All";
  if (filter === "ready") return "Ready";
  if (filter === "stale") return "Stale";
  return "Draft";
}

function releaseHistoryBadgeVariant(entry: ReleaseEvidenceHistoryEntry) {
  const label = releaseEvidenceHistoryLabel(entry);
  if (label === "Ready") return "default";
  if (label === "Stale") return "outline";
  return "secondary";
}

function formatEvidenceTime(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isReleaseEvidencePacket(value: unknown): value is Parameters<typeof saveReleaseEvidenceHistoryEntry>[0] {
  if (!value || typeof value !== "object") return false;

  const candidate = value as { schemaVersion?: unknown; exportedAt?: unknown; report?: unknown; evidence?: unknown };
  return candidate.schemaVersion === 1 && typeof candidate.exportedAt === "string" && Boolean(candidate.report) && Boolean(candidate.evidence);
}
