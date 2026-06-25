"use client";

import { runDesktopDiagnostics, type DesktopDiagnosticReport, type DesktopDiagnosticStatus, type DesktopDiagnosticStep } from "@/lib/desktop/desktop-diagnostics";
import { verifyDesktopLaunchSession } from "@/lib/desktop/desktop-launch-session";
import { createProject } from "@/lib/editor/factory";
import { deleteLocalProject, loadLocalProject, permanentlyDeleteLocalProject, saveLocalProject } from "@/lib/projects/local-project-store";
import { isDesktopRuntime } from "@/lib/runtime/client-api";

export interface DesktopVerificationStep extends DesktopDiagnosticStep {
  source: "project" | "runtime" | "workflow";
}

export interface DesktopVerificationReport {
  status: DesktopDiagnosticStatus;
  checkedAt: number;
  steps: DesktopVerificationStep[];
  diagnostics: DesktopDiagnosticReport;
  workflow: DesktopDiagnosticReport;
}

export async function runDesktopVerification(): Promise<DesktopVerificationReport> {
  const [launchStep, projectStep, diagnostics, workflow] = await Promise.all([
    verifyDesktopLaunchSession(),
    verifyLocalProjectPersistence(),
    runDesktopDiagnostics(),
    runDesktopWorkflowSmoke(),
  ]);
  const runtimeSteps = diagnostics.steps.map((step): DesktopVerificationStep => ({ ...step, source: "runtime" }));
  const workflowSteps = workflow.steps.map((step): DesktopVerificationStep => ({ ...step, source: "workflow" }));
  const steps = [launchStep, projectStep, ...runtimeSteps, ...workflowSteps];

  return {
    status: combineStatuses(steps.map((step) => step.status)),
    checkedAt: Math.max(Date.now(), diagnostics.checkedAt, workflow.checkedAt),
    steps,
    diagnostics,
    workflow,
  };
}

async function runDesktopWorkflowSmoke(): Promise<DesktopDiagnosticReport> {
  if (!isDesktopRuntime()) {
    return {
      status: "limited",
      checkedAt: Date.now(),
      steps: [
        {
          id: "desktop-workflow-runtime",
          label: "Desktop workflow",
          status: "limited",
          detail: "Open the desktop app to verify file-backed media and export output.",
        },
      ],
    };
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<DesktopDiagnosticReport>("run_desktop_workflow_smoke");
  } catch {
    return {
      status: "failed",
      checkedAt: Date.now(),
      steps: [
        {
          id: "desktop-workflow",
          label: "Desktop workflow",
          status: "failed",
          detail: "Desktop workflow checks could not run in this session.",
        },
      ],
    };
  }
}

async function verifyLocalProjectPersistence(): Promise<DesktopVerificationStep> {
  const project = createProject("Desktop verification", "16:9");

  try {
    const saved = await saveLocalProject(project, []);
    const loaded = await loadLocalProject(project.id);

    if (!loaded || loaded.project.id !== saved.project.id || loaded.project.formatVersion !== saved.project.formatVersion) {
      await cleanupVerificationProject(project.id);
      return {
        id: "local-project-persistence",
        label: "Project save and reopen",
        source: "project",
        status: "failed",
        detail: "A saved project could not be reopened from local storage.",
      };
    }

    const cleanedUp = await cleanupVerificationProject(project.id);

    return {
      id: "local-project-persistence",
      label: "Project save and reopen",
      source: "project",
      status: "ready",
      detail: cleanedUp
        ? "A local project was saved, reopened, validated, and cleaned up."
        : "A local project was saved, reopened, and validated; temporary cleanup needs another pass.",
    };
  } catch {
    await cleanupVerificationProject(project.id);
    return {
      id: "local-project-persistence",
      label: "Project save and reopen",
      source: "project",
      status: "failed",
      detail: "Local project persistence is not available in this session.",
    };
  }
}

async function cleanupVerificationProject(projectId: string) {
  try {
    await deleteLocalProject(projectId);
    await permanentlyDeleteLocalProject(projectId);
    return true;
  } catch {
    return false;
  }
}

function combineStatuses(statuses: DesktopDiagnosticStatus[]): DesktopDiagnosticStatus {
  if (statuses.some((status) => status === "failed")) return "failed";
  if (statuses.some((status) => status === "limited")) return "limited";
  return "ready";
}
