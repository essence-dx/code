import type { ProductReadinessReport } from "@/lib/product/capability-summary";

export type ReleaseGateStatus = "ready" | "warning" | "blocked";

export interface ReleaseReadinessGate {
  id: string;
  label: string;
  status: ReleaseGateStatus;
  detail: string;
  nextStep: string;
}

export interface ReleaseReadinessInput {
  productReport: ProductReadinessReport;
  textAiConfigured: boolean;
  imageGenerationConfigured: boolean;
  databaseConfigured: boolean;
  vercelLinked: boolean;
  deploymentUrlCaptured: boolean;
  deploymentScreenshotCaptured: boolean;
  desktopLaunchVerified: boolean;
}

export interface ReleaseReadinessReport {
  score: number;
  status: ReleaseGateStatus;
  summary: string;
  gates: ReleaseReadinessGate[];
  nextGate: ReleaseReadinessGate | null;
}

const releaseGateWeights: Record<ReleaseGateStatus, number> = {
  ready: 1,
  warning: 0.6,
  blocked: 0,
};

export function createReleaseReadinessReport(input: ReleaseReadinessInput): ReleaseReadinessReport {
  const gates: ReleaseReadinessGate[] = [
    productCapabilityGate(input.productReport),
    desktopLaunchGate(input.desktopLaunchVerified),
    deploymentGate(input.vercelLinked, input.deploymentUrlCaptured, input.deploymentScreenshotCaptured),
    aiProviderGate(input.textAiConfigured, input.imageGenerationConfigured),
    databaseGate(input.databaseConfigured),
  ];
  const score = Math.round((gates.reduce((sum, gate) => sum + releaseGateWeights[gate.status], 0) / gates.length) * 100);
  const status = gates.some((gate) => gate.status === "blocked") ? "blocked" : gates.some((gate) => gate.status === "warning") ? "warning" : "ready";
  const nextGate = gates.find((gate) => gate.status === "blocked") ?? gates.find((gate) => gate.status === "warning") ?? null;

  return {
    score,
    status,
    gates,
    nextGate,
    summary: releaseSummary(status, score, nextGate),
  };
}

function productCapabilityGate(report: ProductReadinessReport): ReleaseReadinessGate {
  const status: ReleaseGateStatus = report.score >= 80 && report.missing === 0 ? "ready" : "blocked";

  return {
    id: "product-capabilities",
    label: "Capability baseline",
    status,
    detail: `${report.score}/100 readiness across ${report.total} tracked capabilities; ${report.missing} missing and ${report.partial} partial.`,
    nextStep: status === "ready" ? "Keep capability evidence current before release." : "Close missing capabilities or explicitly mark provider-gated items before a production release.",
  };
}

function desktopLaunchGate(desktopLaunchVerified: boolean): ReleaseReadinessGate {
  return {
    id: "desktop-launch",
    label: "Desktop launch proof",
    status: desktopLaunchVerified ? "ready" : "blocked",
    detail: desktopLaunchVerified
      ? "A real desktop launch has been marked verified for this release."
      : "Real desktop import, persistence, media recovery, and native export save still need launch proof.",
    nextStep: desktopLaunchVerified ? "Attach the saved desktop evidence packet to release notes." : "Run the desktop app and capture the local file/import/export workflow evidence.",
  };
}

function deploymentGate(vercelLinked: boolean, deploymentUrlCaptured: boolean, deploymentScreenshotCaptured: boolean): ReleaseReadinessGate {
  if (deploymentUrlCaptured && deploymentScreenshotCaptured) {
    return {
      id: "deployment-screenshot",
      label: "Deployment screenshot",
      status: "ready",
      detail: "A deployed app URL and deployed screenshot proof are present for this release.",
      nextStep: "Keep the deployment URL and screenshot proof with release notes.",
    };
  }

  const missingProof = deploymentUrlCaptured ? "deployed screenshot proof is still missing" : deploymentScreenshotCaptured ? "deployed app URL proof is still missing" : "deployed URL and screenshot proof are still missing";

  return {
    id: "deployment-screenshot",
    label: "Deployment screenshot",
    status: "blocked",
    detail: vercelLinked ? `Vercel is linked, but ${missingProof}.` : `Vercel project linkage or ${missingProof}.`,
    nextStep: "Deploy only after a larger feature batch, then capture and save deployed UI evidence.",
  };
}

function aiProviderGate(textAiConfigured: boolean, imageGenerationConfigured: boolean): ReleaseReadinessGate {
  const status: ReleaseGateStatus = textAiConfigured && imageGenerationConfigured ? "ready" : textAiConfigured || imageGenerationConfigured ? "warning" : "blocked";

  return {
    id: "ai-providers",
    label: "AI provider coverage",
    status,
    detail:
      textAiConfigured && imageGenerationConfigured
        ? "Text and image AI routes have provider configuration."
        : textAiConfigured
          ? "Text AI is configured; image generation and editing need gateway configuration."
          : imageGenerationConfigured
            ? "Image AI is configured; text editing needs provider configuration."
            : "Text and image AI routes need provider configuration.",
    nextStep: status === "ready" ? "Run targeted AI workflow checks after provider changes." : "Configure the missing provider path or keep affected actions visibly unavailable.",
  };
}

function databaseGate(databaseConfigured: boolean): ReleaseReadinessGate {
  return {
    id: "database",
    label: "Auth and metadata database",
    status: databaseConfigured ? "ready" : "warning",
    detail: databaseConfigured ? "Turso database environment is configured." : "Turso database environment is not present in this process.",
    nextStep: databaseConfigured ? "Run migrations before release when schema changes." : "Pull or set Turso environment variables before web release verification.",
  };
}

function releaseSummary(status: ReleaseGateStatus, score: number, nextGate: ReleaseReadinessGate | null) {
  if (status === "ready") return `Release gate is ready at ${score}/100.`;
  if (status === "warning") return `Release gate is at ${score}/100 with warnings; next checkpoint is ${nextGate?.label ?? "provider evidence"}.`;
  return `Release gate is blocked at ${score}/100; next checkpoint is ${nextGate?.label ?? "release proof"}.`;
}
