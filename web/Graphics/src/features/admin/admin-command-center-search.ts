import type {
  AdminAutomationRunbook,
  AdminAutomationRunbookCenterReport,
  AdminAutomationRunbookRow,
  AdminAutomationRunbookStatus,
} from "@/features/admin/admin-automation-runbook-center";
import type {
  AdminFileRow,
  AdminShareRow,
  AdminUserRow,
} from "@/features/admin/admin-data";

export type AdminCommandCenterSearchStatus =
  | "ready"
  | "review"
  | "blocked";

export type AdminCommandCenterSearchCategory =
  | "evidence"
  | "file"
  | "governance"
  | "release"
  | "runbook"
  | "share"
  | "user";

export type AdminCommandCenterGovernanceReportInput = {
  id: string;
  source: string;
  category: Extract<
    AdminCommandCenterSearchCategory,
    "governance" | "release" | "evidence"
  >;
  status: AdminCommandCenterSearchStatus;
  score: number;
  summary: string;
  findings: string[];
  latestAt: string | null;
  commands?: string[];
};

export type AdminCommandCenterSearchRow = {
  id: string;
  category: AdminCommandCenterSearchCategory;
  source: string;
  status: AdminCommandCenterSearchStatus;
  label: string;
  detail: string;
  evidence: string;
  owner: string;
  command: string | null;
  href: string | null;
  score: number | null;
  latestAt: string | null;
  tokens: string[];
};

export type AdminCommandCenterSearchSummary = {
  category: AdminCommandCenterSearchCategory;
  count: number;
  blockedCount: number;
  reviewCount: number;
};

export type AdminCommandCenterSearchReport = {
  generatedAt: string;
  status: AdminCommandCenterSearchStatus;
  score: number;
  rowCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  commandCount: number;
  summaries: AdminCommandCenterSearchSummary[];
  suggestedQueries: string[];
  rows: AdminCommandCenterSearchRow[];
};

export type AdminCommandCenterSearchInput = {
  generatedAt?: string;
  users: AdminUserRow[];
  files: AdminFileRow[];
  shares: AdminShareRow[];
  governanceReports: AdminCommandCenterGovernanceReportInput[];
  runbookCenter: Pick<
    AdminAutomationRunbookCenterReport,
    "commands" | "commandCount" | "rows" | "runbooks" | "score" | "status"
  >;
};

export type AdminCommandCenterSearchFilter = {
  category?: AdminCommandCenterSearchCategory | "all";
  status?: AdminCommandCenterSearchStatus | "all";
};

export function getAdminCommandCenterSearchReport({
  generatedAt = new Date().toISOString(),
  users,
  files,
  shares,
  governanceReports,
  runbookCenter,
}: AdminCommandCenterSearchInput): AdminCommandCenterSearchReport {
  const rows = [
    ...users.map(createUserRow),
    ...files.map(createFileRow),
    ...shares.map(createShareRow),
    ...governanceReports.map(createGovernanceRow),
    ...runbookCenter.runbooks.flatMap(createRunbookRows),
    ...runbookCenter.rows.map(createRunbookSignalRow),
  ].sort(sortRows);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const commandCount = new Set(
    rows.flatMap((row) => (row.command ? [row.command] : [])),
  ).size;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 9 - reviewCount * 3),
    rowCount: rows.length,
    readyCount,
    reviewCount,
    blockedCount,
    commandCount,
    summaries: getCategorySummaries(rows),
    suggestedQueries: getSuggestedQueries({
      files,
      governanceReports,
      runbookCenter,
      shares,
      users,
    }),
    rows,
  };
}

export function filterAdminCommandCenterSearchRows(
  rows: AdminCommandCenterSearchRow[],
  query: string,
  filter: AdminCommandCenterSearchFilter = {},
) {
  const normalizedTerms = normalizeTerms(query);
  const category = filter.category ?? "all";
  const status = filter.status ?? "all";

  return rows.filter((row) => {
    if (category !== "all" && row.category !== category) {
      return false;
    }

    if (status !== "all" && row.status !== status) {
      return false;
    }

    if (normalizedTerms.length === 0) {
      return true;
    }

    const haystack = row.tokens.join(" ");

    return normalizedTerms.every((term) => haystack.includes(term));
  });
}

