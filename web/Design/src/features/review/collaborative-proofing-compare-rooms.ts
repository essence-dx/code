import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ApprovalStatus,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import type {
  CollaborativeProofingCompareRoom,
  CollaborativeProofingCompareRoomCenter,
  CollaborativeProofingStatus,
  ProofingDecisionTrail,
  ProofingDecisionTrailItem,
  ProofingRollbackPacket,
  ProofingSignedApprovalSnapshot,
  ProofingVisualChangeSnapshot,
} from "@/features/review/collaborative-proofing-compare-rooms-types";

export type {
  CollaborativeProofingCompareRoom,
  CollaborativeProofingCompareRoomCenter,
  CollaborativeProofingStatus,
  ProofingDecisionKind,
  ProofingDecisionTrail,
  ProofingDecisionTrailItem,
  ProofingRollbackPacket,
  ProofingSignedApprovalSnapshot,
  ProofingVisualChangeSnapshot,
} from "@/features/review/collaborative-proofing-compare-rooms-types";

export function createCollaborativeProofingCompareRooms(input: {
  projects: ProjectSummary[];
  projectVersions: ProjectVersionSummary[];
  reviewTasks: ReviewTaskSummary[];
  projectHandoffPackets: ProjectHandoffPacket[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
}): CollaborativeProofingCompareRoomCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const handoffByProject = new Map(
    input.projectHandoffPackets.map((packet) => [packet.projectId, packet]),
  );
  const rooms = input.projects
    .filter((project) => !project.deletedAt)
    .map((project) =>
      createProofingRoom({
        project,
        versions: input.projectVersions.filter(
          (version) => version.projectId === project.id,
        ),
        reviewTasks: input.reviewTasks.filter(
          (task) => task.projectId === project.id,
        ),
        handoffPacket: handoffByProject.get(project.id) ?? null,
        auditLogs: input.auditLogs.filter((log) =>
          isProjectAuditLog(log, project.id),
        ),
        generatedAt,
      }),
    )
    .sort(compareRooms);
  const status = aggregateStatus(rooms.map((room) => room.status));
  const score = average(
    rooms.map((room) => room.score),
    100,
  );

  return {
    generatedAt,
    status,
    score,
    rooms,
    nextActions: createNextActions(rooms),
    totals: {
      rooms: rooms.length,
      visualSnapshots: rooms.filter((room) => room.visualSnapshot).length,
      decisionTrailItems: rooms.reduce(
        (total, room) => total + room.decisionTrail.items.length,
        0,
      ),
      signedApprovalSnapshots: rooms.filter(
        (room) => room.signedApprovalSnapshot.signature,
      ).length,
      rollbackPackets: rooms.filter((room) => room.rollbackPacket.versionId)
        .length,
      readyRooms: rooms.filter((room) => room.status === "ready").length,
      reviewRooms: rooms.filter((room) => room.status === "review").length,
      blockedRooms: rooms.filter((room) => room.status === "blocked").length,
    },
  };
}

function createProofingRoom(input: {
  project: ProjectSummary;
  versions: ProjectVersionSummary[];
  reviewTasks: ReviewTaskSummary[];
  handoffPacket: ProjectHandoffPacket | null;
  auditLogs: WorkspaceAuditLogSummary[];
  generatedAt: string;
}): CollaborativeProofingCompareRoom {
  const versions = sortVersions(input.versions);
  const visualSnapshot = createVisualSnapshot({
    project: input.project,
    versions,
    generatedAt: input.generatedAt,
  });
  const decisionTrail = createDecisionTrail({
    project: input.project,
    reviewTasks: input.reviewTasks,
    handoffPacket: input.handoffPacket,
    auditLogs: input.auditLogs,
  });
  const signedApprovalSnapshot = createSignedApprovalSnapshot({
    project: input.project,
    handoffPacket: input.handoffPacket,
    auditLogs: input.auditLogs,
    generatedAt: input.generatedAt,
  });
  const rollbackPacket = createRollbackPacket({
    project: input.project,
    latestVersion: versions[0] ?? null,
    generatedAt: input.generatedAt,
    decisionTrail,
    signedApprovalSnapshot,
  });
  const status = aggregateStatus([
    visualSnapshot.status,
    decisionTrail.status,
    signedApprovalSnapshot.status,
    rollbackPacket.status,
  ]);
  const score = scoreRoom({
    visualSnapshot,
    decisionTrail,
    signedApprovalSnapshot,
    rollbackPacket,
  });

  return {
    id: `proofing-room-${input.project.id}`,
    projectId: input.project.id,
    projectName: input.project.name,
    status,
    score,
    nextAction: createRoomNextAction({
      projectName: input.project.name,
      status,
      decisionTrail,
      signedApprovalSnapshot,
      rollbackPacket,
    }),
    visualSnapshot,
    decisionTrail,
    signedApprovalSnapshot,
    rollbackPacket,
  };
}

