import type {
  AdminBranchReviewRequest,
} from "@/features/admin/admin-branch-review-inbox";
import type { AdminCommentReactionWorkflowComment } from "@/features/admin/admin-comment-reaction-workflows";
import type { AdminPublicLinkSurface } from "@/features/admin/admin-public-link-observability";
import type { ScopedPublicationApprovalScope } from "@/features/admin/admin-scoped-publication-approvals";
import type {
  AdminLiveReviewActionItem,
  AdminLiveReviewAgendaItem,
  AdminLiveReviewMinuteItem,
  AdminLiveReviewSession,
  AdminLiveReviewSessionRow,
  AdminLiveReviewSessionsInput,
  AdminLiveReviewSessionsReport,
  AdminLiveReviewSessionStatus,
} from "@/features/admin/admin-live-review-sessions-types";

type SessionParts = {
  branch: AdminBranchReviewRequest;
  comments: AdminCommentReactionWorkflowComment[];
  approvals: ScopedPublicationApprovalScope[];
  publicShares: AdminPublicLinkSurface[];
};

export function getAdminLiveReviewSessionsReport({
  branchReviewInbox,
  commentReactionWorkflows,
  generatedAt = new Date().toISOString(),
  publicLinkObservability,
  scopedPublicationApprovals,
}: AdminLiveReviewSessionsInput): AdminLiveReviewSessionsReport {
  const parts = branchReviewInbox.requests.map((branch) => ({
    branch,
    comments: commentReactionWorkflows.comments.filter(
      (comment) => comment.fileId === branch.branchFileId,
    ),
    approvals: getApprovalScopesForBranch(branch, scopedPublicationApprovals.scopes),
    publicShares: publicLinkObservability.surfaces.filter(
      (surface) => surface.fileId === branch.branchFileId,
    ),
  }));
  const agendaItems = parts.flatMap(getAgendaItems);
  const minutes = parts.flatMap(getMinuteItems);
  const actionItems = parts.flatMap(getActionItems);
  const sessions = parts
    .map((part) =>
      getSession({
        actionItems: actionItems.filter((item) =>
          item.sessionId.includes(part.branch.branchFileId),
        ),
        agendaItems: agendaItems.filter((item) =>
          item.sessionId.includes(part.branch.branchFileId),
        ),
        minutes: minutes.filter((item) =>
          item.sessionId.includes(part.branch.branchFileId),
        ),
        part,
      }),
    )
    .sort(sortSessions);
  const rows = getLiveReviewRows({
    actionItems,
    agendaItems,
    minutes,
    parts,
    sessions,
  });
  const blockedRows = rows.filter((row) => row.status === "blocked").length;
  const reviewRows = rows.filter((row) => row.status === "review").length;
  const blockedSessionCount = sessions.filter(
    (session) => session.status === "blocked",
  ).length;
  const reviewSessionCount = sessions.filter(
    (session) => session.status === "review",
  ).length;

  return {
    generatedAt,
    status: getWorstStatus(rows.map((row) => row.status)),
    score: Math.max(
      0,
      100 - blockedRows * 14 - reviewRows * 5 - blockedSessionCount * 4,
    ),
    sessionCount: sessions.length,
    readySessionCount: sessions.filter((session) => session.status === "ready")
      .length,
    reviewSessionCount,
    blockedSessionCount,
    agendaItemCount: agendaItems.length,
    minutesItemCount: minutes.length,
    actionItemCount: actionItems.length,
    blockedActionItemCount: actionItems.filter((item) => item.status === "blocked")
      .length,
    missingOwnerCount: actionItems.filter((item) => item.ownerRef === "unassigned")
      .length,
    linkedBranchCount: parts.length,
    linkedCommentCount: parts.reduce(
      (total, part) => total + part.comments.length,
      0,
    ),
    linkedApprovalCount: parts.reduce(
      (total, part) => total + part.approvals.length,
      0,
    ),
    linkedPublicShareCount: parts.reduce(
      (total, part) => total + part.publicShares.length,
      0,
    ),
    rows,
    sessions,
    agendaItems: agendaItems.sort(sortAgendaItems),
    minutes: minutes.sort(sortMinutes),
    actionItems: actionItems.sort(sortActionItems),
    commands: getLiveReviewSessionCommands(),
  };
}

