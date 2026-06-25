import { hasDesktopLaunchProofEntry } from "@/lib/desktop/desktop-launch-proof";
import {
  createReleaseEvidenceSummary,
  selectReleaseEvidenceFromPacket,
  selectReadyDesktopVerificationEntry,
  type ReleaseEvidenceRequirement,
} from "@/lib/product/release-evidence";
import type { ReleaseReadinessGate, ReleaseReadinessReport } from "@/lib/product/release-readiness";

export type ReleaseEvidenceAuditStatus = "ready" | "blocked";

export interface ReleaseEvidencePacketAudit {
  status: ReleaseEvidenceAuditStatus;
  summary: string;
  releaseScore: number;
  evidenceScore: number;
  missingRequirements: ReleaseEvidenceRequirement[];
  staleRequirements: ReleaseEvidenceRequirement[];
  blockedGates: ReleaseReadinessGate[];
  warningGates: ReleaseReadinessGate[];
  errors: string[];
}

export function auditReleaseEvidencePacket(value: unknown, now = Date.now()): ReleaseEvidencePacketAudit {
  const evidence = selectReleaseEvidenceFromPacket(value);
  const report = readReleaseReadinessReport(value);
  const errors: string[] = [];

  if (!evidence) {
    errors.push("Release evidence is missing or malformed.");
  }

  if (!report) {
    errors.push("Release readiness report is missing or malformed.");
  }

  const evidenceSummary = evidence ? createReleaseEvidenceSummary(evidence, now) : null;
  const missingRequirements = evidenceSummary?.requirements.filter((requirement) => requirement.status === "missing") ?? [];
  const staleRequirements = evidenceSummary?.requirements.filter((requirement) => requirement.status === "stale") ?? [];
  const desktopEntry = selectReadyDesktopVerificationEntry(value);

  if (evidence?.desktopLaunchVerified && !hasDesktopLaunchProofEntry(desktopEntry)) {
    errors.push("Release packet marks desktop proof as verified but does not include a ready desktop verification entry.");
  }

  const blockedGates = report?.gates.filter((gate) => gate.status === "blocked") ?? [];
  const warningGates = report?.gates.filter((gate) => gate.status === "warning") ?? [];
  const status =
    errors.length === 0 &&
    missingRequirements.length === 0 &&
    staleRequirements.length === 0 &&
    blockedGates.length === 0 &&
    warningGates.length === 0 &&
    report?.status === "ready"
      ? "ready"
      : "blocked";

  return {
    status,
    releaseScore: report?.score ?? 0,
    evidenceScore: evidenceSummary?.score ?? 0,
    missingRequirements,
    staleRequirements,
    blockedGates,
    warningGates,
    errors,
    summary: auditSummary(status, report?.score ?? 0, evidenceSummary?.score ?? 0, {
      errors: errors.length,
      missing: missingRequirements.length,
      stale: staleRequirements.length,
      blocked: blockedGates.length,
      warnings: warningGates.length,
    }),
  };
}

function auditSummary(
  status: ReleaseEvidenceAuditStatus,
  releaseScore: number,
  evidenceScore: number,
  counts: { errors: number; missing: number; stale: number; blocked: number; warnings: number },
) {
  if (status === "ready") return `Release evidence is ready. Release gate ${releaseScore}/100, proof evidence ${evidenceScore}/100.`;

  const issueCount = counts.errors + counts.missing + counts.stale + counts.blocked + counts.warnings;
  return `Release evidence is blocked with ${issueCount} issue${issueCount === 1 ? "" : "s"}. Release gate ${releaseScore}/100, proof evidence ${evidenceScore}/100.`;
}

function readReleaseReadinessReport(value: unknown): ReleaseReadinessReport | null {
  if (!value || typeof value !== "object") return null;

  const report = (value as { report?: unknown }).report;
  if (!report || typeof report !== "object") return null;

  const candidate = report as Partial<ReleaseReadinessReport>;
  if (!["ready", "warning", "blocked"].includes(String(candidate.status))) return null;
  if (typeof candidate.score !== "number" || !Number.isFinite(candidate.score)) return null;
  if (!Array.isArray(candidate.gates)) return null;
  if (!candidate.gates.every(isReleaseReadinessGate)) return null;

  return candidate as ReleaseReadinessReport;
}

function isReleaseReadinessGate(value: unknown): value is ReleaseReadinessGate {
  if (!value || typeof value !== "object") return false;

  const gate = value as Partial<ReleaseReadinessGate>;
  return (
    typeof gate.id === "string" &&
    typeof gate.label === "string" &&
    ["ready", "warning", "blocked"].includes(String(gate.status)) &&
    typeof gate.detail === "string" &&
    typeof gate.nextStep === "string"
  );
}
