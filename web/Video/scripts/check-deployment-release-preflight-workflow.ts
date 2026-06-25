import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ReleaseEvidenceSummary } from "../src/lib/product/release-evidence";
import { createDeploymentReleasePreflight } from "../src/lib/product/deployment-release-preflight";

const missingPreflight = createDeploymentReleasePreflight({
  vercelLinked: false,
  deploymentUrlCaptured: false,
  deploymentScreenshotCaptured: false,
  evidenceSummary: summary("missing", "missing"),
});

assert.equal(missingPreflight.status, "missing");
assert.equal(missingPreflight.steps.length, 5);
assert.deepEqual(
  missingPreflight.steps.map((step) => step.id),
  ["hosting-project", "release-batch", "deployed-url", "deployed-screenshot", "release-evidence"],
);
assert.match(missingPreflight.summary, /linked hosting project/);

const stalePreflight = createDeploymentReleasePreflight({
  vercelLinked: true,
  deploymentUrlCaptured: false,
  deploymentScreenshotCaptured: false,
  evidenceSummary: summary("stale", "ready"),
});

assert.equal(stalePreflight.status, "stale");
assert.equal(stalePreflight.steps.find((step) => step.id === "hosting-project")?.status, "ready");
assert.equal(stalePreflight.steps.find((step) => step.id === "deployed-url")?.status, "stale");
assert.match(stalePreflight.summary, /refreshed/);

const envProofPreflight = createDeploymentReleasePreflight({
  vercelLinked: true,
  deploymentUrlCaptured: true,
  deploymentScreenshotCaptured: true,
  evidenceSummary: summary("missing", "missing"),
});

assert.equal(envProofPreflight.status, "ready");
assert.equal(envProofPreflight.steps.every((step) => step.status === "ready"), true);

const moduleSource = read("src/lib/product/deployment-release-preflight.ts");
assert.match(moduleSource, /createDeploymentReleasePreflight/);
assert.match(moduleSource, /hosting-project/);
assert.match(moduleSource, /release-batch/);
assert.match(moduleSource, /deployed-url/);
assert.match(moduleSource, /deployed-screenshot/);
assert.match(moduleSource, /release-evidence/);
assert.doesNotMatch(moduleSource, /Kapwing/);

const cardSource = read("src/features/settings/components/release-readiness-card.tsx");
assert.match(cardSource, /createDeploymentReleasePreflight/);
assert.match(cardSource, /Deployment preflight/);
assert.match(cardSource, /deploymentPreflight\.steps/);

const platformCapabilities = read("src/lib/product/capabilities/platform.ts");
assert.match(platformCapabilities, /id: "deployment-screenshot"/);
assert.match(platformCapabilities, /status: "ready"/);
assert.match(platformCapabilities, /node_repl screenshot artifact/);

console.log("Deployment release preflight workflow checks passed.");

function summary(deploymentUrlStatus: "ready" | "missing" | "stale", deploymentScreenshotStatus: "ready" | "missing" | "stale"): ReleaseEvidenceSummary {
  const requirements = [
    {
      id: "deployment-url" as const,
      label: "Deployment URL",
      status: deploymentUrlStatus,
      detail: `${deploymentUrlStatus} deployment URL.`,
    },
    {
      id: "deployment-screenshot" as const,
      label: "Screenshot proof",
      status: deploymentScreenshotStatus,
      detail: `${deploymentScreenshotStatus} screenshot proof.`,
    },
    {
      id: "desktop-proof" as const,
      label: "Desktop proof",
      status: "missing" as const,
      detail: "Desktop proof is not part of deployment preflight.",
    },
  ];
  const readyCount = requirements.filter((requirement) => requirement.status === "ready").length;

  return {
    score: Math.round((readyCount / requirements.length) * 100),
    status: readyCount === requirements.length ? "ready" : "missing",
    readyCount,
    total: requirements.length,
    requirements,
  };
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