function getSession({
  actionItems,
  agendaItems,
  minutes,
  part,
}: {
  actionItems: AdminLiveReviewActionItem[];
  agendaItems: AdminLiveReviewAgendaItem[];
  minutes: AdminLiveReviewMinuteItem[];
  part: SessionParts;
}): AdminLiveReviewSession {
  const acknowledgementCount = part.comments.reduce(
    (total, comment) => total + comment.acknowledgementCount,
    0,
  );
  const blockedActionItemCount = actionItems.filter(
    (item) => item.status === "blocked",
  ).length;
  const reviewActionItemCount = actionItems.filter(
    (item) => item.status === "review",
  ).length;
  const status = getWorstStatus([
    part.branch.status,
    ...part.comments.map((comment) => comment.status),
    ...part.approvals.map((approval) => approval.status),
    ...part.publicShares.map((surface) => surface.status),
    blockedActionItemCount > 0 ? "blocked" : reviewActionItemCount > 0 ? "review" : "ready",
  ]);

  return {
    id: getSessionId(part.branch),
    status,
    fileId: part.branch.branchFileId,
    fileName: part.branch.branchFileName,
    branchName: part.branch.branchName,
    branchId: part.branch.branchId,
    ownerRef: getActorRef(part.branch.ownerEmail),
    reviewerCount: part.branch.reviewerEmails.length,
    openCommentCount: part.comments.filter((comment) => !comment.resolved).length,
    acknowledgementCount,
    approvalScopeCount: part.approvals.length,
    approvedScopeCount: part.approvals.filter(
      (approval) => approval.approvalState === "approved",
    ).length,
    publicShareCount: part.publicShares.length,
    releaseSafeShareCount: part.publicShares.filter((surface) => surface.releaseSafe)
      .length,
    agendaItemCount: agendaItems.length,
    minutesItemCount: minutes.length,
    actionItemCount: actionItems.length,
    blockerCount:
      part.branch.blockerCount +
      part.comments.reduce(
        (total, comment) =>
          total + comment.failedNotificationCount + comment.moderationReviewCount,
        0,
      ) +
      part.approvals.reduce(
        (total, approval) =>
          total + approval.blockedChannelCount + approval.branchBlockerCount,
        0,
      ) +
      part.publicShares.reduce((total, surface) => total + surface.blockerCount, 0),
    latestAt: getLatestIso([
      part.branch.updatedAt,
      part.branch.latestMergeReviewAt,
      ...part.comments.map((comment) => comment.latestAt),
      ...part.approvals.map((approval) => approval.latestActivityAt),
      ...part.publicShares.map((surface) => surface.latestAt),
    ]),
    recommendation: getSessionRecommendation(status),
  };
}

function getAgendaItems(part: SessionParts): AdminLiveReviewAgendaItem[] {
  const sessionId = getSessionId(part.branch);
  const ownerRef = getActorRef(part.branch.ownerEmail);
  const branchAgenda: AdminLiveReviewAgendaItem = {
    id: `${sessionId}-agenda-branch`,
    sessionId,
    category: "branch",
    status: part.branch.mergeReadiness,
    label: `Review branch ${part.branch.branchName}`,
    detail: `${part.branch.openCommentCount} open comments, ${part.branch.mergeReviewCount} merge reviews, ${part.branch.releaseEvidenceCount} release evidence anchors.`,
    ownerRef,
    dueAt: part.branch.dueDate,
    linkedId: part.branch.branchId,
  };
  const commentAgenda = part.comments.map((comment) => ({
    id: `${sessionId}-agenda-comment-${comment.commentId}`,
    sessionId,
    category: "comment" as const,
    status: comment.status,
    label: `Review comment on ${comment.pageName}`,
    detail: `${comment.textPreview} ${comment.acknowledgementCount} acknowledgement(s).`,
    ownerRef: getActorRef(comment.assigneeEmail ?? part.branch.ownerEmail),
    dueAt: null,
    linkedId: comment.commentId,
  }));
  const approvalAgenda = part.approvals.map((approval) => ({
    id: `${sessionId}-agenda-approval-${slugId(approval.scopeKey)}`,
    sessionId,
    category: "approval" as const,
    status: approval.status,
    label: `Confirm ${approval.teamName} / ${approval.projectName} approval`,
    detail: `${approval.approvalState} approval, ${approval.releaseEvidenceDiffCount} evidence diffs, ${approval.branchBlockerCount} branch blockers.`,
    ownerRef: approval.reviewerEmail
      ? getActorRef(approval.reviewerEmail)
      : "unassigned",
    dueAt: approval.slaDueAt,
    linkedId: approval.scopeKey,
  }));
  const shareAgenda = part.publicShares.map((surface) => ({
    id: `${sessionId}-agenda-share-${surface.id}`,
    sessionId,
    category: "public-share" as const,
    status: surface.status,
    label: `Review public ${surface.kind} link`,
    detail: `${surface.permissionPreset} link, release safe ${surface.releaseSafe ? "yes" : "no"}, ${surface.blockerCount} blockers.`,
    ownerRef,
    dueAt: null,
    linkedId: surface.shareId,
  }));

  return [
    branchAgenda,
    ...commentAgenda,
    ...approvalAgenda,
    ...shareAgenda,
    ...getActionItems(part).map((item) => ({
      id: `${item.id}-agenda`,
      sessionId,
      category: "action-item" as const,
      status: item.status,
      label: item.label,
      detail: item.detail,
      ownerRef: item.ownerRef,
      dueAt: item.dueAt,
      linkedId: item.linkedId,
    })),
  ];
}

