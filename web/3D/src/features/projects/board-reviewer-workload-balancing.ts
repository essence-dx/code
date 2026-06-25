export type BoardReviewerWorkloadStatus = "balanced" | "blocked" | "overloaded" | "watch";
export type BoardReviewerWorkloadTaskKind = "agenda" | "exception-signoff" | "packet-review" | "route-acknowledgement";

export interface BoardReviewerWorkloadTask {
  id: string;
  kind: BoardReviewerWorkloadTaskKind;
  label: string;
  points: number;
  status: string;
}

export interface BoardReviewerWorkloadRow {
  agendaItemCount: number;
  exceptionSignoffCount: number;
  nextAction: string;
  packetReviewCount: number;
  pendingAcknowledgementCount: number;
  reviewerEmail: string | null;
  reviewerName: string;
  status: BoardReviewerWorkloadStatus;
  tasks: BoardReviewerWorkloadTask[];
  workloadPoints: number;
}

export interface BoardReviewerWorkloadBalancingReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: BoardReviewerWorkloadRow[];
  summary: {
    balanceScore: number;
    nextAction: string;
    overloadedReviewerCount: number;
    reviewerCount: number;
    status: "blocked" | "ready" | "watch";
    totalWorkloadPoints: number;
    unassignedTaskCount: number;
    watchReviewerCount: number;
  };
  workspaceId: string;
}

interface AgendaInputItem {
  durationMinutes?: number;
  id: string;
  kind?: string;
  nextAction: string;
  ownerEmail?: string | null;
  ownerName?: string | null;
  status: string;
  topic: string;
}

interface PacketHistoryRecordInput {
  approvalStatus: string;
  blockedSignOffCount?: number;
  createdBy?: {
    email: string | null;
    name: string | null;
  };
  packetId: string;
  recipientEmail?: string | null;
  recipientName?: string | null;
  recipientPurpose: string;
  status: string;
}

interface NotificationHistoryRecordInput {
  createdAt?: string;
  historyId?: string;
  id?: string;
  pendingAcknowledgementCount?: number;
  routes?: Array<{
    acknowledgementState?: string;
    route?: {
      channel?: string;
      recipientEmail?: string | null;
      recipientName?: string | null;
      status?: string;
    };
  }>;
}

interface ExceptionWorkflowRowInput {
  id: string;
  nextAction: string;
  requestedBy?: string | null;
  signedOffBy?: string | null;
  status: string;
  title: string;
}

export interface CreateBoardReviewerWorkloadBalancingInput {
  agenda: {
    items: AgendaInputItem[];
  } | null;
  exceptionWorkflow: {
    rows: ExceptionWorkflowRowInput[];
  } | null;
  generatedAt?: string;
  notificationHistory: {
    records: NotificationHistoryRecordInput[];
  } | null;
  packetHistory: {
    records: PacketHistoryRecordInput[];
  } | null;
  workspaceId?: string;
}

const statusRank: Record<BoardReviewerWorkloadStatus, number> = {
  overloaded: 0,
  blocked: 1,
  watch: 2,
  balanced: 3,
};

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
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

function reviewerKey(email: string | null | undefined, name: string | null | undefined) {
  const trimmedEmail = email?.trim().toLowerCase();

  if (trimmedEmail) {
    return trimmedEmail;
  }

  const trimmedName = name?.trim().toLowerCase();

  return trimmedName && trimmedName !== "unassigned" ? `name:${trimmedName}` : "unassigned";
}

function reviewerName(email: string | null | undefined, name: string | null | undefined) {
  const trimmedName = name?.trim();

  if (trimmedName && trimmedName !== "Unassigned") {
    return trimmedName;
  }

  return email?.trim() || "Unassigned";
}

function agendaPoints(item: AgendaInputItem) {
  if (!item.ownerEmail && (!item.ownerName || item.ownerName === "Unassigned")) {
    return 0;
  }

  return item.status === "blocked" ? 3 : item.status === "watch" ? 2 : 1;
}

