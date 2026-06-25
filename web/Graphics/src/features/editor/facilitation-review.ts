import type {
  DesignComment,
  DesignCommentReactionKind,
  DesignPage,
  DesignReviewTimer,
  DesignVotingSession,
} from "@/features/editor/types";

export type FacilitationReviewStatus = "ready" | "review" | "blocked";

export type FacilitationReviewRow = {
  id: string;
  commentId: string;
  status: FacilitationReviewStatus;
  label: string;
  text: string;
  votes: number;
  replies: number;
  assignee: string;
  reactions: Record<DesignCommentReactionKind, number>;
  detail: string;
};

export type FacilitationReviewReport = {
  pageId: string;
  pageName: string;
  votingSession: DesignVotingSession | null;
  reviewTimer: DesignReviewTimer | null;
  commentCount: number;
  openCount: number;
  resolvedCount: number;
  assignedCount: number;
  voteCount: number;
  blockerCount: number;
  reviewCount: number;
  readyCount: number;
  rows: FacilitationReviewRow[];
};

type FacilitationPagePatch = Partial<Pick<DesignPage, "facilitation">>;

const reactionKinds: DesignCommentReactionKind[] = [
  "thumbs-up",
  "heart",
  "check",
  "eyes",
];

export function getFacilitationReview(
  page: DesignPage,
): FacilitationReviewReport {
  const comments = page.comments ?? [];
  const rows = comments
    .map(createReviewRow)
    .sort((a, b) => {
      if (a.status !== b.status) {
        return getStatusWeight(b.status) - getStatusWeight(a.status);
      }

      return b.votes - a.votes || b.replies - a.replies;
    });

  return {
    pageId: page.id,
    pageName: page.name,
    votingSession: page.facilitation?.votingSession ?? null,
    reviewTimer: page.facilitation?.reviewTimer ?? null,
    commentCount: comments.length,
    openCount: comments.filter((comment) => !comment.resolved).length,
    resolvedCount: comments.filter((comment) => comment.resolved).length,
    assignedCount: comments.filter((comment) => comment.assigneeName).length,
    voteCount: rows.reduce((count, row) => count + row.votes, 0),
    blockerCount: rows.filter((row) => row.status === "blocked").length,
    reviewCount: rows.filter((row) => row.status === "review").length,
    readyCount: rows.filter((row) => row.status === "ready").length,
    rows,
  };
}