function getMinuteItems(part: SessionParts): AdminLiveReviewMinuteItem[] {
  const sessionId = getSessionId(part.branch);
  const branchMinutes: AdminLiveReviewMinuteItem[] = part.branch.evidence.map((evidence, index) => ({
    id: `${sessionId}-minute-branch-${index}`,
    sessionId,
    category: "branch-evidence" as const,
    status: "ready" as const,
    label: "Branch evidence recorded",
    detail: evidence,
    ownerRef: getActorRef(part.branch.ownerEmail),
    createdAt: part.branch.latestMergeReviewAt ?? part.branch.updatedAt,
    linkedId: part.branch.branchId,
  }));
  const commentMinutes: AdminLiveReviewMinuteItem[] = part.comments
    .filter((comment) => comment.acknowledgementCount > 0 || comment.resolved)
    .map((comment): AdminLiveReviewMinuteItem => ({
      id: `${sessionId}-minute-comment-${comment.commentId}`,
      sessionId,
      category: "comment" as const,
      status: comment.status === "blocked" ? "blocked" : ("ready" as const),
      label: `Comment minutes for ${comment.pageName}`,
      detail: `${comment.acknowledgementCount} acknowledgements and ${comment.reactionCount} reactions captured.`,
      ownerRef: getActorRef(comment.assigneeEmail ?? part.branch.ownerEmail),
      createdAt: comment.latestAt,
      linkedId: comment.commentId,
    }));
  const approvalMinutes: AdminLiveReviewMinuteItem[] = part.approvals.flatMap((approval): AdminLiveReviewMinuteItem[] =>
    approval.latestDecision
      ? [
          {
            id: `${sessionId}-minute-approval-${approval.latestDecision.id}`,
            sessionId,
            category: "approval" as const,
            status:
              approval.latestDecision.decision === "approved"
                ? "ready"
                : "blocked",
            label: `${approval.teamName} / ${approval.projectName} decision`,
            detail: `${approval.latestDecision.decision} with ${approval.latestDecision.evidenceDiffCount} evidence diffs.`,
            ownerRef: getActorRef(approval.latestDecision.reviewerEmail),
            createdAt: approval.latestDecision.createdAt,
            linkedId: approval.scopeKey,
          },
        ]
      : [],
  );
  const shareMinutes: AdminLiveReviewMinuteItem[] = part.publicShares.map((surface): AdminLiveReviewMinuteItem => ({
    id: `${sessionId}-minute-share-${surface.id}`,
    sessionId,
    category: "public-share" as const,
    status: surface.releaseSafe ? "ready" as const : surface.status,
    label: `Public ${surface.kind} link review`,
    detail: `${surface.releaseSafe ? "Release-safe" : "Not release-safe"} with ${surface.blockerCount} blockers and ${surface.reviewCount} reviews.`,
    ownerRef: getActorRef(surface.ownerEmail),
    createdAt: surface.latestAt,
    linkedId: surface.shareId,
  }));

  return [
    ...branchMinutes,
    ...commentMinutes,
    ...approvalMinutes,
    ...shareMinutes,
  ];
}