function createVisualSnapshot(input: {
  project: ProjectSummary;
  versions: ProjectVersionSummary[];
  generatedAt: string;
}): ProofingVisualChangeSnapshot {
  const latest = input.versions[0] ?? null;
  const changedFields = createChangedFields(input.project, latest);
  const status: CollaborativeProofingStatus = latest
    ? input.project.thumbnail && latest.thumbnail
      ? "ready"
      : "review"
    : "blocked";

  return {
    id: `proofing-snapshot-${input.project.id}`,
    status,
    currentThumbnail: input.project.thumbnail,
    previousThumbnail: latest?.thumbnail ?? null,
    currentLabel: "Current design",
    previousLabel: latest?.name ?? "No saved revision",
    changedFields,
    detail: latest
      ? `${input.project.name} compares current artwork against ${latest.name}.`
      : `${input.project.name} needs a saved revision before visual compare is available.`,
    createdAt: input.generatedAt,
  };
}

function createChangedFields(
  project: ProjectSummary,
  latest: ProjectVersionSummary | null,
) {
  if (!latest) return ["revision"];

  const fields: string[] = [];

  if (project.name !== latest.name) fields.push("name");
  if (project.thumbnail !== latest.thumbnail) fields.push("thumbnail");
  if (
    new Date(project.updatedAt).getTime() > new Date(latest.createdAt).getTime()
  ) {
    fields.push("updatedAt");
  }

  return fields.length ? fields : ["metadata"];
}

function createDecisionTrail(input: {
  project: ProjectSummary;
  reviewTasks: ReviewTaskSummary[];
  handoffPacket: ProjectHandoffPacket | null;
  auditLogs: WorkspaceAuditLogSummary[];
}): ProofingDecisionTrail {
  const reviewItems = input.reviewTasks.map((task) =>
    createReviewDecisionItem(task),
  );
  const approvalItems =
    input.handoffPacket?.approvalHistory.map((event) => ({
      id: `decision-${event.id}`,
      kind: "approval-event" as const,
      status: approvalStatusToProofingStatus(
        event.approvalStatus ?? input.project.approvalStatus,
      ),
      actor: event.actorEmail ?? "Approval reviewer",
      summary: event.summary,
      annotation: `Approval snapshot recorded as ${event.approvalStatus ?? input.project.approvalStatus}.`,
      createdAt: event.createdAt,
    })) ?? [];
  const auditItems: ProofingDecisionTrailItem[] = input.auditLogs
    .filter((log) => log.action === "approval.updated")
    .map((log) => ({
      id: `decision-${log.id}`,
      kind: "audit-event" as const,
      status: input.project.approvalStatus === "approved" ? "ready" : "review",
      actor: log.actorEmail ?? "Workspace audit",
      summary: log.summary,
      annotation: `Audit event ${log.action} attached to proofing trail.`,
      createdAt: log.createdAt,
    }));
  const items = [...reviewItems, ...approvalItems, ...auditItems]
    .sort(compareDecisionItems)
    .slice(0, 8);
  const status = aggregateStatus(items.map((item) => item.status));

  return {
    id: `proofing-decision-trail-${input.project.id}`,
    status,
    items,
    summary: items.length
      ? `${items.length} annotated proofing decision${items.length === 1 ? "" : "s"} captured.`
      : "No annotated decision trail has been captured yet.",
  };
}

function createReviewDecisionItem(
  task: ReviewTaskSummary,
): ProofingDecisionTrailItem {
  const done = task.resolved || task.taskStatus === "done";

  return {
    id: `decision-${task.id}`,
    kind: "review-note",
    status: done ? "ready" : "blocked",
    actor: task.authorName,
    summary: task.body,
    annotation: done
      ? "Resolved proofing note kept for approval traceability."
      : `Open proofing note assigned to ${task.taskAssigneeName ?? "the design owner"}.`,
    createdAt: task.updatedAt,
  };
}

function createSignedApprovalSnapshot(input: {
  project: ProjectSummary;
  handoffPacket: ProjectHandoffPacket | null;
  auditLogs: WorkspaceAuditLogSummary[];
  generatedAt: string;
}): ProofingSignedApprovalSnapshot {
  const latestApproval = input.handoffPacket?.approvalHistory[0] ?? null;
  const approvalAudit = input.auditLogs.find(
    (log) => log.action === "approval.updated",
  );
  const actorEmail =
    latestApproval?.actorEmail ?? approvalAudit?.actorEmail ?? null;
  const signedAt =
    latestApproval?.createdAt ?? approvalAudit?.createdAt ?? input.generatedAt;
  const signaturePayload = [
    input.project.id,
    input.project.name,
    input.project.approvalStatus,
    actorEmail ?? "unknown",
    signedAt,
  ].join("|");
  const status = approvalStatusToProofingStatus(input.project.approvalStatus);

  return {
    id: `proofing-approval-${input.project.id}`,
    status,
    approvalStatus: input.project.approvalStatus,
    actorEmail,
    signedAt,
    signature: `proof-${hashString(signaturePayload)}`,
    detail:
      status === "ready"
        ? `${input.project.name} has a signed approved snapshot.`
        : `${input.project.name} approval is ${input.project.approvalStatus}.`,
  };
}

