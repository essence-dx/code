import { createDocumentLayerIndex } from "@/features/editor/layer-index";
import type {
  DesignComment,
  DesignDocument,
  DesignPage,
} from "@/features/editor/types";
import type {
  DesignReviewApprovalReport,
  DesignReviewApprovalRow,
  DesignReviewApprovalStatus,
  DesignReviewApprover,
  DesignReviewGateInput,
} from "@/features/editor/design-review-approval-types";

type CommentEntry = {
  comment: DesignComment;
  page: DesignPage;
  layerIds: string[];
};

export type DesignReviewApprovalInput = {
  activePageId: string;
  document: DesignDocument;
  gates: DesignReviewGateInput[];
  now?: Date;
};

export function getDesignReviewApprovalReport({
  activePageId,
  document,
  gates,
  now = new Date(),
}: DesignReviewApprovalInput): DesignReviewApprovalReport {
  const index = createDocumentLayerIndex(document);
  const commentEntries = getCommentEntries(document);
  const openEntries = commentEntries.filter((entry) => !entry.comment.resolved);
  const readyForDevLayerCount = index.entries.filter(
    (entry) => entry.layer.readyForDev,
  ).length;
  const approvers = getApprovers(openEntries, now);
  const rows = [
    ...getAssignmentRows(openEntries, now),
    ...getGateRows(gates),
    ...getEvidenceRows({
      activePageId,
      commentEntries: openEntries,
      document,
      readyForDevLayerCount,
    }),
  ].sort(sortRows);
  const readyRows =
    rows.length > 0
      ? rows
      : [
          {
            id: "design-review-approval-ready",
            status: "ready",
            category: "ready",
            label: "Design review approval ready",
            detail:
              "Reviewer assignments, due dates, blocking criteria, evidence, and release gate inputs are ready for approval.",
            recommendation:
              "Export this evidence bundle with release notes before final handoff.",
            metric: 100,
            layerIds: [],
            commentIds: [],
          } satisfies DesignReviewApprovalRow,
        ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const overdueCommentCount = openEntries.filter((entry) =>
    isOverdue(entry.comment, now),
  ).length;
  const dueSoonCommentCount = openEntries.filter((entry) =>
    isDueSoon(entry.comment, now),
  ).length;
  const assignedCommentCount = openEntries.filter((entry) =>
    hasAssignee(entry.comment),
  ).length;
  const unassignedCommentCount = openEntries.length - assignedCommentCount;
  const missingDueDateCount = openEntries.filter(
    (entry) => !entry.comment.dueDate,
  ).length;
  const blockedGateCount = gates.filter((gate) => gate.status === "blocked").length;
  const reviewGateCount = gates.filter((gate) => gate.status === "review").length;
  const score = Math.max(
    0,
    100 -
      blockedCount * 20 -
      reviewCount * 7 -
      overdueCommentCount * 4 -
      blockedGateCount * 5,
  );

  return {
    score,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    pageCount: document.pages.length,
    layerCount: index.entries.length,
    readyForDevLayerCount,
    openCommentCount: openEntries.length,
    assignedCommentCount,
    unassignedCommentCount,
    missingDueDateCount,
    overdueCommentCount,
    dueSoonCommentCount,
    approverCount: approvers.length,
    blockedGateCount,
    reviewGateCount,
    evidenceCount:
      openEntries.length +
      gates.reduce((total, gate) => total + gate.evidenceCount, 0) +
      readyForDevLayerCount,
    blockedCount,
    reviewCount,
    readyCount: readyRows.filter((row) => row.status === "ready").length,
    approvers,
    gates,
    rows: readyRows,
  };
}

function getAssignmentRows(entries: CommentEntry[], now: Date) {
  const rows: DesignReviewApprovalRow[] = [];
  const unassigned = entries.filter((entry) => !hasAssignee(entry.comment));
  const missingDue = entries.filter((entry) => !entry.comment.dueDate);
  const overdue = entries.filter((entry) => isOverdue(entry.comment, now));
  const dueSoon = entries.filter((entry) => isDueSoon(entry.comment, now));

  if (unassigned.length > 0) {
    rows.push({
      id: "design-review-unassigned-comments",
      status: "blocked",
      category: "assignment",
      label: "Reviewer assignment missing",
      detail: `${unassigned.length} open review comment${unassigned.length === 1 ? "" : "s"} have no reviewer assignment.`,
      recommendation:
        "Assign a reviewer before release approval so ownership is explicit.",
      metric: unassigned.length,
      pageName: getPageList(unassigned),
      layerIds: getLayerIds(unassigned),
      commentIds: unassigned.map((entry) => entry.comment.id),
    });
  }

  if (missingDue.length > 0) {
    rows.push({
      id: "design-review-missing-due-dates",
      status: "review",
      category: "due-date",
      label: "Review due date missing",
      detail: `${missingDue.length} open review comment${missingDue.length === 1 ? "" : "s"} need due dates.`,
      recommendation:
        "Set due dates to make review handoff and release timing auditable.",
      metric: missingDue.length,
      pageName: getPageList(missingDue),
      layerIds: getLayerIds(missingDue),
      commentIds: missingDue.map((entry) => entry.comment.id),
    });
  }

  if (overdue.length > 0) {
    rows.push({
      id: "design-review-overdue-comments",
      status: "blocked",
      category: "due-date",
      label: "Review approval overdue",
      detail: `${overdue.length} assigned review comment${overdue.length === 1 ? "" : "s"} are past due.`,
      recommendation:
        "Resolve, reassign, or move due dates before final release signoff.",
      metric: overdue.length,
      pageName: getPageList(overdue),
      layerIds: getLayerIds(overdue),
      commentIds: overdue.map((entry) => entry.comment.id),
      dueDate: getEarliestDueDate(overdue),
    });
  }

  if (dueSoon.length > 0) {
    rows.push({
      id: "design-review-due-soon-comments",
      status: "review",
      category: "due-date",
      label: "Review approval due soon",
      detail: `${dueSoon.length} assigned review comment${dueSoon.length === 1 ? "" : "s"} are due within 48 hours.`,
      recommendation:
        "Confirm reviewer availability before release gate review starts.",
      metric: dueSoon.length,
      pageName: getPageList(dueSoon),
      layerIds: getLayerIds(dueSoon),
      commentIds: dueSoon.map((entry) => entry.comment.id),
      dueDate: getEarliestDueDate(dueSoon),
    });
  }

  return rows;
}

function getGateRows(gates: DesignReviewGateInput[]) {
  return gates
    .filter((gate) => gate.status !== "ready")
    .map(
      (gate) =>
        ({
          id: `design-review-gate-${gate.id}`,
          status: gate.status,
          category: "release-gate",
          label: `${gate.label} gate`,
          detail: `${gate.label} is ${gate.status} at score ${gate.score} with ${gate.blockedCount} blocked and ${gate.reviewCount} review items.`,
          recommendation:
            "Attach the area evidence bundle and clear blockers before approval.",
          metric: gate.score,
          layerIds: [],
          commentIds: [],
          gateId: gate.id,
        }) satisfies DesignReviewApprovalRow,
    );
}

function getEvidenceRows({
  activePageId,
  commentEntries,
  document,
  readyForDevLayerCount,
}: {
  activePageId: string;
  commentEntries: CommentEntry[];
  document: DesignDocument;
  readyForDevLayerCount: number;
}) {
  const rows: DesignReviewApprovalRow[] = [];
  const activePageComments = commentEntries.filter(
    (entry) => entry.page.id === activePageId,
  );

  if (commentEntries.length > 0) {
    rows.push({
      id: "design-review-open-comment-evidence",
      status: "review",
      category: "comments",
      label: "Open review comment evidence",
      detail: `${commentEntries.length} open comment${commentEntries.length === 1 ? "" : "s"} remain across ${document.pages.length} page${document.pages.length === 1 ? "" : "s"}.`,
      recommendation:
        "Resolve approved comments or export this bundle as evidence for reviewer follow-up.",
      metric: commentEntries.length,
      pageName: getPageList(commentEntries),
      layerIds: getLayerIds(activePageComments),
      commentIds: activePageComments.map((entry) => entry.comment.id),
    });
  }

  if (readyForDevLayerCount === 0 && document.pages.some((page) => page.layers.length > 0)) {
    rows.push({
      id: "design-review-ready-for-dev-evidence",
      status: "review",
      category: "evidence",
      label: "Ready-for-dev evidence missing",
      detail:
        "No layer is marked ready for Dev Mode, so reviewer approval has no implementation-ready layer evidence.",
      recommendation:
        "Mark approved layers ready for Dev Mode or attach explicit reviewer notes before release.",
      metric: 0,
      layerIds: [],
      commentIds: [],
    });
  }

  return rows;
}

function getCommentEntries(document: DesignDocument) {
  return document.pages.flatMap((page) =>
    (page.comments ?? []).map((comment) => ({
      comment,
      page,
      layerIds: getCommentLayerIds(page, comment),
    })),
  );
}

function getCommentLayerIds(page: DesignPage, comment: DesignComment) {
  const hit = page.layers.find((layer) => {
    const minX = Math.min(layer.x, layer.x + layer.width);
    const maxX = Math.max(layer.x, layer.x + layer.width);
    const minY = Math.min(layer.y, layer.y + layer.height);
    const maxY = Math.max(layer.y, layer.y + layer.height);

    return (
      comment.x >= minX &&
      comment.x <= maxX &&
      comment.y >= minY &&
      comment.y <= maxY
    );
  });

  return hit ? [hit.id] : [];
}

function getApprovers(entries: CommentEntry[], now: Date) {
  const approvers = new Map<string, DesignReviewApprover>();

  for (const entry of entries) {
    if (!hasAssignee(entry.comment)) {
      continue;
    }

    const key = (entry.comment.assigneeEmail || entry.comment.assigneeName || "reviewer")
      .trim()
      .toLowerCase();
    const existing =
      approvers.get(key) ??
      {
        id: key,
        name: entry.comment.assigneeName ?? "Reviewer",
        email: entry.comment.assigneeEmail,
        openCommentCount: 0,
        overdueCommentCount: 0,
        dueSoonCommentCount: 0,
        pageNames: [],
      };

    existing.openCommentCount += 1;
    if (isOverdue(entry.comment, now)) {
      existing.overdueCommentCount += 1;
    }
    if (isDueSoon(entry.comment, now)) {
      existing.dueSoonCommentCount += 1;
    }
    addUnique(existing.pageNames, entry.page.name);
    approvers.set(key, existing);
  }

  return Array.from(approvers.values()).sort(
    (left, right) =>
      right.overdueCommentCount - left.overdueCommentCount ||
      right.openCommentCount - left.openCommentCount ||
      left.name.localeCompare(right.name),
  );
}

function hasAssignee(comment: DesignComment) {
  return Boolean(comment.assigneeName?.trim() || comment.assigneeEmail?.trim());
}

function isOverdue(comment: DesignComment, now: Date) {
  const due = getDueTime(comment);

  return Boolean(due && due < now.getTime() && !comment.resolved);
}

function isDueSoon(comment: DesignComment, now: Date) {
  const due = getDueTime(comment);

  if (!due || due < now.getTime() || comment.resolved) {
    return false;
  }

  return due - now.getTime() <= 48 * 60 * 60 * 1000;
}

function getDueTime(comment: DesignComment) {
  if (!comment.dueDate) {
    return null;
  }

  const timestamp = new Date(`${comment.dueDate}T23:59:59`).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
}

function getPageList(entries: CommentEntry[]) {
  return Array.from(new Set(entries.map((entry) => entry.page.name))).join(", ");
}

function getLayerIds(entries: CommentEntry[]) {
  return Array.from(new Set(entries.flatMap((entry) => entry.layerIds)));
}

function getEarliestDueDate(entries: CommentEntry[]) {
  return entries
    .map((entry) => entry.comment.dueDate)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
}

function addUnique(values: string[], value: string) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function sortRows(left: DesignReviewApprovalRow, right: DesignReviewApprovalRow) {
  if (left.status !== right.status) {
    return getStatusRank(left.status) - getStatusRank(right.status);
  }

  return (
    getCategoryRank(left.category) - getCategoryRank(right.category) ||
    right.metric - left.metric ||
    left.label.localeCompare(right.label)
  );
}

function getStatusRank(status: DesignReviewApprovalStatus) {
  if (status === "blocked") {
    return 0;
  }

  return status === "review" ? 1 : 2;
}

function getCategoryRank(category: DesignReviewApprovalRow["category"]) {
  const rank: Record<DesignReviewApprovalRow["category"], number> = {
    assignment: 0,
    "due-date": 1,
    "blocking-criteria": 2,
    "release-gate": 3,
    comments: 4,
    evidence: 5,
    ready: 6,
  };

  return rank[category];
}
