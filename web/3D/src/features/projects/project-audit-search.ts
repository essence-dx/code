import type { ProjectAuditCategory, ProjectAuditEvent, ProjectAuditLog, ProjectAuditStatus } from "./types";

export const projectAuditSearchCategories: ProjectAuditCategory[] = ["comments", "exports", "permissions", "publishing", "releases", "versions"];
export const projectAuditSearchStatuses: ProjectAuditStatus[] = ["danger", "warning", "success", "info"];

export type ProjectAuditExportFormat = "csv" | "json";

export interface ProjectAuditSearchFilters {
  categories: ProjectAuditCategory[];
  from: string;
  projectId: string;
  query: string;
  statuses: ProjectAuditStatus[];
  to: string;
}

export interface ProjectAuditSearchProject {
  auditLog: ProjectAuditLog;
  id: string;
  name: string;
}

export interface ProjectAuditSearchRow {
  action: string | null;
  actorEmail: string | null;
  actorName: string | null;
  category: ProjectAuditCategory;
  description: string;
  eventId: string;
  id: string;
  occurredAt: string;
  projectId: string;
  projectName: string;
  resourceId: string | null;
  resourceType: string | null;
  status: ProjectAuditStatus;
  title: string;
}

export interface ProjectAuditSearchSummary {
  categoryCounts: Record<ProjectAuditCategory, number>;
  newestAt: string | null;
  oldestAt: string | null;
  projectCount: number;
  statusCounts: Record<ProjectAuditStatus, number>;
  total: number;
}

export interface ProjectAuditSearchResult {
  filters: ProjectAuditSearchFilters;
  rows: ProjectAuditSearchRow[];
  summary: ProjectAuditSearchSummary;
}

export interface ProjectAuditExportPreset {
  description: string;
  filters: ProjectAuditSearchFilters;
  format: ProjectAuditExportFormat;
  id: string;
  label: string;
}

export interface ProjectAuditExportPayload {
  filters: ProjectAuditSearchFilters;
  generatedAt: string;
  rows: ProjectAuditSearchRow[];
  schemaVersion: 1;
  summary: ProjectAuditSearchSummary;
}

const defaultCategoryCounts: Record<ProjectAuditCategory, number> = {
  comments: 0,
  exports: 0,
  permissions: 0,
  publishing: 0,
  releases: 0,
  versions: 0,
};

const defaultStatusCounts: Record<ProjectAuditStatus, number> = {
  danger: 0,
  info: 0,
  success: 0,
  warning: 0,
};

export function createDefaultProjectAuditSearchFilters(overrides: Partial<ProjectAuditSearchFilters> = {}): ProjectAuditSearchFilters {
  return {
    categories: [],
    from: "",
    projectId: "all",
    query: "",
    statuses: [],
    to: "",
    ...overrides,
  };
}

export const projectAuditExportPresets: ProjectAuditExportPreset[] = [
  {
    description: "Warnings and blockers across the current workspace audit trail.",
    filters: createDefaultProjectAuditSearchFilters({ statuses: ["danger", "warning"] }),
    format: "json",
    id: "compliance-review-json",
    label: "Compliance review",
  },
  {
    description: "Access grants, role changes, and permission mutations for reviewer handoff.",
    filters: createDefaultProjectAuditSearchFilters({ categories: ["permissions"] }),
    format: "csv",
    id: "permissions-csv",
    label: "Permissions audit",
  },
  {
    description: "Release and publishing blockers that can delay public handoff.",
    filters: createDefaultProjectAuditSearchFilters({
      categories: ["publishing", "releases"],
      statuses: ["danger", "warning"],
    }),
    format: "json",
    id: "release-blockers-json",
    label: "Release blockers",
  },
  {
    description: "Export readiness warnings for package and embed reviews.",
    filters: createDefaultProjectAuditSearchFilters({
      categories: ["exports"],
      statuses: ["danger", "warning"],
    }),
    format: "csv",
    id: "export-readiness-csv",
    label: "Export readiness",
  },
];