function packetPoints(record: PacketHistoryRecordInput) {
  if (record.approvalStatus === "blocked") {
    return 3;
  }

  return record.approvalStatus === "watch" ? 2 : 1;
}

function exceptionPoints(row: ExceptionWorkflowRowInput) {
  if (row.status === "approved") {
    return 1;
  }

  return row.status === "pending" ? 3 : 2;
}

function upsertReviewer(map: Map<string, BoardReviewerWorkloadRow>, input: { email?: string | null; name?: string | null }) {
  const key = reviewerKey(input.email, input.name);
  const existing = map.get(key);

  if (existing) {
    return existing;
  }

  const row: BoardReviewerWorkloadRow = {
    agendaItemCount: 0,
    exceptionSignoffCount: 0,
    nextAction: "",
    packetReviewCount: 0,
    pendingAcknowledgementCount: 0,
    reviewerEmail: key === "unassigned" || key.startsWith("name:") ? null : key,
    reviewerName: key === "unassigned" ? "Unassigned" : reviewerName(input.email, input.name),
    status: "balanced",
    tasks: [],
    workloadPoints: 0,
  };

  map.set(key, row);

  return row;
}

function addTask(row: BoardReviewerWorkloadRow, task: BoardReviewerWorkloadTask) {
  row.tasks.push(task);
  row.workloadPoints += task.points;

  if (task.kind === "agenda") {
    row.agendaItemCount += 1;
  } else if (task.kind === "packet-review") {
    row.packetReviewCount += 1;
  } else if (task.kind === "route-acknowledgement") {
    row.pendingAcknowledgementCount += 1;
  } else {
    row.exceptionSignoffCount += 1;
  }
}

function collectAgendaTasks(input: CreateBoardReviewerWorkloadBalancingInput, reviewers: Map<string, BoardReviewerWorkloadRow>) {
  for (const item of input.agenda?.items ?? []) {
    if (item.status === "ready") {
      continue;
    }

    const row = upsertReviewer(reviewers, {
      email: item.ownerEmail,
      name: item.ownerName,
    });
    addTask(row, {
      id: `agenda:${item.id}`,
      kind: "agenda",
      label: item.topic,
      points: agendaPoints(item),
      status: item.status,
    });
  }
}

function collectPacketTasks(input: CreateBoardReviewerWorkloadBalancingInput, reviewers: Map<string, BoardReviewerWorkloadRow>) {
  for (const record of input.packetHistory?.records ?? []) {
    if (record.status !== "active" || record.approvalStatus === "ready") {
      continue;
    }

    const row = upsertReviewer(reviewers, {
      email: record.recipientEmail ?? record.createdBy?.email,
      name: record.recipientName ?? record.createdBy?.name,
    });
    addTask(row, {
      id: `packet:${record.packetId}`,
      kind: "packet-review",
      label: record.recipientPurpose,
      points: packetPoints(record),
      status: record.approvalStatus,
    });
  }
}

function collectAcknowledgementTasks(input: CreateBoardReviewerWorkloadBalancingInput, reviewers: Map<string, BoardReviewerWorkloadRow>) {
  for (const record of input.notificationHistory?.records ?? []) {
    for (const route of record.routes ?? []) {
      if (route.acknowledgementState !== "pending" || route.route?.status !== "eligible") {
        continue;
      }

      const row = upsertReviewer(reviewers, {
        email: route.route.recipientEmail,
        name: route.route.recipientName,
      });
      addTask(row, {
        id: `acknowledgement:${record.historyId ?? record.id ?? route.route.recipientEmail}`,
        kind: "route-acknowledgement",
        label: `${route.route.channel ?? "in-app"} acknowledgement`,
        points: 2,
        status: "pending",
      });
    }
  }
}

function collectExceptionTasks(input: CreateBoardReviewerWorkloadBalancingInput, reviewers: Map<string, BoardReviewerWorkloadRow>) {
  for (const row of input.exceptionWorkflow?.rows ?? []) {
    if (row.status === "approved") {
      continue;
    }

    const reviewer = upsertReviewer(reviewers, {
      email: row.signedOffBy ?? row.requestedBy,
      name: row.signedOffBy ?? row.requestedBy ?? "Exception owner",
    });
    addTask(reviewer, {
      id: `exception:${row.id}`,
      kind: "exception-signoff",
      label: row.title,
      points: exceptionPoints(row),
      status: row.status,
    });
  }
}

