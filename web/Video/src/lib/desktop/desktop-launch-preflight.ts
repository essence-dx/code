import type { DesktopLaunchProofSummary, DesktopLaunchProofStatus } from "@/lib/desktop/desktop-launch-proof";

export interface DesktopLaunchPreflightStep {
  id: string;
  label: string;
  status: DesktopLaunchProofStatus;
  detail: string;
}

export interface DesktopLaunchPreflight {
  status: DesktopLaunchProofStatus;
  summary: string;
  steps: DesktopLaunchPreflightStep[];
}

export function createDesktopLaunchPreflight(proof: DesktopLaunchProofSummary): DesktopLaunchPreflight {
  if (proof.status === "ready") {
    return {
      status: "ready",
      summary: "Desktop launch proof is complete for the required import, persistence, recovery, and export workflow.",
      steps: readySteps(),
    };
  }

  const missingLabels = proof.requirements
    .filter((requirement) => requirement.status === "missing" || requirement.status === "failed")
    .map((requirement) => requirement.label.toLowerCase());
  const missingSummary = missingLabels.length ? ` Missing: ${missingLabels.slice(0, 4).join(", ")}${missingLabels.length > 4 ? ", ..." : ""}.` : "";

  return {
    status: proof.status,
    summary: `Real desktop launch proof still needs a Tauri session with local file import, reopen, media recovery, and native export save.${missingSummary}`,
    steps: [
      {
        id: "launch-desktop",
        label: "Launch desktop app",
        status: proof.missingCount === proof.total ? "missing" : proof.status,
        detail: "Open the Tauri desktop app so checks run with native file and storage permissions.",
      },
      {
        id: "import-local-media",
        label: "Import local media",
        status: requirementStatus(proof, ["file-backed-media", "media-library"]),
        detail: "Import a local video or audio file and confirm it reopens from desktop-backed storage.",
      },
      {
        id: "reopen-project",
        label: "Reopen project",
        status: requirementStatus(proof, ["local-project-persistence", "desktop-storage"]),
        detail: "Save a local project, reopen it, and verify the media remains connected.",
      },
      {
        id: "save-native-export",
        label: "Save native export",
        status: requirementStatus(proof, ["native-media-engine", "native-render-smoke", "native-export-output", "render-spool"]),
        detail: "Create a native export output and save the evidence packet from Settings.",
      },
    ],
  };
}

function readySteps(): DesktopLaunchPreflightStep[] {
  return [
    {
      id: "launch-desktop",
      label: "Launch desktop app",
      status: "ready",
      detail: "Desktop runtime evidence is present.",
    },
    {
      id: "import-local-media",
      label: "Import local media",
      status: "ready",
      detail: "File-backed media import and recovery evidence is present.",
    },
    {
      id: "reopen-project",
      label: "Reopen project",
      status: "ready",
      detail: "Project persistence evidence is present.",
    },
    {
      id: "save-native-export",
      label: "Save native export",
      status: "ready",
      detail: "Native export output evidence is present.",
    },
  ];
}

function requirementStatus(proof: DesktopLaunchProofSummary, ids: string[]): DesktopLaunchProofStatus {
  const requirements = proof.requirements.filter((requirement) => ids.includes(requirement.id));
  if (!requirements.length || requirements.some((requirement) => requirement.status === "missing")) return "missing";
  if (requirements.some((requirement) => requirement.status === "failed")) return "failed";
  if (requirements.some((requirement) => requirement.status === "limited")) return "limited";
  return "ready";
}
