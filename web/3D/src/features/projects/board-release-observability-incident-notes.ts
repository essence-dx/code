import { createHash } from "node:crypto";
import type {
  BoardReleaseObservabilityEventHealthMonitor,
  BoardReleaseObservabilityEventHealthReport,
  BoardReleaseObservabilityEventHealthSeverity,
  BoardReleaseObservabilityEventHealthStatus,
} from "@/features/projects/board-release-observability-event-health";
import type { ProjectIncidentHistory } from "@/features/projects/project-incident-history";

export type BoardReleaseObservabilityIncidentNoteStatus = "blocked" | "closed" | "open" | "watch";
export type BoardReleaseObservabilityIncidentNoteSeverity = BoardReleaseObservabilityEventHealthSeverity;

export interface BoardReleaseObservabilityIncidentNote {
  dueAt: string;
  evidenceHash: string | null;
  noteHash: string;
  noteId: string;
  ownerEmail: string;
  ownerRole: string;
  releasePromotionId: string | null;
  severity: BoardReleaseObservabilityIncidentNoteSeverity;
  source: string;
  status: BoardReleaseObservabilityIncidentNoteStatus;
  summary: string;
  title: string;
  workspaceId: string;
}

export interface BoardReleaseObservabilityIncidentNotesReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  notes: BoardReleaseObservabilityIncidentNote[];
  summary: {
    blockedCount: number;
    criticalCount: number;
    dueSoonCount: number;
    noteCount: number;
    nextAction: string;
    openCount: number;
    status: BoardReleaseObservabilityIncidentNoteStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseObservabilityIncidentNotesReportInput {
  eventHealth: BoardReleaseObservabilityEventHealthReport;
  generatedAt?: string;
  incidentHistory?: ProjectIncidentHistory;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseObservabilityIncidentNoteStatus, number> = {
  blocked: 0,
  open: 1,
  watch: 2,
  closed: 3,
};

const ownerBySignal: Record<BoardReleaseObservabilityEventHealthMonitor["signal"], { email: string; role: string }> = {
  "delayed-retry": { email: "release-ops@essence.local", role: "Release operations" },
  "stale-packet": { email: "evidence-owner@essence.local", role: "Evidence owner" },
  "stuck-acknowledgement": { email: "board-secretary@essence.local", role: "Board secretary" },
  "unresolved-variance": { email: "governance-lead@essence.local", role: "Governance lead" },
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function addHours(value: string, hours: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setUTCHours(date.getUTCHours() + hours);

  return date.toISOString();
}

function dueWindowHours(severity: BoardReleaseObservabilityIncidentNoteSeverity) {
  return severity === "critical" ? 24 : severity === "warning" ? 72 : 120;
}

function noteStatusFromMonitor(status: BoardReleaseObservabilityEventHealthStatus): BoardReleaseObservabilityIncidentNoteStatus {
  if (status === "blocked") {
    return "blocked";
  }

  return status === "watch" ? "watch" : "closed";
}

function createMonitorNote(input: {
  generatedAt: string;
  monitor: BoardReleaseObservabilityEventHealthMonitor;
  workspaceId: string;
}): BoardReleaseObservabilityIncidentNote {
  const owner = ownerBySignal[input.monitor.signal];
  const status = noteStatusFromMonitor(input.monitor.status);
  const noteId = `board-release-observability-incident-note:${slug(input.workspaceId)}:${input.monitor.signal}`;
  const dueAt = addHours(input.generatedAt, dueWindowHours(input.monitor.severity));
  const summary = input.monitor.nextAction;
  const core = {
    dueAt,
    evidenceHash: input.monitor.evidenceHash,
    noteId,
    ownerEmail: owner.email,
    releasePromotionId: input.monitor.releasePromotionId,
    severity: input.monitor.severity,
    status,
    workspaceId: input.workspaceId,
  };

  return {
    dueAt,
    evidenceHash: input.monitor.evidenceHash,
    noteHash: sha256(core),
    noteId,
    ownerEmail: owner.email,
    ownerRole: owner.role,
    releasePromotionId: input.monitor.releasePromotionId,
    severity: input.monitor.severity,
    source: input.monitor.signal,
    status,
    summary,
    title: input.monitor.title,
    workspaceId: input.workspaceId,
  };
}

function createIncidentHistoryNotes(input: {
  generatedAt: string;
  incidentHistory: ProjectIncidentHistory | undefined;
  workspaceId: string;
}) {
  return (input.incidentHistory?.incidents ?? []).slice(0, 4).map((incident): BoardReleaseObservabilityIncidentNote => {
    const severity: BoardReleaseObservabilityIncidentNoteSeverity = incident.severity === "critical" ? "critical" : "warning";
    const dueAt = addHours(input.generatedAt, dueWindowHours(severity));
    const noteId = `board-release-observability-incident-note:${slug(input.workspaceId)}:project:${slug(incident.id)}`;
    const core = {
      dueAt,
      noteId,
      ownerEmail: "incident-response@essence.local",
      projectId: incident.projectId,
      severity,
      status: incident.severity === "critical" ? "blocked" : "open",
      workspaceId: input.workspaceId,
    };

    return {
      dueAt,
      evidenceHash: incident.id,
      noteHash: sha256(core),
      noteId,
      ownerEmail: "incident-response@essence.local",
      ownerRole: "Incident response",
      releasePromotionId: null,
      severity,
      source: incident.kind,
      status: incident.severity === "critical" ? "blocked" : "open",
      summary: incident.message,
      title: incident.title,
      workspaceId: input.workspaceId,
    };
  });
}

function createCsv(notes: BoardReleaseObservabilityIncidentNote[]) {
  const header = ["note_id", "title", "status", "severity", "owner_role", "owner_email", "due_at", "release_promotion_id", "source", "evidence_hash", "note_hash", "summary"];
  const body = notes.map((note) =>
    [
      note.noteId,
      note.title,
      note.status,
      note.severity,
      note.ownerRole,
      note.ownerEmail,
      note.dueAt,
      note.releasePromotionId,
      note.source,
      note.evidenceHash,
      note.noteHash,
      note.summary,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(notes: BoardReleaseObservabilityIncidentNote[], generatedAt: string): BoardReleaseObservabilityIncidentNotesReport["summary"] {
  const now = new Date(generatedAt).getTime();
  const dueSoonCount = notes.filter((note) => {
    const dueAt = new Date(note.dueAt).getTime();

    return !Number.isNaN(now) && !Number.isNaN(dueAt) && dueAt - now <= 48 * 60 * 60 * 1000 && note.status !== "closed";
  }).length;
  const firstAction = notes.find((note) => note.status === "blocked" || note.status === "open" || note.status === "watch");

  return {
    blockedCount: notes.filter((note) => note.status === "blocked").length,
    criticalCount: notes.filter((note) => note.severity === "critical").length,
    dueSoonCount,
    noteCount: notes.length,
    nextAction: firstAction ? `${firstAction.ownerRole}: ${firstAction.summary}` : "No release observability incident notes require follow-up.",
    openCount: notes.filter((note) => note.status === "open").length,
    status: notes.reduce<BoardReleaseObservabilityIncidentNoteStatus>((worst, note) => (statusRank[note.status] < statusRank[worst] ? note.status : worst), "closed"),
    watchCount: notes.filter((note) => note.status === "watch").length,
  };
}

function createJson(input: {
  generatedAt: string;
  notes: BoardReleaseObservabilityIncidentNote[];
  summary: BoardReleaseObservabilityIncidentNotesReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      notes: input.notes,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseObservabilityIncidentNotesReport(
  input: CreateBoardReleaseObservabilityIncidentNotesReportInput,
): BoardReleaseObservabilityIncidentNotesReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.eventHealth.workspaceId;
  const monitorNotes = input.eventHealth.monitors.map((monitor) => createMonitorNote({ generatedAt, monitor, workspaceId }));
  const incidentNotes = createIncidentHistoryNotes({
    generatedAt,
    incidentHistory: input.incidentHistory,
    workspaceId,
  });
  const notes = [...monitorNotes, ...incidentNotes].sort(
    (first, second) => statusRank[first.status] - statusRank[second.status] || first.dueAt.localeCompare(second.dueAt) || first.title.localeCompare(second.title),
  );
  const summary = summarize(notes, generatedAt);
  const csvContent = createCsv(notes);
  const jsonContent = createJson({
    generatedAt,
    notes,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-observability-incident-notes-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    notes,
    summary,
    workspaceId,
  };
}