function getActionItems(part: SessionParts): AdminLiveReviewActionItem[] {
  const sessionId = getSessionId(part.branch);
  const branchActions: AdminLiveReviewActionItem[] = part.branch.blockers.map((blocker, index) => ({
    id: `${sessionId}-action-branch-${index}`,
    sessionId,
    source: "branch" as const,
    status: "blocked" as const,
    label: "Resolve branch blocker",
    detail: blocker,
    ownerRef: getActorRef(
      part.branch.reviewerEmails[0] ?? part.branch.ownerEmail,
    ),
    dueAt: part.branch.dueDate,
    linkedId: part.branch.branchId,
  }));
  const commentActions: AdminLiveReviewActionItem[] = part.comments
    .filter(
      (comment) =>
        !comment.resolved &&
        (comment.acknowledgementCount === 0 || comment.status !== "ready"),
    )
    .map((comment): AdminLiveReviewActionItem => ({
      id: `${sessionId}-action-comment-${comment.commentId}`,
      sessionId,
      source: "comment" as const,
      status: comment.status === "blocked" ? "blocked" : ("review" as const),
      label: "Close comment review",
      detail: comment.recommendation,
      ownerRef: getActorRef(comment.assigneeEmail ?? part.branch.ownerEmail),
      dueAt: part.branch.dueDate,
      linkedId: comment.commentId,
    }));
  const approvalActions: AdminLiveReviewActionItem[] = part.approvals
    .filter((approval) => approval.approvalState !== "approved")
    .map((approval): AdminLiveReviewActionItem => ({
      id: `${sessionId}-action-approval-${slugId(approval.scopeKey)}`,
      sessionId,
      source: "approval" as const,
      status:
        approval.approvalState === "changes-requested" || approval.status === "blocked"
          ? "blocked"
          : ("review" as const),
      label: "Capture publication approval",
      detail: approval.recommendation,
      ownerRef: approval.reviewerEmail
        ? getActorRef(approval.reviewerEmail)
        : "unassigned",
      dueAt: approval.slaDueAt,
      linkedId: approval.scopeKey,
    }));
  const shareActions: AdminLiveReviewActionItem[] = part.publicShares
    .filter((surface) => !surface.releaseSafe || surface.status !== "ready")
    .flatMap((surface): AdminLiveReviewActionItem[] =>
      [...surface.blockers, ...surface.warnings].map((issue, index) => ({
        id: `${sessionId}-action-share-${surface.id}-${index}`,
        sessionId,
        source: "public-share" as const,
        status: surface.status === "blocked" ? "blocked" : ("review" as const),
        label: "Fix public share handoff",
        detail: issue || surface.recommendation,
        ownerRef: getActorRef(surface.ownerEmail),
        dueAt: null,
        linkedId: surface.shareId,
      })),
    );

  return [
    ...branchActions,
    ...commentActions,
    ...approvalActions,
    ...shareActions,
  ];
}