function completeRow(row: BoardReviewerWorkloadRow): BoardReviewerWorkloadRow {
  const hasUnassignedTasks = row.reviewerEmail === null && row.reviewerName === "Unassigned" && row.tasks.length > 0;
  const status: BoardReviewerWorkloadStatus = hasUnassignedTasks ? "blocked" : row.workloadPoints > 10 ? "overloaded" : row.workloadPoints > 6 ? "watch" : "balanced";
  const nextAction =
    status === "overloaded"
      ? `Redistribute ${row.reviewerName} workload before board closeout.`
      : status === "blocked"
        ? "Assign unowned board review work before closeout."
        : status === "watch"
          ? `Monitor ${row.reviewerName} workload through board closeout.`
          : `Keep ${row.reviewerName} workload balanced.`;

  return {
    ...row,
    nextAction,
    status,
    tasks: [...row.tasks].sort((first, second) => second.points - first.points || first.kind.localeCompare(second.kind) || first.label.localeCompare(second.label)),
  };
}

function createRows(input: CreateBoardReviewerWorkloadBalancingInput) {
  const reviewers = new Map<string, BoardReviewerWorkloadRow>();

  collectAgendaTasks(input, reviewers);
  collectPacketTasks(input, reviewers);
  collectAcknowledgementTasks(input, reviewers);
  collectExceptionTasks(input, reviewers);

  return [...reviewers.values()]
    .map(completeRow)
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || second.workloadPoints - first.workloadPoints || first.reviewerName.localeCompare(second.reviewerName));
}

function createSummary(rows: BoardReviewerWorkloadRow[]): BoardReviewerWorkloadBalancingReport["summary"] {
  const overloadedReviewerCount = rows.filter((row) => row.status === "overloaded").length;
  const watchReviewerCount = rows.filter((row) => row.status === "watch").length;
  const unassignedTaskCount = rows.filter((row) => row.reviewerEmail === null && row.reviewerName === "Unassigned").reduce((sum, row) => sum + row.tasks.length, 0);
  const totalWorkloadPoints = rows.reduce((sum, row) => sum + row.workloadPoints, 0);
  const nextRow = rows[0] ?? null;

  return {
    balanceScore: Math.max(0, Math.min(100, 100 - overloadedReviewerCount * 30 - unassignedTaskCount * 20 - watchReviewerCount * 10)),
    nextAction:
      overloadedReviewerCount > 0 || unassignedTaskCount > 0 || watchReviewerCount > 0
        ? (nextRow?.nextAction ?? "Review board reviewer workload before closeout.")
        : "Reviewer workload is balanced for board closeout.",
    overloadedReviewerCount,
    reviewerCount: rows.length,
    status: overloadedReviewerCount > 0 || unassignedTaskCount > 0 ? "blocked" : watchReviewerCount > 0 ? "watch" : "ready",
    totalWorkloadPoints,
    unassignedTaskCount,
    watchReviewerCount,
  };
}

function createCsv(rows: BoardReviewerWorkloadRow[]) {
  const header = ["reviewer", "status", "workload_points", "agenda_items", "packet_reviews", "pending_acknowledgements", "exception_signoffs", "next_action"];
  const body = rows.map((row) =>
    [
      row.reviewerEmail ?? row.reviewerName,
      row.status,
      row.workloadPoints,
      row.agendaItemCount,
      row.packetReviewCount,
      row.pendingAcknowledgementCount,
      row.exceptionSignoffCount,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createBoardReviewerWorkloadBalancingReport(input: CreateBoardReviewerWorkloadBalancingInput): BoardReviewerWorkloadBalancingReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input);
  const summary = createSummary(rows);
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-reviewer-workload-${dateStamp(generatedAt)}.csv`,
    generatedAt,
    rows,
    summary,
    workspaceId,
  };
}
