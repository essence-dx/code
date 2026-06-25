import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createProductReadinessReport } from "../src/lib/product/capability-summary";
import { productCapabilities } from "../src/lib/product/capability-registry";
import {
  createReleaseDesktopProof,
  createReleaseEvidencePacketPayload,
  createReleaseEvidenceSummary,
  isReleaseEvidenceRequirementReady,
  isReleaseEvidenceUrl,
  isReleaseScreenshotArtifact,
  isReleaseScreenshotUrl,
  selectReleaseEvidenceFromPacket,
  selectReadyDesktopVerificationEntry,
} from "../src/lib/product/release-evidence";
import { auditReleaseEvidencePacket } from "../src/lib/product/release-evidence-audit";
import { createReleaseReadinessReport } from "../src/lib/product/release-readiness";

const { values } = parseArgs({
  options: {
    "deployment-url": { type: "string" },
    "screenshot-proof": { type: "string" },
    "desktop-evidence": { type: "string" },
    output: { type: "string", short: "o" },
    strict: { type: "boolean" },
    "allow-blocked": { type: "boolean" },
  },
});

const deploymentUrl = stringValue(values["deployment-url"]);
const rawScreenshotProof = stringValue(values["screenshot-proof"]);
const desktopEvidencePath = stringValue(values["desktop-evidence"]);
const outputPath = resolve(stringValue(values.output) || `release-evidence-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);

if (!isReleaseEvidenceUrl(deploymentUrl)) {
  throw new Error("Provide --deployment-url as an http(s) URL.");
}

const screenshotProof = normalizeScreenshotProof(rawScreenshotProof);
if (!isReleaseScreenshotUrl(screenshotProof) && !isReleaseScreenshotArtifact(screenshotProof)) {
  throw new Error("Provide --screenshot-proof as an http(s) image URL or an existing local png/jpg/webp path.");
}

const desktopVerification = desktopEvidencePath ? readReadyDesktopVerification(desktopEvidencePath) : null;
const screenshotIsUrl = isReleaseScreenshotUrl(screenshotProof);
const releaseEvidence = selectReleaseEvidenceFromPacket({
  deploymentUrl,
  deploymentScreenshotUrl: screenshotIsUrl ? screenshotProof : "",
  deploymentScreenshotArtifact: screenshotIsUrl ? "" : screenshotProof,
  ...createReleaseDesktopProof(desktopVerification),
  updatedAt: Date.now(),
});

if (!releaseEvidence) {
  throw new Error("Release evidence could not be created from the provided proof.");
}

const evidenceSummary = createReleaseEvidenceSummary(releaseEvidence);
const report = createReleaseReadinessReport({
  productReport: createProductReadinessReport(productCapabilities),
  textAiConfigured: hasAnyEnv("GROQ_API_KEY", "OPENAI_API_KEY", "AI_GATEWAY_API_KEY"),
  imageGenerationConfigured: hasAnyEnv("OPENAI_API_KEY", "AI_GATEWAY_API_KEY"),
  databaseConfigured: hasAnyEnv("TURSO_DATABASE_URL") && hasAnyEnv("TURSO_AUTH_TOKEN"),
  vercelLinked: true,
  deploymentUrlCaptured: isReleaseEvidenceRequirementReady(evidenceSummary, "deployment-url"),
  deploymentScreenshotCaptured: isReleaseEvidenceRequirementReady(evidenceSummary, "deployment-screenshot"),
  desktopLaunchVerified: isReleaseEvidenceRequirementReady(evidenceSummary, "desktop-proof"),
});
const packet = createReleaseEvidencePacketPayload(report, releaseEvidence, { desktopVerification });
const audit = auditReleaseEvidencePacket(packet);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(packet, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      output: outputPath,
      releaseScore: report.score,
      evidenceScore: evidenceSummary.score,
      auditStatus: audit.status,
      blockerCount:
        audit.errors.length +
        audit.missingRequirements.length +
        audit.staleRequirements.length +
        audit.blockedGates.length +
        audit.warningGates.length,
      desktopEvidence: Boolean(desktopVerification),
    },
    null,
    2,
  ),
);

if (values.strict === true && audit.status !== "ready" && values["allow-blocked"] !== true) {
  process.exitCode = 1;
}

function stringValue(value: string | boolean | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeScreenshotProof(value: string) {
  if (isReleaseScreenshotUrl(value)) return value;

  const path = resolve(value);
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error("Local screenshot proof must point to an existing image file.");
  }

  return path;
}

function readReadyDesktopVerification(path: string) {
  const packet = JSON.parse(readFileSync(resolve(path), "utf8")) as unknown;
  const entry = selectReadyDesktopVerificationEntry(packet);

  if (!entry) {
    throw new Error("The desktop evidence packet does not contain a ready launch proof entry.");
  }

  return entry;
}

function hasAnyEnv(...names: string[]) {
  return names.some((name) => Boolean(process.env[name]?.trim()));
}