function getLiveReviewRows({
  actionItems,
  agendaItems,
  minutes,
  parts,
  sessions,
}: {
  actionItems: AdminLiveReviewActionItem[];
  agendaItems: AdminLiveReviewAgendaItem[];
  minutes: AdminLiveReviewMinuteItem[];
  parts: SessionParts[];
  sessions: AdminLiveReviewSession[];
}): AdminLiveReviewSessionRow[] {
  const missingOwnerCount = actionItems.filter(
    (item) => item.ownerRef === "unassigned",
  ).length;
  const blockedActionCount = actionItems.filter(
    (item) => item.status === "blocked",
  ).length;
  const linkedCommentCount = parts.reduce(
    (total, part) => total + part.comments.length,
    0,
  );
  const linkedApprovalCount = parts.reduce(
    (total, part) => total + part.approvals.length,
    0,
  );
  const linkedPublicShareCount = parts.reduce(
    (total, part) => total + part.publicShares.length,
    0,
  );
  const rows: AdminLiveReviewSessionRow[] = [
    {
      id: "live-review-branches",
      category: "branches",
      status: parts.length > 0 ? "ready" : "review",
      label: "Branch links",
      value: `${parts.length} branches`,
      detail: `${parts.length} active branch review request${parts.length === 1 ? "" : "s"} seed live review sessions.`,
      recommendation:
        parts.length > 0
          ? "Keep each active branch tied to a review agenda and minutes packet."
          : "Create a branch review request before opening a live review session.",
      count: parts.length,
      target: sessions.find((session) => session.status !== "ready")?.fileName ?? null,
      latestAt: getLatestIso(sessions.map((session) => session.latestAt)),
    },
    {
      id: "live-review-agenda",
      category: "agenda",
      status: agendaItems.length >= sessions.length ? "ready" : "review",
      label: "Review agenda",
      value: `${agendaItems.length} agenda items`,
      detail: "Agendas join branches, comments, approval scopes, public links, and action items before the live review starts.",
      recommendation: "Export agenda items before the review call starts.",
      count: agendaItems.length,
      target: sessions.find((session) => session.agendaItemCount === 0)?.fileName ?? null,
      latestAt: getLatestIso(sessions.map((session) => session.latestAt)),
    },
    {
      id: "live-review-minutes",
      category: "minutes",
      status: minutes.length > 0 ? "ready" : "review",
      label: "Review minutes",
      value: `${minutes.length} minutes`,
      detail: "Minutes capture branch evidence, comment acknowledgement state, approval decisions, and public share safety.",
      recommendation:
        minutes.length > 0
          ? "Attach minutes to the review packet before merge or publication."
          : "Capture minutes before closing the live review.",
      count: minutes.length,
      target: sessions.find((session) => session.minutesItemCount === 0)?.fileName ?? null,
      latestAt: getLatestIso(minutes.map((minute) => minute.createdAt)),
    },
    {
      id: "live-review-linked-comments",
      category: "comments",
      status: linkedCommentCount > 0 ? "ready" : "review",
      label: "Comment links",
      value: `${linkedCommentCount} comments`,
      detail: `${linkedCommentCount} comment workflow item${linkedCommentCount === 1 ? "" : "s"} are attached to live review sessions.`,
      recommendation:
        linkedCommentCount > 0
          ? "Use unresolved comments as agenda and action item sources."
          : "Attach comment workflow evidence before the review.",
      count: linkedCommentCount,
      target: sessions.find((session) => session.openCommentCount > 0)?.fileName ?? null,
      latestAt: getLatestIso(
        parts.flatMap((part) => part.comments.map((comment) => comment.latestAt)),
      ),
    },
    {
      id: "live-review-approval-links",
      category: "approvals",
      status:
        linkedApprovalCount === 0 || missingOwnerCount > 0 ? "review" : "ready",
      label: "Approval links",
      value: `${linkedApprovalCount} approvals`,
      detail: `${linkedApprovalCount} scoped publication approval${linkedApprovalCount === 1 ? "" : "s"} are linked to review sessions; ${missingOwnerCount} action item${missingOwnerCount === 1 ? "" : "s"} need owner assignment.`,
      recommendation:
        missingOwnerCount > 0
          ? "Assign approval owners before exporting review minutes."
          : "Approval links are ready for live review minutes.",
      count: missingOwnerCount,
      target:
        sessions.find((session) =>
          actionItems.some(
            (item) =>
              item.sessionId === session.id &&
              item.source === "approval" &&
              item.ownerRef === "unassigned",
          ),
        )?.fileName ?? null,
      latestAt: getLatestIso(
        parts.flatMap((part) =>
          part.approvals.map((approval) => approval.latestActivityAt),
        ),
      ),
    },
    {
      id: "live-review-public-shares",
      category: "public-shares",
      status: parts.some((part) =>
        part.publicShares.some((surface) => surface.status === "blocked"),
      )
        ? "blocked"
        : linkedPublicShareCount > 0
          ? "ready"
          : "review",
      label: "Public share links",
      value: `${linkedPublicShareCount} public shares`,
      detail: `${linkedPublicShareCount} public share surface${linkedPublicShareCount === 1 ? "" : "s"} are linked for route, expiry, exposure, and release-safe review.`,
      recommendation: "Resolve unsafe public shares before publishing minutes.",
      count: parts.reduce(
        (total, part) =>
          total +
          part.publicShares.filter((surface) => surface.status === "blocked")
            .length,
        0,
      ),
      target:
        sessions.find((session) =>
          parts.some(
            (part) =>
              part.branch.branchFileId === session.fileId &&
              part.publicShares.some((surface) => surface.status === "blocked"),
          ),
        )?.fileName ?? null,
      latestAt: getLatestIso(
        parts.flatMap((part) => part.publicShares.map((surface) => surface.latestAt)),
      ),
    },
    {
      id: "live-review-action-items",
      category: "action-items",
      status: blockedActionCount > 0 ? "blocked" : actionItems.length > 0 ? "review" : "ready",
      label: "Action items",
      value: `${actionItems.length} action items`,
      detail: `${blockedActionCount} blocked action item${blockedActionCount === 1 ? "" : "s"} and ${missingOwnerCount} missing owner assignment${missingOwnerCount === 1 ? "" : "s"} remain.`,
      recommendation:
        blockedActionCount > 0 || missingOwnerCount > 0
          ? "Resolve or assign every blocked review action before merge."
          : "Action items are ready to travel with review minutes.",
      count: blockedActionCount + missingOwnerCount,
      target:
        sessions.find((session) =>
          actionItems.some(
            (item) =>
              item.sessionId === session.id &&
              (item.status === "blocked" || item.ownerRef === "unassigned"),
          ),
        )?.fileName ?? null,
      latestAt: getLatestIso(sessions.map((session) => session.latestAt)),
    },
  ];

  return rows.sort(sortRows);
}