function toTime(value: string) {
  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function startOfDay(value: string) {
  return value ? new Date(`${value}T00:00:00.000`).getTime() : 0;
}

function endOfDay(value: string) {
  return value ? new Date(`${value}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
}

function normalizeFilters(filters: ProjectAuditSearchFilters): ProjectAuditSearchFilters {
  return {
    categories: filters.categories.filter((category) => projectAuditSearchCategories.includes(category)),
    from: filters.from,
    projectId: filters.projectId || "all",
    query: filters.query.trim(),
    statuses: filters.statuses.filter((status) => projectAuditSearchStatuses.includes(status)),
    to: filters.to,
  };
}

function createRow(project: ProjectAuditSearchProject, event: ProjectAuditEvent): ProjectAuditSearchRow {
  return {
    action: event.action ?? null,
    actorEmail: event.actorEmail ?? null,
    actorName: event.actorName ?? null,
    category: event.category,
    description: event.description,
    eventId: event.id,
    id: `${project.id}:${event.id}`,
    occurredAt: event.occurredAt,
    projectId: project.id,
    projectName: project.name,
    resourceId: event.resourceId ?? null,
    resourceType: event.resourceType ?? null,
    status: event.status,
    title: event.title,
  };
}

function matchesQuery(row: ProjectAuditSearchRow, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [row.projectName, row.title, row.description, row.actorName, row.actorEmail, row.resourceType, row.resourceId, row.action].map(normalize).join(" ");

  return haystack.includes(query.toLowerCase());
}

function summarizeRows(rows: ProjectAuditSearchRow[]): ProjectAuditSearchSummary {
  const categoryCounts = { ...defaultCategoryCounts };
  const statusCounts = { ...defaultStatusCounts };
  const projects = new Set<string>();

  for (const row of rows) {
    categoryCounts[row.category] += 1;
    statusCounts[row.status] += 1;
    projects.add(row.projectId);
  }

  return {
    categoryCounts,
    newestAt: rows[0]?.occurredAt ?? null,
    oldestAt: rows.at(-1)?.occurredAt ?? null,
    projectCount: projects.size,
    statusCounts,
    total: rows.length,
  };
}

export function createProjectAuditSearchRows(projects: ProjectAuditSearchProject[]) {
  return projects
    .flatMap((project) => project.auditLog.events.map((event) => createRow(project, event)))
    .sort((first, second) => toTime(second.occurredAt) - toTime(first.occurredAt) || first.projectName.localeCompare(second.projectName) || first.title.localeCompare(second.title));
}

export function createProjectAuditSearchResult(rows: ProjectAuditSearchRow[], filters: ProjectAuditSearchFilters): ProjectAuditSearchResult {
  const normalizedFilters = normalizeFilters(filters);
  const fromTime = startOfDay(normalizedFilters.from);
  const toTimeValue = endOfDay(normalizedFilters.to);
  const filteredRows = rows.filter((row) => {
    const occurredAt = toTime(row.occurredAt);

    return (
      (normalizedFilters.projectId === "all" || row.projectId === normalizedFilters.projectId) &&
      (normalizedFilters.categories.length === 0 || normalizedFilters.categories.includes(row.category)) &&
      (normalizedFilters.statuses.length === 0 || normalizedFilters.statuses.includes(row.status)) &&
      occurredAt >= fromTime &&
      occurredAt <= toTimeValue &&
      matchesQuery(row, normalizedFilters.query)
    );
  });

  return {
    filters: normalizedFilters,
    rows: filteredRows,
    summary: summarizeRows(filteredRows),
  };
}

function escapeCsvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createProjectAuditCsv(rows: ProjectAuditSearchRow[]) {
  const headers: Array<keyof ProjectAuditSearchRow> = [
    "projectName",
    "projectId",
    "occurredAt",
    "status",
    "category",
    "title",
    "description",
    "actorName",
    "actorEmail",
    "resourceType",
    "resourceId",
    "action",
  ];

  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(","))].join("\n");
}

export function createProjectAuditExportPayload(rows: ProjectAuditSearchRow[], filters: ProjectAuditSearchFilters, generatedAt = new Date()): ProjectAuditExportPayload {
  const result = createProjectAuditSearchResult(rows, filters);

  return {
    filters: result.filters,
    generatedAt: generatedAt.toISOString(),
    rows: result.rows,
    schemaVersion: 1,
    summary: result.summary,
  };
}

export function createProjectAuditExportBody(rows: ProjectAuditSearchRow[], filters: ProjectAuditSearchFilters, format: ProjectAuditExportFormat) {
  const payload = createProjectAuditExportPayload(rows, filters);

  return format === "json" ? JSON.stringify(payload, null, 2) : createProjectAuditCsv(payload.rows);
}

export function createProjectAuditExportFileName(label: string, format: ProjectAuditExportFormat, generatedAt = new Date()) {
  const date = generatedAt.toISOString().slice(0, 10);
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "audit-export"}-${date}.${format}`;
}