export function getAdminCommandCenterSearchJson(
  report: AdminCommandCenterSearchReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminCommandCenterSearchCsv(
  report: AdminCommandCenterSearchReport,
) {
  return [
    [
      "id",
      "category",
      "source",
      "status",
      "label",
      "detail",
      "evidence",
      "owner",
      "command",
      "href",
      "score",
      "latest_at",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.category,
        row.source,
        row.status,
        row.label,
        row.detail,
        row.evidence,
        row.owner,
        row.command ?? "",
        row.href ?? "",
        row.score ?? "",
        row.latestAt ?? "",
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminCommandCenterSearchMarkdown(
  report: AdminCommandCenterSearchReport,
) {
  return [
    "# Admin Command Center Search",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    `Commands: ${report.commandCount}`,
    "",
    "## Categories",
    "",
    ...report.summaries.map(
      (summary) =>
        `- ${summary.category}: ${summary.count} rows (${summary.blockedCount} blocked, ${summary.reviewCount} review)`,
    ),
    "",
    "## Suggested Queries",
    "",
    ...report.suggestedQueries.map((query) => `- ${query}`),
    "",
    "## Search Rows",
    "",
    ...report.rows.map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - Source: ${row.source}`,
        `  - Category: ${row.category}`,
        `  - Detail: ${row.detail}`,
        `  - Evidence: ${row.evidence}`,
        `  - Owner: ${row.owner}`,
        row.command ? `  - Command: \`${row.command}\`` : null,
        row.href ? `  - Link: ${row.href}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  ].join("\n");
}

function createUserRow(user: AdminUserRow): AdminCommandCenterSearchRow {
  const status = user.emailVerified ? "ready" : "review";

  return createRow({
    id: `user:${user.id}`,
    category: "user",
    source: "Users",
    status,
    label: user.name,
    detail: `${user.email} has ${user.files} files and ${user.sessions} active sessions.`,
    evidence: user.emailVerified
      ? "Email verification is complete."
      : "Email verification is still pending.",
    owner: user.email,
    latestAt: user.createdAt,
    score: status === "ready" ? 100 : 75,
  });
}

function createFileRow(file: AdminFileRow): AdminCommandCenterSearchRow {
  const status = file.trashedAt
    ? "blocked"
    : file.brokenPrototypeCount > 0 ||
        file.openCommentCount > 0 ||
        file.staleShareCount > 0
      ? "review"
      : "ready";

  return createRow({
    id: `file:${file.id}`,
    category: "file",
    source: "Design files",
    status,
    label: file.name,
    detail: `${file.teamName} / ${file.projectName} / ${file.scope}`,
    evidence: `${file.collaboratorCount} collaborators, ${file.openCommentCount} open comments, ${file.brokenPrototypeCount} broken prototypes, ${file.staleShareCount} stale shares.`,
    owner: file.ownerEmail,
    latestAt: file.updatedAt,
    score: status === "ready" ? 100 : status === "review" ? 82 : 30,
  });
}

function createShareRow(share: AdminShareRow): AdminCommandCenterSearchRow {
  const status = share.disabledAt
    ? "blocked"
    : share.allowDownload || !share.expiresAt
      ? "review"
      : "ready";

  return createRow({
    id: `share:${share.id}`,
    category: "share",
    source: "Website shares",
    status,
    label: share.fileName,
    detail: `${share.permissionPreset} ${share.accessLevel} public share.`,
    evidence: `${share.allowDownload ? "Downloads allowed" : "Downloads off"}, ${share.allowComments ? "comments allowed" : "comments off"}, expiry ${share.expiresAt ?? "not set"}.`,
    owner: share.ownerEmail,
    href: share.sharePath,
    latestAt: share.createdAt,
    score: status === "ready" ? 100 : status === "review" ? 78 : 25,
  });
}

function createGovernanceRow(
  report: AdminCommandCenterGovernanceReportInput,
): AdminCommandCenterSearchRow {
  return createRow({
    id: `report:${report.id}`,
    category: report.category,
    source: report.source,
    status: report.status,
    label: report.source,
    detail: report.summary,
    evidence: report.findings.join(" "),
    owner: "Admin operator",
    command: report.commands?.[0] ?? null,
    latestAt: report.latestAt,
    score: report.score,
  });
}

function createRunbookRows(
  runbook: AdminAutomationRunbook,
): AdminCommandCenterSearchRow[] {
  return [
    createRow({
      id: `runbook:${runbook.id}`,
      category: "runbook",
      source: "Automation runbooks",
      status: normalizeRunbookStatus(runbook.status),
      label: runbook.title,
      detail: runbook.objective,
      evidence: `${runbook.evidenceBundle} has ${runbook.rowCount} rows and ${runbook.commandCount} commands.`,
      owner: runbook.owner,
      command: runbook.commands[0] ?? null,
      latestAt: null,
      score: runbook.blockedSignalCount
        ? 40
        : runbook.reviewSignalCount
          ? 84
          : 100,
    }),
    createRow({
      id: `evidence:${runbook.id}`,
      category: "evidence",
      source: "Evidence bundles",
      status: normalizeRunbookStatus(runbook.status),
      label: runbook.evidenceBundle,
      detail: `${runbook.title} evidence package.`,
      evidence: `${runbook.objective} Owner: ${runbook.owner}.`,
      owner: runbook.owner,
      command: runbook.commands[0] ?? null,
      latestAt: null,
      score: runbook.blockedSignalCount
        ? 40
        : runbook.reviewSignalCount
          ? 84
          : 100,
    }),
  ];
}

function createRunbookSignalRow(
  row: AdminAutomationRunbookRow,
): AdminCommandCenterSearchRow {
  return createRow({
    id: `runbook-row:${row.id}`,
    category: "runbook",
    source: "Runbook signals",
    status: normalizeRunbookStatus(row.status),
    label: row.label,
    detail: `${row.category} / ${row.cadence}`,
    evidence: row.evidence,
    owner: row.owner,
    command: row.command,
    latestAt: row.latestAt,
    score: row.status === "ready" ? 100 : row.status === "review" ? 82 : 30,
  });
}

function createRow(
  row: Omit<AdminCommandCenterSearchRow, "command" | "href" | "tokens"> &
    Partial<Pick<AdminCommandCenterSearchRow, "command" | "href">>,
): AdminCommandCenterSearchRow {
  const normalizedRow = {
    command: null,
    href: null,
    ...row,
  };

  return {
    ...normalizedRow,
    tokens: normalizeTerms([
      normalizedRow.id,
      normalizedRow.category,
      normalizedRow.source,
      normalizedRow.status,
      normalizedRow.label,
      normalizedRow.detail,
      normalizedRow.evidence,
      normalizedRow.owner,
      normalizedRow.command,
      normalizedRow.href,
      normalizedRow.score,
      normalizedRow.latestAt,
    ]),
  };
}

function getCategorySummaries(rows: AdminCommandCenterSearchRow[]) {
  const categories: AdminCommandCenterSearchCategory[] = [
    "governance",
    "release",
    "runbook",
    "evidence",
    "user",
    "file",
    "share",
  ];

  return categories
    .map((category) => {
      const categoryRows = rows.filter((row) => row.category === category);

      return {
        category,
        count: categoryRows.length,
        blockedCount: categoryRows.filter((row) => row.status === "blocked")
          .length,
        reviewCount: categoryRows.filter((row) => row.status === "review")
          .length,
      };
    })
    .filter((summary) => summary.count > 0);
}

function getSuggestedQueries({
  files,
  governanceReports,
  runbookCenter,
  shares,
  users,
}: Omit<AdminCommandCenterSearchInput, "generatedAt">) {
  const queries = [
    governanceReports.find((report) => report.status === "blocked")?.source,
    runbookCenter.runbooks.find((runbook) => runbook.status !== "ready")
      ?.evidenceBundle,
    files.find((file) => file.openCommentCount > 0)?.ownerEmail,
    shares.find((share) => share.allowDownload)?.fileName,
    users.find((user) => !user.emailVerified)?.email,
    "release evidence",
  ];

  return uniqueStrings(queries.filter(Boolean).map(String)).slice(0, 6);
}

function normalizeRunbookStatus(
  status: AdminAutomationRunbookStatus,
): AdminCommandCenterSearchStatus {
  return status;
}

function sortRows(
  left: AdminCommandCenterSearchRow,
  right: AdminCommandCenterSearchRow,
) {
  const statusDelta = getStatusWeight(right.status) - getStatusWeight(left.status);

  if (statusDelta !== 0) {
    return statusDelta;
  }

  const latestDelta =
    Date.parse(right.latestAt ?? "") - Date.parse(left.latestAt ?? "");

  if (Number.isFinite(latestDelta) && latestDelta !== 0) {
    return latestDelta;
  }

  return left.label.localeCompare(right.label);
}

function getStatusWeight(status: AdminCommandCenterSearchStatus) {
  if (status === "blocked") {
    return 3;
  }

  return status === "review" ? 2 : 1;
}

function normalizeTerms(value: unknown): string[] {
  const text = Array.isArray(value)
    ? value.map((item) => String(item ?? "")).join(" ")
    : String(value ?? "");

  return uniqueStrings(
    text
      .toLowerCase()
      .split(/[^a-z0-9@._/-]+/)
      .map((term) => term.trim())
      .filter(Boolean),
  );
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