function createRollbackPacket(input: {
  project: ProjectSummary;
  latestVersion: ProjectVersionSummary | null;
  generatedAt: string;
  decisionTrail: ProofingDecisionTrail;
  signedApprovalSnapshot: ProofingSignedApprovalSnapshot;
}): ProofingRollbackPacket {
  const json = JSON.stringify(
    {
      kind: "essence-studio.proofing-rollback-packet",
      generatedAt: input.generatedAt,
      projectId: input.project.id,
      projectName: input.project.name,
      versionId: input.latestVersion?.id ?? null,
      versionName: input.latestVersion?.name ?? null,
      approvalSignature: input.signedApprovalSnapshot.signature,
      decisionIds: input.decisionTrail.items.map((item) => item.id),
      rollbackSteps: input.latestVersion
        ? [
            "Open version history for the project.",
            `Restore ${input.latestVersion.name}.`,
            "Re-run proofing compare before requesting approval again.",
          ]
        : ["Create a named version before rollback can be prepared."],
    },
    null,
    2,
  );
  const status: CollaborativeProofingStatus = input.latestVersion
    ? input.latestVersion.thumbnail
      ? "ready"
      : "review"
    : "blocked";

  return {
    id: `proofing-rollback-${input.project.id}`,
    status,
    versionId: input.latestVersion?.id ?? null,
    versionName: input.latestVersion?.name ?? null,
    fileName: `proofing-rollback-${input.project.id}.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    json,
    detail: input.latestVersion
      ? `Rollback packet targets ${input.latestVersion.name}.`
      : "No saved version is available for rollback.",
  };
}

function scoreRoom(input: {
  visualSnapshot: ProofingVisualChangeSnapshot;
  decisionTrail: ProofingDecisionTrail;
  signedApprovalSnapshot: ProofingSignedApprovalSnapshot;
  rollbackPacket: ProofingRollbackPacket;
}) {
  const statuses = [
    input.visualSnapshot.status,
    input.decisionTrail.status,
    input.signedApprovalSnapshot.status,
    input.rollbackPacket.status,
  ];
  const blocked = statuses.filter((status) => status === "blocked").length;
  const review = statuses.filter((status) => status === "review").length;

  return Math.max(0, Math.min(100, 96 - blocked * 26 - review * 9));
}

function createRoomNextAction(input: {
  projectName: string;
  status: CollaborativeProofingStatus;
  decisionTrail: ProofingDecisionTrail;
  signedApprovalSnapshot: ProofingSignedApprovalSnapshot;
  rollbackPacket: ProofingRollbackPacket;
}) {
  if (input.signedApprovalSnapshot.status === "blocked") {
    return `Resolve approval blockers for ${input.projectName}.`;
  }

  const openDecisions = input.decisionTrail.items.filter(
    (item) => item.status === "blocked",
  ).length;

  if (openDecisions) {
    return `Resolve ${openDecisions} open proofing decision${openDecisions === 1 ? "" : "s"} for ${input.projectName}.`;
  }

  if (input.rollbackPacket.status !== "ready") {
    return `Create a named revision with thumbnail before final proofing for ${input.projectName}.`;
  }

  if (input.status === "ready") {
    return `${input.projectName}: proofing compare room is ready.`;
  }

  return `Review proofing evidence for ${input.projectName}.`;
}

function createNextActions(rooms: CollaborativeProofingCompareRoom[]) {
  const actions = rooms
    .filter((room) => room.status !== "ready")
    .map((room) => room.nextAction)
    .slice(0, 5);

  if (actions.length) return actions;

  return ["All proofing compare rooms are ready for stakeholder review."];
}

function isProjectAuditLog(log: WorkspaceAuditLogSummary, projectId: string) {
  return log.targetType === "project" && log.targetId === projectId;
}

function approvalStatusToProofingStatus(
  status: ApprovalStatus,
): CollaborativeProofingStatus {
  if (status === "approved") return "ready";
  if (status === "changes-requested") return "blocked";

  return "review";
}

function sortVersions(versions: ProjectVersionSummary[]) {
  return [...versions].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function compareDecisionItems(
  left: ProofingDecisionTrailItem,
  right: ProofingDecisionTrailItem,
) {
  return (
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() ||
    left.id.localeCompare(right.id)
  );
}

function compareRooms(
  left: CollaborativeProofingCompareRoom,
  right: CollaborativeProofingCompareRoom,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    left.score - right.score ||
    left.projectName.localeCompare(right.projectName)
  );
}

function aggregateStatus(
  statuses: CollaborativeProofingStatus[],
): CollaborativeProofingStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function statusWeight(status: CollaborativeProofingStatus) {
  if (status === "blocked") return 2;
  if (status === "review") return 1;

  return 0;
}

function average(values: number[], fallback: number) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function hashString(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}
