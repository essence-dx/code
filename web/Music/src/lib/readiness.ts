import { getAiRuntimeConfig, getAiStatus } from "@/lib/ai/config";
import { envValue } from "@/lib/env";
import { maxCloudAudioBytes } from "@/lib/library/limits";

export type ReadinessState = "ready" | "warning" | "blocked";
export type ReadinessTier = "core" | "enhancement";

export type ReadinessCheck = {
  detail: string;
  id: string;
  label: string;
  state: ReadinessState;
  tier: ReadinessTier;
};

export function getReadinessChecks(): ReadinessCheck[] {
  const aiConfig = getAiRuntimeConfig();
  const aiStatus = getAiStatus();
  const providerCapabilityScore = aiStatus.capabilitySummary.score;

  return [
    {
      id: "database",
      label: "Database",
      state: envValue("TURSO_DATABASE_URL") ? "ready" : "blocked",
      tier: "core",
      detail: envValue("TURSO_DATABASE_URL")
        ? "Cloud library storage is connected."
        : "Cloud library storage needs production credentials.",
    },
    {
      id: "auth",
      label: "Auth",
      state:
        envValue("BETTER_AUTH_SECRET") && envValue("BETTER_AUTH_URL")
          ? "ready"
          : "blocked",
      tier: "core",
      detail:
        envValue("BETTER_AUTH_SECRET") && envValue("BETTER_AUTH_URL")
          ? "Account access is configured."
          : "Sign-in needs production credentials.",
    },
    {
      id: "text-ai",
      label: "Text AI",
      state: aiStatus.text ? "ready" : "warning",
      tier: "core",
      detail: aiStatus.text
        ? "Writing assistance is connected."
        : "Writing assistance is not connected yet.",
    },
    {
      id: "image-ai",
      label: "Image AI",
      state: aiStatus.image ? "ready" : "warning",
      tier: "enhancement",
      detail: aiStatus.image
        ? "Cover image generation is connected."
        : "Cover image generation is not connected yet.",
    },
    {
      id: "audio-provider",
      label: "Music Generation",
      state: aiStatus.audio ? "ready" : "warning",
      tier: "enhancement",
      detail: aiStatus.audio
        ? "Song generation is connected."
        : "Song generation is waiting on a real music generation service.",
    },
    {
      id: "audio-provider-health",
      label: "Music Service Health",
      state: aiConfig.audioProviderHealthUrl ? "ready" : "warning",
      tier: "enhancement",
      detail: aiConfig.audioProviderHealthUrl
        ? "Music generation health checks are connected."
        : "Music generation health checks are not connected.",
    },
    {
      id: "audio-callback",
      label: "Music Callback",
      state:
        aiConfig.audioProviderUrl && aiConfig.audioProviderWebhookSecret
          ? "ready"
          : "warning",
      tier: "enhancement",
      detail:
        aiConfig.audioProviderUrl && aiConfig.audioProviderWebhookSecret
          ? "Song generation callbacks are protected."
          : "Song generation callbacks need a production secret before use.",
    },
    {
      id: "small-audio-storage",
      label: "Small Audio Storage",
      state: "ready",
      tier: "core",
      detail: `Synced audio up to ${Math.round(
        maxCloudAudioBytes / 1024 / 1024,
      )} MB can be shared from cloud storage.`,
    },
    {
      id: "large-audio-storage",
      label: "Large Audio Storage",
      state: envValue("BLOB_READ_WRITE_TOKEN") ? "ready" : "warning",
      tier: "enhancement",
      detail: envValue("BLOB_READ_WRITE_TOKEN")
        ? "Large audio uploads are connected."
        : "Large audio uploads need production storage.",
    },
    {
      id: "provider-capabilities",
      label: "Provider Capabilities",
      state: providerCapabilityScore >= 70 ? "ready" : "warning",
      tier: "enhancement",
      detail: `${aiStatus.capabilitySummary.ready}/${aiStatus.capabilitySummary.total} provider-backed capabilities are configured.`,
    },
    {
      id: "scheduled-monitor",
      label: "Scheduled Monitor",
      state: envValue("CRON_SECRET") ? "ready" : "warning",
      tier: "enhancement",
      detail: envValue("CRON_SECRET")
        ? "Production readiness monitoring is protected."
        : "Production readiness monitoring needs a cron secret.",
    },
    {
      id: "deployment",
      label: "Deployment",
      state: process.env.VERCEL ? "ready" : "warning",
      tier: "core",
      detail: process.env.VERCEL
        ? "Running on the production host."
        : "Production deployment has not been detected in this environment.",
    },
  ];
}

export function summarizeReadiness(checks: ReadinessCheck[]) {
  const blocked = checks.filter((check) => check.state === "blocked").length;
  const warning = checks.filter((check) => check.state === "warning").length;
  const ready = checks.filter((check) => check.state === "ready").length;
  const coreChecks = checks.filter((check) => check.tier === "core");
  const enhancementChecks = checks.filter(
    (check) => check.tier === "enhancement",
  );
  const coreScore = scoreChecks(coreChecks);
  const fullScore = scoreChecks(checks);

  return {
    blocked,
    coreBlocked: coreChecks.filter((check) => check.state === "blocked").length,
    coreReady: coreChecks.filter((check) => check.state === "ready").length,
    coreScore,
    coreTotal: coreChecks.length,
    enhancementReady: enhancementChecks.filter(
      (check) => check.state === "ready",
    ).length,
    enhancementTotal: enhancementChecks.length,
    fullScore,
    ready,
    score: coreScore,
    total: checks.length,
    warning,
  };
}

function scoreChecks(checks: ReadinessCheck[]) {
  if (!checks.length) {
    return 0;
  }

  const ready = checks.filter((check) => check.state === "ready").length;
  return Math.round((ready / checks.length) * 100);
}
