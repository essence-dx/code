import type { ExportJob } from "@/lib/editor/types";
import type { ProjectLibraryHealthReport } from "@/lib/projects/project-health";

export type OperationalReadinessStatus = "ready" | "attention" | "blocked";

export interface OperationalReadinessSignal {
  id: "project-health" | "media" | "exports" | "account" | "ai-limits";
  label: string;
  status: OperationalReadinessStatus;
  detail: string;
  count?: number;
}

export interface OperationalReadinessInput {
  projectLibrary: ProjectLibraryHealthReport | null;
  localProjectStatus: "loading" | "ready" | "failed";
  exportJobs: ExportJob[];
  hasOnlineActions: boolean;
  isSignedIn: boolean;
  aiConfigured: boolean;
  dailyAiRemaining: number | null;
}

export interface OperationalReadinessReport {
  score: number;
  status: OperationalReadinessStatus;
  label: string;
  signals: OperationalReadinessSignal[];
}

export function createOperationalReadinessReport(input: OperationalReadinessInput): OperationalReadinessReport {
  const signals: OperationalReadinessSignal[] = [
    projectHealthSignal(input.projectLibrary, input.localProjectStatus),
    mediaSignal(input.projectLibrary, input.localProjectStatus),
    exportSignal(input.exportJobs),
    accountSignal(input.hasOnlineActions, input.isSignedIn),
    aiLimitSignal(input.aiConfigured, input.dailyAiRemaining),
  ];
  const blocked = signals.filter((signal) => signal.status === "blocked").length;
  const attention = signals.filter((signal) => signal.status === "attention").length;
  const score = Math.round((signals.reduce((total, signal) => total + statusWeight(signal.status), 0) / signals.length) * 100);

  return {
    score,
    status: blocked > 0 ? "blocked" : attention > 0 ? "attention" : "ready",
    label: blocked > 0 ? "Blocked" : attention > 0 ? "Attention" : "Ready",
    signals,
  };
}

function projectHealthSignal(report: ProjectLibraryHealthReport | null, status: OperationalReadinessInput["localProjectStatus"]): OperationalReadinessSignal {
  if (status === "failed") {
    return {
      id: "project-health",
      label: "Project health",
      status: "blocked",
      detail: "Local projects could not be loaded.",
    };
  }

  if (status === "loading" || !report) {
    return {
      id: "project-health",
      label: "Project health",
      status: "attention",
      detail: "Checking local projects.",
    };
  }

  if (report.blocked > 0) {
    return {
      id: "project-health",
      label: "Project health",
      status: "blocked",
      detail: `${report.blocked} ${report.blocked === 1 ? "project is" : "projects are"} blocked.`,
      count: report.blocked,
    };
  }

  if (report.attention > 0) {
    return {
      id: "project-health",
      label: "Project health",
      status: "attention",
      detail: `${report.attention} ${report.attention === 1 ? "project needs" : "projects need"} review.`,
      count: report.attention,
    };
  }

  return {
    id: "project-health",
    label: "Project health",
    status: "ready",
    detail: report.total > 0 ? `${report.ready}/${report.total} local projects are ready.` : "No local project issues.",
  };
}

function mediaSignal(report: ProjectLibraryHealthReport | null, status: OperationalReadinessInput["localProjectStatus"]): OperationalReadinessSignal {
  if (status === "failed") {
    return {
      id: "media",
      label: "Missing media",
      status: "blocked",
      detail: "Media health could not be checked.",
    };
  }

  if (!report) {
    return {
      id: "media",
      label: "Missing media",
      status: "attention",
      detail: "Checking media references.",
    };
  }

  if (report.reconnectRequiredMedia > 0) {
    return {
      id: "media",
      label: "Missing media",
      status: "blocked",
      detail: `${report.reconnectRequiredMedia} ${report.reconnectRequiredMedia === 1 ? "asset needs" : "assets need"} reconnecting.`,
      count: report.reconnectRequiredMedia,
    };
  }

  if (report.recoverableMedia > 0) {
    return {
      id: "media",
      label: "Missing media",
      status: "attention",
      detail: `${report.recoverableMedia} ${report.recoverableMedia === 1 ? "asset can" : "assets can"} recover on open.`,
      count: report.recoverableMedia,
    };
  }

  return {
    id: "media",
    label: "Missing media",
    status: "ready",
    detail: "No missing local media detected.",
  };
}

function exportSignal(exportJobs: ExportJob[]): OperationalReadinessSignal {
  const failed = exportJobs.filter((job) => job.status === "failed").length;
  const active = exportJobs.filter((job) => job.status === "queued" || job.status === "rendering").length;

  if (failed > 0) {
    return {
      id: "exports",
      label: "Export queue",
      status: "blocked",
      detail: `${failed} ${failed === 1 ? "export has" : "exports have"} failed.`,
      count: failed,
    };
  }

  if (active > 0) {
    return {
      id: "exports",
      label: "Export queue",
      status: "attention",
      detail: `${active} ${active === 1 ? "export is" : "exports are"} still running or queued.`,
      count: active,
    };
  }

  return {
    id: "exports",
    label: "Export queue",
    status: "ready",
    detail: exportJobs.length > 0 ? "No failed export jobs in the current session." : "No export queue issues.",
  };
}

function accountSignal(hasOnlineActions: boolean, isSignedIn: boolean): OperationalReadinessSignal {
  if (!hasOnlineActions) {
    return {
      id: "account",
      label: "Account and sync",
      status: "blocked",
      detail: "Online account actions are unavailable in this runtime.",
    };
  }

  if (!isSignedIn) {
    return {
      id: "account",
      label: "Account and sync",
      status: "attention",
      detail: "Sign in to sync metadata, usage, and review history.",
    };
  }

  return {
    id: "account",
    label: "Account and sync",
    status: "ready",
    detail: "Account metadata and online actions are available.",
  };
}

function aiLimitSignal(aiConfigured: boolean, dailyAiRemaining: number | null): OperationalReadinessSignal {
  if (!aiConfigured) {
    return {
      id: "ai-limits",
      label: "AI limits",
      status: "blocked",
      detail: "Creative AI needs a configured provider before generation actions can run.",
    };
  }

  if (dailyAiRemaining === 0) {
    return {
      id: "ai-limits",
      label: "AI limits",
      status: "attention",
      detail: "Daily AI limit is used up.",
    };
  }

  return {
    id: "ai-limits",
    label: "AI limits",
    status: "ready",
    detail: dailyAiRemaining === null ? "AI is configured; sign in to see remaining daily usage." : `${dailyAiRemaining} daily AI actions remain.`,
    count: dailyAiRemaining ?? undefined,
  };
}

function statusWeight(status: OperationalReadinessStatus) {
  if (status === "ready") return 1;
  if (status === "attention") return 0.55;
  return 0;
}