export function getFacilitationReviewCsv(report: FacilitationReviewReport) {
  return [
    [
      "status",
      "label",
      "commentId",
      "votes",
      "replies",
      "assignee",
      "thumbsUp",
      "heart",
      "check",
      "eyes",
      "detail",
      "text",
    ],
    ...report.rows.map((row) => [
      row.status,
      row.label,
      row.commentId,
      row.votes,
      row.replies,
      row.assignee,
      row.reactions["thumbs-up"],
      row.reactions.heart,
      row.reactions.check,
      row.reactions.eyes,
      row.detail,
      row.text,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getFacilitationReviewMarkdown(
  report: FacilitationReviewReport,
) {
  const votingSession = report.votingSession;
  const reviewTimer = report.reviewTimer;
  const lines = [
    `# ${report.pageName} Facilitation Review`,
    "",
    votingSession
      ? `Voting: ${votingSession.name} (${votingSession.status}, ${votingSession.voteBudget} votes/person)`
      : "Voting: No active session",
    reviewTimer
      ? `Timer: ${reviewTimer.name} (${reviewTimer.status}, ${reviewTimer.durationMinutes} minutes)`
      : "Timer: No active timer",
    `Comments: ${report.commentCount}`,
    `Open: ${report.openCount}`,
    `Resolved: ${report.resolvedCount}`,
    `Assigned: ${report.assignedCount}`,
    `Votes: ${report.voteCount}`,
    `Blocked: ${report.blockerCount}`,
    "",
    "## Review Queue",
    "",
  ];

  if (report.rows.length === 0) {
    lines.push("- No comments on this page.");
  }

  for (const row of report.rows) {
    lines.push(
      `- [${row.status}] ${row.label}: ${row.text} (${row.votes} votes, ${row.replies} replies, ${row.assignee})`,
    );
  }

  return lines.join("\n");
}

export function createVotingSessionPagePatch(
  page: DesignPage,
): FacilitationPagePatch {
  return {
    facilitation: {
      ...page.facilitation,
      votingSession: {
        id: `vote-${Date.now()}`,
        name: "Design vote",
        voteBudget: 3,
        status: "open",
        startedAt: new Date().toISOString(),
      },
    },
  };
}

export function updateVotingSessionPagePatch(
  page: DesignPage,
  patch: Partial<Pick<DesignVotingSession, "name" | "voteBudget" | "status">>,
): FacilitationPagePatch {
  const currentSession = page.facilitation?.votingSession;

  if (!currentSession) {
    return createVotingSessionPagePatch(page);
  }

  const nextStatus = patch.status ?? currentSession.status;

  return {
    facilitation: {
      ...page.facilitation,
      votingSession: {
        ...currentSession,
        ...patch,
        voteBudget: Math.max(1, Math.round(patch.voteBudget ?? currentSession.voteBudget)),
        closedAt:
          nextStatus === "closed"
            ? currentSession.closedAt ?? new Date().toISOString()
            : undefined,
      },
    },
  };
}

export function createReviewTimerPagePatch(page: DesignPage): FacilitationPagePatch {
  return {
    facilitation: {
      ...page.facilitation,
      reviewTimer: {
        id: `timer-${Date.now()}`,
        name: "Design critique",
        durationMinutes: 15,
        status: "idle",
      },
    },
  };
}

export function updateReviewTimerPagePatch(
  page: DesignPage,
  patch: Partial<
    Pick<DesignReviewTimer, "name" | "durationMinutes" | "status">
  >,
): FacilitationPagePatch {
  const currentTimer = page.facilitation?.reviewTimer;

  if (!currentTimer) {
    return createReviewTimerPagePatch(page);
  }

  const nextStatus = patch.status ?? currentTimer.status;
  const now = new Date().toISOString();

  return {
    facilitation: {
      ...page.facilitation,
      reviewTimer: {
        ...currentTimer,
        ...patch,
        durationMinutes: Math.max(
          1,
          Math.round(patch.durationMinutes ?? currentTimer.durationMinutes),
        ),
        startedAt:
          nextStatus === "running"
            ? currentTimer.startedAt ?? now
            : currentTimer.startedAt,
        finishedAt: nextStatus === "finished" ? currentTimer.finishedAt ?? now : undefined,
      },
    },
  };
}

function createReviewRow(comment: DesignComment): FacilitationReviewRow {
  const reactions = getReactionCounts(comment);
  const votes = Object.values(reactions).reduce((count, value) => count + value, 0);
  const replies = comment.replies?.length ?? 0;
  const assignee = comment.assigneeName ?? "Unassigned";
  const status = getReviewStatus(comment, votes, replies);

  return {
    id: comment.id,
    commentId: comment.id,
    status,
    label: getReviewLabel(comment, votes, replies),
    text: compactText(comment.text),
    votes,
    replies,
    assignee,
    reactions,
    detail: getReviewDetail(comment, votes, replies),
  };
}

function getReviewStatus(
  comment: DesignComment,
  votes: number,
  replies: number,
): FacilitationReviewStatus {
  if (comment.resolved) {
    return "ready";
  }

  if (votes >= 3 || replies >= 3 || !comment.assigneeName) {
    return "blocked";
  }

  return "review";
}

function getReviewLabel(
  comment: DesignComment,
  votes: number,
  replies: number,
) {
  if (comment.resolved) {
    return "Resolved decision";
  }

  if (!comment.assigneeName) {
    return "Needs owner";
  }

  if (votes >= 3) {
    return "High-vote item";
  }

  if (replies >= 3) {
    return "Discussion thread";
  }

  return "Open review";
}

function getReviewDetail(
  comment: DesignComment,
  votes: number,
  replies: number,
) {
  if (comment.resolved) {
    return "Decision is resolved and ready for handoff.";
  }

  if (!comment.assigneeName) {
    return "Assign an owner before the next critique or voting pass.";
  }

  if (votes >= 3) {
    return "Several collaborators reacted; prioritize this in review.";
  }

  if (replies >= 3) {
    return "Thread has active discussion; summarize or resolve the decision.";
  }

  return "Open item has an owner and can continue through review.";
}

function getReactionCounts(comment: DesignComment) {
  return Object.fromEntries(
    reactionKinds.map((kind) => [
      kind,
      (comment.reactions ?? []).filter((reaction) => reaction.kind === kind)
        .length,
    ]),
  ) as Record<DesignCommentReactionKind, number>;
}

function getStatusWeight(status: FacilitationReviewStatus) {
  if (status === "blocked") {
    return 3;
  }

  if (status === "review") {
    return 2;
  }

  return 1;
}

function compactText(value: string) {
  return value.trim().replace(/\s+/g, " ") || "Untitled comment";
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
