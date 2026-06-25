import type { ReleaseEvidenceRequirementId, ReleaseEvidenceRequirementStatus, ReleaseEvidenceSummary } from "@/lib/product/release-evidence";

export type DeploymentReleasePreflightStatus = ReleaseEvidenceRequirementStatus;

export interface DeploymentReleasePreflightInput {
  vercelLinked: boolean;
  deploymentUrlCaptured: boolean;
  deploymentScreenshotCaptured: boolean;
  evidenceSummary: ReleaseEvidenceSummary;
}

export interface DeploymentReleasePreflightStep {
  id: string;
  label: string;
  status: DeploymentReleasePreflightStatus;
  detail: string;
}

export interface DeploymentReleasePreflight {
  status: DeploymentReleasePreflightStatus;
  summary: string;
  steps: DeploymentReleasePreflightStep[];
}

export function createDeploymentReleasePreflight(input: DeploymentReleasePreflightInput): DeploymentReleasePreflight {
  const deploymentUrlStatus = proofStatus(input, "deployment-url");
  const screenshotStatus = proofStatus(input, "deployment-screenshot");
  const releasePacketStatus = combinedProofStatus([deploymentUrlStatus, screenshotStatus]);
  const steps: DeploymentReleasePreflightStep[] = [
    {
      id: "hosting-project",
      label: "Hosting project",
      status: input.vercelLinked ? "ready" : "missing",
      detail: input.vercelLinked
        ? "The project is linked to a hosting target for release deployment."
        : "Link the project to a hosting target before trying to publish release proof.",
    },
    {
      id: "release-batch",
      label: "Release batch",
      status: releasePacketStatus,
      detail:
        releasePacketStatus === "ready"
          ? "A deployed release has been captured for the current proof window."
          : "Finish a coherent feature batch and a clean typecheck before publishing a release candidate.",
    },
    {
      id: "deployed-url",
      label: "Deployed URL",
      status: deploymentUrlStatus,
      detail:
        deploymentUrlStatus === "ready"
          ? "The deployed app URL is saved for this release."
          : deploymentUrlStatus === "stale"
            ? "The saved deployed app URL should be refreshed for this release."
            : "Deploy the app after the feature batch and save the public URL.",
    },
    {
      id: "deployed-screenshot",
      label: "Deployed screenshot",
      status: screenshotStatus,
      detail:
        screenshotStatus === "ready"
          ? "A deployed UI screenshot is saved for this release."
          : screenshotStatus === "stale"
            ? "The saved deployed UI screenshot should be refreshed for this release."
            : "Capture the deployed site after publishing and save the screenshot proof URL or artifact path.",
    },
    {
      id: "release-evidence",
      label: "Release evidence",
      status: releasePacketStatus,
      detail:
        releasePacketStatus === "ready"
          ? "The deployment proof can be exported with the release evidence packet."
          : "Save both the deployed URL and screenshot proof before exporting release evidence.",
    },
  ];
  const status = combinedProofStatus(steps.map((step) => step.status));

  return {
    status,
    summary: deploymentPreflightSummary(input, status),
    steps,
  };
}

function proofStatus(input: DeploymentReleasePreflightInput, id: ReleaseEvidenceRequirementId): DeploymentReleasePreflightStatus {
  if (id === "deployment-url" && input.deploymentUrlCaptured) return "ready";
  if (id === "deployment-screenshot" && input.deploymentScreenshotCaptured) return "ready";

  return input.evidenceSummary.requirements.find((requirement) => requirement.id === id)?.status ?? "missing";
}

function combinedProofStatus(statuses: DeploymentReleasePreflightStatus[]): DeploymentReleasePreflightStatus {
  if (statuses.every((status) => status === "ready")) return "ready";
  if (statuses.some((status) => status === "stale")) return "stale";
  return "missing";
}

function deploymentPreflightSummary(input: DeploymentReleasePreflightInput, status: DeploymentReleasePreflightStatus) {
  if (status === "ready") {
    return "Deployment proof is ready for the current release window.";
  }

  if (!input.vercelLinked) {
    return "Release deployment proof still needs a linked hosting project, deployed URL, and deployed screenshot.";
  }

  if (status === "stale") {
    return "Deployment proof exists but should be refreshed before claiming this release is ready.";
  }

  return "Release deployment proof still needs a published URL and deployed UI screenshot after the next feature batch.";
}