function getApprovalScopesForBranch(
  branch: AdminBranchReviewRequest,
  scopes: ScopedPublicationApprovalScope[],
) {
  const branchWords = new Set([
    ...toWords(branch.branchName),
    ...toWords(branch.branchFileName),
  ]);
  const matches = scopes.filter((scope) =>
    [...toWords(`${scope.scopeKey} ${scope.teamName} ${scope.projectName}`)].some(
      (word) => branchWords.has(word),
    ),
  );

  return matches.length > 0 ? matches : scopes.filter((scope) => scope.status !== "ready");
}

function getSessionRecommendation(status: AdminLiveReviewSessionStatus) {
  if (status === "blocked") {
    return "Resolve blocked agenda items and action owners before merge or publication.";
  }

  if (status === "review") {
    return "Capture missing minutes, approval owners, and share evidence before closing the review.";
  }

  return "Live review agenda and minutes are ready for release handoff.";
}

function getLiveReviewSessionCommands() {
  return [
    "bun run admin:live-review-sessions-smoke",
    "Export Admin > Live review sessions JSON.",
    "Export Admin > Live review sessions CSV.",
    "Export Admin > Live review sessions Markdown.",
    "Attach live review agenda and minutes to branch review, approval, and public share handoff packets.",
  ];
}

function getSessionId(branch: AdminBranchReviewRequest) {
  return `live-review-session-${branch.branchFileId}-${branch.branchId}`;
}

function getWorstStatus(statuses: AdminLiveReviewSessionStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function getLatestIso(values: Array<string | null | undefined>) {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
  );
}

function getActorRef(value: string | null | undefined) {
  if (!value) {
    return "unassigned";
  }

  return `participant:${hashString(value.toLowerCase()).slice(0, 10)}`;
}

function hashString(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function slugId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toWords(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
}

function statusWeight(status: AdminLiveReviewSessionStatus) {
  return status === "blocked" ? 0 : status === "review" ? 1 : 2;
}

function sortRows(
  left: AdminLiveReviewSessionRow,
  right: AdminLiveReviewSessionRow,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.count - left.count ||
    left.label.localeCompare(right.label)
  );
}

function sortSessions(
  left: AdminLiveReviewSession,
  right: AdminLiveReviewSession,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.blockerCount - left.blockerCount ||
    (right.latestAt ?? "").localeCompare(left.latestAt ?? "") ||
    left.fileName.localeCompare(right.fileName)
  );
}

function sortAgendaItems(
  left: AdminLiveReviewAgendaItem,
  right: AdminLiveReviewAgendaItem,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.sessionId.localeCompare(right.sessionId) ||
    left.label.localeCompare(right.label)
  );
}

function sortMinutes(
  left: AdminLiveReviewMinuteItem,
  right: AdminLiveReviewMinuteItem,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    (right.createdAt ?? "").localeCompare(left.createdAt ?? "") ||
    left.label.localeCompare(right.label)
  );
}

function sortActionItems(
  left: AdminLiveReviewActionItem,
  right: AdminLiveReviewActionItem,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    Number(left.ownerRef === "unassigned") - Number(right.ownerRef === "unassigned") ||
    left.label.localeCompare(right.label)
  );
}

export {
  getAdminLiveReviewSessionsCsv,
  getAdminLiveReviewSessionsJson,
  getAdminLiveReviewSessionsMarkdown,
} from "@/features/admin/admin-live-review-sessions-export";

export type {
  AdminLiveReviewActionItem,
  AdminLiveReviewAgendaCategory,
  AdminLiveReviewAgendaItem,
  AdminLiveReviewMinuteCategory,
  AdminLiveReviewMinuteItem,
  AdminLiveReviewSession,
  AdminLiveReviewSessionRow,
  AdminLiveReviewSessionRowCategory,
  AdminLiveReviewSessionsInput,
  AdminLiveReviewSessionsReport,
  AdminLiveReviewSessionStatus,
} from "@/features/admin/admin-live-review-sessions-types";
